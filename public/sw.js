// Electrificarte service worker.
//
// Strategy:
// - Static assets under /_next/static (immutable, hashed): cache-first, forever.
// - Sanity CDN images (cdn.sanity.io): cache-first, with a soft 30-day expiry
//   handled by the cache name version.
// - HTML pages: stale-while-revalidate — serve the cached page immediately so
//   repeat visits feel instant, then update the cache from the network in the
//   background for the next visit.
// - Everything else: passes through to the network.
//
// Bump CACHE_VERSION any time the shape changes to force-clear old caches.

const CACHE_VERSION = "ev-v2";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMG_CACHE     = `${CACHE_VERSION}-img`;
const PAGES_CACHE   = `${CACHE_VERSION}-pages`;

self.addEventListener("install", (event) => {
  // Skip waiting so a new SW activates on next page load without an extra
  // navigation. The page itself reloads on update via the controllerchange
  // listener in sw-register.js.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, IMG_CACHE, PAGES_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1. Static assets — cache-first, never re-validate (immutable).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // 2. Sanity CDN images — cache-first with implicit expiry through cache version.
  if (url.hostname === "cdn.sanity.io") {
    event.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }

  // 3. Local images, videos, fonts — cache-first.
  if (
    url.origin === self.location.origin &&
    /\.(?:webp|jpg|jpeg|png|svg|gif|ico|webm|mp4|woff2?|ttf)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // 4. HTML navigations — stale-while-revalidate. Returns cache instantly,
  //    refreshes in background so the next visit has the latest.
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(staleWhileRevalidate(req, PAGES_CACHE));
    return;
  }

  // Everything else (APIs, Sanity GROQ): default network behavior.
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    // Network failed and we have no cache — surface the error.
    throw e;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  // Kick off the network refresh in parallel; don't await it before returning.
  const networkFetch = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  // Return cache immediately when available; otherwise wait for network.
  if (cached) return cached;
  const networkRes = await networkFetch;
  if (networkRes) return networkRes;
  // Both cache and network failed — throw to surface the error.
  throw new Error("network and cache both failed");
}
