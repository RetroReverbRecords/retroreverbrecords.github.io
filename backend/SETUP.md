# RRR automation – setup (about 15 minutes, once)

This connects the website, PayPal and your Google account so that:
- every **sign-up** and **booking** lands in a Google Sheet,
- every **PayPal subscription and payment** is recorded and **you get an email immediately**,
- bookings go into a **"RRR Releases" Google Calendar** with asset deadlines,
- each member gets a **dashboard** (member.html) with rank, points, achievements, releases, posts and stats,
- you get a **daily digest email** at 8am,
- (optional) **Songstats** stats are pulled in daily.

Do all of this signed in as **retroreverbrecords@gmail.com**.

## 1. Create the sheet and paste the code
1. Go to sheets.google.com and create a blank sheet called **RRR Operations**.
2. In the sheet: **Extensions → Apps Script**.
3. Delete what's there, paste the whole of `backend/Code.gs`, click **Save**.
4. In the function menu at the top pick **setup** and click **Run**. Google asks for permission (Sheets, Calendar, send email, external requests). Click through and **Allow**. This creates the tabs, the calendar and the daily digest.

## 2. Publish it as a web app
1. Click **Deploy → New deployment**. Type: **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
3. Click **Deploy** and copy the **Web app URL** (ends in `/exec`).

## 3. Tell the website about it
In `assets/config.js` (on GitHub: open the file, click the pencil):
- paste the URL into `automationUrl: ""`
- when you're ready to launch, set `signupOpen: true` and `bookingOpen: true`

(Or send Claude the URL and it will do this.)

## 4. PayPal
The site uses PayPal's standard buttons with your email, so there is nothing to create in PayPal except:
1. **Business account:** monthly subscriptions need a PayPal **Business** account. Converting a personal account is free: PayPal → Settings → Upgrade to a Business account.
2. **Turn on notifications:** PayPal → Account Settings → **Notifications → Instant payment notifications → Update → Choose IPN settings**. Paste the web app URL from step 2 and choose **Receive IPN messages (Enabled)**. (The website also sends this URL with each payment, so this is a backup.)

## 5. Songstats (optional)
Needs a Songstats **Enterprise API** key (contact api@songstats.com; paid add-on).
1. Apps Script → **Project Settings → Script properties → Add**: name `SONGSTATS_API_KEY`, value your key.
2. For each artist member, put their Songstats artist ID in the `songstats_artist_id` column of the Members tab (it's in the address bar on songstats.com/artist/**XXXXXXXX**/...).
3. Stats update daily and show on their dashboard.

## What gets emailed to you
- New sign-up, new booking, **new subscription**, subscription payment, cancellation, failed payment, one-off payment: straight away.
- Daily digest: new members, payments, bookings, asset deadlines in the next 7 days, active member count.

Members are never emailed by this code.

## Achievements and points
Automatic: joined, first release booked, first social post, first YouTube upload, 3 months, 1 year.
Manual: add a row to the **Achievements** tab (member_id, achievement, date, points). Points and rank update the next time anything happens for that member, or run `daily`.
Ranks: Signal 0 · Echo 50 · Reverb 150 · Resonance 400 · Legend 1000 (edit `RANKS` in the code).

## Privacy
Dashboards only show name, rank, points, achievements, releases, posts and stats. Email, address and payment details never leave the sheet. Set `public` to `no` on a member's row to hide their dashboard.

## Bandcamp subscriptions
Bandcamp doesn't send payment notifications to other systems, so Bandcamp subscribers can't be automated this way. That's why the site uses PayPal for membership. Existing Bandcamp VIP subscribers can be added to the Members tab by hand.

## 6. More ways to pay (all money still lands in PayPal)
Without this, people can pay with PayPal or as a guest with a card. To also offer **Apple Pay / Google Pay (where available), Pay Later, MyBank, SEPA, iDEAL, Bancontact** and more:
1. Go to **developer.paypal.com**, log in with the RRR PayPal (Business) account.
2. **Apps & Credentials → Live → Create App** (name it "RRR website").
3. Copy the **Client ID** into `paypal.clientId` in `assets/config.js`.
4. For monthly memberships with card too: PayPal → **Pay & Get Paid → Subscriptions → Create plan**, one per price (Artist €3, Fan €0.50). Paste each Plan ID into `paypal.plans`.
5. Guest card payments: PayPal → Settings → Website payments → **PayPal Account Optional: On**.
(Which methods show depends on the buyer's country and device.)

## 7. Monthly newsletter (automatic)
- Sign-up box is on every page. Addresses go to the **Subscribers** tab with the date they agreed.
- **28th of each month:** you get a preview by email.
- **1st of each month:** it's sent to everyone subscribed, about 90 a day (free Gmail limit), so a big list goes out over a few days.
- Content is built automatically: releases last month, **top social posts**, releases coming next month, approved press, new artists, the Spotify playlist.
- To pause: in the **Settings** tab add a row `newsletter_mode` | `preview` (only you get it) or `off`.
- Every email has an unsubscribe link that works automatically.

**Top social posts** come from:
- **Instagram (automatic):** needs an Instagram *Business or Creator* account linked to a Facebook Page, and a long-lived access token from developers.facebook.com (Instagram Graph API). Add Script properties `IG_ACCESS_TOKEN` and `IG_USER_ID`.
- **Anything else:** type likes or views into the **Posts** tab.

## 8. Marketing pixels
Paste your IDs into `pixels` in `assets/config.js`:
- **Meta Pixel** (Facebook/Instagram ads): Meta Events Manager → Data sources → Pixel ID.
- **Google tag** (Analytics 4 / Google Ads): the `G-…` ID.
- **TikTok Pixel**: TikTok Ads Manager → Assets → Events.
The site then shows a cookie banner; pixels load only if the visitor clicks **Accept** (EU rule). Events sent: page view, newsletter sign-up (Lead), member sign-up (CompleteRegistration), booking (Schedule), payment (Purchase).

## 9. Press & reviews
Artists share links on press.html. You get an email; type **yes** in the `approved` column of the **Press** tab and it appears on the wall and in the next newsletter.

## 10. Phone app
The site is an installable app. On the live site, members open **My dashboard** and tap **Install app** (Android/desktop Chrome) or **Share → Add to Home Screen** (iPhone). The app opens straight to their dashboard and remembers their member ID.

## Release booking approval (Phase 1)

Use the private spreadsheet's **Bookings** tab for Bandcamp and streaming
booking decisions. Limit edit access to staff authorised to review releases,
set dates, and see private artist and payment data. The separate **Releases**
tab and its Selected Releases menu still handle series, affiliation and
catalogue numbers.

1. Filter `status` to `awaiting approval` or `changes requested`. Open the
   artist's review link from `details`, or ask them privately for material.
   Review the music, artwork, metadata, rights and release requirements.
2. Set `release_decision` to `approve`, `request changes` or `decline`.
   Use `decision_note` for an artist-facing change request or decline reason.
   To approve a different date, set `approval_date` to YYYY-MM-DD. Keep it blank
   to approve the preferred date. Approval checks availability and entitlement
   again. An unavailable date needs an explicit replacement.
3. Select a cell in that row and choose **RRR → Process selected booking
   decision**. Approval creates the calendar events, deadlines and upload
   reminders, then sends the confirmed date. If Calendar interrupts the run
   and the row is marked `scheduling`, run the same action again. It uses the
   saved date and finds existing events by booking reference. If a confirmed
   row is missing a notification or reward, reconcile it manually using the
   execution logs before sending or crediting it.
4. Check **Payments** by `booking_id` for underpayments, extra transactions
   and payments for inactive bookings. The booking retains its accepted
   transaction. The ledger keeps separate transaction IDs, amounts, currencies
   and outcomes. Reconcile exceptional payments manually with PayPal records.
   Partial transactions are not automatically combined, and no action here
   issues refunds. Review any paid decline separately.

Pending included Bandcamp bookings reserve the allowance for the preferred
month. A decline or cancellation releases a pending allowance. Approval in a
different month checks the allowance there. Previously used Black Belt rewards
were already deducted from the member balance. New reward bookings reserve or
consume a credit through their booking record, so retain those rows.

### Staging and rollout

- Run `node --test tests/release-booking.test.cjs` from the checkout. These tests
  mock Sheets, PayPal verification, Calendar and Mail.
- In a separate staging spreadsheet and Apps Script deployment, load the
  backend first. Use test-only service configuration, recipients and calendars.
  Run `setup()` in staging to initialise headers, then reopen the spreadsheet
  for the new menu. `sheet_()` adds missing columns to the existing headers.
  No sheet rename or bulk rewrite is required.
- Point the staging site at the staging script. The new paid release form
  awaits server confirmation of the booking reference and price before
  displaying PayPal. Verify this check, refusal handling and decision emails
  in a browser. If rollout is approved later, update the Apps Script backend
  before making the frontend available.
- Audit legacy booking rows before rollout. Existing confirmations and
  calendar events are preserved. A valid payment on a legacy awaiting-payment
  row moves the old date to `preferred_date` and enters review. Reconcile any
  ambiguous references, historical underpayments, and payments that were
  recorded without a matching booking before editing their status.
- Apps Script and Calendar cannot commit together. A stopped approval can
  leave the row in `scheduling`. Notification attempts are recorded through
  state transitions before sending to avoid duplicates. If delivery fails,
  check execution logs and reconcile manually. The existing PayPal relay
  acknowledges receipt before forwarding, so verify its forwarding and
  reconcile delivery failures against PayPal and the spreadsheet.
- The booking form still looks up membership by the submitted email. Review
  the artist's identity with the registered contact before approving a
  questionable member request. A private spreadsheet editor with decision
  permissions can approve releases.
- Investigate the historical possible duplicate payment separately using
  authorised PayPal transaction records and the matching booking reference.
  Compare completed transaction IDs, timestamps, amounts, currency and any
  reversals. Repeated delivery of one transaction ID does not establish a
  second charge.

### Phase 2 release intake

The Book page uses one release form for Bandcamp, streaming, or both. Older
Bandcamp and streaming booking links still preselect their destination. Review
the existing Bookings row's `details` JSON for destination, review folder,
rights notes and the ordered `release_tracks` array. A combined release is
still one Bandcamp booking with streaming enabled, at the existing price.
Deploy the backend before the new page in an approved rollout. No sheet
migration is required. The backend still accepts the older booking format.

Run `node --test tests/release-booking.test.cjs` for intake and approval
regression coverage. Distributor-specific validation and any new rights
agreement language require verification and review before they are added.

### Phase 3 private artist profiles

The Book page and member dashboard link to the artist profile editor. The
editor sends a 30-minute link to the email already registered on an artist
membership. The sheet stores only a digest of the token, its expiration and
the profile JSON, in new columns on the existing Members tab. Open the editor
and verify email delivery, profile save and release form prefill using a staging
artist and a test inbox. Deploy the backend before the editor in an approved
rollout. No manual sheet migration is required.

Profile edits affect release intake details. The registered email, payout
settings, public dashboard identity and live linked-platform settings are
managed through their existing workflows.

### Local release delivery and audio checks

From the repository root, save the JSON from the approved Bookings row's
`details` cell as `details.json`. Put only that release's audio, artwork and
lyrics in a local folder. Run the following with Python 3.12 and FFmpeg
installed:

```sh
python3 scripts/release_audio.py path/to/assets/track.wav path/to/assets/track.mp3
python3 scripts/release_package.py details.json path/to/assets release.zip
```

The audio command returns JSON measurements of the first audio stream in each
file. A nonzero exit status means at least one file could not be decoded or
measured. A full-scale or overs flag indicates clipping risk. Use the
measurements for technical review alongside listening and current distributor
requirements. These tools run locally and do not upload files. The ZIP contains
private release and contact metadata, so keep it with the release team.

The intake stores the new AI declaration and the artist's explanation in
`details`. Use the existing `request changes` decision and an artist-facing
note to ask for clarification. AI disclosures do not trigger automatic
eligibility decisions. This workflow does not send release masters to the
existing AI checker.

Apps Script continues to own approval, payment state and calendar events.
Local packaging and analysis avoid adding storage, paid services or public
CI jobs for private masters. A future Drive integration would need private
folder permissions, consent and a repeatable way to assign each submitted file
to its track. Add it only after those details and staging delivery are verified.

An approved release email includes an all-day `rrr-release.ics` attachment
with the confirmed date. Verify import in a staging inbox before rollout.
For a future, unuploaded release approved with the current code, enter
`reschedule` or `cancel` in `release_decision` and select **RRR → Process
selected booking decision**. For a move, put the new date in `approval_date`.
Use `decision_note` for any extra information to send the artist. The system
updates the recorded release calendar events and linked Notice Board entry.
It sends the artist a revised calendar file for a move. A cancellation keeps
the payment on record for separate reconciliation.

If calendar execution stops partway through, rerun the same decision. It
continues with the saved target date. Use the manual calendar process for
older bookings that lack a stored set of event IDs, events with changed
markers, past releases and releases already uploaded to a distributor.
Verify a move and cancellation against an isolated staging calendar and
test inbox before rollout.

### Repeatable release checks

From the repository root, run `scripts/check_release_workflow.sh` with Node,
Python 3.12, FFmpeg/FFprobe and Playwright with Chromium available. If using
system Chromium, set `RRR_CHROMIUM` to its executable path. The browser
fixtures intercept requests and use synthetic data. No service credentials,
test payments, or access to the production site are needed.

Before rollout, separately verify staging PayPal notification delivery,
profile email delivery, and opening the approval calendar attachment in a
test inbox. The simulated Sheets approval, included membership, and
underpayment decisions were already exercised. Use the staging relay to
diagnose PayPal delivery when it is available. Hold production rollout
pending staging validation and owner approval.
