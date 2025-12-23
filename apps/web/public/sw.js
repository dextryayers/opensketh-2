self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('opensketch-v2').then((cache) => cache.addAll([
      '/',
      '/room',
      '/kebijakan-privasi',
      '/icons/pen1.png'
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => !k.includes('opensketch-v2')).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => resp || fetch(event.request))
  );
});
