"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { formatCLP } from "@/lib/utils";
import { normSearch, useSearchIndex } from "@/hooks/useSearchIndex";

const MOBILE_QUERY = "(max-width: 767px)";
const subscribeMobile = (cb: () => void) => {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Buscador del hero del home: lo primero que se ve es que hay un catálogo. Resultados en vivo
 * desde `/api/search-index` (el mismo índice del navbar, descargado al enfocar el campo).
 * "Buscar"/Enter: si se eligió una fila (flechas o mouse), va a ese auto; si lo escrito es
 * exactamente una marca, a su página; si no, al primer resultado. Sin resultados no navega.
 */
export function HeroSearch() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // true cuando la persona eligió una fila con flechas o el mouse: ahí manda esa fila, no la marca.
  const [picked, setPicked] = useState(false);
  const { index, loading, results } = useSearchIndex(enabled, query, 6);
  // En móvil el ejemplo no cabe en el campo; en el servidor se asume escritorio.
  const isMobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);

  const hasQuery = normSearch(query).length > 0;
  const showList = open && hasQuery;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // En móvil el teclado tapa todo lo que está bajo el campo: se sube el buscador hasta
  // justo debajo del navbar para que los resultados queden a la vista.
  const onFocus = () => {
    setEnabled(true);
    setOpen(true);
    if (isMobile) window.setTimeout(() => rootRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 250);
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = normSearch(query);
    if (!q || !index) return;
    const chosen = picked ? results[active] : undefined;
    if (chosen) return go(`/auto/${chosen.slug}`);
    const brand = index.find((c) => c.brandSlug && normSearch(c.brand ?? "") === q);
    if (brand?.brandSlug) return go(`/marcas/${brand.brandSlug}`);
    if (results[0]) return go(`/auto/${results[0].slug}`);
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (!results.length || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    setOpen(true);
    setPicked(true);
    setActive((i) => (i + (e.key === "ArrowDown" ? 1 : results.length - 1)) % results.length);
  };

  return (
    <div
      className="hsearch"
      ref={rootRef}
      onBlur={(e) => { if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}
    >
      <form className="hsearch__bar" role="search" onSubmit={submit}>
        <Icon name="search" size="none" />
        <label htmlFor={`${listId}-input`} className="sr-only">Buscar un modelo o una marca</label>
        <input
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          onFocus={onFocus}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setPicked(false); setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder={isMobile ? "Busca marca o modelo" : "Busca una marca o un modelo, por ejemplo BYD Dolphin"}
        />
        <button type="submit" className="btn btn--primary">Buscar</button>
      </form>

      {showList && (
        <div className="hsearch__list" id={listId} role="listbox" aria-label="Resultados">
          {loading && <p className="hsearch__note">Cargando catálogo…</p>}
          {!loading && results.length === 0 && (
            <p className="hsearch__note">Sin resultados para “{query.trim()}”. Prueba con la marca o explora por tipo.</p>
          )}
          {results.map((c, i) => (
            <Link
              key={c.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              href={`/auto/${c.slug}`}
              onClick={() => setOpen(false)}
              onMouseEnter={() => { setActive(i); setPicked(true); }}
              className="hsearch__row"
            >
              <span className="hsearch__car">
                {c.brand && <span className="hsearch__brand">{c.brand}</span>}
                <span className="hsearch__name">{c.name}</span>
                {c.type && <span className="chip">{c.type}</span>}
              </span>
              <span className="hsearch__price">{formatCLP(c.discountPrice ?? c.basePrice)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
