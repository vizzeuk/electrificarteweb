"use client";

import { useEffect, useState } from "react";

/**
 * Hero background video that does NOT compete with first paint.
 *
 * Renders the poster as a plain <img fetchPriority="high"> initially, so iOS
 * Safari paints the hero immediately. Once the page is idle (requestIdleCallback
 * or 1.5s fallback), and only when the network looks healthy, mounts the <video>
 * which fades in on top of the poster.
 *
 * Why not autoplay <video> directly: iOS Safari ignores preload="none" when
 * autoplay is set and starts buffering the video immediately, competing for
 * bandwidth with critical resources. The result on slow mobile is the bare
 * "hero without text + photos blank" state the user reported.
 */
export function HeroBgVideo({ poster, srcMp4 }: { poster: string; srcMp4: string }) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    // TEMPORARILY DISABLED on mobile for diagnostic. iOS Safari decodes
    // the autoplay <video> on the main thread once it mounts, which can
    // freeze the page for several seconds even after the poster is shown.
    // Brave on iOS may pause autoplay videos by default which would
    // explain why it loads instantly. With the video skipped on mobile,
    // users just see the poster image (which is the first frame of the
    // same video anyway — visually identical, statically rendered).
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    // Save-data / slow connection? Don't load the video at all.
    const conn = (navigator as any).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /(^|-)(2g|slow)/i.test(conn.effectiveType)) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    function mount() {
      setShowVideo(true);
    }

    if (typeof (window as any).requestIdleCallback === "function") {
      idleId = (window as any).requestIdleCallback(mount, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(mount, 1500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId && typeof (window as any).cancelIdleCallback === "function") {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, []);

  return (
    <>
      {/* Poster always rendered. Stays visible as a fallback if the video
          fails to load (slow network, save-data, format unsupported). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        aria-hidden
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {showVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={srcMp4} type="video/mp4" />
        </video>
      )}
    </>
  );
}
