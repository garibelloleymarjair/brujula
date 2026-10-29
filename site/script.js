(() => {
  // En GitHub Pages, infiere el repositorio desde la dirección publicada.
  const host = window.location.hostname;
  const owner = host.endsWith('.github.io') ? host.slice(0, -'.github.io'.length) : '';
  const firstPath = window.location.pathname.split('/').filter(Boolean)[0] || '';
  const repo = firstPath || (owner ? `${owner}.github.io` : '');
  const url = owner && repo ? `https://github.com/${owner}/${repo}` : 'https://github.com/';
  for (const id of ['repoTop', 'repoHero', 'repoBottom']) {
    const link = document.getElementById(id);
    if (link) link.href = url;
  }
})();
