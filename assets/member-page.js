/* © 2018–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* Member dashboard. Data comes from the RRR automation (Google Apps Script).
   Without it, or with ?id=DEMO, it shows a clearly labelled example. */
(function(){
  const C = window.RRR_CONFIG || {};
  const $ = s => document.querySelector(s);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = d => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}); };
  const num = n => (n === '' || n == null) ? '–' : Number(n).toLocaleString('en-GB');

  // Badges shown on the dashboard. Keep in step with backend/Code.gs.
  const CATALOGUE = [
    { title: 'Joined the community', points: 10, how: 'Sign up' },
    { title: 'First release booked', points: 15, how: 'Book a Bandcamp or streaming release' },
    { title: 'First social post booked', points: 5, how: 'Book a social media post' },
    { title: 'First YouTube upload', points: 5, how: 'Book a YouTube upload' },
    { title: 'Newsletter subscriber', points: 5, how: 'Sign up to the newsletter' },
    { title: 'Brought a friend', points: 20, how: 'Someone you invited joins' },
    { title: 'In the press', points: 20, how: 'Get a review approved on the Press wall' },
    { title: '3 months a member', points: 30, how: 'Stay active for 3 months' },
    { title: '1 year a member', points: 120, how: 'Stay active for a year' }
  ];
  const BELTS = (window.RRR_LEVELS && window.RRR_LEVELS.belts) || [{ name: 'White belt', min: 0, color: '#F2F2F2' }];
  const beltFor = p => { let b = BELTS[0]; BELTS.forEach(x => { if (p >= x.min) b = x; }); return b; };
  const nextBelt = p => BELTS.find(x => x.min > p) || null;

  const DEMO = {
    id: 'DEMO', name: 'Demo Artist', type: 'artist', since: '2026-06-01', status: 'active',
    points: 385,
    achievements: [
      { title: 'Joined the community', on: '2026-06-01', points: 10 },
      { title: 'First release booked', on: '2026-06-10', points: 15 },
      { title: 'First social post booked', on: '2026-06-12', points: 5 },
      { title: 'Brought a friend', on: '2026-07-02', points: 20 },
      { title: '3 months a member', on: '2026-09-01', points: 30 },
      { title: 'First YouTube upload', on: '2026-09-05', points: 5 }
    ],
    releases: [
      { title: 'Night Drive', kind: 'bandcamp-release', format: 'single', date: '2026-07-04', status: 'live' },
      { title: 'Neon Rain EP', kind: 'streaming-release', format: 'ep', date: '2026-11-14', status: 'assets received' }
    ],
    posts: [
      { platform: 'instagram, tiktok', date: '2026-07-03', link: '', status: 'posted' },
      { platform: 'instagram', date: '2026-11-13', link: '', status: 'booked' }
    ],
    membershipActive: true, artistType: 'Member', bandcampLinked: true, eligible: true,
    programme: [
      { title: 'Neon Rain EP', affiliation: 'RRR Genre Release', series: 'RRR SYNTH', catalogue: 'RRSYN-001', date: '2026-11-14' },
      { title: 'Chrome Hearts', affiliation: 'Pending review', series: 'RRR DARK', catalogue: '', date: '2026-12-05', aiCase: 'AIC-0001', aiResult: 'possible AI' },
      { title: 'Night Drive', affiliation: 'Independent', date: '2026-07-04' },
      { title: 'Split 12" with Friends', affiliation: 'Other Label', date: '2026-03-20' }
    ],
    recentPoints: [
      { note: 'Claim: Bought a member release or merch', on: '2026-09-26', points: 15 },
      { note: 'Active month 2026-09', on: '2026-09-01', points: 10 },
      { note: 'Claim: Full listen + save + playlist add', on: '2026-08-22', points: 5 },
      { note: 'Social post booked', on: '2026-07-03', points: 5 },
      { note: 'Release booked: Night Drive', on: '2026-06-10', points: 15 }
    ],
    notifications: [
      { key: 'd1', kind: 'post', text: 'Your social post is live 🎉 (12 Oct)', at: '2026-10-12' },
      { key: 'd2', kind: 'points', text: '+10 points: Bought a release on Bandcamp', at: '2026-10-10' },
      { key: 'd3', kind: 'guide', text: 'Want your own Synth Stars card? Send a photo and a few details and we design it for you.', action: 'Claim my card', url: 'cards.html#claim' },
      { key: 'd4', kind: 'guide', text: 'Want your track on radio, playlists and blogs? Send it to curators with RRR Submit.', action: 'Submit a track', url: 'submit.html' }
    ],
    stats: { updated: '2026-09-28', spotifyListeners: 1840, spotifyStreams: 42310, playlists: 27, youtubeViews: 3900, tiktokViews: 12500, source: 'Songstats' }
  };

  const params = new URLSearchParams(location.search);
  const mem = { get(){ try { return localStorage.getItem('rrr-member-id') || ''; } catch (e) { return ''; } }, set(v){ try { localStorage.setItem('rrr-member-id', v); } catch (e) {} } };
  // The phone app remembers your member ID, so it opens straight to your dashboard
  const id = (params.get('id') || (location.hash || '').slice(1) || mem.get() || '').trim().toUpperCase();
  if (id && id !== 'DEMO' && params.get('id')) mem.set(id);
  $('#lk-id').value = id && id !== 'DEMO' ? id : '';
  $('#lookup').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#lk-id').value.trim().toUpperCase();
    if (v) location.search = '?id=' + encodeURIComponent(v);
  });

  const url = C.automationUrl;
  if (id && id !== 'DEMO' && url) {
    fetch(url + (url.includes('?') ? '&' : '?') + 'member=' + encodeURIComponent(id))
      .then(r => r.json())
      .then(d => d.ok ? render(d.member, false) : notFound())
      .catch(() => problem());
  } else {
    render(DEMO, true, id && id !== 'DEMO' && !url);
  }

  function notFound(){ $('#dash').innerHTML = `<div class="panel empty"><b>We can't find that member ID.</b><span>Check it matches the ID you got when you signed up, e.g. RRR-7KX2P. Still stuck? Email ${esc(C.email)}.</span></div>`; }
  function problem(){ $('#dash').innerHTML = `<div class="panel empty"><b>The dashboard couldn't load.</b><span>Check your connection and refresh. If it keeps happening, email ${esc(C.email)}.</span></div>`; }

  /* ---------- level-up celebration: sound + emoji burst when your belt goes up ---------- */
  function celebrate(title){
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f;
        const t = ctx.currentTime + i * 0.11; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.3);
      });
    } catch (e) {}
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const box = document.createElement('div'); box.className = 'lvlup'; box.setAttribute('role', 'status');
    box.innerHTML = `<div class="lvlcard"><p class="label">Level up</p><b>${esc(title)}</b><p class="small">Keep backing the community. 🥋</p></div>`;
    if (!reduce) { const em = ['🎉','🥋','⭐','🔥','🎶','💿','🎸','✨']; for (let i = 0; i < 28; i++) { const s = document.createElement('i'); s.textContent = em[i % em.length]; s.style.left = Math.random() * 100 + '%'; s.style.animationDelay = (Math.random() * .6) + 's'; s.style.fontSize = (18 + Math.random() * 20) + 'px'; box.appendChild(s); } }
    box.addEventListener('click', () => box.remove());
    document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
  }
  function checkLevelUp(m, demo){
    if (demo) return;
    const key = 'rrr-pts-' + m.id; let prev = null;
    try { prev = localStorage.getItem(key); localStorage.setItem(key, String(m.points || 0)); } catch (e) {}
    if (prev == null) return;
    const before = beltFor(Number(prev) || 0), now = beltFor(Number(m.points) || 0);
    if (now.min > before.min) celebrate(now.name);
    else if ((Number(m.points) || 0) > (Number(prev) || 0)) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = `+${(Number(m.points) || 0) - (Number(prev) || 0)} points since your last visit ⭐`; document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
  }

  // Releases grouped by affiliation. Membership never makes a release an RRR release.
  function progTable(list){
    const groups = [
      ['RRR releases', r => /^RRR /.test(r.affiliation) && r.catalogue, 'rrr'],
      ['Pending RRR submissions', r => r.affiliation === 'Pending review' || (/^RRR /.test(r.affiliation) && !r.catalogue), 'pend'],
      ['Independent releases', r => r.affiliation === 'Independent', 'ind'],
      ['Other-label releases', r => r.affiliation === 'Other Label', 'oth'],
      ['Not selected', r => r.affiliation === 'Rejected', 'rej']
    ];
    if (!list.length) return '<div class="panel empty"><b>No releases added yet.</b><span><a href="series.html#submit">Add a release or submit one to RRR</a></span></div>';
    return groups.map(([label, test, cls]) => {
      const rows = list.filter(test); if (!rows.length) return '';
      return `<p class="label" style="margin:14px 0 8px">${label} · ${rows.length}</p><ul class="list">${rows.map(r => `<li class="panel"><div><b>${esc(r.title)}</b><span class="small">${r.series ? esc(r.series) + ' · ' : ''}${r.catalogue ? '<b class="num">' + esc(r.catalogue) + '</b> · ' : ''}${esc(fmt(r.date))}</span></div><span class="affwrap">${r.aiCase && !/cleared/.test(r.aiResult || '') ? `<a class="aff pend" href="dispute.html?case=${encodeURIComponent(r.aiCase)}" title="Our AI check flagged this release. Dispute it with proof.">AI flag ${esc(r.aiCase)} · dispute</a>` : ''}<em class="aff ${cls}">${cls === 'rrr' ? 'Selected Release' : cls === 'pend' ? 'In review' : cls === 'ind' ? 'Independent' : cls === 'oth' ? 'Other label' : 'Not selected'}</em></span></li>`).join('')}</ul>`;
    }).join('');
  }

  // Members who signed up but haven't finished paying get their payment button back here
  function payNow(m){
    const P = C.payments || {}, amt = ((C.membershipPrices || {})[m.type === 'fan' ? 'fan' : 'artist']) || 0;
    if (!P.paypalEmail || !amt) return '';
    const q = new URLSearchParams({ business: P.paypalEmail, currency_code: 'EUR', no_shipping: '1', charset: 'utf-8', cmd: '_xclick-subscriptions',
      item_name: 'RRR ' + (m.type === 'fan' ? 'Fan' : 'Artist') + ' Membership', a3: Number(amt).toFixed(2), p3: '1', t3: 'M', src: '1', custom: m.id,
      return: (C.siteUrl || '') + 'member.html?id=' + encodeURIComponent(m.id) });
    if (C.automationUrl) q.set('notify_url', C.automationUrl);
    return `<div class="panel nextstep paynow"><span class="label">One step left</span><p><b>Finish setting up your monthly payment</b> (€${Number(amt).toFixed(2)}/month). Your account goes live as soon as it arrives.</p>
      <p><a class="btn primary" href="https://www.paypal.com/cgi-bin/webscr?${q.toString()}" target="_blank" rel="noopener">Pay with PayPal or card</a></p>
      <p class="small">On a phone, open this page in Safari or Chrome (not inside WhatsApp or Instagram) so PayPal loads properly.</p></div>`;
  }
  // Bandcamp sales, read from the label's sale emails (buyers' emails are never shown)
  function bcSales(b){
    if (!b) return '';
    const money = o => Object.keys(o || {}).map(k => ({ EUR: '€', GBP: '£', USD: '$' }[k] || k + ' ') + Number(o[k]).toFixed(2)).join(' + ') || '–';
    return `<h3 class="subhead">Bandcamp sales <span class="small">through the RRR label · updated daily</span></h3>
      <div class="tiles"><div class="panel tile"><span class="label">This month</span><b class="num">${num(b.month)}</b></div>
      <div class="panel tile"><span class="label">Value this month</span><b class="num">${esc(money(b.monthValue))}</b></div>
      <div class="panel tile"><span class="label">All time</span><b class="num">${num(b.total)}</b></div></div>
      ${(b.recent || []).length ? `<ul class="list">${b.recent.map(r => `<li class="panel"><div><b>${esc(r.item)}</b><span class="small">${esc(fmt(r.on))} · ${r.type === 'physical' ? '📦 physical' : '💾 digital'}${r.fan ? ' · bought by ' + esc(r.fan) : ''}</span></div><span class="pill">${esc(money({ [r.currency || 'EUR']: r.price }))}</span></li>`).join('')}</ul>`
        : '<div class="panel empty"><b>No Bandcamp sales recorded yet.</b><span>Sales of your RRR releases show here the day after they happen.</span></div>'}`;
  }
  // Bandcamp payouts: where the money goes, and a form to set or change the PayPal email (confirmed by email)
  function payoutPanel(m, demo){
    const has = m.payoutPaypal;
    return `<div class="panel nextstep" id="payout-box"><span class="label">Payouts</span>
      <p><b>${has ? 'Your Bandcamp sales are paid to ' + esc(has) : 'Add your PayPal email so we can pay you'}</b></p>
      <p class="small">Fans' payments for your RRR releases come to RRR. On the 30th of each month we pay you the previous month's sales, minus only Bandcamp's and PayPal's standard charges, with a statement by email. RRR takes nothing and covers the payout fee. Under €25 carries over to next month. <a href="terms.html#payouts">How payouts work</a></p>
      <form id="payout-form" class="row-form"><label>PayPal email for payouts<input type="email" name="paypal" required placeholder="you@example.com" autocomplete="email"></label>
      <button class="btn ${has ? 'ghost' : 'primary'}" type="submit">${has ? 'Change PayPal' : 'Save PayPal'}</button></form>
      <p class="small" id="payout-msg" role="status"></p></div>`;
  }
  function wirePayout(m, demo){
    const f = document.getElementById('payout-form'); if (!f) return;
    f.addEventListener('submit', e => {
      e.preventDefault(); const msg = document.getElementById('payout-msg');
      if (demo || !url) { msg.textContent = 'Demo: in a real account we email you a link to confirm.'; return; }
      const d = new URLSearchParams({ form: 'payout-email', member_id: m.id, paypal: f.paypal.value.trim() });
      (window.rrrSend ? window.rrrSend(url, d, () => {}) : fetch(url, { method: 'POST', body: d }));
      msg.textContent = 'Check your account email: click the link we sent to confirm the change.'; f.reset();
    });
  }
  // Stats: Stats Pro members wait for us to connect them; everyone else sees the offer
  function statsEmpty(m, demo){
    if (m.type !== 'artist') return '<div class="panel empty"><b>Stats are for artist members.</b></div>';
    if (m.statsLocked) return `<div class="panel empty"><b>Your stats are paused.</b><span>Stats only run while your membership is active. Restart your membership and they come back the next day: <a href="index.html#join">restart</a>.</span></div>`;
    if (m.statsPro) return `<div class="panel empty"><b>${m.statsConnected ? 'Your first stats arrive tomorrow.' : 'Connecting your Stats Pro…'}</b><span>${m.statsConnected ? 'They update every day from now on.' : 'We link your artist profile within 2 working days, then your numbers update every day here.'}</span></div>`;
    const P = C.payments || {}, add = (C.prices || {}).statsPro || 1;
    let pay = '';
    if (!demo && P.paypalEmail && m.membershipActive) {
      const q = new URLSearchParams({ business: P.paypalEmail, currency_code: 'EUR', no_shipping: '1', charset: 'utf-8', cmd: '_xclick-subscriptions', item_name: 'RRR Stats Pro add-on', a3: Number(add).toFixed(2), p3: '1', t3: 'M', src: '1', custom: m.id, return: (C.siteUrl || '') + 'member.html?id=' + encodeURIComponent(m.id) });
      if (C.automationUrl) q.set('notify_url', C.automationUrl);
      pay = `<p><a class="btn primary" href="https://www.paypal.com/cgi-bin/webscr?${q.toString()}" target="_blank" rel="noopener">Add Stats Pro · €${Number(add).toFixed(2)}/month</a></p><p class="small">Then email us your Spotify artist link so we can connect you.</p>`;
    }
    return `<div class="panel nextstep statspro-up"><span class="label">Stats Pro</span><p><b>See your numbers grow, every day.</b> Spotify listeners and streams, YouTube and TikTok views, radio plays and playlists, growth over 7 and 28 days, playlist alerts and a weekly report. Powered by Songstats. Stats run while your membership is active.</p>${pay}</div>`;
  }
  // Your Synth Stars card (from cards.js), or a link to claim one
  function myCard(m, demo){
    const R = ((window.RRR_CARDS || {}).roster || {}), hit = [];
    Object.keys(R).forEach(s => Object.keys(R[s]).forEach(n => { if (R[s][n].member === m.id) hit.push(Object.assign({ season: s, no: n }, R[s][n])); }));
    if (!hit.length) return demo ? '' : `<div class="panel nextstep"><span class="label">Synth Stars</span><p><b>Claim your free card.</b> We make a one-of-a-kind collector card of you within 4 weeks.</p><p><a class="btn ghost" href="cards.html#claim">Claim my card</a></p></div>`;
    const c = hit[0];
    return `<h3 class="subhead">My Synth Stars card <span class="small"><a href="cards.html#season">see the season</a></span></h3>
      <div class="panel pad mycard"><figure class="slot filled${c.back ? ' flip' : ''}" ${c.back ? 'tabindex="0" title="Tap to flip" onclick="this.classList.toggle(\'flipped\')"' : ''}><div class="faces"><img class="front" src="${esc(c.image)}" alt="${esc(c.artist)} card">${c.back ? `<img class="back" src="${esc(c.back)}" alt="${esc(c.artist)} card, back">` : ''}</div></figure>
      <div><p class="label">Season ${esc(String(c.season).replace(/^S/, ''))} · card ${esc(c.no)} of 52</p><h3 style="margin:6px 0">${esc(c.artist)}${c.value ? ` <b class="cval">${esc(c.value)}</b>` : ''}</h3><p class="small">${esc(c.style || '')}</p>${c.back ? '<p class="small">Tap the card to flip it.</p>' : ''}</div></div>`;
  }
  /* ---------- personal notifications: how-to guides + your news; "Got it" hides each one for good ---------- */
  function notifPanel(m, demo){
    const list = (m.notifications || []).slice();
    if (!list.length) return '';
    const icon = k => ({ guide: '👉', points: '⭐', achievement: '🏅', belt: '🥋', post: '📣', release: '💿', series: '🎉', card: '🃏' }[k] || '🔔');
    return `<div class="panel notifbox" id="notifs"><div class="nf-head"><p class="label">Your notifications · <span id="nf-count">${list.length}</span></p><button type="button" class="copy" id="nf-all">Mark all as seen</button></div>
      <ul class="nf-list">${list.map(n => `<li data-key="${esc(n.key)}" class="nf-${esc(n.kind)}"><span class="nf-ico" aria-hidden="true">${icon(n.kind)}</span><div><p>${esc(n.text)}</p>${n.at && n.kind !== 'guide' ? `<span class="small">${esc(fmt(n.at))}</span>` : ''}</div>${n.action && n.url ? `<a class="btn ghost small-btn" href="${esc(n.url)}">${esc(n.action)}</a>` : ''}<button type="button" class="nf-x" aria-label="Got it, hide this">Got it</button></li>`).join('')}</ul></div>`;
  }
  function wireNotifs(m, demo){
    const box = document.getElementById('notifs'); if (!box) return;
    const send = keys => { if (demo || !url || !keys.length) return; const d = new URLSearchParams({ form: 'notif-seen', member_id: m.id, keys: keys.join('|') }); window.rrrSend ? window.rrrSend(url, d, () => {}) : fetch(url, { method: 'POST', body: d }); };
    const update = () => { const n = box.querySelectorAll('li').length; const c = document.getElementById('nf-count'); if (c) c.textContent = n; if (!n) box.remove(); };
    box.addEventListener('click', e => {
      const x = e.target.closest('.nf-x'), a = e.target.closest('a.btn');
      const li = e.target.closest('li'); if (!li || (!x && !a)) return;
      send([li.dataset.key]); if (x) { li.remove(); update(); }
    });
    const all = document.getElementById('nf-all'); if (all) all.addEventListener('click', () => { send([...box.querySelectorAll('li')].map(li => li.dataset.key)); box.remove(); });
  }
  function render(m, demo, notLive){
    const pts = Number(m.points) || 0;
    // The belt comes from RRR (it includes time in grade); older data falls back to points
    const belt = BELTS.find(b => b.name === (m.belt || m.rank)) || beltFor(pts), nb = BELTS[BELTS.indexOf(belt) + 1] || null;
    const from = belt.min, to = nb ? nb.min : null;
    const pct = to ? Math.max(0, Math.min(100, Math.round((pts - from) / (to - from) * 100))) : 100;
    const earned = new Set((m.achievements || []).map(a => a.title));
    const statusLabel = s => ({ 'live': 'Live', 'posted': 'Posted', 'booked': 'Booked', 'requested': 'Requested', 'assets received': 'Assets in', 'awaiting review': 'Being checked', 'approved': 'Approved', 'scheduled': 'Scheduled', 'rejected': 'Not approved', 'post failed': 'Problem' }[String(s).toLowerCase()] || s || '–');
    const kindLabel = k => ({ 'bandcamp-release': 'Bandcamp', 'streaming-release': 'Streaming' }[k] || k);
    const s = m.stats;
    $('#dash').innerHTML = `
      ${m.standing === 'suspended' ? `<div class="panel empty" style="border-color:#ff8a8a"><b>Your membership is suspended.</b><span>Bookings, claims, submissions and stats are paused. We've emailed you why and how to appeal. Questions: ${esc(C.email)}</span></div>` : ''}
      ${notifPanel(m, demo)}
      ${demo ? `<p class="prov"><span>Example</span> ${notLive ? 'Member dashboards go live when the RRR automation is switched on. This is an example.' : 'This is an example dashboard with made-up numbers.'}</p>` : ''}
      <div class="dash-top">
        <div class="panel who">
          <p class="label">${esc(m.type === 'artist' ? 'Artist member' : 'Fan member')} · ${esc(m.id)}</p>
          <p class="motto">Welcome to the family</p>
          <h2>${esc(m.name)}</h2>
          ${(m.achievements || []).filter(x => /^(Sifu|Founder|Ambassador|Moderator|Administrator)$/.test(x.title)).map(x => `<b class="rolechip">${x.title === 'Sifu' ? '🥋 RRR Sifu · Owner of RRR' : (x.title === 'Founder' ? '👑' : x.title === 'Administrator' ? '🛡' : '🌟') + ' RRR ' + esc(x.title)}</b>`).join(' ')}
          ${m.links && (m.links.bandcamp || m.links.spotify) ? `<p class="small proflinks">${m.links.bandcamp ? `<a href="${esc(m.links.bandcamp)}" target="_blank" rel="noopener">Bandcamp ↗</a>` : ''}${m.links.bandcamp && m.links.spotify ? ' · ' : ''}${m.links.spotify ? `<a href="${esc(m.links.spotify)}" target="_blank" rel="noopener">Spotify ↗</a>` : ''}</p>` : ''}
          <p class="small">Member since ${esc(fmt(m.since))} · ${esc(m.status || '')}</p>
        </div>
        <div class="panel rankbox">
          <p class="label">Belt · <a href="levels.html">how to level up</a></p>
          <div class="rankline"><b class="rankname beltchip" style="--belt:${belt.color}"><i></i>${esc(belt.name)}</b><span class="num pts">${num(pts)} pts</span></div>
          <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progress to next belt"><i style="width:${pct}%"></i></div>
          <p class="small">${m.waiting && m.waiting.belt ? `🎉 You've earned <b>${esc(m.waiting.belt)}</b>! It's yours on <b>${esc(fmt(m.waiting.readyOn))}</b> (every belt needs time in grade).` : to ? `${num(Math.max(0, to - pts))} points to <b>${esc(nb.name)}</b>` : (() => { const ev = (window.RRR_LEVELS && RRR_LEVELS.starEvery) || 2000, top = BELTS[BELTS.length - 1].min, st = m.stars != null ? Number(m.stars) : Math.floor((pts - top) / ev); return `Grandmaster ${st > 0 ? '<b class="gmstars">' + '★'.repeat(Math.min(st, 20)) + '</b>' : ''} · ${num(ev - ((pts - top) % ev))} points to your next star`; })()}</p>
          <div class="beltstrip">${BELTS.slice(0, 8).map(b => `<span title="${esc(b.name)} · ${b.min} pts" class="${pts >= b.min ? 'on' : ''}" style="--belt:${b.color}"></span>`).join('')}<em>${pts >= 2000 ? esc(belt.name) : 'then 10 Dans'}</em></div>
          ${demo ? '<button type="button" class="copy" id="try-levelup">Preview a level-up 🎉</button>' : ''}
        </div>
      </div>

      ${!demo && /pending payment/i.test(String(m.status || '')) ? payNow(m) : ''}
      ${m.type === 'artist' ? myCard(m, demo) : ''}
      ${m.type === 'artist' ? `
      <h3 class="subhead">RRR status <span class="small"><a href="series.html">about Selected Releases</a></span></h3>
      <div class="statusgrid">
        <div class="panel"><span class="label">RRR membership</span><b class="${m.membershipActive ? 'ok' : 'no'}">${m.membershipActive ? 'Active' : 'Inactive'}</b></div>
        <div class="panel"><span class="label">Bandcamp linked</span><b class="${m.bandcampLinked ? 'ok' : 'todo'}">${m.bandcampLinked ? 'Yes' : 'Not yet'}</b></div>
        <div class="panel"><span class="label">Artist type</span><b>${esc(m.artistType || 'Member')}</b></div>
        <div class="panel"><span class="label">Eligible for RRR release</span><b class="${m.eligible ? 'ok' : 'todo'}">${m.eligible ? 'Yes' : (m.bandcampLinked ? 'Not yet' : 'After linking')}</b></div>
      </div>
      ${m.bandcampLinked ? '' : (() => { const ls = m.linkStatus || {}, link = 'series.html' + (demo ? '' : '?id=' + encodeURIComponent(m.id)) + '#link-form';
        if (ls.status === 'requested' && ls.method === 'password') return '<div class="panel nextstep"><span class="label">Linking in progress</span><p><b>Check your email.</b> Set the placeholder password we sent you on Bandcamp, then press <b>"Done, I\'ve set it"</b> in that email.</p><a class="copy" href="' + link + '">Didn\'t get it? Ask again</a></div>';
        if (ls.status === 'requested') return '<div class="panel nextstep"><span class="label">Linking in progress</span><p><b>Watch for our Bandcamp invite</b> and press accept. We send it within a day.</p></div>';
        if (ls.status === 'ready') return '<div class="panel nextstep"><span class="label">Linking in progress</span><p><b>We\'re linking your page now.</b> You\'ll get a "Linked ✓" email. Then change your Bandcamp password.</p></div>';
        return '<div class="panel nextstep"><span class="label">Your next step</span><p><b>Link your Bandcamp to RRR.</b> It unlocks Bandcamp releases and gets you free Bandcamp VIP. It only affects your RRR releases: everything else stays yours.</p><a class="btn primary" href="' + link + '">Link my Bandcamp</a> <a class="small" href="series.html#linking">How linking works</a></div>'; })()}
      <h3 class="subhead">My releases <span class="small"><a href="series.html${demo ? '' : '?id=' + encodeURIComponent(m.id)}#submit">Submit or add a release</a></span></h3>
      ${progTable(m.programme || [])}` : ''}

      ${C.discord && C.discord.invite ? `<div class="panel nextstep discordbox"><span class="label">RRR Discord · optional</span><p><b>Hang out with the family on Discord.</b> 1. Join the server. 2. Accept the rules. 3. Post your member ID <b class="num">${esc(m.id)}</b> in <b>${esc(C.discord.linkChannel || '#link-your-account')}</b>: within the hour you get your belt colour and the members' channels.</p><a class="btn primary" href="${esc(C.discord.invite)}" target="_blank" rel="noopener">Join the RRR Discord ↗</a></div>` : ''}

      <h3 class="subhead">Points history <span class="small"><a href="${demo ? 'levels.html#claim' : 'levels.html?id=' + encodeURIComponent(m.id) + '#claim'}">Claim points</a> · <a href="levels.html#points-table">what earns points</a></span></h3>
      ${(m.recentPoints || []).length ? `<ul class="list ptlog">${m.recentPoints.map(r => `<li class="panel"><div><b>${esc(String(r.note || 'Points').replace(/^Claim: /, ''))}</b><span class="small">${esc(fmt(r.on))}${/^Claim: /.test(r.note || '') ? ' · checked by RRR' : ''}</span></div><em class="num pts">+${num(r.points)}</em></li>`).join('')}</ul>`
        : `<div class="panel empty"><b>No points yet beyond your badges.</b><span>Support another member's release, then <a href="levels.html#claim">claim your points</a>.</span></div>`}

      ${m.type === 'artist' ? bcSales(m.bandcampSales) + payoutPanel(m, demo) : ''}
      <h3 class="subhead">Stats${s && s.updated ? ` <span class="small">updated ${esc(fmt(s.updated))}${s.source ? ' · via ' + esc(s.source) : ''}</span>` : ''}</h3>
      ${s ? `<div class="tiles">
        <div class="panel tile"><span class="label">Spotify monthly listeners</span><b class="num">${num(s.spotifyListeners)}</b></div>
        <div class="panel tile"><span class="label">Spotify streams</span><b class="num">${num(s.spotifyStreams)}</b></div>
        <div class="panel tile"><span class="label">Playlists</span><b class="num">${num(s.playlists)}</b></div>
        <div class="panel tile"><span class="label">YouTube views</span><b class="num">${num(s.youtubeViews)}</b></div>
        <div class="panel tile"><span class="label">TikTok views</span><b class="num">${num(s.tiktokViews)}</b></div>
      </div>` : statsEmpty(m, demo)}

      <h3 class="subhead">Achievements <span class="small">${earned.size} of ${CATALOGUE.length}</span></h3>
      <div class="achs">${CATALOGUE.map(a => {
        const got = (m.achievements || []).find(x => x.title === a.title);
        return `<div class="panel ach ${got ? 'got' : ''}"><span class="badge">${got ? '★' : '☆'}</span><div><b>${esc(a.title)}</b><span class="small">${got ? 'Earned ' + esc(fmt(got.on)) : esc(a.how)}</span></div><em class="num">+${a.points}</em></div>`;
      }).join('')}</div>

      <div class="grid2">
        <div>
          <h3 class="subhead">Releases</h3>
          ${(m.releases || []).length ? `<ul class="list">${m.releases.map(r => `<li class="panel"><div><b>${esc(r.title)}</b><span class="small">${esc(kindLabel(r.kind))}${r.format ? ' · ' + esc(r.format) : ''} · ${esc(fmt(r.date))}</span></div><span class="pill">${esc(statusLabel(r.status))}</span></li>`).join('')}</ul>`
            : `<div class="panel empty"><b>No releases yet.</b><span><a href="book.html#bandcamp">Book a release</a></span></div>`}
        </div>
        <div>
          <h3 class="subhead">Social posts</h3>
          ${(m.posts || []).length ? `<ul class="list">${m.posts.map(p => `<li class="panel"><div><b>${esc(p.platform || 'Social post')}</b><span class="small">${esc(fmt(p.date))}</span></div><span class="pill">${esc(statusLabel(p.status))}</span></li>`).join('')}</ul>`
            : `<div class="panel empty"><b>No posts yet.</b><span><a href="book.html#social">Book a social post</a></span></div>`}
        </div>
      </div>`;
    const tl = document.getElementById('try-levelup'); if (tl) tl.addEventListener('click', () => celebrate('Orange belt'));
    wireNotifs(m, demo);
    wirePayout(m, demo);
    checkLevelUp(m, demo);
  }
})();
