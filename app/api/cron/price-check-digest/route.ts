// Cron semanal: junta todos los autos con priceCheckFlag != "none" (acumulados por los corridas
// diarias de price-check-scan) y manda UN resumen por WhatsApp a Francisco. No vuelve a investigar
// nada — solo lee lo que ya quedó marcado en Sanity.
// Fase 1.2, Flujo B (M4). Ver docs/HANDOFF.md sección 5 y el plan de M4.

import { createClient } from "@sanity/client";
import { adminPhones } from "@/lib/whatsapp/admin";
import { sendProactiveText } from "@/lib/whatsapp/outbound";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface FlaggedCar {
  name: string;
  brand: string;
  priceCheckFlag: "price_high" | "discontinued";
  priceCheckNote?: string;
}

export function buildDigestMessage(cars: FlaggedCar[]): string {
  const discontinued = cars.filter((c) => c.priceCheckFlag === "discontinued");
  const priceHigh = cars.filter((c) => c.priceCheckFlag === "price_high");

  const lines: string[] = ["📋 *Revisión semanal de catálogo*"];

  if (discontinued.length > 0) {
    lines.push("", `🔴 *${discontinued.length} posiblemente descontinuado(s)* (ya ocultos, revisa si corresponde):`);
    discontinued.forEach((c) => lines.push(`   - ${c.brand} ${c.name}`));
  }

  if (priceHigh.length > 0) {
    lines.push("", `🟡 *${priceHigh.length} con precio sobre el oficial*:`);
    priceHigh.forEach((c) => lines.push(`   - ${c.brand} ${c.name}: ${c.priceCheckNote ?? ""}`));
  }

  lines.push("", `Escríbeme "aplicar <modelo>" para bajar el precio al sugerido, "restaurar <modelo>" si un descontinuado fue un error, o "descartar <modelo>" para dejarlo como está.`);
  return lines.join("\n");
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!process.env.SANITY_API_TOKEN) {
    return Response.json({ error: "Falta SANITY_API_TOKEN" }, { status: 500 });
  }

  const sanity = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2025-01-01",
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
  });

  // priceCheckFlag != "none" en GROQ también matchea null/undefined (autos aún sin revisar) —
  // hay que filtrar explícitamente por los dos valores de alerta reales.
  const cars = await sanity.fetch<FlaggedCar[]>(
    `*[_type == "car" && priceCheckFlag in ["price_high", "discontinued"] && !(_id in path("drafts.**"))] | order(priceCheckFlag asc) {
      name, "brand": brand->name, priceCheckFlag, priceCheckNote
    }`
  );

  if (cars.length === 0) {
    console.log("[cron price-check-digest] sin hallazgos, no se manda mensaje");
    return Response.json({ sent: false, findings: 0 });
  }

  const message = buildDigestMessage(cars);
  const phones = adminPhones();
  let sent = 0;
  for (const phone of phones) {
    if (await sendProactiveText(phone, message)) sent++;
  }

  console.log("[cron price-check-digest]", { findings: cars.length, phones: phones.length, sent });
  return Response.json({ sent: sent > 0, findings: cars.length, phonesNotified: sent });
}
