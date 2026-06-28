import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Email inválido"),
});

export async function POST(request: Request) {
  const limited = checkRateLimit(request, { max: 5, windowMs: 60_000, bucket: "newsletter" });
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
      { error: "Email inválido" },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.N8N_NEWSLETTER_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: parsed.data.email,
        source: "footer-newsletter",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) throw new Error(`Webhook respondió ${res.status}`);
  } catch {
    return NextResponse.json({ error: "Error al procesar suscripción" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
