"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// ─── Social SVG icons (brand-accurate) ───────────────────────────────────────
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const footerSections = [
  {
    title: "Nosotros",
    links: [
      { label: "Quiénes somos",    href: "/nosotros" },
      { label: "Nuestro servicio", href: "/#como-funciona" },
      { label: "Blog",             href: "/blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos y condiciones", href: "/terminos" },
      { label: "Privacidad",             href: "/privacidad" },
      { label: "Contacto",               href: "/contacto" },
    ],
  },
];

const socialLinks = [
  { icon: <IconInstagram />, href: "https://instagram.com/electrificarte", label: "Instagram" },
  { icon: <IconYouTube />,   href: "https://youtube.com/@electrificarte",   label: "YouTube" },
  { icon: <IconTikTok />,    href: "https://tiktok.com/@electrificarte",    label: "TikTok" },
];

// ─── Newsletter form ──────────────────────────────────────────────────────────
function NewsletterForm() {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-primary text-sm font-medium">
        <span className="material-symbols-outlined text-[18px]">check_circle</span>
        ¡Gracias! Te avisaremos de las mejores ofertas.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          aria-label="Email para newsletter"
          className="bg-white/10 border border-white/20 rounded-lg text-sm px-4 py-2.5 flex-1 focus:border-primary focus:outline-none text-white placeholder:text-white/40 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-primary hover:bg-primary-dark text-black px-4 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {status === "loading" ? "..." : "Suscribir"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-red-400 text-xs">Error al suscribir. Intenta de nuevo.</p>
      )}
    </form>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="bg-black text-white pt-20 pb-6" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 pb-16 border-b border-white/10">

          {/* Brand */}
          <div>
            <Link
              href="/"
              className="text-2xl font-headline font-extrabold tracking-tighter flex items-center gap-2 mb-6"
              aria-label="Electrificarte - Inicio"
            >
              <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="bolt" className="text-black" size="sm" />
              </span>
              <span>Electrificarte</span>
            </Link>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Marketplace de autos eléctricos en Chile. Conectamos compradores
              con la mejor red de concesionarios.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:bg-primary hover:text-black hover:border-primary transition-all duration-200"
                  aria-label={`Electrificarte en ${s.label}`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-bold uppercase text-[10px] tracking-widest mb-6 text-white/40">
                {section.title}
              </h3>
              <ul className="space-y-3.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 font-medium hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div>
            <h3 className="font-bold uppercase text-[10px] tracking-widest mb-6 text-white/40">
              Newsletter
            </h3>
            <p className="text-xs text-white/50 mb-4 leading-relaxed">
              Recibe las mejores ofertas y novedades del mundo eléctrico en Chile.
            </p>
            <NewsletterForm />
          </div>

        </div>

        <p className="text-center text-[10px] text-white/30 uppercase tracking-widest">
          Electrificarte S.P.A. &copy; {new Date().getFullYear()} · Santiago, Chile ·{" "}
          <Link href="/terminos" className="hover:text-white/50 transition-colors">Términos</Link>
          {" · "}
          <Link href="/privacidad" className="hover:text-white/50 transition-colors">Privacidad</Link>
        </p>
      </div>
    </footer>
  );
}
