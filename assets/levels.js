/* © 2016–2026 Retro Reverb Records. All rights reserved. Proprietary: no copying, reuse or redistribution without written permission. See LICENSE. */
/* ============================================================
   RRR LEVELS — karate belts, then Dans. Proposed values: edit freely.
   Keep backend/Code.gs BELTS and POINTS in step with this file.
   ============================================================ */
window.RRR_LEVELS = {
  belts: [
    { name: "White belt",  min: 0,     color: "#F2F2F2" },
    { name: "Yellow belt", min: 100,   color: "#F7D23E" },
    { name: "Orange belt", min: 250,   color: "#FF8A2A" },
    { name: "Green belt",  min: 450,   color: "#2ED47A" },
    { name: "Blue belt",   min: 700,   color: "#3D8BFF" },
    { name: "Purple belt", min: 1000,  color: "#9B5CFF" },
    { name: "Brown belt",  min: 1400,  color: "#8B5A2B" },
    { name: "Black belt · 1st Dan", min: 2000,  color: "#0B0B0F", dan: 1 },
    { name: "2nd Dan",  min: 2700,  color: "#0B0B0F", dan: 2 },
    { name: "3rd Dan",  min: 3400,  color: "#0B0B0F", dan: 3 },
    { name: "4th Dan",  min: 4200,  color: "#0B0B0F", dan: 4 },
    { name: "5th Dan",  min: 5000,  color: "#0B0B0F", dan: 5 },
    { name: "6th Dan",  min: 5900,  color: "#0B0B0F", dan: 6 },
    { name: "7th Dan",  min: 6900, color: "#0B0B0F", dan: 7 },
    { name: "8th Dan",  min: 7900, color: "#0B0B0F", dan: 8 },
    { name: "9th Dan",  min: 9000, color: "#0B0B0F", dan: 9 },
    { name: "10th Dan", min: 10000, color: "#0B0B0F", dan: 10 }
  ],
  // Grandmaster stars: after 10th Dan, one ★ for every extra 2,000 points
  starEvery: 2000,
  // Belts also need time: at least 2 weeks at each colour belt and 8 weeks at each Dan
  colourWeeks: 2, danWeeks: 8, weeklyCap: 60,
  // how: "auto" = the system adds them · "claim" = send a proof link (small ones are approved instantly)
  //      "code" = enter the code word said at the show or event. Keep in step with ACTIVITY in backend/Code.gs
  points: [
    { group: "Support other artists", items: [
      { key: "buy", action: "Buy another member's release or merch", pts: 15, how: "claim", cap: "up to 5 a week" },
      { key: "preorder", action: "Pre-order or pre-save a member release", pts: 10, how: "claim", cap: "up to 3 a week" },
      { key: "playlist", action: "Add a member's track to a public playlist", pts: 5, how: "claim", cap: "up to 5 a week" },
      { key: "bcComment", action: "Leave a \"supported by\" comment on a member's Bandcamp release", pts: 5, how: "claim", cap: "up to 3 a week" },
      { key: "share", action: "Share or comment on an official RRR Instagram or TikTok post (likes don't count)", pts: 3, how: "claim", cap: "up to 5 a week" },
      { key: "help", action: "Help another member (feedback, mixing tips, artwork)", pts: 10, how: "claim", cap: "up to 2 a week" },
      { key: "listen", action: "Listen to a member release on release day (code word in the release notes)", pts: 5, how: "code", cap: "up to 7 a week" }
    ]},
    { group: "Live shows and community", items: [
      { key: "live", action: "Be at The Bandcamp Hour live (code word on air)", pts: 5, how: "code", cap: "once a week" },
      { key: "party", action: "Join a listening party or community event", pts: 10, how: "code", cap: "up to 2 a week" },
      { key: "mission", action: "Complete a community mission", pts: 10, how: "code", cap: "up to 3 a week" }
    ]},
    { group: "Grow the community", items: [
      { action: "A fan you invited joins and pays their first month", pts: 20, how: "auto", cap: "up to 2 a week" },
      { action: "An artist you invited joins and pays their first month", pts: 40, how: "auto", cap: "1 a week" },
      { action: "Sign up to the newsletter", pts: 5, how: "auto" }
    ]},
    { group: "Your own journey", items: [
      { action: "Join the community", pts: 10, how: "auto" },
      { action: "Every month as an active member", pts: 10, how: "auto" },
      { action: "Book a release", pts: 15, how: "auto", cap: "1 a week" },
      { action: "Book a social post", pts: 5, how: "auto", cap: "up to 4 a week" },
      { action: "Book a YouTube premiere", pts: 5, how: "auto" },
      { action: "A review or feature about you approved on the Press wall", pts: 20, how: "auto" },
      { action: "Release selected for an RRR series", pts: 50, how: "auto" }
    ]}
  ]
};
