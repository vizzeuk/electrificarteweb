import { ImageResponse } from "next/og";

export const alt = "Electrificarte — Marketplace de autos eléctricos e híbridos en Chile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen OpenGraph por defecto de todo el sitio (preview al compartir en
 * WhatsApp, redes, etc.). Se genera dinámicamente — reemplaza al og-image.jpg
 * que estaba referenciado pero no existía.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0A",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 100, fontWeight: 800, letterSpacing: "-0.04em" }}>
          <div style={{ color: "#FFFFFF" }}>Electrific</div>
          <div style={{ color: "#00E5E5" }}>arte</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#9CA3AF",
            marginTop: 28,
            maxWidth: 860,
            textAlign: "center",
          }}
        >
          El mejor precio en autos eléctricos e híbridos de Chile
        </div>
        <div style={{ display: "flex", marginTop: 44, height: 8, width: 140, backgroundColor: "#00E5E5", borderRadius: 4 }} />
      </div>
    ),
    { ...size },
  );
}
