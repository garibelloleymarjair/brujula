const $=s=>document.querySelector(s);
const tabs=$('#tabs'),address=$('#address'),home=$('#home'),menu=$('#menu'),toast=$('#toast'),panel=$('#panel');
let current=null,bookmarks=[];
const SEARCH_ENGINES={brujula:{name:'Brújula',url:'brujula-search://results?q=',icon:'B',note:'Motor propio'}};
function showToast(m){toast.textContent=m;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),2600)}
function isUrl(v){return /^(https?|ftp):\/\//i.test(v)||/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(v)||/^[\w.-]+\.[a-z]{2,}([/:].*)?$/i.test(v)}
function selectedEngine(){return 'brujula'}
function saveEngine(v){localStorage.setItem('brujula-engine','brujula')}
function searchOrNavigate(v,engine='brujula'){v=String(v||'').trim();if(!v)return;if(isUrl(v)){if(/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(v))v='http://'+v;else if(!/^(https?|ftp):\/\//i.test(v))v='https://'+v;window.brujula.navigate(v);return}window.brujula.openBrujulaSearch(v)}
function syncEngine(){const sel=$('#homeEngine');if(sel){sel.innerHTML='<option value=\"brujula\">Brújula · buscador propio</option>';sel.value='brujula';}if($('#homeInput'))$('#homeInput').placeholder='Busca en Brújula o escribe una dirección...';const re=$('#researchEngine');if(re){re.innerHTML='<option value=\"brujula\">Brújula · buscador propio</option>';re.value='brujula';}}
function buildSearchers(){syncEngine()}
$('#back').onclick=()=>window.brujula.back();$('#forward').onclick=()=>window.brujula.forward();$('#reload').onclick=()=>current?.loading?window.brujula.stop():window.brujula.reload();$('#homeBtn').onclick=()=>window.brujula.home();$('#newTab').onclick=()=>window.brujula.newTab();
$('#clearAddress').onclick=()=>{address.value='';address.focus()};
$('#bookmark').onclick=async()=>{if(!current||current.home)return showToast('Abre una página para guardarla.');bookmarks=await window.brujula.saveBookmark({url:current.url,title:current.title});showToast('⭐ Guardado en favoritos.')};
address.addEventListener('keydown',e=>{if(e.key==='Enter')searchOrNavigate(address.value)});address.addEventListener('focus',()=>address.select());
$('#search').onsubmit=e=>{e.preventDefault();searchOrNavigate($('#homeInput').value,$('#homeEngine').value)};
$('#homeEngine').onchange=e=>{saveEngine(e.target.value);syncEngine();syncResearchEngine()};
$('#researchEngine').onchange=e=>{saveEngine(e.target.value);localStorage.setItem('brujula-research-engine',e.target.value);syncResearchEngine()};
$('#homeInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#search').requestSubmit()});
$('#searchAllBtn').onclick=async()=>{const q=$('#homeInput').value.trim();if(!q)return showToast('Escribe algo para investigar.');await window.brujula.openBrujulaSearch(q);showToast('🕷️ Brújula está investigando.')};
document.querySelectorAll('.quick button').forEach(b=>b.onclick=()=>window.brujula.navigate(b.dataset.url));
$('#menuBtn').onclick=()=>menu.classList.toggle('hidden');
document.addEventListener('click',e=>{if(!e.target.closest('#menu')&&!e.target.closest('#menuBtn'))menu.classList.add('hidden')});
$('#zoomIn').onclick=()=>window.brujula.zoom(.1);$('#zoomOut').onclick=()=>window.brujula.zoom(-.1);$('#fullscreen').onclick=()=>window.brujula.fullscreen();
$('#clearData').onclick=async()=>{await window.brujula.clearData();showToast('🧹 Datos de sitios borrados.');menu.classList.add('hidden')};
$('#downloads').onclick=async()=>showToast('📥 Carpeta: '+await window.brujula.getDownloadsPath());
const creatorPanel=$('#creatorPanel');
function openCreator(){menu.classList.add('hidden');themePanel?.classList.add('hidden');researchHub?.classList.add('hidden');creatorPanel.classList.remove('hidden')}
function closeCreator(){creatorPanel.classList.add('hidden')}
$('#about').onclick=openCreator;$('#creatorBtn').onclick=openCreator;if($('#creatorHome'))$('#creatorHome').onclick=openCreator;$('#creatorClose').onclick=closeCreator;
creatorPanel.addEventListener('click',e=>{if(e.target===creatorPanel)closeCreator()});
$('#panelClose').onclick=()=>panel.classList.add('hidden');
async function openPanel(type){
  panel.classList.remove('hidden');const body=$('#panelBody');$('#panelTitle').textContent=type==='history'?'🕘 Historial':'⭐ Favoritos';body.innerHTML='';
  if(type==='history'){
    const list=await window.brujula.getHistory();if(!list.length){body.innerHTML='<div class="empty">No hay historial.</div>';return}
    const clear=document.createElement('button');clear.className='panel-item danger';clear.textContent='🗑️ Borrar historial';clear.onclick=async()=>{await window.brujula.clearHistory();openPanel('history')};body.appendChild(clear);list.forEach(x=>addPanelItem(body,x))
  }else{
    bookmarks=await window.brujula.getBookmarks();if(!bookmarks.length){body.innerHTML='<div class="empty">No hay favoritos.</div>';return}bookmarks.forEach(x=>addPanelItem(body,x))
  }
}
function addPanelItem(body,x){const b=document.createElement('button');b.className='panel-item';b.innerHTML='<b></b><small></small>';b.querySelector('b').textContent=x.title||x.url;b.querySelector('small').textContent=x.url;b.onclick=()=>{window.brujula.navigate(x.url);panel.classList.add('hidden')};body.appendChild(b)}
$('#brujulaSearchMenu').onclick=()=>{menu.classList.add('hidden');window.brujula.openBrujulaSearch('')};
$('#history').onclick=()=>openPanel('history');$('#bookmarks').onclick=()=>openPanel('bookmarks');
document.addEventListener('keydown',e=>{const c=e.ctrlKey||e.metaKey;if(c&&e.key.toLowerCase()==='l'){e.preventDefault();address.focus();address.select()}else if(c&&e.key.toLowerCase()==='t'){e.preventDefault();window.brujula.newTab()}else if(c&&e.key.toLowerCase()==='w'){e.preventDefault();document.querySelector('.tab.active .tab-close')?.click()}else if(c&&e.key.toLowerCase()==='r'){e.preventDefault();window.brujula.reload()}else if(c&&e.key.toLowerCase()==='f'){e.preventDefault();showFind()}else if(c&&e.shiftKey&&e.key.toLowerCase()==='i'){e.preventDefault();window.brujula.devtools()}else if(c&&e.key.toLowerCase()==='p'){e.preventDefault();window.brujula.printPage()}else if(e.key==='F11'){e.preventDefault();window.brujula.fullscreen()}else if(e.key==='Escape'&&!creatorPanel.classList.contains('hidden')){closeCreator()}});

// Fondos / temas
const themePanel=$('#themePanel');
function applyTheme(n){document.body.className=document.body.className.replace(/theme-\w+/g,'');if(n!=='default')document.body.classList.add('theme-'+n);localStorage.setItem('brujula-theme',n)}
const BG_NAMES=['aurora','ocean','sunset','cyber','violet','forest'];
function setWallpaper(n,custom=null){document.body.className=document.body.className.replace(/bg-\w+/g,'');document.body.classList.remove('wall-auto');const wall=$('.home-wallpaper');wall.style.backgroundImage='';if(custom){wall.style.backgroundImage=`linear-gradient(180deg,#05091522,#05091566),url(${custom})`;localStorage.setItem('brujula-custom-bg',custom);localStorage.setItem('brujula-bg','custom');return}if(n==='auto'){const day=Math.floor(Date.now()/86400000);n=BG_NAMES[day%BG_NAMES.length];document.body.classList.add('wall-auto')}document.body.classList.add('bg-'+n);localStorage.setItem('brujula-bg',n)}
function loadAppearance(){applyTheme(localStorage.getItem('brujula-theme')||'default');const custom=localStorage.getItem('brujula-custom-bg');const saved=localStorage.getItem('brujula-bg')||'auto';if(saved==='custom'&&custom)setWallpaper('custom',custom);else setWallpaper(saved)}
$('#themes').onclick=()=>{menu.classList.add('hidden');themePanel.classList.remove('hidden')};$('#themeClose').onclick=()=>themePanel.classList.add('hidden');
themePanel.addEventListener('click',e=>{const t=e.target.closest('[data-theme]'),b=e.target.closest('[data-bg]');if(t)applyTheme(t.dataset.theme);if(b)setWallpaper(b.dataset.bg)});
$('#resetTheme').onclick=()=>{localStorage.removeItem('brujula-custom-bg');applyTheme('default');setWallpaper('auto');showToast('🎨 Inicio restaurado')};$('#removeCustomBg').onclick=()=>{localStorage.removeItem('brujula-custom-bg');setWallpaper('auto');showToast('🖼️ Fondo personalizado quitado')};
$('#changeBg').onclick=()=>themePanel.classList.remove('hidden');$('#shuffleBg').onclick=()=>{const n=BG_NAMES[Math.floor(Math.random()*BG_NAMES.length)];setWallpaper(n);showToast('↻ Fondo cambiado')};$('#uploadBg').onclick=()=>$('#wallpaperFile').click();
$('#wallpaperFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas'),maxW=1600,maxH=900,scale=Math.min(1,maxW/img.width,maxH/img.height);c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);const data=c.toDataURL('image/jpeg',.82);setWallpaper('custom',data);showToast('🖼️ Fondo guardado en Brújula')};img.src=r.result};r.readAsDataURL(f);e.target.value='' });

// Brújula: indexar la página web actual sin usar una API ni un buscador externo.
const indexCurrentBtn=$('#indexCurrent');
if(indexCurrentBtn) indexCurrentBtn.onclick=async()=>{menu.classList.add('hidden');const r=await window.brujula.indexCurrentPage();showToast(r.ok?`📚 Indexada en Brújula: ${r.title}`:(r.error||'No se pudo indexar.'))};

// Power
const findBar=$('#findBar'),findInput=$('#findInput');function showFind(){menu.classList.add('hidden');findBar.classList.remove('hidden');findInput.focus();findInput.select()}$('#findPage').onclick=showFind;$('#findClose').onclick=()=>{findBar.classList.add('hidden');window.brujula.stopFind()};$('#findInput').addEventListener('input',()=>window.brujula.findInPage(findInput.value));$('#findNext').onclick=()=>window.brujula.findInPage(findInput.value);$('#findPrev').onclick=()=>window.brujula.findInPage(findInput.value);
let privacyEnabled=true;window.brujula.getPrivacy().then(v=>{privacyEnabled=v;$('#privacy').textContent=v?'🛡️ Privacidad inteligente: ACTIVADA':'🛡️ Privacidad inteligente: DESACTIVADA'});$('#privacy').onclick=async()=>{privacyEnabled=await window.brujula.togglePrivacy(!privacyEnabled);$('#privacy').textContent=privacyEnabled?'🛡️ Privacidad inteligente: ACTIVADA':'🛡️ Privacidad inteligente: DESACTIVADA';showToast(privacyEnabled?'🛡️ Protección activada':'Protección desactivada')};
$('#screenshot').onclick=async()=>showToast((await window.brujula.savePagePNG())?'📸 Captura guardada en Descargas':'No hay una página activa.');$('#print').onclick=async()=>{await window.brujula.printPage();menu.classList.add('hidden')};$('#devtools').onclick=()=>{window.brujula.devtools();menu.classList.add('hidden')};

// Investigación SIN API: usa sitios web normales dentro del navegador.
const researchHub=$('#researchHub'),researchResult=$('#researchResult'),researchInput=$('#researchInput');
const ANSWER_SITES={brujula:''};
function openResearch(){researchHub.classList.remove('hidden');researchInput.focus();researchInput.select()}
function askWeb(q,site='perplexity'){
  q=String(q||'').trim(); if(!q){showToast('Escribe una pregunta primero.');researchInput.focus();return}
  researchResult.innerHTML='<div class="loading-research">Abriendo Brújula…</div>';
  window.brujula.openBrujulaSearch(q);
  setTimeout(()=>researchHub.classList.add('hidden'),180);
}
function runSelectedSearch(){const q=researchInput.value.trim();if(!q)return showToast('Escribe una pregunta primero.');const engine=$('#researchEngine')?.value||selectedEngine();saveEngine(engine);localStorage.setItem('brujula-research-engine',engine);window.brujula.search(q,engine);researchHub.classList.add('hidden')}
$('#ai').onclick=openResearch;
$('#researchClose').onclick=()=>researchHub.classList.add('hidden');
$('#researchBtn').onclick=openResearch;
$('#researchForm').onsubmit=e=>{e.preventDefault();runSelectedSearch()};
if($('#researchPerplexity')) $('#researchPerplexity').onclick=()=>runSelectedSearch();
if($('#researchGeminiWeb')) $('#researchGeminiWeb').onclick=()=>runSelectedSearch();
if($('#researchChatGPT')) $('#researchChatGPT').onclick=()=>runSelectedSearch();
$('#researchSearch').onclick=runSelectedSearch;
$('#researchMany').onclick=async()=>{const q=researchInput.value.trim();if(!q)return showToast('Escribe una pregunta primero.');await window.brujula.openBrujulaSearch(q);researchHub.classList.add('hidden');showToast('🕷️ Investigación Brújula iniciada')};

buildSearchers();loadAppearance();syncEngine();
