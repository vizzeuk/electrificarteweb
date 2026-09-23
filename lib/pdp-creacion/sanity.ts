// Cliente de Sanity propio del flujo de creación.
//
// No reusa el de lib/catalog-recheck/ a propósito: ese es del re-check semanal y
// se está trabajando en paralelo. Acá lo único que cambia es el `timeout`, que
// este flujo necesita sí o sí (ver abajo).
import { createClient } from "@sanity/client";

export type SanityWriteClient = ReturnType<typeof createClient>;

export function sanityCreacion(): SanityWriteClient | null {
  const token = process.env.SANITY_API_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!token || !projectId) return null;
  return createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2025-01-01",
    token,
    useCdn: false,
    // El default del cliente son 5 minutos. En una función de Vercel eso no es
    // "lento": es que el request se corta a los 60 s sin decir por qué. En una
    // prueba local una mutación colgada esperó 36 minutos antes de fallar.
    timeout: 25_000,
  });
}
