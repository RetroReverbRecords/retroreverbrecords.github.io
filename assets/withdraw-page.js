/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* Withdrawal function (EU Directive 2023/2673, Italian Consumer Code art. 54-bis).
   Always available: not switched off in beta, because withdrawal must be possible at any time. */
(function(){
  const C = window.RRR_CONFIG || {};
  const form = document.getElementById('wd-form'); if (!form) return;
  const st = document.getElementById('wd-status'), url = C.automationUrl || '';
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const boxes = [...form.querySelectorAll('input[name=what]')];
    boxes[0].setCustomValidity(boxes.some(b => b.checked) ? '' : 'Tick at least one thing you are withdrawing from');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new URLSearchParams(); new FormData(form).forEach((v, k) => data.append(k, v));
    data.set('what', boxes.filter(b => b.checked).map(b => b.value).join(', '));
    data.append('form', 'withdrawal'); data.append('sent_at', new Date().toISOString());
    const mail = `mailto:${encodeURIComponent(C.email || '')}?subject=${encodeURIComponent('I withdraw from my contract')}&body=${encodeURIComponent('I withdraw from: ' + data.get('what') + '\nName: ' + data.get('name') + '\nEmail: ' + data.get('email') + '\nMember ID: ' + (data.get('member_id') || ''))}`;
    if (!url) { say(false, `<strong>Please send it by email instead:</strong> <a href="${mail}">email your withdrawal</a>.`); return; }
    try {
      await Promise.race([fetch(url, { method: 'POST', mode: 'no-cors', body: data, keepalive: true }), new Promise(r => setTimeout(r, 350))]);
      say(true, `<strong>Withdrawal sent</strong> on ${esc(new Date().toLocaleString('en-GB'))}. We email ${esc(data.get('email'))} to confirm we've received it. No email within a day? <a href="${mail}">Send it by email</a> as well.`);
      form.querySelector('fieldset').disabled = true;
    } catch (err) {
      say(false, `<strong>That didn't send.</strong> Please <a href="${mail}">email your withdrawal</a> instead.`);
    }
  });
})();
