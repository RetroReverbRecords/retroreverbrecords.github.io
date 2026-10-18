/* © 2018–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* The Bandcamp Hour page: plays the live show when the RRR YouTube channel is live (state from site.js) */
(function(){
  const C = window.RRR_CONFIG || {}, L = C.liveShow || {}, Y = C.youtube || {};
  const $ = s => document.querySelector(s);
  $('#lv-sub').href = Y.subscribe || Y.channel || '#';
  $('#lv-past').href = L.mixcloud || '#';
  $('#lv-mx').href = L.mixcloud || '#';
  if (L.schedule) $('#lv-when').innerHTML = 'The show airs <b>' + String(L.schedule).replace(/[<>&]/g, '') + '</b>. When we go live, this page plays the show and a <b>LIVE NOW</b> bar appears at the top of every page.';
  // Show times in major time zones (worked out from Italy time, so clock changes are handled)
  (function(){
    const box = $('#lv-tz'); if (!box || !window.Intl) return;
    const part = (d, tz, o) => new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: tz }, o)).format(d);
    const romeHM = d => part(d, 'Europe/Rome', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const now = new Date(), day = new Date(now);
    const wd = () => part(day, 'Europe/Rome', { weekday: 'short' });
    for (let i = 0; i < 8 && wd() !== 'Sun'; i++) day.setUTCDate(day.getUTCDate() + 1);
    const showStart = dd => {
      const ymd = part(dd, 'Europe/Rome', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/');
      let st = new Date(Date.UTC(+ymd[2], +ymd[1] - 1, +ymd[0], 14, 0));
      for (let k = 0; k < 3 && romeHM(st) !== '16:00'; k++) st = new Date(st.getTime() + (16 - +romeHM(st).slice(0, 2)) * 3600000);
      return st;
    };
    let start = showStart(day);
    if (start.getTime() + 2 * 3600000 < now.getTime()) { day.setUTCDate(day.getUTCDate() + 7); start = showStart(day); }
    const end = new Date(start.getTime() + 2 * 3600000);
    const t = (d, tz) => part(d, tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const w = (d, tz) => part(d, tz, { weekday: 'short' });
    const zones = [['UK', 'Europe/London'], ['New York', 'America/New_York'], ['Los Angeles', 'America/Los_Angeles'], ['São Paulo', 'America/Sao_Paulo'], ['Tokyo', 'Asia/Tokyo'], ['Sydney', 'Australia/Sydney']];
    let mine = ''; try { mine = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    const row = (n, tz) => '<li><b>' + n + ':</b> ' + (w(start, tz) !== 'Sun' ? w(start, tz) + ' ' : '') + t(start, tz) + ' to ' + t(end, tz) + '</li>';
    box.innerHTML = (mine ? row('Your time', mine) : '') + zones.map(z => row(z[0], z[1])).join('');
  })();
  let shown = '';
  function render(d){
    const on = !!(d && d.live);
    $('#lv-on').hidden = !on; $('#lv-off').hidden = on;
    if (!on) { $('#lv-player').innerHTML = ''; shown = ''; return; }
    $('#lv-yt').href = d.youtube || Y.live || Y.channel;
    if (d.mixcloud) $('#lv-mx').href = d.mixcloud;
    const id = /^[\w-]{11}$/.test(d.videoId || '') ? d.videoId : '';
    if (id && id !== shown) {
      $('#lv-player').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="The Bandcamp Hour live" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      shown = id;
    } else if (!id && !shown) {
      $('#lv-player').innerHTML = '<a class="liveoff pad" style="position:absolute;inset:0;display:grid;place-items:center;color:#fff" href="' + (d.youtube || Y.live || '#') + '" target="_blank" rel="noopener"><b>▶ Watch live on YouTube</b></a>';
    }
  }
  if (window.rrrLive) render(window.rrrLive);
  document.addEventListener('rrr-live', e => render(e.detail));
})();
