/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* Administrator moderation page: mod.html?k=<private key> */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '';
  const $ = s => document.querySelector(s);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = new URLSearchParams(location.search).get('k') || '';
  const hello = $('#md-hello'), st = $('#md-status');
  let data = { members: [], log: [] };
  const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
  const fmt = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  function rows(){
    const q = $('#md-q').value.trim().toLowerCase(), f = $('#md-filter').value;
    const list = data.members.filter(m => (!f || m.standing === f) && (!q || [m.id, m.name, m.artist].join(' ').toLowerCase().includes(q))).slice(0, 200);
    $('#md-rows').innerHTML = list.map(m => `<tr>
      <td><b>${esc(m.artist || m.name)}</b><br><span class="small">${esc(m.id)} · ${esc(m.type)} · since ${esc(fmt(m.since))}</span></td>
      <td class="small">${esc(m.status)}</td>
      <td><span class="standing s-${esc(m.standing)}">${esc(m.standing)}</span></td>
      <td>${m.protected ? '<span class="small">Protected</span>' : `<form class="modact" data-id="${esc(m.id)}"><select name="standing" aria-label="New standing"><option value="warning">Warning</option><option value="suspended">Suspend</option><option value="removed">Remove</option><option value="good">Back to good</option></select><input name="reason" type="text" required minlength="5" placeholder="Reason (the member sees this)"><button class="btn primary" type="submit">Apply</button></form>`}</td></tr>`).join('') || '<tr><td colspan="4" class="small">No members match.</td></tr>';
    document.querySelectorAll('.modact').forEach(fm => fm.addEventListener('submit', act));
  }
  function log(){ $('#md-log').innerHTML = (data.log || []).map(l => `<li><b>${esc(l.action)}</b> ${esc(l.member_name)} (${esc(l.member_id)}) by ${esc(l.admin_name)} · ${esc(fmt(l.when))}<br><span class="small">${esc(l.reason)}</span></li>`).join('') || '<li class="small">Nothing yet.</li>'; }
  async function act(e){
    e.preventDefault();
    const fm = e.target, id = fm.dataset.id, standing = fm.standing.value, reason = fm.reason.value.trim();
    if (reason.length < 5) { fm.reason.reportValidity(); return; }
    const m = data.members.find(x => x.id === id);
    if ((standing === 'removed' || standing === 'suspended') && !confirm(`${standing === 'removed' ? 'Remove' : 'Suspend'} ${m.artist || m.name} (${id})?\n\nReason: ${reason}\n\nThey will be emailed.`)) return;
    const body = new URLSearchParams({ form: 'mod-action', key, member_id: id, standing, reason });
    try {
      await Promise.race([fetch(url, { method: 'POST', mode: 'no-cors', body, keepalive: true }), new Promise(r => setTimeout(r, 350))]);
      m.standing = standing; data.log.unshift({ action: standing, member_name: m.artist || m.name, member_id: id, admin_name: (data.admin || {}).name, when: new Date(), reason });
      rows(); log(); say(true, `<strong>Done ✓</strong> ${esc(m.artist || m.name)} is now <b>${esc(standing)}</b>. They've been emailed and Cybertronix has been told.`);
      if (window.rrrChime) window.rrrChime();
    } catch (err) { say(false, '<strong>That didn\'t send.</strong> Try again.'); }
  }
  if (!key || !url) { hello.textContent = 'This page needs your private administrator link.'; return; }
  fetch(url + (url.includes('?') ? '&' : '?') + 'mod=' + encodeURIComponent(key)).then(r => r.json()).then(j => {
    if (!j.ok) { hello.textContent = 'This link isn\'t valid any more. Ask Cybertronix for a new one.'; return; }
    data = j; hello.innerHTML = `Hi <b>${esc(j.admin.name)}</b>. ${j.members.length} members.`;
    $('#md-panel').hidden = false; rows(); log();
    $('#md-q').addEventListener('input', rows); $('#md-filter').addEventListener('change', rows);
  }).catch(() => { hello.textContent = 'Couldn\'t load members right now. Try again in a minute.'; });
})();
