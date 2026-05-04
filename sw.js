const cacheName = 'consisto-v2'; // Bumped to v2 to force update
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// 1. Install Event: Caches the new assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// 2. Activate Event: Deletes the old "v1" cache
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== cacheName) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. Fetch Event: Serves files from cache or network
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => {
      return res || fetch(e.request);
    })
  );
});