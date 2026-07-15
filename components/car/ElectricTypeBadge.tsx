/**
 * Pildora chica que muestra el tipo eléctrico (EV / PHEV / HEV / MHEV / REEV)
 * en una card. Colores consistentes con el branding del sitio.
 */

interface Config {
  label: string;
  className: string;
}

const TYPE_CONFIG: Record<string, Config> = {
  EV:   { label: "EV",   className: "bg-primary text-black" },
  BEV:  { label: "EV",   className: "bg-primary text-black" },
  PHEV: { label: "PHEV", className: "bg-primary-deep text-white" },
  HEV:  { label: "HEV",  className: "bg-amber text-black" },
  MHEV: { label: "MHEV", className: "bg-gray-700 text-white" },
  EREV: { label: "REEV", className: "bg-purple-600 text-white" },
  REEV: { label: "REEV", className: "bg-purple-600 text-white" },
};

/**
 * Color de acento (hex) por tipo eléctrico — equivalente a las clases Tailwind
 * de TYPE_CONFIG. Fuente única de verdad para que otras secciones (ej. la grilla
 * de "¿Qué tipo de electrificado buscas?") usen el mismo color que los ribbons.
 */
export const ELECTRIC_TYPE_COLORS: Record<string, string> = {
  EV:   "#00E5E5", // bg-primary
  BEV:  "#00E5E5",
  PHEV: "#006A61", // bg-primary-deep
  HEV:  "#F59E0B", // bg-amber
  MHEV: "#374151", // bg-gray-700
  EREV: "#9333EA", // bg-purple-600
  REEV: "#9333EA",
};

export function electricTypeColor(tag?: string | null): string | undefined {
  return ELECTRIC_TYPE_COLORS[(tag ?? "").toUpperCase()];
}

export function ElectricTypeBadge({
  tag,
  className = "",
}: {
  tag?: string | null;
  className?: string;
}) {
  const t = (tag ?? "").toUpperCase();
  const cfg = TYPE_CONFIG[t];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide leading-none ${cfg.className} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
