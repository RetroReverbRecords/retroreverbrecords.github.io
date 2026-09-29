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
