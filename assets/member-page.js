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
      { title: 'Chrome Hearts', affiliation: 'Pending review', series: 'RRR DARK', catalogue: '', date: '2026-12-05' },
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
      return `<p class="label" style="margin:14px 0 8px">${label} · ${rows.length}</p><ul class="list">${rows.map(r => `<li class="panel"><div><b>${esc(r.title)}</b><span class="small">${r.series ? esc(r.series) + ' · ' : ''}${r.catalogue ? '<b class="num">' + esc(r.catalogue) + '</b> · ' : ''}${esc(fmt(r.date))}</span></div><em class="aff ${cls}">${cls === 'rrr' ? 'Selected Release' : cls === 'pend' ? 'In review' : cls === 'ind' ? 'Independent' : cls === 'oth' ? 'Other label' : 'Not selected'}</em></li>`).join('')}</ul>`;
    }).join('');
  }

  function render(m, demo, notLive){
    const pts = Number(m.points) || 0;
    const belt = beltFor(pts), nb = nextBelt(pts);
    const from = belt.min, to = nb ? nb.min : null;
    const pct = to ? Math.max(0, Math.min(100, Math.round((pts - from) / (to - from) * 100))) : 100;
    const earned = new Set((m.achievements || []).map(a => a.title));
    const statusLabel = s => ({ 'live': 'Live', 'posted': 'Posted', 'booked': 'Booked', 'requested': 'Requested', 'assets received': 'Assets in' }[String(s).toLowerCase()] || s || '–');
    const kindLabel = k => ({ 'bandcamp-release': 'Bandcamp', 'streaming-release': 'Streaming' }[k] || k);
    const s = m.stats;
    $('#dash').innerHTML = `
      ${m.standing === 'suspended' ? `<div class="panel empty" style="border-color:#ff8a8a"><b>Your membership is suspended.</b><span>Bookings, claims and submissions are paused. We've emailed you why and how to appeal. Questions: ${esc(C.email)}</span></div>` : ''}
      ${demo ? `<p class="prov"><span>Example</span> ${notLive ? 'Member dashboards go live when the RRR automation is switched on. This is an example.' : 'This is an example dashboard with made-up numbers.'}</p>` : ''}
      <div class="dash-top">
        <div class="panel who">
          <p class="label">${esc(m.type === 'artist' ? 'Artist member' : 'Fan member')} · ${esc(m.id)}</p>
          <h2>${esc(m.name)}</h2>
          ${(m.achievements || []).filter(x => /^(Founder|Ambassador|Moderator)$/.test(x.title)).map(x => `<b class="rolechip">${x.title === 'Founder' ? '👑' : '🌟'} RRR ${esc(x.title)}</b>`).join(' ')}
          <p class="small">Member since ${esc(fmt(m.since))} · ${esc(m.status || '')}</p>
        </div>
        <div class="panel rankbox">
          <p class="label">Belt · <a href="levels.html">how to level up</a></p>
          <div class="rankline"><b class="rankname beltchip" style="--belt:${belt.color}"><i></i>${esc(belt.name)}</b><span class="num pts">${num(pts)} pts</span></div>
          <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progress to next belt"><i style="width:${pct}%"></i></div>
          <p class="small">${to ? `${num(to - pts)} points to <b>${esc(nb.name)}</b>` : 'Highest Dan reached. Legend.'}</p>
          <div class="beltstrip">${BELTS.slice(0, 8).map(b => `<span title="${esc(b.name)} · ${b.min} pts" class="${pts >= b.min ? 'on' : ''}" style="--belt:${b.color}"></span>`).join('')}<em>${pts >= 2000 ? esc(belt.name) : 'then 10 Dans'}</em></div>
          ${demo ? '<button type="button" class="copy" id="try-levelup">Preview a level-up 🎉</button>' : ''}
        </div>
      </div>

      ${m.type === 'artist' ? `
      <h3 class="subhead">RRR status <span class="small"><a href="series.html">about Selected Releases</a></span></h3>
      <div class="statusgrid">
        <div class="panel"><span class="label">RRR membership</span><b class="${m.membershipActive ? 'ok' : 'no'}">${m.membershipActive ? 'Active' : 'Inactive'}</b></div>
        <div class="panel"><span class="label">Bandcamp linked</span><b class="${m.bandcampLinked ? 'ok' : 'no'}">${m.bandcampLinked ? 'Yes' : 'No'}</b></div>
        <div class="panel"><span class="label">Artist type</span><b>${esc(m.artistType || 'Member')}</b></div>
        <div class="panel"><span class="label">Eligible for RRR release</span><b class="${m.eligible ? 'ok' : 'no'}">${m.eligible ? 'Yes' : 'No'}</b></div>
      </div>
      ${m.bandcampLinked ? '' : '<p class="small">Link your Bandcamp to the RRR Bandcamp to submit RRR releases and get free Bandcamp VIP membership. <a href="series.html#submit">How to link</a></p>'}
      <h3 class="subhead">My releases <span class="small"><a href="series.html${demo ? '' : '?id=' + encodeURIComponent(m.id)}#submit">Submit or add a release</a></span></h3>
      ${progTable(m.programme || [])}` : ''}

      <h3 class="subhead">Points history <span class="small"><a href="${demo ? 'levels.html#claim' : 'levels.html?id=' + encodeURIComponent(m.id) + '#claim'}">Claim points</a> · <a href="levels.html#points-table">what earns points</a></span></h3>
      ${(m.recentPoints || []).length ? `<ul class="list ptlog">${m.recentPoints.map(r => `<li class="panel"><div><b>${esc(String(r.note || 'Points').replace(/^Claim: /, ''))}</b><span class="small">${esc(fmt(r.on))}${/^Claim: /.test(r.note || '') ? ' · checked by RRR' : ''}</span></div><em class="num pts">+${num(r.points)}</em></li>`).join('')}</ul>`
        : `<div class="panel empty"><b>No points yet beyond your badges.</b><span>Support another member's release, then <a href="levels.html#claim">claim your points</a>.</span></div>`}

      <h3 class="subhead">Stats${s && s.updated ? ` <span class="small">updated ${esc(fmt(s.updated))}${s.source ? ' · via ' + esc(s.source) : ''}</span>` : ''}</h3>
      ${s ? `<div class="tiles">
        <div class="panel tile"><span class="label">Spotify monthly listeners</span><b class="num">${num(s.spotifyListeners)}</b></div>
        <div class="panel tile"><span class="label">Spotify streams</span><b class="num">${num(s.spotifyStreams)}</b></div>
        <div class="panel tile"><span class="label">Playlists</span><b class="num">${num(s.playlists)}</b></div>
        <div class="panel tile"><span class="label">YouTube views</span><b class="num">${num(s.youtubeViews)}</b></div>
        <div class="panel tile"><span class="label">TikTok views</span><b class="num">${num(s.tiktokViews)}</b></div>
      </div>` : `<div class="panel empty"><b>No stats yet.</b><span>Stats appear once your artist profile is linked to Songstats.</span></div>`}

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
    checkLevelUp(m, demo);
  }
})();
