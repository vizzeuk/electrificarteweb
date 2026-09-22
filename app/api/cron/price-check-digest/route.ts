// Cron semanal (lunes): junta todos los autos con hallazgos acumulados por las 28
// corridas del re-check y manda UN resumen por WhatsApp a Francisco. No investiga
// nada — solo lee lo que ya quedó marcado en Sanity.
//
// ⚠️ SE MANDA SIEMPRE, aunque no haya un solo hallazgo (regla C13/C15 del board).
// Antes salía temprano cuando no había nada: eso hacía indistinguible "todo en
// orden" de "el cron lleva tres semanas caído". El mensaje va encabezado por la
// cobertura real — 28/28 corridas · 176/176 autos — leída de catalog_check_runs.
//
// Flujo C. Ver docs/FLUJO-PDP-N8N.md §2.7.

import { createClient } from "@sanity/client";
import { coverageLine, weeklyCoverage, type Coverage } from "@/lib/catalog-recheck/coverage";
import { adminPhones } from "@/lib/whatsapp/admin";
import { sendProactiveText } from "@/lib/whatsapp/outbound";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface Finding {
  kind: string;
  detail?: string;
  versionName?: string;
}

interface FlaggedCar {
  name: string;
  brand: string;
  priceCheckFlag?: string;
  priceCheckNote?: string;
  catalogFindings?: Finding[];
}

export function buildDigestMessage(
  cars: FlaggedCar[],
  coverage: Coverage,
  publicados: number,
): string {
  const lines = [
    "📋 *Revisión semanal de catálogo*",
    coverageLine(coverage, publicados),
  ];

  const of = (...flags: string[]) => cars.filter((c) => flags.includes(c.priceCheckFlag ?? ""));
  const discontinued = of("discontinued");
  const deadSource = of("fuente_muerta");
  const priceHigh = of("price_high");
  const versions = of("version_nueva");
  const years = of("anio_nuevo");

  if (discontinued.length > 0) {
    lines.push("", `🔴 *${discontinued.length} posiblemente descontinuado(s)* (ya ocultos, revisa si corresponde):`);
    discontinued.forEach((c) => lines.push(`   - ${c.brand} ${c.name}`));
  }

  if (deadSource.length > 0) {
    lines.push("", `🔴 *${deadSource.length} con la fuente caída* (su revisión está detenida hasta que pegues otra URL):`);
    deadSource.forEach((c) => lines.push(`   - ${c.brand} ${c.name}`));
  }

  if (priceHigh.length > 0) {
    lines.push("", `🟡 *${priceHigh.length} con precio sobre el oficial*:`);
    priceHigh.forEach((c) => lines.push(`   - ${c.brand} ${c.name}: ${c.priceCheckNote ?? ""}`));
  }

  if (versions.length > 0) {
    lines.push("", `🟡 *${versions.length} con cambios de versión*:`);
    versions.forEach((c) => lines.push(`   - ${c.brand} ${c.name}: ${c.priceCheckNote ?? ""}`));
  }

  if (years.length > 0) {
    lines.push("", `🟡 *${years.length} con año de modelo nuevo* (conviene re-extraer la ficha):`);
    years.forEach((c) => lines.push(`   - ${c.brand} ${c.name}`));
  }

  // Los autos con hallazgos que no llegaron a levantar flag: la fuente cambió su
  // precio pero ya somos más baratos. No hay nada que aplicar, pero enterarse de
  // que la lista se movió es parte de verificar el precio.
  const informative = cars.filter(
    (c) => (c.priceCheckFlag ?? "none") === "none" && (c.catalogFindings?.length ?? 0) > 0,
  );
  if (informative.length > 0) {
    lines.push("", `ℹ️ *${informative.length} con precio oficial distinto, sin acción* (seguimos más baratos):`);
    informative.forEach((c) => lines.push(`   - ${c.brand} ${c.name}: ${c.priceCheckNote ?? ""}`));
  }

  if (cars.length === 0) {
    lines.push("", "Sin novedad: ningún auto cambió de precio, versión, año ni vigencia.");
  } else {
    lines.push(
      "",
      `Escríbeme "aplicar <modelo>" para bajar el precio al sugerido, "restaurar <modelo>" si un descontinuado fue un error, o "descartar <modelo>" para dejarlo como está.`,
    );
  }

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

  // `priceCheckFlag != "none"` en GROQ también matchea null/undefined (autos aún
  // sin revisar) — hay que filtrar por la lista explícita de valores de alerta.
  // El segundo término trae los hallazgos informativos, que no levantan flag.
  const { cars, publicados } = await sanity.fetch<{ cars: FlaggedCar[]; publicados: number }>(
    `{
      "cars": *[_type == "car" && !(_id in path("drafts.**"))
                && (priceCheckFlag in ["price_high", "discontinued", "fuente_muerta", "version_nueva", "anio_nuevo"]
                    || count(catalogFindings) > 0)] | order(priceCheckFlag asc) {
        name, "brand": brand->name, priceCheckFlag, priceCheckNote,
        "catalogFindings": catalogFindings[]{ kind, detail, versionName }
      },
      "publicados": count(*[_type == "car" && hidden != true && !(_id in path("drafts.**"))])
    }`,
  );

  const coverage = await weeklyCoverage();
  const message = buildDigestMessage(cars, coverage, publicados);
  const phones = adminPhones();
  let sent = 0;
  for (const phone of phones) {
    if (await sendProactiveText(phone, message)) sent++;
  }

  console.log("[cron price-check-digest]", {
    findings: cars.length,
    coverage: `${coverage.corridas}/${coverage.esperadas}`,
    phones: phones.length,
    sent,
  });
  return Response.json({
    sent: sent > 0,
    findings: cars.length,
    coverage,
    phonesNotified: sent,
  });
}
