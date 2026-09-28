import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { n8nHeaders } from "@/lib/n8n";

/**
 * Waitlist de VENDEDORES — quien vende autos electrificados deja sus datos y lo llamamos
 * cuando la red de vendedores esté funcionando (hoy en standby). Formulario en
 * `/vendedores/unirme`.
 *
 * Valida, limita y reenvía a n8n (`N8N_VENDOR_WAITLIST_URL`), que escribe la fila en
 * `waitlist_vendedores` de Supabase. Mismo patrón que `app/api/waitlist/route.ts`.
 *
 * Contrato con n8n (payload EXACTO):
 *   { firstName, lastName, email, phone, puntoVenta, marcas, region, comuna, mensaje, source, timestamp }
 *   - phone: "+56 912345678"
 *   - marcas: string separado por comas ("BYD, MG")
 *   - opcionales (region, comuna, mensaje): string o null
 * n8n responde 200 al guardar y 422 si faltan datos: cualquier no-2xx → 502 acá.
 */

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null));

const schema = z.object({
  firstName: z.string().trim().min(2, "Nombre inválido").max(80),
  lastName: z.string().trim().min(2, "Apellido inválido").max(80),
  email: z.string().trim().email("Email inválido").max(160),
  // El cliente antepone "+56 " a los 9 dígitos.
  phone: z.string().regex(/^\+56 9\d{8}$/, "Teléfono inválido"),
  puntoVenta: z.string().trim().min(2, "Punto de venta inválido").max(160),
  // Texto libre ("BYD, MG") o lista: se normaliza a un string separado por comas.
  marcas: z
    .union([z.string(), z.array(z.string())])
    .transform((v) =>
      Array.from(
        new Set(
          (Array.isArray(v) ? v : v.split(/[,;\n]/))
            .map((m) => m.trim())
            .filter(Boolean),
        ),
      ).join(", "),
    )
    .pipe(z.string().min(2, "Indica al menos una marca").max(300)),
  region: optionalText(80),
  comuna: optionalText(80),
  mensaje: optionalText(1000),
  source: z.string().max(60).optional(),
});

export async function POST(request: Request) {
  const limited = checkRateLimit(request, { max: 5, windowMs: 60_000, bucket: "waitlist-vendedores" });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_VENDOR_WAITLIST_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  const d = parsed.data;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: n8nHeaders(),
      body: JSON.stringify({
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone,
        puntoVenta: d.puntoVenta,
        marcas: d.marcas,
        region: d.region,
        comuna: d.comuna,
        mensaje: d.mensaje,
        source: d.source || "web",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`Webhook respondió ${res.status}`);
  } catch {
    return NextResponse.json({ error: "Error al procesar tu registro" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
