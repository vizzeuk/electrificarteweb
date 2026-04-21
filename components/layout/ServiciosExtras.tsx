import Link from "next/link";
import Image from "next/image";

interface ServicioExtra {
  badge?:       string;
  title:        string;
  description:  string;
  ctaText:      string;
  ctaHref:      string;
  imageUrl?:    string | null;
}

interface ServiciosExtrasProps {
  items?: ServicioExtra[] | null;
}

const DEFAULTS: ServicioExtra[] = [
  {
    badge:       "Domicilio",
    title:       "Adquiere tu Wallbox domiciliario con descuento",
    description: "Cotiza e instala tu cargador en casa con los mejores precios del mercado y técnicos certificados.",
    ctaText:     "Cotiza aquí",
    ctaHref:     "/solicitar?servicio=wallbox",
    imageUrl:    "/images/cargadores.webp",
  },
  {
    badge:       "Preferencial",
    title:       "Contrata el seguro de tu auto eléctrico a valores preferenciales",
    description: "Seguros especializados para vehículos eléctricos con coberturas exclusivas y precios únicos en Chile.",
    ctaText:     "Cotiza aquí",
    ctaHref:     "/solicitar?servicio=seguro",
    imageUrl:    "/images/seguros.webp",
  },
];

// Gradient fallbacks when no image is uploaded
const GRADIENTS = [
  "from-[#003d3d] via-[#005555] to-[#007070]",
  "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
];

export function ServiciosExtras({ items }: ServiciosExtrasProps) {
  const cards = (items && items.length > 0 ? items : DEFAULTS).slice(0, 2);

  return (
    <section className="bg-white py-16 px-4 md:px-8" aria-label="Servicios adicionales">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
            Servicios adicionales
          </p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-text-main">
            Todo lo que necesitas para tu auto eléctrico
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className="relative rounded-2xl overflow-hidden min-h-[280px] flex flex-col justify-between group"
            >
              {/* Background image or gradient */}
              {card.imageUrl ? (
                <Image
                  src={card.imageUrl}
                  alt={card.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]}`}
                />
              )}

              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-300" />

              {/* Content */}
              <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                <div>
                  {card.badge && (
                    <span className="inline-block bg-primary text-black text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                      {card.badge}
                    </span>
                  )}
                  <h3 className="text-white font-headline font-bold text-xl md:text-2xl leading-tight mb-3">
                    {card.title}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed max-w-sm">
                    {card.description}
                  </p>
                </div>

                <div className="mt-8">
                  <Link
                    href={card.ctaHref}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors duration-200"
                  >
                    {card.ctaText}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
