// Acciones y etiquetas de Studio para las fichas de autos (car).
//
// Por qué existen (oct-2026): las PDPs que crea el flujo desde el panel nacen OCULTAS (R6:
// publicar es siempre una persona). Francisco desactivó "Ocultar del sitio" pero no vio que
// además había que apretar "Publish": el cambio quedó como borrador y la ficha siguió oculta.
// "Mostrar en el sitio" hace las dos cosas en un clic, con confirmación.
import { useEffect, useState } from "react";
import {
  useDocumentOperation,
  type DocumentActionComponent,
  type DocumentBadgeComponent,
} from "sanity";

type CarDoc = { hidden?: boolean; name?: string; basePrice?: number } | null;

const actual = (props: { draft: unknown; published: unknown }) =>
  ((props.draft ?? props.published) as CarDoc) ?? null;

/** Quita "Ocultar del sitio" y publica, en un paso. Solo aparece si la ficha está oculta. */
export const MostrarEnSitioAction: DocumentActionComponent = (props) => {
  const { patch, publish } = useDocumentOperation(props.id, props.type);
  const [confirmando, setConfirmando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const doc = actual(props);

  // Patrón oficial "set and publish": cuando el borrador desaparece, la publicación terminó.
  useEffect(() => {
    if (publicando && !props.draft) setPublicando(false);
  }, [props.draft, publicando]);

  if (!doc?.hidden) return null;
  const sinPrecio = !(typeof doc.basePrice === "number" && doc.basePrice > 0);

  return {
    label: publicando ? "Publicando…" : "Mostrar en el sitio",
    tone: "positive",
    disabled: publicando || Boolean(publish.disabled && publish.disabled !== "ALREADY_PUBLISHED" && publish.disabled !== "NO_CHANGES"),
    title: "Quita \"Ocultar del sitio\" y publica la ficha en electrificarte.com",
    onHandle: () => setConfirmando(true),
    dialog: confirmando
      ? {
          type: "confirm",
          tone: "positive",
          message: sinPrecio
            ? `"${doc.name ?? "Esta ficha"}" no tiene precio base. ¿Publicarla igual en electrificarte.com?`
            : `"${doc.name ?? "Esta ficha"}" va a aparecer en electrificarte.com (listados, buscador, comparador y su página). ¿Publicar?`,
          confirmButtonText: "Sí, mostrar en el sitio",
          cancelButtonText: "Cancelar",
          onCancel: () => setConfirmando(false),
          onConfirm: () => {
            setConfirmando(false);
            setPublicando(true);
            patch.execute([{ set: { hidden: false } }]);
            publish.execute();
          },
        }
      : null,
  };
};
MostrarEnSitioAction.displayName = "MostrarEnSitioAction";

/** Etiqueta visible arriba de la ficha mientras esté oculta. */
export const OcultaBadge: DocumentBadgeComponent = (props) => {
  const publicado = props.published as CarDoc;
  if (!publicado?.hidden) return null;
  return { label: "Oculta del sitio", color: "warning", title: "No aparece en electrificarte.com. Usa \"Mostrar en el sitio\" para publicarla." };
};
