// Renders inside the (public) layout but with NO Hero or other content.
// Tells us if the layout itself (Navbar + Footer + FeedbackWidget +
// ChatWidget + MotionProvider) is the slow piece, or if it's the
// combination with the Hero that triggers the slowness.

export const dynamic = "force-static";

export default function TestPublicEmpty() {
  return (
    <div style={{ minHeight: "60vh", padding: "100px 20px", textAlign: "center", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24 }}>(public) layout vacío</h1>
      <p style={{ marginTop: 8, opacity: 0.6 }}>
        Sin Hero, sin nada. Solo Navbar + Footer + widgets + MotionProvider.
      </p>
    </div>
  );
}
