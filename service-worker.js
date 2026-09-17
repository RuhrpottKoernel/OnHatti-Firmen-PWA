/* OnHatti Firmen-PWA A1.137 · OFFLINE-FIRST
   GitHub/HTTPS ist Installations- und Updatequelle, nicht Betriebsquelle.
   Nach erfolgreicher Installation wird die App-Hülle cache-first gestartet. */
const CACHE_NAME = 'onhatti-firma-a1-137-offline-first-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Installation/Update findet bewusst online statt. Jede Kern-Datei wird einzeln
    // geladen, damit eine optionale Datei nicht die gesamte Installation verwirft.
    for (const url of APP_SHELL) {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response && response.ok) await cache.put(url, response.clone());
      } catch (_) {}
    }
    // index.html ist für echten Offline-Betrieb zwingend.
    if (!(await cache.match('./index.html')) && !(await cache.match('./'))) {
      throw new Error('OnHatti index.html konnte nicht für Offline-Betrieb gespeichert werden.');
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith('onhatti-firma-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: IMMER zuerst die lokal installierte OnHatti-Hülle.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const local = await cache.match('./index.html') || await cache.match('./');
      if (local) return local;
      // Nur beim ersten/defekten Installationszustand Netzwerk als Notfall.
      const response = await fetch(request);
      if (response && response.ok) await cache.put('./index.html', response.clone());
      return response;
    })());
    return;
  }

  // Manifest/Icons/sonstige lokale Dateien ebenfalls cache-first.
  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
