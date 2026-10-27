/**
 * La única llamada al modelo del re-check (regla C2: 1 auto = 1 lectura de 1 URL =
 * 1 llamada a Claude). Sin búsqueda web, sin fallback a otra fuente, sin segunda
 * fuente automática — leer la MISMA URL cada semana es lo que hace que el diff sea
 * comparable. La búsqueda web del Flujo B caía en una fuente distinta cada corrida
 * y generaba alertas fantasma.
 *
 * El modelo solo extrae y reporta lo que leyó, con la cita textual. Decidir si eso
 * es un cambio real es de lib/catalog-recheck/diff.ts.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { firecrawlConfigured, scrapeMarkdown } from "./firecrawl";
import { fetchConCadena } from "@/lib/http/fetch-cadena";
import type { SourceReport } from "./types";

/**
 * El board presupuesta Sonnet 5 para este flujo (~US$0,015/auto al precio vigente
 * de US$2/US$10 por millón). Es una extracción acotada de 4 campos, no razonamiento:
 * subir a Opus multiplicaría el costo semanal sin mover la precisión.
 */
const MODEL = "claude-sonnet-5";

/** Página de precios + PDF de ficha + un redirect. Más que eso es que la URL está mal. */
const MAX_FETCHES = 3;

/**
 * Techo de contenido que el fetch puede meter en el contexto.
 *
 * Una página de marca normal son ~2.500–3.000 tokens de texto (medido: la de
 * GWM son 228 kB de HTML que quedan en 11,8 kB de texto — el boilerplate nunca
 * entra, `web_fetch` entrega `text/plain`). Pero una página de documentación de
 * 100 kB son ~25.000 tokens, y eso cuesta 4× más que revisar un auto entero.
 * 8.000 deja holgura para la página más gorda del catálogo y pone un techo a lo
 * que puede costar una sola lectura. Sale gratis: es un parámetro del tool.
 */
const MAX_CONTENT_TOKENS = 8_000;

/**
 * Techo del markdown de Firecrawl que se le pasa al modelo. Medido: las páginas
 * de marca quedan en 8–12k chars con `onlyMainContent`. 40k deja holgura y evita
 * que una página patológica cueste 10× lo normal.
 */
const MAX_TEXT_CHARS = 40_000;

export const SYSTEM = [
  "Lees UNA página oficial de una marca de autos en Chile y reportas EXACTAMENTE lo que dice",
  "sobre precios, versiones, año de modelo y vigencia del modelo. No investigas, no buscas en",
  "otras páginas, no completas con lo que sabes.",
  "",
  "Reglas absolutas:",
  "- Un campo sin evidencia textual en la página es null. Nunca inferido, nunca estimado,",
  "  nunca traído de tu conocimiento previo.",
  "- 'evidencia' debe ser la cita textual literal de donde sale precio_base. Sin cita, manda",
  "  precio_base en null: un precio sin respaldo se descarta igual más adelante.",
  "- Los precios van en pesos chilenos, como número entero, sin puntos ni símbolos.",
  "  '$25.990.000' es 25990000.",
  "",
  "DOS PRECIOS (lo que más se equivoca):",
  "Las marcas chilenas muestran casi siempre VARIOS precios para la misma versión: el de lista",
  "('Precio Lista', 'Precio normal', 'Valor') y otros más bajos con bonos ('Precio con bonos',",
  "'Desde $X', 'Precio con financiamiento', 'Precio web', 'Oferta', con asterisco). Reporta DOS,",
  "de la versión MÁS BARATA del modelo:",
  "- precio_base: el MÁS ALTO (el de lista, sin bonos ni financiamiento), con su cita en 'evidencia'.",
  "- precio_financiamiento: el MÁS BAJO (con bonos y/o financiamiento de la marca), con su cita en",
  "  'evidencia_financiamiento'.",
  "Si hay más de dos, el más alto y el más bajo. Si la página publica UNO solo, va en precio_base y",
  "precio_financiamiento es null.",
  "",
  "Ejemplo real: la página del GWM Ora 03 muestra 'Desde: $17.990.000*' arriba y",
  "'Precio Lista $26.490.000' más abajo. La respuesta correcta es precio_base = 26490000 con",
  "evidencia 'Precio Lista $26.490.000', y precio_financiamiento = 17990000 con evidencia",
  "'Desde: $17.990.000*'.",
  "",
  "En 'versiones', lo mismo por versión: 'precio' es el más alto y 'precio_financiamiento' el más",
  "bajo (null si la versión muestra uno solo).",
  "No son precios del auto: una cuota mensual, un pie, un arriendo, un precio con retoma o parte",
  "de pago, un precio de otro país, ni un 'bono hasta $X' sin precio final.",
  "- 'modelo_vigente' es false solo si la página muestra que el modelo salió del catálogo",
  "  (descontinuado, 'ya no disponible', no aparece entre los modelos vigentes). Que no haya",
  "  precio visible no significa que el modelo no exista.",
  "- 'fuente_ok' es false si no pudiste leer la página (no responde, error, contenido vacío).",
  "- En 'versiones' va una entrada por cada versión que la página lista para ESTE modelo, con",
  "  el nombre tal como lo escribe la marca. Si la página no distingue versiones, manda [].",
].join("\n");

export const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    fuente_ok: { type: "boolean", description: "false si la página no se pudo leer." },
    modelo_vigente: { type: "boolean", description: "false solo si la página muestra que el modelo salió del catálogo." },
    precio_base: { type: ["number", "null"], description: "El precio MÁS ALTO (lista) de la versión más barata, en CLP, entero. null si no está explícito." },
    precio_financiamiento: { type: ["number", "null"], description: "El precio MÁS BAJO (con bonos y/o financiamiento) de esa misma versión, en CLP. null si la página publica uno solo." },
    anio_modelo: { type: ["number", "null"], description: "Año de modelo que declara la página. null si no lo dice." },
    versiones: {
      type: "array",
      description: "Una entrada por versión listada en la página.",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre de la versión tal como lo escribe la marca." },
          precio: { type: ["number", "null"], description: "El precio MÁS ALTO (lista) de esa versión en CLP. null si no está explícito." },
          precio_financiamiento: { type: ["number", "null"], description: "El MÁS BAJO (con bonos y/o financiamiento) de esa versión. null si muestra uno solo." },
        },
        required: ["nombre", "precio", "precio_financiamiento"],
        additionalProperties: false,
      },
    },
    evidencia: { type: ["string", "null"], description: "Cita textual literal de donde sale precio_base." },
    evidencia_financiamiento: { type: ["string", "null"], description: "Cita textual literal de donde sale precio_financiamiento." },
    nota: { type: ["string", "null"], description: "Una línea si algo quedó ambiguo o si la lectura falló." },
  },
  required: ["fuente_ok", "modelo_vigente", "precio_base", "precio_financiamiento", "anio_modelo", "versiones", "evidencia", "evidencia_financiamiento", "nota"],
  additionalProperties: false,
};

/** Un fallo de lectura no es una excepción: es un dato que el diff sabe manejar (C11). */
function failed(nota: string): SourceReport {
  return {
    fuente_ok: false,
    modelo_vigente: true,
    precio_base: null,
    precio_financiamiento: null,
    anio_modelo: null,
    versiones: [],
    evidencia: null,
    evidencia_financiamiento: null,
    nota,
  };
}

/**
 * Limita `web_fetch` al host de la propia URL. Es la traducción técnica de "una sola
 * fuente": sin esto el modelo puede seguir un link a un portal de reventa y reportar
 * ese precio como oficial.
 */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export interface ReadSourceInput {
  anthropic: Anthropic;
  brand: string;
  model: string;
  sourceUrl: string;
  /** Segunda URL opcional (ej. el PDF de ficha técnica) que el humano ya validó. */
  extraUrls?: string[];
  log?: (line: string) => void;
}

export interface SourceRead {
  report: SourceReport;
  /** Qué camino trajo el dato. Va al log de la corrida y al digest. */
  via: "web_fetch" | "firecrawl";
  /**
   * El texto de la página que se leyó, venga de `web_fetch` o de Firecrawl.
   * Permite que la confirmación del auto-aplicar re-extraiga sin volver a buscar
   * la página: ahorra ~30 s (clave contra el límite de 60 s de Vercel) y un
   * credit de Firecrawl. Con input idéntico, además, la única variable que queda
   * es la varianza del modelo — que es justo lo que esa guarda mide.
   */
  text?: string;
}

/**
 * El texto que `web_fetch` metió en el contexto. Se recupera del propio bloque de
 * resultado para que la CONFIRMACIÓN del auto-aplicar pueda re-extraer sin volver
 * a buscar la página: una segunda lectura completa son ~37 s más, y sumada a la
 * primera pasa el límite duro de 60 s de una función en Vercel Hobby — justo en
 * los autos que cambiaron de precio, que son los que importan.
 */
function fetchedText(content: Anthropic.ContentBlock[]): string | undefined {
  for (const block of content) {
    if (block.type !== "web_fetch_tool_result") continue;
    const result = block.content as { content?: { source?: { type?: string; data?: string } } };
    const source = result?.content?.source;
    if (source?.type === "text" && typeof source.data === "string" && source.data.trim()) {
      return source.data;
    }
  }
  return undefined;
}

interface Extraction {
  report: SourceReport;
  /** Solo en el camino de `web_fetch`: el texto de la página que se leyó. */
  text?: string;
}

/** Lo común a los dos caminos: mismo system prompt, misma salida estructurada. */
async function extract(
  input: ReadSourceInput,
  userContent: string,
  tools?: Anthropic.ToolUnion[],
): Promise<Extraction> {
  const response = await input.anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: userContent }],
    ...(tools ? { tools } : {}),
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const pageText = tools ? fetchedText(response.content) : undefined;

  if (!text) {
    return { report: failed("El modelo no devolvió contenido al leer la fuente."), text: pageText };
  }

  try {
    return { report: sanitize(JSON.parse(text)), text: pageText };
  } catch {
    input.log?.(`⚠ salida no-JSON: ${text.slice(0, 200)}`);
    return { report: failed("La salida del modelo no fue JSON válido."), text: pageText };
  }
}

/** Camino 1: `web_fetch` de Anthropic. Gratis, pero no ejecuta JavaScript. */
async function readWithWebFetch(input: ReadSourceInput, urls: string[]): Promise<Extraction> {
  const allowed = [...new Set(urls.map(hostOf).filter((h): h is string => Boolean(h)))];
  const prompt = [
    `Marca: ${input.brand}`,
    `Modelo: ${input.model}`,
    `País: Chile`,
    "",
    "Lee estas páginas y reporta lo que dicen de este modelo:",
    ...urls.map((u) => `- ${u}`),
  ].join("\n");

  // Un 429 o un 5xx de Anthropic no se atrapa acá a propósito: no es "la fuente
  // está caída" y no debe contar para la racha de fuente_muerta. Se propaga para
  // que el endpoint lo marque como error de corrida y el auto vuelva a la cola.
  return extract(input, prompt, [
    {
      // Fetch BÁSICO, sin filtrado dinámico, a propósito. Medido sobre la misma
      // página, 3 corridas cada uno: básico 5,6 s promedio · `_20260309` con
      // filtrado dinámico 18,0 s — y salida idéntica, misma cita textual. El
      // filtrado corre code execution por debajo y acá no aporta: la página son
      // ~3k tokens y ya hay techo con `max_content_tokens`.
      //
      // Importa porque el límite duro de una función en Vercel Hobby son 60 s: con
      // filtrado dinámico una lectura sola llegó a 61,6 s. La frescura que daba
      // `use_cache: false` (solo en `_20260309`) se recupera mejor en la
      // confirmación, que hace una lectura independiente con Firecrawl.
      type: "web_fetch_20250910",
      name: "web_fetch",
      max_uses: MAX_FETCHES,
      allowed_domains: allowed,
      max_content_tokens: MAX_CONTENT_TOKENS,
    },
  ]);
}

/** Camino 2: texto que ya bajamos (Firecrawl). Sin tools: el modelo solo extrae. */
export async function readFromText(
  input: ReadSourceInput,
  markdown: string,
): Promise<SourceReport> {
  const prompt = [
    `Marca: ${input.brand}`,
    `Modelo: ${input.model}`,
    `País: Chile`,
    `Fuente: ${input.sourceUrl}`,
    "",
    "Este es el contenido de la página. Reporta lo que dice de este modelo:",
    "",
    markdown.slice(0, MAX_TEXT_CHARS),
  ].join("\n");
  return (await extract(input, prompt)).report;
}

/**
 * Señales de que a `web_fetch` lo BLOQUEARON, no de que la fuente esté caída.
 * Medido en producción: lexus.cl y mg.cl devuelven "permiso denegado al dominio"
 * (`url_not_allowed`, que Anthropic aplica también por robots.txt). Ahí el sitio
 * está perfectamente vivo y Firecrawl lo lee sin problema.
 */
const BLOQUEO = /permiso|denied|not_allowed|no permitido|forbidden|403|robots|bloque/i;

/**
 * ¿Hay que reintentar con navegador real?
 *
 * Dos casos, y la diferencia importa porque cada intento cuesta un credit:
 *
 *  1. La página cargó bien y no había precio → es la firma de un precio pintado
 *     por JavaScript.
 *  2. A nosotros nos bloquearon → el sitio está vivo, el que no pasa es el
 *     fetch. Antes esto caía en "fuente caída" y a las dos corridas marcaba
 *     `fuente_muerta` pidiendo otra URL, cuando la URL estaba perfecta.
 *
 * Lo que NO dispara el fallback es una fuente genuinamente caída (404, dominio
 * que no responde): ahí Firecrawl tampoco la va a arreglar y corresponde pedir
 * otra URL (C11).
 */
export function needsBrowserFallback(report: SourceReport): boolean {
  if (report.fuente_ok) return report.modelo_vigente && report.precio_base === null;
  return BLOQUEO.test(report.nota ?? "");
}

/**
 * ¿El precio aparece escrito en la página? "$25.990.000", "25.990.000", "25,990,000" o
 * "25990000": cualquiera de las formas en que una marca chilena lo escribe.
 */
export function precioEnTexto(texto: string, precio: number): boolean {
  // "CLP 23990000.00" (configurador de BYD): los centavos en cero no son parte de la cifra.
  texto = texto.replace(/(\d)[.,]00(?![\d])/g, "$1");
  const n = Math.round(precio);
  const conPuntos = n.toLocaleString("es-CL");
  const conComas = n.toLocaleString("en-US");
  const plano = String(n);
  // Entre separadores, para que 2.599.000 no calce dentro de 22.599.000.
  return [conPuntos, conComas, plano].some((forma) =>
    new RegExp(`(^|[^\\d.,])${forma.replace(/[.,]/g, (c) => `\\${c}`)}(?![\\d]|[.,]\\d)`).test(texto),
  );
}

/**
 * Confirma un precio antes de escribirlo solo, SIN otra llamada al modelo: el número tiene
 * que aparecer escrito en una lectura fresca de la misma página (o, si la página no se deja
 * leer, en el texto que ya leyó el agente). La varianza del modelo no puede inventar una cifra
 * que la página no tiene.
 */
export async function confirmarEnFuente(
  url: string,
  precio: number,
  textoPrevio?: string,
): Promise<{ confirmado: boolean; via: string }> {
  try {
    const { response } = await fetchConCadena(url, {
      timeoutMs: 15_000,
      headers: { "user-agent": "Mozilla/5.0 (compatible; ElectrificarteBot/1.0)" },
    });
    if (response.ok) {
      const html = await response.text();
      if (precioEnTexto(html.replace(/<[^>]+>/g, " "), precio)) return { confirmado: true, via: "lectura fresca de la página" };
    }
  } catch {
    // la lectura fresca falló: se prueba con el navegador o con lo ya leído
  }
  if (firecrawlConfigured()) {
    const fresh = await scrapeMarkdown(url, { fresh: true });
    if (fresh.ok && fresh.markdown && precioEnTexto(fresh.markdown, precio)) {
      return { confirmado: true, via: "lectura fresca con navegador" };
    }
  }
  if (textoPrevio && precioEnTexto(textoPrevio, precio)) return { confirmado: true, via: "texto ya leído" };
  return { confirmado: false, via: "la cifra no aparece en la página" };
}

/**
 * Segunda lectura para confirmar un precio antes de escribirlo solo.
 *
 * Prefiere una lectura **independiente** con Firecrawl (`maxAge: 0`, navegador
 * propio): así no solo mide la varianza del modelo, también descarta que el
 * primer valor viniera de una página cacheada por Anthropic. Cuesta 1 credit y
 * solo corre en los autos cuyo precio cambió, que son pocos.
 *
 * Sin Firecrawl configurado cae a re-extraer del mismo texto: es una guarda más
 * débil (solo cubre varianza del modelo), pero no bloquea el flujo.
 */
export async function confirmPrice(
  input: ReadSourceInput,
  esperado: number,
  textoPrevio?: string,
): Promise<{ confirmado: boolean; leido: number | null; via: string }> {
  if (firecrawlConfigured()) {
    const fresh = await scrapeMarkdown(input.sourceUrl, { fresh: true });
    if (fresh.ok && fresh.markdown) {
      const r = await readFromText(input, fresh.markdown);
      return { confirmado: r.precio_base === esperado, leido: r.precio_base, via: "firecrawl (lectura fresca)" };
    }
    input.log?.(`⚠ la confirmación con Firecrawl falló (${fresh.error}) — se cae al texto ya leído`);
  }

  if (!textoPrevio) return { confirmado: false, leido: null, via: "sin texto para confirmar" };
  const r = await readFromText(input, textoPrevio);
  return { confirmado: r.precio_base === esperado, leido: r.precio_base, via: "re-extracción del mismo texto" };
}

export async function readSource(input: ReadSourceInput): Promise<SourceRead> {
  if (!hostOf(input.sourceUrl)) {
    return { report: failed(`URL inválida: ${input.sourceUrl}`), via: "web_fetch" };
  }

  const urls = [input.sourceUrl, ...(input.extraUrls ?? [])];
  const { report, text } = await readWithWebFetch(input, urls);

  if (!needsBrowserFallback(report) || !firecrawlConfigured()) {
    if (needsBrowserFallback(report)) {
      input.log?.("⚠ la página cargó sin precio y Firecrawl no está configurado — sin fallback");
    }
    return { report, via: "web_fetch", text };
  }

  input.log?.("↻ sin precio en el HTML estático — reintento con Firecrawl (navegador real)");
  const scraped = await scrapeMarkdown(input.sourceUrl);

  if (!scraped.ok || !scraped.markdown) {
    input.log?.(`⚠ Firecrawl falló: ${scraped.error}`);
    // Se devuelve la lectura de web_fetch tal cual: la página sí respondió, así
    // que esto NO es fuente caída. Queda sin precio y el diff no propone nada.
    return { report, via: "web_fetch", text };
  }

  const second = await readFromText(input, scraped.markdown);
  input.log?.(
    second.precio_base
      ? `✓ Firecrawl resolvió el precio (${scraped.markdown.length} chars de markdown)`
      : "⚠ ni con navegador real hay precio legible en esa página",
  );

  return { report: second, via: "firecrawl", text: scraped.markdown };
}

/**
 * La salida estructurada garantiza la forma, no la cordura. Esto normaliza lo que
 * igual puede llegar raro (strings con puntos de mil, precios negativos, versiones
 * sin nombre) para que el diff reciba siempre el mismo tipo.
 */
export function sanitize(raw: unknown): SourceReport {
  const o = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
    if (typeof v === "string") {
      const digits = v.replace(/[^\d]/g, "");
      if (digits) {
        const n = Number(digits);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
    return null;
  };
  const str = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : null;
  };

  const versiones = Array.isArray(o.versiones)
    ? o.versiones
        .map((v) => {
          const e = (v ?? {}) as Record<string, unknown>;
          const nombre = str(e.nombre);
          return nombre ? { nombre, precio: num(e.precio), precio_financiamiento: num(e.precio_financiamiento) } : null;
        })
        .filter((v): v is { nombre: string; precio: number | null; precio_financiamiento: number | null } => v !== null)
    : [];

  return {
    fuente_ok: o.fuente_ok !== false,
    // Ante la duda, vigente: ocultar un auto del sitio por una lectura ambigua es
    // peor que dejar un descontinuado una semana más (C7 es la única escritura
    // automática sobre contenido, y tiene que costar).
    modelo_vigente: o.modelo_vigente !== false,
    precio_base: num(o.precio_base),
    precio_financiamiento: num(o.precio_financiamiento),
    anio_modelo: (() => {
      const y = num(o.anio_modelo);
      return y && y >= 2000 && y <= 2100 ? y : null;
    })(),
    versiones,
    evidencia: str(o.evidencia),
    evidencia_financiamiento: str(o.evidencia_financiamiento),
    nota: str(o.nota),
  };
}
