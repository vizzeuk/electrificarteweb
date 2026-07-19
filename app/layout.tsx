import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Material Symbols — self-hosted variable icon font (opsz/wght/FILL/GRAD).
// Self-hosting via next/font removes the external Google Fonts request and the
// print-media swap script that caused the hydration mismatch.
const materialSymbols = localFont({
  src: "./fonts/material-symbols-outlined.woff2",
  variable: "--font-symbols",
  display: "block",
  weight: "100 700",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://electrificarte.com"),
  title: {
    default: "Electrificarte | Ahorra millones en tu auto electrificado en Chile",
    template: "%s | Electrificarte",
  },
  description:
    "Marketplace #1 de autos electrificados en Chile. Conectamos compradores con la mejor red de vendedores oficiales para garantizarte el precio más bajo del mercado. Encuentra el mejor precio disponible en tu próximo vehículo electrificado.",
  keywords: [
    "autos electricos chile",
    "vehiculos electricos chile",
    "auto electrico barato chile",
    "comprar auto electrico",
    "BYD chile",
    "Tesla chile",
    "MG electrico chile",
    "descuento auto electrico",
    "ofertas autos electricos santiago",
    "comparar autos electricos",
    "mejor precio auto electrico",
  ],
  authors: [{ name: "Electrificarte S.P.A." }],
  creator: "Electrificarte",
  publisher: "Electrificarte S.P.A.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "https://electrificarte.com",
    siteName: "Electrificarte",
    title: "Electrificarte | Ahorra millones en tu auto electrificado en Chile",
    description:
      "Marketplace #1 de autos electrificados en Chile. Conectamos compradores con la mejor red de vendedores oficiales para negociar el precio más competitivo del mercado.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Electrificarte | Autos electrificados al mejor precio en Chile",
    description:
      "Ahorra millones en tu próximo auto electrificado. Marketplace con la mejor red de vendedores oficiales de Chile.",
  },
  alternates: {
    canonical: "/",
  },
  other: {
    "geo.region": "CL-RM",
    "geo.placename": "Santiago, Chile",
    "geo.position": "-33.4489;-70.6693",
    ICBM: "-33.4489, -70.6693",
    "content-language": "es-CL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${inter.variable} ${materialSymbols.variable}`}
    >
      <head>
        {/* Preconnect a Sanity CDN (imágenes). Las fuentes ahora son self-hosted
            vía next/font, así que ya no hay preconnects a Google Fonts. */}
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="" />

        {/* Favicon is auto-wired by Next.js from app/icon.svg */}
        <meta name="theme-color" content="#00E5E5" />
      </head>
      <body className="font-body antialiased bg-white text-text-main">
        {children}
      </body>
    </html>
  );
}
