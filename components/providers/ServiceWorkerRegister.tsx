"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js once the page has finished loading and the browser is
 * idle. Skips registration in dev so HMR isn't interfered with.
 *
 * When a new SW takes control (`controllerchange`), the page does a soft
 * reload so the user immediately sees the new assets. The first install
 * never triggers a reload because controller is null at that moment.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;

    function register() {
      if (cancelled) return;
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => { /* swallow — SW is a progressive enhancement */ });
    }

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    let reloaded = false;
    function onControllerChange() {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
