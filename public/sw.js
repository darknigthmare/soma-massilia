const CACHE_NAME = 'soma-massilia-v0.2.0';
const CORE = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/art/neo-massilia-port.png', '/art/soma-guard-chroma.png', '/art/nara-velvet-chroma.png'];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const manifest = await fetch('/precache.json', { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error('Offline manifest unavailable');
      return response.json();
    });
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...CORE, ...manifest.assets]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('soma-massilia-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/sw.js' || url.pathname === '/precache.json') return;
  if (!event.request.mode.includes('navigate') && !url.pathname.startsWith('/_next/static/') && !CORE.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (event.request.mode !== 'navigate') {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
    }
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        event.waitUntil(cache.put(event.request, response.clone()).catch(() => undefined));
      }
      return response;
    } catch {
      return await cache.match(event.request, { ignoreSearch: true }) || (event.request.mode === 'navigate' ? await cache.match('/') : null) || Response.error();
    }
  })());
});
