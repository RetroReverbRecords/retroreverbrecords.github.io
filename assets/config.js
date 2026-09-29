/* ============================================================
   RRR SITE SETTINGS
   Everything the owner may need to switch on lives here.
   Nothing goes live until these are changed on purpose.
   ============================================================ */
window.RRR_CONFIG = {
  // Sign-up form on the home page (#join). Keep false until launch.
  signupOpen: false,

  // Beta testing: open the site with ?beta=rrr-beta to use the forms before launch.
  // Open with ?beta=off to leave beta mode. Change or empty this at launch.
  betaKey: "rrr-beta",

  // Booking forms on book.html. Keep false until launch.
  bookingOpen: false,

  // Older setting, kept for compatibility. Use automationUrl instead.
  formEndpoint: "",

  // AUTOMATION: paste the Google Apps Script web app URL here (see backend/SETUP.md).
  // Sign-ups, bookings and PayPal notifications all go to it.
  automationUrl: "",

  // Public address of this site (used for PayPal "return to site" links).
  siteUrl: "https://beta.retroreverbrecords.com/",

  // HOW PEOPLE PAY
  // membershipVia: "paypal"   = monthly PayPal subscription to paypalEmail (automated)
  //                "bandcamp" = RRR Bandcamp subscription (not automated: Bandcamp has no notifications for us)
  payments: {
    membershipVia: "paypal",
    paypalEmail: "retroreverbrecords@gmail.com",
    bandcampSubscribeUrl: "https://retroreverbrecords.bandcamp.com/subscribe"
  },

  // Monthly membership prices (placeholder, 27 Sep 2026)
  membershipPrices: { artist: 3.00, fan: 0.50 },

  // MARKETING PIXELS. Paste IDs to switch on. They only load after a visitor
  // clicks "Accept" on the cookie banner (required in the EU).
  pixels: {
    metaPixelId: "",     // Meta (Facebook/Instagram) Pixel ID, e.g. "123456789012345"
    googleTagId: "",     // Google Analytics 4 / Google Ads tag, e.g. "G-XXXXXXX"
    tiktokPixelId: ""    // TikTok Pixel ID
  },

  // PLAYLISTS AND SUBMISSIONS
  spotifyPlaylistId: "6NOScmeECIxFvRz9jcinjm",
  playlistPandaUrl: "https://playlistpanda.com/curator/profile",   // check: should be RRR's public curator page
  grooverWidgetUrl: "https://groover.co/influencer/widget/0.retroreverbrecords?color=pink-yellow&ratio=rectangle&format=responsive&size=480&customText=Send%20us%20your%20track%20through%20Groover%2C%20get%20listened%20to%20and%20feedback%20guaranteed!&picture=true",

  // RRR's Bandcamp label ID. Release links carry it so they open through the RRR label.
  bandcampLabelId: "2880365093",

  // PayPal checkout with MORE WAYS TO PAY (card, Apple Pay/Google Pay where available,
  // Pay Later, MyBank, SEPA, iDEAL, Bancontact...). All money lands in the RRR PayPal.
  // Needs a free PayPal developer app: paste its Live Client ID here (see backend/SETUP.md).
  // Empty = simple PayPal buttons using paypalEmail (PayPal or card as guest).
  paypal: {
    clientId: "",            // Live client ID from developer.paypal.com
    currency: "EUR",
    plans: {                 // Subscription plan IDs, one per monthly tier
      artist: "",            // €3.00 / month (placeholder)
      fan: "",               // €0.50 / month
      supporterArtist: "",   // €0.50 / month
      supporterFan: ""       // €0.25 / month
    }
  },

  // Release upload fees (one-off). Used by the booking page.
  uploadFees: { single: 2.00, ep: 3.00, album: 3.50, youtube: 2.00 },  // PLACEHOLDER prices, 27 Sep 2026

  // Asset deadlines in days before release day (from the price list).
  // Bandcamp editorial is NOT an RRR service; shown as a guideline only.
  // Owner guidance: artists submit themselves at least 8–9 weeks before release.
  deadlines: { bandcampAssetsDays: 21, streamingAssetsDays: 14, editorialEarliestDays: 63, editorialLatestDays: 56 },

  // Groover link for The Bandcamp Hour submissions.
  grooverUrl: "https://groover.co/band/signup/referral/influencer/16806/",

  email: "retroreverbrecords@gmail.com"
};
