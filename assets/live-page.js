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

/* RRR LIVE: schedule of approved shows (RRR + promoters) in the visitor's time, and the "Request a slot" form */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '';
  const $ = s => document.querySelector(s);
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = u => /^https:\/\//i.test(String(u || '')) ? u : '';
  const ytId = u => { const m = String(u || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([\w-]{11})/); return m ? m[1] : ''; };
  const day = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const tm = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const list = $('#sh-list'), now = $('#sh-now');
  function paint(shows) {
    const t = Date.now();
    const on = shows.filter(s => new Date(s.start) <= t && new Date(s.end) > t && !s.rrr);
    now.innerHTML = on.map(s => {
      const id = ytId(s.stream), link = safe(s.stream);
      return '<div class="panel box onair"><p class="label"><span class="livedot"></span> On air now</p><h3>' + e(s.name) + '</h3>' +
        '<p>' + (s.promoter ? 'with ' + e(s.promoter) + ' · ' : '') + 'until ' + tm(new Date(s.end)) + ' your time' + (s.genres ? ' · ' + e(s.genres) : '') + '</p>' +
        (id ? '<div class="liveplayer"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="' + e(s.name) + ' live" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' : '') +
        (link ? '<p class="actions"><a class="btn primary" href="' + e(link) + '" target="_blank" rel="noopener">Watch or listen live ↗</a></p>' : '') + '</div>';
    }).join('');
    list.innerHTML = shows.length ? shows.map(s => {
      const st = new Date(s.start), en = new Date(s.end), live = st <= t && en > t;
      const go = s.rrr ? 'live.html' : safe(s.stream) || safe(s.website);
      return '<li' + (live ? ' class="is-live"' : '') + '><span class="sch-when"><b>' + day(st) + '</b> ' + tm(st) + ' to ' + tm(en) + '</span>' +
        '<span class="sch-what">' + (live ? '<span class="livedot"></span> ' : '') + '<b>' + e(s.name) + '</b>' + (s.promoter && !s.rrr ? ' · ' + e(s.promoter) : '') + (s.genres ? ' <span class="small">' + e(s.genres) + '</span>' : '') + '</span>' +
        (go ? '<a href="' + e(go) + '"' + (s.rrr ? '' : ' target="_blank" rel="noopener"') + '>' + (live ? 'Tune in' : s.rrr ? 'This page' : 'Show link') + ' ↗</a>' : '') + '</li>';
    }).join('') : '<li class="small">No shows booked this week yet.</li>';
  }
  if (list) {
    if (!url) paint([]);
    else fetch(url + (url.includes('?') ? '&' : '?') + 'shows=1').then(r => r.json()).then(d => paint((d && d.shows) || [])).catch(() => { list.innerHTML = '<li class="small">The schedule could not load. Try again in a minute.</li>'; });
  }

  // Request form
  const form = $('#sh-form'); if (!form) return;
  const st = $('#sh-status'), say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = '<span class="dot"></span><span>' + html + '</span>'; };
  const tzSel = $('#sh-tz');
  let mine = 'Europe/Rome'; try { mine = Intl.DateTimeFormat().resolvedOptions().timeZone || mine; } catch (x) {}
  let zones = ['Europe/London', 'Europe/Rome', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Paris', 'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Helsinki', 'Europe/Athens', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland', 'UTC'];
  try { if (Intl.supportedValuesOf) zones = Intl.supportedValuesOf('timeZone'); } catch (x) {}
  if (zones.indexOf(mine) < 0) zones.unshift(mine);
  tzSel.innerHTML = zones.map(z => '<option' + (z === mine ? ' selected' : '') + '>' + e(z) + '</option>').join('');
  const rep = $('#sh-repeat');
  const sync = () => { const one = rep.value === 'one-off'; $('#sh-day-wrap').hidden = one; $('#sh-date-wrap').hidden = !one; $('#sh-day').required = !one; $('#sh-date').required = one; };
  rep.addEventListener('change', sync); sync();
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new URLSearchParams(); new FormData(form).forEach((v, k) => data.append(k, v));
    data.append('form', 'show-request'); data.append('page', location.pathname);
    try { const id = localStorage.getItem('rrr-member-id'); if (id) data.append('member_id', id); } catch (x) {}
    if (!url) { say(false, 'Requests open soon. Please try again later.'); return; }
    try {
      await window.rrrSend(url, data);
      say(true, '<strong>Request sent ✓</strong> Thanks! We\'ll check ' + e(data.get('show_name')) + ' and reply to ' + e(data.get('email')) + ' (check spam).');
      form.querySelector('fieldset').disabled = true;
    } catch (err) { say(false, "<strong>That didn't send.</strong> Please try again in a minute."); }
  });
})();
