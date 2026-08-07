import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { chromium } from "playwright-core";
import chromiumBinary from "@sparticuz/chromium";
import { researchCar, findExistingCarId, fillMissingSpecs, type ResearchResult } from "@/lib/pdp-research/research";
import { sendProactiveText, sendProactiveImage } from "@/lib/whatsapp/outbound";
import { loadAdminContext, saveAdminContext } from "@/lib/whatsapp/admin-context";
import { saveReviewState } from "@/lib/whatsapp/admin-review-state";
import type { ChatMessage } from "@/lib/whatsapp/advisor";

// Investigación de PDP disparada desde el modo administrador de WhatsApp (M3, Fase 1.2 Flujo A).
// Corre con su propio maxDuration, independiente del webhook de WhatsApp que lo dispara — ver
// docs/HANDOFF.md sección 5 y el plan de M3 (decisión de arquitectura #1: disparo desacoplado).
export const runtime = "nodejs";
export const maxDuration = 300;

type SanityClientInstance = ReturnType<typeof createClient>;

// El binario de @sparticuz/chromium es Linux-only (ENOEXEC en Mac/Windows) — en local (sin la
// env var VERCEL, que Vercel setea solo en su propio entorno) se usa el Chromium normal que ya
// instala Playwright (mismo que scripts/pdp-research.ts), para poder probar el flujo completo de
// WhatsApp corriendo local + túnel sin pelear contra el límite de duración de Vercel.
async function launchBrowserForEnv() {
  if (process.env.VERCEL) {
    return chromium.launch({
      args: chromiumBinary.args,
      executablePath: await chromiumBinary.executablePath(),
      headless: true,
    });
  }
  const { chromium: localChromium } = await import("playwright");
  return localChromium.launch();
}

function fmtCLP(n?: number | null): string {
  return typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—";
}

interface CarSummaryDoc {
  name: string;
  brand: string;
  slug: string;
  tagline?: string;
  basePrice?: number;
  discountPrice?: number;
  range?: number;
  batteryCapacity?: number;
  power?: number;
  warranty?: string;
  versions?: { name: string; price?: number }[];
  galleryKeys?: string[];
}

function buildSpecsMessage(car: CarSummaryDoc, studioUrl?: string): string {
  const lines = [`📋 *${car.brand} ${car.name}*`];
  if (car.tagline) lines.push(`_${car.tagline}_`);
  lines.push("", `Precio: ${fmtCLP(car.discountPrice ?? car.basePrice)}`);
  if (car.batteryCapacity) lines.push(`Batería: ${car.batteryCapacity} kWh`);
  if (car.range) lines.push(`Autonomía: ${car.range} km`);
  if (car.power) lines.push(`Potencia: ${car.power} HP`);
  if (car.warranty) lines.push(`Garantía: ${car.warranty}`);
  if (car.versions?.length) {
    lines.push("", "*Versiones:*");
    car.versions.forEach((v) =>
      lines.push(`  - ${v.name}: ${typeof v.price === "number" ? fmtCLP(v.price) : "precio no encontrado en ninguna fuente"}`)
    );
  }
  if (studioUrl) lines.push("", `Revisar en Studio: ${studioUrl}`);
  lines.push("", `Responde *SI* para aprobar y pasar a revisar las fotos, o dime qué corregir (ej: "la autonomía es 420").`);
  return lines.join("\n");
}

/** Registra lo que se le mandó a Francisco en su historial — sin esto, el advisor no tiene forma
 * de saber a qué está respondiendo cuando escribe "sí" a un aviso proactivo (bug real de M3.1). */
async function logToAdminContext(phone: string, messages: ChatMessage[]) {
  const history = await loadAdminContext(phone);
  await saveAdminContext(phone, [...history, ...messages]);
}

async function notify(phone: string, brand: string, model: string, result: ResearchResult, sanity: SanityClientInstance) {
  if (result.status === "created" && result.carId) {
    const car = await sanity.fetch<CarSummaryDoc | null>(
      `*[_id == $id][0]{
        name, "brand": brand->name, "slug": slug.current, tagline, basePrice, discountPrice,
        range, batteryCapacity, power, warranty, versions[]{name, price}, "galleryKeys": gallery[]._key
      }`,
      { id: result.carId }
    );
    if (!car) {
      const msg = `✅ ${brand} ${model} investigado, pero no pude releer los datos. Revisa en Studio: ${result.studioUrl}`;
      await sendProactiveText(phone, msg);
      await logToAdminContext(phone, [{ role: "assistant", content: msg }]);
      return;
    }

    const sent: ChatMessage[] = [];
    if (result.mainImageUrl) {
      const caption = `📸 Portada propuesta — ${car.brand} ${car.name}`;
      await sendProactiveImage(phone, result.mainImageUrl, caption);
      sent.push({ role: "assistant", content: `[foto] ${caption}` });
    }
    const specsMsg = buildSpecsMessage(car, result.studioUrl);
    await sendProactiveText(phone, specsMsg);
    sent.push({ role: "assistant", content: specsMsg });

    await saveReviewState(phone, {
      carId: result.carId,
      brand: car.brand,
      model: car.name,
      step: "specs",
      galleryKeys: car.galleryKeys ?? [],
    });
    await logToAdminContext(phone, sent);
    return;
  }

  const msg =
    result.status === "duplicate"
      ? `= Ya existe un auto con ese nombre (${result.carId}). No se creó nada.`
      : `❌ No se pudo investigar ${brand} ${model}.\n${result.message}`;
  await sendProactiveText(phone, msg);
  await logToAdminContext(phone, [{ role: "assistant", content: msg }]);
}

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const brand = typeof body?.brand === "string" ? body.brand.trim() : "";
  const model = typeof body?.model === "string" ? body.model.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const carId = typeof body?.carId === "string" ? body.carId.trim() : "";

  if (!brand || !model || !phone) {
    return NextResponse.json({ error: "Faltan brand/model/phone" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: "Faltan credenciales del servidor" }, { status: 500 });
  }

  const sanity = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
    apiVersion: "2025-01-01",
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
  });

  // Con carId: es un reintento para completar campos vacíos de un auto que YA existe — se salta
  // el chequeo de duplicado (no aplica) y va por un camino de encolado distinto (ver abajo).
  if (carId) {
    after(async () => {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      try {
        const result = await fillMissingSpecs(carId, brand, model, {
          anthropic,
          sanity,
          launchBrowser: launchBrowserForEnv,
          log: (line) => console.log(`[pdp-research:retry] ${line}`),
        });
        const msg =
          result.status === "updated"
            ? `✅ ${result.message}`
            : result.status === "no_new_data"
              ? `La nueva búsqueda no trajo datos adicionales para ${brand} ${model}.`
              : `❌ No se pudo completar la búsqueda de ${brand} ${model}.\n${result.message}`;
        await sendProactiveText(phone, msg);
        await logToAdminContext(phone, [{ role: "assistant", content: msg }]);
      } catch (err) {
        console.error("[admin/pdp-research:retry] error:", err);
        const msg = `❌ Error reintentando ${brand} ${model}: ${(err as Error).message}`;
        await sendProactiveText(phone, msg);
        await logToAdminContext(phone, [{ role: "assistant", content: msg }]);
      }
    });
    return NextResponse.json({ status: "queued" }, { status: 202 });
  }

  // Chequeo de duplicado ANTES de encolar el trabajo en segundo plano — si no, quien dispara esto
  // (admin-advisor.ts) ya mandó "arranqué la investigación" antes de que researchCar() se entere
  // de que ya existía, y Francisco recibe dos mensajes contradictorios casi al mismo tiempo.
  const existing = await findExistingCarId(brand, model, sanity);
  if (existing) {
    return NextResponse.json({ status: "duplicate", carId: existing.id }, { status: 200 });
  }

  // Responde rápido y sigue trabajando en segundo plano (after()) — así quien dispara esta
  // investigación (el webhook de WhatsApp) no queda bloqueado esperando 1-4 minutos. Ver plan de
  // M3, decisión de arquitectura #1.
  after(async () => {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    try {
      const result = await researchCar(brand, model, {
        anthropic,
        sanity,
        launchBrowser: launchBrowserForEnv,
        log: (line) => console.log(`[pdp-research] ${line}`),
      });
      await notify(phone, brand, model, result, sanity);
    } catch (err) {
      console.error("[admin/pdp-research] error:", err);
      const msg = `❌ Error investigando ${brand} ${model}: ${(err as Error).message}`;
      await sendProactiveText(phone, msg);
      await logToAdminContext(phone, [{ role: "assistant", content: msg }]);
    }
  });

  return NextResponse.json({ status: "queued" }, { status: 202 });
}
