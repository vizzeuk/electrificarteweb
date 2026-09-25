import { Icon } from "@/components/ui/Icon";

export interface TrustBadgeData {
  icon: string;
  title: string;
  description: string;
}

interface TrustBadgesProps {
  badges?: TrustBadgeData[];
}

const DEFAULT_BADGES: TrustBadgeData[] = [
  { icon: "credit_card",       title: "Pago seguro",          description: "Tu pago está protegido. Usamos WebPay y encriptación bancaria." },
  // Giro sep-2026: la garantía de devolución era del flujo pagado ($19.990, en standby).
  // OJO: la waitlist solo registra interesados — no prometer una oferta ni decir "gratis".
  { icon: "verified_user",     title: "Sin compromiso",       description: "Regístrate en la waitlist y te contactamos cuando haya novedades." },
  { icon: "lock",              title: "Datos protegidos",     description: "Tu información personal está protegida bajo la Ley 19.628 de Chile." },
  { icon: "workspace_premium", title: "Vendedores oficiales", description: "Solo trabajamos con vendedores autorizados y verificados en Chile." },
];

/** "Compras con total confianza": cuatro sellos en fila, separados por hairlines. */
export function TrustBadges({ badges }: TrustBadgesProps) {
  const displayBadges = badges && badges.length > 0 ? badges : DEFAULT_BADGES;

  return (
    <section className="section section--rule" aria-labelledby="trust-title">
      <div className="wrap">
        <div className="section-head">
          <div className="section-head__text">
            <h2 id="trust-title" className="t-h2">Compras con total confianza</h2>
          </div>
        </div>

        <div className="trust">
          {displayBadges.map((badge) => (
            <div key={badge.title} className="trust__item">
              <Icon name={badge.icon} size="none" />
              <h3 className="trust__title">{badge.title}</h3>
              <p className="trust__text">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
