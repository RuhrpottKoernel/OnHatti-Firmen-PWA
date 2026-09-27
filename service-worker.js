/* OnHatti Firmen-PWA A1.137 · S1.6.6 · Coldstart/Offline-Fix
   GitHub/HTTPS ist nur Installations- und Updatequelle.
   Navigation startet IMMER zuerst aus der lokalen App-Hülle, sobald diese vorhanden ist.
   Online wird eine neuere index.html nur im Hintergrund für den nächsten Start nachgeladen. */
const CACHE_NAME = 'onhatti-firma-a1-137-s1-6-6-v2';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of APP_SHELL) {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response && response.ok) await cache.put(url, response.clone());
      } catch (_) {}
    }
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

  if (request.mode === 'navigate') {
    const cachePromise = caches.open(CACHE_NAME);

    // Update nur im Hintergrund. Dieser Promise darf den sichtbaren Start nie blockieren.
    const networkUpdate = (async () => {
      const cache = await cachePromise;
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response && response.ok) {
          await cache.put('./index.html', response.clone());
          return response;
        }
      } catch (_) {}
      return null;
    })();
    event.waitUntil(networkUpdate.then(() => undefined));

    event.respondWith((async () => {
      const cache = await cachePromise;
      const local = await cache.match('./index.html') || await cache.match('./');
      if (local) return local;

      // Nur beim allerersten Start ohne vorhandene App-Hülle muss das Netz liefern.
      const response = await networkUpdate;
      if (response) return response;
      throw new Error('OnHatti ist offline und es ist noch keine lokale App-Hülle vorhanden.');
    })());
    return;
  }

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
