"use client";

import { useEffect } from "react";

/**
 * NUCLEAR SW CLEANUP — diagnostic only.
 *
 * The user's iPhone Safari has been showing a "problem" error message
 * even on a totally bare HTML page (/raw). One plausible cause is a
 * stale, partially-broken Service Worker from an earlier deploy still
 * intercepting every request. Even when we later "disabled" SW, the
 * old SW could remain installed because unregister was racing with
 * registration in the same useEffect.
 *
 * This version: actively unregisters every registered SW on every page
 * load, deletes every cache from any of our versions, and never
 * registers a new SW. If a corrupt SW is the cause, this cleans it out.
 *
 * After the user confirms the home is fast again we'll either keep this
 * (and ship without an SW) or rebuild the SW from scratch.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // 1) Unregister anything currently registered for our origin.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister().catch(() => false))))
      .catch(() => { /* ignore */ });

    // 2) Wipe every CacheStorage entry whose key looks like ours.
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith("ev-v") || k.includes("electrificarte"))
              .map((k) => caches.delete(k)),
          ),
        )
        .catch(() => { /* ignore */ });
    }
  }, []);

  return null;
}
