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
  automationUrl: "https://script.google.com/macros/s/AKfycbxuMic9BC8cBEvKvUcND7f5n364jceS0Ev2WUmDBmsshuorqFIcYokUsigfns0S2WHP/exec",

  // Public address of this site (used for PayPal "return to site" links).
  siteUrl: "https://retroreverbrecords.github.io/",

  // HOW PEOPLE PAY
  // membershipVia: "paypal"   = monthly PayPal subscription to paypalEmail (automated)
  //                "bandcamp" = RRR Bandcamp subscription (not automated: Bandcamp has no notifications for us)
  payments: {
    membershipVia: "paypal",
    paypalEmail: "retroreverbrecords@gmail.com",
    bandcampSubscribeUrl: "https://retroreverbrecords.bandcamp.com/subscribe"
  },

  // ============================================================
  // PRICES — THE ONLY PLACE PRICES ARE SET. Every page reads them from here.
  // Owner decision, 29 Sep 2026.
  // ============================================================
  prices: {
    artist: 2.00,            // Artist membership, per month
    fan: 1.00,               // Fan membership, per month
    supporterArtist: 1.00,   // Pause (Community Supporter Status), artist, per month
    supporterFan: 0.50,      // Pause (Community Supporter Status), fan, per month
    single: 2.00,            // Upload fee: single. Same price for Bandcamp, streaming or both
    ep: 2.50,                // Upload fee: EP, 2–5 tracks. Same price for Bandcamp, streaming or both
    album: 3.00,             // Upload fee: album, 6+ tracks. Same price for Bandcamp, streaming or both
    youtube: 1.50            // YouTube upload, per video
  },

  // SELL YOUR MERCH WITH US
  // commissionPercent: RRR's share of each merch sale. null = not decided yet (site says "a percentage").
  merch: {
    commissionPercent: null,
    fulfilment: [
      { name: "Printful", what: "Print-on-demand shirts, hoodies, posters; ships worldwide", url: "https://www.printful.com/" },
      { name: "Printify", what: "Print-on-demand apparel and accessories, many print partners", url: "https://printify.com/" },
      { name: "Gelato", what: "Print-on-demand, prints locally in many countries", url: "https://www.gelato.com/" },
      { name: "elasticStage", what: "Vinyl on demand: pressed and shipped per order", url: "https://elasticstage.com/" },
      { name: "Qrates", what: "Vinyl crowdfunding, pressing and fulfilment", url: "https://qrates.com/" }
    ]
  },

  // Current version of the Terms. Change the date when the Terms change;
  // new sign-ups then sign the new version.
  termsVersion: "2026-09-29-beta3",

  // YouTube community
  youtube: {
    channel: "https://www.youtube.com/@RetroReverbRecords",
    live: "https://www.youtube.com/@RetroReverbRecords/streams",
    community: "https://www.youtube.com/@RetroReverbRecords/posts",
    subscribe: "https://www.youtube.com/@RetroReverbRecords?sub_confirmation=1"
  },

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
      artist: "",            // plan for prices.artist
      fan: "",               // plan for prices.fan
      supporterArtist: "",   // plan for prices.supporterArtist
      supporterFan: ""       // plan for prices.supporterFan
    }
  },

  // Asset deadlines in days before release day (owner decision, 29 Sep 2026):
  // streaming 3 weeks, Bandcamp 2 weeks.
  // Editorial pitching is NOT an RRR service; shown as guidelines only:
  // Bandcamp editorial 8–9 weeks (Bandcamp says 8 weeks is ideal), Spotify at least 7 days (official minimum).
  deadlines: { bandcampAssetsDays: 14, streamingAssetsDays: 21, editorialEarliestDays: 63, editorialLatestDays: 56, spotifyPitchDays: 7 },

  // Groover link for The Bandcamp Hour submissions.
  grooverUrl: "https://groover.co/band/signup/referral/influencer/16806/",

  // RRR SELECTED RELEASE SERIES. Add a line to add a series.
  // Keep names and prefixes in step with SERIES in backend/Code.gs.
  // "about" is shown on the Series page: edit freely.
  series: [
    { name: "RRR SYNTH",       prefix: "RRSYN",  about: "Synthwave, retrowave, outrun",          color: "#FF2FA8" },
    { name: "RRR DARK",        prefix: "RRDRK",  about: "Darksynth, cyberpunk, darkwave",        color: "#FF2A5A" },
    { name: "RRR ELECTRONIC",  prefix: "RRELEC", about: "Electronic, electro, techno, dance",    color: "#3FD0FF" },
    { name: "RRR AMBIENT",     prefix: "RRAMB",  about: "Ambient, downtempo, chill",             color: "#2ED47A" },
    { name: "RRR ALTERNATIVE", prefix: "RRALT",  about: "Alternative, indie, rock, experimental", color: "#9B5CFF" }
  ],

  email: "retroreverbrecords@gmail.com"
};

// Older names some code still reads — kept in step automatically. Don't edit these.
window.RRR_CONFIG.membershipPrices = { artist: window.RRR_CONFIG.prices.artist, fan: window.RRR_CONFIG.prices.fan };
window.RRR_CONFIG.uploadFees = { single: window.RRR_CONFIG.prices.single, ep: window.RRR_CONFIG.prices.ep, album: window.RRR_CONFIG.prices.album, youtube: window.RRR_CONFIG.prices.youtube };
