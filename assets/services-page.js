/* © 2018–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* Services directory: list approved providers with reviews, take reviews and listing applications. */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '';
  const list = document.getElementById('sv-list'); if (!list) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
  const stars = n => { const r = Math.round(n); return '<span class="sv-stars" aria-label="' + n + ' out of 5">' + '★'.repeat(r) + '<span class="off">' + '★'.repeat(5 - r) + '</span></span>'; };
  let all = [], filter = '';
  function draw(){
    const show = all.filter(p => !filter || p.services.indexOf(filter) >= 0);
    if (!show.length) { list.innerHTML = '<div class="empty panel"><b>' + (all.length ? 'Nobody listed for ' + esc(filter) + ' yet.' : 'The first listings are on their way.') + '</b><span>Offer this service? <a href="#list-yours">List yourself free</a>.</span></div>'; return; }
    list.innerHTML = show.map(p => {
      const links = [p.website && safeUrl(p.website) ? '<a href="' + esc(p.website) + '" target="_blank" rel="noopener nofollow">Website</a>' : '', p.social && safeUrl(p.social) ? '<a href="' + esc(p.social) + '" target="_blank" rel="noopener nofollow">Socials</a>' : ''].filter(Boolean).join(' · ');
      const rv = p.reviews.slice(0, 5).map(r => '<li>' + stars(r.stars) + ' <b>' + esc(r.name) + '</b>' + (r.comment ? '<br><span>' + esc(r.comment) + '</span>' : '') + '</li>').join('');
      return '<article class="panel sv-card"><header><h3>' + esc(p.name) + '</h3>' + (p.count ? '<p class="sv-rating">' + stars(p.rating) + ' <b>' + p.rating + '</b> (' + p.count + (p.count === 1 ? ' review' : ' reviews') + ')</p>' : '<p class="sv-rating small">No reviews yet</p>') + '</header>' +
        '<p class="sv-tags">' + p.services.map(s => '<span class="tag">' + esc(s) + '</span>').join('') + (p.country ? '<span class="small"> · ' + esc(p.country) + '</span>' : '') + '</p>' +
        (p.genres ? '<p class="small"><b>Genres:</b> ' + esc(p.genres) + '</p>' : '') + '<p>' + esc(p.description) + '</p>' +
        (p.prices ? '<p class="small"><b>Prices:</b> ' + esc(p.prices) + '</p>' : '') + (links ? '<p class="small">' + links + '</p>' : '') +
        '<p><a class="btn ghost sv-review" href="#review" data-id="' + esc(p.id) + '">Review ' + esc(p.name) + '</a></p>' +
        (rv ? '<details><summary>Read reviews</summary><ul class="sv-reviews">' + rv + '</ul></details>' : '') + '</article>';
    }).join('');
  }
  document.querySelectorAll('.sv-filter .chip').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.f; document.querySelectorAll('.sv-filter .chip').forEach(x => x.setAttribute('aria-pressed', x === b)); draw();
  }));
  const sel = document.getElementById('rv-provider');
  list.addEventListener('click', e => { const a = e.target.closest('.sv-review'); if (a && sel) sel.value = a.dataset.id; });
  if (url) fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'providers=1').then(r => r.json()).then(j => {
    all = (j && j.providers) || []; draw();
    sel.innerHTML = '<option value="">Choose…</option>' + all.map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('');
  }).catch(() => { list.innerHTML = '<div class="empty panel"><b>The directory didn\'t load.</b><span>Refresh the page to try again.</span></div>'; });
  else draw();

  function hook(formId, statusId, kind, okMsg, extra){
    const form = document.getElementById(formId); if (!form) return;
    const st = document.getElementById(statusId);
    const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = '<span class="dot"></span><span>' + html + '</span>'; };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (extra && !extra(form, say)) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (!url) { say(false, 'This form isn\'t switched on yet.'); return; }
      const data = new URLSearchParams(); new FormData(form).forEach((v, k) => { if (k !== 'svc') data.append(k, v); });
      if (kind === 'provider-apply') data.append('services', [...form.querySelectorAll('input[name=svc]:checked')].map(x => x.value).join(','));
      data.append('form', kind);
      try { await window.rrrSend(url, data); say(true, okMsg); form.reset(); }
      catch (err) { say(false, '<strong>That didn\'t send.</strong> Check your connection and try again.'); }
    });
  }
  hook('rv-form', 'rv-status', 'provider-review', '<strong>Nearly done: check your email.</strong> Click the link we sent you to publish your review.');
  hook('sp-form', 'sp-status', 'provider-apply', '<strong>Thanks! Your listing is with the RRR team.</strong> We check every listing and email you when it\'s live.',
    (form, say) => { if (!form.querySelector('input[name=svc]:checked')) { say(false, 'Tick at least one service.'); return false; } return true; });
})();
