/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* Feedback form: always on, goes to the Feedback tab and emails the RRR team. */
(function(){
  const C = window.RRR_CONFIG || {};
  const form = document.getElementById('fb-form'); if (!form) return;
  const st = document.getElementById('fb-status'), url = C.automationUrl || '';
  const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
  try { const id = localStorage.getItem('rrr-member-id'); if (id) document.getElementById('fb-id').value = id; } catch (e) {}
  const ref = document.referrer && document.referrer.indexOf(location.origin) === 0 ? document.referrer.replace(location.origin, '') : '';
  if (ref && !document.getElementById('fb-page').value) document.getElementById('fb-page').value = ref;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!url) { say(false, 'Feedback isn\'t switched on yet. Email ' + (C.email || '') + ' instead.'); return; }
    const data = new URLSearchParams(); new FormData(form).forEach((v, k) => data.append(k, v)); data.append('form', 'feedback');
    try { await window.rrrSend(url, data); say(true, '<strong>Thanks! Your feedback reached the RRR team.</strong> If you left an email, we reply within 7 days.'); form.reset(); }
    catch (err) { say(false, '<strong>That didn\'t send.</strong> Check your connection and try again.'); }
  });
})();
