/* ============================================================
   RRR SITE SETTINGS
   Everything the owner may need to switch on lives here.
   Nothing goes live until these are changed on purpose.
   ============================================================ */
window.RRR_CONFIG = {
  // Sign-up form on the home page (#join). Keep false until launch.
  signupOpen: false,

  // Booking forms on book.html. Keep false until launch.
  bookingOpen: false,

  // Where submitted forms are sent once open.
  // Paste a form endpoint here (e.g. a Formspree or Google Apps Script URL).
  // Leave empty and forms stay in "coming soon" mode even if opened above.
  formEndpoint: "",

  // PayPal. Create these in your PayPal Business account (see README).
  paypal: {
    clientId: "",            // Live client ID from developer.paypal.com
    currency: "EUR",
    plans: {                 // Subscription plan IDs, one per monthly tier
      artist: "",            // €1.00 / month
      fan: "",               // €0.50 / month
      supporterArtist: "",   // €0.50 / month
      supporterFan: ""       // €0.25 / month
    }
  },

  // Release upload fees (one-off). Used by the booking page.
  uploadFees: { single: 1.00, ep: 2.00, album: 2.50 },

  // Asset deadlines in days before release day (from the price list).
  // Bandcamp editorial is NOT an RRR service; shown as a guideline only.
  // Owner guidance: artists submit themselves at least 8–9 weeks before release.
  deadlines: { bandcampAssetsDays: 21, streamingAssetsDays: 14, editorialEarliestDays: 63, editorialLatestDays: 56 },

  // Groover link for The Bandcamp Hour submissions.
  grooverUrl: "https://groover.co/band/signup/referral/influencer/16806/",

  email: "retroreverbrecords@gmail.com"
};
