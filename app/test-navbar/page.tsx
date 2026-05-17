export const dynamic = "force-static";

export default function TestNavbar() {
  return (
    <div style={{ minHeight: "100vh", padding: "100px 20px", textAlign: "center", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24 }}>Test: solo Navbar</h1>
      <p style={{ marginTop: 8, opacity: 0.7 }}>Si esto es rápido (&lt;5s), Navbar no es el culpable.</p>
    </div>
  );
}
