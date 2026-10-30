const CACHE_NAME = 'meow-absensi-v2';
const APP_SHELL = ['./', './index.html', './manifest.json', './ocr-utils.js', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(APP_SHELL); } catch (_) { /* allow first install on flaky networks */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('meow-absensi-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === 'POST' && url.pathname.endsWith('/share')) {
    event.respondWith((async () => {
      const form = await request.formData();
      const files = form.getAll('photos');
      const cache = await caches.open('share');
      let index = 0;
      for (const file of files) {
        await cache.put('photo-' + index++, new Response(file, {headers: {
          'x-name': encodeURIComponent(file.name || 'foto.jpg'),
          'content-type': file.type || 'image/jpeg'
        }}));
      }
      return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (_) {
      return (await cache.match(request)) || (await cache.match('./index.html'));
    }
  })());
});
