const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const code = readFileSync(require('node:path').join(__dirname, '../backend/Code.gs'), 'utf8');

function fixture() {
  const tables = { Bookings: [], Payments: [], Members: [], Posts: [] };
  const emails = [], notices = [], events = [], points = [], alerts = [];
  const date = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  let locked = false, uid = 0, failEvent = false, verified = true;
  const day = d => d.toISOString().slice(0, 10);
  function calendarEvent(title, start, options = {}) {
    if (failEvent && title.startsWith('DEADLINE')) {
      failEvent = false;
      throw new Error('calendar unavailable');
    }
    const event = { title, start, getId: () => String(events.indexOf(event) + 1),
      getDescription: () => options.description || '', removeAllReminders() {}, addPopupReminder() {} };
    events.push(event);
    return event;
  }
  const calendar = {
    getEventsForDay: d => events.filter(event => day(event.start) === day(d)),
    createAllDayEvent: calendarEvent,
    createEvent: (title, start, end, options) => calendarEvent(title, start, options)
  };
  const context = vm.createContext({
    Date, LockService: { getScriptLock: () => ({
      waitLock() { assert.equal(locked, false); locked = true; },
      releaseLock() { assert.equal(locked, true); locked = false; }
    }) },
    SpreadsheetApp: { flush() {} },
    Session: { getScriptTimeZone: () => 'UTC' },
    Utilities: { getUuid: () => String(++uid).padStart(32, '0').slice(-12).padEnd(32, '0'),
      formatDate: (d, tz, format) => format === 'MMMM' ? String(d.getUTCMonth() + 1) : day(d) },
    MailApp: { sendEmail: email => emails.push(email) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://example.invalid' }) },
    CacheService: { getScriptCache: () => ({ get: () => false, put() {} }) },
    UrlFetchApp: { fetch: () => ({ getContentText: () => verified ? 'VERIFIED' : 'INVALID' }) }
  });
  vm.runInContext(code, context);
  const headers = vm.runInContext('TABS', context);
  const values = (name, row) => headers[name].map(key => row[key] ?? '');
  const rowFor = (name, cells) => Object.fromEntries(headers[name].map((key, i) => [key, cells[i]]));
  Object.assign(context, {
    text_: x => x, json_: x => x, rows_: name => tables[name].map(row => ({ ...row })),
    append_: (name, row) => tables[name].push(rowFor(name, values(name, row))),
    updateRow_: (name, key, value, patch) => Object.assign(tables[name].find(row => row[key] === value), patch),
    sheet_: name => ({
      getDataRange: () => ({ getValues: () => [headers[name].slice(), ...tables[name].map(row => values(name, row))] }),
      getRange: (row, col, height, width) => ({
        getFormulas: () => [Array(width).fill('')],
        setValues: ([cells]) => { tables[name][row - 2] = rowFor(name, cells); },
        setValue: value => { tables[name][row - 2][headers[name][col - 1]] = value; }
      })
    }),
    getCalendar_: () => calendar, sheetUrl_: () => 'sheet',
    award_: (id, key) => points.push([id, key]), addPoints_: (id, amount) => points.push([id, amount]),
    notice_: (...message) => notices.push(message), notify_: (...alert) => alerts.push(alert),
    log_: () => {}, isDemo_: email => email.startsWith('demo@'), isSpam_: () => false
  });
  const settings = vm.runInContext('SETTINGS', context);
  return {
    ...tables, date, events, emails, alerts, points, notices, context,
    failCalendar: () => { failEvent = true; },
    failVerification: () => { verified = false; },
    request(kind, extra = {}) {
      return context.doPost({ parameter: { form: kind, release_date: date, email: 'artist@example.invalid',
        artist: 'Artist', title: 'A track', format: 'single', ...extra } });
    },
    ipn(id, txn, gross = '4.50', extra = {}) {
      return context.doPost({ parameter: { custom: id, txn_id: txn, mc_gross: gross, mc_currency: 'EUR',
        receiver_email: settings.paypalEmail, payment_status: 'Completed', txn_type: 'web_accept', ...extra },
        postData: { contents: 'test fixture' } });
    },
    decide(id, action, approvalDate = '') {
      Object.assign(tables.Bookings.find(b => b.booking_id === id), { release_decision: action, approval_date: approvalDate });
      return context.withBookingLock_(() => context.decideBookedRelease_(id));
    },
    row(id) { return tables.Bookings.find(b => b.booking_id === id); },
    activeMember(extra = {}) {
      tables.Members.push({ member_id: 'RRR-TEST', email: 'artist@example.invalid', status: 'active', ...extra });
    }
  };
}

const paidId = 'BK-ABCDEF234567';

test('paid release requires approval, and repeated notifications or approval do not repeat side effects', () => {
  const f = fixture();
  assert.equal(f.request('streaming-release', { booking_id: paidId }), 'ok');
  assert.equal(f.context.doGet({ parameter: { release_checkout: paidId, amount: '4.5' } }).ready, true);
  assert.equal(f.context.doGet({ parameter: { release_checkout: paidId, amount: '2' } }).ready, false);
  assert.match(f.decide(paidId, 'approve'), /not awaiting/);
  f.ipn(paidId, 'TX1');
  f.ipn(paidId, 'TX1', '4.50', { ipn_track_id: 'redelivery' });
  assert.equal(f.Payments.length, 1);
  assert.equal(f.row(paidId).status, 'awaiting approval');
  assert.equal(f.row(paidId).date, '');
  assert.equal(f.row(paidId).preferred_date, f.date);
  assert.equal(f.events.length + f.points.length + f.notices.length, 0);
  assert.equal(f.emails.length, 1);
  assert.match(f.emails[0].subject, /awaiting approval/);

  f.ipn(paidId, 'TX2');
  assert.equal(f.Payments[1].booking_outcome, 'duplicate payment');
  assert.equal(f.row(paidId).txn_id, 'TX1');
  assert.equal(f.row(paidId).paid_amount, 4.5);
  assert.match(f.decide(paidId, 'approve'), /Release approved/);
  assert.equal(f.row(paidId).date, f.date);
  assert.equal(f.events.length, 3);
  assert.equal(f.notices.length, 1);
  assert.equal(f.emails.length, 2);
  assert.match(f.decide(paidId, 'approve'), /not awaiting/);
  f.ipn(paidId, 'TX1');
  assert.equal(f.events.length, 3);
  assert.equal(f.notices.length, 1);
  assert.equal(f.emails.length, 2);
});

test('included Bandcamp bookings reserve allowance, request changes, release allowance on decline, and award points once', () => {
  const f = fixture();
  f.activeMember();
  assert.equal(f.request('bandcamp-release', { member_free: 'yes' }), 'ok');
  const id = f.Bookings[0].booking_id;
  assert.equal(f.row(id).status, 'awaiting approval');
  assert.equal(f.events.length + f.points.length, 0);
  assert.match(f.request('bandcamp-release', { member_free: 'yes' }), /^refused/);
  assert.match(f.decide(id, 'request changes'), /changes requested/);
  assert.match(f.request('bandcamp-release', { member_free: 'yes' }), /^refused/);
  assert.match(f.decide(id, 'decline'), /declined/);
  f.ipn(id, 'UNEXPECTED');
  assert.equal(f.row(id).status, 'declined');
  assert.equal(f.Payments[0].booking_outcome, 'payment for inactive booking');

  assert.equal(f.request('bandcamp-release', { member_free: 'yes', listening_party: 'yes' }), 'ok');
  const approvedId = f.Bookings[1].booking_id;
  assert.match(f.decide(approvedId, 'approve'), /Release approved/);
  assert.equal(f.row(approvedId).status, 'confirmed (member release)');
  assert.equal(f.points.length, 2);
  assert.equal(f.events.length, 3);
  assert.ok(f.events.some(event => event.title.startsWith('Listening party')));
  f.decide(approvedId, 'approve');
  assert.equal(f.points.length, 2);
});

test('underpayment, wrong currency, unverified IPN and late payment cannot approve or reactivate releases', () => {
  const f = fixture();
  assert.equal(f.request('bandcamp-release', { booking_id: paidId }), 'ok');
  f.ipn(paidId, 'PENDING', '4.50', { payment_status: 'Pending', txn_type: '' });
  assert.equal(f.row(paidId).status, 'awaiting payment');
  assert.equal(f.Payments[0].booking_outcome, 'pending');
  f.ipn(paidId, 'PENDING', '4.50');
  assert.equal(f.row(paidId).status, 'awaiting approval');
  assert.equal(f.Payments[0].booking_outcome, 'accepted');
  assert.equal(f.Payments.length, 1);
  // Use a separate release to exercise underpayment and cancellation.
  const other = 'BK-OTHER1234567';
  assert.equal(f.request('bandcamp-release', { booking_id: other }), 'ok');
  f.ipn(other, 'SHORT', '2.50');
  f.ipn(other, 'SHORT', '2.50');
  assert.equal(f.row(other).payment_status, 'underpaid');
  assert.equal(f.Payments.filter(p => p.txn_id === 'SHORT').length, 1);
  f.ipn(other, 'USD', '4.50', { mc_currency: 'USD' });
  assert.equal(f.Payments.find(p => p.txn_id === 'USD').booking_outcome, 'payment needs verification');
  assert.match(f.decide(other, 'approve'), /not awaiting/);
  f.row(other).status = 'cancelled';
  f.ipn(other, 'LATE');
  assert.equal(f.row(other).status, 'cancelled');
  assert.equal(f.Payments.find(p => p.txn_id === 'LATE').booking_outcome, 'payment for inactive booking');
  f.failVerification();
  f.ipn(other, 'FAKE');
  assert.equal(f.Payments.some(p => p.txn_id === 'FAKE'), false);
  assert.equal(f.events.length + f.notices.length, 0);
});

test('calendar retry reuses the main event and preserves the approved date after a partial failure', () => {
  const f = fixture();
  f.request('streaming-release', { booking_id: paidId });
  f.ipn(paidId, 'TX1');
  f.failCalendar();
  assert.throws(() => f.decide(paidId, 'approve'), /calendar unavailable/);
  assert.equal(f.events.length, 1);
  assert.equal(f.row(paidId).status, 'scheduling');
  assert.equal(f.notices.length, 0);
  assert.match(f.decide(paidId, 'approve', '2099-01-01'), /Release approved/);
  assert.equal(f.row(paidId).date, f.date);
  assert.equal(f.events.length, 3);
});

test('YouTube and merch still confirm on payment, social posts still go to review, and curator payments use Submit.gs', () => {
  const f = fixture();
  f.activeMember();
  assert.equal(f.request('youtube-upload', { booking_id: 'BK-VIDEO1' }), 'ok');
  f.ipn('BK-VIDEO1', 'VID1', '1.00');
  f.ipn('BK-VIDEO1', 'VID1', '1.00');
  assert.equal(f.row('BK-VIDEO1').status, 'confirmed');
  assert.equal(f.events.length, 1);

  assert.equal(f.request('merch-listing', { booking_id: 'BK-MERCH1' }), 'ok');
  f.ipn('BK-MERCH1', 'MER1', '2.00');
  assert.equal(f.row('BK-MERCH1').status, 'confirmed');

  assert.equal(f.request('social-post', { assets: 'https://example.invalid/image', content_ok: 'yes', platform: 'ig-feed' }), 'ok');
  assert.equal(f.Posts[0].status, 'awaiting review');

  const submissionPayments = [];
  f.context.confirmSubmissionPayment_ = (...args) => submissionPayments.push(args);
  f.ipn('SUB-123456', 'CUR1', '2.00');
  assert.deepEqual(submissionPayments, [['SUB-123456', '2.00', 'CUR1']]);
});

test('paid decline retains the transaction and records subsequent payments without reactivation', () => {
  const f = fixture();
  f.request('streaming-release', { booking_id: paidId });
  f.ipn(paidId, 'TX1');
  assert.match(f.decide(paidId, 'decline'), /Review the payment separately/);
  f.ipn(paidId, 'TX1');
  f.ipn(paidId, 'TX2');
  assert.equal(f.row(paidId).status, 'declined');
  assert.equal(f.row(paidId).txn_id, 'TX1');
  assert.equal(f.Payments[1].booking_outcome, 'duplicate payment');
  assert.equal(f.events.length + f.notices.length, 0);
  assert.equal(f.emails.length, 2);
});

test('approval rechecks date availability and current membership eligibility', () => {
  const f = fixture();
  f.activeMember();
  assert.equal(f.request('bandcamp-release', { member_free: 'yes' }), 'ok');
  const id = f.Bookings[0].booking_id;
  f.Bookings.push({ kind: 'bandcamp-release', booking_id: 'BK-OCCUPIED', date: f.date, status: 'confirmed' });
  assert.match(f.decide(id, 'approve'), /full/);
  const nextDate = new Date(Date.parse(f.date) + 86400000).toISOString().slice(0, 10);
  f.Members[0].status = 'ended';
  assert.match(f.decide(id, 'approve', nextDate), /Verify payment or membership/);
  assert.equal(f.events.length, 0);
  f.Members[0].status = 'active';
  assert.match(f.decide(id, 'approve', nextDate), /Release approved/);
  assert.equal(f.row(id).date, nextDate);
  assert.equal(f.row(id).preferred_date, f.date);
});

test('Black Belt rewards cannot be reserved or consumed more than once', () => {
  const f = fixture();
  f.activeMember({ free_release: 1 });
  assert.equal(f.request('bandcamp-release', { free_release: 'yes' }), 'ok');
  const id = f.Bookings[0].booking_id;
  assert.match(f.request('bandcamp-release', { free_release: 'yes' }), /^refused/);
  assert.match(f.decide(id, 'approve'), /Release approved/);
  assert.match(f.request('bandcamp-release', { free_release: 'yes' }), /^refused/);
});
