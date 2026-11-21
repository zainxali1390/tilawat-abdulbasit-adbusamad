// Offline support: keeps the app itself on the phone so it opens without internet.
// Streaming audio from other sites is left to the network.
const CACHE = 'abdulbasit-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // A video or link shared to the app from another app's Share menu.
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData();
        const c = await caches.open('shared');
        const f = fd.get('media');
        if (f && f.size) await c.put('shared-media', new Response(f, { headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'clip') } }));
        const txt = ['title', 'text', 'url'].map(k => fd.get(k)).filter(Boolean).join(' ');
        if (txt) await c.put('shared-text', new Response(txt));
      } catch (err) {}
      return Response.redirect(new URL('./#assistant', self.registration.scope).href, 303);
    })());
    return;
  }
  if (url.pathname.includes('/models/')) return; // the speech model keeps its own cache
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  if (url.pathname.endsWith('.webm')) return; // large audio: let the browser stream it

  if (req.mode === 'navigate') {
    // Newest version when online, saved copy when offline.
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
