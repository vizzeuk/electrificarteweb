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
import type { SourceReport } from "./types";

/**
 * El board presupuesta Sonnet 5 para este flujo (~US$0,015/auto al precio vigente
 * de US$2/US$10 por millón). Es una extracción acotada de 4 campos, no razonamiento:
 * subir a Opus multiplicaría el costo semanal sin mover la precisión.
 */
const MODEL = "claude-sonnet-5";

/** Página de precios + PDF de ficha + un redirect. Más que eso es que la URL está mal. */
const MAX_FETCHES = 3;

const SYSTEM = [
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
  "  '$25.990.000' es 25990000. Si la página muestra una cuota mensual, un bono, un pie o un",
  "  precio de otro mercado, eso NO es el precio de lista: manda null.",
  "- 'modelo_vigente' es false solo si la página muestra que el modelo salió del catálogo",
  "  (descontinuado, 'ya no disponible', no aparece entre los modelos vigentes). Que no haya",
  "  precio visible no significa que el modelo no exista.",
  "- 'fuente_ok' es false si no pudiste leer la página (no responde, error, contenido vacío).",
  "- En 'versiones' va una entrada por cada versión que la página lista para ESTE modelo, con",
  "  el nombre tal como lo escribe la marca. Si la página no distingue versiones, manda [].",
].join("\n");

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    fuente_ok: { type: "boolean", description: "false si la página no se pudo leer." },
    modelo_vigente: { type: "boolean", description: "false solo si la página muestra que el modelo salió del catálogo." },
    precio_base: { type: ["number", "null"], description: "Precio de lista del modelo en CLP, entero. null si no está explícito." },
    anio_modelo: { type: ["number", "null"], description: "Año de modelo que declara la página. null si no lo dice." },
    versiones: {
      type: "array",
      description: "Una entrada por versión listada en la página.",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: "Nombre de la versión tal como lo escribe la marca." },
          precio: { type: ["number", "null"], description: "Precio de esa versión en CLP. null si no está explícito." },
        },
        required: ["nombre", "precio"],
        additionalProperties: false,
      },
    },
    evidencia: { type: ["string", "null"], description: "Cita textual literal de donde sale precio_base." },
    nota: { type: ["string", "null"], description: "Una línea si algo quedó ambiguo o si la lectura falló." },
  },
  required: ["fuente_ok", "modelo_vigente", "precio_base", "anio_modelo", "versiones", "evidencia", "nota"],
  additionalProperties: false,
};

/** Un fallo de lectura no es una excepción: es un dato que el diff sabe manejar (C11). */
function failed(nota: string): SourceReport {
  return {
    fuente_ok: false,
    modelo_vigente: true,
    precio_base: null,
    anio_modelo: null,
    versiones: [],
    evidencia: null,
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

export async function readSource(input: ReadSourceInput): Promise<SourceReport> {
  if (!hostOf(input.sourceUrl)) return failed(`URL inválida: ${input.sourceUrl}`);

  const urls = [input.sourceUrl, ...(input.extraUrls ?? [])];
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
  const response = await input.anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
    tools: [
      {
        type: "web_fetch_20260209",
        name: "web_fetch",
        max_uses: MAX_FETCHES,
        allowed_domains: allowed,
      },
    ],
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) return failed("El modelo no devolvió contenido al leer la fuente.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    input.log?.(`  ⚠ salida no-JSON: ${text.slice(0, 200)}`);
    return failed("La salida del modelo no fue JSON válido.");
  }

  return sanitize(parsed);
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
          return nombre ? { nombre, precio: num(e.precio) } : null;
        })
        .filter((v): v is { nombre: string; precio: number | null } => v !== null)
    : [];

  return {
    fuente_ok: o.fuente_ok !== false,
    // Ante la duda, vigente: ocultar un auto del sitio por una lectura ambigua es
    // peor que dejar un descontinuado una semana más (C7 es la única escritura
    // automática sobre contenido, y tiene que costar).
    modelo_vigente: o.modelo_vigente !== false,
    precio_base: num(o.precio_base),
    anio_modelo: (() => {
      const y = num(o.anio_modelo);
      return y && y >= 2000 && y <= 2100 ? y : null;
    })(),
    versiones,
    evidencia: str(o.evidencia),
    nota: str(o.nota),
  };
}
