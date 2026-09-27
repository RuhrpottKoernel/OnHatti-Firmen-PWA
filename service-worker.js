/* OnHatti Firmen-PWA A1.146 R2 · S1.6.7-Hülle · NOAUTO R1
   Basis: real getesteter Firmen-Worker vom 18.09.2026.
   GitHub/HTTPS dient nur zur Erstinstallation bzw. bewusstem Worker-Austausch.
   Navigation startet aus der lokalen App-Hülle; keine automatische Hintergrund-Aktualisierung der index.html. */
const CACHE_NAME = 'onhatti-firma-a1-146-r2-s1-6-7-manual-update-r1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './pwa-update.js'];

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
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const local = await cache.match('./index.html') || await cache.match('./');
      if (local) return local;

      // Netzwerk nur beim allerersten Start ohne lokal gespeicherte App-Hülle.
      const response = await fetch(request);
      if (response && response.ok) await cache.put('./index.html', response.clone());
      return response;
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


// MANUAL UPDATE R1: Nur ein ausdruecklicher Button-Klick darf die GitHub-index.html in den lokalen Cache uebernehmen.
const ONHATTI_MANUAL_UPDATE_MARKERS = ["<title>OnHatti Firmen-PWA</title>", "ONHATTI_NEUTRAL_COMPANY_PWA_VERSION", "ONHATTI_COMPANY_TEMPLATE_B64"];
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type !== 'ONHATTI_MANUAL_UPDATE_INDEX') return;
  const port = event.ports && event.ports[0];
  event.waitUntil((async () => {
    try {
      const updateUrl = new URL('./index.html?onhatti_manual_update=' + Date.now(), self.registration.scope);
      const response = await fetch(updateUrl.href, {cache:'no-store', credentials:'same-origin'});
      if (!response || !response.ok) throw new Error('GitHub-index.html konnte nicht geladen werden (HTTP ' + (response ? response.status : '?') + ').');
      const text = await response.text();
      if (text.length < 50000) throw new Error('Geladene index.html ist unvollständig oder zu klein.');
      for (const marker of ONHATTI_MANUAL_UPDATE_MARKERS) {
        if (!text.includes(marker)) throw new Error('Geladene Datei ist keine passende OnHatti-Firma-index.html.');
      }

      const cache = await caches.open(CACHE_NAME);
      const current = await cache.match('./index.html');
      const currentText = current ? await current.clone().text() : '';
      if (currentText === text) {
        if (port) port.postMessage({ok:true, changed:false, bytes:text.length});
        return;
      }

      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('Cache-Control', 'no-store');
      const fresh = new Response(text, {status:200, headers});
      await cache.put('./index.html', fresh.clone());
      await cache.put('./', fresh.clone());
      if (port) port.postMessage({ok:true, changed:true, bytes:text.length});
    } catch (error) {
      if (port) port.postMessage({ok:false, error:String(error && error.message || error)});
    }
  })());
});
