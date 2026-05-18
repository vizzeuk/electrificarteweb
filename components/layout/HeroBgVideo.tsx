"use client";

import { useEffect, useState } from "react";

/**
 * Hero background video.
 *
 * Renders the poster as a plain <img fetchPriority="high"> instantly so iOS
 * Safari paints the hero immediately. Then, once the browser is idle (or
 * after a 1.5 s fallback), mounts the <video> on top of the poster.
 *
 * Save-data and very slow connections skip the video entirely; users keep
 * the poster as the static bg. Same applies on mobile if you want to
 * sacrifice the motion for an even faster paint — but with the rest of
 * the home now optimized (skeleton shimmer, no content-visibility, no
 * cascade re-renders), mobile should handle the deferred video fine.
 */
export function HeroBgVideo({ poster, srcMp4 }: { poster: string; srcMp4: string }) {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

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
          preload="metadata"
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
          {...({ "webkit-playsinline": "true" } as Record<string, string>)}
        >
          <source src={srcMp4} type="video/mp4" />
        </video>
      )}
    </>
  );
}
