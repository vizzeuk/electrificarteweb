"use client";

// Último recurso: se monta solo si el error ocurre en el layout raíz, donde
// app/(public)/error.tsx ya no puede renderizar. Reemplaza el <html> completo, así que no
// hereda fuentes ni Tailwind del layout — los estilos van inline a propósito, con los
// valores del sistema de diseño v1 (Tinta, Grafito, Piedra, Laguna, Línea fuerte; radio 8;
// controles de 48 px).

const INK = "#0f1716";
const INK_2 = "#495251";
const INK_3 = "#687170";
const ACCENT = "#1d605b";
const LINE_2 = "#cad1d0";

const control: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "48px",
  padding: "0 1.25rem",
  borderRadius: "8px",
  fontFamily: "inherit",
  fontSize: "0.9375rem",
  fontWeight: 600,
  lineHeight: 1,
  textDecoration: "none",
  cursor: "pointer",
  boxSizing: "border-box",
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.25rem",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif",
          background: "#ffffff",
          color: INK,
          margin: 0,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div style={{ width: "100%", maxWidth: "40rem" }}>
          <h1
            style={{
              fontSize: "clamp(2.25rem, 1.5rem + 3vw, 4rem)",
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: "-0.032em",
              margin: 0,
            }}
          >
            Algo salió mal
          </h1>
          <p style={{ color: INK_2, fontSize: "1.1875rem", lineHeight: 1.5, margin: "1.5rem 0 0" }}>
            Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", lineHeight: 1.4, color: INK_3, margin: "0.75rem 0 0" }}>
              Referencia del error: {error.digest}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "2.5rem" }}>
            <button
              type="button"
              onClick={reset}
              style={{ ...control, background: ACCENT, color: "#ffffff", border: `1px solid ${ACCENT}` }}
            >
              Intentar de nuevo
            </button>
            {/* Recarga completa a propósito: el layout raíz falló y el router puede no estar sano. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...control, background: "transparent", color: INK, border: `1px solid ${LINE_2}` }}>
              Ir al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
