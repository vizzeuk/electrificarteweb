import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  bg?: "white" | "surface" | "black";
  id?: string;
  as?: "section" | "div" | "article";
}

const bgStyles = {
  white: "bg-white",
  surface: "bg-surface",
  black: "bg-black text-white",
};

export function SectionWrapper({
  children,
  className,
  bg = "white",
  id,
  as: Tag = "section",
}: SectionWrapperProps) {
  return (
    <Tag id={id} className={cn("py-24", bgStyles[bg], className)}>
      <div className="max-w-7xl mx-auto px-4 md:px-8">{children}</div>
    </Tag>
  );
}
