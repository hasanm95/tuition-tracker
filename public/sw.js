const CACHE = 'tt-static-v4';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for pages, but never wait forever: on a slow/flaky connection a
// navigation fetch can hang (not fail) with no timeout, leaving the PWA stuck on
// the splash screen. Race it against a timeout and fall back to the cached shell
// so the app always opens.
const NAV_TIMEOUT = 3500;

async function navigate(request) {
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAV_TIMEOUT)),
    ]);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
    }
    return res;
  } catch {
    return (await caches.match(request)) ||
      (await caches.match('/')) ||
      new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<h1 style="font-family:sans-serif;text-align:center;margin-top:3rem;color:#1b1736">অফলাইন — ইন্টারনেট সংযোগ দিয়ে আবার চেষ্টা করুন</h1>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
  }
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // IndexedDB handles API caching

  // Static assets are content-hashed — cache-first forever
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(
        (hit) => hit || fetch(request).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
      )
    );
    return;
  }

  // Navigation pages — network-first with a timeout, cached shell as fallback
  if (request.mode === 'navigate') {
    e.respondWith(navigate(request));
  }
});
