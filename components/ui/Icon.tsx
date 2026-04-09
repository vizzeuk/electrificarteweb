import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  filled?: boolean;
}

const sizeStyles = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

export function Icon({ name, className, size = "md", filled = false }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined", sizeStyles[size], className)}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
