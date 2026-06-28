import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name:    z.string().min(2).max(100),
  email:   z.string().email(),
  phone:   z.string().max(20).regex(/^[\d\s+\-()+]+$/).optional(),
  message: z.string().min(10).max(5000),
});

export async function POST(req: Request) {
  const limited = checkRateLimit(req, { max: 5, windowMs: 60_000, bucket: "contact" });
  if (limited) return limited;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const webhookUrl = process.env.N8N_CONTACT_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, source: "contact-page" }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) throw new Error(`Webhook responded ${res.status}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al enviar" }, { status: 500 });
  }
}
