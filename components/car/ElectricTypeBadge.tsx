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
