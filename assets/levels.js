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
    { name: "2nd Dan",  min: 3000,  color: "#0B0B0F", dan: 2 },
    { name: "3rd Dan",  min: 4200,  color: "#0B0B0F", dan: 3 },
    { name: "4th Dan",  min: 5600,  color: "#0B0B0F", dan: 4 },
    { name: "5th Dan",  min: 7200,  color: "#0B0B0F", dan: 5 },
    { name: "6th Dan",  min: 9000,  color: "#0B0B0F", dan: 6 },
    { name: "7th Dan",  min: 11000, color: "#0B0B0F", dan: 7 },
    { name: "8th Dan",  min: 13500, color: "#0B0B0F", dan: 8 },
    { name: "9th Dan",  min: 16500, color: "#0B0B0F", dan: 9 },
    { name: "10th Dan", min: 20000, color: "#0B0B0F", dan: 10 }
  ],
  // how: "auto" = the system awards it; "checked" = RRR confirms it (send proof)
  points: [
    { group: "Support other artists", items: [
      { action: "Full listen + save + playlist add of another member's release in its release week", pts: 5, how: "checked", cap: "up to 10 releases a week" },
      { action: "Buy another member's release or merch on Bandcamp", pts: 15, how: "checked" },
      { action: "Share another member's release by DM or story", pts: 3, how: "checked", cap: "up to 10 a week" },
      { action: "Be in the live chat of The Bandcamp Hour or a member's YouTube premiere", pts: 5, how: "checked" },
      { action: "Help another member (feedback, artwork help, collab)", pts: 10, how: "checked" }
    ]},
    { group: "Grow the community", items: [
      { action: "A fan you invited joins", pts: 20, how: "auto" },
      { action: "An artist you invited joins", pts: 40, how: "auto" },
      { action: "Sign up to the newsletter", pts: 5, how: "auto" },
      { action: "Complete a community mission", pts: "10–50", how: "checked" }
    ]},
    { group: "Your own journey", items: [
      { action: "Join the community", pts: 10, how: "auto" },
      { action: "Every month as an active member", pts: 10, how: "auto" },
      { action: "Book a release", pts: 15, how: "auto" },
      { action: "Book a social post or YouTube upload", pts: 5, how: "auto" },
      { action: "A review or feature about you approved on the Press wall", pts: 20, how: "auto" }
    ]}
  ]
};
