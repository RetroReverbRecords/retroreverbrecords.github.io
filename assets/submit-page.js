/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* RRR Submit: pick curators, send a track, pay per curator; curator applications. */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let beta = false; try { beta = !!C.betaKey && localStorage.getItem('rrr-beta') === C.betaKey; } catch (e) {}
  const open = !!(url && (C.bookingOpen || C.signupOpen || beta));
  const demoPrefix = String(C.demoEmailPrefix || '').toLowerCase();
  const isDemo = e => { const x = String(e || '').trim().toLowerCase(); return !!demoPrefix && x.indexOf(demoPrefix) === 0 && /@gmail\.com$/.test(x); };
  const say = (el, ok, html) => { el.classList.toggle('open', ok); el.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
  const post = data => Promise.race([fetch(url, { method: 'POST', mode: 'no-cors', body: data, keepalive: true }), new Promise(r => setTimeout(r, 350))]);
  let price = 1, max = 10, curators = [];
  const subForm = $('#sub-form'), subSt = $('#sub-status'), list = $('#cur-list');
  const chosen = () => $$('#cur-list input[name=curator]:checked').map(x => x.value);
  const total = () => { const n = chosen().length; $('#sub-count').textContent = n + ' curator' + (n === 1 ? '' : 's'); $('#sub-total').textContent = '€' + (n * price).toFixed(2); };
  function draw(){
    if (!curators.length) { list.innerHTML = '<div class="panel empty"><b>No curators yet.</b><span>Check back soon.</span></div>'; return; }
    list.innerHTML = curators.map(c => `<label class="curcard panel"><input type="checkbox" name="curator" value="${esc(c.id)}">
      <span class="curtype">${esc(c.type)}</span><b>${esc(c.name)}</b><span class="small">${esc(c.genres)}</span>
      <span class="small">${esc(c.audience)}</span>${c.about ? `<span class="small about">${esc(c.about)}</span>` : ''}
      ${/^https:\/\//.test(c.link || '') ? `<a class="small" href="${esc(c.link)}" target="_blank" rel="noopener">See it ↗</a>` : ''}<em class="curprice">€${price.toFixed(2)}</em></label>`).join('');
    $$('#cur-list input[name=curator]').forEach(x => x.addEventListener('change', () => {
      if (chosen().length > max) { x.checked = false; say(subSt, false, `Up to ${max} curators per track.`); }
      x.closest('.curcard').classList.toggle('on', x.checked); total();
    }));
    total();
  }
  if (url) fetch(url + (url.includes('?') ? '&' : '?') + 'curators=1').then(r => r.json()).then(j => {
    if (!j.ok) throw 0; price = Number(j.price) || 1; max = j.maxCurators || 10; curators = j.curators || [];
    $$('[data-sub-price]').forEach(x => x.textContent = price.toFixed(2)); $$('[data-minwords]').forEach(x => x.textContent = j.minWords || 20);
    draw();
  }).catch(() => { list.innerHTML = '<div class="panel empty"><b>Curators couldn\'t load.</b><span>Try again in a minute.</span></div>'; });
  else list.innerHTML = '<div class="panel empty"><b>Coming soon.</b></div>';
  if (!open) { $('#sub-fields').disabled = true; $('#cur-fields').disabled = true; say(subSt, false, '<strong>Coming soon.</strong> RRR Submit opens with the RRR launch.'); }

  subForm.addEventListener('submit', async e => {
    e.preventDefault(); if (!open) return;
    const ids = chosen();
    if (!ids.length) { say(subSt, false, 'Pick at least one curator.'); subSt.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (!subForm.checkValidity()) { subForm.reportValidity(); return; }
    const val = n => ((subForm.querySelector(`[name=${n}]`) || {}).value || '').trim();
    const email = val('email'), title = val('title'), amount = ids.length * price;
    const subId = 'SUB-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), x => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[x % 31]).join('');
    const data = new URLSearchParams(); new FormData(subForm).forEach((v, k) => { if (k !== 'curator') data.append(k, v); });
    data.append('form', 'submit-track'); data.append('sub_id', subId); data.append('curator_ids', ids.join(','));
    const btn = subForm.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    try { await post(data); } catch (err) { btn.disabled = false; btn.textContent = 'Send my track'; say(subSt, false, `<strong>That didn't send.</strong> Try again, or email ${esc(C.email)}.`); return; }
    const names = ids.map(id => (curators.find(c => c.id === id) || {}).name).filter(Boolean);
    const demo = isDemo(email);
    const done = document.createElement('div'); done.className = 'signup-done'; done.setAttribute('role', 'status');
    done.innerHTML = `<h3>${demo ? 'Sent! 🎉' : 'Almost there! 🎉'}</h3>
      <div class="idbox"><span class="small">Submission</span><b class="num">${esc(subId)}</b></div>
      <p><b>${esc(title)}</b> → ${esc(names.join(', '))}</p>
      ${demo ? '<p class="paid"><strong>Demo:</strong> no payment needed. The curators get it straight away.</p>' : `<p><b>Pay €${amount.toFixed(2)}</b> to send it to the curators:</p><div class="done-pay"></div>`}
      <p class="label">What next</p>
      <ol class="nextsteps"><li>Each curator listens and answers within 7 days.</li><li>Their feedback arrives by email.</li><li>No answer in time? That part of your payment comes back.</li></ol>
      <div class="ctas-left"><a class="btn ghost" href="submit.html">Send another track</a></div>`;
    $('#sub-fields').hidden = true; $('#sub-fields').insertAdjacentElement('beforebegin', done); subSt.innerHTML = ''; subSt.classList.remove('open');
    if (!demo && window.rrrPay) window.rrrPay(done.querySelector('.done-pay'), { kind: 'one-off', amount, item: `RRR Submit: ${title} (${subId})`, custom: subId, note: `Submission ${subId}. It goes to the curators as soon as payment arrives.` });
    if (window.rrrChime) window.rrrChime();
    try { done.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (err) {}
  });

  const curForm = $('#cur-form'), curSt = $('#cur-status');
  curForm.addEventListener('submit', async e => {
    e.preventDefault(); if (!open) return;
    if (!curForm.checkValidity()) { curForm.reportValidity(); return; }
    const data = new URLSearchParams(); new FormData(curForm).forEach((v, k) => data.append(k, v)); data.append('form', 'submit-curator-apply');
    try { await post(data); say(curSt, true, '<strong>Thanks for applying ✓</strong> We check every curator by hand, usually within a few days. Approved curators get their private review page by email.'); $('#cur-fields').disabled = true; if (window.rrrChime) window.rrrChime(); curSt.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    catch (err) { say(curSt, false, `<strong>That didn't send.</strong> Try again, or email ${esc(C.email)}.`); }
  });
})();
