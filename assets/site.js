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

  /* ---------- generated neon sleeve art ---------- */
  const hues = [['#FF2FA8','#9B5CFF'],['#9B5CFF','#3FD0FF'],['#3FD0FF','#FF2FA8'],['#E0068A','#3A2A7C'],['#7C5CFF','#FF6FD0']];
  function sleeve(title){
    let h = 0; for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const [a, b] = hues[h % hues.length];
    const angle = h % 360;
    const initials = title.replace(/[^\p{L}\p{N} ]/gu,'').split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase();
    return `<div class="sleeve" style="--a:${a};--b:${b};--ang:${angle}deg" aria-hidden="true"><span>${esc(initials)}</span></div>`;
  }

  /* ---------- upcoming + latest releases ---------- */
  const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
  const up = $('#upcoming-list');
  if (up) {
    const today = new Date().toISOString().slice(0,10);
    const list = (R.upcoming || []).filter(r => r.date >= today).sort((a,b) => a.date.localeCompare(b.date));
    up.innerHTML = list.length ? list.map(r => `
      <a class="rcard" ${r.url ? `href="${esc(r.url)}" target="_blank" rel="noopener"` : ''}>
        ${sleeve(r.title)}
        <div class="rmeta"><span class="rdate">${esc(fmtDate(r.date))}</span><b>${esc(r.title)}</b><span>${esc(r.artist)}</span><small>${esc([r.format, r.where].filter(Boolean).join(' · '))}</small></div>
      </a>`).join('')
      : `<div class="empty panel"><b>No releases announced yet.</b><span>Booked releases appear here with their release date. Artists can <a href="book.html#bandcamp">book a release</a> once booking opens.</span></div>`;
  }
  const lat = $('#latest-list');
  if (lat) lat.innerHTML = (R.latest || []).map(r => `
    <a class="rcard" href="${esc(r.url)}" target="_blank" rel="noopener">
      ${sleeve(r.title)}
      <div class="rmeta"><b>${esc(r.title)}</b><span>${esc(r.artist)}</span></div>
    </a>`).join('');

  /* ---------- merch ---------- */
  const mer = $('#merch-list');
  if (mer) mer.innerHTML = (R.merch || []).map(m => `
    <a class="mcard panel" href="${esc(m.url)}" target="_blank" rel="noopener">
      <span class="mtype">${esc(m.type)}</span>
      <b>${esc(m.title)}</b>
      <span class="mprice num">${m.price ? esc(m.price) : 'See Bandcamp'}</span>
    </a>`).join('');

  /* ---------- form helpers ---------- */
  function setStatus(el, open, openText, closedText){
    if (!el) return;
    el.classList.toggle('open', open);
    el.innerHTML = `<span class="dot"></span><span>${open ? openText : closedText}</span>`;
  }
  async function send(form, statusEl, kind){
    const data = new FormData(form); data.append('form', kind);
    try {
      const res = await fetch(C.formEndpoint, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      statusEl.classList.add('open');
      statusEl.innerHTML = `<span class="dot"></span><span><strong>Sent.</strong> We'll reply by email to confirm.</span>`;
      form.reset();
    } catch (e) {
      statusEl.classList.remove('open');
      statusEl.innerHTML = `<span class="dot"></span><span><strong>That didn't send.</strong> Check your connection and try again, or email ${esc(C.email)}.</span>`;
    }
  }

  /* ---------- sign-up ---------- */
  const signup = $('#signup');
  if (signup) {
    const open = !!(C.signupOpen && C.formEndpoint);
    $('#signup-fields').disabled = !open;
    setStatus($('#signup-status'), open, '<strong>Sign-up is open.</strong> Fill in the form, then pay below to activate your membership.',
      '<strong>Coming soon.</strong> Sign-up isn\'t open yet. Follow us below to hear when it opens.');
    $$('input[name=type]', signup).forEach(r => r.addEventListener('change', () => {
      signup.classList.toggle('fan', $('#type-fan').checked);
      renderPayPal();
    }));
    signup.addEventListener('submit', e => {
      e.preventDefault();
      if (!open) return;
      if (!signup.checkValidity()) { signup.reportValidity(); return; }
      send(signup, $('#signup-status'), 'signup');
    });
  }

  /* ---------- PayPal subscriptions (only when configured) ---------- */
  const pp = C.paypal || {};
  function planFor(){
    const fan = $('#type-fan') && $('#type-fan').checked;
    return fan ? pp.plans?.fan : pp.plans?.artist;
  }
  let ppLoaded = false;
  function renderPayPal(){
    const box = $('#paypal-buttons'); if (!box) return;
    const plan = planFor();
    const live = !!(C.signupOpen && pp.clientId && plan);
    $('#pay-note').hidden = live;
    if (!live) { box.innerHTML = ''; return; }
    const draw = () => {
      box.innerHTML = '';
      window.paypal.Buttons({
        style: { shape: 'rect', color: 'blue', layout: 'vertical', label: 'subscribe' },
        createSubscription: (d, actions) => actions.subscription.create({ plan_id: planFor() }),
        onApprove: d => { box.innerHTML = `<p class="paid"><strong>Payment set up.</strong> Subscription ID ${esc(d.subscriptionID)}. Welcome to RRR.</p>`; }
      }).render(box);
    };
    if (ppLoaded) return draw();
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(pp.clientId)}&vault=true&intent=subscription&currency=${encodeURIComponent(pp.currency || 'EUR')}`;
    s.onload = () => { ppLoaded = true; draw(); };
    document.head.appendChild(s);
  }
  renderPayPal();

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

    const open = !!(C.bookingOpen && C.formEndpoint);
    $$('.booking-form').forEach(f => {
      $('fieldset', f).disabled = !open;
      const st = $('.status', f);
      setStatus(st, open, '<strong>Booking is open.</strong> We confirm every booking by email.',
        '<strong>Coming soon.</strong> Booking opens when RRR membership launches. You can still use the deadline planner.');
      f.addEventListener('submit', e => { e.preventDefault(); if (!open) return; if (!f.checkValidity()) { f.reportValidity(); return; } send(f, st, f.dataset.kind); });
    });

    // Fee display from config
    const fees = C.uploadFees || {};
    $$('[data-fee]').forEach(el => { const v = fees[el.dataset.fee]; if (v != null) el.textContent = '€' + v.toFixed(2); });
  }

  /* ---------- deadline planner (always active) ---------- */
  const plan = $('#planner');
  if (plan) {
    const D = C.deadlines || {};
    const dateIn = $('#pl-date'), out = $('#pl-out');
    const d0 = new Date(); d0.setDate(d0.getDate() + 42);
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
      if (bc && ed) rows.push(['Editorial playlist pitch ready', minus(iso, D.editorialDays ?? 14)]);
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
})();
