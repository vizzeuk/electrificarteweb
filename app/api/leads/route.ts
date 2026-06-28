import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";

const schema = z.object({
  // Datos personales
  fullName:      z.string().min(2).max(120),
  email:         z.string().email(),
  phone:         z.string().min(8).max(20).regex(/^[\d\s+\-()+]+$/),
  rut:           z.string().regex(/^\d{7,8}-[\dkK]$/, "RUT inválido"),
  comuna:        z.string().min(2).max(100),
  // Auto buscado
  carSearch:     z.string().min(1).max(200),
  carSlug:       z.string().optional(),
  // Pago
  paymentMethod: z.enum(["contado", "credito-convencional", "credito-inteligente", "no-seguro"]),
  // Parte de pago
  tradeIn:       z.enum(["si", "no"]),
  tradeInBrand:       z.string().optional(),
  tradeInModel:       z.string().optional(),
  tradeInYear:        z.string().optional(),
  tradeInOwners:      z.enum(["unico", "2", "3-mas"]).optional(),
  tradeInKm:          z.string().optional(),
  tradeInMaintenance: z.enum(["todas-marca", "no-todas"]).optional(),
  tradeInDebt:        z.enum(["si", "no"]).optional(),
  tradeInPlate:       z.string().optional(),
  tradeInPhotos:      z.array(z.string().max(2_000_000)).max(5).optional(),
  // Meta
  source: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const limited = await checkRateLimitRedis(request, { max: 5, windowSeconds: 60, bucket: "leads" });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  try {
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed.data,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook respondió ${webhookResponse.status}`);
    }
  } catch {
    return NextResponse.json({ error: "Error al enviar al webhook" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
