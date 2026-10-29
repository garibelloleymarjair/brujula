const { app, BrowserWindow, BrowserView, ipcMain, session, shell } = require('electron');

// Identidad de la aplicacion para Windows (barra de tareas / accesos directos).
app.setAppUserModelId('com.brujula.browser');
const path = require('path');
const fs = require('fs');

// Rendimiento: mantener las páginas activas y la red nativa de Chromium.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

let win = null;
let nextId = 1;
let activeId = null;
const tabs = new Map();
const HOME = 'brujula-home://internal';
const BRUJULA_SEARCH = 'brujula-search://results';
const BRUJULA_SEARCH_FILE = path.join(__dirname,'src','search.html');
const SEARCH_INDEX_FILE = 'brujula-search-index.json';

const SEARCH_ENGINES = {};
const SEARCH_META = [{id:'brujula', name:'Brújula', icon:'B', note:'Motor propio'}];

const ANSWER_SITES = {
  perplexity: 'https://www.perplexity.ai/search?q=',
  gemini: 'https://gemini.google.com/app?q=',
  chatgpt: 'https://chatgpt.com/?q=',
  copilot: 'https://www.bing.com/search?q='
};

const storePath = name => path.join(app.getPath('userData'), name);
function readJSON(name, fallback) {
  try {
    const p = storePath(name);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(name, data) {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive:true });
    fs.writeFileSync(storePath(name), JSON.stringify(data, null, 2));
  } catch {}
}
function normalize(input) {
  const v = String(input || '').trim();
  if (!v) return HOME;
  if (v === HOME || v === 'brujula://home') return HOME;
  if (v.startsWith(BRUJULA_SEARCH)) return v;
  if (/^(https?|ftp):\/\//i.test(v)) return v;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(v)) return 'http://' + v;
  if (/^[\w.-]+\.[a-z]{2,}([/:].*)?$/i.test(v)) return 'https://' + v;
  return `${BRUJULA_SEARCH}?q=${encodeURIComponent(v)}`;
}
function createWindow() {
  win = new BrowserWindow({
    width:1500,
    height:950,
    minWidth:900,
    minHeight:600,
    backgroundColor:'#08101f',
    title:'Brújula',
    icon:path.join(__dirname,'assets','icon.ico'),
    webPreferences:{
      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:false
    }
  });
  win.loadFile(path.join(__dirname,'src','index.html'));
  win.on('resize', layout);
  win.on('closed',()=>win=null);
}
function layout() {
  if (!win || activeId === null) return;
  const item = tabs.get(activeId);
  if (!item || item.home) return;
  const b = win.getContentBounds();
  item.view.setBounds({x:0,y:126,width:b.width,height:Math.max(100,b.height-126)});
  item.view.setAutoResize({width:true,height:true});
}
function emitTabs() {
  if (!win) return;
  win.webContents.send('tabs', [...tabs.entries()].map(([id,t])=>({
    id,
    title:t.title||'Nueva pestaña',
    url:t.home?HOME:(t.search?(t.searchUrl||BRUJULA_SEARCH):t.view.webContents.getURL()),
    home:t.home,
    active:id===activeId
  })));
}
function emitState(id=activeId) {
  if (!win || !tabs.has(id)) return;
  const t = tabs.get(id);
  if (t.home) {
    win.webContents.send('state',{id,url:HOME,title:'Nueva pestaña',back:false,forward:false,loading:false,secure:true,home:true,search:false});
    return;
  }
  if (t.search) {
    win.webContents.send('state',{id,url:t.searchUrl||BRUJULA_SEARCH,title:'Brújula',back:false,forward:false,loading:false,secure:true,home:false,search:true});
    return;
  }
  const wc = t.view.webContents;
  win.webContents.send('state',{
    id,
    url:wc.getURL(),
    title:wc.getTitle(),
    back:wc.canGoBack(),
    forward:wc.canGoForward(),
    loading:wc.isLoading(),
    secure:/^https:\/\//i.test(wc.getURL()),
    home:false
  });
}
function addHistory(url,title) {
  if (!/^https?:\/\//i.test(url)) return;
  let h = readJSON('history.json',[]).filter(x=>x.url!==url);
  h.unshift({url,title:title||url,time:Date.now()});
  writeJSON('history.json',h.slice(0,1000));
}
function createTab(url=HOME) {
  const id = nextId++;
  const target = normalize(url);
  const view = new BrowserView({
    backgroundColor:'#ffffff',
    webPreferences:{
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      spellcheck:true
    }
  });
  const item = {id,view,home:target===HOME,search:target.startsWith(BRUJULA_SEARCH),title:target.startsWith(BRUJULA_SEARCH)?'Brújula':'Nueva pestaña'};
  try { view.webContents.setBackgroundThrottling(false); } catch {}
  tabs.set(id,item);
  activeId=id;

  view.webContents.setWindowOpenHandler(({url:newURL})=>{
    if (/^(https?|ftp):\/\//i.test(newURL)) createTab(newURL);
    else shell.openExternal(newURL).catch(()=>{});
    return {action:'deny'};
  });
  view.webContents.on('will-navigate',(e,newURL)=>{
    if (newURL.startsWith('file://') || newURL.startsWith(BRUJULA_SEARCH)) return;
    if (!/^(https?|ftp):\/\//i.test(newURL)) {
      e.preventDefault();
      shell.openExternal(newURL).catch(()=>{});
    }
  });
  view.webContents.on('did-navigate',(_,newURL)=>changed(id,newURL));
  view.webContents.on('did-navigate-in-page',(_,newURL)=>changed(id,newURL));
  view.webContents.on('page-title-updated',(_,title)=>{
    if (tabs.has(id)) {
      tabs.get(id).title=title||'Nueva pestaña';
      emitTabs();
    }
  });
  view.webContents.on('did-start-loading',()=>emitState(id));
  view.webContents.on('did-stop-loading',()=>emitState(id));
  view.webContents.on('did-fail-load',(_,errorCode,errorDescription,validatedURL,isMainFrame)=>{
    if (isMainFrame && errorCode !== -3) {
      win?.webContents.send('load-error',{id,url:validatedURL,errorCode,errorDescription});
    }
  });
  view.webContents.on('render-process-gone',()=>win?.webContents.send('toast','La página dejó de responder. Puedes recargarla.'));
  if (!item.home) {
    if (item.search) {
      const u=new URL(target);
      const q=u.searchParams.get('q')||'';
      view.webContents.loadFile(BRUJULA_SEARCH_FILE,{query:{q}}).catch(()=>{});
    } else {
      view.webContents.loadURL(target,{extraHeaders:'Accept-Language: es-CO,es;q=0.9\r\n'}).catch(()=>{});
    }
  }
  emitTabs();
  emitState(id);
  layout();
  return id;
}
function changed(id,url) {
  const t=tabs.get(id);
  if (!t) return;
  if (url.startsWith('file://')) return;
  t.home=false;
  t.search=url.startsWith(BRUJULA_SEARCH);
  if (/^https?:\/\//i.test(url)) addHistory(url,t.title);
  emitTabs();
  emitState(id);
}
function activate(id) {
  id=Number(id);
  if (!tabs.has(id)) return;
  if (activeId!==null && tabs.has(activeId)) {
    const old=tabs.get(activeId);
    if (!old.home) try { win.removeBrowserView(old.view); } catch {}
  }
  activeId=id;
  const t=tabs.get(id);
  if (!t.home) {
    win.addBrowserView(t.view);
    layout();
  }
  emitTabs();
  emitState(id);
}
function closeTab(id) {
  id=Number(id);
  const t=tabs.get(id);
  if (!t) return;
  const was=activeId===id;
  if (!t.home) {
    try { win.removeBrowserView(t.view); } catch {}
    try { t.view.webContents.destroy(); } catch {}
  }
  tabs.delete(id);
  if (!tabs.size) {
    createTab(HOME);
    return;
  }
  if (was) {
    const ids=[...tabs.keys()];
    activate(ids[Math.max(0,ids.indexOf(id)-1)]);
  }
  emitTabs();
}
function navigate(url) {
  const target=normalize(url);
  let t=tabs.get(activeId);
  if (!t) {
    createTab(target);
    return;
  }
  if (target===HOME) {
    if (!t.home) try { win.removeBrowserView(t.view); } catch {}
    t.home=true;
    t.title='Nueva pestaña';
    emitTabs();
    emitState();
    return;
  }
  if (t.home) {
    t.home=false;
    t.title='Cargando...';
    win.addBrowserView(t.view);
    layout();
  }
  t.view.webContents.loadURL(target,{extraHeaders:'Accept-Language: es-CO,es;q=0.9\r\n'}).catch(()=>{});
  emitTabs();
  emitState();
}

function createBrujulaSearchTab(query=''){
  const q=String(query||'').trim();
  const id=createTab(`${BRUJULA_SEARCH}?q=${encodeURIComponent(q)}`);
  const t=tabs.get(id);
  if(t){t.search=true;t.searchUrl=`${BRUJULA_SEARCH}?q=${encodeURIComponent(q)}`;t.title='Brújula';}
  emitTabs();emitState(id);
  return id;
}

function getSeedIndex(){
  const p = path.join(__dirname,'data','seed-index.json');
  try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return []; }
}
function getSearchIndex(){
  const seed=getSeedIndex();
  const stored=readJSON(SEARCH_INDEX_FILE,[]);
  const map=new Map(seed.map(x=>[x.id,x]));
  for(const x of stored) map.set(x.id,x);
  return [...map.values()];
}
function saveSearchIndex(index){writeJSON(SEARCH_INDEX_FILE,index.slice(-12000));}
function normalizeText(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function tokenize(q){ return [...new Set(normalizeText(q).split(/\s+/).filter(x=>x.length>=2))].slice(0,18); }
function scoreDoc(doc, terms, raw){
  const title=normalizeText(doc.title), text=normalizeText(doc.text||doc.snippet), site=normalizeText(doc.site||'');
  let score=0;
  for(const term of terms){
    if(title.includes(term)) score+=20;
    if(site.includes(term)) score+=4;
    let pos=0,c=0; while((pos=text.indexOf(term,pos))>=0 && c<12){score+=2;c++;pos+=Math.max(1,term.length);}
    if(doc.tags && doc.tags.some(t=>normalizeText(t).includes(term))) score+=8;
  }
  if(title===normalizeText(raw)) score+=40;
  if(doc.type==='news') score+=1;
  return score;
}
function makeSnippet(text, terms, max=290){
  const clean=String(text||'').replace(/\s+/g,' ').trim(); if(!clean) return '';
  const n=normalizeText(clean); let idx=-1;
  for(const t of terms){ idx=n.indexOf(t); if(idx>=0) break; }
  const start=Math.max(0,(idx<0?0:idx)-90);
  let out=clean.slice(start,start+max);
  if(start>0) out='…'+out;
  if(start+max<clean.length) out+='…';
  return out;
}
function localSearch(query, type='web'){
  const raw=String(query||'').trim(); const terms=tokenize(raw);
  const docs=getSearchIndex();
  const ranked=docs.map(d=>({...d,score:scoreDoc(d,terms,raw)})).filter(d=>d.score>0);
  if(type==='images') return ranked.filter(d=>(d.images||[]).length || d.type==='image').sort((a,b)=>b.score-a.score).slice(0,40);
  if(type==='videos') return ranked.filter(d=>(d.videos||[]).length || d.type==='video').sort((a,b)=>b.score-a.score).slice(0,40);
  if(type==='news') return ranked.filter(d=>d.type==='news').sort((a,b)=>b.score-a.score).slice(0,40);
  return ranked.sort((a,b)=>b.score-a.score).slice(0,40);
}

function absUrl(base, value){
  try { return new URL(value,base).href; } catch { return ''; }
}
function stripHtml(html){
  return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<noscript[\s\S]*?<\/noscript>/gi,' ').replace(/<svg[\s\S]*?<\/svg>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
function htmlMeta(html, key, attr='property'){
  const re=new RegExp(`<meta[^>]+${attr}=["']${key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]+content=["']([^"']*)["'][^>]*>`,`i`);
  return (String(html).match(re)||[])[1]||'';
}
function parsePage(html, url){
  const title=(String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1];
  const desc=htmlMeta(html,'description','name')||htmlMeta(html,'og:description');
  const ogImage=htmlMeta(html,'og:image');
  const ogVideo=htmlMeta(html,'og:video');
  const published=htmlMeta(html,'article:published_time')||htmlMeta(html,'datePublished','itemprop');
  const text=stripHtml(html).slice(0,250000);
  const images=[]; const videos=[]; const links=[];
  for(const m of String(html).matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)){ const u=absUrl(url,m[1]); if(u&&/^https?:/i.test(u)&&!images.includes(u)) images.push(u); if(images.length>=24)break; }
  if(ogImage){const u=absUrl(url,ogImage); if(u&&!images.includes(u))images.unshift(u);}
  for(const m of String(html).matchAll(/<(?:video|source)[^>]+src=["']([^"']+)["'][^>]*>/gi)){ const u=absUrl(url,m[1]); if(u&&/^https?:/i.test(u)&&!videos.includes(u))videos.push(u); if(videos.length>=12)break; }
  if(ogVideo){const u=absUrl(url,ogVideo); if(u&&!videos.includes(u))videos.unshift(u);}
  for(const m of String(html).matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi)){const u=absUrl(url,m[1]); if(u&&/^https?:\/\//i.test(u)&&!links.includes(u))links.push(u); if(links.length>=80)break;}
  const news=!!published || /\/(news|noticias|article|articles|202[0-9]|2026)\//i.test(url) || /\bnoticia\b|\bnews\b|\búltima hora\b/i.test(title||'');
  let type='web'; if(news) type='news'; if(images.length && !text) type='image'; if(videos.length && !text) type='video';
  return {title:(stripHtml(title)||url).slice(0,220),description:stripHtml(desc).slice(0,500),text,images,videos,links,published,type};
}

const robotsCache=new Map();
async function canFetch(url){
  try{
    const u=new URL(url); const origin=u.origin;
    let rules=robotsCache.get(origin);
    if(rules===undefined){
      try{const r=await fetch(origin+'/robots.txt',{headers:{'user-agent':'BrujulaSearch/4.0 (+local-search)'},signal:AbortSignal.timeout(5000)}); rules=r.ok?await r.text():'';}catch{rules='';}
      robotsCache.set(origin,rules);
    }
    if(!rules) return true;
    const lines=rules.split(/\r?\n/); let active=false;
    for(const line of lines){const s=line.split('#')[0].trim(); if(!s)continue; const [k,...rest]=s.split(':'); if(!k)continue; const v=rest.join(':').trim(); if(k.trim().toLowerCase()==='user-agent') active=(v==='*'||/brujulasearch/i.test(v)); else if(active&&k.trim().toLowerCase()==='disallow'&&v){ if(u.pathname.startsWith(v)) return false; }}
    return true;
  }catch{return true;}
}
async function fetchHtml(url){
  const ctl=new AbortController(); const timer=setTimeout(()=>ctl.abort(),9000);
  try{
    const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'BrujulaSearch/4.0 (+local-search)','accept':'text/html,application/xhtml+xml,text/plain;q=0.8'},signal:ctl.signal});
    const type=r.headers.get('content-type')||''; if(!r.ok || !/text\/(html|plain|xml)|application\/(xhtml\+xml|xml|rss\+xml)|application\/atom\+xml/i.test(type)) return null;
    const text=await r.text(); if(text.length>5000000) return text.slice(0,5000000); return text;
  }catch{return null}finally{clearTimeout(timer)}
}

async function crawlOne(url, depth=0, maxDepth=1, seen=new Set(), queue=[]){
  if(!/^https?:\/\//i.test(url)||seen.has(url)||depth>maxDepth||seen.size>=60) return [];
  const normalized=new URL(url); normalized.hash=''; url=normalized.href; if(seen.has(url)) return [];
  if(!(await canFetch(url))) return [];
  seen.add(url); const html=await fetchHtml(url); if(!html) return [];
  const parsed=parsePage(html,url);
  const id='crawl-'+Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi,'').slice(0,90);
  const doc={id,url,title:parsed.title,site:new URL(url).hostname,text:parsed.text,snippet:parsed.description,description:parsed.description,images:parsed.images,videos:parsed.videos,published:parsed.published,type:parsed.type,updated:Date.now(),source:'Rastreador Brújula'};
  const docs=[doc];
  if(depth<maxDepth){
    const sameHost=new URL(url).hostname;
    for(const l of parsed.links){
      try{if(new URL(l).hostname===sameHost && !seen.has(l)) queue.push({url:l,depth:depth+1});}catch{}
      if(queue.length>20)break;
    }
    while(queue.length && seen.size<60){const nxt=queue.shift(); docs.push(...await crawlOne(nxt.url,nxt.depth,maxDepth,seen,queue));}
  }
  return docs;
}

function simpleExtractiveAnswer(query, results){
  if(!results.length) return 'Brújula todavía no tiene suficiente información indexada para responder esta consulta. Prueba otra frase o añade un sitio desde “Rastreador”.';
  const sentences=[];
  for(const r of results.slice(0,6)){
    const base=String(r.description||r.snippet||r.text||'').replace(/\s+/g,' ').trim();
    if(!base)continue;
    const parts=base.match(/[^.!?]+[.!?]+/g)||[base];
    for(const p of parts){const s=p.trim(); if(s.length>=45&&!sentences.includes(s)) sentences.push(s.slice(0,420)); if(sentences.length>=4)break;}
    if(sentences.length>=4)break;
  }
  return sentences.join(' ')||makeSnippet(results[0].text||results[0].snippet||'',tokenize(query),520);
}

async function discoverPublicSources(query){
  const q=String(query||'').trim(); if(!q)return {web:[],images:[],videos:[],news:[]};
  const out={web:[],images:[],videos:[],news:[]};
  const add=(arr,item)=>{if(item&&item.url&&!arr.some(x=>x.url===item.url))arr.push(item)};
  // Wikipedia HTML search — no API key.
  try{
    const u='https://es.wikipedia.org/w/index.php?search='+encodeURIComponent(q)+'&title=Especial%3ABuscar&ns0=1';
    const h=await fetchHtml(u); if(h){
      const seen=new Set();
      for(const m of h.matchAll(/href=["'](\/wiki\/(?!Especial:|Categoría:|Archivo:|Ayuda:|Portal:|Plantilla:)[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
        const url='https://es.wikipedia.org'+m[1].replace(/&amp;/g,'&'); const title=stripHtml(m[2]); if(!title||seen.has(url))continue; seen.add(url);
        add(out.web,{id:'wiki-'+Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi,'').slice(0,80),url,title,site:'Wikipedia',snippet:`Página de Wikipedia relacionada con “${q}”.`,description:'Resultado descubierto directamente desde la búsqueda pública de Wikipedia.',type:'web',source:'Wikipedia'});
        if(out.web.length>=12)break;
      }
    }
  }catch{}
  // Wikimedia Commons HTML search for images.
  try{
    const u='https://commons.wikimedia.org/w/index.php?search='+encodeURIComponent(q)+'&title=Especial%3ABuscar&ns6=1'; const h=await fetchHtml(u); if(h){
      const files=new Set();
      for(const m of h.matchAll(/href=["'](\/wiki\/File:[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
        const url='https://commons.wikimedia.org'+m[1].replace(/&amp;/g,'&'); const title=stripHtml(m[2]); if(!title||files.has(url))continue; files.add(url);
        let image=''; const chunk=h.slice(Math.max(0,m.index-800),Math.min(h.length,m.index+2400)); const im=chunk.match(/(?:src|data-src)=["'](https?:[^"']+\.(?:jpg|jpeg|png|webp|gif|svg)[^"']*)["']/i); if(im)image=im[1].replace(/&amp;/g,'&');
        add(out.images,{id:'commons-'+Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi,'').slice(0,80),url,title,site:'Wikimedia Commons',snippet:'Imagen descubierta directamente en Wikimedia Commons.',images:image?[image]:[],type:'image',source:'Wikimedia Commons'});
        if(out.images.length>=18)break;
      }
    }
  }catch{}
  // YouTube HTML search — no API key.
  try{
    const u='https://www.youtube.com/results?search_query='+encodeURIComponent(q); const h=await fetchHtml(u); if(h){
      const re=/"videoId":"([A-Za-z0-9_-]{8,})"[\s\S]{0,1400}?"title":\{"runs":\[\{"text":"([^"]+)/g; const seen=new Set(); let m;
      while((m=re.exec(h))&&out.videos.length<18){const id=m[1]; if(seen.has(id))continue; seen.add(id); const title=m[2].replace(/\\u0026/g,'&').replace(/\\"/g,'"'); add(out.videos,{id:'yt-'+id,url:'https://www.youtube.com/watch?v='+id,title,site:'YouTube',snippet:'Video descubierto directamente en la búsqueda pública de YouTube.',videos:['https://www.youtube.com/watch?v='+id],images:['https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'],type:'video',source:'YouTube'});}
    }
  }catch{}
  // News RSS: direct public feeds, filtered locally. No API key.
  const feeds=['https://feeds.bbci.co.uk/mundo/rss.xml','https://rss.dw.com/rdf/rss-es-all'];
  for(const feed of feeds){
    try{const h=await fetchHtml(feed); if(!h)continue; for(const item of h.matchAll(/<item[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>([\s\S]*?<description>([\s\S]*?)<\/description>)?[\s\S]*?<\/item>/gi)){
      const title=stripHtml(item[1]), url=stripHtml(item[2]), desc=stripHtml(item[4]||''); const hay=normalizeText(title+' '+desc); const terms=tokenize(q); if(terms.some(t=>hay.includes(t))){add(out.news,{id:'news-'+Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi,'').slice(0,80),url,title,site:new URL(url).hostname,snippet:desc.slice(0,320),description:desc,type:'news',source:'RSS público'});}
      if(out.news.length>=20)break;
    }}catch{}
  }
  return out;
}

async function searchBrujula(query, opts={}){
  const raw=String(query||'').trim(); const type=String(opts.type||'all');
  if(!raw) return {query:raw,results:[],answer:'Escribe una búsqueda para consultar Brújula.',counts:{web:0,images:0,videos:0,news:0},indexSize:getSearchIndex().length,live:false};
  const localAll=localSearch(raw,'web');
  let live={web:[],images:[],videos:[],news:[]};
  try{live=await Promise.race([discoverPublicSources(raw),new Promise(resolve=>setTimeout(()=>resolve(live),11000))]);}catch{}
  const all=[]; const merge=(r)=>{for(const x of r){const existing=all.find(y=>y.url===x.url); if(existing){existing.score=Math.max(existing.score||0,x.score||0); existing.images=[...(existing.images||[]),...(x.images||[])]; existing.videos=[...(existing.videos||[]),...(x.videos||[])];}else all.push({...x,score:(x.score||0)+18});}};
  merge(localAll); merge(live.web.map(x=>({...x,score:scoreDoc(x,tokenize(raw),raw)+12})));
  const web=all.sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,50);
  const images=[...localSearch(raw,'images'),...live.images].slice(0,40);
  const videos=[...localSearch(raw,'videos'),...live.videos].slice(0,40);
  const news=[...localSearch(raw,'news'),...live.news].slice(0,40);
  return {query:raw,results:type==='images'?images:type==='videos'?videos:type==='news'?news:web,web,images,videos,news,answer:simpleExtractiveAnswer(raw,web),counts:{web:web.length,images:images.length,videos:videos.length,news:news.length},indexSize:getSearchIndex().length,live:true};
}

async function persistDiscovered(results){
  const current=getSearchIndex(); const map=new Map(current.map(x=>[x.url,x]));
  for(const x of results||[]){ if(x?.url&&/^https?:\/\//i.test(x.url)) map.set(x.url,{...x,id:x.id||('discover-'+Buffer.from(x.url).toString('base64').replace(/[^a-z0-9]/gi,'').slice(0,80)),updated:Date.now()}); }
  saveSearchIndex([...map.values()]); return map.size;
}

ipcMain.handle('brujula-search',(_,q,opts)=>searchBrujula(q,opts||{}));
ipcMain.handle('brujula-search-save-discovered',async(_,items)=>({ok:true,total:await persistDiscovered(items||[])}));
ipcMain.handle('brujula-crawl',async(_,payload)=>{
  const url=String(payload?.url||'').trim(); const depth=Math.min(2,Math.max(0,Number(payload?.depth??1))); if(!/^https?:\/\//i.test(url)) return {ok:false,error:'Escribe una URL completa, por ejemplo https://example.com'};
  const seen=new Set(),queue=[]; const docs=await crawlOne(url,0,depth,seen,queue); await persistDiscovered(docs); return {ok:true,pages:docs.length,indexSize:getSearchIndex().length,preview:docs.slice(0,5).map(x=>({title:x.title,url:x.url}))};
});
ipcMain.handle('brujula-index-current',async()=>{
  const t=tabs.get(activeId); if(!t||t.home||t.search) return {ok:false,error:'No hay una página web activa para indexar.'};
  try{
    const data=await t.view.webContents.executeJavaScript(`(()=>({url:location.href,title:document.title,html:document.documentElement?.outerHTML||'',text:document.body?.innerText||''}))()`,true);
    if(!/^https?:\/\//i.test(data.url)) return {ok:false,error:'Solo se pueden indexar páginas web.'};
    const parsed=parsePage(data.html||'',data.url); const doc={id:'page-'+Buffer.from(data.url).toString('base64').replace(/[^a-z0-9]/gi,'').slice(0,80),url:data.url,title:data.title||parsed.title||data.url,site:new URL(data.url).hostname,text:String(data.text||parsed.text).slice(0,250000),snippet:parsed.description,description:parsed.description,images:parsed.images,videos:parsed.videos,published:parsed.published,type:parsed.type,updated:Date.now(),source:'Página añadida desde Brújula'};
    await persistDiscovered([doc]); return {ok:true,title:doc.title,total:getSearchIndex().length};
  }catch(e){return {ok:false,error:e?.message||'No se pudo indexar la página.'};}
});

ipcMain.handle('new-tab',(_,u)=>createTab(u||HOME));
ipcMain.handle('close-tab',(_,id)=>closeTab(id));
ipcMain.handle('activate-tab',(_,id)=>activate(id));
ipcMain.handle('navigate',(_,u)=>navigate(u));
ipcMain.handle('open-brujula-search',(_,q)=>createBrujulaSearchTab(q||''));
ipcMain.handle('search',(_,q,engine)=>{ if(String(engine||'')==='brujula'||!engine) return createBrujulaSearchTab(q); const base=SEARCH_ENGINES[String(engine)]; if(base) navigate(base+encodeURIComponent(String(q||''))); else createBrujulaSearchTab(q); });
ipcMain.handle('search-all',async(_,q)=>{ createBrujulaSearchTab(q); return true; });
ipcMain.handle('ask-web',(_,q)=>createBrujulaSearchTab(q));
ipcMain.handle('back',()=>tabs.get(activeId)?.view.webContents.goBack());
ipcMain.handle('forward',()=>tabs.get(activeId)?.view.webContents.goForward());
ipcMain.handle('reload',()=>tabs.get(activeId)?.view.webContents.reload());
ipcMain.handle('stop',()=>tabs.get(activeId)?.view.webContents.stop());
ipcMain.handle('home',()=>navigate(HOME));
ipcMain.handle('zoom',(_,d)=>{
  const t=tabs.get(activeId);
  if(t&&!t.home){
    const wc=t.view.webContents;
    wc.setZoomFactor(Math.min(2,Math.max(.5,wc.getZoomFactor()+Number(d))));
  }
});
ipcMain.handle('fullscreen',()=>{if(win)win.setFullScreen(!win.isFullScreen());});
ipcMain.handle('clear-data',async()=>{await session.defaultSession.clearStorageData();await session.defaultSession.clearCache();return true;});
ipcMain.handle('get-history',()=>readJSON('history.json',[]));
ipcMain.handle('clear-history',()=>writeJSON('history.json',[]));
ipcMain.handle('get-bookmarks',()=>readJSON('bookmarks.json',[]));
ipcMain.handle('save-bookmark',(_,b)=>{
  let a=readJSON('bookmarks.json',[]).filter(x=>x.url!==b.url);
  a.unshift({url:String(b.url),title:String(b.title||b.url),time:Date.now()});
  writeJSON('bookmarks.json',a.slice(0,500));
  return a;
});
ipcMain.handle('delete-bookmark',(_,url)=>{
  let a=readJSON('bookmarks.json',[]).filter(x=>x.url!==url);
  writeJSON('bookmarks.json',a);
  return a;
});
ipcMain.handle('get-downloads-path',()=>app.getPath('downloads'));


const privacyDefaults = { enabled:true };
ipcMain.handle('get-privacy',()=>{ const x=readJSON('privacy.json',privacyDefaults); return Boolean(x.enabled); });
ipcMain.handle('toggle-privacy',(_,enabled)=>{ writeJSON('privacy.json',{enabled:Boolean(enabled)}); return Boolean(enabled); });
const BLOCKED_HOSTS=['doubleclick.net','googlesyndication.com','google-analytics.com','googletagmanager.com','adnxs.com','adsrvr.org','scorecardresearch.com','connect.facebook.net'];
function installPrivacyFilter(){
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(details,callback)=>{
    const setting=readJSON('privacy.json',privacyDefaults);
    if(!setting.enabled) return callback({cancel:false});
    try{
      const u=new URL(details.url);
      const host=u.hostname.toLowerCase();
      const blocked=BLOCKED_HOSTS.some(x=>host===x||host.endsWith('.'+x));
      callback({cancel:blocked});
    }catch{callback({cancel:false});}
  });
}
ipcMain.handle('find-in-page',(_,q)=>{ const t=tabs.get(activeId); if(t&&!t.home) return t.view.webContents.findInPage(String(q||'')); return null; });
ipcMain.handle('stop-find',()=>{ const t=tabs.get(activeId); if(t&&!t.home) t.view.webContents.stopFindInPage('clearSelection'); });
ipcMain.handle('save-page-png',async()=>{
  const t=tabs.get(activeId); if(!t||t.home) return false;
  const image=await t.view.webContents.capturePage();
  const file=path.join(app.getPath('downloads'),`Brujula-Captura-${Date.now()}.png`);
  fs.writeFileSync(file,image.toPNG()); return true;
});
ipcMain.handle('print-page',async()=>{ const t=tabs.get(activeId); if(t&&!t.home) return new Promise(r=>t.view.webContents.print({silent:false},()=>r(true))); return false; });
ipcMain.handle('devtools',()=>{ const t=tabs.get(activeId); if(t&&!t.home) t.view.webContents.openDevTools({mode:'detach'}); });

app.whenReady().then(()=>{
  installPrivacyFilter();
  session.defaultSession.on('will-download',(_,item)=>{
    const p=path.join(app.getPath('downloads'),item.getFilename());
    item.setSavePath(p);
    item.on('updated',()=>win?.webContents.send('download-progress',{fileName:item.getFilename(),received:item.getReceivedBytes(),total:item.getTotalBytes()}));
    item.on('done',(_,state)=>win?.webContents.send('download-done',{fileName:item.getFilename(),state,path:p}));
  });
  createWindow();
  createTab(HOME);
  activate(activeId);
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
