// Cron diario: red de seguridad de la cola de PDPs para cuando nadie abre el panel.
//
// El barrido (lib/pdp-creacion/trabadas.ts) corre tambien en cada GET del panel y en
// cada /reservar de n8n; este cron cubre el caso "la VPS de n8n se cayo y nadie mira
// el panel": las solicitudes trabadas pasan a "error" y llega el WhatsApp. Es diario
// porque Vercel Hobby no permite crons mas seguidos.

import { getSupabase } from "@/lib/whatsapp/subscription";
import { barrerTrabadas } from "@/lib/pdp-creacion/trabadas";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secreto configurado, no ejecutamos (fail-closed)
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const sb = getSupabase();
  if (!sb) return Response.json({ error: "Supabase no configurado" }, { status: 500 });
  return Response.json({ marcadas: await barrerTrabadas(sb) });
}
