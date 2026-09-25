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
 * Auth: header `x-admin-secret`. Body: { sessionId, fila }.
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
import { hostDe } from "@/lib/pdp-creacion/encargo";
import { camposDeImagen, subirFotos } from "@/lib/pdp-creacion/imagenes";
import { validarFila } from "@/lib/pdp-creacion/validar";
import type { FilaSheet } from "@/lib/pdp-creacion/encargo";

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

  const body = (await req.json().catch(() => ({}))) as { sessionId?: string; fila?: FilaSheet; host?: string };
  const { sessionId, fila } = body;
  if (!sessionId || !fila) return NextResponse.json({ error: "Falta sessionId o fila" }, { status: 400 });

  // El host al que quedo acotada la sesion. Lo devuelve /iniciar y puede no ser
  // el de la fila: si la URL redirige a otro dominio, la sesion se abrio con el
  // dominio de destino.
  let hostSesion: string;
  try {
    hostSesion = body.host || hostDe(fila.url_oficial);
  } catch {
    return NextResponse.json({ error: "url_oficial invalida" }, { status: 400 });
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
      respuesta = "No hay navegador disponible (FIRECRAWL_API_KEY sin configurar). Segui con lo que hayas podido leer, o entrega estado sin_datos.";
    } else if (hostSeguro(pedido.url) !== hostSesion) {
      // R2 otra vez: el navegador no es una puerta trasera a otra fuente.
      respuesta = `Rechazado: ${pedido.url} no es del dominio ${hostSesion} de la fuente del encargo. Solo podes releer la URL que te dieron.`;
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
    return NextResponse.json({
      estado: "sin_datos",
      costoUsd: costo,
      mensaje: `⚠️ No pude armar la PDP de ${nombre}.\n\n${motivo}\n\nRevisa la URL de la fila y volve a marcarla como "listo".`,
      detalleFila: `sin datos: ${motivo}`.slice(0, 480),
    });
  }

  const contrato = entrega.contrato;

  // Se re-valida: entre el iniciar y el cerrar pasaron minutos, y en el medio
  // alguien pudo haber creado el auto a mano en Studio (R8 sigue valiendo).
  const v = await validarFila(fila, sanity);
  if (!v.ok) {
    await cerrarSesion(sessionId, entrega.toolUseId);
    return NextResponse.json({
      estado: "rechazada",
      costoUsd: costo,
      errores: v.errores,
      mensaje: `⚠️ ${nombre}: la investigacion termino, pero la fila ya no es valida.\n\n• ${v.errores.join("\n• ")}`,
      detalleFila: v.errores.join(" | ").slice(0, 480),
    });
  }

  const llenado = medirLlenado(contrato.base, fila.electrificacion, contrato.portada_url);
  // `sourceUrls` guarda la URL EFECTIVA: es la que el Flujo C va a releer cada
  // semana, y la de la fila puede ser un redirect a otro dominio.
  const doc = armarDocumentoCar({ ...fila, url_oficial: v.urlFinal ?? fila.url_oficial }, contrato, v.refs!);

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
        contrato.discrepancias?.length ? `\n⚠️ La fuente contradice la fila:\n• ${contrato.discrepancias.join("\n• ")}` : null,
        v.redirigida ? `\n↪️ La URL de la fila redirige a ${v.urlFinal} — conviene corregirla en el Sheet.` : null,
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

  return NextResponse.json({
    estado: llenado.completo ? "listo_para_revisar" : "borrador_incompleto",
    carId,
    slug: slugify(`${fila.marca} ${fila.modelo}`),
    llenado,
    fotos: { portada: Boolean(fotos.portada), galeria: fotos.galeria.length, descartes: fotos.descartes },
    lote,
    costoUsd: costo,
    studioUrl,
    mensaje,
    detalleFila: `${llenado.n}/${llenado.m} campos · ${
      llenado.completo
        ? "completo"
        : `falta: ${[...llenado.vitalesFaltantes, ...llenado.importantesFaltantes].join(", ") || faltan}`
    }`.slice(0, 480),
  });
}
