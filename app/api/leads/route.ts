import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  // Datos personales
  fullName:      z.string().min(2),
  email:         z.string().email(),
  phone:         z.string().min(8),
  rut:           z.string().min(2),
  comuna:        z.string().min(2),
  // Auto buscado
  carSearch:     z.string().min(1),
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
  tradeInPhotos:      z.array(z.string()).optional(), // base64 strings
  // Meta
  source: z.string().optional(),
});

export async function POST(request: Request) {
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
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook respondió ${webhookResponse.status}`);
    }
  } catch {
    return NextResponse.json({ error: "Error al enviar al webhook" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
