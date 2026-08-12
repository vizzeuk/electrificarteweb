import { cn } from "@/lib/utils";
import { ICON_CODEPOINTS } from "@/lib/icon-codepoints";

interface IconProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  filled?: boolean;
  /** Para color/tamaño calculados en runtime (ej. el acento de una categoría). */
  style?: React.CSSProperties;
}

const sizeStyles = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

/**
 * Renderiza el CODEPOINT del ícono, no su nombre.
 *
 * Antes se escribía el nombre ("home") y la fuente lo convertía en glifo por ligadura. Eso
 * significaba que, mientras la fuente cargaba, el usuario veía la palabra "home" — muy
 * visible en móvil. Con el codepoint el DOM nunca contiene texto legible, así que no hay
 * nada feo que mostrar durante la carga.
 *
 * El mapa lo genera scripts/subset-icon-font.ts junto con la fuente subseteada, así que
 * ambos están siempre sincronizados. Un ícono ausente del mapa no se dibuja (y avisa en
 * dev) en vez de escupir su nombre como texto.
 */
export function Icon({ name, className, size = "md", filled = false, style }: IconProps) {
  const codepoint = ICON_CODEPOINTS[name];

  if (!codepoint) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[Icon] "${name}" no está en la fuente subseteada. ` +
        `Corre: npx tsx --env-file=.env.local scripts/subset-icon-font.ts`
      );
    }
    // Espacio reservado: mantiene el layout estable en vez de saltar cuando falta un ícono.
    return <span aria-hidden className={cn("inline-block", sizeStyles[size], className)} style={style} />;
  }

  return (
    <span
      aria-hidden
      translate="no"
      className={cn("material-symbols-outlined", sizeStyles[size], className)}
      style={filled ? { ...style, fontVariationSettings: "'FILL' 1" } : style}
    >
      {codepoint}
    </span>
  );
}
