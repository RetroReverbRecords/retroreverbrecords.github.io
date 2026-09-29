/* Synth Stars card checker and card maker. Uses RRR_CARDS from cards.js. */
(function(){
  const K = window.RRR_CARDS || {seasons:{},roster:{},editions:{},issued:[]};
  const $ = s => document.querySelector(s);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s || '').trim().toUpperCase().replace(/\s+/g, '');

  async function fingerprint(serial, code){
    const data = new TextEncoder().encode('RRR|' + norm(serial) + '|' + norm(code));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function parse(serial){
    const m = norm(serial).match(/^([A-Z0-9]+)-(\d{2})-([A-Z])-(\d{4})$/);
    return m ? { season: m[1], card: m[2], edition: m[3], copy: m[4] } : null;
  }

  /* ---------- checker ---------- */
  const form = $('#verify-form');
  if (form) {
    const out = $('#verify-result');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const serial = norm($('#v-serial').value), code = norm($('#v-code').value);
      const p = parse(serial);
      if (!p) { show('bad', 'Check the serial', 'Serials look like <b>S1-01-P-0007</b>: season, card number, edition letter, copy number.'); return; }
      if (!code) { show('bad', 'Add the check code', 'The check code is under the holographic sticker on the back of the card.'); return; }
      const entry = (K.issued || []).find(i => norm(i.serial) === serial);
      let ok = false;
      if (entry) { try { ok = (await fingerprint(serial, code)) === entry.hash; } catch (err) { show('bad', 'This browser can\'t run the check', 'Try another browser, or email us the serial.'); return; } }
      if (!entry || !ok) {
        show('bad', 'Not an official card', 'We can\'t match this serial and code. Check for typos. If it still fails, the card may be a copy: email us a photo of both sides.');
        return;
      }
      const season = (K.seasons || {})[p.season] || { name: p.season === 'DEMO' ? 'Demo' : p.season, size: 52 };
      const slot = ((K.roster || {})[p.season] || {})[p.card] || ((K.roster || {}).S1 || {})[p.card] || {};
      const edition = (K.editions || {})[p.edition] || p.edition;
      const copyTxt = entry.of ? `Copy ${parseInt(p.copy, 10)} of ${entry.of}` : `Copy ${parseInt(p.copy, 10)}`;
      show('good', entry.demo ? 'Genuine (demo card)' : 'Genuine RRR card',
        `<dl class="vfacts">
          <div><dt>Card</dt><dd>${esc(season.name)} · ${esc(p.card)} of ${esc(season.size)}</dd></div>
          ${slot.artist ? `<div><dt>Artist</dt><dd>${esc(slot.artist)}${slot.style ? ' · ' + esc(slot.style) : ''}</dd></div>` : ''}
          <div><dt>Edition</dt><dd>${esc(edition)}</dd></div>
          <div><dt>Copy</dt><dd class="num">${esc(copyTxt)}</dd></div>
          ${entry.issuedOn ? `<div><dt>Issued</dt><dd class="num">${esc(new Date(entry.issuedOn + 'T12:00:00').toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'}))}</dd></div>` : ''}
        </dl>${entry.demo ? '<p class="small">This is the demo entry for trying the checker. It will be removed at launch.</p>' : ''}`);
    });
    function show(kind, title, body){
      out.hidden = false;
      out.className = 'panel vresult ' + kind;
      out.innerHTML = `<p class="vtitle"><span class="dot"></span>${esc(title)}</p><div>${body}</div>`;
    }
  }

  /* ---------- season roster ---------- */
  const grid = $('#roster');
  if (grid) {
    const sKey = grid.dataset.season || 'S1';
    const season = (K.seasons || {})[sKey] || { size: 52 };
    const roster = (K.roster || {})[sKey] || {};
    let html = '';
    for (let n = 1; n <= season.size; n++) {
      const id = String(n).padStart(2, '0'), a = roster[id];
      html += a
        ? `<figure class="slot filled">${a.image ? `<img src="${esc(a.image)}" alt="${esc(a.artist)} card" loading="lazy">` : ''}<figcaption><span class="num">${id}</span> ${esc(a.artist)}</figcaption></figure>`
        : `<figure class="slot"><div class="blank"><span>?</span></div><figcaption><span class="num">${id}</span> To be revealed</figcaption></figure>`;
    }
    grid.innerHTML = html;
    const count = $('#roster-count'); if (count) count.textContent = `${Object.keys(roster).length} of ${season.size} revealed`;
  }

  /* ---------- card maker (owner tool) ---------- */
  const maker = $('#maker');
  if (maker) {
    const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
    const rand = n => { const a = new Uint32Array(n); crypto.getRandomValues(a); return Array.from(a, x => ALPH[x % ALPH.length]).join(''); };
    maker.addEventListener('submit', async e => {
      e.preventDefault();
      const season = norm($('#m-season').value) || 'S1';
      const card = String(parseInt($('#m-card').value, 10) || 1).padStart(2, '0');
      const ed = $('#m-edition').value;
      const from = parseInt($('#m-from').value, 10) || 1;
      const count = Math.min(parseInt($('#m-count').value, 10) || 1, 500);
      const of = parseInt($('#m-of').value, 10) || '';
      const today = new Date().toISOString().slice(0, 10);
      const rows = [], lines = [];
      for (let i = 0; i < count; i++) {
        const serial = `${season}-${card}-${ed}-${String(from + i).padStart(4, '0')}`;
        const code = rand(4) + '-' + rand(4);
        const hash = await fingerprint(serial, code);
        rows.push(`${serial},${code}`);
        lines.push(`    { serial: "${serial}", hash: "${hash}", of: ${of || 'null'}, issuedOn: "${today}" },`);
      }
      $('#m-print').value = 'serial,check_code\n' + rows.join('\n');
      $('#m-register').value = lines.join('\n');
      $('#m-out').hidden = false;
    });
    document.querySelectorAll('[data-copyfield]').forEach(b => b.addEventListener('click', () => {
      const t = document.getElementById(b.dataset.copyfield);
      const done = () => { b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1500); };
      try { navigator.clipboard.writeText(t.value).then(done, () => { t.select(); b.textContent = 'Selected'; }); } catch (err) { t.select(); b.textContent = 'Selected'; }
    }));
  }
})();
