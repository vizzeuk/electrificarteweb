interface ContactSectionProps {
  phone?:     string | null;
  email?:     string | null;
  whatsapp?:  string | null;
}

export function ContactSection({ phone, email, whatsapp }: ContactSectionProps) {
  const waNumber  = whatsapp || "56912345678";
  const waMessage = encodeURIComponent("Hola Electrificarte, tengo una consulta sobre autos eléctricos.");
  const waHref    = `https://wa.me/${waNumber}?text=${waMessage}`;

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
            {/* WhatsApp */}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-colors duration-200"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 2a10 10 0 0 0-8.593 15.044L2 22l5.116-1.382A10 10 0 1 0 12 2zm0 18.182a8.182 8.182 0 1 1 0-16.364 8.182 8.182 0 0 1 0 16.364z"/>
              </svg>
              WhatsApp
            </a>

            {/* Email */}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2.5 border border-white/20 hover:border-primary hover:text-primary text-white/80 font-bold text-sm px-6 py-3.5 rounded-xl transition-colors duration-200"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                {email}
              </a>
            )}

            {/* Phone */}
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
