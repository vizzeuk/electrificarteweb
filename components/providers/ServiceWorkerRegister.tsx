"use client";

import { useEffect } from "react";

/**
 * TEMPORARILY DISABLED for mobile diagnostic.
 *
 * iOS Safari + iOS Chrome both show 8 s blank-screen pauses on the home
 * while Brave (also WebKit on iOS) loads instantly. Service Worker is the
 * top suspect because Brave is known to opt-out of SW. We unregister any
 * existing SW on every visit so the user's iPhone clears the previously
 * cached / intercepting SW the next time they open the site.
 *
 * If Safari/Chrome become fast after this deploy → SW was the culprit
 * and we'll redesign the caching strategy (HTTP cache headers instead).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Unregister any previously installed SW so it stops intercepting.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((reg) => reg.unregister().catch(() => { /* ignore */ }));
      })
      .catch(() => { /* swallow */ });

    // Clear all caches the SW had created so the next navigation goes to
    // the network fresh.
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => {
        keys.filter((k) => k.startsWith("ev-v")).forEach((k) => caches.delete(k));
      }).catch(() => { /* ignore */ });
    }
  }, []);

  return null;
}
