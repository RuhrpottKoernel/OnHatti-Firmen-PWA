const ONHATTI_FIRMEN_CACHE_PREFIX='onhatti-firmen-neutral-';
const ONHATTI_FIRMEN_CACHE=ONHATTI_FIRMEN_CACHE_PREFIX+'v2';
const ONHATTI_FIRMEN_ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const ONHATTI_FIRMEN_OFFLINE_DB='OnHatti_Firmen_PWA_Offline_V1';
const ONHATTI_FIRMEN_OFFLINE_STORE='shell';
const ONHATTI_FIRMEN_OFFLINE_INDEX='index.html';
function openOfflineDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(ONHATTI_FIRMEN_OFFLINE_DB,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(ONHATTI_FIRMEN_OFFLINE_STORE))db.createObjectStore(ONHATTI_FIRMEN_OFFLINE_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveOfflineIndex(text){const db=await openOfflineDb();return new Promise((resolve,reject)=>{const tx=db.transaction(ONHATTI_FIRMEN_OFFLINE_STORE,'readwrite');tx.objectStore(ONHATTI_FIRMEN_OFFLINE_STORE).put(String(text||''),ONHATTI_FIRMEN_OFFLINE_INDEX);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
async function readOfflineIndex(){try{const db=await openOfflineDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(ONHATTI_FIRMEN_OFFLINE_STORE,'readonly'),r=tx.objectStore(ONHATTI_FIRMEN_OFFLINE_STORE).get(ONHATTI_FIRMEN_OFFLINE_INDEX);r.onsuccess=()=>resolve(r.result||'');r.onerror=()=>reject(r.error)})}catch(e){return ''}}
async function rememberIndexResponse(res){try{const text=await res.clone().text();if(text)await saveOfflineIndex(text)}catch(e){}return res}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(ONHATTI_FIRMEN_CACHE);
    await cache.addAll(ONHATTI_FIRMEN_ASSETS);
    try{const res=await fetch('./index.html',{cache:'no-store'});if(res&&res.ok)await rememberIndexResponse(res)}catch(e){}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(ONHATTI_FIRMEN_CACHE_PREFIX)&&k!==ONHATTI_FIRMEN_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{const res=await fetch(req);if(res&&res.ok){const cache=await caches.open(ONHATTI_FIRMEN_CACHE);cache.put('./index.html',res.clone()).catch(()=>{});rememberIndexResponse(res.clone()).catch(()=>{});}return res}catch(e){
        const cached=await caches.match('./index.html')||await caches.match('./');if(cached)return cached;
        const text=await readOfflineIndex();if(text)return new Response(text,{headers:{'Content-Type':'text/html; charset=utf-8'}});
        throw e;
      }
    })());return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(ONHATTI_FIRMEN_CACHE).then(c=>c.put(req,copy)).catch(()=>{});}return res;})));
});
