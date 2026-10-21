// Billiard Traveller Τουρνουά — service worker (v43)
// Σελίδες: πρώτα από το internet (για να έρχονται αμέσως οι αναβαθμίσεις), αλλιώς από την αποθήκευση.
const VERSION = 'bt-tour-v71';
const CORE = ['./app.html', './index.html', './manifest.webmanifest', './tour-icon-192.png', './tour-icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;            // Firebase, QR κ.λπ. πάνε κανονικά στο internet
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(r, cp)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./app.html')))
  );
});
