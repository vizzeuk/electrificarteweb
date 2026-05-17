// Minimal layout — no Navbar, no Footer, no MotionProvider, no ChatWidget,
// no FeedbackWidget, no ServiceWorkerRegister. Used for the /raw diagnostic
// page to isolate whether the public layout's wrapper components are the
// source of iOS Safari slowness.
export default function RawLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
