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
