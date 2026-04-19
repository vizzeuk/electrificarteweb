import Link from "next/link";

interface ContactSectionProps {
  phone?: string | null;
  email?: string | null;
}

export function ContactSection({ phone, email }: ContactSectionProps) {
  return (
    <section
      id="contacto"
      className="bg-black py-16 px-4 md:px-8"
      aria-label="Contacto"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          {/* Text */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
              Contacto
            </p>
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white">
              ¿Tienes dudas? Hablemos.
            </h2>
            <p className="text-white/50 text-sm mt-2">
              Nuestro equipo responde en menos de 24 horas.
            </p>
          </div>

          {/* Channels */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2.5 bg-primary hover:bg-primary-dark text-black font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(0,229,229,0.22)] hover:shadow-[0_6px_28px_rgba(0,229,229,0.35)] hover:scale-[1.02] active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              Enviar mensaje
            </Link>

            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2.5 border border-white/20 hover:border-primary hover:text-primary text-white/80 font-bold text-sm px-6 py-3.5 rounded-xl transition-colors duration-200"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                {email}
              </a>
            )}

            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2.5 border border-white/20 hover:border-primary hover:text-primary text-white/80 font-bold text-sm px-6 py-3.5 rounded-xl transition-colors duration-200"
              >
                <span className="material-symbols-outlined text-[18px]">phone</span>
                {phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
