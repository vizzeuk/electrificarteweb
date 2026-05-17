import { Hero } from "@/components/layout/Hero";

// Diagnostic page: renders ONLY the Hero, no Sanity queries, no other
// sections. Used to determine whether the home's slowness on iOS Safari
// is caused by content amount/sections or by the framework setup itself.
//
// If this page loads in <3 s on iPhone Safari → the home's content is
// the issue and we bisect from there.
// If this page is still slow → something fundamental in the layout /
// Next.js 16 / React 19 / Tailwind v4 setup is the problem.

export const dynamic = "force-static";

export default function TestMinimal() {
  return <Hero />;
}
