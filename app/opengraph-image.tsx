import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "Electrificarte — El mejor precio en autos eléctricos e híbridos de Chile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen OpenGraph por defecto de todo el sitio (preview al compartir en
 * WhatsApp, redes, etc.). Se genera dinámicamente con el logo real embebido.
 * Nota: Satori (next/og) no soporta .webp, por eso usamos el PNG del logo
 * (public/logo-email.png). runtime = node por defecto → fs disponible.
 */
const logoBase64 = readFileSync(join(process.cwd(), "public/logo-email.png")).toString("base64");
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
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0A",
          backgroundImage:
            "radial-gradient(circle at 50% 34%, rgba(0,229,229,0.14) 0%, rgba(0,229,229,0) 55%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo real de la marca */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={660} height={118} alt="Electrificarte" />

        <div
          style={{
            display: "flex",
            fontSize: 38,
            fontWeight: 600,
            color: "#E5E7EB",
            marginTop: 40,
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          El mejor precio en autos eléctricos e híbridos de Chile
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#9CA3AF",
            marginTop: 16,
          }}
        >
          Negociamos por ti con la red de vendedores oficiales
        </div>

        <div style={{ display: "flex", marginTop: 40, height: 8, width: 160, backgroundColor: "#00E5E5", borderRadius: 4 }} />
      </div>
    ),
    { ...size },
  );
}
