/**
 * Headers para todo POST de la web hacia un webhook de n8n.
 *
 * Los webhooks de n8n son URLs públicas: sin esto, cualquiera que adivine o filtre la ruta
 * puede inyectar filas en Supabase (waitlist, reseñas, leads) y disparar correos a nombre
 * de Electrificarte. Con `N8N_WEBHOOK_SECRET` definido, cada llamada lleva
 * `x-electrificarte-secret`, y los nodos Webhook de n8n validan ese header con una
 * credencial Header Auth (ver docs/N8N-SEGURIDAD.md).
 *
 * Orden de despliegue: primero la web mandando el header (n8n lo ignora mientras el nodo no
 * tenga auth), después se activa Header Auth en n8n. Al revés se cortan los flujos.
 */
export const N8N_SECRET_HEADER = "x-electrificarte-secret";

export function n8nHeaders(): Record<string, string> {
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  return {
    "Content-Type": "application/json",
    ...(secret ? { [N8N_SECRET_HEADER]: secret } : {}),
  };
}
