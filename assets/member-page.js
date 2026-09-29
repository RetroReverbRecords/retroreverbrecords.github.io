/* Member dashboard. Data comes from the RRR automation (Google Apps Script).
   Without it, or with ?id=DEMO, it shows a clearly labelled example. */
(function(){
  const C = window.RRR_CONFIG || {};
  const $ = s => document.querySelector(s);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = d => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}); };
  const num = n => (n === '' || n == null) ? '–' : Number(n).toLocaleString('en-GB');

  // Every achievement members can earn. Keep in step with backend/Code.gs.
  const CATALOGUE = [
    { title: 'Joined the community', points: 5, how: 'Sign up' },
    { title: 'First release booked', points: 20, how: 'Book a Bandcamp or streaming release' },
    { title: 'First social post booked', points: 5, how: 'Book a social media post' },
    { title: 'First YouTube upload', points: 5, how: 'Book a YouTube upload' },
    { title: '3 months a member', points: 15, how: 'Stay active for 3 months' },
    { title: '1 year a member', points: 50, how: 'Stay active for a year' }
  ];
  const RANKS = [['Signal',0],['Echo',50],['Reverb',150],['Resonance',400],['Legend',1000]];

  const DEMO = {
    id: 'DEMO', name: 'Demo Artist', type: 'artist', since: '2026-06-01', status: 'active',
    points: 50, rank: 'Echo', rankFrom: 50, nextRank: 'Reverb', nextAt: 150,
    achievements: [
      { title: 'Joined the community', on: '2026-06-01', points: 5 },
      { title: 'First release booked', on: '2026-06-10', points: 20 },
      { title: 'First social post booked', on: '2026-06-12', points: 5 },
      { title: '3 months a member', on: '2026-09-01', points: 15 },
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
    stats: { updated: '2026-09-28', spotifyListeners: 1840, spotifyStreams: 42310, playlists: 27, youtubeViews: 3900, tiktokViews: 12500, source: 'Songstats' }
  };

  const params = new URLSearchParams(location.search);
  const id = (params.get('id') || (location.hash || '').slice(1) || '').trim().toUpperCase();
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

  function render(m, demo, notLive){
    const pts = Number(m.points) || 0;
    const from = Number(m.rankFrom) || 0, to = Number(m.nextAt) || null;
    const pct = to ? Math.max(0, Math.min(100, Math.round((pts - from) / (to - from) * 100))) : 100;
    const earned = new Set((m.achievements || []).map(a => a.title));
    const statusLabel = s => ({ 'live': 'Live', 'posted': 'Posted', 'booked': 'Booked', 'requested': 'Requested', 'assets received': 'Assets in' }[String(s).toLowerCase()] || s || '–');
    const kindLabel = k => ({ 'bandcamp-release': 'Bandcamp', 'streaming-release': 'Streaming' }[k] || k);
    const s = m.stats;
    $('#dash').innerHTML = `
      ${demo ? `<p class="prov"><span>Example</span> ${notLive ? 'Member dashboards go live when the RRR automation is switched on. This is an example.' : 'This is an example dashboard with made-up numbers.'}</p>` : ''}
      <div class="dash-top">
        <div class="panel who">
          <p class="label">${esc(m.type === 'artist' ? 'Artist member' : 'Fan member')} · ${esc(m.id)}</p>
          <h2>${esc(m.name)}</h2>
          <p class="small">Member since ${esc(fmt(m.since))} · ${esc(m.status || '')}</p>
        </div>
        <div class="panel rankbox">
          <p class="label">Rank</p>
          <div class="rankline"><b class="rankname">${esc(m.rank)}</b><span class="num pts">${num(pts)} pts</span></div>
          <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progress to next rank"><i style="width:${pct}%"></i></div>
          <p class="small">${to ? `${num(to - pts)} points to <b>${esc(m.nextRank)}</b>` : 'Top rank reached'}</p>
          <ol class="ranks">${RANKS.map(([n, min]) => `<li class="${pts >= min ? 'on' : ''}"><span>${n}</span><em class="num">${min}</em></li>`).join('')}</ol>
        </div>
      </div>

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
  }
})();
