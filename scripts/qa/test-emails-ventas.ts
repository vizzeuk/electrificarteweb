/// <reference types="node" />
/**
 * Envía los correos de ventas (emails/ventas/) a TU correo, con datos de ejemplo
 * en vez de las expresiones de n8n. Sirve para ver cómo llegan al inbox real
 * (logo, diseño, render de Gmail/Outlook) sin necesitar el flujo detrás.
 *
 *   RESEND_API_KEY=re_xxxx npx tsx scripts/qa/test-emails-ventas.ts tu@correo.com
 *
 * El dominio del `from` debe estar verificado en Resend (ya lo está).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const to = process.argv[2];
const KEY = process.env.RESEND_API_KEY;
if (!KEY) { console.error("Falta RESEND_API_KEY (RESEND_API_KEY=re_... npx tsx ...)"); process.exit(1); }
if (!to || !to.includes("@")) { console.error("Uso: ... test-emails-ventas.ts tu@correo.com"); process.exit(1); }

const FROM = "Electrificarte <no-reply@electrificarte.com>";

// Valores de ejemplo para reemplazar las expresiones de n8n.
const SAMPLES: Record<string, string> = {
  "$('HTTP Request2').item.json.customer.name": "Camila Rojas",
  "$('HTTP Request2').item.json.customer.email": to,
  "$json.descripcion_interes": "BYD Dolphin 2025",
  "$json.telefono": "56912345678",
  "$('Create a row1').item.json.nombre": "Vicente",
  "$('Create a row1').item.json.apellido": "Cossio",
  "$('Create a row1').item.json.nombre_concesionario": "Automotora del Sur",
  "$('Create a row1').item.json.marcas": "BYD, MG",
  "$('Create a row1').item.json.telefono": "56912345678",
};

/** Reemplaza {{ <expr> }} por su valor de ejemplo; lo que sobre → "—". */
function fill(html: string): string {
  for (const [expr, val] of Object.entries(SAMPLES)) {
    const re = new RegExp("\\{\\{\\s*" + expr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\}\\}", "g");
    html = html.replace(re, val);
  }
  return html.replace(/\{\{[^}]*\}\}/g, "—");
}

const EMAILS = [
  { file: "pago-confirmado-cliente.html", subject: "[PRUEBA] Tu pago fue confirmado — Electrificarte" },
  { file: "nuevo-lead-francisco.html", subject: "[PRUEBA] Nuevo lead de Oferta Exclusiva" },
  { file: "registro-vendedor.html", subject: "[PRUEBA] Registro confirmado — Electrificarte" },
  { file: "nuevo-vendedor-francisco.html", subject: "[PRUEBA] Nuevo vendedor registrado" },
];

(async () => {
  for (const e of EMAILS) {
    const html = fill(readFileSync(join(process.cwd(), "emails", "ventas", e.file), "utf8"));
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject: e.subject, html }),
    });
    const body = await res.json().catch(() => ({}));
    console.log(`${res.ok ? "✓" : "✗"} ${e.file} → ${to} ${res.ok ? `(id ${(body as { id?: string }).id})` : JSON.stringify(body)}`);
  }
  console.log("\nRevisá tu inbox (y spam por si acaso).");
})();
