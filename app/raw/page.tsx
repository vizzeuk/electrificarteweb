// Absolute minimal page — pure HTML, NO components, NO client JS, NO
// framer-motion, NO Tailwind utilities that depend on the CSS bundle.
//
// If THIS page takes >3 s to load on iPhone Safari, the bottleneck is
// in the root layout (app/layout.tsx — fonts, Material Symbols, meta)
// or in Next.js 16 itself. There's nothing else for the browser to do.
//
// If this loads instantly on Safari but /test-minimal does not, then
// one of the (public) layout's components (Navbar / Footer / Motion
// Provider / ChatWidget / FeedbackWidget) is the culprit.

export const dynamic = "force-static";

export default function Raw() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "40px 20px",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>Test Raw</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        HTML plano. Cero componentes. Cero JavaScript propio.
      </p>
      <p style={{ opacity: 0.7, fontSize: 14 }}>
        Si esto se ve INSTANTÁNEO → el problema está en algún componente del layout.
      </p>
      <p style={{ opacity: 0.7, fontSize: 14, marginTop: 12 }}>
        Si esto demora → el problema está en el root layout o Next.js 16.
      </p>
    </div>
  );
}
