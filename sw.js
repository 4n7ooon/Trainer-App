/* Service Worker: App komplett offline verfügbar machen.
   Alle Dateien werden gecacht; Updates werden im Hintergrund geladen
   und beim nächsten App-Start aktiv. Daten liegen immer in localStorage/IndexedDB. */
var CACHE = 'trainerapp-v1';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.png',
  './css/styles.css',
  './js/seed.js',
  './js/db.js',
  './js/ki.js',
  './js/views1.js',
  './js/views2.js',
  './js/views3.js',
  './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Cache-first mit Hintergrund-Aktualisierung: funktioniert ohne Netz, aktualisiert sich mit Netz */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
