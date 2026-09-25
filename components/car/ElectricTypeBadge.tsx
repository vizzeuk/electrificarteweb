import { cn } from "@/lib/utils";

/**
 * Chip con la sigla del tipo eléctrico (EV / PHEV / HEV / MHEV / REEV).
 * Sistema de diseño v1: un solo chip macizo para todos los tipos. La sigla es la que
 * diferencia; ya no hay un color por tecnología. Sobre foto usa la variante media (Papel).
 */

const TYPE_LABEL: Record<string, string> = {
  EV: "EV",
  BEV: "EV",
  PHEV: "PHEV",
  HEV: "HEV",
  MHEV: "MHEV",
  EREV: "REEV",
  REEV: "REEV",
};

/** Sigla normalizada del tipo eléctrico, o null si el tag no es conocido. */
export function electricTypeLabel(tag?: string | null): string | null {
  return TYPE_LABEL[(tag ?? "").toUpperCase()] ?? null;
}

export function ElectricTypeBadge({
  tag,
  className = "",
  onMedia = true,
}: {
  tag?: string | null;
  className?: string;
  /** true (defecto) = sobre una foto: chip en Papel. false = sobre fondo liso: chip con borde. */
  onMedia?: boolean;
}) {
  const label = electricTypeLabel(tag);
  if (!label) return null;
  return <span className={cn("chip", onMedia && "chip--media", className)}>{label}</span>;
}
