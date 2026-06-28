import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { signOrderToken } from "@/lib/order-token";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Inicia el pago en Reveniu para una solicitud del formulario.
 *
 * 1. Genera un orderId único (el token que ata formulario ↔ pago).
 * 2. Crea el cobro único en Reveniu con external_id = orderId.
 * 3. Manda el lead a n8n como "pendiente" (webhook lead-pendiente).
 * 4. Deja una cookie firmada que habilita la página de gracias.
 * 5. Devuelve la URL del gateway para redirigir al usuario a pagar.
 *
 * El registro en Supabase (advisory_payments) lo hace n8n cuando Reveniu
 * confirma el pago vía su webhook de eventos.
 */

// Producción: https://api.reveniu.com/api/v1 · Sandbox: ver REVENIU_API_BASE en .env
const REVENIU_API = process.env.REVENIU_API_BASE ?? "https://api.reveniu.com/api/v1";

// Validación mínima del payload — los datos extra del formulario se pasan a
// n8n tal cual, pero al menos garantizamos email y nombre válidos antes de
// llamar a Reveniu.
const checkoutSchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().min(2).max(120).optional(),
    name: z.string().min(2).max(120).optional(),
    // "advisory" = pago de asesoría del chatbot; cualquier otro valor o ausencia
    // = solicitud de auto del formulario principal.
    type: z.enum(["advisory"]).optional(),
  })
  .passthrough();

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, { max: 5, windowMs: 60_000, bucket: "checkout" });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const data = parsed.data;

  const orderId = crypto.randomUUID();
  const email = data.email;
  const name = data.fullName ?? data.name ?? "";
  const isAdvisory = data.type === "advisory";

  if (!name) {
    return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
  }

  // Advisory usa su propio plan de Reveniu (precio $4.990).
  // El plan debe tener configurada la URL de retorno:
  //   https://electrificarteweb.vercel.app/solicitar/gracias?type=advisory
  const planId = isAdvisory
    ? Number(process.env.REVENIU_ADVISORY_PLAN_ID)
    : Number(process.env.REVENIU_PLAN_ID);

  if (!planId) {
    const missing = isAdvisory ? "REVENIU_ADVISORY_PLAN_ID" : "REVENIU_PLAN_ID";
    console.error(`Falta ${missing} en variables de entorno`);
    return NextResponse.json({ error: "Configuración de pago no disponible" }, { status: 500 });
  }

  // ── 1. Crear el cobro único en Reveniu ──────────────────────────────────────
  let completionUrl: string;
  let securityToken: string;
  try {
    const reveniuRes = await fetch(`${REVENIU_API}/subscriptions/`, {
      method: "POST",
      headers: {
        "Reveniu-Secret-Key": process.env.REVENIU_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        external_id: orderId,
        field_values: { email, name },
      }),
    });
    if (!reveniuRes.ok) {
      console.error("Reveniu respondió", reveniuRes.status, await reveniuRes.text());
      return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 502 });
    }
    const json = await reveniuRes.json();
    completionUrl = json.completion_url;
    securityToken = json.security_token;
    if (!completionUrl || !securityToken) {
      return NextResponse.json({ error: "Respuesta de pago incompleta" }, { status: 502 });
    }
  } catch (err) {
    console.error("Error llamando a Reveniu:", err);
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 502 });
  }

  // ── 2. Mandar el lead pendiente a n8n ──────────────────────────────────────
  const webhookUrl = isAdvisory
    ? (process.env.N8N_ADVISORY_WEBHOOK_URL ?? process.env.N8N_WEBHOOK_URL)
    : process.env.N8N_WEBHOOK_URL;

  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: "pendiente", type: isAdvisory ? "advisory" : "lead", ...data }),
    }).catch((err) => console.error("Error notificando a n8n:", err));
  }

  // ── 3. Cookie firmada + URL de pago ─────────────────────────────────────────
  const res = NextResponse.json({ completionUrl, securityToken });
  res.cookies.set("ec_order", signOrderToken(orderId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 2,
    path: "/",
  });
  // Cookie de tipo (no firmada — solo afecta textos visuales, no acceso).
  if (isAdvisory) {
    res.cookies.set("ec_order_type", "advisory", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2,
      path: "/",
    });
  }
  return res;
}
