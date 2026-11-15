// Static demo shell only. No network requests, customer data, or API responses are cached.
const CACHE='aero-grill-demo-v1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./assets/aero-grill-brand.jpg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 if(!['document','style','script','image','manifest'].includes(event.request.destination))return;
 event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
