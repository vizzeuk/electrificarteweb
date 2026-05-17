"use client";

import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";

/**
 * MotionProvider — static, no runtime matchMedia.
 *
 * Earlier this component used useState + useEffect + matchMedia to detect
 * mobile after hydration and flip MotionConfig's reducedMotion. That worked
 * (animations were skipped on mobile) BUT every change to MotionConfig's
 * context value re-renders every framer-motion consumer in the tree — a
 * cascade that was visible on iPhone Safari but invisible on iPad / desktop
 * because those don't enter the mobile branch.
 *
 * Now we pass a static reducedMotion="user": framer-motion respects the OS
 * setting (Accessibility → Motion → Reduce Motion). No JS state, no cascade.
 *
 * Trade-off: on iPhone Safari, framer-motion entry animations will play
 * (~0.4 s). Most have already been migrated to CSS keyframes in the codebase
 * (Hero, CarCard, Testimonials, HowItWorks, TrustBadges, BlogPreview), so
 * the remaining motion consumers are mostly interactive (modals, accordion,
 * mobile menu) and don't run on first paint anyway.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict={false}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
