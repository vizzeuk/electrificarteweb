import { cn } from "@/lib/utils";

interface LogoProps {
  /** "wordmark" = solo la palabra (navegación, bajo 24 px de alto). "lockup" = con tagline. */
  variant?: "wordmark" | "lockup";
  className?: string;
}

/**
 * Logo monocromo del sistema de diseño v1. Se dibuja como máscara CSS, así que toma el
 * color del texto del contenedor: Tinta sobre claro, Niebla sobre oscuro. Nunca en color.
 * El alto lo define quien lo usa (h-[17px] en la navegación, por ejemplo).
 */
export function Logo({ variant = "wordmark", className }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="Electrificarte"
      className={cn("logo", variant === "lockup" && "logo--lockup", className)}
    />
  );
}
