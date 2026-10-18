/* © 2018–2026 Retro Reverb Records. All rights reserved. */
/* Launch giveaway entry form. Closes 25 Oct 2026 17:45 Italy time. */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '', CLOSES = new Date('2026-10-25T17:45:00+01:00');
  const form = document.getElementById('gw-form'); if (!form) return;
  const st = document.getElementById('gw-status');
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
  if (Date.now() > CLOSES.getTime()) { say(false, '<strong>Entries are closed.</strong> Thanks to everyone who entered. Watch The Bandcamp Hour for the result.'); form.querySelector('fieldset').disabled = true; return; }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (Date.now() > CLOSES.getTime()) { say(false, '<strong>Sorry, entries have just closed.</strong>'); return; }
    const data = new URLSearchParams(); new FormData(form).forEach((v, k) => data.append(k, v));
    data.append('form', 'giveaway'); data.append('page', location.pathname);
    if (!url) { say(false, 'Entries open soon. Please try again later.'); return; }
    try {
      await window.rrrSend(url, data);
      say(true, `<strong>You're in! ✓</strong> Good luck, ${esc(data.get('name'))}. We've emailed ${esc(data.get('email'))} to confirm (check spam). The winner is spun live on Sunday 25 October.`);
      form.querySelector('fieldset').disabled = true;
      try { if (window.fbq) fbq('track', 'Lead', { content_name: 'Launch giveaway' }); } catch (x) {}
    } catch (err) { say(false, "<strong>That didn't send.</strong> Please try again in a minute."); }
  });
})();
