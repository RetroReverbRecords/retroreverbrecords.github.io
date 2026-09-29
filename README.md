# Retro Reverb Records – membership platform

Website for the RRR Community. Static site, no build step, hosted with GitHub Pages
(Settings → Pages → Deploy from branch → `main` / root).

## Pages
- `index.html` – membership, release prices and deadlines, catalogue (coming up / out now), physical merch, community, sign-up, contacts
- `how-it-works.html` – step-by-step for artists and fans, FAQ
- `cards.html` – Synth Stars: check a card (serial + check code), swapping rules, Season 1 roster
- `card-maker.html` – owner tool (not linked): makes serials and secret check codes for a print run
- `member.html` – member dashboard (rank, points, achievements, releases, posts, stats). Open with `?id=RRR-XXXXX`
- `backend/` – Google Apps Script automation + **SETUP.md** (sheet, PayPal notifications, calendar, emails, Songstats)
- `press.html` – press & reviews wall + "share your review" form
- `manifest.webmanifest`, `sw.js` – makes the site an installable phone app
- `history.html` – RRR history timeline since 2016, with sources
- `book.html` – booking forms: Bandcamp release, streaming release, social media post, YouTube upload, The Bandcamp Hour (Groover); deadline planner

## Settings – `assets/config.js`
Everything that switches something on lives here. Nothing is live until changed on purpose.

| Setting | What it does |
|---|---|
| `signupOpen` | Opens the sign-up form. Also needs `formEndpoint`. |
| `bookingOpen` | Opens the booking forms. Also needs `formEndpoint`. |
| `formEndpoint` | URL that receives form submissions (e.g. Formspree, or a Google Apps Script web app that writes to the RRR operations sheet and calendar). |
| `payments.membershipVia` | `"bandcamp"` (default): membership is the RRR Bandcamp subscription. `"paypal"`: use the PayPal plans below. |
| `payments.paypalMe` | Your PayPal.Me name. Turns on "Pay €X with PayPal" buttons for release and YouTube upload fees. |
| `paypal.clientId`, `paypal.plans.*` | Only if membership moves to PayPal subscriptions. |
| `deadlines` | Asset deadlines used by the planner (days before release). |

## Adding releases – `assets/releases.js`
Add booked releases to `upcoming` (date as `YYYY-MM-DD`). Past dates hide automatically.
`latest` and `merch` are copied from the RRR Bandcamp page; update when the catalogue changes.

## Payments
- **Membership:** set the price of the RRR Bandcamp subscription (Bandcamp → Tools/Subscription) to match the site. The sign-up "Subscribe on Bandcamp" button appears when `signupOpen` is true.
- **One-off fees:** create a PayPal.Me link (paypal.me) for the RRR PayPal account and put the name in `payments.paypalMe`.

## Setting up PayPal subscriptions (only if not using Bandcamp)
1. Log in to a **PayPal Business** account for RRR.
2. Go to developer.paypal.com → Apps & Credentials → **Live** → create an app, copy the **Client ID** into `paypal.clientId`.
3. In PayPal, create a **Product** "RRR Membership", then four monthly **Plans**: Artist €1.00, Fan €0.50, Supporter Artist €0.50, Supporter Fan €0.25.
4. Paste each Plan ID into `paypal.plans`.
5. Set `signupOpen: true` only when everything else is ready.

Content source: *RRR Community Membership & Services Price List* and the RRR Bandcamp page.

## Synth Stars cards – making a print run
1. Open `card-maker.html` on the live site (it isn't linked anywhere).
2. Pick season, card number (1–52), edition (M member, P numbered print, A artist-signed), run size and how many.
3. **Print list** (serial + check code): send only to the printer. Serial goes on the front; check code goes under the holographic sticker on the back. Keep it private.
4. **Register lines**: paste into `assets/cards.js` under `issued`, then commit. These only contain a fingerprint, never the codes.
5. New artist in the season? Add them to `roster` in `assets/cards.js` with their card image.
6. Delete the DEMO entry before launch.
