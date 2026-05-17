// SELF-UNREGISTERING NO-OP SW.
//
// Any device that still has a previous version of /sw.js installed will
// fetch this file on update check. This minimal SW skips waiting, claims
// clients, immediately unregisters itself, and clears every cache it can
// find. It does NOT intercept any fetch events.
//
// Net effect: the next time the user visits the site, the old SW becomes
// this stub, which then evicts itself. Two-visit pattern but eventually
// clean.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      // Drop every cache we ever made.
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch { /* ignore */ }

    // Take control then unregister immediately.
    try {
      await self.clients.claim();
    } catch { /* ignore */ }

    try {
      await self.registration.unregister();
    } catch { /* ignore */ }

    // Force any open tabs to reload so they pick up the SW-less state.
    try {
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => {
        try {
          // soft reload via navigation
          (c).navigate?.(c.url);
        } catch { /* ignore */ }
      });
    } catch { /* ignore */ }
  })());
});

// Important: do NOT register a fetch listener. With no fetch handler the
// SW is transparent to network requests while it's still alive.
