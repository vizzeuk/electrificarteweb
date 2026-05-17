"use client";

import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * On mobile, skip every framer-motion entry transition. The visual effect is
 * negligible (animations were 0.4–0.6s fades that don't survive an iPhone's
 * scroll anyway) but the cost is real: every m.div with `initial` schedules a
 * rAF tick during hydration, and on iOS Safari the cumulative cost of dozens
 * of them is one of the biggest contributors to the "stuck" feeling the user
 * reported. We pass reducedMotion="always" so framer-motion treats every
 * transition as instant.
 *
 * Detection is done client-side after mount so SSR HTML stays identical on
 * mobile and desktop — only the JS behavior differs.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState<"always" | "never">("never");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setReducedMotion(mql.matches ? "always" : "never");
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return (
    <LazyMotion features={domAnimation} strict={false}>
      <MotionConfig reducedMotion={reducedMotion}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
