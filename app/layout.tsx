import type { Metadata } from "next";
import localFont from "next/font/local";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "./globals.css";

// Fuentes de marca (sistema de diseño v1): Cabinet Grotesk para titulares y Switzer para
// texto, interfaz y cifras. Son de Fontshare (ITF Free Font License): la licencia permite
// auto-hospedarlas pero no redistribuirlas en un repo público, así que no se versionan —
// scripts/fetch-fonts.mjs las baja a app/fonts/fontshare/ antes de dev y build.
const cabinet = localFont({
  src: [
    { path: "./fonts/fontshare/CabinetGrotesk-700.woff2", weight: "700" },
    { path: "./fonts/fontshare/CabinetGrotesk-800.woff2", weight: "800" },
  ],
  variable: "--font-cabinet",
  display: "swap",
});

const switzer = localFont({
  src: [
    { path: "./fonts/fontshare/Switzer-400.woff2", weight: "400" },
    { path: "./fonts/fontshare/Switzer-500.woff2", weight: "500" },
    { path: "./fonts/fontshare/Switzer-600.woff2", weight: "600" },
    { path: "./fonts/fontshare/Switzer-700.woff2", weight: "700" },
  ],
  variable: "--font-switzer",
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
  metadataBase: new URL("https://www.electrificarte.com"),
  title: {
    default: "Electrificarte | Ahorra millones en tu auto electrificado en Chile",
    template: "%s | Electrificarte",
  },
  description:
    "Autos eléctricos e híbridos en Chile: compara modelos, calcula tu ahorro y recibe asesoría por WhatsApp para elegir bien tu próximo auto electrificado.",
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
    url: "https://www.electrificarte.com",
    siteName: "Electrificarte",
    title: "Electrificarte | Ahorra millones en tu auto electrificado en Chile",
    description:
      "Compara autos eléctricos e híbridos en Chile y recibe asesoría por WhatsApp para elegir bien tu próximo auto electrificado.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Electrificarte | Autos electrificados al mejor precio en Chile",
    description:
      "Ahorra en tu próximo auto electrificado: compara modelos y recibe asesoría por WhatsApp para elegir bien.",
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
      className={`${cabinet.variable} ${switzer.variable} ${materialSymbols.variable}`}
    >
      <head>
        {/* Preconnect a Sanity CDN (imágenes). Las fuentes ahora son self-hosted
            vía next/font, así que ya no hay preconnects a Google Fonts. */}
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="" />

        {/* Favicon is auto-wired by Next.js from app/icon.svg */}
        <meta name="theme-color" content="#0f1716" />
      </head>
      <body className="font-sans antialiased bg-canvas text-ink">
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
