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
})();
