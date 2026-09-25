"use client";

import { useState, useLayoutEffect, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { NavbarSearch } from "@/components/layout/NavbarSearch";
import { cleanSeparators, normalizeElectricLabel } from "@/lib/utils";
import { electricTypeLabel } from "@/components/car/ElectricTypeBadge";
import { ASESORIA_PRICE } from "@/lib/products";

export interface NavbarBrand {
  slug: string;
  name: string;
  models?: string;
}

export interface NavbarVehicleType {
  slug: string;
  label: string;
  icon?: string;
  heroTagline?: string;
}

export interface NavbarElectricType {
  slug: string;
  label: string;
  tag?: string;
  icon?: string;
  tagline?: string;
}

interface NavbarProps {
  brands?: NavbarBrand[];
  vehicleTypes?: NavbarVehicleType[];
  electricTypes?: NavbarElectricType[];
}

// Páginas con hero oscuro (video) — la navegación parte transparente sobre él.
// Con el sistema de diseño v1 solo el home tiene banda oscura arriba; el resto de las
// páginas abre en claro y la navegación va siempre sólida.
const DARK_HERO_PATHS = /^\/$/;

/**
 * Navegación del sistema de diseño v1. Desktop: menús desplegables en CSS puro
 * (hover y :focus-within, así también funcionan con teclado y con toque). Móvil:
 * panel claro a pantalla completa con acordeones nativos (<details>).
 */
export function Navbar({ brands = [], vehicleTypes = [], electricTypes = [] }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // useLayoutEffect fires before the browser paints — prevents the flash where
  // the navbar briefly shows white after scroll restoration on page reload.
  useLayoutEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cierra el menú móvil al navegar (ajuste de estado durante el render, sin efecto)
  // y bloquea el scroll del fondo mientras está abierto.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const hasDarkHero = DARK_HERO_PATHS.test(pathname);
  const transparent = hasDarkHero && !scrolled && !mobileOpen;
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className={`nav${transparent ? " theme-dark" : ""}`} role="banner">
        <div className="wrap nav__in">
          <div className="nav__left">
            <Link href="/" aria-label="Electrificarte, inicio" className="inline-flex items-center">
              <Logo className="h-[14px] sm:h-[17px]" />
            </Link>

            <nav className="nav__links" aria-label="Navegación principal">
              <NavMenu label="Marcas">
                {brands.map((b) => (
                  <Link key={b.slug} href={`/marcas/${b.slug}`}>
                    <span className="menu__title">{b.name}</span>
                    {b.models && <span className="menu__sub">{cleanSeparators(b.models)}</span>}
                  </Link>
                ))}
                <div className="menu__foot">
                  <Link href="/marcas">Ver todas las marcas</Link>
                </div>
              </NavMenu>

              <NavMenu label="Tipo de vehículo">
                {vehicleTypes.map((t) => (
                  <Link key={t.slug} href={`/tipo/${t.slug}`}>
                    <span className="menu__title">{t.label}</span>
                    {t.heroTagline && <span className="menu__sub">{t.heroTagline}</span>}
                  </Link>
                ))}
              </NavMenu>

              <NavMenu label="Tipo de electrificado">
                {electricTypes.map((t) => {
                  const tag = electricTypeLabel(t.tag);
                  return (
                    <Link key={t.slug} href={`/electrico/${t.slug}`}>
                      <span className="menu__title">
                        {normalizeElectricLabel(t.tag, t.label)}
                        {tag && <span className="chip">{tag}</span>}
                      </span>
                      {t.tagline && <span className="menu__sub">{t.tagline}</span>}
                    </Link>
                  );
                })}
              </NavMenu>

              <Link href="/comparador" className="nav__trigger">
                Comparador
              </Link>
            </nav>
          </div>

          <div className="nav__right">
            <NavbarSearch />
            <Link href="/calculadora" className="btn btn--secondary btn--sm nav__cta">
              <Icon name="calculate" size="none" />
              Calcula tu ahorro
            </Link>
            <button
              type="button"
              className="btn btn--quiet btn--icon nav__menu-btn"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <Icon name={mobileOpen ? "close" : "menu"} size="none" />
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-nav" className={`mnav${mobileOpen ? " is-open" : ""}`} aria-hidden={!mobileOpen}>
        <details>
          <summary>
            Marcas
            <Icon name="expand_more" size="none" />
          </summary>
          <ul>
            {brands.map((b) => (
              <li key={b.slug}>
                <Link href={`/marcas/${b.slug}`} onClick={closeMobile}>{b.name}</Link>
              </li>
            ))}
            <li>
              <Link href="/marcas" onClick={closeMobile}>Ver todas las marcas</Link>
            </li>
          </ul>
        </details>
        <details>
          <summary>
            Tipo de vehículo
            <Icon name="expand_more" size="none" />
          </summary>
          <ul>
            {vehicleTypes.map((t) => (
              <li key={t.slug}>
                <Link href={`/tipo/${t.slug}`} onClick={closeMobile}>{t.label}</Link>
              </li>
            ))}
          </ul>
        </details>
        <details>
          <summary>
            Tipo de electrificado
            <Icon name="expand_more" size="none" />
          </summary>
          <ul>
            {electricTypes.map((t) => (
              <li key={t.slug}>
                <Link href={`/electrico/${t.slug}`} onClick={closeMobile}>
                  {normalizeElectricLabel(t.tag, t.label)}
                </Link>
              </li>
            ))}
          </ul>
        </details>
        <details>
          <summary>
            Herramientas
            <Icon name="expand_more" size="none" />
          </summary>
          <ul>
            <li><Link href="/comparador" onClick={closeMobile}>Comparador</Link></li>
            <li><Link href="/calculadora" onClick={closeMobile}>Calculadora de ahorro</Link></li>
            <li><Link href="/blog" onClick={closeMobile}>Blog</Link></li>
          </ul>
        </details>
        <div className="mnav__cta">
          <Link href="/asesoria" className="btn btn--primary btn--block" onClick={closeMobile}>
            Quiero asesoría por {ASESORIA_PRICE}
          </Link>
          <Link href="/calculadora" className="btn btn--secondary btn--block" onClick={closeMobile}>
            <Icon name="calculate" size="none" />
            Calcula tu ahorro
          </Link>
        </div>
      </div>
    </>
  );
}

/** Menú desplegable de escritorio. Se abre con hover o foco (CSS en app/styles/home.css). */
function NavMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="nav__item">
      <button type="button" className="nav__trigger" aria-haspopup="true">
        {label}
        <Icon name="expand_more" size="none" />
      </button>
      <div className="nav__panel">
        <div className="menu">{children}</div>
      </div>
    </div>
  );
}
