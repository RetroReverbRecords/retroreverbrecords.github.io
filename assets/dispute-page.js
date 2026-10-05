/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* AI false-detection dispute: case number + member ID + proof (links, up to 3 small files). */
(function(){
  const C = window.RRR_CONFIG || {};
  const form = document.getElementById('dp-form'); if (!form) return;
  const st = document.getElementById('dp-status'), url = C.automationUrl || '';
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
  const q = new URLSearchParams(location.search);
  if (q.get('case')) document.getElementById('dp-case').value = q.get('case').toUpperCase();
  try { const id = localStorage.getItem('rrr-member-id'); if (id) document.getElementById('dp-id').value = id; } catch (e) {}
  const MAX = 8 * 1024 * 1024;
  const readAsDataURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  if (!url) say(false, `<strong>Disputes aren't switched on yet.</strong> Email ${esc(C.email)} with your case number instead.`);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!url) return;
    const caseEl = document.getElementById('dp-case'), idEl = document.getElementById('dp-id');
    caseEl.value = caseEl.value.trim().toUpperCase(); idEl.value = idEl.value.trim().toUpperCase();
    caseEl.setCustomValidity(/^AIC-\d{4,}$/.test(caseEl.value) ? '' : 'Case numbers look like AIC-0001 (it is in your email)');
    idEl.setCustomValidity(/^RRR-[A-Z0-9]{4,8}$/.test(idEl.value) ? '' : 'Your member ID looks like RRR-7KX2P');
    const files = [...document.getElementById('dp-files').files];
    const fileEl = document.getElementById('dp-files');
    fileEl.setCustomValidity(files.length > 3 ? 'Up to 3 files. Share more with a link.' : files.some(f => f.size > MAX) ? 'Each file must be 8 MB or smaller. Share bigger files with a link.' : '');
    const links = document.getElementById('dp-links');
    links.setCustomValidity(!links.value.trim() && !files.length ? 'Add at least one link or file as proof' : '');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new URLSearchParams(); new FormData(form).forEach((v, k) => { if (!(v instanceof File)) data.append(k, v); });
    data.append('form', 'ai-dispute');
    try {
      say(true, '<strong>Sending…</strong> Large files can take a minute.');
      for (let i = 0; i < files.length; i++) { data.append('file' + (i + 1), await readAsDataURL(files[i])); data.append('file' + (i + 1) + '_name', files[i].name); }
      await window.rrrSend(url, data);
      say(true, `<strong>Dispute sent for case ${esc(caseEl.value)}.</strong> You'll get an email confirming we received it, and our decision within 7 days. No email within a day? Email ${esc(C.email)} with your case number.`);
      form.querySelector('fieldset').disabled = true;
    } catch (err) {
      say(false, `<strong>That didn't send.</strong> Try again, or email ${esc(C.email)} with your case number and proof links.`);
    }
  });
})();
