import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { chromium } from "playwright-core";
import chromiumBinary from "@sparticuz/chromium";
import { researchCar, type ResearchResult } from "@/lib/pdp-research/research";
import { sendProactiveText, sendProactiveImage } from "@/lib/whatsapp/outbound";

// Investigación de PDP disparada desde el modo administrador de WhatsApp (M3, Fase 1.2 Flujo A).
// Corre con su propio maxDuration, independiente del webhook de WhatsApp que lo dispara — ver
// docs/HANDOFF.md sección 5 y el plan de M3 (decisión de arquitectura #1: disparo desacoplado).
export const runtime = "nodejs";
export const maxDuration = 300;

async function launchServerlessBrowser() {
  return chromium.launch({
    args: chromiumBinary.args,
    executablePath: await chromiumBinary.executablePath(),
    headless: true,
  });
}

async function notify(phone: string, brand: string, model: string, result: ResearchResult) {
  if (result.status === "created") {
    const caption =
      `✅ *${brand} ${model}* investigado.\n` +
      `${result.filledFields ?? 0}/${result.totalFields ?? 0} specs confirmadas · ${result.photoCount ?? 0} fotos` +
      (result.usedDealerFallback ? "\n⚠️ Datos de un concesionario autorizado, no del sitio oficial de fábrica." : "") +
      `\n\nRevisar en Studio: ${result.studioUrl}`;
    if (result.mainImageUrl) {
      await sendProactiveImage(phone, result.mainImageUrl, caption);
    } else {
      await sendProactiveText(phone, caption);
    }
  } else if (result.status === "duplicate") {
    await sendProactiveText(phone, `= Ya existe un auto con ese nombre (${result.carId}). No se creó nada.`);
  } else {
    await sendProactiveText(phone, `❌ No se pudo investigar ${brand} ${model}.\n${result.message}`);
  }
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

  if (!brand || !model || !phone) {
    return NextResponse.json({ error: "Faltan brand/model/phone" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: "Faltan credenciales del servidor" }, { status: 500 });
  }

  // Responde rápido y sigue trabajando en segundo plano (after()) — así quien dispara esta
  // investigación (el webhook de WhatsApp) no queda bloqueado esperando 1-4 minutos. Ver plan de
  // M3, decisión de arquitectura #1.
  after(async () => {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const sanity = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
      apiVersion: "2025-01-01",
      token: process.env.SANITY_API_TOKEN,
      useCdn: false,
    });

    try {
      const result = await researchCar(brand, model, {
        anthropic,
        sanity,
        launchBrowser: launchServerlessBrowser,
        log: (line) => console.log(`[pdp-research] ${line}`),
      });
      await notify(phone, brand, model, result);
    } catch (err) {
      console.error("[admin/pdp-research] error:", err);
      await sendProactiveText(phone, `❌ Error investigando ${brand} ${model}: ${(err as Error).message}`);
    }
  });

  return NextResponse.json({ status: "queued" }, { status: 202 });
}
