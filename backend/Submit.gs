/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
// ============================================================
// RRR SUBMIT: radio, playlist and blog submissions (Groover-style curator marketplace)
// Add this as a SECOND script file in Apps Script (File + → Script → name it "Submit"),
// paste this in, save, then run submitSetup once.
//
// How it works
// 1. Artists pick curators on submit.html, pay SUBMIT.pricePerCurator per curator (PayPal, custom = SUB-XXXXXX).
// 2. Payment confirmed → one review per curator, due in SUBMIT.answerDays days; curators are emailed.
// 3. Curators listen on their private page (curator.html?k=…) and write feedback (≥ SUBMIT.minWords words).
//    The artist gets the feedback by email; the curator earns SUBMIT share of the price.
// 4. Not answered in time → the review expires, the artist is told, and you get a refund list in your daily email.
// 5. Promoters apply on submit.html#curators. Approve by setting status = active in the Curators tab
//    (instant: they are emailed their private link).
// 6. Payouts: RRR menu → Curator payouts list. Pay them by PayPal, then type paid in the Reviews "payout" column.
//
// Rule: artists pay for a listen and honest feedback, never for placement (Spotify forbids paid placement).
// ============================================================
const SUBMIT = {
  pricePerCurator: 1.00,   // € per curator (provisional, owner to confirm)
  curatorShare: 0.5,       // curator's share of the price (provisional; RRR's own curator keeps nothing aside)
  answerDays: 7,
  minWords: 20,
  maxCurators: 10
};
const SUB_TABS = {
  Curators:    ['curator_id','joined','name','type','genres','audience','link','about','email','key','share','status','member_id','notified'],
  Submissions: ['sub_id','created','artist','email','member_id','title','track_url','genre','message','curator_ids','amount','status','txn_id','paid_at'],
  Reviews:     ['review_id','sub_id','curator_id','curator_name','artist','email','title','track_url','genre','message','created','due','status','listened','decision','where','feedback','answered_at','earned','payout']
};

function subEnsure_() {
  Object.keys(SUB_TABS).forEach(name => {
    let sh = ss_().getSheetByName(name);
    const head = SUB_TABS[name];
    if (!sh) { sh = ss_().insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); return; }
    const have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    const missing = head.filter(k => have.indexOf(k) < 0);
    if (missing.length) { const c = have.filter(String).length + 1; sh.getRange(1, c, 1, missing.length).setValues([missing]).setFontWeight('bold'); }
  });
}
function subKey_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function subId_(prefix, tab, col) {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let id;
  do { id = prefix + Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join(''); } while (findRow_(tab, col, id));
  return id;
}
function money_(n) { return Math.round(Number(n || 0) * 100) / 100; }
function words_(t) { return String(t || '').trim().split(/\s+/).filter(Boolean).length; }

// Run once from the editor: creates the tabs and RRR as curator #1
function submitSetup() {
  subEnsure_();
  if (!rows_('Curators').length) {
    const key = subKey_();
    append_('Curators', { curator_id: 'CUR-001', joined: new Date(), name: 'Retro Reverb Records', type: 'Radio + playlist',
      genres: 'Synthwave, Retrowave, Darksynth, Electronic', audience: 'The Bandcamp Hour radio show + #synthfam Spotify playlist',
      link: 'https://linktr.ee/retroreverbrecords', about: 'Our weekly radio show and the RRR #synthfam playlist. Every track gets an honest listen.',
      email: SETTINGS.ownerEmail, key: key, share: 0, status: 'active', notified: new Date() });
    log_('submit setup', 'CUR-001 key ' + key);
    try { MailApp.sendEmail(SETTINGS.ownerEmail, 'RRR Submit: your curator page', 'Your private curator page (bookmark it):\n' + SETTINGS.siteUrl + 'curator.html?k=' + key); } catch (e) {}
  }
  try { SpreadsheetApp.getUi().alert('RRR Submit is ready. Your curator link was emailed to you. Add more curators in the Curators tab, or let promoters apply on submit.html.'); } catch (e) {}
}

// ---------- web: GET ----------
function submitGet_(q) {
  subEnsure_();
  if (q.curators) return json_({ ok: true, price: SUBMIT.pricePerCurator, answerDays: SUBMIT.answerDays, minWords: SUBMIT.minWords, maxCurators: SUBMIT.maxCurators,
    curators: rows_('Curators').filter(c => c.status === 'active').map(c => ({ id: c.curator_id, name: c.name, type: c.type, genres: c.genres, audience: c.audience, link: c.link, about: c.about })) });
  if (q.queue) return json_(curatorQueue_(q.queue));
  return json_({ ok: false });
}
function curatorByKey_(key) {
  if (!key || String(key).length < 20) return null;
  return rows_('Curators').find(c => c.key && c.key === key && c.status === 'active') || null;
}
function curatorQueue_(key) {
  const c = curatorByKey_(key); if (!c) return { ok: false, error: 'not allowed' };
  const mine = rows_('Reviews').filter(r => r.curator_id === c.curator_id && r.status !== 'awaiting payment');
  const monthAgo = Date.now() - 30 * 86400000, monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const answered = mine.filter(r => r.status === 'answered'), recent = mine.filter(r => /answered|expired/.test(r.status) && new Date(r.due).getTime() > monthAgo);
  const rate = recent.length ? Math.round(100 * recent.filter(r => r.status === 'answered').length / recent.length) : 100;
  const owed = money_(answered.filter(r => String(r.payout) !== 'paid').reduce((s, r) => s + Number(r.earned || 0), 0));
  const view = r => ({ id: r.review_id, artist: r.artist, title: r.title, url: r.track_url, genre: r.genre, message: r.message, created: r.created, due: r.due,
    status: r.status, listened: /^y/i.test(String(r.listened)), decision: r.decision, where: r.where, feedback: r.feedback, answered: r.answered_at, earned: r.earned });
  return { ok: true, curator: { id: c.curator_id, name: c.name, type: c.type },
    stats: { answers: answered.length, thisMonth: answered.filter(r => new Date(r.answered_at) >= monthStart).length, rate: rate, owed: owed },
    todo: mine.filter(r => r.status === 'open').sort((a, b) => new Date(a.due) - new Date(b.due)).map(view),
    done: mine.filter(r => r.status !== 'open').sort((a, b) => new Date(b.answered_at || b.due) - new Date(a.answered_at || a.due)).slice(0, 100).map(view) };
}

// ---------- web: POST ----------
function handleSubmitForm_(kind, p) {
  subEnsure_();
  if (kind === 'submit-track') return handleSubmitTrack_(p);
  if (kind === 'submit-feedback') return handleSubmitFeedback_(p);
  if (kind === 'submit-listened') { const c = curatorByKey_(p.key); if (c) { const r = findRow_('Reviews', 'review_id', p.review_id); if (r && r.curator_id === c.curator_id) updateRow_('Reviews', 'review_id', r.review_id, { listened: 'yes' }); } return text_('ok'); }
  if (kind === 'submit-curator-apply') return handleCuratorApply_(p);
  return text_('ok');
}
function handleSubmitTrack_(p) {
  const email = String(p.email || '').trim();
  const url = String(p.track_url || '').trim();
  if (!email || !/^https:\/\//i.test(url)) return text_('ok');
  const active = rows_('Curators').filter(c => c.status === 'active');
  const ids = String(p.curator_ids || '').split(',').map(s => s.trim().toUpperCase()).filter(id => active.some(c => c.curator_id === id)).slice(0, SUBMIT.maxCurators);
  if (!ids.length) return text_('ok');
  let subId = String(p.sub_id || '').toUpperCase();
  if (!/^SUB-[A-Z0-9]{6}$/.test(subId) || findRow_('Submissions', 'sub_id', subId)) subId = subId_('SUB-', 'Submissions', 'sub_id');
  const m = p.member_id ? findRow_('Members', 'member_id', String(p.member_id).toUpperCase()) : findRow_('Members', 'email', email);
  if (m && !inGoodStanding_(m)) { log_('submission refused: ' + standing_(m), email); return text_('ok'); }
  append_('Submissions', { sub_id: subId, created: new Date(), artist: String(p.artist || '').slice(0, 120), email: email, member_id: m ? m.member_id : '',
    title: String(p.title || '').slice(0, 160), track_url: url, genre: p.genre || '', message: String(p.message || '').slice(0, 800),
    curator_ids: ids.join(', '), amount: money_(ids.length * SUBMIT.pricePerCurator), status: 'awaiting payment' });
  if (isDemo_(email)) confirmSubmissionPayment_(subId, 'demo', 'DEMO');
  return text_('ok');
}
function confirmSubmissionPayment_(subId, amount, txnId) {
  subEnsure_();
  const s = findRow_('Submissions', 'sub_id', subId);
  if (!s) { notify_('Payment for an unknown submission: ' + subId, 'Check PayPal.\n' + sheetUrl_()); return; }
  if (/^(paid|demo)/.test(String(s.status))) return;
  const demo = txnId === 'DEMO';
  if (!demo && Number(amount) + 0.001 < Number(s.amount)) { notify_('Submission underpaid: ' + subId, 'Expected €' + s.amount + ', got €' + amount + '. Check PayPal.\n' + sheetUrl_()); return; }
  updateRow_('Submissions', 'sub_id', subId, { status: demo ? 'demo' : 'paid', txn_id: txnId || '', paid_at: new Date() });
  const due = new Date(Date.now() + SUBMIT.answerDays * 86400000);
  const curators = rows_('Curators');
  String(s.curator_ids).split(',').map(x => x.trim()).filter(Boolean).forEach(cid => {
    const c = curators.find(x => x.curator_id === cid); if (!c) return;
    append_('Reviews', { review_id: subId_('REV-', 'Reviews', 'review_id'), sub_id: subId, curator_id: cid, curator_name: c.name, artist: s.artist, email: s.email,
      title: s.title, track_url: s.track_url, genre: s.genre, message: s.message, created: new Date(), due: due, status: 'open', payout: Number(c.share) === 0 ? 'n/a' : '' });
    if (c.email) try { MailApp.sendEmail({ to: c.email, name: 'RRR Submit', subject: (demo ? '[DEMO] ' : '') + 'New track to review: ' + s.artist + ' – ' + s.title,
      body: 'A new track is waiting for you.\n\n' + s.artist + ' – ' + s.title + ' (' + (s.genre || 'no genre') + ')\n\nPlease answer by ' + due.toDateString() + '.\nYour queue: ' + SETTINGS.siteUrl + 'curator.html?k=' + c.key + '\n\nRRR Submit' }); } catch (e) { log_('curator email failed', String(e)); }
  });
  try { MailApp.sendEmail({ to: s.email, name: 'Retro Reverb Records', subject: (demo ? '[DEMO] ' : '') + 'Your track is with the curators: ' + s.title + ' (' + subId + ')',
    body: (demo ? 'DEMO: no payment taken.\n\n' : 'Payment received, thank you.\n\n') + '"' + s.title + '" is now with ' + String(s.curator_ids).split(',').length + ' curator(s). Each one listens and sends you honest feedback within ' + SUBMIT.answerDays + ' days. If a curator doesn\'t answer in time, you get that part of your payment back.\n\nYou pay for a listen and feedback, never for placement.\n\nRetro Reverb Records' }); } catch (e) { log_('submit artist email failed', String(e)); }
  notify_((demo ? '[DEMO] ' : '') + 'RRR Submit: ' + s.artist + ' – ' + s.title + ' (€' + s.amount + ')', 'Curators: ' + s.curator_ids + '\n' + sheetUrl_());
}
function handleSubmitFeedback_(p) {
  const c = curatorByKey_(p.key); if (!c) return text_('ok');
  const r = findRow_('Reviews', 'review_id', String(p.review_id || ''));
  if (!r || r.curator_id !== c.curator_id || r.status !== 'open') return text_('ok');
  const fb = String(p.feedback || '').trim().slice(0, 4000);
  if (words_(fb) < SUBMIT.minWords || !/^(accepted|declined)$/.test(String(p.decision))) return text_('ok');
  const share = c.share === '' || c.share === undefined ? SUBMIT.curatorShare : Number(c.share);
  updateRow_('Reviews', 'review_id', r.review_id, { status: 'answered', listened: 'yes', decision: p.decision, where: String(p.where || '').slice(0, 120), feedback: fb, answered_at: new Date(), earned: money_(SUBMIT.pricePerCurator * share) || ' ' });
  try { MailApp.sendEmail({ to: r.email, name: 'Retro Reverb Records', subject: (p.decision === 'accepted' ? '🎉 ' : '') + c.name + ' listened to "' + r.title + '"',
    body: c.name + ' (' + c.type + ') listened to your track and says:\n\n' + fb + '\n\nDecision: ' + (p.decision === 'accepted' ? 'ACCEPTED' + (p.where ? ' – ' + p.where : '') : 'not this time') +
      '\n\nThank you for sending your music.\nRetro Reverb Records · RRR Submit\n' + SETTINGS.siteUrl + 'submit.html' }); } catch (e) { log_('feedback email failed', String(e)); }
  return text_('ok');
}
function handleCuratorApply_(p) {
  const email = String(p.email || '').trim(); if (!email || !p.name) return text_('ok');
  const n = rows_('Curators').length + 1;
  append_('Curators', { curator_id: 'CUR-' + String(n).padStart(3, '0'), joined: new Date(), name: String(p.name).slice(0, 120), type: String(p.type || '').slice(0, 60),
    genres: String(p.genres || '').slice(0, 300), audience: String(p.audience || '').slice(0, 300), link: String(p.link || '').slice(0, 300), about: String(p.about || '').slice(0, 800),
    email: email, share: '', status: 'pending' });
  notify_('New curator application: ' + p.name + ' (' + (p.type || '') + ')', 'Audience: ' + (p.audience || '') + '\nLink: ' + (p.link || '') + '\n\nCheck they are real (no fake followers). To approve, set status = active in the Curators tab: they are emailed their private link straight away.\n' + sheetUrl_());
  try { MailApp.sendEmail({ to: email, name: 'RRR Submit', subject: 'Thanks for applying to curate on RRR Submit', body: 'Thanks! We check every curator by hand, usually within a few days. If you are approved, you will get an email with your private review page.\n\nRetro Reverb Records' }); } catch (e) {}
  return text_('ok');
}

// Approved curators (status → active) get their private link. Called by the instant on-edit trigger and daily.
function processCurators_() {
  subEnsure_();
  const sh = ss_().getSheetByName('Curators'), v = sh.getDataRange().getValues(), h = v[0], c = k => h.indexOf(k);
  for (let i = 1; i < v.length; i++) {
    if (v[i][c('status')] !== 'active' || v[i][c('notified')]) continue;
    let key = v[i][c('key')]; if (!key) { key = subKey_(); sh.getRange(i + 1, c('key') + 1).setValue(key); }
    sh.getRange(i + 1, c('notified') + 1).setValue(new Date());
    if (v[i][c('email')]) try { MailApp.sendEmail({ to: v[i][c('email')], name: 'RRR Submit', subject: 'You\'re approved as an RRR Submit curator',
      body: 'Welcome! Your private review page (bookmark it, don\'t share it):\n' + SETTINGS.siteUrl + 'curator.html?k=' + key +
        '\n\nHow it works: artists send you tracks. Listen, then write honest feedback (at least ' + SUBMIT.minWords + ' words) and accept or decline within ' + SUBMIT.answerDays + ' days.' +
        ' You earn €' + money_(SUBMIT.pricePerCurator * SUBMIT.curatorShare).toFixed(2) + ' per answered track, paid monthly by PayPal.' +
        '\n\nNever promise or sell placement: artists pay for a listen and feedback only.\n\nRetro Reverb Records' }); } catch (e) { log_('curator welcome failed', String(e)); }
  }
}
// Daily: expire unanswered reviews, tell artists, and send you the refund list
function submitDaily_() {
  subEnsure_();
  processCurators_();
  const sh = ss_().getSheetByName('Reviews'), v = sh.getDataRange().getValues(), h = v[0], c = k => h.indexOf(k);
  const refunds = [];
  for (let i = 1; i < v.length; i++) {
    if (v[i][c('status')] !== 'open' || new Date(v[i][c('due')]).getTime() > Date.now()) continue;
    sh.getRange(i + 1, c('status') + 1).setValue('expired');
    const sub = findRow_('Submissions', 'sub_id', v[i][c('sub_id')]) || {};
    const demo = sub.status === 'demo';
    refunds.push('• €' + money_(SUBMIT.pricePerCurator).toFixed(2) + ' to ' + v[i][c('email')] + ' – ' + v[i][c('title')] + ' (' + v[i][c('curator_name')] + ', ' + v[i][c('sub_id')] + (sub.txn_id ? ', PayPal ' + sub.txn_id : '') + ')' + (demo ? ' [DEMO – no refund]' : ''));
    try { MailApp.sendEmail({ to: v[i][c('email')], name: 'Retro Reverb Records', subject: 'No answer from ' + v[i][c('curator_name')] + ' – you get that part back',
      body: v[i][c('curator_name')] + ' didn\'t answer about "' + v[i][c('title')] + '" in time. ' + (demo ? 'DEMO: nothing to refund.' : 'We\'re refunding €' + money_(SUBMIT.pricePerCurator).toFixed(2) + ' to your PayPal within a few days.') + '\n\nSorry about that.\nRetro Reverb Records' }); } catch (e) {}
  }
  if (refunds.length) notify_('RRR Submit: ' + refunds.length + ' refund(s) to send', 'Unanswered reviews expired. Refund these in PayPal (Activity → payment → Refund):\n\n' + refunds.join('\n') + '\n\n' + sheetUrl_());
}
// RRR menu → Curator payouts list
function curatorPayouts() {
  subEnsure_();
  const owed = {};
  rows_('Reviews').filter(r => r.status === 'answered' && r.payout === '' && Number(r.earned) > 0).forEach(r => { owed[r.curator_id] = (owed[r.curator_id] || 0) + Number(r.earned); });
  const curators = rows_('Curators');
  const lines = Object.keys(owed).map(id => { const c = curators.find(x => x.curator_id === id) || {}; return '• ' + (c.name || id) + ' (' + id + ', PayPal: ' + (c.email || '?') + '): €' + money_(owed[id]).toFixed(2); });
  const text = lines.length ? 'Pay these by PayPal, then type paid in the Reviews "payout" column for their answered rows:\n\n' + lines.join('\n') : 'Nothing owed to curators right now.';
  try { SpreadsheetApp.getUi().alert('Curator payouts', text, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { notify_('RRR Submit payouts', text); }
  return text;
}
