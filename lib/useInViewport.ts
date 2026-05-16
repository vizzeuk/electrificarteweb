"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Returns true while `ref` is inside the viewport (or within `rootMargin`).
 *
 * Used to gate the auto-scroll interval of off-screen carousels — running
 * 4 setInterval loops + animations off-screen pegs the iOS Safari main
 * thread on mobile and produces the "stuck" feeling the user reported,
 * even when content-visibility:auto already skips paint.
 *
 * Starts at `true` on the server / before the observer attaches so the
 * carousel renders + auto-scrolls normally for the very first user the
 * effect runs on (the visible one). Once the observer is wired up, it
 * updates to the real viewport state.
 */
export function useInViewport(
  ref: RefObject<HTMLElement | null>,
  rootMargin = "200px",
): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
