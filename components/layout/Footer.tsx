"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";

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

function IconEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
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

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
type FooterLink = { label: string; href: string; external?: boolean };

const footerSections: { title: string; links: FooterLink[] }[] = [
  {
    title: "Nosotros",
    links: [
      { label: "Quiénes somos",    href: "/nosotros" },
      { label: "Nuestro servicio", href: "/#como-funciona" },
      { label: "Reseñas de dueños", href: "/resenas" },
      { label: "Cómo negociamos",  href: "/negociacion" },
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
  {
    title: "Vendedores",
    links: [
      { label: "Cómo funciona", href: "https://vendedores.electrificarte.com", external: true },
      { label: "Únete",         href: "https://vendedores.electrificarte.com/unirse", external: true },
    ],
  },
];

const socialLinks = [
  { icon: <IconInstagram />, href: "https://www.instagram.com/autos.electricos.con.francisco", label: "Instagram" },
  { icon: <IconTikTok />,    href: "https://www.tiktok.com/@autos_electricos_con_fco",         label: "TikTok" },
  { icon: <IconWhatsApp />,  href: "https://wa.me/56932099250",                                 label: "WhatsApp" },
  { icon: <IconEmail />,     href: "mailto:contacto@electrificarte.com",                        label: "Email" },
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
      <p className="flex items-center gap-2 text-[15px] text-ink">
        <Icon name="check_circle" className="text-[18px] text-link" />
        Listo. Te escribiremos con novedades.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      {/* min-w-0 en el input: sin eso su min-width:auto impide que se achique y
          empuja el botón fuera del contenedor en pantallas angostas. */}
      <div className="flex w-full gap-2">
        <label htmlFor="footer-newsletter" className="sr-only">Email para el newsletter</label>
        <input
          id="footer-newsletter"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          className="input min-w-0 flex-1"
        />
        <button type="submit" disabled={status === "loading"} className="btn btn--primary shrink-0">
          {status === "loading" ? "Enviando…" : "Suscribir"}
        </button>
      </div>
      {status === "error" && (
        <p className="field__error">No pudimos suscribirte. Intenta de nuevo.</p>
      )}
    </form>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="footer theme-dark" role="contentinfo">
      <div className="wrap">
        <div className="footer__top">
          <div className="footer__brand">
            <Link href="/" aria-label="Electrificarte, inicio" className="inline-block">
              <Logo variant="lockup" className="w-[232px]" />
            </Link>
            <p className="footer__about">
              Te ayudamos a elegir y comprar tu auto electrificado en Chile, con una red de vendedores oficiales.
            </p>
            <div className="socials">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Electrificarte en ${s.label}`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title} className="footer__col">
              <h3>{section.title}</h3>
              <ul>
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="newsletter">
            <h3>Newsletter</h3>
            <p>Recibe ofertas y novedades del mundo electrificado en Chile.</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="footer__bottom">
          <p>Electrificarte S.P.A. © {new Date().getFullYear()}, Santiago de Chile</p>
          <nav aria-label="Legal">
            <Link href="/terminos">Términos</Link>
            <Link href="/privacidad">Privacidad</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
