/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* ============================================================
   RRR SYNTH STARS — CARD REGISTER
   This is the list of official cards. A card is genuine only
   if its serial is listed here AND its secret check code matches.

   Check codes are never stored here. Only a fingerprint (hash)
   of serial + code is stored, so reading this file does not
   reveal any codes. Make new entries with card-maker.html.
   ============================================================ */
window.RRR_CARDS = {
  seasons: {
    "S1": { name: "Season 1", size: 52 }
  },

  // The 52 slots in each season. Add artists as their cards are made.
  roster: {
    "S1": {
      "01": { artist: "Eden Future", style: "Shredwave", image: "assets/card-eden-future.jpg" }
    }
  },

  // Edition types printed on the card.
  editions: {
    M: "Member card (free with membership)",
    P: "Official print (numbered)",
    A: "Artist-signed single edition"
  },

  // Issued copies. One line per physical card.
  // serial: Season-Card-Edition-Copy, e.g. S1-01-P-0007
  // hash:   made by card-maker.html from serial + check code
  issued: [
    // DEMO so you can try the checker. Serial DEMO-01-P-0000, code SYNTH-DEMO. Delete before launch.
    { serial: "DEMO-01-P-0000", hash: "e53669f85848ed012a175eb63c6585e136657878b7a8ebe31e8c959b81ee215e", of: 50, issuedOn: "2026-09-29", demo: true }
  ]
};
