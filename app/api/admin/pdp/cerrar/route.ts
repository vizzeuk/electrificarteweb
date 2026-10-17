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
 * Una falla NUNCA sale como 500 una vez que la sesion termino: se anota la
 * solicitud en "error" con la razon y se devuelve 200 con `estado: "error"` y
 * `mensaje`, asi n8n la avisa por WhatsApp igual que un resultado. Un 500 corta
 * la ejecucion de n8n y deja la solicitud en "procesando" sin que nadie se entere.
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
import { cerrarSesion, estadoSesion, falloDeSesion, leerEntrega, responderTool } from "@/lib/pdp-creacion/sesion";
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
  const anotarFinal = (estado: "listo_para_revisar" | "borrador_incompleto" | "sin_datos" | "rechazada" | "error", r: {
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

  // Leer la sesion puede fallar por un tropiezo de red o un 5xx de Anthropic:
  // eso no es el resultado de la investigacion. Se sigue esperando; si la falla
  // persiste, el techo de vueltas de n8n la marca como error.
  let estado: Awaited<ReturnType<typeof estadoSesion>>;
  let entrega: Awaited<ReturnType<typeof leerEntrega>>;
  try {
    estado = await estadoSesion(sessionId);
    if (estado.status === "running" || estado.status === "rescheduling") {
      return NextResponse.json({ estado: "corriendo", costoUsd: estado.listCostUsd });
    }
    entrega = await leerEntrega(sessionId);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`[pdp/cerrar] no se pudo leer la sesion ${sessionId}:`, error);
    return NextResponse.json({ estado: "corriendo", costoUsd: null, aviso: `No se pudo leer la sesion: ${error.slice(0, 300)}` });
  }
  const nombre = `${fila.marca} ${fila.modelo}`;
  const costo = estado.listCostUsd;

  // El agente pidio leer la pagina con navegador: la sesion esta `idle`
  // esperandonos, no termino. Se resuelve acá y no en el sandbox porque la key
  // de Firecrawl no tiene por que entrar a un contenedor donde corre codigo
  // que escribe el modelo. Si contestarle falla, el pedido sigue pendiente y la
  // proxima vuelta de n8n lo vuelve a intentar.
  if (entrega.pedidoNavegador) {
    const pedido = entrega.pedidoNavegador;
    let respuesta: string;
    let error = true;

    try {
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
    } catch (e) {
      const fallo = e instanceof Error ? e.message : String(e);
      console.warn(`[pdp/cerrar] no se pudo contestar el navegador de ${sessionId}:`, fallo);
      return NextResponse.json({ estado: "corriendo", costoUsd: costo, aviso: `No se pudo contestar el navegador: ${fallo.slice(0, 300)}` });
    }
    return NextResponse.json({
      estado: "corriendo",
      costoUsd: costo,
      via: "navegador",
      detalle: `El agente pidio navegador para ${pedido.url} (${pedido.motivo})`,
    });
  }

  // Despues de que la sesion termino, cualquier falla queda anotada en la solicitud.
  const terminar = async (): Promise<Response> => {
    // La sesion se cayo (reintentos agotados, tope de gasto, session.error): eso
    // es un error de la corrida, no "la fuente no tiene datos".
    const fallo = falloDeSesion(estado.status, entrega);
    if (fallo) {
      await cerrarSesion(sessionId, entrega.toolUseId);
      const mensaje = `❌ Fallo la investigacion de ${nombre}.\n\n${fallo}\n\nReintenta desde el panel. Sesion: ${sessionId}`;
      const detalleFila = fallo.slice(0, 480);
      await anotarFinal("error", { detalle: detalleFila, mensaje, costo });
      return NextResponse.json({ estado: "error", costoUsd: costo, mensaje, detalleFila });
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

    // Las fotos van ANTES de medir: la portada que cuenta es la que quedo subida,
    // no la URL que propuso el agente (esa puede dar 403, y una de la galeria
    // puede haber pasado a portada).
    const fotos = await subirFotos(sanity, contrato.portada_url, contrato.galeria, nombre, hostSesion);
    const llenado = medirLlenado(contrato.base, fila.electrificacion, fotos.portada?.url);
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
  };

  try {
    return await terminar();
  } catch (e) {
    // Fallo algo despues de que la sesion termino (Sanity, fotos, re-validar).
    const error = (e instanceof Error ? e.message : String(e)).slice(0, 400);
    console.error(`[pdp/cerrar] ${nombre} (${sessionId}):`, error);
    await cerrarSesion(sessionId, entrega.toolUseId);
    const mensaje = `❌ ${nombre}: la investigacion termino, pero fallo al crear la PDP.\n\n${error}\n\nReintenta desde el panel. Sesion: ${sessionId}`;
    const detalleFila = `error al crear la PDP: ${error}`.slice(0, 480);
    await anotarFinal("error", { detalle: detalleFila, mensaje, costo });
    return NextResponse.json({ estado: "error", costoUsd: costo, mensaje, detalleFila });
  }
}
