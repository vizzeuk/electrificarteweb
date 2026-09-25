import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "Electrificarte: elige bien tu próximo auto electrificado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen OpenGraph por defecto de todo el sitio (preview al compartir en
 * WhatsApp, redes, etc.). Sistema de diseño v1: fondo Tinta, logo monocromo en
 * Niebla y una sola barra en Glaciar. Sin glow ni degradados.
 * Nota: Satori (next/og) no soporta .webp, por eso el logo va en PNG
 * (public/brand/electrificarte-lockup-papel.png). runtime = node → fs disponible.
 */
const logoBase64 = readFileSync(join(process.cwd(), "public/brand/electrificarte-lockup-papel.png")).toString("base64");
const logoSrc = `data:image/png;base64,${logoBase64}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          backgroundColor: "#0F1716",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={560} height={75} alt="Electrificarte" />

        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            color: "#F2F7F6",
            marginTop: 56,
            maxWidth: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Elige bien tu próximo auto electrificado.
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#B4BDBC",
            marginTop: 24,
          }}
        >
          Asesoría por WhatsApp y catálogo de autos eléctricos e híbridos en Chile
        </div>

        <div style={{ display: "flex", marginTop: 48, height: 8, width: 160, backgroundColor: "#CAEFEA", borderRadius: 4 }} />
      </div>
    ),
    { ...size },
  );
}
