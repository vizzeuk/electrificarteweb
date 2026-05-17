export const dynamic = "force-static";

export default function TestMotion() {
  return (
    <div style={{ minHeight: "100vh", padding: "100px 20px", textAlign: "center", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24 }}>Test: solo MotionProvider</h1>
      <p style={{ marginTop: 8, opacity: 0.7 }}>Si esto es rápido (&lt;5s), framer-motion/LazyMotion no es el culpable.</p>
    </div>
  );
}
