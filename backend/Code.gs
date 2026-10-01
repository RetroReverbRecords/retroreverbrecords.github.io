/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
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
  // Your upload deadlines (alerts to you): RouteNote this many days before release; Bandcamp on release day.
  streamingUploadDays: 14,
  // Optional phone alerts: install the free ntfy app, subscribe to a secret topic name, put it here (e.g. 'rrr-jobs-x7k2p9').
  ntfyTopic: '',
  // Demo / walkthrough accounts: sign up with retroreverbrecords+anything@gmail.com.
  // They skip payment, bookings confirm without paying and take no real dates or calendar slots.
  // Remove them with the menu: RRR → Remove demo test data.
  demoEmailPrefix: 'retroreverbrecords+',
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
  maxReleasesPerWeek: 0,       // release slots per week (Mon–Sun). 0 = no limit. Over the limit, bookings are flagged 'date full' for you
  // Slots per day. A date is only taken once the booking is PAID (first to pay gets it).
  // How many bookings each day can take. Change the numbers any time.
  slotsPerDay: { 'bandcamp-release': 1, 'streaming-release': 3, 'youtube-upload': 2, 'social-post': 2 },
  paidKinds: ['bandcamp-release', 'streaming-release', 'youtube-upload', 'merch-listing']
};

// Sheet tabs and their columns. Created automatically on first run.
const TABS = {
  Members:      ['member_id','created','type','name','artist','email','country','address_line1','address_line2','city','postcode','bandcamp','status','plan','paypal_subscr_id','points','rank','songstats_artist_id','public','referred_by','artist_type','bandcamp_linked','bandcamp_pro','admin_notes','link_method','standing','payment_issue_since','payment_chase','role','admin_key','spotify'],
  Agreements:   ['member_id','signed_at_server','signed_at_client','signature_name','email','type','terms_version','agreed_terms_conduct_privacy','agreed_ai_release_policy','agreed_bandcamp_link','user_agent','page','copy_emailed'],
  Payments:     ['received','txn_type','payment_status','amount','currency','item_name','payer_email','member_id','txn_id','subscr_id','raw'],
  Bookings:     ['created','kind','member_id','artist','email','title','format','date','details','status','calendar_event_id','booking_id','paid_amount','txn_id','uploaded'],
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
                 'audio_url','ai_declared','ai_score','ai_result','sound_check','ai_checked','ai_case'],
  Feedback:     ['created','type','rating','message','page','email','member_id','status'],
  ModLog:       ['when','admin_id','admin_name','member_id','member_name','action','reason'],
  Links:        ['created','member_id','artist','email','bandcamp_url','method','temp_password','token','status','ready_at','linked_at','notified'],
  Disputes:     ['case','created','release_id','member_id','artist','email','title','reason','proof_types','proof_links','files','used_ai_tools','status','decision_notes','notified'],
  Newsletter:   ['month','created','subject','sent_to','queued','status'],
  Queue:        ['email','month','sent'],
  Settings:     ['key','value'],
  Log:          ['time','what','detail']
};

// Karate belts, then Dans. Keep in step with assets/levels.js on the website.
const RANKS = [
  { name: 'White belt', min: 0 }, { name: 'Yellow belt', min: 100 }, { name: 'Orange belt', min: 250 },
  { name: 'Green belt', min: 450 }, { name: 'Blue belt', min: 700 }, { name: 'Purple belt', min: 1000 },
  { name: 'Brown belt', min: 1400 }, { name: 'Black belt · 1st Dan', min: 2000 }, { name: '2nd Dan', min: 2700 },
  { name: '3rd Dan', min: 3400 }, { name: '4th Dan', min: 4200 }, { name: '5th Dan', min: 5000 },
  { name: '6th Dan', min: 5900 }, { name: '7th Dan', min: 6900 }, { name: '8th Dan', min: 7900 },
  { name: '9th Dan', min: 9000 }, { name: '10th Dan', min: 10000 }
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
    if (kind === 'ai-dispute') return handleDispute_(p);
    if (kind === 'feedback') {
      append_('Feedback', { created: new Date(), type: p.type, rating: p.rating || '', message: String(p.message || '').slice(0, 3000), page: String(p.page || '').slice(0, 200), email: p.email || '', member_id: String(p.member_id || '').toUpperCase(), status: 'new' });
      notify_('RRR feedback (' + (p.type || 'other') + (p.rating ? ', ' + p.rating + '/5' : '') + ')', String(p.message || '') + '\n\nPage: ' + (p.page || '-') + '\nReply to: ' + (p.email || 'no email given') + '\n' + sheetUrl_());
      return text_('ok');
    }
    if (kind === 'link-request') return handleLinkRequest_(p);
    if (kind === 'mod-action') return handleModAction_(p);
    if (/^submit-/.test(kind) && typeof handleSubmitForm_ === 'function') return handleSubmitForm_(kind, p); // RRR Submit (Submit.gs)
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
  if (q.slot) return json_(slotInfo_(q.slot, q.date));
  if (q.slots) return json_(slotsFull_(q.slots));
  if (q.linkready) return linkReady_(q.linkready, q.json);
  if (q.mod) return modList_(q.mod);
  if ((q.curators || q.queue) && typeof submitGet_ === 'function') return submitGet_(q); // RRR Submit (Submit.gs)
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
    city: p.city, postcode: p.postcode, bandcamp: p.bandcamp, status: isDemo_(p.email) ? 'active (demo)' : 'pending payment',
    plan: p.type === 'artist' ? 'Artist' : 'Fan', points: 0, rank: 'White belt', public: 'yes',
    artist_type: p.type === 'artist' ? 'Member' : '', bandcamp_linked: p.type === 'artist' ? 'no' : ''
  });
  award_(id, 'joined');

  // Signed agreement: stored, and a copy emailed to the member
  const isArtist = p.type === 'artist';
  const version = p.terms_version || '';
  let emailed = 'no';
  try {
    MailApp.sendEmail({ to: p.email, name: 'Retro Reverb Records', subject: 'Welcome to the family, ' + (p.artist || p.name || '') + '! Your RRR member ID ' + id,
      htmlBody: welcomeEmail_(p, id, version, isArtist) });
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
    'Member ID: ' + id + '\nEmail: ' + p.email + (isDemo_(p.email) ? '\nDEMO account: payment skipped, already active.' : '\nWaiting for PayPal payment.') + '\n\nMembers sheet: ' + sheetUrl_());
  return text_('ok');
}

// ============================================================
// BOOKINGS → sheet + calendar
// ============================================================
// Welcome email: friendly first, the signed-agreement record underneath
function welcomeEmail_(p, id, version, isArtist) {
  const u = SETTINGS.siteUrl, dash = u + 'member.html?id=' + id, demo = isDemo_(p.email);
  const when = Utilities.formatDate(new Date(), 'Europe/Rome', "d MMMM yyyy 'at' HH:mm 'Italy time'");
  const yes = v => v === 'yes' ? 'yes' : 'no';
  const btn = (href, text) => '<a href="' + href + '" style="display:inline-block;background:#FF2FA8;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;letter-spacing:.04em">' + text + '</a>';
  const step = (n, html) => '<tr><td style="vertical-align:top;padding:6px 12px 6px 0;font:700 18px Arial,sans-serif;color:#3FD0FF">' + n + '</td><td style="padding:6px 0;font:15px/1.5 Arial,sans-serif;color:#222">' + html + '</td></tr>';
  const steps = [];
  if (!demo) steps.push('<b>Set up your monthly payment</b> if you haven\'t yet: your account goes live when it arrives.');
  steps.push('<b><a href="' + dash + '" style="color:#E0068A">Open your member dashboard</a></b>: your belt, points and releases. Save it to your phone\'s home screen.');
  if (isArtist) {
    steps.push('<b><a href="' + u + 'series.html#linking" style="color:#E0068A">Link your Bandcamp to RRR</a></b>: needed for Bandcamp releases, and it gets you free Bandcamp VIP.');
    steps.push('<b><a href="' + u + 'book.html" style="color:#E0068A">Book your first release</a></b>: pick a free date, from €2 a single.');
  } else {
    steps.push('<b><a href="' + u + 'cards.html" style="color:#E0068A">Start collecting Synth Stars cards</a></b> and support the artists you love.');
  }
  return '<div style="background:#f4f1fb;padding:24px 12px"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3dcf5">' +
    '<div style="background:#07061A;padding:22px;text-align:center"><img src="' + u + 'assets/rrr-wordmark.png" alt="Retro Reverb Records" width="260" style="max-width:80%;height:auto"><br>' +
    '<img src="' + u + 'assets/welcome-neon.jpg" alt="Welcome to the Family!" width="420" style="max-width:100%;height:auto;margin-top:10px"></div>' +
    '<div style="padding:24px 24px 8px;font:15px/1.55 Arial,sans-serif;color:#222">' +
    '<p style="margin:0 0 12px">Hi ' + (p.name || '') + ',</p>' +
    '<p style="margin:0 0 16px"><b>Welcome to the family!</b> You\'re now part of the RRR Community' + (p.artist ? ' as <b>' + p.artist + '</b>' : '') + '. We\'re really glad you\'re here.</p>' +
    '<div style="border:2px solid #3FD0FF;border-radius:10px;padding:14px 16px;margin:0 0 18px;text-align:center"><div style="font-size:12px;letter-spacing:.14em;color:#666">YOUR MEMBER ID</div><div style="font:700 28px/1.3 Courier New,monospace;letter-spacing:.1em;color:#07061A">' + id + '</div><div style="font-size:13px;color:#666">Keep it safe: it opens your dashboard and forms.</div></div>' +
    (demo ? '<p style="background:#fff3c4;padding:10px 12px;border-radius:8px;margin:0 0 16px"><b>Demo account:</b> payment skipped. This is a test account.</p>' : '') +
    '<p style="margin:0 0 6px;font-weight:700">What next</p><table role="presentation" style="border-collapse:collapse;margin:0 0 18px">' + steps.map((h, i) => step(i + 1, h)).join('') + '</table>' +
    '<p style="text-align:center;margin:0 0 22px">' + btn(dash, 'OPEN MY DASHBOARD') + '</p>' +
    '<p style="margin:0 0 18px">Questions? Just reply to this email.</p>' +
    '<p style="margin:0 0 4px">See you in the community,<br><b>Retro Reverb Records</b></p></div>' +
    '<div style="margin:12px 24px 24px;padding:14px 16px;background:#f7f7f9;border-radius:10px;font:13px/1.5 Arial,sans-serif;color:#555">' +
    '<b style="color:#333">Your signed agreement (keep this email)</b><br>' +
    'Signed by: ' + (p.signature || '') + ' · ' + when + ' · Member ID ' + id + ' · Version ' + version + '<br>' +
    'Agreed to the RRR Member Agreement (Membership Terms, Code of Conduct, Refund Policy, Privacy Policy): ' + yes(p.agree_terms) +
    (isArtist ? '<br>Agreed to the AI-Generated Music Policy and Release Policy: ' + yes(p.agree_ai) + '<br>Understands Bandcamp linking is needed for Bandcamp sales to be paid straight to them: ' + yes(p.agree_link) : '') +
    '<br><a href="' + u + 'agreement.html" style="color:#555">Member Agreement</a> · <a href="' + u + SETTINGS.termsUrl + '" style="color:#555">Terms</a> · <a href="' + u + 'code-of-conduct.html" style="color:#555">Code of Conduct</a> · <a href="' + u + 'refunds.html" style="color:#555">Refunds</a> · <a href="' + u + 'privacy.html" style="color:#555">Privacy</a>' +
    '<br><b>14 days to change your mind:</b> withdraw within 14 days of joining for a full refund of your membership: <a href="' + u + 'withdraw.html" style="color:#555">Withdraw from contract here</a>, or reply to this email.</div>' +
    '</div><p style="text-align:center;font:12px Arial,sans-serif;color:#888;margin:14px 0 0">© Retro Reverb Records · Welcome to the family</p></div>';
}

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
  // Paid bookings are only confirmed (and take their date) when the PayPal payment arrives
  if (SETTINGS.paidKinds.indexOf(kind) >= 0 && p.booking_id) {
    append_('Bookings', { created: new Date(), kind: kind, member_id: memberId, artist: p.artist, email: p.email, title: title, format: p.format || '',
      date: date, details: JSON.stringify(p).slice(0, 1500), status: 'awaiting payment', booking_id: String(p.booking_id).toUpperCase() });
    if (isDemo_(p.email)) confirmBooking_(String(p.booking_id).toUpperCase(), 'demo', 'DEMO');
    return text_('ok');
  }
  const dayFull = !!(date && SETTINGS.slotsPerDay[kind] && !slotFree_(kind, isoDate_(date)));
  if (dayFull) { append_('Bookings', { created: new Date(), kind: kind, member_id: memberId, artist: p.artist, email: p.email, title: title, date: date, details: JSON.stringify(p).slice(0, 1500), status: 'date full – suggest another date' });
    notify_('Booking date full: ' + kind + ' – ' + (p.artist || ''), date + ' was already full. Reply with the next free day: ' + nextFreeDate_(kind, isoDate_(date)) + '\n' + sheetUrl_()); return text_('ok'); }
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
  // YOUR upload jobs, at 9:00 with phone reminders (the day before and at the time)
  const job = (daysBefore, what) => {
    const st = new Date(d); st.setDate(st.getDate() - daysBefore); st.setHours(9, 0, 0, 0);
    const en = new Date(st); en.setMinutes(30);
    try { const ev = cal.createEvent('⬆ UPLOAD ' + what + ': ' + (p.artist || '') + ' – ' + (p.title || ''), st, en, { description: 'Mark "uploaded" = yes in the Bookings tab when done.\n' + sheetUrl_() }); ev.addPopupReminder(0); ev.addPopupReminder(24 * 60); } catch (e) { log_('job event failed', String(e)); }
  };
  if (kind === 'streaming-release' || p.also_streaming) job(SETTINGS.streamingUploadDays, 'to RouteNote');
  if (kind === 'bandcamp-release' && p.upload_by === 'rrr') job(0, 'to Bandcamp');
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
  // Booking payment: custom = booking ID (BK-XXXXXX). Confirms the booking and takes the date.
  if (/^BK-/i.test(String(p.custom || '')) && /completed/i.test(String(p.payment_status || ''))) {
    append_('Payments', { received: new Date(), txn_type: p.txn_type, payment_status: p.payment_status, amount: p.mc_gross || '', currency: p.mc_currency,
      item_name: p.item_name, payer_email: p.payer_email, member_id: '', txn_id: p.txn_id || '', subscr_id: '', raw: raw.slice(0, 2000) });
    confirmBooking_(String(p.custom).toUpperCase(), p.mc_gross, p.txn_id);
    return text_('ok');
  }
  // RRR Submit payment (Submit.gs): custom = submission ID (SUB-XXXXXX)
  if (/^SUB-/i.test(String(p.custom || '')) && /completed/i.test(String(p.payment_status || '')) && typeof confirmSubmissionPayment_ === 'function') {
    append_('Payments', { received: new Date(), txn_type: p.txn_type, payment_status: p.payment_status, amount: p.mc_gross || '', currency: p.mc_currency,
      item_name: p.item_name, payer_email: p.payer_email, member_id: '', txn_id: p.txn_id || '', subscr_id: '', raw: raw.slice(0, 2000) });
    confirmSubmissionPayment_(String(p.custom).toUpperCase(), p.mc_gross, p.txn_id);
    return text_('ok');
  }
  // custom = member ID (subscriptions) or the member's email (one-off fees)
  let memberId = String(p.custom || '').trim();
  if (memberId.indexOf('@') > 0) { const m = findRow_('Members', 'email', memberId); memberId = m ? m.member_id : ''; }
  memberId = memberId.toUpperCase();
  append_('Payments', { received: new Date(), txn_type: p.txn_type, payment_status: p.payment_status, amount: p.mc_gross || p.mc_amount3 || '',
    currency: p.mc_currency, item_name: p.item_name, payer_email: p.payer_email, member_id: memberId, txn_id: p.txn_id || '', subscr_id: p.subscr_id || '', raw: raw.slice(0, 2000) });

  // 3. Update the member
  const t = p.txn_type;
  const setStatus = (status) => { if (memberId) updateRow_('Members', 'member_id', memberId, { status: status, paypal_subscr_id: p.subscr_id || '' }); };
  const mem = memberId ? findRow_('Members', 'member_id', memberId) : null;
  if (t === 'subscr_signup' || t === 'subscr_payment') {
    const wasLocked = mem && /locked|archived|payment failed|lapsed/i.test(String(mem.status));
    setStatus('active');
    if (memberId) updateRow_('Members', 'member_id', memberId, { payment_issue_since: ' ', payment_chase: ' ' });
    if (wasLocked && mem.email) try { MailApp.sendEmail({ to: mem.email, name: 'Retro Reverb Records', subject: 'Welcome back to the family', body: 'Your payment came through and everything is unlocked again: bookings, points and Series. Thanks!\n\n' + SETTINGS.siteUrl + 'member.html?id=' + memberId + '\n\nRetro Reverb Records' }); } catch (e) {}
  }
  if (t === 'subscr_cancel') setStatus('cancelled (active until period ends)');
  if (t === 'subscr_eot' && mem && /^cancelled/i.test(String(mem.status))) setStatus('ended');
  else if (t === 'subscr_failed' || t === 'subscr_eot') startPaymentChase_(mem);

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
    linkStatus: linkStatus_(m.member_id),
    eligible: isEligible_(m),
    programme: rows_('Releases').filter(r => r.member_id === id).map(r => ({ title: r.title, affiliation: r.affiliation || 'Unspecified', aiCase: r.ai_case || '', aiResult: r.ai_result || '',
      series: r.series, catalogue: r.catalogue_no, date: r.release_date, url: r.bandcamp_url, artwork: r.artwork_url })),
    achievements: rows_('Achievements').filter(r => r.member_id === id && r.achievement !== 'Points').map(r => ({ title: r.achievement, on: r.earned_on, points: r.points })),
    recentPoints: rows_('Achievements').filter(r => r.member_id === id && r.achievement === 'Points').slice(-10).reverse().map(r => ({ note: r.note, on: r.earned_on, points: r.points })),
    releases: rows_('Bookings').filter(r => r.member_id === id && /release/.test(r.kind)).map(r => ({ title: r.title, kind: r.kind, format: r.format, date: r.date, status: r.status })),
    posts: rows_('Posts').filter(r => r.member_id === id).map(r => ({ platform: r.platform, date: r.date, link: r.link, status: r.status })),
    links: { bandcamp: /^https:\/\//.test(String(m.bandcamp)) ? m.bandcamp : '', spotify: /^https:\/\/open\.spotify\.com\//.test(String(m.spotify)) ? m.spotify : '' },
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
  processDisputes_();
  processLinks_();
  if (typeof submitDaily_ === 'function') submitDaily_(); // RRR Submit (Submit.gs)
  morningJobs_();
  expireUnpaidBookings_();
  paymentChase_();
  try { cleanDisputeFiles_(); } catch (e) { log_('dispute cleanup failed', String(e)); }
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
  const active = rows_('Members').filter(r => /active/.test(r.status) && !/demo/.test(r.status)).length;
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
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'onEditRRR') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onEditRRR').forSpreadsheet(ss_()).onEdit().create();
  log_('setup', 'done');
}

// Instant actions: when you change a decision cell in the sheet, the follow-up happens straight away
// (emails, points, dashboard updates). No menu clicks needed. Installed by setup().
function onEditRRR(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet(), name = sh.getName(), col = e.range.getColumn(), row = e.range.getRow();
    if (row < 2) return;
    const head = String(sh.getRange(1, col).getValue());
    const jobs = {
      Links: { status: processLinks_ },
      Releases: { affiliation: processReleaseDecisions, series: processReleaseDecisions },
      Claims: { approved: approveClaims },
      Disputes: { status: processDisputes_ },
      Members: { standing: processStanding_ },
      Curators: { status: typeof processCurators_ === 'function' ? processCurators_ : null }
    };
    const job = (jobs[name] || {})[head];
    if (!job) return;
    const lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return;
    try { job(); } finally { lock.releaseLock(); }
  } catch (err) { log_('onEditRRR error', String(err && err.stack || err)); }
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
  { member_id: 'RRR-00001', artist: 'Cybertronix', name: 'Cybertronix', email: SETTINGS.ownerEmail, role: 'Sifu', points: 20000, status: 'active (owner)',
    bandcamp: 'https://cybertronix.bandcamp.com/album/la-leil-the-machine-remembers', spotify: 'https://open.spotify.com/artist/7Mey7ykUYNoMi7LfYxZS8a' }
  // Eden Future signs up himself, then: RRR menu → Make a member an Administrator.
];
function setupFounders() {
  try { applyValidations_(); } catch (e) {}
  FOUNDERS.forEach(f => {
    if (!findRow_('Members', 'member_id', f.member_id))
      append_('Members', { member_id: f.member_id, created: new Date(), type: 'artist', name: f.name, artist: f.artist, email: f.email, status: f.status, plan: 'honorary', public: 'yes' });
    const m = findRow_('Members', 'member_id', f.member_id) || {};
    // Owner: all permissions (moderation page too), 10th Dan, Sifu badge, profile links
    updateRow_('Members', 'member_id', f.member_id, { name: f.name, artist: f.artist, email: f.email, status: f.status, plan: 'honorary', role: 'Owner', standing: 'good',
      admin_key: m.admin_key || Utilities.getUuid().replace(/-/g, ''), bandcamp: f.bandcamp || '', spotify: f.spotify || '', bandcamp_linked: 'yes', artist_type: 'Signed' });
    if (!rows_('Achievements').some(r => r.member_id === f.member_id && r.achievement === f.role)) {
      recalcPoints_(f.member_id);
      const now = Number((findRow_('Members', 'member_id', f.member_id) || {}).points) || 0;
      append_('Achievements', { member_id: f.member_id, achievement: f.role, earned_on: new Date(), points: Math.max(0, f.points - now), note: f.role + ': 10th Dan, owner of RRR' });
    }
    recalcPoints_(f.member_id);
  });
  const o = findRow_('Members', 'member_id', 'RRR-00001') || {};
  try { MailApp.sendEmail(SETTINGS.ownerEmail, 'Your RRR owner account (RRR-00001)', 'Dashboard: ' + SETTINGS.siteUrl + 'member.html?id=RRR-00001\nModeration page (keep private): ' + SETTINGS.siteUrl + 'mod.html?k=' + o.admin_key); } catch (e) {}
  return 'Owner ready: RRR-00001 Cybertronix, 10th Dan Sifu. Links emailed to you.';
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
  // Start clean each time, so a dropdown never sits on the wrong column after new columns are added
  const cleared = {};
  const set = (tab, colName, rule) => { const sh = sheet_(tab);
    if (!cleared[tab]) { cleared[tab] = true; if (sh.getMaxRows() > 1) sh.getRange(2, 1, sh.getMaxRows() - 1, sh.getMaxColumns()).clearDataValidations(); }
    const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], ci = h.indexOf(colName);
    if (ci >= 0) sh.getRange(2, ci + 1, 999, 1).setDataValidation(rule); };
  set('Releases', 'affiliation', list(AFFILIATIONS));
  set('Releases', 'series', list(SERIES.map(s => s.name)));
  set('Releases', 'featured', list(['yes', 'no']));
  set('Members', 'artist_type', list(['Member', 'Signed']));
  set('Members', 'bandcamp_linked', list(['yes', 'no']));
  set('Members', 'bandcamp_pro', list(['yes', 'no', 'eligible']));
  set('Members', 'link_method', list(['password', 'invite']));
  set('Members', 'standing', list(['good', 'warning', 'suspended', 'removed']));
  set('Disputes', 'status', list(['open', 'cleared', 'not cleared']));
  set('Feedback', 'status', list(['new', 'seen', 'doing it', 'done', 'no']));
  set('Bookings', 'uploaded', list(['yes', 'no']));
  set('Members', 'role', list(['', 'Owner', 'Administrator']));
  set('Links', 'status', list(['requested', 'ready', 'linked', 'cancelled']));
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
// ============================================================
// MISSED PAYMENTS: polite, automatic, nothing deleted
// Day 0 friendly email · day 7 reminder · day 14 locked (can see belt/points, can't book or claim)
// · day 90 archived (email first). A payment unlocks everything straight away.
// ============================================================
function startPaymentChase_(m) {
  if (!m) return;
  if (!String(m.payment_issue_since || '').trim()) updateRow_('Members', 'member_id', m.member_id, { status: 'payment failed', payment_issue_since: new Date(), payment_chase: 'day 0' });
  else return;
  chaseEmail_(m, 'day0');
}
function chaseEmail_(m, step) {
  if (!m.email) return;
  const pause = 'Need a break instead? Pausing costs €1 a month for artists (€0.50 for fans) and keeps your belt and points: reply "pause".';
  const texts = {
    day0: ['Quick one about your RRR membership', 'PayPal couldn\'t take your membership payment. It happens: an expired card, a new bank card, low balance.\n\nTo fix it, update your card in PayPal (Settings → Payments → Manage automatic payments), or restart your membership here: ' + SETTINGS.siteUrl + 'index.html#join\n\nPayPal will also try again in a few days.\n\n' + pause],
    day7: ['Reminder: your RRR membership payment', 'Your membership payment still hasn\'t gone through. If it isn\'t sorted within a week, your account will be locked (nothing is deleted: your belt, points and releases stay safe).\n\nUpdate your card in PayPal or restart here: ' + SETTINGS.siteUrl + 'index.html#join\n\n' + pause],
    day14: ['Your RRR account is locked (nothing is deleted)', 'We still haven\'t received your membership payment, so your account is locked: you can see your belt and points, but bookings, claims and Series submissions are paused.\n\nPay and everything unlocks straight away: ' + SETTINGS.siteUrl + 'index.html#join\n\n' + pause],
    day90: ['Your RRR account has been archived', 'Your membership has been unpaid for 90 days, so we\'ve archived your account. Your points stay on record for 12 months: rejoin any time and pick up where you left off: ' + SETTINGS.siteUrl + 'index.html#join']
  }[step];
  try { MailApp.sendEmail({ to: m.email, name: 'Retro Reverb Records', subject: texts[0], body: 'Hi ' + (m.artist || m.name || '') + ',\n\n' + texts[1] + '\n\nRetro Reverb Records' }); } catch (e) { log_('chase email failed', String(e)); }
}
function paymentChase_() {
  const now = Date.now();
  rows_('Members').forEach(m => {
    const since = String(m.payment_issue_since || '').trim(); if (!since) return;
    const days = (now - new Date(m.payment_issue_since).getTime()) / 86400000, done = String(m.payment_chase || '');
    if (days >= 90 && done !== 'day 90') { updateRow_('Members', 'member_id', m.member_id, { status: 'archived (unpaid)', payment_chase: 'day 90' }); chaseEmail_(m, 'day90'); }
    else if (days >= 14 && days < 90 && !/day (14|90)/.test(done)) { updateRow_('Members', 'member_id', m.member_id, { status: 'locked (unpaid)', payment_chase: 'day 14' }); chaseEmail_(m, 'day14'); }
    else if (days >= 7 && days < 14 && done === 'day 0') { updateRow_('Members', 'member_id', m.member_id, { payment_chase: 'day 7' }); chaseEmail_(m, 'day7'); }
  });
}

function isDemo_(email) { const e = String(email || '').trim().toLowerCase(); return !!SETTINGS.demoEmailPrefix && e.indexOf(SETTINGS.demoEmailPrefix) === 0 && /@gmail\.com$/.test(e); }

function standing_(m) { return String((m && m.standing) || 'good').trim().toLowerCase() || 'good'; }
function inGoodStanding_(m) { const s = standing_(m); return s !== 'suspended' && s !== 'removed' && !/locked|archived/i.test(String(m && m.status)); }

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
      const caseNo = 'AIC-' + String(rows_('Releases').filter(r => r.ai_case).length + 1).padStart(4, '0');
      sh.getRange(row, col('ai_case')).setValue(caseNo);
      sh.getRange(row, col('admin_notes')).setValue(caseNo + ': AI FLAG (' + p.ai_score + ') but declared "' + declared + '". Waiting for the artist to dispute or declare. AI-generated = streaming only.');
      const email = v[i][h.indexOf('email')], title = v[i][h.indexOf('title')];
      if (email) try {
        MailApp.sendEmail({ to: email, name: 'Retro Reverb Records', subject: 'AI check on "' + title + '" · case ' + caseNo,
          body: 'Hi,\n\nOur automatic check flagged "' + title + '" as possibly AI-generated. This is NOT a rejection: a robot can be wrong.\n\n' +
            'Case number: ' + caseNo + '\n\nYou have two options:\n' +
            '1. It is wrong: dispute it here and send proof: ' + SETTINGS.siteUrl + 'dispute.html?case=' + caseNo + '\n' +
            '2. It is AI-generated: reply to this email. AI-generated music can be released on streaming only (Bandcamp bans it).\n\n' +
            'We look at every dispute within 7 days. Your release date may move while we check.\n\nRetro Reverb Records' });
      } catch (e) { log_('ai flag email failed', String(e)); }
      notify_('AI flag: ' + v[i][h.indexOf('artist')] + ' – ' + v[i][h.indexOf('title')],
        'The robot check scored this release ' + p.ai_score + ' (' + p.ai_result + '), but the artist declared "' + declared + '".\n\n' +
        'Case ' + (sh.getRange(row, col('ai_case')).getValue() || '') + '. The artist has been emailed a dispute link. It is only a flag. Listen to it, or wait for their dispute. Heavily AI-generated music can go to streaming only (Bandcamp bans it).\n\n' + sheetUrl_());
    } else if (/sound|clipping|loud|quiet|silence/i.test(String(p.sound)) && String(p.sound) !== 'OK') {
      sh.getRange(row, col('admin_notes')).setValue('Sound check: ' + p.sound);
    }
    return text_('ok');
  }
  log_('ai-result: release not found', String(p.id));
  return text_('ok');
}

// ============================================================
// AI FALSE-DETECTION DISPUTES
// A flagged artist gets a case number (AIC-0001) and a link to dispute.html.
// Their proof (links + small files saved to Drive folder "RRR AI disputes") lands in
// the Disputes tab. You set status to "cleared" or "not cleared" and add a note,
// then RRR menu → Process AI disputes now (or wait for the daily run): the artist is emailed.
// ============================================================
function disputeFolder_() {
  const it = DriveApp.getFoldersByName('RRR AI disputes');
  return it.hasNext() ? it.next() : DriveApp.createFolder('RRR AI disputes');
}

function handleDispute_(p) {
  const caseNo = String(p.case || '').trim().toUpperCase();
  const rel = rows_('Releases').find(r => String(r.ai_case).toUpperCase() === caseNo);
  if (!rel) { log_('dispute refused: unknown case', caseNo); return text_('ok'); }
  if (String(p.member_id || '').trim().toUpperCase() !== String(rel.member_id).toUpperCase()) { log_('dispute refused: member mismatch', caseNo); return text_('ok'); }
  const saved = [];
  for (let k = 1; k <= 3; k++) {
    const data = p['file' + k], name = p['file' + k + '_name'];
    if (!data) continue;
    try {
      const m = String(data).match(/^data:([^;]+);base64,(.*)$/);
      if (!m) continue;
      const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], caseNo + '-' + String(name || ('proof' + k)).replace(/[^\w.\- ]/g, '_').slice(0, 80));
      saved.push(disputeFolder_().createFile(blob).getUrl());
    } catch (e) { log_('dispute file failed', caseNo + ' ' + String(e)); }
  }
  append_('Disputes', { case: caseNo, created: new Date(), release_id: rel.release_id, member_id: rel.member_id, artist: rel.artist, email: rel.email,
    title: rel.title, reason: String(p.reason || '').slice(0, 3000), proof_types: [].concat(p.proof_types || []).join(', '),
    proof_links: String(p.proof_links || '').slice(0, 2000), files: saved.join('\n'), used_ai_tools: String(p.used_ai_tools || '').slice(0, 500), status: 'open' });
  notify_('AI dispute ' + caseNo + ': ' + rel.artist + ' – ' + rel.title,
    'Proof types: ' + [].concat(p.proof_types || []).join(', ') + '\nLinks: ' + (p.proof_links || '-') + '\nFiles: ' + (saved.join(', ') || '-') +
    '\nAI tools they say they used: ' + (p.used_ai_tools || '-') + '\n\nWhy they think it is wrong:\n' + (p.reason || '') +
    '\n\nDecide in the Disputes tab: status "cleared" or "not cleared", then RRR menu → Process AI disputes now.\n' + sheetUrl_());
  if (rel.email) try {
    MailApp.sendEmail({ to: rel.email, name: 'Retro Reverb Records', subject: 'We received your dispute · case ' + caseNo,
      body: 'Thanks. We received your dispute for "' + rel.title + '" (case ' + caseNo + ') on ' + new Date().toUTCString() + '.\n\nA person will review your proof within 7 days and email you the decision.\n\nRetro Reverb Records' });
  } catch (e) { log_('dispute ack failed', String(e)); }
  return text_('ok');
}

function processDisputes_() {
  const sh = sheet_('Disputes'), v = sh.getDataRange().getValues(), h = v[0];
  const c = k => h.indexOf(k);
  let n = 0;
  for (let i = 1; i < v.length; i++) {
    const st = String(v[i][c('status')]).trim().toLowerCase();
    if ((st !== 'cleared' && st !== 'not cleared') || v[i][c('notified')]) continue;
    const caseNo = v[i][c('case')], title = v[i][c('title')], email = v[i][c('email')], note = v[i][c('decision_notes')];
    const rsh = sheet_('Releases'), rv = rsh.getDataRange().getValues(), rh = rv[0];
    for (let j = 1; j < rv.length; j++) if (String(rv[j][rh.indexOf('ai_case')]) === String(caseNo)) {
      rsh.getRange(j + 1, rh.indexOf('ai_result') + 1).setValue(st === 'cleared' ? 'cleared by RRR (' + caseNo + ')' : 'AI confirmed (' + caseNo + '): streaming only');
    }
    if (email) MailApp.sendEmail({ to: email, name: 'Retro Reverb Records', subject: 'Decision on case ' + caseNo + ': "' + title + '"',
      body: (st === 'cleared'
        ? 'Good news: we reviewed your proof and cleared "' + title + '". The AI flag is removed and your release carries on as booked.'
        : 'We reviewed your proof for "' + title + '" and could not clear the AI flag.\n\nYour options:\n- Release it on streaming only (the one fully safe route for AI-generated music), or\n- Withdraw the booking: the upload fee is refunded if we have not uploaded it yet.\n\nIf you have new proof, reply to this email within 14 days and we will look again.') +
        (note ? '\n\nNote from RRR: ' + note : '') + '\n\nRetro Reverb Records' });
    sh.getRange(i + 1, c('notified') + 1).setValue(new Date());
    n++;
  }
  return n;
}
// Proof files are deleted after 90 days (promised on the dispute page)
function cleanDisputeFiles_() {
  const it = DriveApp.getFoldersByName('RRR AI disputes'); if (!it.hasNext()) return;
  const files = it.next().getFiles(), cutoff = Date.now() - 90 * 86400000;
  while (files.hasNext()) { const f = files.next(); if (f.getDateCreated().getTime() < cutoff) f.setTrashed(true); }
}
function processDisputesNow() {
  const n = processDisputes_();
  SpreadsheetApp.getUi().alert(n ? n + ' dispute decision(s) sent.' : 'Nothing new. Set status to "cleared" or "not cleared" first.');
}

// ============================================================
// BOOKING SLOTS: first to pay gets the date
// The booking form asks ?slot=<kind>&date=YYYY-MM-DD before sending, so artists
// only book free dates. The date is taken when PayPal confirms the payment.
// ============================================================
// A day is taken by paid bookings once paid, and by free bookings (social posts) once requested
function holdsSlot_(r) {
  const st = String(r.status);
  if (/^confirmed/i.test(st)) return true;
  return SETTINGS.paidKinds.indexOf(r.kind) < 0 && /^requested/i.test(st);
}
function slotsTaken_(kind, iso) {
  return rows_('Bookings').filter(r => r.kind === kind && holdsSlot_(r) && isoDate_(r.date) === iso).length;
}
function isoDate_(d) { if (!d) return ''; if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); return String(d).slice(0, 10); }
function slotFree_(kind, iso) { const cap = SETTINGS.slotsPerDay[kind]; return !cap || slotsTaken_(kind, iso) < cap; }
function nextFreeDate_(kind, iso) {
  const d = new Date(iso + 'T12:00:00');
  for (let i = 0; i < 366; i++) { const t = isoDate_(d); if (slotFree_(kind, t)) return t; d.setDate(d.getDate() + 1); }
  return '';
}
// Every date that is already full for this kind (for the booking calendar)
function slotsFull_(kind) {
  const cap = SETTINGS.slotsPerDay[kind] || 0, counts = {};
  if (!cap) return { ok: true, kind: kind, cap: 0, full: [] };
  rows_('Bookings').forEach(r => { if (r.kind === kind && holdsSlot_(r)) { const d = isoDate_(r.date); if (d) counts[d] = (counts[d] || 0) + 1; } });
  return { ok: true, kind: kind, cap: cap, full: Object.keys(counts).filter(d => counts[d] >= cap) };
}
function slotInfo_(kind, iso) {
  iso = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { ok: false, error: 'bad date' };
  if (!SETTINGS.slotsPerDay[kind]) return { ok: true, free: true, limited: false };
  const free = slotFree_(kind, iso);
  return { ok: true, free: free, limited: true, next: free ? iso : nextFreeDate_(kind, iso) };
}

function confirmBooking_(bookingId, amount, txnId) {
  const sh = sheet_('Bookings'), v = sh.getDataRange().getValues(), h = v[0];
  const c = k => h.indexOf(k);
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][c('booking_id')]).toUpperCase() !== bookingId) continue;
    const row = i + 1, status = String(v[i][c('status')]);
    if (/^confirmed/i.test(status)) return;          // already done (PayPal can repeat)
    const kind = v[i][c('kind')], p = JSON.parse(v[i][c('details')] || '{}');
    const demo = txnId === 'DEMO';
    let date = isoDate_(v[i][c('date')]), moved = '';
    if (date && !demo && !slotFree_(kind, date)) { const nd = nextFreeDate_(kind, date); moved = date; date = nd; sh.getRange(row, c('date') + 1).setValue(date); }
    const eventId = date && !demo ? addToCalendar_(kind, Object.assign({}, p, { title: v[i][c('title')], artist: v[i][c('artist')] }), date) : '';
    sh.getRange(row, c('status') + 1).setValue(demo ? 'demo (not a real booking)' : moved ? 'confirmed (moved from ' + moved + ')' : 'confirmed');
    sh.getRange(row, c('calendar_event_id') + 1).setValue(eventId);
    sh.getRange(row, c('paid_amount') + 1).setValue(amount || '');
    sh.getRange(row, c('txn_id') + 1).setValue(txnId || '');
    const memberId = v[i][c('member_id')], title = v[i][c('title')];
    if (memberId) {
      if (/release/.test(kind)) { award_(memberId, 'firstRelease'); addPoints_(memberId, POINTS.releaseBooked, 'Release booked: ' + title); }
      if (kind === 'youtube-upload') { award_(memberId, 'firstVideo'); addPoints_(memberId, POINTS.videoBooked, 'YouTube upload booked: ' + title); }
    }
    const email = v[i][c('email')];
    if (email) try {
      MailApp.sendEmail({ to: email, name: 'Retro Reverb Records', subject: (demo ? '[DEMO] ' : '') + 'Booking confirmed: "' + title + '" on ' + date + ' (' + bookingId + ')',
        body: (demo ? 'DEMO BOOKING: no payment taken and no real date reserved. This is what a member sees after paying.\n\n' : '') + 'Payment received, thank you. Your booking is confirmed.\n\nBooking: ' + bookingId + '\nWhat: ' + kind.replace('-', ' ') + '\nTitle: ' + title + '\nDate: ' + date +
          (moved ? '\n\nSomeone paid for ' + moved + ' just before you, so your booking moved to the next free day, ' + date + '. If that doesn\'t work for you, reply to this email and we\'ll move it or refund you.' : '') +
          '\n\nYour checklist and deadlines: ' + SETTINGS.siteUrl + 'release-policy.html\nBandcamp assets: at least ' + SETTINGS.bandcampAssetsDays + ' days before. Streaming assets: at least ' + SETTINGS.streamingAssetsDays + ' days before.\n\nRetro Reverb Records' });
    } catch (e) { log_('booking confirm email failed', String(e)); }
    notify_('Booking PAID + confirmed: ' + kind + ' – ' + v[i][c('artist')] + ' – ' + title + ' – ' + date + (moved ? ' (moved from ' + moved + ')' : ''), 'Booking ' + bookingId + '\n' + sheetUrl_());
    return;
  }
  log_('payment for unknown booking', bookingId);
  notify_('Payment for an unknown booking: ' + bookingId, 'Check PayPal and the Bookings tab.\n' + sheetUrl_());
}

// Unpaid bookings don't hold anything; they're marked expired after 7 days
function expireUnpaidBookings_() {
  const sh = sheet_('Bookings'), v = sh.getDataRange().getValues(), h = v[0], cutoff = Date.now() - 7 * 86400000;
  for (let i = 1; i < v.length; i++) if (v[i][h.indexOf('status')] === 'awaiting payment' && new Date(v[i][h.indexOf('created')]).getTime() < cutoff)
    sh.getRange(i + 1, h.indexOf('status') + 1).setValue('expired (not paid)');
}

// Sheet menu so you don't have to wait for the daily run
function onOpen() {
  SpreadsheetApp.getUi().createMenu('RRR')
    .addItem('Give approved points now', 'approveClaimsNow')
    .addItem('Process release decisions now', 'processReleasesNow')
    .addItem('Apply suspensions and removals now', 'processStandingNow')
    .addItem('Process AI disputes now', 'processDisputesNow')
    .addItem('Confirm Bandcamp links now', 'processLinksNow')
    .addItem('Make a member an Administrator or Ambassador', 'makeAdmin')
    .addItem('Curator payouts list (RRR Submit)', 'curatorPayouts')
    .addSeparator()
    .addItem('Remove demo test data', 'removeDemoData')
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
  const newMembers = rows_('Members').filter(r => r.created && inRange(r.created, start, end) && /active/.test(r.status) && !/demo/.test(r.status) && r.type === 'artist');
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


// ============================================================
// DEMO / WALKTHROUGH ACCOUNTS
// Sign up on the site with retroreverbrecords+demo1@gmail.com (any word after +).
// Gmail delivers those emails to you. Remove everything they made with:
// RRR menu → Remove demo test data.
// ============================================================
function removeDemoData() {
  const ids = rows_('Members').filter(m => isDemo_(m.email)).map(m => String(m.member_id).toUpperCase());
  const tabs = ['Members', 'Bookings', 'Releases', 'Claims', 'Achievements', 'Posts', 'Agreements', 'Withdrawals', 'Disputes', 'Feedback', 'Links', 'Submissions', 'Reviews', 'PointsLog'];
  let removed = 0;
  tabs.forEach(name => {
    const sh = ss_().getSheetByName(name); if (!sh) return;
    const v = sh.getDataRange().getValues(), h = v[0], ei = h.indexOf('email'), mi = h.indexOf('member_id');
    for (let i = v.length - 1; i >= 1; i--) {
      const hit = (ei >= 0 && isDemo_(v[i][ei])) || (mi >= 0 && ids.indexOf(String(v[i][mi]).toUpperCase()) >= 0);
      if (hit) { sh.deleteRow(i + 1); removed++; }
    }
  });
  log_('demo data removed', removed + ' rows, members ' + ids.join(', '));
  try { SpreadsheetApp.getUi().alert('Removed ' + removed + ' demo rows (' + (ids.join(', ') || 'no demo members') + ').'); } catch (e) {}
  return removed;
}


// ============================================================
// BANDCAMP LINKING (placeholder password or invite)
// 1. Artist asks on the website (no password ever typed on the site).
// 2. Password linking: we email them a one-off placeholder password to set on Bandcamp,
//    plus a "Done, I've set it" button. Invite: we tell them to watch for Bandcamp's invite.
// 3. When they press Done you get an email with their page and the placeholder password:
//    Bandcamp → Add → Existing Artist → password option.
// 4. Set status to "linked" in the Links tab (or for invites when they accept).
//    Daily, or RRR menu → Confirm Bandcamp links now: Members updated, placeholder deleted,
//    artist emailed "Linked ✓ – change your password now".
// ============================================================
function placeholderPassword_() {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const part = n => Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join('');
  return 'RRR-' + part(5) + '-' + part(5) + '-' + part(4) + '!';
}
function linkStatus_(memberId) {
  const r = rows_('Links').filter(x => String(x.member_id).toUpperCase() === String(memberId).toUpperCase() && x.status !== 'cancelled').pop();
  return r ? { status: r.status, method: r.method } : null;
}
function handleLinkRequest_(p) {
  const id = String(p.member_id || '').trim().toUpperCase();
  const m = findRow_('Members', 'member_id', id);
  if (!m || m.type !== 'artist' || !inGoodStanding_(m)) { log_('link request refused', id); return text_('ok'); }
  if (/^y/i.test(String(m.bandcamp_linked))) return text_('ok');
  const method = p.method === 'invite' ? 'invite' : 'password';
  const token = Utilities.getUuid().replace(/-/g, '');
  const pw = method === 'password' ? placeholderPassword_() : '';
  // one open request per member
  const sh = sheet_('Links'), v = sh.getDataRange().getValues(), h = v[0];
  for (let i = 1; i < v.length; i++) if (String(v[i][h.indexOf('member_id')]).toUpperCase() === id && /requested|ready/.test(v[i][h.indexOf('status')])) {
    sh.getRange(i + 1, h.indexOf('status') + 1).setValue('cancelled'); sh.getRange(i + 1, h.indexOf('temp_password') + 1).setValue('');
  }
  append_('Links', { created: new Date(), member_id: id, artist: m.artist || m.name, email: m.email, bandcamp_url: String(p.bandcamp_url || m.bandcamp || '').trim(),
    method: method, temp_password: pw, token: token, status: 'requested' });
  const u = SETTINGS.siteUrl, done = u + 'linked.html?t=' + token;
  const wrap = inner => '<div style="font:15px/1.55 Arial,sans-serif;color:#222;max-width:560px">' + inner + '<p>Questions? Just reply to this email.</p><p>Retro Reverb Records<br><span style="color:#888">Welcome to the family</span></p></div>';
  const html = method === 'password' ? wrap(
    '<p>Hi ' + (m.name || '') + ',</p><p>Here is your <b>placeholder password</b> for linking your Bandcamp to RRR. It was made just for you and is only used for a few minutes.</p>' +
    '<p style="font:700 20px Courier New,monospace;background:#f4f1fb;border:2px dashed #FF2FA8;padding:12px 14px;border-radius:8px;text-align:center">' + pw + '</p>' +
    '<ol><li>On Bandcamp, go to <b>Settings → Account</b> (bandcamp.com/settings) and change your password to the placeholder above.</li>' +
    '<li>Press this button: <a href="' + done + '" style="display:inline-block;background:#FF2FA8;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:6px 12px;border-radius:6px">Done, I\'ve set it</a></li>' +
    '<li>We link your page, usually within a few hours, and email you <b>"Linked ✓"</b>.</li>' +
    '<li>Then <b>change your password straight away</b> to a new private one. Your page stays linked.</li></ol>' +
    '<p style="background:#f7f7f9;padding:10px 12px;border-radius:8px;font-size:13px;color:#555"><b>What linking changes:</b> only your RRR releases. Your other releases, collaborators, other labels and your payment settings stay yours and untouched. Bandcamp pays you directly. You can unlink any time. RRR never asks for your real password.</p>')
    : wrap('<p>Hi ' + (m.name || '') + ',</p><p>Thanks! We\'ll send you a <b>Bandcamp invite</b> from the Retro Reverb Records label within a day. Look for an email from Bandcamp and press <b>accept</b>. That\'s it.</p>' +
      '<p style="background:#f7f7f9;padding:10px 12px;border-radius:8px;font-size:13px;color:#555">With an invite RRR can only add releases to your page. If you\'d like full promotion support and stats later, you can switch to password linking from your dashboard.</p>');
  try { MailApp.sendEmail({ to: m.email, name: 'Retro Reverb Records', subject: method === 'password' ? 'Your placeholder password for linking Bandcamp to RRR' : 'Linking your Bandcamp to RRR: watch for our invite', htmlBody: html }); } catch (e) { log_('link email failed', String(e)); }
  if (method === 'invite') notify_('Bandcamp INVITE to send: ' + (m.artist || m.name) + ' (' + id + ')', 'Bandcamp → Add → Existing Artist → request access.\nTheir page: ' + (p.bandcamp_url || m.bandcamp || '?') + '\nWhen they accept, set status "linked" in the Links tab.\n' + sheetUrl_());
  return text_('ok');
}
function linkReady_(token, asJson) {
  const sh = sheet_('Links'), v = sh.getDataRange().getValues(), h = v[0];
  const page = (title, body) => asJson ? json_({ ok: true, title: title, body: body }) : HtmlService.createHtmlOutput('<div style="font:16px/1.6 Arial,sans-serif;max-width:520px;margin:40px auto;padding:24px;background:#07061A;color:#F3EEFF;border-radius:14px;text-align:center"><h2 style="color:#FF2FA8">' + title + '</h2><p>' + body + '</p><p><a style="color:#3FD0FF" href="' + SETTINGS.siteUrl + '">Back to Retro Reverb Records</a></p></div>').setTitle('RRR · Bandcamp linking');
  for (let i = 1; i < v.length; i++) {
    if (v[i][h.indexOf('token')] !== token) continue;
    const st = v[i][h.indexOf('status')];
    if (st === 'linked') return page('Already linked ✓', 'Your Bandcamp is linked. Remember to change your password.');
    if (st === 'cancelled' || !v[i][h.indexOf('temp_password')]) return page('This link has expired', 'Please request linking again from your dashboard.');
    if (st !== 'ready') {
      sh.getRange(i + 1, h.indexOf('status') + 1).setValue('ready'); sh.getRange(i + 1, h.indexOf('ready_at') + 1).setValue(new Date());
      notify_('🔗 Link Bandcamp NOW: ' + v[i][h.indexOf('artist')] + ' (' + v[i][h.indexOf('member_id')] + ')',
        'They have set the placeholder password.\n\nTheir Bandcamp: ' + v[i][h.indexOf('bandcamp_url')] + '\nPlaceholder password: ' + v[i][h.indexOf('temp_password')] +
        '\n\nBandcamp → Add → Existing Artist → link with password. Then set status to "linked" in the Links tab. That is all: the artist is emailed straight away to change their password, and the placeholder is deleted.\n' + sheetUrl_());
    }
    return page('Thanks! 🎉', 'We\'ve been told you\'ve set the placeholder password. We\'ll link your page soon and email you <b>"Linked ✓"</b>. Then change your password to a new private one.');
  }
  return page('Link not found', 'Please request linking again from your dashboard.');
}
function processLinks_() {
  const sh = sheet_('Links'), v = sh.getDataRange().getValues(), h = v[0], c = k => h.indexOf(k);
  let n = 0;
  for (let i = 1; i < v.length; i++) {
    const row = i + 1, st = v[i][c('status')];
    // placeholders never sit around: expire unused requests after 7 days
    if (/requested|ready/.test(st) && Date.now() - new Date(v[i][c('created')]).getTime() > 7 * 86400000) { sh.getRange(row, c('status') + 1).setValue('cancelled'); sh.getRange(row, c('temp_password') + 1).setValue(''); continue; }
    if (st !== 'linked' || v[i][c('notified')]) continue;
    const id = v[i][c('member_id')], method = v[i][c('method')];
    updateRow_('Members', 'member_id', id, { bandcamp_linked: 'yes', link_method: method });
    sh.getRange(row, c('temp_password') + 1).setValue('');
    sh.getRange(row, c('linked_at') + 1).setValue(new Date());
    sh.getRange(row, c('notified') + 1).setValue(new Date());
    try { MailApp.sendEmail({ to: v[i][c('email')], name: 'Retro Reverb Records', subject: 'Linked ✓ Your Bandcamp is now linked to RRR',
      htmlBody: '<div style="font:15px/1.55 Arial,sans-serif;color:#222;max-width:560px"><p>Great news: your Bandcamp is now linked to the Retro Reverb Records label. 🎉</p>' +
        (method === 'password' ? '<p style="background:#fff3c4;padding:12px;border-radius:8px"><b>Change your Bandcamp password now</b> to a new private one (bandcamp.com/settings). Your page stays linked.</p>' : '') +
        '<p>You now get <b>free Bandcamp VIP</b>, and you can book Bandcamp releases and submit releases for an RRR series.</p><p><a href="' + SETTINGS.siteUrl + 'member.html?id=' + id + '">Open your dashboard</a> · <a href="' + SETTINGS.siteUrl + 'book.html">Book a release</a></p><p>Retro Reverb Records<br><span style="color:#888">Welcome to the family</span></p></div>' }); n++; } catch (e) { log_('linked email failed', String(e)); }
  }
  return n;
}
function processLinksNow() {
  const n = processLinks_();
  try { SpreadsheetApp.getUi().alert(n + ' artist(s) told they are linked.'); } catch (e) {}
}


// ============================================================
// YOUR UPLOAD JOBS: morning alert (email + optional phone push)
// RouteNote must be uploaded SETTINGS.streamingUploadDays before release; Bandcamp (when RRR uploads) on release day.
// Type yes in the Bookings "uploaded" column when done and the alerts stop.
// ============================================================
function uploadJobs_() {
  const today = isoDate_(new Date()), plus = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoDate_(d); };
  const jobs = [];
  rows_('Bookings').forEach(r => {
    if (!/^confirmed/i.test(String(r.status)) || /^y/i.test(String(r.uploaded)) || !r.date) return;
    const rel = isoDate_(r.date); if (rel < today) return;
    let p = {}; try { p = JSON.parse(r.details || '{}'); } catch (e) {}
    const at = (n) => { const d = new Date(rel + 'T12:00:00'); d.setDate(d.getDate() - n); return isoDate_(d); };
    if (r.kind === 'streaming-release' || p.also_streaming) jobs.push({ what: 'RouteNote', due: at(SETTINGS.streamingUploadDays), rel: rel, r: r, assets: p.assets_link || p.assets || '' });
    if (r.kind === 'bandcamp-release' && p.upload_by === 'rrr') jobs.push({ what: 'Bandcamp', due: rel, rel: rel, r: r, assets: p.assets_link || '' });
  });
  const line = j => '• ' + j.what + ': ' + j.r.artist + ' – ' + j.r.title + ' (release ' + j.rel + ')' + (j.assets ? '\n   files: ' + j.assets : '\n   files: not sent yet – chase the artist');
  return {
    overdue: jobs.filter(j => j.due < today),
    today: jobs.filter(j => j.due === today),
    soon: jobs.filter(j => j.due > today && j.due <= plus(3)),
    line: line
  };
}
function phonePush_(title, body) {
  if (!SETTINGS.ntfyTopic) return;
  try { UrlFetchApp.fetch('https://ntfy.sh/' + encodeURIComponent(SETTINGS.ntfyTopic), { method: 'post', payload: body, headers: { Title: title, Priority: 'high', Tags: 'rotating_light' }, muteHttpExceptions: true }); } catch (e) { log_('ntfy failed', String(e)); }
}
function morningJobs_() {
  const j = uploadJobs_();
  if (!j.overdue.length && !j.today.length && !j.soon.length) return;
  const n = j.overdue.length + j.today.length;
  const subject = (n ? '⚠ ' + n + ' upload' + (n > 1 ? 's' : '') + ' due TODAY' : 'Uploads coming up') + ' – RRR jobs';
  const body = (j.overdue.length ? 'OVERDUE (push through today or the streaming date slips):\n' + j.overdue.map(j.line).join('\n') + '\n\n' : '') +
    (j.today.length ? 'DUE TODAY:\n' + j.today.map(j.line).join('\n') + '\n\n' : '') +
    (j.soon.length ? 'Next 3 days:\n' + j.soon.map(x => j.line(x) + ' – due ' + x.due).join('\n') + '\n\n' : '') +
    'When done, type yes in the Bookings "uploaded" column.\n' + sheetUrl_();
  notify_(subject, body);
  if (n) phonePush_(subject, [].concat(j.overdue, j.today).map(x => x.what + ': ' + x.r.artist + ' – ' + x.r.title).join('\n'));
}


// ============================================================
// ADMINISTRATORS (moderators): free black-belt account + moderation page
// They can warn, suspend or remove members (with a reason, logged, you're emailed every time).
// They can't edit the website, prices, money or the sheet. Only you have full access.
// RRR menu → Make a member an Administrator (after they've signed up themselves).
// ============================================================
function makeAdmin() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Make a member an Administrator or Ambassador', 'Their member ID (e.g. RRR-7KX2P). They must have signed up first.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const id = String(r.getResponseText() || '').trim().toUpperCase();
  const m = findRow_('Members', 'member_id', id);
  if (!m) { ui.alert('No member with ID ' + id); return; }
  const t = ui.prompt('Badge on their profile', 'Type Administrator or Ambassador (same moderation rights either way).', ui.ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== ui.Button.OK) return;
  const badge = /^amb/i.test(String(t.getResponseText()).trim()) ? 'Ambassador' : 'Administrator';
  const key = Utilities.getUuid().replace(/-/g, '');
  updateRow_('Members', 'member_id', id, { role: 'Administrator', admin_key: key, status: 'active (honorary)', plan: 'honorary', standing: 'good' });
  if (!rows_('Achievements').some(x => x.member_id === id && /^(Administrator|Ambassador)$/.test(x.achievement))) {
    recalcPoints_(id);
    const now = Number((findRow_('Members', 'member_id', id) || {}).points) || 0;
    append_('Achievements', { member_id: id, achievement: badge, earned_on: new Date(), points: Math.max(0, 2000 - now), note: badge + ': black belt starting rank' });
    recalcPoints_(id);
  }
  const u = SETTINGS.siteUrl, mod = u + 'mod.html?k=' + key;
  try { MailApp.sendEmail({ to: m.email, name: 'Retro Reverb Records', subject: 'You\'re an RRR ' + badge + (badge === 'Ambassador' ? ' 🌟' : ' 🛡'),
    htmlBody: '<div style="font:15px/1.55 Arial,sans-serif;color:#222;max-width:560px"><p>Hi ' + (m.name || '') + ',</p><p>You\'re now an <b>RRR ' + badge + '</b> with moderation rights, a black belt and a free (honorary) membership. Welcome to the team!</p>' +
      '<p><b>Your private moderation page</b> (bookmark it, don\'t share it):<br><a href="' + mod + '">' + mod + '</a></p>' +
      '<p>From there you can give a warning, suspend or remove a member, always with a reason. Every action is logged and Cybertronix is told. Members get an email with the reason and how to appeal.</p>' +
      '<p>Follow the <a href="' + u + 'code-of-conduct.html#enforcement">Code of Conduct steps</a>: friendly word → warning → suspension → removal. Zero-tolerance cases can go straight to removal.</p>' +
      '<p>Your dashboard: <a href="' + u + 'member.html?id=' + id + '">' + u + 'member.html?id=' + id + '</a></p><p>Retro Reverb Records<br><span style="color:#888">Welcome to the family</span></p></div>' }); } catch (e) { log_('admin email failed', String(e)); }
  ui.alert(id + ' is now an RRR ' + badge + ' with moderation rights (black belt, honorary). Their moderation link was emailed to ' + m.email + '.\n\nAlso give them the Moderator role on Discord.');
}
function adminByKey_(key) {
  if (!key || String(key).length < 20) return null;
  return rows_('Members').find(m => m.admin_key && m.admin_key === key && /administrator|owner/i.test(String(m.role)) && inGoodStanding_(m)) || null;
}
function modList_(key) {
  const a = adminByKey_(key); if (!a) return json_({ ok: false, error: 'not allowed' });
  const members = rows_('Members').filter(m => !isDemo_(m.email) || /demo/.test(String(m.status))).map(m => ({ id: m.member_id, name: m.name, artist: m.artist, type: m.type, status: m.status,
    standing: standing_(m), since: m.created, role: m.role || '', protected: m.member_id === 'RRR-00001' || /administrator/i.test(String(m.role)) }));
  const log = rows_('ModLog').slice(-30).reverse();
  return json_({ ok: true, admin: { id: a.member_id, name: a.artist || a.name }, members: members, log: log });
}
function handleModAction_(p) {
  const a = adminByKey_(p.key); if (!a) { log_('mod action refused (bad key)', JSON.stringify(p).slice(0, 300)); return text_('ok'); }
  const id = String(p.member_id || '').toUpperCase(), action = String(p.standing || ''), reason = String(p.reason || '').trim().slice(0, 1000);
  if (['good', 'warning', 'suspended', 'removed'].indexOf(action) < 0 || reason.length < 5) return text_('ok');
  const m = findRow_('Members', 'member_id', id);
  if (!m || id === 'RRR-00001' || /administrator/i.test(String(m.role))) { log_('mod action refused (protected)', id); return text_('ok'); }
  updateRow_('Members', 'member_id', id, { standing: action, admin_notes: (m.admin_notes ? m.admin_notes + ' | ' : '') + new Date().toISOString().slice(0, 10) + ' ' + action + ' by ' + (a.artist || a.name) + ': ' + reason });
  append_('ModLog', { when: new Date(), admin_id: a.member_id, admin_name: a.artist || a.name, member_id: id, member_name: m.artist || m.name, action: action, reason: reason });
  if (action === 'suspended' || action === 'removed') processStanding_();
  const words = { good: 'Your RRR membership is back in good standing.', warning: 'This is a formal warning about your behaviour in the RRR community.', suspended: 'Your RRR membership is suspended for up to 30 days. Bookings, claims and submissions are paused, and your membership fee is paused too.', removed: 'Your RRR membership has been ended and you have been removed from the community.' };
  if (m.email) try { MailApp.sendEmail({ to: m.email, name: 'Retro Reverb Records', replyTo: SETTINGS.ownerEmail, subject: 'About your RRR membership',
    body: 'Hi ' + (m.name || '') + ',\n\n' + words[action] + '\n\nReason: ' + reason + '\n\nOur Code of Conduct: ' + SETTINGS.siteUrl + 'code-of-conduct.html' + (action !== 'good' ? '\n\nIf you think this is wrong, reply to this email within 14 days to appeal. A different person will look at it.' : '') + '\n\nRetro Reverb Records' }); } catch (e) { log_('mod email failed', String(e)); }
  notify_('Moderation: ' + (a.artist || a.name) + ' set ' + (m.artist || m.name) + ' (' + id + ') to ' + action.toUpperCase(), 'Reason: ' + reason + '\n\nUndo: set standing back in the Members tab.\n' + sheetUrl_());
  return text_('ok');
}
