import { cn } from "@/lib/utils";

type BadgeVariant = "primary" | "hot" | "new" | "category" | "outline" | "solid";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

/**
 * Chip del sistema de diseño v1 (app/styles/brand.css → .chip). Siempre macizo, radio 4,
 * 12 px, sentence case. Nunca translúcido ni píldora.
 *   primary / hot → chip suave (Glaciar)
 *   new / category → chip sobre foto (Papel)
 *   outline → chip con borde sobre fondo liso
 *   solid → chip Tinta (precio o dato destacado)
 */
const variantStyles: Record<BadgeVariant, string> = {
  primary: "chip--soft",
  hot: "chip--soft",
  new: "chip--media",
  category: "chip--media",
  outline: "",
  solid: "chip--solid",
};

export function Badge({ variant = "outline", children, className }: BadgeProps) {
  return <span className={cn("chip", variantStyles[variant], className)}>{children}</span>;
}
