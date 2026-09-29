(function(){
  const L = window.RRR_LEVELS || { belts: [], points: [] };
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lad = document.getElementById('belt-ladder');
  if (lad) lad.innerHTML = L.belts.map(b => `
    <div class="belt${b.dan ? ' dan' : ''}">
      <div class="beltbar" style="--belt:${b.color}">${b.dan ? `<i class="stripes">${'<em></em>'.repeat(b.dan)}</i>` : ''}</div>
      <div class="beltname"><b>${esc(b.name)}</b><span class="num">${b.min.toLocaleString('en-GB')} pts</span></div>
    </div>`).join('');
  const pt = document.getElementById('points-table');
  if (pt) pt.innerHTML = L.points.map(g => `
    <h3 class="subhead">${esc(g.group)}</h3>
    <div class="panel tablewrap"><table class="ptable"><tbody>${g.items.map(i => `
      <tr><td>${esc(i.action)}${i.cap ? `<small class="cap">${esc(i.cap)}</small>` : ''}</td><td class="num pts">+${esc(i.pts)}</td><td><b class="${i.how === 'auto' ? 'tagauto' : 'tagcheck'}">${i.how === 'auto' ? 'Auto' : 'Checked'}</b></td></tr>`).join('')}
    </tbody></table></div>`).join('');

  /* ---------- claim "Checked" points ---------- */
  const C = window.RRR_CONFIG || {}, form = document.getElementById('claim-form');
  if (form) {
    const sel = document.getElementById('cl-action'), st = document.getElementById('claim-status');
    const checked = [].concat(...L.points.map(g => g.items)).filter(i => i.how !== 'auto' && i.key);
    sel.innerHTML = '<option value="">Choose…</option>' + checked.map(i => `<option value="${esc(i.key)}">${esc(i.action)} (+${esc(i.pts)})</option>`).join('');
    let beta = false; try { beta = !!C.betaKey && localStorage.getItem('rrr-beta') === C.betaKey; } catch (e) {}
    const endpoint = C.automationUrl || '', open = !!(endpoint && (C.signupOpen || beta));
    document.getElementById('claim-fields').disabled = !open;
    st.classList.toggle('open', open);
    st.innerHTML = `<span class="dot"></span><span>${open ? '<strong>Claims are open.</strong> We check each one, usually within a few days.' : '<strong>Coming soon.</strong> Claims open when membership launches.'}</span>`;
    try { const saved = localStorage.getItem('rrr-member-id'); if (saved) document.getElementById('cl-id').value = saved; } catch (e) {}
    const q = new URLSearchParams(location.search); if (q.get('id')) document.getElementById('cl-id').value = q.get('id');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!open) return;
      const idEl = document.getElementById('cl-id'); idEl.value = idEl.value.trim().toUpperCase();
      idEl.setCustomValidity(/^RRR-[A-Z0-9]{4,8}$/.test(idEl.value) ? '' : 'Your member ID looks like RRR-7KX2P');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = new URLSearchParams(); new FormData(form).forEach((v, k) => data.append(k, v)); data.append('form', 'claim');
      try {
        await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data });
        st.classList.add('open');
        st.innerHTML = '<span class="dot"></span><span><strong>Claim sent.</strong> Once RRR checks it, the points land on your dashboard and you get an email. 🥋</span>';
        const keep = idEl.value; form.reset(); idEl.value = keep;
      } catch (err) {
        st.classList.remove('open');
        st.innerHTML = `<span class="dot"></span><span><strong>That didn't send.</strong> Check your connection and try again, or email ${esc(C.email)}.</span>`;
      }
    });
  }
})();
