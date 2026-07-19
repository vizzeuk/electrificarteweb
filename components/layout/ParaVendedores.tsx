// Sección "Para vendedores" — se muestra en el home, justo antes del footer.
// Resume la propuesta de la red de vendedores (landing vendedores.electrificarte.com):
// tráfico orgánico → prospección → cierre, con leads precalificados.

const VENDEDORES_URL = "https://vendedores.electrificarte.com";

const STEPS = [
  {
    icon: "public",
    title: "Tráfico orgánico",
    desc: "Electrificarte atrae compradores a su plataforma. Comparan, configuran su búsqueda y manifiestan interés — los clientes llegan solos.",
  },
  {
    icon: "person_search",
    title: "Te prospectamos el lead",
    desc: "Te informamos del interés del cliente por un modelo y entras a competir por ser la mejor oferta de la red (48–96h).",
  },
  {
    icon: "handshake",
    title: "Tú cierras la venta",
    desc: "Si tu propuesta convence al cliente, te conectamos con él. La comisión es 100% tuya.",
  },
];

const STATS = [
  { value: "3×",      label: "más cierres mensuales" },
  { value: "120+",    label: "modelos disponibles" },
  { value: "48-96h",  label: "entrega del lead" },
  { value: "100%",    label: "leads con intención" },
];

export function ParaVendedores() {
  return (
    <section
      className="bg-black px-4 md:px-8 py-16 md:py-20"
      aria-labelledby="vendedores-title"
    >
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary-deep/30 via-black to-black px-6 py-12 md:px-12 md:py-16">
          {/* Glow decorativo */}
          <div className="absolute -top-24 -right-16 w-[400px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none bg-primary" />

          <div className="relative z-10">
            {/* Encabezado */}
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-[11px] uppercase tracking-widest text-primary font-bold mb-3">
                Para vendedores
              </p>
              <h2
                id="vendedores-title"
                className="text-3xl md:text-4xl font-headline font-black uppercase tracking-tight text-white mb-4"
              >
                Vende más autos electrificados
                <br className="hidden md:block" /> sin buscar clientes
              </h2>
              <p className="text-white/60 leading-relaxed">
                Únete a la red de vendedores de Electrificarte y recibe leads
                calificados de personas que ya quieren comprar. Sin publicidad,
                sin perder tiempo.
              </p>
            </div>

            {/* Cómo funciona — 3 pasos */}
            <div className="grid gap-4 md:grid-cols-3 mb-10">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <span className="material-symbols-outlined text-[22px]">
                        {s.icon}
                      </span>
                    </span>
                    <span className="text-primary/50 font-headline font-black text-lg">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-base mb-1.5">
                    {s.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {STATS.map((st) => (
                <div key={st.label} className="text-center">
                  <p className="text-primary font-headline font-black text-2xl md:text-3xl leading-none">
                    {st.value}
                  </p>
                  <p className="text-white/40 text-xs mt-1.5 leading-snug">
                    {st.label}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <a
                href={VENDEDORES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-8 py-4 rounded-xl transition-all"
              >
                Quiero sumarme a la red
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
