"use client";

// Último recurso: se monta solo si el error ocurre en el layout raíz, donde
// app/(public)/error.tsx ya no puede renderizar. Reemplaza el <html> completo, así que no
// hereda fuentes ni Tailwind del layout — los estilos van inline a propósito.

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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "1rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#ffffff",
          color: "#111827",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>
            Algo salió mal
          </h1>
          <p style={{ color: "#4b5563", marginBottom: "0.25rem" }}>
            Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace", marginTop: "0.5rem" }}>
              ref: {error.digest}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "#00E5E5",
              color: "#000000",
              fontWeight: 700,
              padding: "0.875rem 2rem",
              borderRadius: "0.75rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Intentar de nuevo
          </button>
          <a
            href="/"
            style={{
              border: "1px solid #e5e7eb",
              color: "#111827",
              fontWeight: 600,
              padding: "0.875rem 2rem",
              borderRadius: "0.75rem",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Ir al inicio
          </a>
        </div>
      </body>
    </html>
  );
}
