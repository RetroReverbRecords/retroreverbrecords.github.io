/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* "Done, I've set it" from the linking email lands here and tells the automation. */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '';
  const t = new URLSearchParams(location.search).get('t') || '';
  const title = document.getElementById('ld-title'), body = document.getElementById('ld-body');
  const show = (h, b) => { title.textContent = h; body.innerHTML = b; };
  if (!t || !url) { show('Link not found', 'Please request linking again from your dashboard.'); return; }
  fetch(url + (url.includes('?') ? '&' : '?') + 'linkready=' + encodeURIComponent(t) + '&json=1')
    .then(r => r.json()).then(j => { show(j.title || 'Thanks!', j.body || ''); if (/Thanks/.test(j.title || '') && window.rrrChime) window.rrrChime(); })
    .catch(() => show('Thanks!', 'We\'ve been told you\'ve set the placeholder password. We\'ll link your page soon and email you <b>"Linked ✓"</b>.'));
})();
