/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* RRR Series page: selected releases by series, eligibility check, submission form.
   Membership and release affiliation are separate: only approved releases get RRR branding. */
(function(){
  const C = window.RRR_CONFIG || {};
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = C.automationUrl || '';
  let SERIES = C.series || [];
  const fmt = d => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const colorOf = name => (SERIES.find(s => s.name === name) || {}).color || '#9B5CFF';
  const safeUrl = u => /^https:\/\//i.test(String(u || '')) ? u : '';

  /* ---------- A. selected releases ---------- */
  let releases = [], filter = 'all';
  function chips(){
    const box = $('#series-chips'); if (!box) return;
    box.innerHTML = [`<button type="button" role="tab" data-s="all" aria-selected="${filter === 'all'}">All series</button>`]
      .concat(SERIES.map(s => `<button type="button" role="tab" data-s="${esc(s.name)}" aria-selected="${filter === s.name}" style="--sc:${esc(s.color)}" title="${esc(s.about || '')}">${esc(s.name)}</button>`)).join('');
    $$('#series-chips button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.s; chips(); grid(); }));
  }
  function badge(r){
    return r.affiliation === 'RRR Signed Release'
      ? `<span class="selbadge" style="--sc:#FFD66B"><b>RRR</b> Signed Release</span>`
      : `<span class="selbadge" style="--sc:${esc(colorOf(r.series))}"><b>${esc(r.series)}</b> Selected Release</span>`;
  }
  function grid(){
    const box = $('#sel-grid'); if (!box) return;
    const list = releases.filter(r => filter === 'all' || r.series === filter);
    if (!list.length) {
      const s = SERIES.find(x => x.name === filter);
      box.innerHTML = `<div class="panel empty"><b>${filter === 'all' ? 'The first selected releases are coming soon.' : esc(filter) + ': first selections coming soon.'}</b><span>${s ? esc(s.about) + '. ' : ''}Are you an artist member? <a href="#submit">Submit a release</a>.</span></div>`;
      return;
    }
    box.innerHTML = list.map(r => `
      <article class="panel selcard${r.featured ? ' featured' : ''}">
        ${r.artwork ? `<img src="${esc(safeUrl(r.artwork))}" alt="" loading="lazy">` : `<div class="noart">${esc(r.catalogue)}</div>`}
        <div class="selbody">
          ${badge(r)}
          <h3>${esc(r.title)}</h3>
          <p class="by">${esc(r.artist)}</p>
          <p class="small">${esc(r.catalogue)} · ${esc([r.genre, r.subgenre].filter(Boolean).join(' / '))}${r.date ? ' · ' + esc(fmt(r.date)) : ''} · <span class="pill">${esc(r.status || '')}</span></p>
          ${r.description ? `<p class="small desc">${esc(r.description)}</p>` : ''}
          <p class="links">${safeUrl(r.url) ? `<a class="btn primary small-btn" href="${esc(r.url)}" target="_blank" rel="noopener">Bandcamp</a>` : ''}${safeUrl(r.spotify) ? `<a href="${esc(r.spotify)}" target="_blank" rel="noopener">Spotify</a>` : ''}${safeUrl(r.youtube) ? `<a href="${esc(r.youtube)}" target="_blank" rel="noopener">YouTube</a>` : ''}</p>
        </div>
      </article>`).join('');
  }
  chips();
  if (url) {
    fetch(url + (url.includes('?') ? '&' : '?') + 'series=1').then(r => r.json()).then(d => {
      if (d && d.ok) {
        // Series names/prefixes come from the automation; colours and descriptions from the site settings
        if (Array.isArray(d.series) && d.series.length) SERIES = d.series.map(s => Object.assign({}, (C.series || []).find(x => x.name === s.name) || { color: '#9B5CFF', about: '' }, s));
        releases = d.releases || [];
      }
      chips(); grid(); fillSeriesSelect();
    }).catch(() => grid());
  } else grid();

  /* ---------- C. eligibility check + submission ---------- */
  let beta = false; try { beta = !!C.betaKey && localStorage.getItem('rrr-beta') === C.betaKey; } catch (e) {}
  const formsOpen = !!(url && (C.signupOpen || C.bookingOpen || beta));
  const form = $('#sel-form'), st = $('#sel-status');
  function fillSeriesSelect(){
    const sel = $('#sf-series'); if (!sel) return;
    sel.innerHTML = '<option value="">Not sure, RRR decides</option>' + SERIES.map(s => `<option value="${esc(s.name)}">${esc(s.name)}${s.about ? ' – ' + esc(s.about) : ''}</option>`).join('');
  }
  fillSeriesSelect();

  const yesno = (ok, yes, no) => `<b class="${ok ? 'ok' : 'no'}">${ok ? yes : no}</b>`;
  function showStatus(m, demo){
    const linked = !!m.bandcampLinked, active = !!m.membershipActive, artist = m.type === 'artist';
    const eligible = artist && active && linked;
    const mail = `mailto:${encodeURIComponent(C.email || '')}?subject=${encodeURIComponent('Link my Bandcamp to RRR (' + (m.id || '') + ')')}&body=${encodeURIComponent('Hi RRR, please send a label invite to my Bandcamp page: \n\nMember ID: ' + (m.id || '') + '\nBandcamp page: ')}`;
    st.innerHTML = `
      ${demo ? '<p class="prov"><span>Example</span> This is what a linked artist sees.</p>' : ''}
      <div class="statusgrid">
        <div class="panel"><span class="label">RRR membership</span>${yesno(active, 'Active', 'Inactive')}</div>
        <div class="panel"><span class="label">Bandcamp linked</span>${yesno(linked, 'Yes', 'No')}</div>
        <div class="panel"><span class="label">Artist type</span><b>${esc(artist ? (m.artistType || 'Member') : 'Fan')}</b></div>
        <div class="panel"><span class="label">Eligible for RRR release</span>${yesno(eligible, 'Yes', 'No')}</div>
      </div>
      ${!artist ? `<div class="panel empty"><b>Selected Releases are for artist members.</b><span>You're a fan member. <a href="index.html#join">Join as an artist</a> to submit releases.</span></div>` : ''}
      ${artist && !active ? `<div class="panel empty"><b>Your membership isn't active.</b><span>Set up or restart your monthly membership, then check again.</span></div>` : ''}
      ${artist && active && !linked ? `<div class="panel linkbox"><b>Link your Bandcamp first</b>
        <p>To release through RetroReverbRecords while receiving your Bandcamp payments directly, your Bandcamp artist account must first be linked to the RRR Bandcamp label account.</p>
        <ol><li>Choose <a href="#linking">password linking (recommended) or a Bandcamp invite</a>.</li><li>Send us your Bandcamp page and your choice: <a class="btn ghost small-btn" href="${mail}">Email RRR</a> (never put a password in an email).</li><li>We link your page and mark you as linked, usually within a few days.</li></ol>
        <p class="small">Linking is non-exclusive: you can still release independently and with other labels. Linked artists also get free Bandcamp VIP membership.</p></div>` : ''}`;
    // Anyone who is an artist member can add independent / other-label releases to their profile; RRR submissions need eligibility
    form.hidden = !artist;
    const rrrRadio = form.querySelector('input[name=intent][value=rrr]'), logRadio = form.querySelector('input[name=intent][value=log]');
    rrrRadio.disabled = !eligible;
    if (!eligible) logRadio.checked = true;
    form.dataset.member = m.id || '';
    if (m.name && !$('#sf-artist').value) $('#sf-artist').value = m.name;
    mode(); openState(demo);
  }
  function openState(demo){
    const open = formsOpen && !demo;
    $('#sel-fields').disabled = !open;
    const fs = $('#sel-form-status');
    fs.classList.toggle('open', open);
    fs.innerHTML = `<span class="dot"></span><span>${open ? '<strong>Submissions are open.</strong> RRR reviews every RRR submission by hand.' : demo ? '<strong>Example only.</strong> Use your own member ID to submit.' : '<strong>Coming soon.</strong> Submissions open when membership launches.'}</span>`;
  }
  function mode(){
    const rrr = form.querySelector('input[name=intent]:checked').value === 'rrr';
    $$('#sel-form .rrr-only').forEach(el => { el.hidden = !rrr; el.querySelectorAll('input,textarea,select').forEach(i => { if (i.id === 'sf-ok' || i.id === 'sf-why') i.required = rrr; }); });
    $$('#sel-form .log-only').forEach(el => el.hidden = rrr);
    $('#sf-btn').textContent = rrr ? 'Submit for review' : 'Add to my profile';
  }
  if (form) {
    $$('#sel-form input[name=intent]').forEach(r => r.addEventListener('change', mode));
    // AI-generated can't go to Bandcamp (Bandcamp AI policy, Jan 2026)
    $$('#sel-form input[name=ai_use]').forEach(r => r.addEventListener('change', () => {
      const heavy = form.querySelector('input[name=ai_use]:checked').value === 'heavy';
      form.querySelector('.heavy-note').hidden = !heavy;
      $('#sf-btn').disabled = heavy && form.querySelector('input[name=intent]:checked').value === 'rrr';
    }));
    const saved = (() => { try { return localStorage.getItem('rrr-member-id') || ''; } catch (e) { return ''; } })();
    const q = new URLSearchParams(location.search);
    if (q.get('id') || saved) $('#sel-id').value = (q.get('id') || saved).toUpperCase();

    $('#sel-lookup').addEventListener('submit', e => {
      e.preventDefault();
      const id = $('#sel-id').value.trim().toUpperCase();
      if (!id) return;
      if (id === 'DEMO') return showStatus({ id: 'DEMO', name: 'Demo Artist', type: 'artist', membershipActive: true, bandcampLinked: true, artistType: 'Member' }, true);
      if (!url) { st.innerHTML = '<div class="panel empty"><b>Checking isn\'t switched on yet.</b><span>Try the example: type DEMO.</span></div>'; return; }
      st.innerHTML = '<div class="panel empty"><b>Checking…</b></div>';
      fetch(url + (url.includes('?') ? '&' : '?') + 'member=' + encodeURIComponent(id)).then(r => r.json()).then(d => {
        if (!d.ok) { form.hidden = true; st.innerHTML = `<div class="panel empty"><b>We can't find that member ID.</b><span>It looks like RRR-7KX2P. Not a member yet? <a href="index.html#join">Join here</a>.</span></div>`; return; }
        try { localStorage.setItem('rrr-member-id', id); } catch (e2) {}
        showStatus(d.member, false);
      }).catch(() => { st.innerHTML = `<div class="panel empty"><b>That didn't load.</b><span>Check your connection and try again, or email ${esc(C.email)}.</span></div>`; });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if ($('#sel-fields').disabled) return;
      const bc = $('#sf-bc');
      bc.setCustomValidity(/^https:\/\/[a-z0-9-]+\.bandcamp\.com\//i.test(bc.value.trim()) ? '' : 'Use the full Bandcamp link, e.g. https://yourname.bandcamp.com/album/...');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = new URLSearchParams(); new FormData(form).forEach((v, k) => data.append(k, v));
      data.append('form', 'rrr-release'); data.append('member_id', form.dataset.member || '');
      const fs = $('#sel-form-status'), rrr = data.get('intent') === 'rrr';
      const btn = $('#sf-btn'); btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending…';
      fs.classList.add('open'); fs.innerHTML = '<span class="dot"></span><span>Sending to RRR…</span>';
      try {
        // Wait for RRR's answer, so "Submitted" only shows once it has really arrived
        const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 30000);
        const res = await fetch(url, { method: 'POST', body: data, signal: ctl.signal }); clearTimeout(timer);
        const answer = (await res.text()).trim();
        if (/^refused/i.test(answer)) throw new Error(answer.replace(/^refused:\s*/i, ''));
        if (!/^ok/i.test(answer)) throw new Error('');
        fs.innerHTML = `<span class="dot"></span><span>${rrr ? '<strong>Submitted ✓</strong> RRR has it. We review it and email you the decision. Only this release is affected.' : '<strong>Added ✓</strong> It shows on your dashboard as ' + esc(data.get('affiliation') || 'Independent') + '.'}</span>`;
        if (window.rrrChime) window.rrrChime();
        form.reset(); mode(); window.scrollTo({ top: form.offsetTop - 120, behavior: 'smooth' });
      } catch (err) {
        const why = err && err.message && err.name !== 'AbortError' ? esc(err.message) + '. ' : '';
        fs.innerHTML = `<span class="dot"></span><span><strong>That didn't arrive.</strong> ${why}Nothing was sent, so try again, or email ${esc(C.email)}.</span>`;
      } finally { btn.disabled = false; btn.textContent = label; }
    });
  }

  /* ---------- Link my Bandcamp (placeholder password or invite) ---------- */
  const lf = $('#link-form');
  if (lf) {
    const ls = $('#link-status'), lid = $('#lf-id');
    const q = new URLSearchParams(location.search);
    try { lid.value = (q.get('id') || localStorage.getItem('rrr-member-id') || '').toUpperCase(); } catch (e) { lid.value = (q.get('id') || '').toUpperCase(); }
    const say = (ok, html) => { ls.classList.toggle('open', ok); ls.innerHTML = `<span class="dot"></span><span>${html}</span>`; };
    if (!formsOpen) { $('#link-fields').disabled = true; say(false, '<strong>Coming soon.</strong> Linking requests open when RRR membership launches.'); }
    lf.addEventListener('submit', async e => {
      e.preventDefault();
      if (!formsOpen) return;
      lid.value = lid.value.trim().toUpperCase();
      lid.setCustomValidity(/^RRR-[A-Z0-9]{4,8}$/.test(lid.value) ? '' : 'Your member ID looks like RRR-7KX2P');
      if (!lf.checkValidity()) { lf.reportValidity(); return; }
      const data = new URLSearchParams(); new FormData(lf).forEach((v, k) => data.append(k, v)); data.append('form', 'link-request');
      const method = (lf.querySelector('input[name=method]:checked') || {}).value;
      try {
        await Promise.race([fetch(url, { method: 'POST', mode: 'no-cors', body: data, keepalive: true }), new Promise(r => setTimeout(r, 350))]);
        say(true, method === 'invite'
          ? '<strong>Done ✓</strong> We\'ll send you a Bandcamp invite within a day. Watch for an email from Bandcamp and press accept.'
          : '<strong>Check your email ✓</strong> We\'ve sent your placeholder password and the next steps to the address on your membership. Not there in a few minutes? Check spam.');
        $('#link-fields').disabled = true;
        if (window.rrrChime) window.rrrChime();
        try { ls.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      } catch (err) { say(false, `<strong>That didn't send.</strong> Try again, or email ${esc(C.email)}.`); }
    });
  }
})();
