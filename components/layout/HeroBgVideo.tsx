"use client";

import { useEffect, useState } from "react";

/**
 * Hero background video — desktop only.
 *
 * On mobile this component renders absolutely nothing: no <img> poster,
 * no <video>, no useEffect, no state changes after mount. The parent
 * Hero <section> already has bg-black so the visual hole is just a
 * solid black hero — no broken-looking gap. This is a deliberate
 * mobile-only sacrifice: we lose the video motion under the hero copy
 * on phones, in exchange for cutting whatever combo of <img> decoding,
 * <video> element machinery, and post-mount state changes was costing
 * iOS Safari several seconds during hydration.
 *
 * Desktop unchanged: poster paints instantly, video fades in after idle.
 */
export function HeroBgVideo({ poster, srcMp4 }: { poster: string; srcMp4: string }) {
  // SSR-safe mobile flag. Starts false so the SSR HTML always includes
  // the poster <img>; the first client effect flips it on mobile and the
  // component unmounts the poster + skips video.
  const [hidden, setHidden] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      setHidden(true);
      return; // No video, no scheduling, no nothing on mobile.
    }

    // Desktop only: respect save-data + slow connections.
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

  if (hidden) return null;

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
