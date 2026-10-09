/**
 * POST /api/admin/pdp/cerrar — pasos 11 al 21 del diagrama v2.
 *
 * n8n lo llama en loop mientras la sesion siga corriendo. Cuando termina:
 * saca el `entregar_pdp`, mide el llenado N/M, sube la portada, crea el
 * borrador OCULTO en Sanity, le asigna lote de re-check y devuelve el mensaje
 * que n8n manda por WhatsApp y escribe en la fila.
 *
 * El borrador SIEMPRE se crea si el agente entrego datos (regla del board): el
 * umbral decide el mensaje y el estado de la fila, no si se crea.
 *
 * Auth: header `x-admin-secret`. Body: { sessionId, host, solicitudId } (panel)
 * o { sessionId, host, fila } (Sheet / CLI). Con `solicitudId` el resultado se
 * escribe en `pdp_solicitudes`, que es lo que lee el panel.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorized } from "@/lib/catalog-recheck/admin";
import { sanityCreacion } from "@/lib/pdp-creacion/sanity";
import { assignMissingSlots } from "@/lib/catalog-recheck/assign";
import { describeSlot } from "@/lib/catalog-recheck/slots";
import { medirLlenado } from "@/lib/pdp-creacion/contrato";
import { armarDocumentoCar, slugify } from "@/lib/pdp-creacion/sanity-doc";
import { cerrarSesion, estadoSesion, leerEntrega, responderTool } from "@/lib/pdp-creacion/sesion";
import { firecrawlConfigured, scrapeMarkdown } from "@/lib/catalog-recheck/firecrawl";
import { hostDe, parseVersiones } from "@/lib/pdp-creacion/encargo";
import { camposDeImagen, subirFotos } from "@/lib/pdp-creacion/imagenes";
import { validarFila } from "@/lib/pdp-creacion/validar";
import type { FilaSheet } from "@/lib/pdp-creacion/encargo";
import { getSupabase } from "@/lib/whatsapp/subscription";
import { anotarSolicitud, cargarSolicitud, filaDeSolicitud } from "@/lib/pdp-creacion/solicitudes";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Host de una URL, o "" si es basura — nunca lanza dentro del loop de espera. */
function hostSeguro(url: string): string {
  try { return hostDe(url); } catch { return ""; }
}

const STUDIO = "https://electrificarte.com/studio";

export async function POST(req: NextRequest): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sanity = sanityCreacion();
  if (!sanity) return NextResponse.json({ error: "Sanity no configurado" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { sessionId?: string; fila?: FilaSheet; host?: string; solicitudId?: string };
  const { sessionId, solicitudId } = body;
  const sb = solicitudId ? getSupabase() : null;
  let fila = body.fila;
  if (solicitudId && !fila) {
    if (!sb) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    const s = await cargarSolicitud(sb, solicitudId);
    if (!s) return NextResponse.json({ error: `No existe la solicitud ${solicitudId}` }, { status: 404 });
    fila = filaDeSolicitud(s);
  }
  if (!sessionId || !fila) return NextResponse.json({ error: "Falta sessionId o fila/solicitudId" }, { status: 400 });

  /** Resultado final → la solicitud del panel. No-op si vino del Sheet. */
  const anotarFinal = (estado: "listo_para_revisar" | "borrador_incompleto" | "sin_datos" | "rechazada", r: {
    detalle: string; mensaje: string; costo?: number | null; carId?: string; studioUrl?: string; lote?: string | null;
  }) =>
    anotarSolicitud(sb, solicitudId, {
      estado,
      detalle: r.detalle,
      mensaje: r.mensaje,
      costo_usd: typeof r.costo === "number" ? r.costo : null,
      car_id: r.carId ?? null,
      studio_url: r.studioUrl ?? null,
      lote: r.lote ?? null,
      terminada_at: new Date().toISOString(),
    });

  // El host al que quedo acotada la sesion. Lo devuelve /iniciar y puede no ser
  // el de la fila: si la URL redirige a otro dominio, la sesion se abrio con el
  // dominio de destino.
  let hostSesion: string;
  try {
    hostSesion = body.host || hostDe(fila.url_oficial ?? "");
  } catch {
    // Sin URL en la fila (fuente = sitio de la marca) el host lo trae siempre /iniciar → n8n.
    return NextResponse.json({ error: "Falta host (o url_oficial invalida)" }, { status: 400 });
  }

  const estado = await estadoSesion(sessionId);
  if (estado.status === "running" || estado.status === "rescheduling") {
    return NextResponse.json({ estado: "corriendo", costoUsd: estado.listCostUsd });
  }

  const entrega = await leerEntrega(sessionId);
  const nombre = `${fila.marca} ${fila.modelo}`;
  const costo = estado.listCostUsd;

  // El agente pidio leer la pagina con navegador: la sesion esta `idle`
  // esperandonos, no termino. Se resuelve acá y no en el sandbox porque la key
  // de Firecrawl no tiene por que entrar a un contenedor donde corre codigo
  // que escribe el modelo.
  if (entrega.pedidoNavegador) {
    const pedido = entrega.pedidoNavegador;
    let respuesta: string;
    let error = true;

    if (!firecrawlConfigured()) {
      respuesta = "No hay navegador disponible (FIRECRAWL_API_KEY sin configurar). Sigue con lo que hayas podido leer, o entrega estado sin_datos.";
    } else if (hostSeguro(pedido.url) !== hostSesion) {
      // R2 otra vez: el navegador no es una puerta trasera a otra fuente.
      respuesta = `Rechazado: ${pedido.url} no es del dominio ${hostSesion} de la fuente del encargo. Solo puedes leer paginas de ese dominio.`;
    } else {
      const r = await scrapeMarkdown(pedido.url);
      if (r.ok && r.markdown) {
        error = false;
        respuesta = r.markdown.slice(0, 180_000);
      } else {
        respuesta = `El navegador tampoco pudo leerla: ${r.error ?? "sin contenido"}. Entrega estado sin_datos si no te quedo nada.`;
      }
    }

    await responderTool(sessionId, pedido.id, respuesta, error);
    return NextResponse.json({
      estado: "corriendo",
      costoUsd: costo,
      via: "navegador",
      detalle: `El agente pidio navegador para ${pedido.url} (${pedido.motivo})`,
    });
  }

  if (!entrega.contrato || entrega.contrato.estado === "sin_datos") {
    await cerrarSesion(sessionId, entrega.toolUseId);
    const motivo =
      entrega.contrato?.motivo ??
      entrega.errores[0] ??
      entrega.ultimoMensaje ??
      "El agente termino sin entregar el contrato.";
    const mensaje = `⚠️ No pude armar la PDP de ${nombre}.\n\n${motivo}\n\nRevisa la URL oficial y reintenta desde el panel.`;
    const detalleFila = `sin datos: ${motivo}`.slice(0, 480);
    await anotarFinal("sin_datos", { detalle: detalleFila, mensaje, costo });
    return NextResponse.json({ estado: "sin_datos", costoUsd: costo, mensaje, detalleFila });
  }

  const contrato = entrega.contrato;

  // Se re-valida: entre el iniciar y el cerrar pasaron minutos, y en el medio
  // alguien pudo haber creado el auto a mano en Studio (R8 sigue valiendo).
  const v = await validarFila(fila, sanity);
  if (!v.ok) {
    await cerrarSesion(sessionId, entrega.toolUseId);
    const mensaje = `⚠️ ${nombre}: la investigacion termino, pero la solicitud ya no es valida.\n\n• ${v.errores.join("\n• ")}`;
    const detalleFila = v.errores.join(" | ").slice(0, 480);
    await anotarFinal("rechazada", { detalle: detalleFila, mensaje, costo });
    return NextResponse.json({ estado: "rechazada", costoUsd: costo, errores: v.errores, mensaje, detalleFila });
  }

  const llenado = medirLlenado(contrato.base, fila.electrificacion, contrato.portada_url);
  // `sourceUrls` guarda la URL EFECTIVA: es la que el Flujo C va a releer cada
  // semana, y la de la fila puede ser un redirect a otro dominio.
  const doc = armarDocumentoCar(
    { ...fila, url_oficial: v.urlFinal ?? fila.url_oficial, sitio_marca: v.sitioMarca },
    contrato,
    v.refs!,
  );
  // Sin versiones declaradas, el precio salio de la fuente (con cita) o no hay precio.
  const sinVersiones = !parseVersiones(fila.versiones).length;
  const precioDeFuente = sinVersiones && typeof doc.basePrice === "number";
  if (sinVersiones && !precioDeFuente) llenado.vitalesFaltantes.unshift("precio");
  if (sinVersiones && !precioDeFuente) llenado.completo = false;

  const fotos = await subirFotos(sanity, contrato.portada_url, contrato.galeria, nombre, hostSesion);
  const { mainImage, gallery } = camposDeImagen(fotos, nombre);
  if (mainImage) doc.mainImage = mainImage;
  if (gallery) doc.gallery = gallery;

  const creado = await sanity.create(doc as never);
  const carId = (creado as { _id: string })._id;

  // Lote de re-check al instante: asi el Flujo C lo toma el dia que le toca sin
  // esperar al barrido del inicio de corrida.
  let lote: string | null = null;
  try {
    const { asignados } = await assignMissingSlots(sanity, [carId]);
    const slot = asignados[0]?.checkSlot;
    if (typeof slot === "number") lote = describeSlot(slot);
  } catch {
    // El barrido de /recheck/queue lo agarra igual.
  }

  await cerrarSesion(sessionId, entrega.toolUseId);

  const studioUrl = `${STUDIO}/structure/car;${carId}`;
  const faltan = llenado.faltantes.slice(0, 8).join(", ");
  const mensaje = llenado.completo
    ? [
        `✅ ${nombre} — listo para revisar y publicar.`,
        ``,
        `${llenado.n}/${llenado.m} campos aplicables${fotos.portada ? "" : ` · ⚠️ sin portada: ${fotos.problemaPortada}`} · ${fotos.galeria.length + (fotos.portada ? 1 : 0)} foto(s)`,
        lote ? `Re-check: ${lote}` : `Lote de re-check: se asigna al publicarlo.`,
        precioDeFuente ? `\n💲 Precio tomado de la fuente oficial ($${(doc.basePrice as number).toLocaleString("es-CL")}): confírmalo en Studio antes de publicar.` : null,
        contrato.discrepancias?.length ? `\n⚠️ La fuente contradice la fila:\n• ${contrato.discrepancias.join("\n• ")}` : null,
        v.redirigida ? `\n↪️ La URL indicada redirige a ${v.urlFinal} — se guardo esa como fuente.` : null,
        ``,
        studioUrl,
      ].filter(Boolean).join("\n")
    : [
        `🟡 ${nombre} — quedo en borrador.`,
        ``,
        `${llenado.n}/${llenado.m} campos aplicables`,
        llenado.vitalesFaltantes.length ? `🔴 Faltan vitales: ${llenado.vitalesFaltantes.join(", ")}` : null,
        llenado.importantesFaltantes.length ? `🟠 Faltan importantes: ${llenado.importantesFaltantes.join(", ")}` : null,
        fotos.portada ? (fotos.problemaPortada ? `↪️ Portada: ${fotos.problemaPortada}` : null) : `Sin portada: ${fotos.problemaPortada}. Hay que subirla a mano.`,
        `Fotos: ${fotos.galeria.length + (fotos.portada ? 1 : 0)} subida(s)${fotos.descartes.length ? `, ${fotos.descartes.length} descartada(s)` : ""}`,
        faltan ? `Opcionales sin dato: ${faltan}${llenado.faltantes.length > 8 ? ` (+${llenado.faltantes.length - 8})` : ""}` : null,
        lote ? `Re-check: ${lote}` : `Lote de re-check: se asigna al publicarlo.`,
        ``,
        studioUrl,
      ].filter(Boolean).join("\n");

  const estadoFinal = llenado.completo ? "listo_para_revisar" : "borrador_incompleto";
  const detalleFila = `${llenado.n}/${llenado.m} campos · ${
    llenado.completo
      ? precioDeFuente ? "completo, precio tomado de la fuente: confírmalo" : "completo"
      : `falta: ${[...llenado.vitalesFaltantes, ...llenado.importantesFaltantes].join(", ") || faltan}`
  }`.slice(0, 480);
  await anotarFinal(estadoFinal, { detalle: detalleFila, mensaje, costo, carId, studioUrl, lote });

  return NextResponse.json({
    estado: estadoFinal,
    carId,
    slug: slugify(`${fila.marca} ${fila.modelo}`),
    llenado,
    fotos: { portada: Boolean(fotos.portada), galeria: fotos.galeria.length, descartes: fotos.descartes },
    lote,
    costoUsd: costo,
    studioUrl,
    mensaje,
    detalleFila,
  });
}
