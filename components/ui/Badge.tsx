import { cn } from "@/lib/utils";

type BadgeVariant = "primary" | "hot" | "new" | "category";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary:
    "bg-primary text-black",
  hot: "bg-amber-400 text-black",
  new: "bg-white/90 text-black",
  category:
    "bg-white/90 text-black",
};

export function Badge({ variant = "primary", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
