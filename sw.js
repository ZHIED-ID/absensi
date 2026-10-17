self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method==='POST'&&u.pathname.endsWith('/share')){
  e.respondWith((async()=>{const fd=await e.request.formData(),fs=fd.getAll('photos'),c=await caches.open('share');let i=0;
   for(const f of fs){await c.put('f'+i++,new Response(f,{headers:{'x-name':encodeURIComponent(f.name||'foto.jpg'),'content-type':f.type||'image/jpeg'}}))}
   return Response.redirect('./?shared=1',303)})());return}
 if(e.request.method==='GET'){
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open('v1').then(k=>k.put(e.request,c)).catch(()=>{})}return r}).catch(()=>caches.match(e.request)))}});
