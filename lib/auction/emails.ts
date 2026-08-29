/**
 * Render de los correos de la subasta a partir de las plantillas en emails/*.html.
 *
 * Fuente única de diseño: los archivos HTML de emails/. Este módulo los lee y
 * sustituye los {{placeholders}}. Los valores se escapan (HTML-safe); para
 * inyectar HTML ya armado (ej. tarjetas de oferta) se usa el 3er argumento `raw`.
 *
 * Las plantillas se incluyen en el bundle vía outputFileTracingIncludes
 * ("/api/auction/**": ["./emails/**"]) en next.config.ts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CercaniaZona } from "@/lib/auction/score";

const cache = new Map<string, string>();

/** Fallback mínimo si la plantilla no se puede leer (evita tumbar el endpoint). */
function fallback(): string {
  return (
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">` +
    `<p style="font-weight:800;color:#111827;">ELECTRIFICARTE<span style="color:#006A61;">.COM</span></p>` +
    `<p style="color:#4B5563;">Tienes una novedad en tu proceso. Revisa tu WhatsApp o escríbenos a ` +
    `contacto@electrificarte.com.</p></div>`
  );
}

function load(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  try {
    const html = readFileSync(join(process.cwd(), "emails", `${name}.html`), "utf8");
    cache.set(name, html);
    return html;
  } catch {
    return fallback();
  }
}

function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"]/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string
  ));
}

/** Rellena una plantilla. `vars` se escapan; `raw` se inserta tal cual (HTML). */
export function renderEmail(
  name: string,
  vars: Record<string, unknown>,
  raw: Record<string, string> = {},
): string {
  let html = load(name);
  for (const [k, v] of Object.entries(raw)) html = html.split(`{{${k}}}`).join(v);
  for (const [k, v] of Object.entries(vars)) html = html.split(`{{${k}}}`).join(esc(v));
  return html.replace(/\{\{[a-z0-9_]+\}\}/gi, ""); // limpia placeholders no provistos
}

// ── Helpers de formato compartidos ──────────────────────────────────────────
export const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

export const CERCANIA_UBICACION: Record<CercaniaZona, string> = {
  local: "En tu misma comuna",
  regional: "En tu región",
  vecina: "En una región vecina",
  distante: "En otra región",
};

export function horasATexto(horas: number): string {
  if (horas < 24) return `${horas} horas`;
  const d = Math.round(horas / 24);
  return d === 1 ? "1 día" : `${d} días`;
}

export interface OfertaCard {
  modelo: string;
  precio: string;
  ahorro: string;
  ubicacion: string;
  entrega: string;
}

/** Construye el HTML de las 1–2 tarjetas de oferta para ofertas-cliente.html. */
export function buildOfertasCards(ofertas: OfertaCard[]): string {
  return ofertas
    .map(
      (o, i) => `
        <tr><td style="padding:0 32px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;">
            <tr><td style="padding:14px 20px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;">
              <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#111827;">Opción ${i + 1} · ${esc(o.modelo)}</span>
            </td></tr>
            <tr>
              <td width="50%" style="padding:16px 20px;border-right:1px solid #F3F4F6;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;color:#9CA3AF;">Precio</div>
                <div style="font-size:20px;font-weight:800;color:#006A61;margin-top:3px;">${esc(o.precio)}</div>
                <div style="font-size:12px;color:#4B5563;margin-top:2px;">Ahorras ${esc(o.ahorro)}</div>
              </td>
              <td width="50%" style="padding:16px 20px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;color:#9CA3AF;">Ubicación · Entrega</div>
                <div style="font-size:15px;font-weight:600;color:#111827;margin-top:3px;">${esc(o.ubicacion)}</div>
                <div style="font-size:12px;color:#4B5563;margin-top:2px;">Entrega en ${esc(o.entrega)}</div>
              </td>
            </tr>
          </table>
        </td></tr>`,
    )
    .join("\n");
}
