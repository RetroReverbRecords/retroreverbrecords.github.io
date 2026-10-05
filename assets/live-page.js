/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* The Bandcamp Hour page: plays the live show when the RRR YouTube channel is live (state from site.js) */
(function(){
  const C = window.RRR_CONFIG || {}, L = C.liveShow || {}, Y = C.youtube || {};
  const $ = s => document.querySelector(s);
  $('#lv-sub').href = Y.subscribe || Y.channel || '#';
  $('#lv-past').href = L.mixcloud || '#';
  $('#lv-mx').href = L.mixcloud || '#';
  if (L.schedule) $('#lv-when').innerHTML = 'The show airs <b>' + String(L.schedule).replace(/[<>&]/g, '') + '</b>. When we go live, this page plays the show and a <b>LIVE NOW</b> bar appears at the top of every page.';
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
