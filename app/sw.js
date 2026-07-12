/* Ayus service worker — network-first for fresh updates, offline fallback */
var CACHE_NAME = 'ayus-v22-media-photos';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './platform.css',
  './engage.css',
  './tools.css',
  './media.css',
  './app.js',
  './tools.js',
  './calculators.js',
  './recipes-data.js',
  './media-data.js',
  './platform.js',
  './engage.js',
  './engage-data.js',
  './personalize.js',
  './icons.js',
  './catalog-data.js',
  './data.js',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request).then(function (response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); }).catch(function () {});
      return response;
    }).catch(function () {
      return caches.match(e.request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
