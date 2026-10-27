// Los dos precios de un auto (oct-2026). `basePrice` / `versions[].price` = el precio MÁS ALTO que
// publica la marca (lista, sin bonos ni financiamiento). `discountPrice` = el MÁS BAJO (con bonos
// y/o financiamiento). El sitio muestra en grande el segundo, con la nota de la marca, y nunca un
// "Ahorras": ese ahorro solo existe si el cliente toma el crédito de la marca.

export const ETIQUETA_FINANCIAMIENTO = "Con bonos y/o financiamiento";
export const NOTA_FINANCIAMIENTO = "Precio con bonos y/o financiamiento, sujeto a cada marca.";
export const NOTA_LISTA = "Precio de lista referencial.";

/** ¿Hay un segundo precio de verdad? Tiene que existir y ser menor que el de lista. */
export function tieneFinanciamiento(lista: number | null | undefined, financiamiento: number | null | undefined): boolean {
  return typeof financiamiento === "number" && typeof lista === "number" && financiamiento > 0 && financiamiento < lista;
}

/**
 * El precio con bonos y/o financiamiento de una versión: el suyo; si no tiene y es la versión
 * cuyo precio de lista es el del modelo, el del modelo (los dos precios del modelo siempre salen
 * de la misma versión). Nunca el de otra versión.
 */
export function financiamientoDeVersion(
  v: { price?: number | null; discountPrice?: number | null },
  car: { basePrice?: number | null; discountPrice?: number | null },
): number | null {
  if (tieneFinanciamiento(v.price, v.discountPrice)) return v.discountPrice!;
  if (v.price && car.basePrice && v.price === car.basePrice && tieneFinanciamiento(car.basePrice, car.discountPrice)) {
    return car.discountPrice!;
  }
  return null;
}
