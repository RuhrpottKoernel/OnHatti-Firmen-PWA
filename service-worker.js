/* OnHatti Firmen-PWA A1.147 · OFFLINE-FIRST FIX
   Ziel: Start immer zuerst aus der lokal gecachten App-Hülle.
   GitHub dient nur als Installations-/Updatequelle.
   Firmenbindung, IndexedDB/localStorage und gebundene Runtime werden nicht verändert. */
const CACHE_NAME = 'onhatti-firma-shell-a1-147-offline-fix-v1';
const INDEX_URL = './index.html';
const SHELL = [
  INDEX_URL,
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

async function cacheShell() {
  const cache = await caches.open(CACHE_NAME);
  for (const url of SHELL) {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (response && response.ok) await cache.put(url, response.clone());
    } catch (_) {}
  }
  if (!(await cache.match(INDEX_URL))) {
    throw new Error('OnHatti index.html konnte nicht fuer Offline-Betrieb gespeichert werden.');
  }
}

async function refreshIndexInBackground() {
  try {
    const response = await fetch(INDEX_URL, { cache: 'no-store' });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(INDEX_URL, response.clone());
    }
  } catch (_) {}
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await cacheShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const obsolete = names.filter(name =>
      name !== CACHE_NAME && (
        name.startsWith('onhatti-firma-shell-') ||
        name.startsWith('onhatti-firma-a1-') ||
        name.startsWith('onhatti-firma-offline-')
      )
    );
    await Promise.all(obsolete.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.waitUntil(refreshIndexInBackground());
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const local = await cache.match(INDEX_URL);
      if (local) return local;

      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response && response.ok) {
          await cache.put(INDEX_URL, response.clone());
          return response;
        }
      } catch (_) {}

      throw new Error('OnHatti ist offline und es ist noch keine lokale App-Huelle vorhanden.');
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
