import { MotionProvider } from "@/components/providers/MotionProvider";

// Diagnostic — only MotionProvider wrapping a div.
export default function TestMotionLayout({ children }: { children: React.ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
