/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* Owner HQ: hq.html?k=<owner key>. Numbers come from the sheet; only the owner's key works. */
(function(){
  const C = window.RRR_CONFIG || {}, url = C.automationUrl || '';
  const $ = s => document.querySelector(s);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const qs = new URLSearchParams(location.search);
  let key = qs.get('k') || '';
  try { if (key) localStorage.setItem('rrr-hq', key); else key = localStorage.getItem('rrr-hq') || ''; } catch (e) {}
  const hello = $('#hq-hello');
  const fmt = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const eur = n => '€' + Number(n || 0).toFixed(2);
  const tile = (label, val, note) => `<div class="panel tile"><span class="label">${esc(label)}</span><b class="num">${esc(val)}</b>${note ? `<span class="small">${esc(note)}</span>` : ''}</div>`;
  if (!key || !url) { hello.textContent = 'This page needs your private owner link.'; return; }
  fetch(url + (url.includes('?') ? '&' : '?') + 'hq=' + encodeURIComponent(key)).then(r => r.json()).then(d => {
    if (!d.ok) { hello.textContent = 'This link is not allowed. Only the owner key opens RRR HQ.'; try { localStorage.removeItem('rrr-hq'); } catch (e) {} return; }
    const m = d.members, mo = d.money, t = d.todo;
    hello.textContent = 'Welcome back, Sifu. Here is RRR right now.';
    $('#hq-mod').href = 'mod.html?k=' + encodeURIComponent(key);
    $('#hq-members').innerHTML = [
      tile('Active members', m.active, `${m.artists} artists · ${m.fans} fans`),
      tile('New this week', m.new7, `${m.new30} in 30 days`),
      tile('Waiting to pay', m.pendingPayment, 'signed up, not paid yet'),
      tile('Paused (Supporter)', m.paused),
      tile('Payment problems', m.paymentProblems, `${m.cancelled} cancelled`),
      tile('Bandcamp linked', m.linked, 'artists'),
      tile('Newsletter', d.newsletter, 'subscribers'),
      tile('Warnings', m.warned, `${m.suspended} suspended · ${m.removed} removed`),
      tile('All-time sign-ups', m.total, `${m.demo} demo accounts not counted`)
    ].join('');
    $('#hq-money').innerHTML = [
      tile('Membership per month', eur(mo.monthlyMembership), 'before PayPal fees'),
      tile('Received this month', eur(mo.receivedThisMonth), `${mo.paymentsThisMonth} payments`),
      tile('Paid bookings this month', mo.bookingsPaidThisMonth),
      d.submit ? tile('RRR Submit (30 days)', d.submit.submissions30, `${d.submit.curators} curators`) : ''
    ].join('');
    $('#hq-todo').innerHTML = [
      tile('Releases to review', t.releasesToReview), tile('Claims to check', t.claimsToCheck), tile('Bandcamp links', t.linksWaiting),
      tile('AI disputes', t.disputesOpen), tile('New feedback', t.feedbackNew), tile('Press to approve', t.pressToApprove),
      tile('Withdrawals', t.withdrawals), tile('Bookings unpaid', t.awaitingPayment)
    ].join('');
    const belts = Object.entries(d.belts || {}), top = Math.max(1, ...belts.map(b => b[1]));
    $('#hq-belts').innerHTML = belts.length ? belts.map(([b, n]) => `<div class="hqbar"><span>${esc(b)}</span><i style="width:${Math.round(n / top * 100)}%"></i><b class="num">${n}</b></div>`).join('') : '<p class="small">No members yet.</p>';
    $('#hq-latest').innerHTML = (d.latest || []).map(x => `<li class="panel"><div><b>${esc(x.name)}</b><span class="small">${esc(x.id)} · ${esc(x.type)} · ${esc(x.status)} · ${esc(fmt(x.since))}</span></div><em class="num pts">${x.points}</em></li>`).join('') || '<li class="small">No members yet.</li>';
    $('#hq-upcoming').innerHTML = (d.upcoming || []).map(b => `<tr><td>${esc(fmt(b.date))}</td><td class="small">${esc(b.kind)}</td><td><b>${esc(b.artist)}</b><br><span class="small">${esc(b.title)}</span></td><td class="small">${esc(b.status)}${b.uploaded ? ' · uploaded' : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="small">Nothing booked in the next 30 days.</td></tr>';
    $('#hq-updated').textContent = 'Live from the sheet, ' + new Date(d.updated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    $('#hq-body').hidden = false;
  }).catch(() => { hello.textContent = 'Could not reach the RRR automation. Try again in a minute.'; });
})();
