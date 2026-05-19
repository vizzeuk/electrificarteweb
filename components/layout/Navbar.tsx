"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

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

type DropdownId = "brands" | "types" | "electric" | null;

export function Navbar({ brands = [], vehicleTypes = [], electricTypes = [] }: NavbarProps) {
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownId>(null);
  const [mobileSection, setMobileSection]   = useState<DropdownId>(null);
  const [scrolled, setScrolled]             = useState(false);

  const toggleMobileSection = (id: DropdownId) =>
    setMobileSection((prev) => (prev === id ? null : id));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    // set initial state
    setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = !scrolled && !mobileOpen;

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        transparent
          ? "bg-transparent border-b border-white/12"
          : "bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm shadow-black/5",
      ].join(" ")}
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between"
        aria-label="Navegacion principal"
      >
        {/* ── Logo ─────────────────────────────────────────── */}
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            href="/"
            aria-label="Electrificarte - Inicio"
          >
            <img
              src="/logos-electrificarte/logo-elec-sin auto.webp"
              alt="Electrificarte"
              className={[
                "h-7 md:h-8 w-auto object-contain transition-all duration-300",
                transparent ? "" : "brightness-0",
              ].join(" ")}
            />
          </Link>

          {/* ── Desktop links ─────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-1">

            {/* Dropdown – Marcas */}
            <Dropdown
              id="brands"
              label="Buscar por Marca"
              active={activeDropdown === "brands"}
              transparent={transparent}
              onEnter={() => setActiveDropdown("brands")}
              onLeave={() => setActiveDropdown(null)}
            >
              <div className="p-2">
                {brands.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/marcas/${b.slug}`}
                    className="flex flex-col px-3 py-2.5 rounded-xl hover:bg-surface transition-colors group"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <span className="font-bold text-sm text-text-main group-hover:text-primary-deep transition-colors">
                      {b.name}
                    </span>
                    {b.models && <span className="text-[11px] text-text-ghost mt-0.5">{b.models}</span>}
                  </Link>
                ))}
              </div>
              <div className="border-t border-gray-100 px-2 py-2">
                <Link
                  href="/marcas"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-deep hover:text-primary rounded-xl hover:bg-primary/5 transition-colors"
                  onClick={() => setActiveDropdown(null)}
                >
                  Ver todas las marcas
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </Dropdown>

            {/* Dropdown – Tipo de Vehículo */}
            <Dropdown
              id="types"
              label="Tipo de Vehículo"
              active={activeDropdown === "types"}
              transparent={transparent}
              onEnter={() => setActiveDropdown("types")}
              onLeave={() => setActiveDropdown(null)}
            >
              <div className="p-2">
                {vehicleTypes.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tipo/${t.slug}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors group"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <span className="material-symbols-outlined text-[18px] text-text-ghost group-hover:text-primary-deep transition-colors">
                      {t.icon ?? "directions_car"}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-text-main group-hover:text-primary-deep transition-colors leading-none">
                        {t.label}
                      </p>
                      {t.heroTagline && <p className="text-[10px] text-text-ghost mt-0.5">{t.heroTagline}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </Dropdown>

            {/* Dropdown – Tipo de Eléctrico */}
            <Dropdown
              id="electric"
              label="Tipo de Eléctrico"
              active={activeDropdown === "electric"}
              transparent={transparent}
              onEnter={() => setActiveDropdown("electric")}
              onLeave={() => setActiveDropdown(null)}
            >
              <div className="p-2">
                {electricTypes.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/electrico/${t.slug}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors group"
                    onClick={() => setActiveDropdown(null)}
                  >
                    <span className="material-symbols-outlined text-[18px] text-text-ghost group-hover:text-primary-deep transition-colors">
                      {t.icon ?? "bolt"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs text-text-main group-hover:text-primary-deep transition-colors leading-none truncate">
                          {t.label}
                        </p>
                        {t.tag && (
                          <span className="text-[9px] font-black text-text-ghost bg-surface px-1 py-0.5 rounded leading-none flex-shrink-0">
                            {t.tag}
                          </span>
                        )}
                      </div>
                      {t.tagline && <p className="text-[10px] text-text-ghost mt-0.5">{t.tagline}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </Dropdown>
          </div>
        </div>

        {/* ── Right CTAs ───────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/comparador"
            className={[
              "hidden lg:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
              transparent
                ? "text-white/80 hover:text-white border border-white/20 hover:border-white/50 hover:bg-white/5"
                : "text-text-main border border-gray-200 hover:border-primary/40 hover:text-primary hover:bg-surface",
            ].join(" ")}
          >
            <Icon name="compare" size="sm" />
            Comparador
          </Link>
          <Link
            href="/calculadora"
            className="hidden sm:inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_4px_16px_rgba(0,229,229,0.22)] hover:shadow-[0_6px_24px_rgba(0,229,229,0.35)] hover:scale-[1.02] active:scale-[0.99]"
          >
            <Icon name="calculate" size="sm" />
            Calcula tu ahorro
          </Link>

          {/* Hamburger */}
          <button
            className={[
              "lg:hidden p-2 rounded-lg transition-colors",
              transparent ? "text-white hover:bg-white/10" : "text-text-main hover:bg-surface",
            ].join(" ")}
            onClick={() => { setMobileOpen(!mobileOpen); setMobileSection(null); }}
            aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
          >
            <Icon name={mobileOpen ? "close" : "menu"} />
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu ──────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden bg-white border-b border-gray-100"
          >
            <div className="px-4 py-5 space-y-1">
              {/* Mobile – Marcas accordion */}
              <MobileAccordion
                label="Buscar por Marca"
                open={mobileSection === "brands"}
                onToggle={() => toggleMobileSection("brands")}
              >
                {brands.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/marcas/${b.slug}`}
                    className="flex flex-col py-2 px-3 rounded-xl hover:bg-surface transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="font-semibold text-sm">{b.name}</span>
                    {b.models && <span className="text-[11px] text-text-ghost">{b.models}</span>}
                  </Link>
                ))}
                <Link
                  href="/marcas"
                  className="flex items-center gap-1 py-2 px-3 text-xs font-semibold text-primary-deep"
                  onClick={() => setMobileOpen(false)}
                >
                  Ver todas →
                </Link>
              </MobileAccordion>

              {/* Mobile – Tipo accordion */}
              <MobileAccordion
                label="Tipo de Vehículo"
                open={mobileSection === "types"}
                onToggle={() => toggleMobileSection("types")}
              >
                {vehicleTypes.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tipo/${t.slug}`}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-surface transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-ghost">{t.icon ?? "directions_car"}</span>
                    <span className="font-semibold text-sm">{t.label}</span>
                  </Link>
                ))}
              </MobileAccordion>

              {/* Mobile – Tipo de Eléctrico accordion */}
              <MobileAccordion
                label="Tipo de Eléctrico"
                open={mobileSection === "electric"}
                onToggle={() => toggleMobileSection("electric")}
              >
                {electricTypes.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/electrico/${t.slug}`}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-surface transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="material-symbols-outlined text-[16px] text-text-ghost">{t.icon ?? "bolt"}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">{t.label}</span>
                      {t.tag && <span className="text-[9px] font-black text-text-ghost bg-surface px-1.5 py-0.5 rounded">{t.tag}</span>}
                    </div>
                  </Link>
                ))}
              </MobileAccordion>

              <div className="pt-4 border-t border-gray-100 space-y-2">
                <Link
                  href="/comparador"
                  className="flex items-center justify-center gap-2 w-full text-center border border-gray-200 hover:border-primary/40 hover:text-primary text-text-main font-semibold py-3 rounded-xl transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="material-symbols-outlined text-[18px]">compare</span>
                  Comparador
                </Link>
                <Link
                  href="/calculadora"
                  className="flex items-center justify-center gap-2 w-full text-center bg-primary hover:bg-primary-dark text-black font-bold py-3 rounded-xl transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="material-symbols-outlined text-[18px]">calculate</span>
                  Calcula tu ahorro
                </Link>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ── Shared dropdown wrapper ─────────────────────────────────── */
function Dropdown({
  label,
  active,
  transparent,
  onEnter,
  onLeave,
  children,
}: {
  id: string;
  label: string;
  active: boolean;
  transparent: boolean;
  onEnter: () => void;
  onLeave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className={[
          "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-default",
          transparent
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-text-muted hover:text-text-main hover:bg-surface",
          active ? (transparent ? "text-white bg-white/10" : "text-text-main bg-surface") : "",
        ].join(" ")}
        aria-haspopup="true"
        aria-expanded={active}
      >
        {label}
        <m.span
          animate={{ rotate: active ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="material-symbols-outlined text-[16px] leading-none"
        >
          expand_more
        </m.span>
      </button>

      <AnimatePresence>
        {active && (
          <m.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50 min-w-[240px]"
          >
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-black/10 overflow-hidden">
              {children}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Mobile accordion ───────────────────────────────────────── */
function MobileAccordion({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        className="flex items-center justify-between w-full text-base font-medium py-2.5 px-3 hover:text-primary transition-colors rounded-xl hover:bg-surface"
        onClick={onToggle}
      >
        {label}
        <m.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="material-symbols-outlined text-[18px]"
        >
          expand_more
        </m.span>
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pb-2 space-y-0.5">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
