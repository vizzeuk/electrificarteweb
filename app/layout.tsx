import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Electrificarte | Ahorra millones en tu auto electrificado en Chile",
    template: "%s | Electrificarte",
  },
  description:
    "Marketplace #1 de autos electricos en Chile. Conectamos compradores con la mejor red de concesionarios para garantizarte el precio mas bajo del mercado. Encuentra el mejor precio disponible en tu próximo vehículo eléctrico.",
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
    url: "https://electrificarte.cl",
    siteName: "Electrificarte",
    title: "Electrificarte | Ahorra millones en tu auto electrificado en Chile",
    description:
      "Marketplace #1 de autos electricos en Chile. Conectamos compradores con la mejor red de concesionarios para negociar el precio más competitivo del mercado.",
    images: [
      {
        url: "https://electrificarte.cl/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Electrificarte - Marketplace de autos electricos en Chile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Electrificarte | Autos electricos al mejor precio en Chile",
    description:
      "Ahorra millones en tu proximo auto electrico. Marketplace con la mejor red de concesionarios de Chile.",
    images: ["https://electrificarte.cl/og-image.jpg"],
  },
  alternates: {
    canonical: "https://electrificarte.cl",
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
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#00E5E5" />
      </head>
      <body className="font-body antialiased bg-white text-text-main">
        {children}
      </body>
    </html>
  );
}
