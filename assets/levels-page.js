/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
(function(){
  const L = window.RRR_LEVELS || { belts: [], points: [] };
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lad = document.getElementById('belt-ladder');
  if (lad) lad.innerHTML = L.belts.map(b => `
    <div class="belt${b.dan ? ' dan' : ''}">
      <div class="beltbar" style="--belt:${b.color}">${b.dan ? `<i class="stripes">${'<em></em>'.repeat(b.dan)}</i>` : ''}</div>
      <div class="beltname"><b>${esc(b.name)}</b><span class="num">${b.min.toLocaleString('en-GB')} pts</span></div>
    </div>`).join('');
  const pt = document.getElementById('points-table');
  if (pt) pt.innerHTML = L.points.map(g => `
    <h3 class="subhead">${esc(g.group)}</h3>
    <div class="panel tablewrap"><table class="ptable"><tbody>${g.items.map(i => `
      <tr><td>${esc(i.action)}${i.cap ? `<small class="cap">${esc(i.cap)}</small>` : ''}</td><td class="num pts">+${esc(i.pts)}</td><td><b class="${i.how === 'auto' ? 'tagauto' : i.how === 'code' ? 'tagcode' : 'tagcheck'}">${i.how === 'auto' ? 'Auto' : i.how === 'code' ? 'Code word' : 'Claim'}</b></td></tr>`).join('')}
    </tbody></table></div>`).join('');

  /* ---------- claim points: code words and proof links ---------- */
  const C = window.RRR_CONFIG || {}, form = document.getElementById('claim-form');
  const endpoint = C.automationUrl || '';
  if (form) {
    const sel = document.getElementById('cl-action'), st = document.getElementById('claim-status');
    const claimable = [].concat(...L.points.map(g => g.items)).filter(i => i.how === 'claim' && i.key);
    sel.innerHTML = '<option value="">Choose…</option><option value="code">I have a code word (show, event, mission, release day)</option>' +
      claimable.map(i => `<option value="${esc(i.key)}">${esc(i.action)} (+${esc(i.pts)})</option>`).join('');
    let beta = false; try { beta = !!C.betaKey && localStorage.getItem('rrr-beta') === C.betaKey; } catch (e) {}
    const open = !!(endpoint && (C.signupOpen || beta));
    document.getElementById('claim-fields').disabled = !open;
    const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
    say(open, open ? '<strong>Claims are open.</strong> Code words and small claims add points straight away.' : '<strong>Coming soon.</strong> Claims open when membership launches.');
    const mode = () => {
      const code = sel.value === 'code';
      form.querySelectorAll('.code-only').forEach(el => el.hidden = !code);
      form.querySelectorAll('.proof-only').forEach(el => el.hidden = code);
      document.getElementById('cl-code').required = code;
      document.getElementById('cl-proof').required = !code;
      form.querySelector('input[name=honest]').required = !code;
      document.getElementById('cl-btn').textContent = code ? 'Get my points' : 'Send claim';
    };
    sel.addEventListener('change', mode);
    const q = new URLSearchParams(location.search);
    try { const saved = localStorage.getItem('rrr-member-id'); if (saved) document.getElementById('cl-id').value = saved; } catch (e) {}
    if (q.get('id')) document.getElementById('cl-id').value = q.get('id');
    if (q.get('code')) { sel.value = 'code'; document.getElementById('cl-code').value = q.get('code').toUpperCase(); }
    mode();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!open) return;
      const idEl = document.getElementById('cl-id'); idEl.value = idEl.value.trim().toUpperCase();
      idEl.setCustomValidity(/^RRR-[A-Z0-9]{4,8}$/.test(idEl.value) ? '' : 'Your member ID looks like RRR-7KX2P');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = new URLSearchParams(); new FormData(form).forEach((v, k) => { if (!form.querySelector(`[name="${k}"]`).closest('[hidden]')) data.append(k, v); }); data.append('form', 'claim');
      const btn = document.getElementById('cl-btn'); btn.disabled = true; btn.textContent = 'Checking…';
      try {
        // Wait for RRR's answer so members see their points (or the reason) straight away
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 30000);
        const answer = (await (await fetch(endpoint, { method: 'POST', body: data, signal: ctl.signal })).text()).trim(); clearTimeout(t);
        const got = answer.match(/^ok: \+(\d+)/);
        if (/^refused/i.test(answer)) { const why = answer.replace(/^refused:?\s*/i, ''); say(false, '<strong>Not this time.</strong> ' + esc(why.charAt(0).toUpperCase() + why.slice(1)) + '.'); }
        else if (got) { say(true, `<strong>+${got[1]} points!</strong> They're already on your dashboard. 🥋`); if (window.rrrChime) window.rrrChime(); const keep = idEl.value; form.reset(); idEl.value = keep; mode(); }
        else { say(true, '<strong>Claim sent.</strong> RRR checks it, usually within a few days. The points land on your dashboard and you get an email. 🥋'); const keep = idEl.value; form.reset(); idEl.value = keep; mode(); }
        try { localStorage.setItem('rrr-member-id', idEl.value); } catch (e) {}
      } catch (err) {
        say(false, `<strong>We couldn't get an answer.</strong> Check your dashboard in a minute; if the points aren't there, try again or email ${esc(C.email)}.`);
      } finally { btn.disabled = false; mode(); }
    });
  }

  /* ---------- season leaderboard ---------- */
  const hall = document.getElementById('hall');
  if (hall && endpoint) fetch(endpoint + (endpoint.includes('?') ? '&' : '?') + 'hall=1').then(r => r.json()).then(d => {
    if (!d.ok || !d.top || !d.top.length) { hall.innerHTML = '<p class="small">The ' + esc(d.season || new Date().getFullYear()) + ' season has just started. Earn points to be the first name here.</p>'; return; }
    hall.innerHTML = '<p class="label">Season ' + esc(d.season) + ' · top supporters</p><ol class="hall">' + d.top.map((x, i) => `<li><span class="num">${i + 1}</span><a href="member.html?id=${encodeURIComponent(x.id)}"><b>${esc(x.name)}</b></a><span class="small">${esc(x.belt)}</span><em class="num pts">${Number(x.season).toLocaleString('en-GB')}</em></li>`).join('') + '</ol>';
  }).catch(() => { hall.innerHTML = '<p class="small">The leaderboard is taking a break. Try again later.</p>'; });
  else if (hall) hall.innerHTML = '<p class="small">The leaderboard opens when membership launches.</p>';
})();
