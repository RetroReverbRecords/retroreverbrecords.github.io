/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
// ============================================================
// RRR SUBMIT: radio, playlist and blog submissions (Groover-style curator marketplace)
// Add this as a SECOND script file in Apps Script (File + → Script → name it "Submit"),
// paste this in, save, then run submitSetup once.
//
// How it works
// 1. Artists pick curators on submit.html, pay SUBMIT.pricePerCurator per curator (PayPal, custom = SUB-XXXXXX).
//    Track links must be playable on the curator page (YouTube, SoundCloud, Dropbox or a direct audio file) for the 30-second listen check.
// 2. Payment confirmed → one review per curator, due in SUBMIT.answerDays days; curators are emailed.
// 3. Curators listen on their private page (curator.html?k=…). The answer form unlocks after SUBMIT.listenSeconds of real play.
//    Accepted: when, where and why it will play (+ links). Declined: at least SUBMIT.minWords words of feedback.
//    The artist gets it by email; the curator earns SUBMIT.curatorPay (RRR's own curator: share 0 = RRR keeps it all).
// Curator rules: set status = removed in the Curators tab (with removed_reason) for AI-policy breaches, bots or cheating:
//    their unpaid earnings are withheld automatically.
// 4. Not answered in time → the review expires, the artist is told, and you get a refund list in your daily email.
// 5. Promoters apply on submit.html#curators. Approve by setting status = active in the Curators tab
//    (instant: they are emailed their private link).
// 6. Payouts: RRR menu → Curator payouts list. Pay them by PayPal, then type paid in the Reviews "payout" column.
//
// Rule: artists pay for a listen and honest feedback, never for placement (Spotify forbids paid placement).
// ============================================================
const SUBMIT = {
  pricePerCurator: 1.50,   // € per curator (owner, 10 Oct 2026)
  curatorPay: 0.80,        // € a curator earns per answered track; RRR keeps the rest (0.70)
  answerDays: 14,          // owner, 10 Oct 2026
  minWords: 20,
  listenSeconds: 30,       // real play needed before the answer form unlocks
  maxCurators: 10,
  minimums: 'Radio show: link to the show · Podcast: 25+ regular episodes · YouTube: 1,500+ subscribers · Playlist: 500+ followers'
};
const PLAYABLE_RE = /^https:\/\/((www\.|m\.)?youtube\.com\/|youtu\.be\/|(on\.|m\.)?soundcloud\.com\/|(www\.)?dropbox\.com\/|[^?#]+\.(mp3|wav|m4a|ogg|flac)([?#]|$))/i;
const SUB_TABS = {
  Curators:    ['curator_id','joined','name','type','genres','audience','link','about','email','key','share','status','member_id','notified','followers','episodes','agreed','removed_reason'],
  Submissions: ['sub_id','created','artist','email','member_id','title','track_url','genre','message','curator_ids','amount','status','txn_id','paid_at','artist_links'],
  Reviews:     ['review_id','sub_id','curator_id','curator_name','artist','email','title','track_url','genre','message','created','due','status','listened','decision','where','feedback','answered_at','earned','payout','artist_links','listen_secs','play_time','why','links']
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
  if (q.curators) return json_({ ok: true, price: SUBMIT.pricePerCurator, pay: SUBMIT.curatorPay, answerDays: SUBMIT.answerDays, minWords: SUBMIT.minWords, listenSeconds: SUBMIT.listenSeconds, maxCurators: SUBMIT.maxCurators,
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
    status: r.status, listened: Number(r.listen_secs || 0) >= SUBMIT.listenSeconds, secs: Number(r.listen_secs || 0), decision: r.decision, where: r.where, feedback: r.feedback,
    answered: r.answered_at, earned: r.earned, artistLinks: r.artist_links, playTime: r.play_time, why: r.why, links: r.links });
  return { ok: true, curator: { id: c.curator_id, name: c.name, type: c.type }, listenSeconds: SUBMIT.listenSeconds, minWords: SUBMIT.minWords,
    stats: { answers: answered.length, thisMonth: answered.filter(r => new Date(r.answered_at) >= monthStart).length, rate: rate, owed: owed },
    todo: mine.filter(r => r.status === 'open').sort((a, b) => new Date(a.due) - new Date(b.due)).map(view),
    done: mine.filter(r => r.status !== 'open').sort((a, b) => new Date(b.answered_at || b.due) - new Date(a.answered_at || a.due)).slice(0, 100).map(view) };
}

// ---------- web: POST ----------
function handleSubmitForm_(kind, p) {
  subEnsure_();
  if (kind === 'submit-track') return handleSubmitTrack_(p);
  if (kind === 'submit-feedback') return handleSubmitFeedback_(p);
  if (kind === 'submit-listened') { // real seconds played, reported by the player on the curator page
    const c = curatorByKey_(p.key); if (c) { const r = findRow_('Reviews', 'review_id', p.review_id);
      const secs = Math.min(3600, Math.floor(Number(p.secs) || 0));
      if (r && r.curator_id === c.curator_id && r.status === 'open' && secs > Number(r.listen_secs || 0)) updateRow_('Reviews', 'review_id', r.review_id, { listen_secs: secs, listened: secs >= SUBMIT.listenSeconds ? 'yes' : '' }); }
    return text_('ok'); }
  if (kind === 'submit-links') { // curator adds the link to the play/post after it happens
    const c = curatorByKey_(p.key); if (c) { const r = findRow_('Reviews', 'review_id', p.review_id);
      if (r && r.curator_id === c.curator_id && r.decision === 'accepted') {
        const links = String(p.links || '').trim().slice(0, 600); updateRow_('Reviews', 'review_id', r.review_id, { links: links });
        if (links) try { MailApp.sendEmail({ to: r.email, name: 'Retro Reverb Records', subject: '▶ ' + c.name + ' played "' + r.title + '"', body: c.name + ' added the link to your play:\n\n' + links + '\n\nShare it and tag them!\nRetro Reverb Records · RRR Submit' }); } catch (e) {} } }
    return text_('ok'); }
  if (kind === 'submit-curator-apply') return handleCuratorApply_(p);
  return text_('ok');
}
function handleSubmitTrack_(p) {
  const email = String(p.email || '').trim();
  const url = String(p.track_url || '').trim();
  if (!email || !PLAYABLE_RE.test(url)) return text_('ok');
  const active = rows_('Curators').filter(c => c.status === 'active');
  const ids = String(p.curator_ids || '').split(',').map(s => s.trim().toUpperCase()).filter(id => active.some(c => c.curator_id === id)).slice(0, SUBMIT.maxCurators);
  if (!ids.length) return text_('ok');
  let subId = String(p.sub_id || '').toUpperCase();
  if (!/^SUB-[A-Z0-9]{6}$/.test(subId) || findRow_('Submissions', 'sub_id', subId)) subId = subId_('SUB-', 'Submissions', 'sub_id');
  const m = p.member_id ? findRow_('Members', 'member_id', String(p.member_id).toUpperCase()) : findRow_('Members', 'email', email);
  if (m && !inGoodStanding_(m)) { log_('submission refused: ' + standing_(m), email); return text_('refused: submissions are paused while your membership is ' + standing_(m)); }
  append_('Submissions', { sub_id: subId, created: new Date(), artist: String(p.artist || '').slice(0, 120), email: email, member_id: m ? m.member_id : '',
    title: String(p.title || '').slice(0, 160), track_url: url, genre: p.genre || '', message: String(p.message || '').slice(0, 800),
    curator_ids: ids.join(', '), amount: money_(ids.length * SUBMIT.pricePerCurator), status: 'awaiting payment', artist_links: String(p.artist_links || '').slice(0, 600) });
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
      title: s.title, track_url: s.track_url, genre: s.genre, message: s.message, created: new Date(), due: due, status: 'open', payout: String(c.share) === '0' ? 'n/a' : '', artist_links: s.artist_links || '' });
    if (c.email) try { MailApp.sendEmail({ to: c.email, name: 'RRR Submit', subject: (demo ? '[DEMO] ' : '') + 'New track to review: ' + s.artist + ' – ' + s.title,
      body: 'A new track is waiting for you.\n\n' + s.artist + ' – ' + s.title + ' (' + (s.genre || 'no genre') + ')\n\nPlease listen and answer by ' + due.toDateString() + '.\nYour queue: ' + SETTINGS.siteUrl + 'curator.html?k=' + c.key + '\n\nRRR Submit' }); } catch (e) { log_('curator email failed', String(e)); }
  });
  try { MailApp.sendEmail({ to: s.email, name: 'Retro Reverb Records', subject: (demo ? '[DEMO] ' : '') + 'Your track is with the curators: ' + s.title + ' (' + subId + ')',
    body: (demo ? 'DEMO: no payment taken.\n\n' : 'Payment received, thank you.\n\n') + '"' + s.title + '" is now with ' + String(s.curator_ids).split(',').length + ' curator(s). Each one listens and sends you honest feedback within ' + SUBMIT.answerDays + ' days. If a curator doesn\'t answer in time, you get that part of your payment back.\n\nYou pay for a listen and feedback, never for placement.\n\nRetro Reverb Records' }); } catch (e) { log_('submit artist email failed', String(e)); }
  notify_((demo ? '[DEMO] ' : '') + 'RRR Submit: ' + s.artist + ' – ' + s.title + ' (€' + s.amount + ')', 'Curators: ' + s.curator_ids + '\n' + sheetUrl_());
}
function handleSubmitFeedback_(p) {
  const c = curatorByKey_(p.key); if (!c) return text_('ok');
  const r = findRow_('Reviews', 'review_id', String(p.review_id || ''));
  if (!r || r.curator_id !== c.curator_id || r.status !== 'open') return text_('ok');
  if (Number(r.listen_secs || 0) < SUBMIT.listenSeconds) return text_('ok'); // no answer without a real listen
  const dec = String(p.decision), acc = dec === 'accepted';
  const fb = String(p.feedback || '').trim().slice(0, 4000);
  const cut = (k, n) => String(p[k] || '').trim().slice(0, n);
  if (!/^(accepted|declined)$/.test(dec) || words_(fb) < SUBMIT.minWords) return text_('ok');
  if (acc && (!cut('play_time', 80) || !cut('where', 200))) return text_('ok');
  const pay = String(c.share) === '0' ? 0 : (c.share === '' || c.share === undefined ? SUBMIT.curatorPay : Number(c.share));
  updateRow_('Reviews', 'review_id', r.review_id, { status: 'answered', listened: 'yes', decision: dec, where: cut('where', 200), feedback: fb, why: acc ? fb : '',
    play_time: acc ? cut('play_time', 80) : '', links: cut('links', 600), answered_at: new Date(), earned: money_(pay) || ' ' });
  try { MailApp.sendEmail({ to: r.email, name: 'Retro Reverb Records', subject: (acc ? '🎉 ' : '') + c.name + ' listened to "' + r.title + '"',
    body: c.name + ' (' + c.type + ') listened to your track.\n\n' + (acc
      ? 'ACCEPTED!\n\nWhen: ' + cut('play_time', 80) + '\nWhere: ' + cut('where', 200) + '\n\nWhy:\n' + fb + (cut('links', 600) ? '\n\nLinks: ' + cut('links', 600) : '\n\nThey\'ll send the link once it\'s played.')
      : 'Not this time. Their feedback:\n\n' + fb) +
      '\n\nThank you for sending your music.\nRetro Reverb Records · RRR Submit\n' + SETTINGS.siteUrl + 'submit.html' }); } catch (e) { log_('feedback email failed', String(e)); }
  return text_('ok');
}
function handleCuratorApply_(p) {
  const email = String(p.email || '').trim(); if (!email || !p.name) return text_('ok');
  const n = rows_('Curators').length + 1;
  append_('Curators', { curator_id: 'CUR-' + String(n).padStart(3, '0'), joined: new Date(), name: String(p.name).slice(0, 120), type: String(p.type || '').slice(0, 60),
    genres: String(p.genres || '').slice(0, 300), audience: String(p.audience || '').slice(0, 300), link: String(p.link || '').slice(0, 300), about: String(p.about || '').slice(0, 800),
    email: email, share: '', status: 'pending', followers: Number(p.followers) || '', episodes: Number(p.episodes) || '', agreed: new Date() });
  const t = String(p.type || ''), f = Number(p.followers) || 0, ep = Number(p.episodes) || 0;
  const below = (/podcast/i.test(t) && ep < 25) || (/youtube/i.test(t) && f < 1500) || (/playlist/i.test(t) && f < 500);
  notify_('New curator application: ' + p.name + ' (' + t + ')' + (below ? ' ⚠ below minimum' : ''), 'Audience: ' + (p.audience || '') + '\nFollowers/subscribers: ' + (f || '–') + ' · Episodes: ' + (ep || '–') + '\nLink: ' + (p.link || '') +
    '\n\nMinimums: ' + SUBMIT.minimums + (below ? '\n⚠ This one is BELOW the minimum.' : '') + '\nAgreed to: RRR AI policy, real audience, honest answers within ' + SUBMIT.answerDays + ' days, no paid placement.' +
    '\n\nCheck they are real (no bots or bought followers). To approve, set status = active in the Curators tab: they are emailed their private link straight away.\n' + sheetUrl_());
  try { MailApp.sendEmail({ to: email, name: 'RRR Submit', subject: 'Thanks for applying to curate on RRR Submit', body: 'Thanks! We check every curator by hand against our minimums (' + SUBMIT.minimums + '), usually within a few days. If you are approved, you will get an email with your private review page.\n\nRetro Reverb Records' }); } catch (e) {}
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
        '\n\nHow it works: artists send you tracks. Play at least ' + SUBMIT.listenSeconds + ' seconds on your page, then accept (when, where and why it will play) or decline with at least ' + SUBMIT.minWords + ' words of honest feedback, within ' + SUBMIT.answerDays + ' days.' +
        ' You earn €' + money_(SUBMIT.curatorPay).toFixed(2) + ' per answered track, paid monthly by PayPal.' +
        '\n\nThe rules: follow the RRR AI policy (' + SETTINGS.siteUrl + 'terms.html#ai). Breaking it means instant removal. Bots, bought followers or any cheating means removal and no payment.' +
        ' Never promise or sell placement: artists pay for a listen and feedback only.\n\nRetro Reverb Records' }); } catch (e) { log_('curator welcome failed', String(e)); }
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
  const curators = rows_('Curators');
  const removed = new Set(curators.filter(c => c.status === 'removed').map(c => c.curator_id));
  const rv = ss_().getSheetByName('Reviews'), rvv = rv.getDataRange().getValues(), rh = rvv[0], rc = k => rh.indexOf(k);
  for (let i = 1; i < rvv.length; i++) if (removed.has(rvv[i][rc('curator_id')]) && rvv[i][rc('payout')] === '') rv.getRange(i + 1, rc('payout') + 1).setValue('withheld'); // removed curators aren't paid
  rows_('Reviews').filter(r => r.status === 'answered' && r.payout === '' && Number(r.earned) > 0).forEach(r => { owed[r.curator_id] = (owed[r.curator_id] || 0) + Number(r.earned); });
  const lines = Object.keys(owed).map(id => { const c = curators.find(x => x.curator_id === id) || {}; return '• ' + (c.name || id) + ' (' + id + ', PayPal: ' + (c.email || '?') + '): €' + money_(owed[id]).toFixed(2); });
  const text = lines.length ? 'Pay these by PayPal, then type paid in the Reviews "payout" column for their answered rows:\n\n' + lines.join('\n') : 'Nothing owed to curators right now.';
  try { SpreadsheetApp.getUi().alert('Curator payouts', text, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { notify_('RRR Submit payouts', text); }
  return text;
}
