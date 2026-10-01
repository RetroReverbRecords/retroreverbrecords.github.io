/* RRR app: works offline for pages already visited; always tries the network first
   so members see fresh data. Bump VERSION when you change files. */
const VERSION = 'rrr-v2';
const CORE = ['./', 'index.html', 'member.html', 'book.html', 'cards.html', 'how-it-works.html', 'press.html', 'history.html',
  'assets/site.css', 'assets/site.js', 'assets/config.js', 'assets/releases.js', 'assets/member-page.js', 'assets/cards.js', 'assets/cards-page.js',
  'assets/rrr-logo-long.png', 'assets/rrr-logo-stack.png', 'assets/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // never touch PayPal, Google, Spotify
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
    .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
