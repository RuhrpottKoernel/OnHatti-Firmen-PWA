/* OnHatti Firmen-PWA · A1.146 R2 · LOCAL-LOCK L1
   GitHub ist Installationsquelle, NICHT automatische Betriebs-/Updatequelle.
   Nach erfolgreicher Installation startet die PWA immer aus der lokalen App-Huelle.
   Kein Hintergrund-Refresh der index.html, kein Update-Ready, kein Auto-Reload.
   Es werden ausschliesslich eigene Firmen-PWA-Caches geloescht.
   index.html wird zusaetzlich in eigener IndexedDB als Offline-Fallback gehalten. */
const ONHATTI_FIRMEN_CACHE_PREFIX='onhatti-firmen-neutral-';
const ONHATTI_FIRMEN_CACHE=ONHATTI_FIRMEN_CACHE_PREFIX+'a1-146-r2-local-lock-l1';
const ONHATTI_FIRMEN_ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const ONHATTI_FIRMEN_OFFLINE_DB='OnHatti_Firmen_PWA_Offline_V1';
const ONHATTI_FIRMEN_OFFLINE_STORE='shell';
const ONHATTI_FIRMEN_OFFLINE_INDEX='index.html';
function openOfflineDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(ONHATTI_FIRMEN_OFFLINE_DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(ONHATTI_FIRMEN_OFFLINE_STORE))db.createObjectStore(ONHATTI_FIRMEN_OFFLINE_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveOfflineIndex(text){const db=await openOfflineDb();return new Promise((resolve,reject)=>{const tx=db.transaction(ONHATTI_FIRMEN_OFFLINE_STORE,'readwrite');tx.objectStore(ONHATTI_FIRMEN_OFFLINE_STORE).put(String(text||''),ONHATTI_FIRMEN_OFFLINE_INDEX);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
async function readOfflineIndex(){try{const db=await openOfflineDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(ONHATTI_FIRMEN_OFFLINE_STORE,'readonly'),r=tx.objectStore(ONHATTI_FIRMEN_OFFLINE_STORE).get(ONHATTI_FIRMEN_OFFLINE_INDEX);r.onsuccess=()=>resolve(r.result||'');r.onerror=()=>reject(r.error)})}catch(_){return ''}}
async function rememberIndexResponse(res){try{const text=await res.clone().text();if(text)await saveOfflineIndex(text)}catch(_){}return res}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(ONHATTI_FIRMEN_CACHE);
    let haveIndex=false;
    for(const url of ONHATTI_FIRMEN_ASSETS){
      try{
        const response=await fetch(url,{cache:'reload'});
        if(response&&response.ok){
          await cache.put(url,response.clone());
          if(url==='./index.html'){haveIndex=true;await rememberIndexResponse(response.clone())}
        }
      }catch(_){}
    }
    if(!haveIndex){
      const local=await cache.match('./index.html')||await cache.match('./');
      if(!local)throw new Error('OnHatti index.html konnte nicht fuer den Offline-Betrieb gespeichert werden.');
      try{await rememberIndexResponse(local.clone())}catch(_){}
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(ONHATTI_FIRMEN_CACHE_PREFIX)&&name!==ONHATTI_FIRMEN_CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(ONHATTI_FIRMEN_CACHE);
      const local=await cache.match('./index.html')||await cache.match('./');
      if(local)return local;
      const text=await readOfflineIndex();
      if(text)return new Response(text,{headers:{'Content-Type':'text/html; charset=utf-8'}});
      // Netzwerk nur als Notfall, wenn noch keinerlei lokale App-Huelle existiert.
      const response=await fetch(request);
      if(response&&response.ok){await cache.put('./index.html',response.clone());await rememberIndexResponse(response.clone())}
      return response;
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(request,{ignoreSearch:true});
    if(cached)return cached;
    const response=await fetch(request);
    if(response&&response.ok){const cache=await caches.open(ONHATTI_FIRMEN_CACHE);await cache.put(request,response.clone())}
    return response;
  })());
});
