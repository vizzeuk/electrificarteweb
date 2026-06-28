import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Negocia automáticamente AVIF (más eficiente) → WebP → original.
    // Reduce ~30-50% el peso de imágenes para navegadores modernos.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },
  compiler: {
    // Strip console.log en producción (deja error/warn para detectar problemas).
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
