/**
 * Appends Sanity CDN query params to deliver a resized, modern-format image.
 *
 * Sanity's CDN serves the original asset unless you ask for transformations.
 * For a thumbnail card we only need ~400px wide, not the 4000px original —
 * that single param drop can take an image from 3 MB to 40 KB.
 *
 * Usage:
 *   sanityImg(car.imageUrl, { w: 400 })           // thumbnail
 *   sanityImg(car.imageUrl, { w: 1200, q: 80 })   // hero
 *   sanityImg(logo.url,     { w: 64, q: 90 })     // brand logo
 *
 * Non-Sanity URLs pass through unchanged so it's safe to wrap any src.
 */
export function sanityImg(
  url: string | null | undefined,
  opts?: { w?: number; h?: number; q?: number; fit?: "max" | "crop" | "fill" },
): string | undefined {
  if (!url) return undefined;
  // Only transform Sanity CDN URLs — anything else passes through unchanged.
  if (!url.includes("cdn.sanity.io")) return url;

  const w   = opts?.w ?? 800;
  const q   = opts?.q ?? 75;
  const fit = opts?.fit ?? "max";

  const params = new URLSearchParams();
  params.set("w", String(w));
  if (opts?.h) params.set("h", String(opts.h));
  params.set("q", String(q));
  params.set("fit", fit);
  params.set("auto", "format");

  // Preserve any existing query string the caller may have included.
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${params.toString()}`;
}
