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
  const viaLabel = u => {
    if (!u || !C.bandcampLabelId || !/bandcamp\.com\/(album|track)\//.test(u) || u.includes('label=')) return u;
    return u + (u.includes('?') ? '&' : '?') + 'label=' + C.bandcampLabelId + '&tab=music';
  };
  const bcp = $('#bc-pages');
  if (bcp) bcp.innerHTML = (R.bandcampPages || []).map(b => `
    <a class="mcard panel" href="${esc(b.url)}" target="_blank" rel="noopener">
      <span class="mtype">Bandcamp</span><b>${esc(b.name)}</b><span class="small">${esc(b.genre || '')}</span>
    </a>`).join('') + `<div class="mcard panel ghost-card"><span class="mtype">Coming soon</span><b>Genre pages</b><span class="small">Dedicated Bandcamp pages for specific styles and release types.</span></div>`;
  const lat = $('#latest-list');
  if (lat) lat.innerHTML = (R.latest || []).map(r => `
    <a class="rcard" href="${esc(viaLabel(r.url))}" target="_blank" rel="noopener">
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
      statusEl.innerHTML = `<span class="dot"></span><span><strong>Sent.</strong> We'll reply by email to confirm.</span>`;
      form.reset();
      return true;
    } catch (e) {
      statusEl.classList.remove('open');
      statusEl.innerHTML = `<span class="dot"></span><span><strong>That didn't send.</strong> Check your connection and try again, or email ${esc(C.email)}.</span>`;
      return false;
    }
  }

  /* ---------- sign-up → member ID → PayPal subscription ---------- */
  const signup = $('#signup');
  const isFan = () => !!($('#type-fan') && $('#type-fan').checked);
  const price = () => (C.membershipPrices || {})[isFan() ? 'fan' : 'artist'];
  if (signup) {
    const open = !!(C.signupOpen && endpoint);
    $('#signup-fields').disabled = !open;
    setStatus($('#signup-status'), open, '<strong>Sign-up is open.</strong> Fill in the form, then set up your monthly payment.',
      '<strong>Coming soon.</strong> Sign-up isn\'t open yet. Follow us below to hear when it opens.');
    $$('input[name=type]', signup).forEach(r => r.addEventListener('change', () => { signup.classList.toggle('fan', isFan()); renderPay(); }));
    signup.addEventListener('submit', async e => {
      e.preventDefault();
      if (!open) return;
      if (!signup.checkValidity()) { signup.reportValidity(); return; }
      const id = newMemberId(), fan = isFan(), amt = price();
      const ok = await send(signup, $('#signup-status'), 'signup', { member_id: id, type: fan ? 'fan' : 'artist' });
      if (ok) renderPay(id, fan, amt);
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
    } else if (P.paypalEmail && amt) {
      const back = (C.siteUrl || '') + dash;
      btn = `<a class="btn primary" href="${esc(paypalUrl({ cmd: '_xclick-subscriptions', item_name: `RRR ${fan ? 'Fan' : 'Artist'} Membership`, a3: amt.toFixed(2), p3: '1', t3: 'M', src: '1', custom: memberId, return: back }))}" target="_blank" rel="noopener">Pay €${amt.toFixed(2)}/month with PayPal</a>`;
    }
    box.innerHTML = `<div class="welcome"><p><strong>Step 2: set up your monthly payment.</strong></p>${btn}
      <p class="small">Your member ID is <b class="num">${esc(memberId)}</b>. Keep it: it opens your <a href="${esc(dash)}">member dashboard</a>.</p></div>`;
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

    const open = !!(C.bookingOpen && endpoint);
    const fees0 = C.uploadFees || {};
    $$('.booking-form').forEach(f => {
      $('fieldset', f).disabled = !open;
      const st = $('.status', f);
      setStatus(st, open, '<strong>Booking is open.</strong> We confirm every booking by email.',
        '<strong>Coming soon.</strong> Booking opens when RRR membership launches. You can still use the deadline planner.');
      const pl = $('.paylink', f), sel = $('select[name=format]', f);
      const amount = () => sel ? fees0[sel.value] : (pl ? fees0[pl.dataset.amount] : null);
      f.addEventListener('submit', async e => {
        e.preventDefault();
        if (!open) return;
        if (!f.checkValidity()) { f.reportValidity(); return; }
        const title = (f.querySelector('[name=title]') || {}).value || '';
        const email = (f.querySelector('[name=email]') || {}).value || '';
        const amt = amount();
        const ok = await send(f, st, f.dataset.kind);
        // One-off fee: PayPal button appears after booking, tagged with the member's email
        if (ok && pl && amt && P.paypalEmail) {
          pl.hidden = false;
          pl.innerHTML = `<a class="btn primary" href="${esc(paypalUrl({ cmd: '_xclick', item_name: `RRR ${f.dataset.kind.replace('-', ' ')}: ${title}`.slice(0, 120), amount: amt.toFixed(2), custom: email }))}" target="_blank" rel="noopener">Pay €${amt.toFixed(2)} with PayPal</a> <span class="small">Your booking is confirmed once the fee is paid.</span>`;
        }
      });
    });

    // Fee display from config
    const fees = C.uploadFees || {};
    $$('b[data-fee]').forEach(el => { const v = fees[el.dataset.fee]; if (v != null) el.textContent = '€' + v.toFixed(2); });
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
      if (ed) { rows.push(['Bandcamp editorial, 9 weeks (your own submission)', minus(iso, D.editorialEarliestDays ?? 63)]); rows.push(['Bandcamp editorial, 8 weeks at the latest', minus(iso, D.editorialLatestDays ?? 56)]); }
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
