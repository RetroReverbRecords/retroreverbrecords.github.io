/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* RRR Submit curator queue: curator.html?k=<private key> */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = new URLSearchParams(location.search).get('k') || '';
  const st = $('#cq-status'), listEl = $('#cq-list');
  const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
  const post = data => Promise.race([fetch(url, { method: 'POST', mode: 'no-cors', body: data, keepalive: true }), new Promise(r => setTimeout(r, 350))]);
  const words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  let data = null, filter = 'all', minWords = 20;
  const left = d => { const h = (new Date(d) - Date.now()) / 3600000; return h <= 0 ? 'expired' : h < 48 ? `in ${Math.ceil(h)} hours` : `in ${Math.ceil(h / 24)} days`; };
  const fmt = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  function stats(){
    const s = data.stats;
    $('#cu-title').innerHTML = esc(data.curator.name) + ' <em>queue</em>';
    $('#cu-stats').innerHTML = `<div><b class="num">${s.answers}</b><span>answers given</span><small>${s.thisMonth} this month</small></div>
      <div><b class="num">${s.rate}%</b><span>response rate</span><small>past 30 days</small></div>
      <div><b class="num">€${Number(s.owed).toFixed(2)}</b><span>earned, not paid yet</span><small>paid monthly by PayPal</small></div>`;
    const t = data.todo;
    const n = { all: t.length, urgent: t.filter(r => (new Date(r.due) - Date.now()) < 48 * 3600000).length, listen: t.filter(r => !r.listened).length, complete: t.filter(r => r.listened).length, done: data.done.length };
    $$('.subtabs [role=tab]').forEach(b => { b.textContent = b.textContent.replace(/ \(\d+\)$/, '') + ` (${n[b.dataset.f]})`; });
  }
  function rows(){
    const t = data.todo;
    const pick = { all: t, urgent: t.filter(r => (new Date(r.due) - Date.now()) < 48 * 3600000), listen: t.filter(r => !r.listened), complete: t.filter(r => r.listened), done: data.done }[filter];
    if (!pick.length) { listEl.innerHTML = '<div class="panel empty"><b>Nothing here.</b><span>' + (filter === 'done' ? 'Answered tracks appear here.' : 'All caught up. New tracks arrive by email.') + '</span></div>'; return; }
    listEl.innerHTML = pick.map(r => `<article class="panel cqitem" data-id="${esc(r.id)}">
      <div class="cqhead"><div><b>${esc(r.title)}</b><span class="small">${esc(r.artist)} · ${esc(r.genre)}</span></div>
        <span class="cqstate ${r.status !== 'open' ? 's-' + esc(r.status) : r.listened ? 'listened' : 'tolisten'}">${r.status === 'answered' ? (r.decision === 'accepted' ? 'Accepted' : 'Declined') : r.status === 'expired' ? 'Expired' : r.listened ? 'To complete' : 'To listen'}</span>
        <span class="small due ${(new Date(r.due) - Date.now()) < 48 * 3600000 && r.status === 'open' ? 'urgent' : ''}">${r.status === 'open' ? 'Expires ' + esc(left(r.due)) : esc(fmt(r.answered || r.due))}</span></div>
      ${r.message ? `<p class="small cqmsg">“${esc(r.message)}”</p>` : ''}
      ${r.status === 'open' ? `<p><a class="btn ghost" href="${esc(/^https:\/\//.test(r.url) ? r.url : '#')}" target="_blank" rel="noopener" data-listen>▶ Listen</a></p>
      <form class="cqform" novalidate>
        <label>Your feedback <span class="small" data-wc>0 / ${minWords} words</span><textarea name="feedback" required placeholder="What works, what you'd change, and why you accept or decline"></textarea></label>
        <div class="radios"><label><input type="radio" name="decision" value="accepted" required> Accept</label><label><input type="radio" name="decision" value="declined"> Decline</label></div>
        <label>If accepted, where? (optional)<input name="where" type="text" placeholder="e.g. Bandcamp Hour on 12 Oct, #synthfam playlist"></label>
        <button class="btn primary" type="submit">Send feedback</button></form>` : r.feedback ? `<p class="small cqfb">${esc(r.feedback)}</p>` : ''}
    </article>`).join('');
    $$('.cqitem').forEach(card => {
      const id = card.dataset.id, r = data.todo.find(x => x.id === id);
      const l = card.querySelector('[data-listen]'); if (l) l.addEventListener('click', () => { if (r && !r.listened) { r.listened = true; post(new URLSearchParams({ form: 'submit-listened', key, review_id: id })); setTimeout(() => { stats(); }, 50); } });
      const fm = card.querySelector('.cqform'); if (!fm) return;
      const ta = fm.feedback, wc = fm.querySelector('[data-wc]');
      ta.addEventListener('input', () => { const n = words(ta.value); wc.textContent = `${n} / ${minWords} words`; wc.classList.toggle('ok', n >= minWords); });
      fm.addEventListener('submit', async e => {
        e.preventDefault();
        ta.setCustomValidity(words(ta.value) < minWords ? `Please write at least ${minWords} words` : '');
        if (!fm.checkValidity()) { fm.reportValidity(); return; }
        const dec = fm.querySelector('input[name=decision]:checked').value;
        try {
          await post(new URLSearchParams({ form: 'submit-feedback', key, review_id: id, feedback: ta.value.trim(), decision: dec, where: fm.where.value.trim() }));
          data.todo = data.todo.filter(x => x.id !== id); data.done.unshift(Object.assign({}, r, { status: 'answered', decision: dec, feedback: ta.value.trim(), answered: new Date() }));
          data.stats.answers++; data.stats.thisMonth++;
          stats(); rows(); say(true, `<strong>Sent ✓</strong> ${esc(r.artist)} gets your feedback by email.`); if (window.rrrChime) window.rrrChime();
        } catch (err) { say(false, '<strong>That didn\'t send.</strong> Try again.'); }
      });
    });
  }
  $$('.subtabs [role=tab]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; $$('.subtabs [role=tab]').forEach(x => x.setAttribute('aria-selected', String(x === b))); if (data) rows(); }));
  if (!key || !url) { $('#cu-stats').innerHTML = '<span class="small">This page needs your private curator link.</span>'; return; }
  fetch(url + (url.includes('?') ? '&' : '?') + 'queue=' + encodeURIComponent(key)).then(r => r.json()).then(j => {
    if (!j.ok) { $('#cu-stats').innerHTML = '<span class="small">This link isn\'t valid. Ask RRR for a new one.</span>'; return; }
    data = j; minWords = Number(($('[data-minwords]') || {}).textContent) || 20; stats(); rows();
  }).catch(() => { $('#cu-stats').innerHTML = '<span class="small">Couldn\'t load your queue. Try again in a minute.</span>'; });
})();
