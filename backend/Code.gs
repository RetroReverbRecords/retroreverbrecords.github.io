/**
 * RRR AUTOMATION — Google Apps Script
 * ------------------------------------------------------------
 * One small program in your Google account that:
 *  1. Receives sign-ups and bookings from the website  → Google Sheet
 *  2. Receives PayPal payment notifications (IPN)      → Google Sheet + email to you
 *  3. Adds bookings (releases, social posts, YouTube)  → Google Calendar "RRR Releases"
 *  4. Serves each member's dashboard data               → member.html on the website
 *  5. Pulls stats from Songstats (optional, needs API key) and emails you a daily digest
 *  6. Collects newsletter sign-ups and sends the MONTHLY NEWSLETTER automatically
 *     (preview to you on the 28th, sent to subscribers on the 1st)
 *  7. Collects press/review links from artists; you approve them in the sheet
 *  8. RRR Selected Releases: artists submit a release, you approve it in the Releases tab,
 *     it gets a series + catalogue number (e.g. RRSYN-001) and shows on the website
 *
 * Setup: see backend/SETUP.md. Nothing here spends money.
 * Only the newsletter goes to the public, and only to people who opted in.
 */

// ---------- SETTINGS (edit these) ----------
const SETTINGS = {
  ownerEmail: 'retroreverbrecords@gmail.com',       // where alerts go
  paypalEmail: 'retroreverbrecords@gmail.com',      // PayPal account that receives money
  calendarName: 'RRR Releases',
  siteUrl: 'https://retroreverbrecords.github.io/',
  songstatsBase: 'https://api.songstats.com/enterprise/v1', // confirm in Songstats docs
  songstatsLabelId: 'ywz70gl4',                      // from songstats.com/label/ywz70gl4
  // Deadlines (days before release) — keep in step with assets/config.js
  bandcampAssetsDays: 14,   // owner decision 29 Sep 2026: Bandcamp 2 weeks
  streamingAssetsDays: 21,  // streaming 3 weeks
  termsUrl: 'terms.html',
  spotifyPlaylist: 'https://open.spotify.com/playlist/6NOScmeECIxFvRz9jcinjm',
  // Newsletter: 'auto' = preview to you on the 28th, sent on the 1st.
  //             'preview' = only ever sent to you (you forward it yourself).
  //             'off' = nothing.  Can also be changed in the Settings tab of the sheet.
  newsletterMode: 'auto',
  dailySendLimit: 90,  // free Gmail allows ~100 emails a day; the rest go out the next days
  releaseDecisionEmails: true, // email artists when a Selected Release is approved or not selected
  maxReleasesPerWeek: 0        // release slots per week (Mon–Sun). 0 = no limit. Over the limit, bookings are flagged 'date full' for you
};

// Sheet tabs and their columns. Created automatically on first run.
const TABS = {
  Members:      ['member_id','created','type','name','artist','email','country','address_line1','address_line2','city','postcode','bandcamp','status','plan','paypal_subscr_id','points','rank','songstats_artist_id','public','referred_by','artist_type','bandcamp_linked','bandcamp_pro','admin_notes','link_method','standing'],
  Agreements:   ['member_id','signed_at_server','signed_at_client','signature_name','email','type','terms_version','agreed_terms_conduct_privacy','agreed_ai_release_policy','agreed_bandcamp_link','user_agent','page','copy_emailed'],
  Payments:     ['received','txn_type','payment_status','amount','currency','item_name','payer_email','member_id','txn_id','subscr_id','raw'],
  Bookings:     ['created','kind','member_id','artist','email','title','format','date','details','status','calendar_event_id'],
  Achievements: ['member_id','achievement','earned_on','points','note'],
  Posts:        ['member_id','platform','date','link','status','caption','likes','views'],
  Stats:        ['member_id','updated','spotify_monthly_listeners','spotify_streams','playlists','youtube_views','tiktok_views','source'],
  Subscribers:  ['email','created','source','consent','status','token','member_id'],
  Press:        ['created','artist','email','outlet','title','url','quote','approved'],
  Claims:       ['created','member_id','action','points','proof','note','approved'],
  Withdrawals:  ['received','name','email','member_id','contract_date','what','detail','sent_at','acknowledged','refund_by','refund_status'],
  Blocked:      ['email','member_id','standing','since','reason','owner_checklist_sent'],
  Releases:     ['release_id','created','member_id','artist','email','title','bandcamp_url','artwork_url','genre','subgenre','release_date',
                 'description','why_fit','spotify_url','youtube_url','affiliation','series','catalogue_no','featured','status','approved_on','notified','admin_notes',
                 'audio_url','ai_declared','ai_score','ai_result','sound_check','ai_checked'],
  Newsletter:   ['month','created','subject','sent_to','queued','status'],
  Queue:        ['email','month','sent'],
  Settings:     ['key','value'],
  Log:          ['time','what','detail']
};

// Karate belts, then Dans. Keep in step with assets/levels.js on the website.
const RANKS = [
  { name: 'White belt', min: 0 }, { name: 'Yellow belt', min: 100 }, { name: 'Orange belt', min: 250 },
  { name: 'Green belt', min: 450 }, { name: 'Blue belt', min: 700 }, { name: 'Purple belt', min: 1000 },
  { name: 'Brown belt', min: 1400 }, { name: 'Black belt · 1st Dan', min: 2000 }, { name: '2nd Dan', min: 3000 },
  { name: '3rd Dan', min: 4200 }, { name: '4th Dan', min: 5600 }, { name: '5th Dan', min: 7200 },
  { name: '6th Dan', min: 9000 }, { name: '7th Dan', min: 11000 }, { name: '8th Dan', min: 13500 },
  { name: '9th Dan', min: 16500 }, { name: '10th Dan', min: 20000 }
];
// One-off badges (awarded once). Repeatable points use addPoints_().
const AUTO_ACHIEVEMENTS = {
  joined:        { title: 'Joined the community', points: 10 },
  firstRelease:  { title: 'First release booked', points: 15 },
  firstPost:     { title: 'First social post booked', points: 5 },
  firstVideo:    { title: 'First YouTube upload', points: 5 },
  newsletter:    { title: 'Newsletter subscriber', points: 5 },
  loyal3:        { title: '3 months a member', points: 30 },
  loyal12:       { title: '1 year a member', points: 120 }
};
// Repeatable point values (see the Levels page)
const POINTS = { releaseBooked: 15, postBooked: 5, videoBooked: 5, activeMonth: 10, fanReferral: 20, artistReferral: 40, pressApproved: 20 };

// ============================================================
// WEB ENDPOINTS
// ============================================================
function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.txn_type || p.payment_status || p.ipn_track_id) return handlePayPal_(e);
    const kind = p.form || 'unknown';
    if (kind === 'signup') return handleSignup_(p);
    if (/release|social-post|youtube-upload|merch-listing/.test(kind)) return handleBooking_(kind, p);
    if (kind === 'newsletter') return handleSubscribe_(p);
    if (kind === 'unsubscribe') { const r = findRow_('Subscribers', 'email', String(p.email || '').trim().toLowerCase()); if (r) updateRow_('Subscribers', 'email', r.email, { status: 'unsubscribed' }); return text_('ok'); }
    if (kind === 'press') return handlePress_(p);
    if (kind === 'claim') return handleClaim_(p);
    if (kind === 'rrr-release') return handleReleaseSubmission_(p);
    if (kind === 'withdrawal') return handleWithdrawal_(p);
    if (kind === 'ai-result') return handleAiResult_(p);
    if (kind === 'payment') return handleCardPayment_(p);
    log_('unknown form', JSON.stringify(p).slice(0, 500));
    return text_('ok');
  } catch (err) {
    log_('error doPost', String(err && err.stack || err));
    return text_('error');
  }
}

// member.html calls: ?member=RRR-XXXX  → public JSON for that member
function doGet(e) {
  const q = (e && e.parameter) || {};
  if (q.press) return json_({ ok: true, press: rows_('Press').filter(r => /^yes/i.test(String(r.approved))).reverse().slice(0, 60)
    .map(r => ({ artist: r.artist, outlet: r.outlet, title: r.title, url: r.url, quote: r.quote, date: r.created })) });
  if (q.unsubscribe) return unsubscribe_(q.unsubscribe);
  if (q.series) return json_({ ok: true, series: SERIES, releases: publicSelectedReleases_() });
  if (q.aiqueue) return aiQueue_(q.key);
  const id = (e && e.parameter && e.parameter.member || '').trim().toUpperCase();
  if (!id) return json_({ ok: false, error: 'missing member id' });
  const m = findRow_('Members', 'member_id', id);
  if (!m || String(m.public).toLowerCase() === 'no' || standing_(m) === 'removed') return json_({ ok: false, error: 'not found' });
  return json_({ ok: true, member: publicProfile_(m) });
}

// ============================================================
// SIGN-UPS
// ============================================================
function handleSignup_(p) {
  // Removed members can't join again (Code of Conduct: Blocking and removing abusive users)
  const em = String(p.email || '').trim().toLowerCase();
  if (em && rows_('Blocked').some(b => String(b.email).toLowerCase() === em && /removed/i.test(String(b.standing)))) {
    log_('signup refused: blocked email', em);
    notify_('Blocked person tried to sign up: ' + em, 'Their sign-up was not created. If they pay through PayPal anyway, refund them.\n' + sheetUrl_());
    return text_('ok');
  }
  // The website makes the member ID so it can go straight to PayPal with it
  let id = String(p.member_id || '').toUpperCase();
  if (!/^RRR-[A-Z0-9]{5}$/.test(id) || findRow_('Members', 'member_id', id)) id = newMemberId_();
  append_('Members', {
    member_id: id, created: new Date(), type: p.type || 'fan', name: p.name, artist: p.artist,
    email: p.email, country: p.country, address_line1: p.address_line1, address_line2: p.address_line2,
    city: p.city, postcode: p.postcode, bandcamp: p.bandcamp, status: 'pending payment',
    plan: p.type === 'artist' ? 'Artist' : 'Fan', points: 0, rank: 'White belt', public: 'yes',
    artist_type: p.type === 'artist' ? 'Member' : '', bandcamp_linked: p.type === 'artist' ? 'no' : ''
  });
  award_(id, 'joined');

  // Signed agreement: stored, and a copy emailed to the member
  const isArtist = p.type === 'artist';
  const version = p.terms_version || '';
  let emailed = 'no';
  try {
    MailApp.sendEmail({ to: p.email, name: 'Retro Reverb Records', subject: 'Your RRR membership agreement (' + version + ')',
      htmlBody: '<p>Hi ' + (p.name || '') + ',</p><p>Welcome to the RRR Community. This is your copy of what you agreed to when you signed up.</p>' +
        '<ul><li><b>Signed by:</b> ' + (p.signature || '') + '</li><li><b>Date and time:</b> ' + new Date().toUTCString() + '</li><li><b>Member ID:</b> ' + id + '</li><li><b>Terms version:</b> ' + version + '</li>' +
        '<li>Agreed to the RRR Member Agreement (Membership Terms, Code of Conduct, Refund Policy, Privacy Policy): ' + (p.agree_terms === 'yes' ? 'yes' : 'no') + '</li>' +
        (isArtist ? '<li>Agreed to the AI-Generated Music Policy and Release Policy: ' + (p.agree_ai === 'yes' ? 'yes' : 'no') + '</li><li>Understands Bandcamp linking is needed for Bandcamp sales to be paid straight to them: ' + (p.agree_link === 'yes' ? 'yes' : 'no') + '</li>' : '') +
        '</ul><p>Your agreement: <a href="' + SETTINGS.siteUrl + 'agreement.html">' + SETTINGS.siteUrl + 'agreement.html</a> (with the <a href="' + SETTINGS.siteUrl + SETTINGS.termsUrl + '">Membership Terms</a>, <a href="' + SETTINGS.siteUrl + 'code-of-conduct.html">Code of Conduct</a>, <a href="' + SETTINGS.siteUrl + 'refunds.html">Refund Policy</a> and <a href="' + SETTINGS.siteUrl + 'privacy.html">Privacy Policy</a>).</p>' +
        '<p><b>14 days to change your mind:</b> you can withdraw within 14 days of joining for a full refund of your membership. Use <a href="' + SETTINGS.siteUrl + 'withdraw.html">Withdraw from contract here</a> or reply to this email.</p><p>Your dashboard: <a href="' + SETTINGS.siteUrl + 'member.html?id=' + id + '">' + SETTINGS.siteUrl + 'member.html?id=' + id + '</a></p><p>Retro Reverb Records</p>' });
    emailed = 'yes';
  } catch (err) { log_('agreement email failed', String(err)); }
  append_('Agreements', { member_id: id, signed_at_server: new Date(), signed_at_client: p.signed_at || '', signature_name: p.signature || '', email: p.email, type: p.type,
    terms_version: version, agreed_terms_conduct_privacy: p.agree_terms === 'yes' ? 'yes' : 'NO', agreed_ai_release_policy: isArtist ? (p.agree_ai === 'yes' ? 'yes' : 'NO') : 'n/a',
    agreed_bandcamp_link: isArtist ? (p.agree_link === 'yes' ? 'yes' : 'NO') : 'n/a', user_agent: p.user_agent || '', page: p.signed_on_page || '', copy_emailed: emailed });

  // Referral points for whoever invited them
  if (p.referred_by) {
    const ref = String(p.referred_by).trim();
    const inviter = findRow_('Members', 'member_id', ref) || findRow_('Members', 'artist', ref) || findRow_('Members', 'name', ref);
    if (inviter && inviter.member_id !== id) {
      addPoints_(inviter.member_id, isArtist ? POINTS.artistReferral : POINTS.fanReferral, 'Invited ' + (p.artist || p.name) + ' (' + (isArtist ? 'artist' : 'fan') + ')');
      if (!rows_('Achievements').some(r => r.member_id === inviter.member_id && r.achievement === 'Brought a friend')) append_('Achievements', { member_id: inviter.member_id, achievement: 'Brought a friend', earned_on: new Date(), points: 0, note: 'badge' });
    }
    updateRow_('Members', 'member_id', id, { referred_by: ref });
  }
  notify_('New RRR sign-up: ' + (p.artist || p.name) + ' (' + (p.type || 'fan') + ')',
    'Member ID: ' + id + '\nEmail: ' + p.email + '\nWaiting for PayPal payment.\n\nMembers sheet: ' + sheetUrl_());
  return text_('ok');
}

// ============================================================
// BOOKINGS → sheet + calendar
// ============================================================
function handleBooking_(kind, p) {
  const date = p.release_date || p.preferred_date || p.premiere_date || '';
  const member = p.email ? findRow_('Members', 'email', p.email) : null;
  const memberId = member ? member.member_id : '';
  if (member && !inGoodStanding_(member)) { log_('booking refused: ' + standing_(member), memberId + ' ' + kind); notify_('Booking refused (member ' + standing_(member) + '): ' + memberId, JSON.stringify(p).slice(0, 800)); return text_('ok'); }
  const title = p.title || p.link || '';
  let eventId = '';
  // Release slots: dates are subject to availability
  const full = /release/.test(kind) && date && SETTINGS.maxReleasesPerWeek > 0 &&
    rows_('Bookings').filter(r => /release/.test(r.kind) && !/cancel|full/i.test(String(r.status)) && r.date && weekKey_(r.date) === weekKey_(date)).length >= SETTINGS.maxReleasesPerWeek;
  if (date && !full) eventId = addToCalendar_(kind, p, date);
  append_('Bookings', { created: new Date(), kind: kind, member_id: memberId, artist: p.artist, email: p.email,
    title: title, format: p.format || '', date: date, details: JSON.stringify(p).slice(0, 1500), status: full ? 'date full – suggest another date' : 'requested', calendar_event_id: eventId });
  if (full) notify_('⚠ Release week full: ' + (p.artist || '') + ' – ' + title, 'Requested ' + date + '. That week already has ' + SETTINGS.maxReleasesPerWeek +
    ' release(s). Reply to ' + (p.email || 'the artist') + ' with the nearest free date, then change the status in the Bookings tab.\n' + sheetUrl_());
  if (memberId) {
    if (/release/.test(kind)) { award_(memberId, 'firstRelease'); addPoints_(memberId, POINTS.releaseBooked, 'Release booked: ' + title); }
    if (kind === 'youtube-upload') addPoints_(memberId, POINTS.videoBooked, 'YouTube upload booked: ' + title);
    if (kind === 'social-post') { award_(memberId, 'firstPost'); addPoints_(memberId, POINTS.postBooked, 'Social post booked'); append_('Posts', { member_id: memberId, platform: [].concat(p.platform || []).join(', '), date: date, link: p.link, status: 'booked' }); }
    if (kind === 'youtube-upload') award_(memberId, 'firstVideo');
  }
  notify_('New RRR booking: ' + kind + ' – ' + (p.artist || '') + ' – ' + title,
    'Date: ' + date + '\nMember: ' + (memberId || 'not matched to a member – check email') + '\n\nBookings sheet: ' + sheetUrl_());
  return text_('ok');
}

function weekKey_(d) {
  const x = new Date(d); if (isNaN(x)) return '';
  const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day);
  return Utilities.formatDate(x, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function addToCalendar_(kind, p, isoDate) {
  const cal = getCalendar_();
  const d = new Date(isoDate + 'T12:00:00');
  const label = { 'bandcamp-release': 'Bandcamp release', 'streaming-release': 'Streaming release', 'social-post': 'Social post', 'youtube-upload': 'YouTube premiere' }[kind] || kind;
  const main = cal.createAllDayEvent('RRR ' + label + ': ' + (p.artist || '') + ' – ' + (p.title || ''), d, { description: 'Booked via website. Email: ' + (p.email || '') });
  // Asset deadlines as their own reminders
  const addDeadline = (days, what) => {
    const dd = new Date(d); dd.setDate(dd.getDate() - days);
    cal.createAllDayEvent('DEADLINE ' + what + ': ' + (p.artist || '') + ' – ' + (p.title || ''), dd);
  };
  if (kind === 'bandcamp-release') addDeadline(SETTINGS.bandcampAssetsDays, 'Bandcamp assets');
  if (kind === 'streaming-release' || p.also_streaming) addDeadline(SETTINGS.streamingAssetsDays, 'Streaming assets');
  return main.getId();
}

// ============================================================
// PAYPAL (Instant Payment Notification)
// The website sends people to PayPal with notify_url = this script's URL.
// PayPal then tells us about every payment and subscription change.
// ============================================================
function handlePayPal_(e) {
  const raw = e.postData ? e.postData.contents : '';
  // 1. Ask PayPal to confirm this message is genuine
  const check = UrlFetchApp.fetch('https://ipnpb.paypal.com/cgi-bin/webscr', {
    method: 'post', payload: 'cmd=_notify-validate&' + raw,
    contentType: 'application/x-www-form-urlencoded', muteHttpExceptions: true
  }).getContentText();
  const p = e.parameter;
  if (check !== 'VERIFIED') { log_('PayPal not verified', raw.slice(0, 500)); return text_('ok'); }
  if (String(p.receiver_email || p.business || '').toLowerCase() !== SETTINGS.paypalEmail.toLowerCase()) {
    log_('PayPal wrong receiver', p.receiver_email); return text_('ok');
  }
  // 2. Ignore repeats
  if (p.txn_id && findRow_('Payments', 'txn_id', p.txn_id)) return text_('ok');
  // custom = member ID (subscriptions) or the member's email (one-off fees)
  let memberId = String(p.custom || '').trim();
  if (memberId.indexOf('@') > 0) { const m = findRow_('Members', 'email', memberId); memberId = m ? m.member_id : ''; }
  memberId = memberId.toUpperCase();
  append_('Payments', { received: new Date(), txn_type: p.txn_type, payment_status: p.payment_status, amount: p.mc_gross || p.mc_amount3 || '',
    currency: p.mc_currency, item_name: p.item_name, payer_email: p.payer_email, member_id: memberId, txn_id: p.txn_id || '', subscr_id: p.subscr_id || '', raw: raw.slice(0, 2000) });

  // 3. Update the member
  const t = p.txn_type;
  const setStatus = (status) => { if (memberId) updateRow_('Members', 'member_id', memberId, { status: status, paypal_subscr_id: p.subscr_id || '' }); };
  if (t === 'subscr_signup' || t === 'subscr_payment') setStatus('active');
  if (t === 'subscr_cancel') setStatus('cancelled (active until period ends)');
  if (t === 'subscr_eot' || t === 'subscr_failed') setStatus('lapsed');

  // 4. Tell the owner straight away
  const who = memberId || p.payer_email;
  const nice = {
    subscr_signup: 'NEW SUBSCRIPTION', subscr_payment: 'Subscription payment', subscr_cancel: 'Subscription cancelled',
    subscr_eot: 'Subscription ended', subscr_failed: 'Subscription payment failed', web_accept: 'One-off payment'
  }[t] || ('PayPal: ' + t);
  notify_('RRR ' + nice + ' – ' + who + ' – ' + (p.mc_gross || p.mc_amount3 || '') + ' ' + (p.mc_currency || ''),
    'Item: ' + (p.item_name || '') + '\nPayer: ' + (p.payer_email || '') + '\nMember ID: ' + (memberId || 'none') + '\n\nPayments sheet: ' + sheetUrl_());
  return text_('ok');
}

// ============================================================
// ACHIEVEMENTS, POINTS, RANKS
// ============================================================
function award_(memberId, key, note) {
  const a = AUTO_ACHIEVEMENTS[key]; if (!a) return;
  const existing = rows_('Achievements').some(r => r.member_id === memberId && r.achievement === a.title);
  if (existing) return;
  append_('Achievements', { member_id: memberId, achievement: a.title, earned_on: new Date(), points: a.points, note: note || '' });
  recalcPoints_(memberId);
}
function addPoints_(memberId, pts, note) {
  if (!memberId || !pts) return;
  append_('Achievements', { member_id: memberId, achievement: 'Points', earned_on: new Date(), points: pts, note: note || '' });
  recalcPoints_(memberId);
}
function recalcPoints_(memberId) {
  const pts = rows_('Achievements').filter(r => r.member_id === memberId).reduce((s, r) => s + (Number(r.points) || 0), 0);
  updateRow_('Members', 'member_id', memberId, { points: pts, rank: rankFor_(pts).name });
}
function rankFor_(pts) { let r = RANKS[0]; RANKS.forEach(x => { if (pts >= x.min) r = x; }); return r; }

function publicProfile_(m) {
  const id = m.member_id;
  const pts = Number(m.points) || 0;
  const rank = rankFor_(pts), next = RANKS.find(r => r.min > pts) || null;
  const stats = rows_('Stats').filter(r => r.member_id === id).pop() || null;
  return {
    id: id, name: m.artist || m.name, type: m.type, since: m.created, status: m.status,
    points: pts, rank: rank.name, nextRank: next ? next.name : null, nextAt: next ? next.min : null, rankFrom: rank.min,
    belt: rank.name,
    membershipActive: /active/i.test(String(m.status)) && standing_(m) !== 'suspended',
    standing: standing_(m),
    artistType: m.type === 'artist' ? (m.artist_type || 'Member') : '',
    bandcampLinked: /^y/i.test(String(m.bandcamp_linked)),
    eligible: isEligible_(m),
    programme: rows_('Releases').filter(r => r.member_id === id).map(r => ({ title: r.title, affiliation: r.affiliation || 'Unspecified',
      series: r.series, catalogue: r.catalogue_no, date: r.release_date, url: r.bandcamp_url, artwork: r.artwork_url })),
    achievements: rows_('Achievements').filter(r => r.member_id === id && r.achievement !== 'Points').map(r => ({ title: r.achievement, on: r.earned_on, points: r.points })),
    recentPoints: rows_('Achievements').filter(r => r.member_id === id && r.achievement === 'Points').slice(-10).reverse().map(r => ({ note: r.note, on: r.earned_on, points: r.points })),
    releases: rows_('Bookings').filter(r => r.member_id === id && /release/.test(r.kind)).map(r => ({ title: r.title, kind: r.kind, format: r.format, date: r.date, status: r.status })),
    posts: rows_('Posts').filter(r => r.member_id === id).map(r => ({ platform: r.platform, date: r.date, link: r.link, status: r.status })),
    stats: stats ? { updated: stats.updated, spotifyListeners: stats.spotify_monthly_listeners, spotifyStreams: stats.spotify_streams, playlists: stats.playlists, youtubeViews: stats.youtube_views, tiktokViews: stats.tiktok_views, source: stats.source } : null
    // Note: email, address and payment details are never included.
  };
}

// ============================================================
// SONGSTATS (optional — needs an Enterprise API key)
// Put the key in Project Settings → Script properties as SONGSTATS_API_KEY
// ============================================================
function updateSongstats() {
  const key = PropertiesService.getScriptProperties().getProperty('SONGSTATS_API_KEY');
  if (!key) { log_('songstats', 'no API key set – skipped'); return; }
  rows_('Members').filter(m => m.songstats_artist_id && /active/.test(m.status)).forEach(m => {
    const get = (source) => {
      const res = UrlFetchApp.fetch(SETTINGS.songstatsBase + '/artists/stats?songstats_artist_id=' + encodeURIComponent(m.songstats_artist_id) + '&source=' + source,
        { headers: { apikey: key, Accept: 'application/json' }, muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) { log_('songstats ' + source, m.member_id + ' ' + res.getResponseCode()); return {}; }
      const body = JSON.parse(res.getContentText());
      const s = (body.stats && body.stats[0] && body.stats[0].data) || {};
      return s;
    };
    const sp = get('spotify'), yt = get('youtube'), tt = get('tiktok');
    append_('Stats', { member_id: m.member_id, updated: new Date(),
      spotify_monthly_listeners: sp.monthly_listeners_current || '', spotify_streams: sp.streams_total || '',
      playlists: sp.playlists_current || '', youtube_views: yt.video_views_total || '', tiktok_views: tt.views_total || '', source: 'Songstats' });
    Utilities.sleep(500);
  });
}

// ============================================================
// DAILY JOBS
// ============================================================
function daily() {
  // Loyalty achievements
  const now = new Date();
  rows_('Members').filter(m => /active/.test(m.status) && m.created).forEach(m => {
    const months = (now - new Date(m.created)) / (1000 * 60 * 60 * 24 * 30.4);
    if (months >= 3) award_(m.member_id, 'loyal3');
    if (months >= 12) award_(m.member_id, 'loyal12');
    // 10 points for every month as an active member (once per month)
    const tag = 'Active month ' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!rows_('Achievements').some(r => r.member_id === m.member_id && r.note === tag)) addPoints_(m.member_id, POINTS.activeMonth, tag);
  });
  // Press links you approved (type yes in "approved") earn the artist points once
  const sh = sheet_('Press'), pv = sh.getDataRange().getValues(), ph = pv[0];
  const ai = ph.indexOf('approved'), ei = ph.indexOf('email'), ti = ph.indexOf('title'), oi = ph.indexOf('outlet');
  for (let i = 1; i < pv.length; i++) {
    if (String(pv[i][ai]).toLowerCase() !== 'yes') continue;
    const m = findRow_('Members', 'email', pv[i][ei]);
    if (m) { addPoints_(m.member_id, POINTS.pressApproved, 'Press: ' + (pv[i][ti] || pv[i][oi])); if (!rows_('Achievements').some(r => r.member_id === m.member_id && r.achievement === 'In the press')) append_('Achievements', { member_id: m.member_id, achievement: 'In the press', earned_on: new Date(), points: 0, note: 'badge' }); }
    sh.getRange(i + 1, ai + 1).setValue('yes – points given');
  }
  approveClaims();
  processReleaseDecisions();
  processStanding_();
  updateSongstats();
  newsletterTick_();
  digest_();
}

function digest_() {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const newM = rows_('Members').filter(r => new Date(r.created) >= since);
  const pays = rows_('Payments').filter(r => new Date(r.received) >= since);
  const books = rows_('Bookings').filter(r => new Date(r.created) >= since);
  const soon = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const deadlines = getCalendar_().getEvents(new Date(), soon).filter(ev => /^DEADLINE/.test(ev.getTitle())).map(ev => '• ' + ev.getAllDayStartDate().toDateString() + ' – ' + ev.getTitle());
  const active = rows_('Members').filter(r => /active/.test(r.status)).length;
  if (!newM.length && !pays.length && !books.length && !deadlines.length) return;
  notify_('RRR daily digest – ' + newM.length + ' new members, ' + pays.length + ' payments, ' + books.length + ' bookings',
    'Active members: ' + active +
    '\n\nNew members:\n' + (newM.map(r => '• ' + (r.artist || r.name) + ' (' + r.type + ', ' + r.status + ')').join('\n') || '–') +
    '\n\nPayments:\n' + (pays.map(r => '• ' + r.txn_type + ' ' + r.amount + ' ' + r.currency + ' – ' + (r.member_id || r.payer_email)).join('\n') || '–') +
    '\n\nBookings:\n' + (books.map(r => '• ' + r.kind + ' – ' + r.artist + ' – ' + r.title + ' – ' + r.date).join('\n') || '–') +
    '\n\nDeadlines in the next 7 days:\n' + (deadlines.join('\n') || '–') +
    '\n\nSheet: ' + sheetUrl_());
}

// Beta testing: run from the editor to email yourself this month's newsletter right now.
function testNewsletter() {
  const n = buildNewsletter_(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
  MailApp.sendEmail({ to: SETTINGS.ownerEmail, subject: 'TEST – ' + n.subject, htmlBody: n.html.replace('{{UNSUB}}', '(unsubscribe link goes here)') });
}
// Beta testing: run from the editor to email yourself the daily digest right now.
function testDigest() { digest_(); }

// Run once from the editor: creates tabs, calendar and the daily trigger.
function setup() {
  Object.keys(TABS).forEach(sheet_);
  applyValidations_();
  getCalendar_();
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'daily') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('daily').timeBased().everyDays(1).atHour(8).create();
  log_('setup', 'done');
}

// ============================================================
// HELPERS
// ============================================================
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheetUrl_() { return ss_().getUrl(); }
const HEADERS_OK_ = {};
function sheet_(name) {
  let sh = ss_().getSheetByName(name);
  if (!sh) { sh = ss_().insertSheet(name); sh.appendRow(TABS[name]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, TABS[name].length).setFontWeight('bold'); }
  else if (!HEADERS_OK_[name] && TABS[name]) {
    // New columns added to TABS in a code update are added to the end of the existing sheet
    const have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    const missing = TABS[name].filter(k => have.indexOf(k) < 0);
    if (missing.length) { const c = have.filter(String).length + 1; sh.getRange(1, c, 1, missing.length).setValues([missing]).setFontWeight('bold'); }
  }
  HEADERS_OK_[name] = true;
  return sh;
}
function rows_(name) {
  const v = sheet_(name).getDataRange().getValues(); const h = v.shift() || [];
  return v.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
function findRow_(name, col, val) {
  const want = String(val).toLowerCase();
  return rows_(name).find(r => String(r[col]).toLowerCase() === want) || null;
}
function append_(name, obj) {
  const sh = sheet_(name), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(h.map(k => obj[k] !== undefined ? obj[k] : ''));
}
function updateRow_(name, keyCol, keyVal, patch) {
  const sh = sheet_(name), v = sh.getDataRange().getValues(), h = v[0];
  const ki = h.indexOf(keyCol);
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][ki]).toLowerCase() === String(keyVal).toLowerCase()) {
      Object.keys(patch).forEach(k => { const ci = h.indexOf(k); if (ci >= 0 && patch[k] !== '') sh.getRange(i + 1, ci + 1).setValue(patch[k]); });
      return true;
    }
  }
  return false;
}
function newMemberId_() {
  const alph = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let id;
  do { id = 'RRR-' + Array.from({ length: 5 }, () => alph[Math.floor(Math.random() * alph.length)]).join(''); } while (findRow_('Members', 'member_id', id));
  return id;
}
function getCalendar_() { const c = CalendarApp.getCalendarsByName(SETTINGS.calendarName); return c.length ? c[0] : CalendarApp.createCalendar(SETTINGS.calendarName); }
function notify_(subject, body) { MailApp.sendEmail(SETTINGS.ownerEmail, subject, body); }
function log_(what, detail) { try { sheet_('Log').appendRow([new Date(), what, detail]); } catch (e) {} }
function text_(s) { return ContentService.createTextOutput(s); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }


// ============================================================
// NEWSLETTER SIGN-UPS
// ============================================================
function handleSubscribe_(p) {
  const email = String(p.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || p.consent !== 'yes') return text_('ok');
  const existing = findRow_('Subscribers', 'email', email);
  if (existing) { updateRow_('Subscribers', 'email', email, { status: 'subscribed' }); return text_('ok'); }
  append_('Subscribers', { email: email, created: new Date(), source: p.source || 'website', consent: 'yes ' + new Date().toISOString(),
    status: 'subscribed', token: Utilities.getUuid(), member_id: p.member_id || '' });
  const mem = findRow_('Members', 'email', email); if (mem) award_(mem.member_id, 'newsletter');
  return text_('ok');
}
function unsubscribe_(token) {
  const r = findRow_('Subscribers', 'token', token);
  if (r) updateRow_('Subscribers', 'token', token, { status: 'unsubscribed' });
  return HtmlService.createHtmlOutput('<body style="background:#07061A;color:#F3EEFF;font-family:sans-serif;padding:40px"><h2>You\'re unsubscribed</h2><p>You won\'t get the RRR newsletter any more.</p></body>');
}

// ============================================================
// PRESS / REVIEWS (artists share links; you set approved = yes)
// ============================================================
function handlePress_(p) {
  append_('Press', { created: new Date(), artist: p.artist, email: p.email, outlet: p.outlet, title: p.title, url: p.url, quote: String(p.quote || '').slice(0, 300), approved: 'pending' });
  notify_('New RRR press link to approve: ' + (p.artist || '') + ' in ' + (p.outlet || ''),
    (p.url || '') + '\n\nApprove it by typing yes in the "approved" column of the Press tab: ' + sheetUrl_());
  return text_('ok');
}

// ============================================================
// POINTS CLAIMS ("Checked" points on the Levels page)
// Members send proof. You check it, then type yes in "approved".
// Points are added at the next daily run, or straight away with
// the sheet menu RRR → Give approved points now.
// You can change the number in "points" before approving (e.g. missions 10–50).
// Type no to turn a claim down.
// ============================================================
const CLAIM_POINTS = { listen: 5, buy: 15, share: 3, live: 5, help: 10, mission: 10 };
const CLAIM_LABELS = { listen: 'Full listen + save + playlist add', buy: 'Bought a member release or merch', share: 'Shared a member release',
  live: 'In the live chat', help: 'Helped another member', mission: 'Community mission' };

function handleClaim_(p) {
  const id = String(p.member_id || '').trim().toUpperCase();
  const action = String(p.action || '');
  const m = findRow_('Members', 'member_id', id);
  if (!m || !(action in CLAIM_POINTS)) { log_('claim rejected', id + ' ' + action); return text_('ok'); }
  if (!inGoodStanding_(m)) { log_('claim refused: ' + standing_(m), id); return text_('ok'); }
  append_('Claims', { created: new Date(), member_id: id, action: CLAIM_LABELS[action] || action, points: CLAIM_POINTS[action],
    proof: String(p.proof || '').slice(0, 500), note: String(p.note || '').slice(0, 500), approved: 'pending' });
  notify_('RRR points claim: ' + (m.artist || m.name || id) + ' – ' + (CLAIM_LABELS[action] || action),
    'Proof: ' + (p.proof || '(none)') + '\nNote: ' + (p.note || '') + '\n\nCheck it, then type yes in the "approved" column of the Claims tab: ' + sheetUrl_());
  return text_('ok');
}

function approveClaims() {
  const sh = sheet_('Claims'), v = sh.getDataRange().getValues(), h = v[0];
  const ai = h.indexOf('approved'), mi = h.indexOf('member_id'), pi = h.indexOf('points'), ac = h.indexOf('action');
  let given = 0;
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][ai]).trim().toLowerCase() !== 'yes') continue;
    const pts = Number(v[i][pi]) || 0, id = v[i][mi];
    if (pts > 0 && id) {
      addPoints_(id, pts, 'Claim: ' + v[i][ac]);
      given++;
      const m = findRow_('Members', 'member_id', id);
      if (m && m.email) {
        const fresh = findRow_('Members', 'member_id', id) || m;
        MailApp.sendEmail({ to: m.email, name: 'Retro Reverb Records', subject: '+' + pts + ' points: ' + v[i][ac],
          body: 'Nice one! Your claim was approved: +' + pts + ' points.\n\nYou now have ' + (fresh.points || '') + ' points (' + (fresh.rank || '') + ').\n' +
            'See your belt: ' + SETTINGS.siteUrl + 'member.html?id=' + encodeURIComponent(id) + '\n\nRetro Reverb Records' });
      }
    }
    sh.getRange(i + 1, ai + 1).setValue('yes – points given');
  }
  return given;
}

// ============================================================
// FOUNDING MEMBERS — run once: select setupFounders above, click Run.
// Cybertronix: founder, 10th Dan. Eden Future: ambassador, starts at 3rd Dan.
// Safe to run again: it never adds anyone twice.
// ============================================================
const FOUNDERS = [
  { member_id: 'RRR-00001', artist: 'Cybertronix', name: 'Cybertronix', email: SETTINGS.ownerEmail, role: 'Founder', points: 20000, status: 'active (founder)' },
  { member_id: 'RRR-00002', artist: 'Eden Future', name: 'Eden Future', email: '', role: 'Ambassador', points: 4200, status: 'active (ambassador)' }
];
function setupFounders() {
  FOUNDERS.forEach(f => {
    if (!findRow_('Members', 'member_id', f.member_id))
      append_('Members', { member_id: f.member_id, created: new Date(), type: 'artist', name: f.name, artist: f.artist, email: f.email, status: f.status, plan: 'honorary', public: 'yes' });
    if (!rows_('Achievements').some(r => r.member_id === f.member_id && r.achievement === f.role))
      append_('Achievements', { member_id: f.member_id, achievement: f.role, earned_on: new Date(), points: f.points, note: f.role + ' starting rank' });
    recalcPoints_(f.member_id);
  });
  return 'Founders ready: RRR-00001 Cybertronix (10th Dan), RRR-00002 Eden Future (3rd Dan). Add Eden Future\'s email in the Members tab.';
}

// ============================================================
// RRR SELECTED RELEASES (genre series)
// Membership and release affiliation are SEPARATE things:
//  - Members tab: artist_type (Member / Signed), bandcamp_linked (yes / no)
//  - Releases tab: one row per release, each with its own affiliation.
// Only releases YOU set to "RRR Genre Release" or "RRR Signed Release" get RRR branding.
// Nothing is ever inferred from membership. Membership is non-exclusive.
//
// To approve: in the Releases tab set affiliation to "RRR Genre Release" and pick a series.
// Then RRR menu → Process release decisions now (or wait for the daily run).
// The catalogue number (e.g. RRSYN-001) is added and the artist is emailed.
// To turn one down: set affiliation to "Rejected".
// To add a series: add a line to SERIES (and to assets/config.js on the website).
// ============================================================
const SERIES = [
  { name: 'RRR SYNTH',       prefix: 'RRSYN'  },
  { name: 'RRR DARK',        prefix: 'RRDRK'  },
  { name: 'RRR ELECTRONIC',  prefix: 'RRELEC' },
  { name: 'RRR AMBIENT',     prefix: 'RRAMB'  },
  { name: 'RRR ALTERNATIVE', prefix: 'RRALT'  }
];
const AFFILIATIONS = ['Pending review', 'RRR Genre Release', 'RRR Signed Release', 'Independent', 'Other Label', 'Unspecified', 'Rejected'];
const RRR_AFFILIATIONS = ['RRR Genre Release', 'RRR Signed Release'];

function isEligible_(m) {
  return !!m && m.type === 'artist' && /active/i.test(String(m.status)) && /^y/i.test(String(m.bandcamp_linked)) && inGoodStanding_(m);
}

function handleReleaseSubmission_(p) {
  const id = String(p.member_id || '').trim().toUpperCase();
  const m = findRow_('Members', 'member_id', id);
  const forRrr = p.intent !== 'log';
  if (!m || m.type !== 'artist') { log_('release submission refused', id + ' not an artist member'); return text_('ok'); }
  if (!inGoodStanding_(m)) { log_('release submission refused', id + ' ' + standing_(m)); return text_('ok'); }
  if (forRrr && !isEligible_(m)) { log_('release submission refused', id + ' not eligible (membership or Bandcamp link)'); return text_('ok'); }
  const affiliation = forRrr ? 'Pending review' : (p.affiliation === 'Other Label' ? 'Other Label' : 'Independent');
  const url = String(p.bandcamp_url || '').trim();
  append_('Releases', {
    release_id: 'REL-' + Date.now().toString(36).toUpperCase(), created: new Date(), member_id: id,
    artist: p.artist || m.artist || m.name, email: m.email, title: p.title, bandcamp_url: url,
    artwork_url: p.artwork_url || bandcampArtwork_(url), genre: p.genre, subgenre: p.subgenre, release_date: p.release_date,
    description: String(p.description || '').slice(0, 600), why_fit: String(p.why_fit || '').slice(0, 800),
    spotify_url: p.spotify_url, youtube_url: p.youtube_url, affiliation: affiliation,
    series: forRrr ? (p.series || '') : '', featured: 'no',
    audio_url: String(p.audio_url || '').trim(), ai_declared: p.ai_use || ''
  });
  if (forRrr) notify_('RRR Selected Release submitted: ' + (p.artist || m.artist) + ' – ' + (p.title || ''),
    'Bandcamp: ' + url + '\nAI declared: ' + (p.ai_use || '-') + '\nSuggested series: ' + (p.series || '-') + '\nWhy it fits: ' + (p.why_fit || '') +
    '\n\nTo approve: in the Releases tab set affiliation to "RRR Genre Release", choose a series, then RRR menu → Process release decisions now.\n' + sheetUrl_());
  return text_('ok');
}

// Cover art from the Bandcamp page (og:image), so artists don't have to upload it
function bandcampArtwork_(url) {
  if (!/^https:\/\/[a-z0-9-]+\.bandcamp\.com\//i.test(url)) return '';
  try {
    const html = UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText();
    const mm = html.match(/<meta property="og:image" content="([^"]+)"/);
    return mm ? mm[1] : '';
  } catch (e) { return ''; }
}

function processReleaseDecisions() {
  const sh = sheet_('Releases'), v = sh.getDataRange().getValues(), h = v[0];
  const col = k => h.indexOf(k);
  const c = { aff: col('affiliation'), ser: col('series'), cat: col('catalogue_no'), app: col('approved_on'), not: col('notified'),
              notes: col('admin_notes'), title: col('title'), email: col('email'), artist: col('artist') };
  const used = {};
  v.slice(1).forEach(r => { const n = String(r[c.cat] || ''); const mm = n.match(/^([A-Z]+)-(\d+)$/); if (mm) used[mm[1]] = Math.max(used[mm[1]] || 0, Number(mm[2])); });
  let done = 0;
  for (let i = 1; i < v.length; i++) {
    const aff = String(v[i][c.aff]).trim(), row = i + 1;
    if (RRR_AFFILIATIONS.indexOf(aff) >= 0 && !v[i][c.cat]) {
      const s = SERIES.find(x => x.name === String(v[i][c.ser]).trim());
      if (!s && aff === 'RRR Genre Release') { sh.getRange(row, c.notes + 1).setValue('Choose a series to finish approving'); continue; }
      const prefix = s ? s.prefix : 'RRSIG';
      used[prefix] = (used[prefix] || 0) + 1;
      const num = prefix + '-' + String(used[prefix]).padStart(3, '0');
      sh.getRange(row, c.cat + 1).setValue(num);
      sh.getRange(row, c.app + 1).setValue(new Date());
      done++;
      if (SETTINGS.releaseDecisionEmails && v[i][c.email] && !v[i][c.not]) {
        MailApp.sendEmail({ to: v[i][c.email], name: 'Retro Reverb Records', subject: '"' + v[i][c.title] + '" is an RRR Selected Release (' + num + ')',
          body: 'Great news! "' + v[i][c.title] + '" has been approved as ' + (s ? s.name + ' · Selected Release' : 'an RRR Signed Release') +
            ', catalogue number ' + num + '.\n\nOnly this release carries RRR status. Your other music stays exactly as it is, and your Bandcamp payments still go directly to you.\n\n' +
            'See it: ' + SETTINGS.siteUrl + 'series.html\n\nRetro Reverb Records' });
        sh.getRange(row, c.not + 1).setValue('approved ' + new Date().toISOString().slice(0, 10));
      }
    }
    if (aff === 'Rejected' && !v[i][c.not] && v[i][c.email] && SETTINGS.releaseDecisionEmails) {
      MailApp.sendEmail({ to: v[i][c.email], name: 'Retro Reverb Records', subject: 'Your RRR Selected Release submission: "' + v[i][c.title] + '"',
        body: 'Thanks for submitting "' + v[i][c.title] + '". It hasn\'t been selected for an RRR series this time.\n\n' +
          'Nothing changes for this release: it stays yours, on your Bandcamp page, and you\'re welcome to submit future releases.\n\nRetro Reverb Records' });
      sh.getRange(row, c.not + 1).setValue('not selected ' + new Date().toISOString().slice(0, 10));
      done++;
    }
  }
  return done;
}
function processReleasesNow() {
  const n = processReleaseDecisions();
  SpreadsheetApp.getUi().alert(n ? 'Done: ' + n + ' release decision(s) processed.' : 'Nothing new. Set affiliation to "RRR Genre Release" (and pick a series) or "Rejected" first.');
}

function publicSelectedReleases_() {
  const today = new Date();
  const removed = rows_('Members').filter(m => standing_(m) === 'removed').map(m => m.member_id);
  return rows_('Releases').filter(r => RRR_AFFILIATIONS.indexOf(String(r.affiliation)) >= 0 && r.catalogue_no && removed.indexOf(r.member_id) < 0)
    .map(r => ({ artist: r.artist, title: r.title, artwork: r.artwork_url, genre: r.genre, subgenre: r.subgenre, date: r.release_date,
      series: r.series, catalogue: r.catalogue_no, affiliation: r.affiliation, url: r.bandcamp_url, spotify: r.spotify_url, youtube: r.youtube_url,
      description: r.description, featured: /^y|true/i.test(String(r.featured)),
      status: r.status || (r.release_date && new Date(r.release_date) > today ? 'Upcoming' : 'Out now'), added: r.approved_on }))
    .sort((a, b) => (b.featured - a.featured) || (new Date(b.date || 0) - new Date(a.date || 0)));
}

// Dropdowns in the sheet so choices are always spelled right
function applyValidations_() {
  const list = (vals) => SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(false).build();
  const set = (tab, colName, rule) => { const sh = sheet_(tab), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], ci = h.indexOf(colName);
    if (ci >= 0) sh.getRange(2, ci + 1, 999, 1).setDataValidation(rule); };
  set('Releases', 'affiliation', list(AFFILIATIONS));
  set('Releases', 'series', list(SERIES.map(s => s.name)));
  set('Releases', 'featured', list(['yes', 'no']));
  set('Members', 'artist_type', list(['Member', 'Signed']));
  set('Members', 'bandcamp_linked', list(['yes', 'no']));
  set('Members', 'bandcamp_pro', list(['yes', 'no', 'eligible']));
  set('Members', 'link_method', list(['password', 'invite']));
  set('Members', 'standing', list(['good', 'warning', 'suspended', 'removed']));
  set('Withdrawals', 'refund_status', list(['to do', 'refunded', 'not due']));
}

// ============================================================
// SAFETY: warnings, suspensions, removals (Code of Conduct → Blocking and removing abusive users)
// In the Members tab set "standing" to warning / suspended / removed.
//  - suspended: no bookings, claims or submissions; dashboard shows "suspended"
//  - removed: profile hidden, RRR releases unlisted, email blocked from joining again
// You get a checklist email for the things only you can do (PayPal, Discord, Bandcamp).
// Always email the member yourself: what you decided, which rule, why, how to appeal (14 days).
// ============================================================
function standing_(m) { return String((m && m.standing) || 'good').trim().toLowerCase() || 'good'; }
function inGoodStanding_(m) { const s = standing_(m); return s !== 'suspended' && s !== 'removed'; }

function processStanding_() {
  const blocked = rows_('Blocked');
  let n = 0;
  rows_('Members').forEach(m => {
    const s = standing_(m);
    if (s !== 'suspended' && s !== 'removed') return;
    if (blocked.some(b => b.member_id === m.member_id && String(b.standing).toLowerCase() === s)) return;
    append_('Blocked', { email: String(m.email || '').toLowerCase(), member_id: m.member_id, standing: s, since: new Date(), reason: m.admin_notes || '', owner_checklist_sent: 'yes' });
    n++;
    const who = (m.artist || m.name || '') + ' (' + m.member_id + ', ' + m.email + ')';
    notify_((s === 'removed' ? 'Removal' : 'Suspension') + ' checklist: ' + who,
      (s === 'removed'
        ? 'Done automatically: profile hidden, RRR releases unlisted from the website, bookings/claims/submissions refused, email blocked from joining again.\n\nYour checklist:\n1. PayPal: cancel their subscription (Activity → subscription → Cancel).\n2. Refund upload fees for releases not uploaded yet (Refund Policy section 5).\n3. Discord: remove or ban them.\n4. Bandcamp: remove them from the RRR label roster and RRR branding from their releases.\n5. Email them: what you decided, which rule, why, and that they can appeal within 14 days by replying.'
        : 'Done automatically: bookings, claims and submissions are refused and their dashboard shows "suspended".\n\nYour checklist:\n1. PayPal: suspend (pause) their subscription for the suspension period.\n2. Discord: mute them or give them a timeout.\n3. Email them: what you decided, which rule, why, how long (max 30 days), and that they can appeal within 14 days by replying.\n4. When it ends: set standing back to good and restart their PayPal subscription.') +
      '\n\n' + sheetUrl_());
  });
  return n;
}
function processStandingNow() {
  const n = processStanding_();
  SpreadsheetApp.getUi().alert(n ? n + ' change(s) applied. Check your email for the checklist.' : 'Nothing new. Set "standing" in the Members tab first.');
}

// ============================================================
// WITHDRAWAL (14 days to change your mind: EU Directive 2023/2673, Codice del Consumo art. 54-bis)
// The website's "Withdraw from contract here" page sends here. The person gets an
// acknowledgement email straight away (required), and you get a refund reminder.
// ============================================================
function handleWithdrawal_(p) {
  const now = new Date(), refundBy = new Date(now.getTime() + 14 * 86400000);
  const email = String(p.email || '').trim();
  let ack = 'no';
  if (email) {
    try {
      MailApp.sendEmail({ to: email, name: 'Retro Reverb Records', subject: 'We have received your withdrawal',
        body: 'Hi ' + (p.name || '') + ',\n\nWe received your withdrawal on ' + now.toUTCString() + '.\n\n' +
          'You withdrew from: ' + (p.what || '') + (p.detail ? ' (' + p.detail + ')' : '') + '\nMember ID: ' + (p.member_id || '-') + '\n\n' +
          'If you are within your 14 days, we refund what is due under our Refund Policy within 14 days, to the payment method you used: ' + SETTINGS.siteUrl + 'refunds.html\n\n' +
          'Keep this email as your receipt.\n\nRetro Reverb Records' });
      ack = 'yes ' + now.toISOString();
    } catch (e) { log_('withdrawal ack failed', String(e)); }
  }
  append_('Withdrawals', { received: now, name: p.name, email: email, member_id: String(p.member_id || '').toUpperCase(), contract_date: p.contract_date,
    what: p.what, detail: String(p.detail || '').slice(0, 500), sent_at: p.sent_at, acknowledged: ack, refund_by: refundBy, refund_status: 'to do' });
  notify_('WITHDRAWAL: ' + (p.name || email) + ' – ' + (p.what || ''), 'Refund what is due by ' + refundBy.toDateString() + ' (legal deadline: 14 days).\n' +
    '1. Check the date they joined/booked is within 14 days.\n2. Refund in PayPal (and cancel their subscription if it is the membership).\n3. Set refund_status in the Withdrawals tab.\n\n' + sheetUrl_());
  return text_('ok');
}

// ============================================================
// ROBOT CHECKS (AI flag + sound) — run by GitHub Actions every 30 minutes
// (.github/workflows/release-checks.yml). Set once: Apps Script → Project Settings →
// Script properties → AI_CHECK_KEY = the same secret as the GitHub secret AI_CHECK_KEY.
// The AI score is only a FLAG: a human decides, or the artist declares AI use.
// ============================================================
function aiKeyOk_(k) { const want = PropertiesService.getScriptProperties().getProperty('AI_CHECK_KEY'); return !!want && String(k || '') === want; }

function aiQueue_(key) {
  if (!aiKeyOk_(key)) return json_({ ok: false, error: 'bad key' });
  const items = rows_('Releases').filter(r => !r.ai_checked && (r.audio_url || r.bandcamp_url) && !/^Rejected$/i.test(String(r.affiliation)))
    .slice(0, 10).map(r => ({ sheet: 'Releases', id: r.release_id, url: r.audio_url || r.bandcamp_url }));
  return json_({ ok: true, items: items });
}

function handleAiResult_(p) {
  if (!aiKeyOk_(p.key)) { log_('ai-result refused', 'bad key'); return text_('ok'); }
  const sh = sheet_('Releases'), v = sh.getDataRange().getValues(), h = v[0];
  const col = k => h.indexOf(k) + 1;
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][h.indexOf('release_id')]) !== String(p.id)) continue;
    const row = i + 1;
    sh.getRange(row, col('ai_score')).setValue(p.ai_score);
    sh.getRange(row, col('ai_result')).setValue(p.ai_result);
    sh.getRange(row, col('sound_check')).setValue([p.sound, p.lufs !== '' && p.lufs !== undefined ? p.lufs + ' LUFS' : '', p.true_peak !== '' && p.true_peak !== undefined ? p.true_peak + ' dBTP peak' : ''].filter(String).join(' · '));
    sh.getRange(row, col('ai_checked')).setValue(new Date());
    const declared = String(v[i][h.indexOf('ai_declared')] || 'none');
    const flagged = /AI/.test(String(p.ai_result)) && !/human/.test(String(p.ai_result));
    if (flagged && !/generated|heavy/i.test(declared)) {
      sh.getRange(row, col('admin_notes')).setValue('AI FLAG (' + p.ai_score + ') but declared "' + declared + '": listen, or ask the artist to declare. AI-generated = streaming only.');
      notify_('AI flag: ' + v[i][h.indexOf('artist')] + ' – ' + v[i][h.indexOf('title')],
        'The robot check scored this release ' + p.ai_score + ' (' + p.ai_result + '), but the artist declared "' + declared + '".\n\n' +
        'It is only a flag. Listen to it, or ask the artist to declare AI use. Heavily AI-generated music can go to streaming only (Bandcamp bans it).\n\n' + sheetUrl_());
    } else if (/sound|clipping|loud|quiet|silence/i.test(String(p.sound)) && String(p.sound) !== 'OK') {
      sh.getRange(row, col('admin_notes')).setValue('Sound check: ' + p.sound);
    }
    return text_('ok');
  }
  log_('ai-result: release not found', String(p.id));
  return text_('ok');
}

// Sheet menu so you don't have to wait for the daily run
function onOpen() {
  SpreadsheetApp.getUi().createMenu('RRR')
    .addItem('Give approved points now', 'approveClaimsNow')
    .addItem('Process release decisions now', 'processReleasesNow')
    .addItem('Apply suspensions and removals now', 'processStandingNow')
    .addToUi();
  try { applyValidations_(); } catch (e) {}
}
function approveClaimsNow() {
  const n = approveClaims();
  SpreadsheetApp.getUi().alert(n ? 'Done: points given for ' + n + ' claim(s). Members were emailed.' : 'No new approved claims. Type yes in the "approved" column first.');
}

// Card / wallet payments made through PayPal checkout on the site (one-off fees)
function handleCardPayment_(p) {
  append_('Payments', { received: new Date(), txn_type: 'checkout', payment_status: p.status || 'COMPLETED', amount: p.amount, currency: 'EUR',
    item_name: p.item, payer_email: p.payer_email || '', member_id: p.custom || '', txn_id: p.order_id || '', subscr_id: '', raw: 'from website – check in PayPal' });
  notify_('RRR one-off payment – ' + (p.amount || '') + ' EUR – ' + (p.item || ''), 'Order ' + (p.order_id || '') + '\nCheck it in PayPal.\n\n' + sheetUrl_());
  return text_('ok');
}

// ============================================================
// MONTHLY NEWSLETTER (fully automatic)
// Content: releases last month, coming next month, top social posts, new members, playlist.
// ============================================================
function setting_(key, fallback) {
  const r = findRow_('Settings', 'key', key);
  return r && r.value !== '' ? r.value : fallback;
}
// 'm2026-09' (the m stops Sheets turning it into a date)
function monthKey_(d) { return 'm' + Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM'); }

function buildNewsletter_(forDate) {
  const start = new Date(forDate.getFullYear(), forDate.getMonth() - 1, 1);
  const end = new Date(forDate.getFullYear(), forDate.getMonth(), 1);
  const nextEnd = new Date(forDate.getFullYear(), forDate.getMonth() + 1, 1);
  const inRange = (d, a, b) => { const x = new Date(d); return x >= a && x < b; };
  const monthName = Utilities.formatDate(start, Session.getScriptTimeZone(), 'MMMM yyyy');
  const releases = rows_('Bookings').filter(r => /release/.test(r.kind) && r.date && inRange(r.date, start, end) && !/cancel/i.test(r.status));
  const upcoming = rows_('Bookings').filter(r => /release/.test(r.kind) && r.date && inRange(r.date, end, nextEnd) && !/cancel/i.test(r.status));
  const posts = topPosts_(start, end);
  const newMembers = rows_('Members').filter(r => r.created && inRange(r.created, start, end) && /active/.test(r.status) && r.type === 'artist');
  const press = rows_('Press').filter(r => String(r.approved).toLowerCase() === 'yes' && inRange(r.created, start, end));
  const li = (arr, f) => arr.length ? '<ul>' + arr.map(x => '<li>' + f(x) + '</li>').join('') + '</ul>' : '<p style="color:#A99FCB">Nothing this month.</p>';
  const h = (t) => '<h2 style="font-family:Arial Black,Arial;color:#FF2FA8;text-transform:uppercase;letter-spacing:1px;font-size:18px;margin:28px 0 8px">' + t + '</h2>';
  const html =
    '<div style="background:#07061A;color:#F3EEFF;font-family:Arial,sans-serif;padding:28px;max-width:620px;margin:auto">' +
    '<p style="color:#3FD0FF;font-size:12px;letter-spacing:2px">RETRO REVERB RECORDS · ' + monthName.toUpperCase() + '</p>' +
    '<h1 style="font-family:Arial Black,Arial;font-size:26px;margin:4px 0 16px">This month in the RRR community</h1>' +
    h('Released last month') + li(releases, r => '<b>' + r.artist + '</b> – ' + r.title + ' <span style="color:#A99FCB">(' + (r.format || '') + ')</span>') +
    h('Top social posts') + li(posts, p => '<a style="color:#3FD0FF" href="' + p.link + '">' + (p.caption || 'Post') + '</a> <span style="color:#A99FCB">' + p.score + ' interactions</span>') +
    h('Coming next month') + li(upcoming, r => '<b>' + r.artist + '</b> – ' + r.title + ' · ' + Utilities.formatDate(new Date(r.date), Session.getScriptTimeZone(), 'd MMM')) +
    (press.length ? h('In the press') + li(press, p => '<a style="color:#3FD0FF" href="' + p.url + '">' + p.artist + ' in ' + p.outlet + '</a>') : '') +
    (newMembers.length ? h('Welcome to the roster') + li(newMembers, m => m.artist || m.name) : '') +
    h('Listen') + '<p><a style="color:#3FD0FF" href="' + SETTINGS.spotifyPlaylist + '">The RRR playlist on Spotify</a> · <a style="color:#3FD0FF" href="https://retroreverbrecords.bandcamp.com/">RRR on Bandcamp</a></p>' +
    '<p style="margin-top:28px"><a href="' + SETTINGS.siteUrl + '" style="background:#FF2FA8;color:#fff;padding:12px 18px;text-decoration:none;font-weight:bold">Visit RRR</a></p>' +
    '<p style="color:#A99FCB;font-size:11px;margin-top:28px">You get this because you signed up on the RRR website. {{UNSUB}}</p></div>';
  return { subject: 'RRR ' + monthName + ': new releases, top posts and what\'s next', html: html, month: monthKey_(start) };
}

// Top posts: from Instagram (if connected) plus any views/likes you type in the Posts tab
function topPosts_(start, end) {
  const out = [];
  const tok = PropertiesService.getScriptProperties().getProperty('IG_ACCESS_TOKEN');
  const igUser = PropertiesService.getScriptProperties().getProperty('IG_USER_ID');
  if (tok && igUser) {
    try {
      const res = UrlFetchApp.fetch('https://graph.facebook.com/v19.0/' + igUser + '/media?fields=caption,permalink,timestamp,like_count,comments_count&limit=50&access_token=' + tok, { muteHttpExceptions: true });
      const data = JSON.parse(res.getContentText()).data || [];
      data.filter(m => { const t = new Date(m.timestamp); return t >= start && t < end; })
        .forEach(m => out.push({ link: m.permalink, caption: String(m.caption || '').split('\n')[0].slice(0, 80), score: (m.like_count || 0) + (m.comments_count || 0) }));
    } catch (err) { log_('instagram', String(err)); }
  }
  rows_('Posts').filter(r => r.link && r.date && new Date(r.date) >= start && new Date(r.date) < end && (Number(r.likes) || Number(r.views)))
    .forEach(r => out.push({ link: r.link, caption: r.caption || r.platform, score: (Number(r.likes) || 0) + (Number(r.views) || 0) }));
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Runs every day from daily(): preview on the 28th, queue on the 1st, send in batches
function newsletterTick_() {
  const mode = String(setting_('newsletter_mode', SETTINGS.newsletterMode)).toLowerCase();
  if (mode === 'off') return;
  const today = new Date();
  if (today.getDate() === 28) {
    const nextFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const n = buildNewsletter_(nextFirst);
    MailApp.sendEmail({ to: SETTINGS.ownerEmail, subject: 'PREVIEW – ' + n.subject + (mode === 'auto' ? ' (sends automatically on the 1st)' : ''),
      htmlBody: n.html.replace('{{UNSUB}}', '') + '<p>To stop this month\'s send, set newsletter_mode to "preview" in the Settings tab before the 1st.</p>' });
  }
  if (mode === 'auto' && today.getDate() === 1) {
    const n = buildNewsletter_(today);
    if (!findRow_('Newsletter', 'month', n.month)) {
      const subs = rows_('Subscribers').filter(r => r.status === 'subscribed');
      subs.forEach(r => append_('Queue', { email: r.email, month: n.month, sent: '' }));
      append_('Newsletter', { month: n.month, created: new Date(), subject: n.subject, sent_to: 0, queued: subs.length, status: 'sending' });
    }
  }
  sendQueued_();
}
function sendQueued_() {
  const sh = sheet_('Queue'), v = sh.getDataRange().getValues();
  let budget = Math.min(SETTINGS.dailySendLimit, MailApp.getRemainingDailyQuota() - 5);
  const cache = {};
  for (let i = 1; i < v.length && budget > 0; i++) {
    if (v[i][2]) continue;
    const email = v[i][0], month = v[i][1];
    const sub = findRow_('Subscribers', 'email', email);
    if (!sub || sub.status !== 'subscribed') { sh.getRange(i + 1, 3).setValue('skipped'); continue; }
    if (!cache[month]) { const [y, m] = String(month).slice(1).split('-').map(Number); cache[month] = buildNewsletter_(new Date(y, m, 1)); }
    const n = cache[month];
    const unsub = ScriptApp.getService().getUrl() + '?unsubscribe=' + encodeURIComponent(sub.token);
    MailApp.sendEmail({ to: email, subject: n.subject, name: 'Retro Reverb Records',
      htmlBody: n.html.replace('{{UNSUB}}', '<a style="color:#A99FCB" href="' + unsub + '">Unsubscribe</a>') });
    sh.getRange(i + 1, 3).setValue(new Date());
    budget--;
  }
}
