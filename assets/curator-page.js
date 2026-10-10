/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* RRR Submit curator queue: curator.html?k=<private key> */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = new URLSearchParams(location.search).get('k') || '';
  const st = $('#cq-status'), listEl = $('#cq-list');
  const say = (ok, html) => { st.classList.toggle('open', ok); st.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
  const post = data => window.rrrSend(url, data);
  const words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  let data = null, filter = 'all', minWords = 20;
  const left = d => { const h = (new Date(d) - Date.now()) / 3600000; return h <= 0 ? 'expired' : h < 48 ? `in ${Math.ceil(h)} hours` : `in ${Math.ceil(h / 24)} days`; };
  const fmt = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  function stats(){
    const s = data.stats;
    $('#cu-title').innerHTML = esc(data.curator.name) + ' <em>queue</em>';
    $('#cu-stats').innerHTML = `<div><b class="num">${s.answers}</b><span>answers given</span><small>${s.thisMonth} this month</small></div>
      <div><b class="num">${s.rate}%</b><span>response rate</span><small>past 30 days</small></div>
      <div><b class="num">€${Number(s.owed).toFixed(2)}</b><span>earned, not paid yet</span><small>paid monthly by PayPal</small></div>`;
    const t = data.todo;
    const n = { all: t.length, urgent: t.filter(r => (new Date(r.due) - Date.now()) < 48 * 3600000).length, listen: t.filter(r => !r.listened).length, complete: t.filter(r => r.listened).length, done: data.done.length };
    $$('.subtabs [role=tab]').forEach(b => { b.textContent = b.textContent.replace(/ \(\d+\)$/, '') + ` (${n[b.dataset.f]})`; });
  }
  let need = 30;
  const linkify = t => esc(t).replace(/https:\/\/[^\s,]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  const once = {};
  const loadScript = (src, ready) => { if (once[src]) return once[src]; once[src] = new Promise(res => { if (ready && ready()) return res(); const sc = document.createElement('script'); sc.src = src; sc.onload = () => res(); document.head.appendChild(sc); }); return once[src]; };
  const ytReady = () => new Promise(res => { if (window.YT && window.YT.Player) return res(); const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); }; loadScript('https://www.youtube.com/iframe_api'); });
  function kind(u){
    if (/^https:\/\/((www\.|m\.)?youtube\.com\/|youtu\.be\/)/i.test(u)) return 'yt';
    if (/^https:\/\/((on|m)\.)?soundcloud\.com\//i.test(u)) return 'sc';
    if (/^https:\/\/(www\.)?dropbox\.com\//i.test(u)) return 'db';
    if (/^https:\/\/[^?#]+\.(mp3|wav|m4a|ogg|flac)([?#]|$)/i.test(u)) return 'au';
    return '';
  }
  const ytId = u => { const m = u.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : ''; };
  // Counts only real playing time: jumps (seeking) don't count.
  function mountPlayer(card, r){
    const box = card.querySelector('[data-player]'); if (!box) return;
    const bar = card.querySelector('.listenbar i'), lsn = card.querySelector('[data-lsn]'), fm = card.querySelector('.cqform');
    let secs = r.secs || 0, sent = secs, last = null;
    const show = () => { bar.style.width = Math.min(100, 100 * secs / need) + '%';
      if (secs >= need) { lsn.textContent = 'Listened ✓ You can answer now.'; fm.removeAttribute('aria-disabled'); }
      else lsn.textContent = `Play at least ${need} seconds to unlock your answer (${Math.floor(secs)} / ${need})`; };
    const report = force => { if (secs - sent >= 10 || (force && secs > sent) || (secs >= need && sent < need)) { sent = Math.floor(secs); post(new URLSearchParams({ form: 'submit-listened', key, review_id: r.id, secs: sent })); if (secs >= need) { r.listened = true; r.secs = sent; stats(); } } };
    const tick = t => { if (last !== null) { const d = t - last; if (d > 0 && d <= 2.5) { secs += d; show(); report(); } } last = t; };
    const k = kind(r.url || ''); show();
    if (k === 'yt') {
      const id = ytId(r.url); if (!id) return;
      box.innerHTML = `<div class="yt"></div>`;
      ytReady().then(() => { const pl = new YT.Player(box.firstChild, { videoId: id, playerVars: { rel: 0, origin: location.origin }, events: { onReady: () => {
        setInterval(() => { if (pl.getPlayerState && pl.getPlayerState() === 1) tick(pl.getCurrentTime()); else last = null; }, 1000); } } });
        const f = box.querySelector('iframe'); if (f) f.classList.add('yt'); setTimeout(() => { const g = box.querySelector('iframe'); if (g) g.classList.add('yt'); }, 500); });
    } else if (k === 'sc') {
      box.innerHTML = `<iframe class="sc" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(r.url)}&visual=false&show_comments=false"></iframe>`;
      loadScript('https://w.soundcloud.com/player/api.js', () => window.SC && window.SC.Widget).then(() => { const w = SC.Widget(box.querySelector('iframe'));
        w.bind(SC.Widget.Events.PLAY_PROGRESS, e => tick(e.currentPosition / 1000)); w.bind(SC.Widget.Events.PAUSE, () => { last = null; report(true); }); });
    } else if (k === 'db' || k === 'au') {
      let src = r.url;
      if (k === 'db') src = r.url.replace(/([?&])dl=\d/, '$1raw=1') + (/[?&](raw|dl)=/.test(r.url) ? '' : (r.url.includes('?') ? '&' : '?') + 'raw=1');
      box.innerHTML = `<audio controls preload="none" src="${esc(src)}"></audio>`;
      const a = box.querySelector('audio'); a.addEventListener('timeupdate', () => { if (!a.paused) tick(a.currentTime); }); a.addEventListener('pause', () => { last = null; report(true); }); a.addEventListener('seeking', () => { last = null; });
    } else {
      box.innerHTML = `<p class="small">This link can't be played here, so the answer can't unlock. <a href="${esc(/^https:\/\//.test(r.url) ? r.url : '#')}" target="_blank" rel="noopener">Open it</a> and email RRR so we can ask the artist for a playable link.</p>`;
    }
    window.addEventListener('pagehide', () => report(true));
  }
  function rows(){
    const t = data.todo;
    const pick = { all: t, urgent: t.filter(r => (new Date(r.due) - Date.now()) < 48 * 3600000), listen: t.filter(r => !r.listened), complete: t.filter(r => r.listened), done: data.done }[filter];
    if (!pick.length) { listEl.innerHTML = '<div class="panel empty"><b>Nothing here.</b><span>' + (filter === 'done' ? 'Answered tracks appear here.' : 'All caught up. New tracks arrive by email.') + '</span></div>'; return; }
    listEl.innerHTML = pick.map(r => `<article class="panel cqitem" data-id="${esc(r.id)}">
      <div class="cqhead"><div><b>${esc(r.title)}</b><span class="small">${esc(r.artist)} · ${esc(r.genre)}</span></div>
        <span class="cqstate ${r.status !== 'open' ? 's-' + esc(r.status) : r.listened ? 'listened' : 'tolisten'}">${r.status === 'answered' ? (r.decision === 'accepted' ? 'Accepted' : 'Declined') : r.status === 'expired' ? 'Expired' : r.listened ? 'To complete' : 'To listen'}</span>
        <span class="small due ${(new Date(r.due) - Date.now()) < 48 * 3600000 && r.status === 'open' ? 'urgent' : ''}">${r.status === 'open' ? 'Expires ' + esc(left(r.due)) : esc(fmt(r.answered || r.due))}</span></div>
      ${r.message ? `<p class="small cqmsg">“${esc(r.message)}”</p>` : ''}
      ${r.artistLinks ? `<p class="small">Artist links: ${linkify(r.artistLinks)}</p>` : ''}
      ${r.status === 'open' ? `<div class="cqplayer" data-player></div><p class="small" data-lsn></p><div class="listenbar"><i></i></div>
      <form class="cqform" novalidate aria-disabled="true">
        <div class="radios"><label><input type="radio" name="decision" value="accepted" required> Accept</label><label><input type="radio" name="decision" value="declined"> Decline</label></div>
        <div class="accfields" hidden>
          <label>When will it play?<input name="play_time" type="text" placeholder="e.g. The Bandcamp Hour, Sun 18 Oct, 21:00"></label>
          <label>Where?<input name="where" type="text" placeholder="Show, playlist, channel or post"></label>
          <label>Links (optional now, you can add them after it plays)<input name="links" type="text" placeholder="https://"></label>
        </div>
        <label><span data-fbl>Your feedback</span> <span class="small" data-wc>0 / ${minWords} words</span><textarea name="feedback" required placeholder="What works, what you'd change, and why"></textarea></label>
        <button class="btn primary" type="submit">Send answer</button></form>`
      : `${r.decision === 'accepted' ? `<p class="small"><b>When:</b> ${esc(r.playTime)} · <b>Where:</b> ${esc(r.where)}</p>` : ''}${r.feedback ? `<p class="small cqfb">${esc(r.feedback)}</p>` : ''}
        ${r.decision === 'accepted' ? (r.links ? `<p class="small"><b>Links:</b> ${linkify(r.links)}</p>` : `<form class="cqlinks"><label>Add the link to the play or post<input name="links" type="url" required placeholder="https://"></label><button class="btn ghost" type="submit">Send link to the artist</button></form>`) : ''}`}
    </article>`).join('');
    $$('.cqitem').forEach(card => {
      const id = card.dataset.id, r = data.todo.find(x => x.id === id) || data.done.find(x => x.id === id);
      const lf = card.querySelector('.cqlinks');
      if (lf) lf.addEventListener('submit', async e => { e.preventDefault(); if (!lf.checkValidity()) { lf.reportValidity(); return; }
        try { await post(new URLSearchParams({ form: 'submit-links', key, review_id: id, links: lf.links.value.trim() })); r.links = lf.links.value.trim(); rows(); say(true, '<strong>Sent ✓</strong> The artist has the link.'); } catch (err) { say(false, '<strong>That didn\'t send.</strong> Try again.'); } });
      const fm = card.querySelector('.cqform'); if (!fm) return;
      mountPlayer(card, r);
      const ta = fm.feedback, wc = fm.querySelector('[data-wc]'), acc = fm.querySelector('.accfields'), fbl = fm.querySelector('[data-fbl]');
      fm.querySelectorAll('input[name=decision]').forEach(x => x.addEventListener('change', () => { const a = x.value === 'accepted' && x.checked;
        acc.hidden = !a; fm.play_time.required = a; fm.where.required = a; fbl.textContent = a ? 'Why you picked it' : 'Your feedback'; }));
      ta.addEventListener('input', () => { const n = words(ta.value); wc.textContent = `${n} / ${minWords} words`; wc.classList.toggle('ok', n >= minWords); });
      fm.addEventListener('submit', async e => {
        e.preventDefault();
        if (!r.listened) { say(false, `Play at least ${need} seconds first.`); return; }
        ta.setCustomValidity(words(ta.value) < minWords ? `Please write at least ${minWords} words` : '');
        if (!fm.checkValidity()) { fm.reportValidity(); return; }
        const dec = fm.querySelector('input[name=decision]:checked').value;
        const extra = dec === 'accepted' ? { play_time: fm.play_time.value.trim(), where: fm.where.value.trim(), links: fm.links.value.trim() } : {};
        try {
          await post(new URLSearchParams(Object.assign({ form: 'submit-feedback', key, review_id: id, feedback: ta.value.trim(), decision: dec }, extra)));
          data.todo = data.todo.filter(x => x.id !== id); data.done.unshift(Object.assign({}, r, { status: 'answered', decision: dec, feedback: ta.value.trim(), answered: new Date(), playTime: extra.play_time, where: extra.where, links: extra.links }));
          data.stats.answers++; data.stats.thisMonth++;
          stats(); rows(); say(true, `<strong>Sent ✓</strong> ${esc(r.artist)} gets your answer by email.`); if (window.rrrChime) window.rrrChime();
        } catch (err) { say(false, '<strong>That didn\'t send.</strong> Try again.'); }
      });
    });
  }
  $$('.subtabs [role=tab]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; $$('.subtabs [role=tab]').forEach(x => x.setAttribute('aria-selected', String(x === b))); if (data) rows(); }));
  if (!key || !url) { $('#cu-stats').innerHTML = '<span class="small">This page needs your private curator link.</span>'; return; }
  fetch(url + (url.includes('?') ? '&' : '?') + 'queue=' + encodeURIComponent(key)).then(r => r.json()).then(j => {
    if (!j.ok) { $('#cu-stats').innerHTML = '<span class="small">This link isn\'t valid. Ask RRR for a new one.</span>'; return; }
    data = j; minWords = Number(j.minWords) || Number(($('[data-minwords]') || {}).textContent) || 20; need = Number(j.listenSeconds) || 30; stats(); rows();
  }).catch(() => { $('#cu-stats').innerHTML = '<span class="small">Couldn\'t load your queue. Try again in a minute.</span>'; });
})();
