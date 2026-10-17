/* © 2018–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* Contact us + Request a refund. Both always on (people must be able to reach us and ask for money back). */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '', mailTo = C.email || 'retroreverbrecords@gmail.com';
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (el, ok, html) => { el.classList.toggle('open', ok); el.innerHTML = `<span class="dot"></span><span>${html}</span>`; };

  // WhatsApp line, only if a number is set in config.js (whatsapp: "+39...")
  const wa = String(C.whatsapp || '').replace(/[^\d+]/g, '');
  const waEl = document.getElementById('ct-wa');
  if (wa && waEl) waEl.innerHTML = ` · WhatsApp <a href="https://wa.me/${esc(wa.replace(/^\+/, ''))}" target="_blank" rel="noopener">${esc(C.whatsapp)}</a>`;

  const dc = String(C.discordUserId || '').replace(/\D/g, '');
  if (dc && waEl) waEl.insertAdjacentHTML('beforeend', ` · <a href="https://discord.com/users/${dc}" target="_blank" rel="noopener">Message Cole on Discord</a> (private DM)`);

  // Pre-select a topic from the link, e.g. contact.html?topic=payment
  try { const t = new URLSearchParams(location.search).get('topic'); const sel = document.getElementById('ct-topic');
    if (t && sel) [...sel.options].forEach(o => { if (o.text.toLowerCase().includes(t.toLowerCase())) sel.value = o.text; }); } catch (e) {}

  function wire(formId, statusId, kind, subject, okMsg) {
    const form = document.getElementById(formId); if (!form) return;
    const st = document.getElementById(statusId);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = new URLSearchParams(); new FormData(form).forEach((v, k) => data.append(k, v));
      data.append('form', kind); data.append('page', location.pathname);
      const body = [...data.entries()].filter(([k]) => !/^(form|page|rrr_trap|_t)$/.test(k)).map(([k, v]) => k + ': ' + v).join('\n');
      const mail = `mailto:${encodeURIComponent(mailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (!url) { say(st, false, `<strong>Please email us instead:</strong> <a href="${mail}">send it by email</a>.`); return; }
      try {
        await window.rrrSend(url, data);
        say(st, true, okMsg(data));
        form.querySelector('fieldset').disabled = true;
      } catch (err) {
        say(st, false, `<strong>That didn't send.</strong> Please <a href="${mail}">email it to us</a> instead.`);
      }
    });
  }

  wire('ct-form', 'ct-status', 'contact', 'Message from the RRR website',
    d => `<strong>Message sent ✓</strong> We'll reply to ${esc(d.get('email'))} within 7 days. We also email you a copy, so check your spam folder if it doesn't arrive.`);
  wire('rf-form', 'rf-status', 'refund-request', 'Refund request',
    d => `<strong>Refund request sent ✓</strong> We'll reply to ${esc(d.get('email'))} within 7 days. You'll get an email confirming we've received it.`);
})();
