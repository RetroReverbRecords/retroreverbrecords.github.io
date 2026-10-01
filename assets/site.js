/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* RRR site behaviour. Settings live in config.js, releases in releases.js. */
(function(){
  const C = window.RRR_CONFIG || {};
  const R = window.RRR_RELEASES || {upcoming:[],latest:[],merch:[]};
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- copy buttons ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.copy);
    const text = target ? target.textContent.trim() : '';
    const done = () => { btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy', 1600); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(target); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected'; };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  }));

  /* ---------- sleeve art: real cover when we have it, neon placeholder otherwise ---------- */
  const hues = [['#FF2FA8','#9B5CFF'],['#9B5CFF','#3FD0FF'],['#3FD0FF','#FF2FA8'],['#E0068A','#3A2A7C'],['#7C5CFF','#FF6FD0']];
  function sleeve(title, img){
    let h = 0; for (const ch of String(title)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const [a, b] = hues[h % hues.length];
    const initials = String(title).replace(/[^\p{L}\p{N} ]/gu,'').split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase();
    return `<div class="sleeve${img ? ' has-img' : ''}" style="--a:${a};--b:${b};--ang:${h % 360}deg" aria-hidden="true"><span>${esc(initials)}</span>${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove();this.parentNode&&this.parentNode.classList.remove('has-img')">` : ''}</div>`;
  }

  /* ---------- catalogue: live data from Bandcamp (assets/catalogue.json, refreshed daily
     by the GitHub updater), falling back to releases.js ---------- */
  const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
  const viaLabel = u => {
    if (!u || !C.bandcampLabelId || !/bandcamp\.com\/(album|track)\//.test(u) || u.includes('label=')) return u;
    return u + (u.includes('?') ? '&' : '?') + 'label=' + C.bandcampLabelId + '&tab=music';
  };
  function drawCatalogue(latest, merch){
    const up = $('#upcoming-list');
    if (up) {
      const today = new Date().toISOString().slice(0,10);
      const list = (R.upcoming || []).filter(r => r.date >= today).sort((a,b) => a.date.localeCompare(b.date));
      up.innerHTML = list.length ? list.map(r => `
        <a class="rcard" ${r.url ? `href="${esc(r.url)}" target="_blank" rel="noopener"` : ''}>
          ${sleeve(r.title, r.image)}
          <div class="rmeta"><span class="rdate">${esc(fmtDate(r.date))}</span><b>${esc(r.title)}</b><span>${esc(r.artist)}</span><small>${esc([r.format, r.where].filter(Boolean).join(' · '))}</small></div>
        </a>`).join('')
        : `<div class="empty panel"><b>No releases announced yet.</b><span>Booked releases appear here with their release date. Artists can <a href="book.html#bandcamp">book a release</a> once booking opens.</span></div>`;
    }
    const bcp = $('#bc-pages');
    if (bcp) bcp.innerHTML = (R.bandcampPages || []).map(b => `
      <a class="mcard panel" href="${esc(b.url)}" target="_blank" rel="noopener">
        <span class="mtype">Bandcamp</span><b>${esc(b.name)}</b><span class="small">${esc(b.genre || '')}</span>
      </a>`).join('') + `<div class="mcard panel ghost-card"><span class="mtype">Coming soon</span><b>Genre pages</b><span class="small">Dedicated Bandcamp pages for specific styles and release types.</span></div>`;
    const lat = $('#latest-list');
    if (lat) lat.innerHTML = latest.slice(0, 8).map(r => `
      <a class="rcard" href="${esc(viaLabel(r.url))}" target="_blank" rel="noopener" title="Open ${esc(r.title)} on Bandcamp">
        ${sleeve(r.title, r.image)}
        <div class="rmeta"><b>${esc(r.title)}</b><span>${esc(r.artist)}</span><small class="bc-go">Listen on Bandcamp ↗</small></div>
      </a>`).join('');
    const hist = $('#history-releases');
    if (hist) hist.innerHTML = latest.slice(0, 12).map(r => `<a class="rcard" href="${esc(viaLabel(r.url))}" target="_blank" rel="noopener">${sleeve(r.title, r.image)}<div class="rmeta"><b>${esc(r.title)}</b><span>${esc(r.artist)}</span></div></a>`).join('');
    const legacy = ['Alex Vecchietti','The Subtheory','Honey Beard','Dark Smoke Signal','Eden Future','Alenis','Soapnote','Cybertronix','O.a.G.','Future Analog','MTTM','Le Groupe Fantastique','Dream Invaders','Tenodi Boris','Arkavoid','Ness Daniels','Inner Terror','Lonely Loop','Of What Remains','Kal White','Ashpool','Rain','FM Stranger','nuvolino','LLUVA','Ettore Bandel','KMX VII','Vihana','Tin Gun','Prince Alucard','Delta Wave 82','Daniel Hugh','Le Groupe Fantastique','Your Friend Esteves'];
    const names = [...new Set(latest.map(r => String(r.artist).normalize('NFKC')).concat(legacy).filter(Boolean))];
    const roster = $('#history-artists');
    if (roster) roster.innerHTML = names.map(n => `<span>${esc(n)}</span>`).join('');
    const mq = $('#marquee');
    if (mq) { const row = names.map(n => `<span>${esc(n)}</span>`).join('<i>✦</i>'); mq.innerHTML = row + '<i>✦</i>' + row; }
    const mer = $('#merch-list');
    if (mer) mer.innerHTML = merch.slice(0, 12).map(m => `
      <a class="mcard panel${m.image ? ' has-photo' : ''}" href="${esc(m.url)}" target="_blank" rel="noopener" title="Buy ${esc(m.title)} on Bandcamp">
        ${m.image ? `<div class="mphoto"><img src="${esc(m.image)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></div>` : ''}
        <span class="mtype">${esc(m.type || 'Merch')}</span>
        <b>${esc(m.title)}</b>
        <span class="mprice num">${m.price ? esc(m.price) : 'See Bandcamp'}</span>
        <small class="bc-go">Buy on Bandcamp ↗</small>
      </a>`).join('');
  }
  drawCatalogue(R.latest || [], R.merch || []);
  fetch('assets/catalogue.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(d => {
    if (d && ((d.releases || []).length || (d.merch || []).length)) drawCatalogue((d.releases || []).length ? d.releases : (R.latest || []), (d.merch || []).length ? d.merch : (R.merch || []));
  }).catch(() => {});

  /* ---------- prices: every [data-price] reads from config.prices ---------- */
  const PR = C.prices || {};
  const euro = v => '€' + Number(v).toFixed(2);
  $$('[data-price]').forEach(el => { const v = PR[el.dataset.price]; if (v != null) el.textContent = euro(v); });
  // Compare-the-value calculator: membership for a year + 4 singles
  const cy = $('#calc-year'), cm = $('#calc-month');
  if (cy && PR.artist != null && PR.single != null) { const y = PR.artist * 12 + PR.single * 4; cy.textContent = euro(y); if (cm) cm.textContent = euro(y / 12); }
  // Genre dropdowns from config.genres
  $$('select[data-genres]').forEach(sel => { if (sel.options.length) return; sel.innerHTML = '<option value="">Choose a genre…</option>' + (C.genres || []).map(g => `<option>${esc(g)}</option>`).join(''); });
  $$('option[data-price-label]').forEach(o => { const v = PR[o.dataset.priceLabel]; if (v != null) o.textContent = o.textContent.replace(/€[\d.,]+/, euro(v)); });

  /* ---------- beta mode: ?beta=rrr-beta turns forms on for the tester only ---------- */
  const betaStore = { get(){ try { return localStorage.getItem('rrr-beta'); } catch (e) { return null; } }, set(v){ try { v ? localStorage.setItem('rrr-beta', v) : localStorage.removeItem('rrr-beta'); } catch (e) {} } };
  const qp = new URLSearchParams(location.search);
  if (qp.has('beta')) betaStore.set(qp.get('beta') === C.betaKey ? C.betaKey : '');
  const BETA = !!C.betaKey && betaStore.get() === C.betaKey;
  if (BETA) { const tag = document.createElement('div'); tag.className = 'betatag'; tag.textContent = 'BETA MODE · forms are live for you only'; document.body.appendChild(tag); }
  const signupOn = !!(C.signupOpen || BETA), bookingOn = !!(C.bookingOpen || BETA);

  /* ---------- form helpers ---------- */
  const endpoint = C.automationUrl || C.formEndpoint || '';
  const P = C.payments || {};
  function setStatus(el, open, openText, closedText){
    if (!el) return;
    el.classList.toggle('open', open);
    el.innerHTML = `<span class="dot"></span><span>${open ? openText : closedText}</span>`;
  }
  function newMemberId(){
    const alph = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', a = new Uint32Array(5); crypto.getRandomValues(a);
    return 'RRR-' + Array.from(a, x => alph[x % alph.length]).join('');
  }
  // PayPal Payments Standard links: work with just the PayPal email address.
  function paypalUrl(o){
    const q = new URLSearchParams(Object.assign({ business: P.paypalEmail, currency_code: 'EUR', no_shipping: '1', charset: 'utf-8' }, o));
    if (endpoint) q.set('notify_url', endpoint);
    return 'https://www.paypal.com/cgi-bin/webscr?' + q.toString();
  }
  // PayPal checkout with extra ways to pay when a client ID is set, simple link otherwise.
  const PP = C.paypal || {};
  let sdkPromise = null;
  function loadSdk(subscription){
    if (sdkPromise) return sdkPromise;
    const q = new URLSearchParams({ 'client-id': PP.clientId, currency: 'EUR', components: 'buttons' });
    if (subscription) { q.set('vault', 'true'); q.set('intent', 'subscription'); }
    else q.set('enable-funding', 'card,paylater,mybank,sepa,bancontact,ideal,giropay,eps,blik,p24');
    sdkPromise = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://www.paypal.com/sdk/js?' + q; sc.onload = () => res(window.paypal); sc.onerror = rej; document.head.appendChild(sc); });
    return sdkPromise;
  }
  // o: { kind: 'one-off' | 'sub', amount, item, custom, plan, linkParams, note }
  function payButtons(box, o){
    const fallback = () => {
      const params = o.kind === 'sub'
        ? { cmd: '_xclick-subscriptions', item_name: o.item, a3: o.amount.toFixed(2), p3: '1', t3: 'M', src: '1', custom: o.custom, return: o.returnUrl || '' }
        : { cmd: '_xclick', item_name: o.item.slice(0, 120), amount: o.amount.toFixed(2), custom: o.custom };
      box.innerHTML = `<a class="btn primary" href="${esc(paypalUrl(params))}" target="_blank" rel="noopener">Pay €${o.amount.toFixed(2)}${o.kind === 'sub' ? '/month' : ''} with PayPal or card</a> ${o.note ? `<span class="small">${o.note}</span>` : ''}`;
    };
    const useSdk = PP.clientId && (o.kind === 'one-off' || o.plan);
    if (!useSdk) { if (P.paypalEmail) fallback(); return; }
    box.innerHTML = `<div class="pp-sdk"></div>${o.note ? `<p class="small">${o.note}</p>` : ''}`;
    loadSdk(o.kind === 'sub').then(paypal => {
      const cfg = o.kind === 'sub'
        ? { style: { layout: 'vertical', color: 'blue', label: 'subscribe' },
            createSubscription: (d, a) => a.subscription.create({ plan_id: o.plan, custom_id: o.custom }),
            onApprove: d => { box.innerHTML = `<p class="paid"><strong>Membership payment set up.</strong> Welcome to the family.</p>`; } }
        : { style: { layout: 'vertical', color: 'blue' },
            createOrder: (d, a) => a.order.create({ purchase_units: [{ amount: { value: o.amount.toFixed(2), currency_code: 'EUR' }, description: o.item.slice(0, 120), custom_id: String(o.custom || '').slice(0, 120) }] }),
            onApprove: (d, a) => a.order.capture().then(det => {
              box.innerHTML = `<p class="paid"><strong>Paid, thank you.</strong> We'll confirm by email.</p>`;
              if (endpoint) fetch(endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ form: 'payment', order_id: det.id, status: det.status, amount: o.amount.toFixed(2), item: o.item, custom: o.custom || '', payer_email: (det.payer && det.payer.email_address) || '' }) }).catch(() => {});
              track('Purchase', { value: o.amount, currency: 'EUR' });
            }) };
      paypal.Buttons(cfg).render(box.querySelector('.pp-sdk'));
    }).catch(fallback);
  }

  // Short 80s synthwave sting when something is sent (no sound file needed):
  // detuned saw arpeggio through a sweeping low-pass filter, a sub bass and an echo.
  function chime(){
    try {
      const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      const ctx = new A(), t = ctx.currentTime + 0.02;
      const out = ctx.createGain(); out.gain.value = 0.22;
      const echo = ctx.createDelay(); echo.delayTime.value = 0.19;
      const fb = ctx.createGain(); fb.gain.value = 0.38;
      const wet = ctx.createGain(); wet.gain.value = 0.5;
      const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
      echo.connect(tone).connect(fb).connect(echo); echo.connect(wet).connect(out);
      out.connect(ctx.destination);
      const note = (freq, start, len, type, detunes, peak, cutFrom, cutTo) => {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 7;
        f.frequency.setValueAtTime(cutFrom, start); f.frequency.exponentialRampToValueAtTime(cutTo, start + len * 0.6);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
        g.gain.exponentialRampToValueAtTime(peak * 0.5, start + len * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, start + len);
        detunes.forEach(d => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = d; o.connect(f); o.start(start); o.stop(start + len + 0.05); });
        f.connect(g); g.connect(out); g.connect(echo);
      };
      // A minor arpeggio up to the octave: A3 C4 E4 A4, then a held E5 shimmer
      [220, 261.63, 329.63, 440].forEach((fq, k) => note(fq, t + k * 0.11, 0.42, 'sawtooth', [-9, 9], 0.5, 600, 4200));
      note(659.25, t + 0.44, 1.1, 'sawtooth', [-12, 0, 12], 0.32, 900, 5200);
      note(55, t, 0.9, 'square', [0], 0.45, 220, 120);   // sub bass A1
      setTimeout(() => ctx.close(), 3000);
    } catch (e) {}
  }
  window.rrrChime = chime;
  async function send(form, statusEl, kind, extra){
    const data = new URLSearchParams();
    new FormData(form).forEach((v, k) => data.append(k, v));
    data.append('form', kind);
    Object.entries(extra || {}).forEach(([k, v]) => data.append(k, v));
    try {
      if (/script\.google(usercontent)?\.com/.test(endpoint)) {
        // Google Apps Script: response can't be read cross-site, the request still arrives.
        await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data });
      } else {
        const res = await fetch(endpoint, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(res.status);
      }
      statusEl.classList.add('open');
      statusEl.innerHTML = `<span class="dot"></span><span><strong>Sent ✓</strong> Check your email: we confirm everything there.</span>`;
      form.reset();
      chime();
      try { statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      return true;
    } catch (e) {
      statusEl.classList.remove('open');
      statusEl.innerHTML = `<span class="dot"></span><span><strong>That didn't send.</strong> Check your connection and try again, or email ${esc(C.email)}.</span>`;
      return false;
    }
  }


  /* ---------- reading and accessibility options (saved on this device only) ---------- */
  (function(){
    const root = document.documentElement, btn = $('#a11y-btn'), panel = $('#a11y-panel');
    const mainEl = document.querySelector('main'); if (mainEl && !document.getElementById('content')) mainEl.id = mainEl.id || 'content';
    const skip = $('.skip'); if (skip && mainEl) skip.href = '#' + mainEl.id;
    const load = () => { try { return JSON.parse(localStorage.getItem('rrr-a11y') || '{}'); } catch (e) { return {}; } };
    const save = o => { try { localStorage.setItem('rrr-a11y', JSON.stringify(o)); } catch (e) {} };
    const font = () => { if (!$('#a11y-font')) { const l = document.createElement('link'); l.id = 'a11y-font'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap'; document.head.appendChild(l); } };
    const apply = o => {
      ['easy', 'big', 'contrast', 'still'].forEach(k => root.classList.toggle('a11y-' + k, !!o[k]));
      if (o.easy) font();
      $$('video').forEach(v => { try { o.still ? v.pause() : (v.autoplay && v.play().catch(() => {})); } catch (e) {} });
    };
    let st = load(); apply(st);
    if (!btn || !panel) return;
    $$('[data-a11y]', panel).forEach(c => { c.checked = !!st[c.dataset.a11y]; c.addEventListener('change', () => { st[c.dataset.a11y] = c.checked; save(st); apply(st); }); });
    const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    const place = () => { const r = btn.getBoundingClientRect(), w = panel.offsetWidth || 300; panel.style.top = Math.round(r.bottom + 8) + 'px'; panel.style.left = Math.round(Math.max(16, Math.min(innerWidth - w - 16, r.right - w))) + 'px'; };
    btn.addEventListener('click', e => { e.stopPropagation(); const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) { place(); const f = panel.querySelector('input'); if (f) f.focus(); } });
    addEventListener('resize', () => { if (!panel.hidden) place(); }); addEventListener('scroll', () => { if (!panel.hidden) close(); }, { passive: true });
    document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    // Read aloud with the browser's own voice (selected text, or the main page text)
    const rd = $('#a11y-read'), synth = window.speechSynthesis;
    if (!rd) return;
    if (!synth) { rd.hidden = true; return; }
    rd.addEventListener('click', () => {
      if (synth.speaking) { synth.cancel(); rd.textContent = '🔊 Read this page aloud'; return; }
      const sel = String(window.getSelection ? window.getSelection() : '').trim();
      const txt = (sel || (mainEl ? mainEl.innerText : document.body.innerText)).replace(/\s+/g, ' ').slice(0, 30000);
      const lang = (document.documentElement.lang || 'en').slice(0, 2);
      const chunks = txt.match(/[^.!?]+[.!?]*/g) || [txt];
      chunks.forEach((c, i) => { const u = new SpeechSynthesisUtterance(c.trim()); u.lang = lang; u.rate = 0.95; if (i === chunks.length - 1) u.onend = () => { rd.textContent = '🔊 Read this page aloud'; }; synth.speak(u); });
      rd.textContent = '⏹ Stop reading';
    });
  })();
  /* ---------- sign-up → member ID → PayPal subscription ---------- */
  const signup = $('#signup');
  const isDemoEmail = e => { const x = String(e || '').trim().toLowerCase(); return !!C.demoEmailPrefix && x.indexOf(C.demoEmailPrefix) === 0 && /@gmail\.com$/.test(x); };
  const isFan = () => !!($('#type-fan') && $('#type-fan').checked);
  const price = () => (C.membershipPrices || {})[isFan() ? 'fan' : 'artist'];
  if (signup) {
    const open = !!(signupOn && endpoint);
    $('#signup-fields').disabled = !open;
    setStatus($('#signup-status'), open, '<strong>Sign-up is open.</strong> Fill in the form, then set up your monthly payment.',
      '<strong>Coming soon.</strong> Sign-up isn\'t open yet. Follow us below to hear when it opens.');
    const setArtistReq = () => { ['#f-ai', '#f-link'].forEach(q => { const el = $(q); if (el) el.required = !isFan(); }); };
    $$('input[name=type]', signup).forEach(r => r.addEventListener('change', () => { signup.classList.toggle('fan', isFan()); setArtistReq(); renderPay(); }));
    setArtistReq();
    const sd = $('#f-sign-date'); if (sd) sd.textContent = new Date().toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'});
    const tv = $('#f-terms-v'); if (tv) tv.textContent = C.termsVersion || '';
    signup.addEventListener('submit', async e => {
      e.preventDefault();
      if (!open) return;
      if (!signup.checkValidity()) { signup.reportValidity(); return; }
      const id = newMemberId(), fan = isFan(), amt = price();
      const em = ((signup.querySelector('[name=email]') || {}).value || '').trim();
      const who = ((signup.querySelector('[name=artist]') || {}).value || (signup.querySelector('[name=name]') || {}).value || '').trim();
      const ok = await send(signup, $('#signup-status'), 'signup', { member_id: id, type: fan ? 'fan' : 'artist',
        terms_version: C.termsVersion || '', signed_at: new Date().toISOString(), user_agent: navigator.userAgent.slice(0, 250), signed_on_page: location.href.split('?')[0] });
      if (!ok) return;
      try { localStorage.setItem('rrr-member-id', id); } catch (e) {}
      const demo = isDemoEmail(em), dash = `member.html?id=${encodeURIComponent(id)}`;
      const done = document.createElement('div'); done.className = 'signup-done'; done.setAttribute('role', 'status');
      done.innerHTML = `
        <div class="neonmotto"><video src="assets/welcome-neon.mp4" poster="assets/welcome-neon.jpg" autoplay muted loop playsinline aria-hidden="true"></video><span class="sr">Welcome to the family.</span></div>
        <h3>You're in${who ? ', ' + esc(who) : ''}! 🎉</h3>
        <div class="idbox"><span class="small">Your member ID</span><b class="num" id="new-id">${esc(id)}</b><button type="button" class="copy" data-copy="new-id">Copy</button></div>
        <p>We've emailed <b>${esc(em)}</b> your welcome email and a copy of your signed agreement. Not there in a few minutes? Check spam.</p>
        ${demo ? '<p class="paid"><strong>Demo account: payment skipped.</strong> Your account is active straight away.</p>' : '<div class="done-pay"></div>'}
        <p class="label" style="margin-top:14px">What next</p>
        <ol class="nextsteps">
          ${demo ? '' : '<li><b>Set up your monthly payment</b> with the button above. Your account goes live when it arrives.</li>'}
          <li><a href="${esc(dash)}"><b>Open your member dashboard</b></a>: your belt, points and releases. Save it to your home screen.</li>
          ${fan ? '<li><a href="cards.html"><b>Start collecting Synth Stars cards</b></a></li>' : '<li><a href="series.html#linking"><b>Link your Bandcamp to RRR</b></a>: needed for Bandcamp releases, and it gets you free Bandcamp VIP.</li><li><a href="book.html"><b>Book your first release</b></a></li>'}
        </ol>
        <div class="ctas-left"><a class="btn primary" href="${esc(dash)}">Open my dashboard</a></div>`;
      const fields = $('#signup-fields'); fields.hidden = true;
      fields.insertAdjacentElement('beforebegin', done);
      $('#signup-status').innerHTML = '';
      const cp = done.querySelector('.copy'); if (cp) cp.addEventListener('click', () => { try { navigator.clipboard.writeText(id); cp.textContent = 'Copied ✓'; } catch (e) {} });
      if (!demo) { const pay = $('.pay', signup); if (pay) done.querySelector('.done-pay').appendChild(pay); renderPay(id, fan, amt); }
      try { done.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      track('CompleteRegistration', { content_name: fan ? 'fan' : 'artist' });
    });
  }
  function renderPay(memberId, fan, amt){
    const box = $('#paypal-buttons'); if (!box) return;
    $('#pay-note').hidden = !!memberId;
    if (!memberId) { box.innerHTML = ''; return; }
    const dash = `member.html?id=${encodeURIComponent(memberId)}`;
    let btn = '';
    if (P.membershipVia === 'bandcamp' && P.bandcampSubscribeUrl) {
      btn = `<a class="btn primary" href="${esc(P.bandcampSubscribeUrl)}" target="_blank" rel="noopener">Subscribe on Bandcamp</a>`;
    }
    box.innerHTML = `<div class="welcome"><p><strong>Set up your monthly payment.</strong></p><div class="paybox">${btn}</div>
      <p class="small">Your member ID is <b class="num">${esc(memberId)}</b>. Keep it: it opens your <a href="${esc(dash)}">member dashboard</a>.</p></div>`;
    if (!btn && amt) payButtons(box.querySelector('.paybox'), { kind: 'sub', amount: amt, item: `RRR ${fan ? 'Fan' : 'Artist'} Membership`, custom: memberId,
      plan: ((PP.plans || {})[fan ? 'fan' : 'artist']) || '', returnUrl: (C.siteUrl || '') + dash });
  }
  renderPay();

  /* ---------- booking page ---------- */
  const tabs = $$('.tabs [role=tab]');
  if (tabs.length) {
    const show = id => {
      tabs.forEach(t => { const on = t.dataset.panel === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      $$('.tabpanel').forEach(p => p.hidden = p.id !== 'panel-' + id);
    };
    tabs.forEach(t => t.addEventListener('click', () => { show(t.dataset.panel); history.replaceState(null, '', '#' + t.dataset.panel); }));
    const start = (location.hash || '').slice(1);
    show(tabs.some(t => t.dataset.panel === start) ? start : tabs[0].dataset.panel);

    const open = !!(bookingOn && endpoint);
    const fees0 = C.uploadFees || {};
    $$('.booking-form').forEach(f => {
      $('fieldset', f).disabled = !open;
      const st = $('.status', f);
      setStatus(st, open, '<strong>Booking is open.</strong> We confirm every booking by email.',
        '<strong>Coming soon.</strong> Booking opens when RRR membership launches. You can still use the deadline planner.');
      const pl = $('.paylink', f), sel = $('select[name=format]', f);
      // Bandcamp: show upload steps or "what we need", depending on who uploads
      const ub = $$('input[name=upload_by]', f);
      if (ub.length) { const showUb = () => { const v = (ub.find(r => r.checked) || {}).value; $$('[data-upload]', f).forEach(d => { d.hidden = !!v && d.dataset.upload !== v; if (v && d.dataset.upload === v) d.open = true; }); const al = $('#bc-assets', f); if (al) al.required = v === 'rrr'; }; ub.forEach(r => r.addEventListener('change', showUb)); showUb(); }
      // Daily slots: check the date is free before booking. First to pay gets it.
      const slotField = { 'bandcamp-release': 'release_date', 'youtube-upload': 'premiere_date' }[f.dataset.kind];
      const dateIn = slotField ? f.querySelector(`input[name=${slotField}]`) : null;
      let slotOk = true;
      if (dateIn && endpoint) {
        const msg = document.createElement('span'); msg.className = 'slotmsg small'; msg.setAttribute('aria-live', 'polite'); dateIn.insertAdjacentElement('afterend', msg);
        const check = () => {
          const d = dateIn.value; if (!d) { msg.textContent = ''; return; }
          msg.textContent = 'Checking…'; slotOk = false;
          fetch(endpoint + (endpoint.includes('?') ? '&' : '?') + 'slot=' + encodeURIComponent(f.dataset.kind) + '&date=' + d).then(r => r.json()).then(j => {
            if (dateIn.value !== d) return;
            if (!j.ok || j.free) { slotOk = true; dateIn.setCustomValidity(''); msg.innerHTML = '<b class="ok">✓ ' + esc(d) + ' is free.</b> It\'s yours when you pay.'; return; }
            slotOk = false; dateIn.setCustomValidity('That date is taken. Pick another date.');
            msg.innerHTML = '<b class="no">Taken.</b> ' + (j.next ? 'Next free day: <button type="button" class="copy">Use ' + esc(j.next) + '</button>' : 'Pick another date.');
            const b = msg.querySelector('button'); if (b) b.addEventListener('click', () => { dateIn.value = j.next; check(); });
          }).catch(() => { slotOk = true; dateIn.setCustomValidity(''); msg.textContent = 'Couldn\'t check the date right now. We\'ll confirm it when you pay.'; });
        };
        dateIn.addEventListener('change', check);
      }
      const amount = () => (pl && pl.dataset.amount) ? fees0[pl.dataset.amount] : (sel ? fees0[sel.value] : null);
      f.addEventListener('submit', async e => {
        e.preventDefault();
        if (!open) return;
        if (!f.checkValidity()) { f.reportValidity(); return; }
        const title = (f.querySelector('[name=title]') || {}).value || '';
        const email = (f.querySelector('[name=email]') || {}).value || '';
        const amt = amount();
        const bookingId = 'BK-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), x => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[x % 31]).join('');
        const ok = await send(f, st, f.dataset.kind, amt ? { booking_id: bookingId } : {});
        // One-off fee: PayPal button appears after booking, tagged with the member's email
        if (ok) track('Schedule', { content_name: f.dataset.kind });
        if (ok && pl && amt && isDemoEmail(email)) { pl.hidden = false; pl.innerHTML = `<p class="paid"><strong>Demo booking ${esc(bookingId)}:</strong> no payment needed. It confirms automatically; check your inbox for the [DEMO] confirmation email.</p>`; return; }
        if (ok && pl && amt) {
          pl.hidden = false;
          payButtons(pl, { kind: 'one-off', amount: amt, item: `RRR ${f.dataset.kind.replace('-', ' ')}: ${title} (${bookingId})`, custom: bookingId, note: `Booking ${bookingId}. Your date is only confirmed when payment arrives: first to pay gets the date. You'll get a confirmation email.` });
        }
      });
    });

    // Fee display from config
    const fees = C.uploadFees || {};

  }

  /* ---------- deadline planner (always active) ---------- */
  const plan = $('#planner');
  if (plan) {
    const D = C.deadlines || {};
    const dateIn = $('#pl-date'), out = $('#pl-out');
    const d0 = new Date(); d0.setDate(d0.getDate() + 70);
    dateIn.value = d0.toISOString().slice(0,10);
    const minus = (iso, days) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - days); return d; };
    const fmt = d => d.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
    const today = new Date(); today.setHours(0,0,0,0);
    function calc(){
      const iso = dateIn.value; if (!iso) { out.innerHTML = ''; return; }
      const bc = $('#pl-bandcamp').checked, st = $('#pl-streaming').checked, ed = $('#pl-editorial').checked;
      const rows = [];
      if (bc) rows.push(['Bandcamp assets in the Drive folder', minus(iso, D.bandcampAssetsDays ?? 21)]);
      if (st) rows.push(['Streaming (RouteNote) assets in', minus(iso, D.streamingAssetsDays ?? 14)]);
      if (ed && bc) { rows.push(['Bandcamp editorial pitch, aim for 9 weeks (you do this)', minus(iso, D.editorialEarliestDays ?? 63)]); rows.push(['Bandcamp editorial pitch, 8 weeks at the latest', minus(iso, D.editorialLatestDays ?? 56)]); }
      if (ed && st) rows.push(['Spotify editorial pitch, 7 days at the latest (you do this)', minus(iso, D.spotifyPitchDays ?? 7)]);
      rows.sort((a,b) => a[1] - b[1]);
      rows.push(['Release day', new Date(iso + 'T12:00:00')]);
      out.innerHTML = rows.length > 1 ? rows.map(([label, d]) => {
        const late = d < today && label !== 'Release day';
        return `<li class="${late ? 'late' : ''}"><span>${esc(label)}</span><b class="num">${esc(fmt(d))}</b>${late ? '<em>Too late for this date</em>' : ''}</li>`;
      }).join('') : '<li><span>Pick Bandcamp, streaming or both.</span></li>';
    }
    $$('input', plan).forEach(i => i.addEventListener('input', calc));
    calc();
  }

  /* ---------- cookie consent + marketing pixels ---------- */
  const PX = C.pixels || {};
  const anyPixel = PX.metaPixelId || PX.googleTagId || PX.tiktokPixelId;
  const store = { get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} } };
  let pixelsOn = false;
  function track(evt, data){
    if (!pixelsOn) return;
    try { if (window.fbq) fbq('track', evt, data || {}); } catch (e) {}
    try { if (window.gtag) gtag('event', evt === 'Lead' ? 'generate_lead' : evt === 'CompleteRegistration' ? 'sign_up' : evt === 'Purchase' ? 'purchase' : evt, data || {}); } catch (e) {}
    try { if (window.ttq) ttq.track(evt === 'Lead' ? 'SubmitForm' : evt === 'Purchase' ? 'CompletePayment' : evt, data || {}); } catch (e) {}
  }
  function loadPixels(){
    if (pixelsOn) return; pixelsOn = true;
    if (PX.metaPixelId) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', PX.metaPixelId); fbq('track', 'PageView');
    }
    if (PX.googleTagId) {
      const g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(PX.googleTagId); document.head.appendChild(g);
      window.dataLayer = window.dataLayer || []; window.gtag = function(){ dataLayer.push(arguments); }; gtag('js', new Date()); gtag('config', PX.googleTagId);
    }
    if (PX.tiktokPixelId) {
      !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._u=i;var o=d.createElement("script");o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(PX.tiktokPixelId);ttq.page();}(window,document,'ttq');
    }
  }
  if (anyPixel) {
    const choice = store.get('rrr-consent');
    if (choice === 'yes') loadPixels();
    else if (choice !== 'no') {
      const bar = document.createElement('div');
      bar.className = 'consent'; bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Cookies');
      bar.innerHTML = `<p>We use cookies to measure our ads and show RRR to more music fans. OK?</p><div><button type="button" class="btn primary" data-c="yes">Accept</button><button type="button" class="btn ghost" data-c="no">No thanks</button></div>`;
      document.body.appendChild(bar);
      bar.addEventListener('click', e => { const c = e.target.dataset && e.target.dataset.c; if (!c) return; store.set('rrr-consent', c); if (c === 'yes') loadPixels(); bar.remove(); });
    }
  }

  /* ---------- newsletter sign-up ---------- */
  $$('.newsletter-form').forEach(f => {
    const st = $('.nl-status', f);
    const open = !!endpoint;
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      if (!open) { st.textContent = 'Newsletter sign-up opens soon.'; return; }
      const data = new URLSearchParams({ form: 'newsletter', email: $('input[type=email]', f).value, consent: $('input[type=checkbox]', f).checked ? 'yes' : 'no', source: location.pathname.split('/').pop() || 'index' });
      try { await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data }); st.textContent = 'You\'re on the list. See you on the 1st.'; f.reset(); track('Lead', { content_name: 'newsletter' }); }
      catch (err) { st.textContent = 'That didn\'t work. Check your connection and try again.'; }
    });
  });

  /* ---------- share buttons ---------- */
  $$('[data-share-url]').forEach(box => {
    const url = box.dataset.shareUrl, text = box.dataset.shareText || '';
    const u = encodeURIComponent(url), t = encodeURIComponent(text);
    box.innerHTML = `<button type="button" class="copy" data-copylink>Copy link</button>
      <a class="sharebtn" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="sharebtn" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener">Facebook</a>
      <a class="sharebtn" href="https://twitter.com/intent/tweet?text=${t}&url=${u}" target="_blank" rel="noopener">X</a>
      <a class="sharebtn" href="https://bsky.app/intent/compose?text=${t}%20${u}" target="_blank" rel="noopener">Bluesky</a>
      <a class="sharebtn" href="https://t.me/share/url?url=${u}&text=${t}" target="_blank" rel="noopener">Telegram</a>`;
    const b = $('[data-copylink]', box);
    b.addEventListener('click', () => { try { navigator.clipboard.writeText(url).then(() => { b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy link', 1500); }, () => { b.textContent = url; }); } catch (e) { b.textContent = url; } });
  });

  /* ---------- Spotify / Groover players: tap to load (faster, no third-party cookies until
     the visitor chooses, and no broken box where players are blocked) ---------- */
  function clickToLoad(box, label, iframeHtml, openUrl){
    box.innerHTML = `<div class="c2l"><button type="button" class="btn primary">${label}</button>${openUrl ? `<a class="sp-open" href="${esc(openUrl)}" target="_blank" rel="noopener">Or open it in a new tab ↗</a>` : ''}<p class="small">Loading this player lets the service set its own cookies.${label.includes('playlist') ? ' Log in to Spotify in this browser to pick tracks and hear full songs; logged out, Spotify only plays previews.' : ''}</p></div>`;
    box.querySelector('button').addEventListener('click', () => { box.innerHTML = iframeHtml + (openUrl ? `<a class="sp-open" href="${esc(openUrl)}" target="_blank" rel="noopener">Not playing? Open it in a new tab ↗</a>` : ''); });
  }
  const sp = $('#spotify-embed');
  if (sp && C.spotifyPlaylistId) clickToLoad(sp, '▶ Play the RRR playlist here',
    `<iframe title="RRR playlist on Spotify" src="https://open.spotify.com/embed/playlist/${esc(C.spotifyPlaylistId)}?utm_source=generator&theme=0" width="100%" height="380" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`,
    'https://open.spotify.com/playlist/' + C.spotifyPlaylistId);
  const gw = $('#groover-embed');
  if (gw && C.grooverWidgetUrl) clickToLoad(gw, 'Show the Groover submission box',
    `<iframe title="Send your track to RRR on Groover" src="${esc(C.grooverWidgetUrl)}" width="100%" height="130" frameborder="0" credentialless></iframe>`,
    C.grooverUrl);
  // YouTube links from config
  $$('[data-yt]').forEach(a => { const u = (C.youtube || {})[a.dataset.yt]; if (u) a.href = u; });
  $$('[data-playlistpanda]').forEach(a => { if (C.playlistPandaUrl) a.href = C.playlistPandaUrl; });

  /* ---------- press wall + submit ---------- */
  const wall = $('#press-wall');
  if (wall) {
    const seed = [
      { artist: 'Alex Vecchietti', outlet: 'PugliaNews', title: '"Blessed" di Alex Vecchietti', url: 'https://www.puglianews.org/magazine/8900-blessed-di-alex-vecchietti.html' },
      { artist: 'Alex Vecchietti', outlet: 'Switch On', title: 'Blessed, il nuovo album di Alex Vecchietti', url: 'https://www.switchonmusic.it/blessed-il-nuovo-album-di-alex-vecchietti/' },
      { artist: 'Alenis', outlet: 'System Failure Webzine', title: 'Intervista a Alenis', url: 'https://www.systemfailurewebzine.com/intervista-a-alenis/' },
      { artist: 'Soapnote', outlet: 'Antenna Radio Esse', title: 'Music My Life – Intervista a Soapnote', url: 'https://www.antennaradioesse.it/music-my-life-a-cura-di-graziella-ventrone-intervista-a-soapnote-un-viaggio-tra-interferenze-e-melodie/' },
      { artist: 'Dark Smoke Signal', outlet: 'Blogger Sander', title: 'Interview met Dark Smoke Signal', url: 'https://www.bloggersander.nl/2020/04/interview-met-dark-smoke-signal.html' },
      { artist: 'Retro Reverb Records', outlet: 'Nightride FM', title: "Kaarin's EP94 with guests Retro Reverb Records", url: 'https://nightride.fm/blog/podcast/kaarin/kaarins-ep94-with-guests-retro-reverb-records/' }
    ];
    const draw = list => { wall.innerHTML = list.map(p => `<a class="panel presscard" href="${esc(p.url)}" target="_blank" rel="noopener"><span class="mtype">${esc(p.outlet)}</span><b>${esc(p.title || p.outlet)}</b>${p.quote ? `<q>${esc(p.quote)}</q>` : ''}<span class="small">${esc(p.artist)}</span></a>`).join(''); };
    draw(seed);
    if (endpoint) fetch(endpoint + (endpoint.includes('?') ? '&' : '?') + 'press=1').then(r => r.json()).then(d => { if (d.ok && d.press.length) draw(d.press.concat(seed)); }).catch(() => {});
  }
  const pf = $('#press-form');
  if (pf) {
    const st = $('.status', pf), open = !!endpoint;
    $('fieldset', pf).disabled = !open;
    setStatus(st, open, '<strong>Share your review.</strong> We check every link before it goes on the wall.', '<strong>Coming soon.</strong> Review sharing opens when the RRR automation is switched on.');
    pf.addEventListener('submit', e => { e.preventDefault(); if (!open) return; if (!pf.checkValidity()) { pf.reportValidity(); return; } send(pf, st, 'press'); });
  }

  /* ---------- installable phone app ---------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude\.ai|claudeusercontent/.test(location.host)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  const inst = $('#install');
  if (inst) {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!standalone) {
      if (ios) { inst.hidden = false; $('#install-ios').hidden = false; }
      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault(); inst.hidden = false; const b = $('#install-btn'); b.hidden = false;
        b.onclick = () => { e.prompt(); e.userChoice.finally(() => { inst.hidden = true; }); };
      });
    }
  }

  /* ---------- sell your merch ---------- */
  const MC = C.merch || {};
  $$('[data-merch-pct]').forEach(el => { if (MC.commissionPercent != null) el.textContent = MC.commissionPercent + '%'; });
  const fl = $('#fulfilment-list');
  if (fl) fl.innerHTML = (MC.fulfilment || []).map(f => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)} ↗</a><span>${esc(f.what)}</span></li>`).join('');

  /* ---------- terms version on pages ---------- */
  $$('[data-terms-version]').forEach(el => { if (C.termsVersion) el.textContent = C.termsVersion; });

  /* ---------- unsubscribe ---------- */
  const uf = $('#unsub-form');
  if (uf) uf.addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('#unsub-status');
    if (!uf.checkValidity()) { uf.reportValidity(); return; }
    if (!endpoint) { st.textContent = 'Unsubscribing opens with the newsletter. For now, email ' + (C.email || '') + '.'; return; }
    try { await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ form: 'unsubscribe', email: $('#u-email').value }) }); st.textContent = 'Done. You won\'t get the newsletter any more.'; uf.reset(); }
    catch (err) { st.textContent = 'That didn\'t work. Try again, or email ' + (C.email || '') + '.'; }
  });

  function toast(msg){ const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
  /* ---------- language switcher (Google Translate's free page translation) ---------- */
  const ls = $('#lang-select');
  if (ls) {
    const onTg = /\.translate\.goog$/.test(location.hostname);
    const cur = new URLSearchParams(location.search).get('_x_tr_tl') || 'en';
    ls.value = [...ls.options].some(o => o.value === cur) ? cur : 'en';
    ls.addEventListener('change', () => {
      const lang = ls.value;
      if (onTg) {
        const orig = location.hostname.replace(/\.translate\.goog$/, '').replace(/-/g, '.').replace(/\.\./g, '-');
        location.href = lang === 'en' ? `https://${orig}${location.pathname}` : `${location.origin}${location.pathname}?_x_tr_sl=en&_x_tr_tl=${lang}&_x_tr_hl=${lang}`;
        return;
      }
      if (lang === 'en') return;
      if (!/\./.test(location.hostname) || /claude|localhost/.test(location.hostname)) { ls.value = 'en'; toast('Translation works on the live site, not in this preview.'); return; }
      const host = location.hostname.replace(/-/g, '--').replace(/\./g, '-') + '.translate.goog';
      location.href = `https://${host}${location.pathname}?_x_tr_sl=en&_x_tr_tl=${lang}&_x_tr_hl=${lang}`;
    });
  }
})();
