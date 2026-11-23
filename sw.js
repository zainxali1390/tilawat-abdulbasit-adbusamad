/* Service worker: keeps the app on the phone so it opens without internet.
 *
 *  - App files (HTML, CSS, JS, icons): saved when the app is installed. When online the newest
 *    version is always fetched first, so a new index.html never runs with old scripts; offline,
 *    the saved copies are used.
 *  - Mushaf pages, Mushaf fonts and translations (fixed package versions on jsDelivr): saved the
 *    first time they are opened, then read from the phone.
 *  - Google Fonts: served from the phone, refreshed in the background.
 *  - Recitation audio is NOT saved here: it is streamed from archive.org / mp3quran.net and needs
 *    internet.
 *
 * All paths are relative to this file, so the app works from a GitHub Pages sub-folder, a custom
 * domain or a local server without changes. Change VERSION whenever the list below changes.
 */
const VERSION = 'v8';
const PREFIX = 'abdulbasit-';
const SHELL_CACHE = PREFIX + 'shell-' + VERSION;
const QURAN_CACHE = PREFIX + 'quran-v1';   // package versions are fixed, so these never go stale
const FONT_CACHE = PREFIX + 'fonts-v1';
const KEEP = [SHELL_CACHE, QURAN_CACHE, FONT_CACHE];
const QURAN_MAX = 1600;                     // 604 pages + 604 fonts + translations, with room to spare

const SHELL = [
  './', './index.html', './privacy.html', './manifest.webmanifest',
  './css/style.css', './css/components.css', './css/responsive.css', './css/pages.css',
  './js/i18n.js', './js/quran-data.js', './js/library-config.js', './data/areas.js', './data/aliases.js',
  './js/icons.js', './js/storage.js', './js/utils.js', './js/ui.js', './js/recitations.js',
  './js/player.js', './js/mushaf.js', './js/navigation.js', './js/share.js', './js/app.js', './js/pwa.js',
  './assets/images/splash.jpg',
  './assets/icons/basit-32.png', './assets/icons/basit-180.png', './assets/icons/basit-192.png',
  './assets/icons/basit-512.png', './assets/icons/basit-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // 'reload' skips the browser's HTTP cache so the saved copies are really the new version
      .then(cache => cache.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        // old versions of this app's caches (including the earlier "abdulbasit-v5" style names)
        .filter(k => k.startsWith('abdulbasit') && !KEEP.includes(k))
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const OFFLINE_PAGE = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline</title>' +
  '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07140d;color:#d6b064;' +
  'font-family:system-ui,sans-serif;text-align:center;padding:24px}</style></head><body>' +
  '<p>You are offline and the app has not been saved on this device yet.<br>Connect to the internet and open it once.</p>' +
  '<p dir="rtl">أنت غير متصل بالإنترنت. افتح التطبيق مرة واحدة مع الاتصال ليُحفظ على جهازك.</p></body></html>';

function isAudio(req, url) {
  return req.destination === 'audio' || req.destination === 'video' ||
    /\.(mp3|m4a|ogg|opus|webm|wav)$/i.test(url.pathname);
}

async function putSafe(cacheName, req, res) {
  try { const cache = await caches.open(cacheName); await cache.put(req, res); } catch (e) { /* storage full: carry on */ }
}

// App files: network first (always the newest set together), saved copy when offline.
async function networkFirst(req, fallbackToApp) {
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') putSafe(SHELL_CACHE, req, res.clone());
    return res;
  } catch (e) {
    const hit = await caches.match(req, { ignoreSearch: fallbackToApp });
    if (hit) return hit;
    if (fallbackToApp) {
      // shared links such as ?r=… or ?v=2:255 still open the saved app
      const app = (await caches.match('./index.html')) || (await caches.match('./'));
      if (app) return app;
      return new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return Response.error();
  }
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);   // oldest first
}

// Fixed-version Quran data: from the phone if saved, otherwise download and save.
async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);   // a failure is passed to the page, which shows its own "offline" message
  if (res.ok || res.type === 'opaque') {
    await putSafe(QURAN_CACHE, req, res.clone());
    trim(QURAN_CACHE, QURAN_MAX);
  }
  return res;
}

// Google Fonts: saved copy straight away, refreshed in the background.
async function staleWhileRevalidate(req) {
  const hit = await caches.match(req);
  const update = fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') putSafe(FONT_CACHE, req, res.clone());
    return res;
  }).catch(() => hit || Response.error());
  return hit || update;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // audio is streamed (and seeked with range requests) straight from the network
  if (req.headers.has('range') || isAudio(req, url)) return;

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req, req.mode === 'navigate'));
    return;
  }
  if (url.hostname === 'cdn.jsdelivr.net' && /^\/npm\/(quran-qcf4|quran-json)@\d/.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req));
  }
  // everything else (archive.org, YouTube, ayah audio...) goes to the network as normal
});
