/**
 * Escribe y lee el Sheet "AUTOS ELECTRIFICARTE" desde los scripts locales, sin
 * exportar ni pegar TSV a mano.
 *
 * Habla con Google a través del webhook de n8n `electrificarte-sheet-sync`
 * (n8n/sheet-sync.json), que es un proxy delgado con la credencial OAuth "Sheets
 * Cadre": en esta máquina no hay ninguna credencial de Google, en n8n sí.
 *
 * Solo para scripts. Ningún endpoint de la web debe importar esto.
 *
 * La regla que manda todo el archivo: **el Sheet lo edita gente**. Francisco
 * agrega filas para PDPs nuevas, pega URLs, marca hallazgos como resueltos. Por
 * eso casi nada se escribe reemplazando la hoja entera: `sincronizar` cruza por
 * clave, toca solo las celdas que cambiaron, y nunca vacía una columna marcada
 * como de personas.
 */

export const SHEET_ID = process.env.SHEET_AUTOS_ID ?? "1QYqaKy3pRkGhAe4K4VnV0uUa5G1sOWNMvkyWQxTiGd8";

export function sheetSyncConfigured(): boolean {
  return Boolean(process.env.N8N_SHEET_SYNC_URL?.trim() && process.env.N8N_SHEET_SYNC_SECRET?.trim());
}

type Celda = string | number | boolean;

/** Un valor listo para la API: sin tabs ni saltos, números como números. */
function celda(v: unknown): Celda {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  return String(v).replace(/[\t\r\n]+/g, " ").trim();
}

/** Cómo se compara: lo que devuelve Sheets y lo nuestro, ambos como texto. */
const texto = (v: unknown): string => String(celda(v));

async function api<T>(metodo: "GET" | "POST" | "PUT", ruta: string, cuerpo?: unknown): Promise<T> {
  if (!sheetSyncConfigured()) {
    throw new Error("Falta N8N_SHEET_SYNC_URL / N8N_SHEET_SYNC_SECRET en .env.local");
  }
  const res = await fetch(process.env.N8N_SHEET_SYNC_URL!.trim(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sheet-sync-secret": process.env.N8N_SHEET_SYNC_SECRET!.trim(),
    },
    body: JSON.stringify({ metodo, ruta: `/${SHEET_ID}${ruta}`, cuerpo }),
    signal: AbortSignal.timeout(60_000),
  });
  const raw = await res.text();
  let j: unknown = null;
  try { j = JSON.parse(raw); } catch { /* respuesta no-JSON: se reporta abajo */ }
  if (!res.ok) {
    const msg =
      (j as { error?: { message?: string } | string; message?: string } | null)?.message ??
      (typeof (j as { error?: unknown })?.error === "string"
        ? (j as { error: string }).error
        : (j as { error?: { message?: string } })?.error?.message) ??
      raw.slice(0, 200);
    // 404 del propio n8n = el workflow está apagado, no un problema del Sheet.
    const pista = res.status === 404 && /webhook/i.test(raw)
      ? " — el workflow 'Sheet sync' está inactivo en n8n"
      : res.status === 401 || res.status === 403
        ? " — revisar N8N_SHEET_SYNC_SECRET, o el OAuth de 'Sheets Cadre' en n8n"
        : "";
    throw new Error(`Sheet ${metodo} ${ruta}: HTTP ${res.status} ${msg}${pista}`);
  }
  return j as T;
}

/** `'FALTAN FUENTES'!A1` — el nombre va entre comillas simples por los espacios. */
const rango = (hoja: string, a1 = "") => encodeURIComponent(`'${hoja.replace(/'/g, "''")}'${a1 ? `!${a1}` : ""}`);

/** 0 → A, 25 → Z, 26 → AA. */
function columna(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export async function hojas(): Promise<string[]> {
  const j = await api<{ sheets?: { properties: { title: string } }[] }>("GET", "?fields=sheets.properties.title");
  return (j.sheets ?? []).map((s) => s.properties.title);
}

/** Crea la hoja si no existe. Devuelve true si la creó. */
export async function asegurarHoja(hoja: string): Promise<boolean> {
  if ((await hojas()).includes(hoja)) return false;
  await api("POST", ":batchUpdate", { requests: [{ addSheet: { properties: { title: hoja } } }] });
  return true;
}

/** Todas las filas, como texto. Las filas vienen recortadas: se rellenan al ancho del encabezado. */
export async function leerHoja(hoja: string): Promise<string[][]> {
  const j = await api<{ values?: unknown[][] }>(
    "GET",
    `/values/${rango(hoja)}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
  );
  const filas = (j.values ?? []).map((f) => f.map(texto));
  const ancho = filas[0]?.length ?? 0;
  return filas.map((f) => (f.length < ancho ? [...f, ...Array(ancho - f.length).fill("")] : f));
}

/**
 * Vacía la hoja y la escribe entera. Solo para hojas que genera un script de
 * punta a punta (INSTRUCCIONES). Si la hoja tiene columnas que el nuevo
 * contenido no trae, alguien las agregó a mano: se aborta en vez de borrarlas.
 */
export async function reemplazarHoja(hoja: string, filas: unknown[][], { forzar = false } = {}): Promise<void> {
  await asegurarHoja(hoja);
  if (!forzar) {
    const actual = (await leerHoja(hoja))[0] ?? [];
    const nuevo = new Set((filas[0] ?? []).map(texto));
    const extra = actual.filter((h) => h && !nuevo.has(h));
    if (extra.length) {
      throw new Error(`La hoja ${hoja} tiene columnas que no son del script (${extra.join(", ")}). No se reemplaza.`);
    }
  }
  await api("POST", `/values/${rango(hoja)}:clear`, {});
  await api("PUT", `/values/${rango(hoja, "A1")}?valueInputOption=RAW`, { values: filas.map((f) => f.map(celda)) });
}

/** Escribe el encabezado solo si la hoja está vacía. Para las hojas que llena n8n. */
export async function asegurarEncabezado(hoja: string, encabezado: string[]): Promise<boolean> {
  await asegurarHoja(hoja);
  if ((await leerHoja(hoja)).length) return false;
  await api("PUT", `/values/${rango(hoja, "A1")}?valueInputOption=RAW`, { values: [encabezado] });
  return true;
}

export interface Pisada {
  clave: string;
  columna: string;
  antes: string;
  ahora: string;
}

export interface Resultado {
  celdas: number;
  agregadas: number;
  soloEnSheet: number;
  sinClave: number;
  /** Valores que una persona había escrito y que se reemplazaron. Quedan para el log. */
  pisadas: Pisada[];
}

/**
 * Cruza la hoja con `filas` por clave y escribe solo la diferencia.
 *
 * - Fila con clave que ya está en la hoja → se actualizan las celdas que cambiaron.
 * - Fila con clave que no está → se agrega al final.
 * - Fila de la hoja sin clave (una PDP nueva que agregó Francisco) → no se toca.
 * - Fila de la hoja cuya clave ya no viene → no se borra; si hay `ausentes`, se
 *   marca en esa columna.
 *
 * Las columnas de `noVaciar` las escriben personas: si nosotros no traemos
 * valor, gana lo que haya en la hoja. Si traemos uno distinto, gana el nuestro
 * (Sanity es la verdad) pero el valor anterior se devuelve en `pisadas`, para
 * que nada se pierda en silencio.
 *
 * Las columnas se ubican por nombre, no por posición: si alguien reordena o
 * agrega columnas en el Sheet, se respeta su orden.
 */
export async function sincronizar(
  hoja: string,
  opts: {
    columnas: string[];
    filas: Record<string, unknown>[];
    clave: (fila: Record<string, string>) => string;
    noVaciar?: string[];
    ausentes?: { columna: string; valor: string };
    /** Calcula todo y no escribe nada. */
    enSeco?: boolean;
  },
): Promise<Resultado> {
  const noVaciar = new Set(opts.noVaciar ?? []);
  if (!opts.enSeco) await asegurarHoja(hoja);
  const actual = opts.enSeco && !(await hojas()).includes(hoja) ? [] : await leerHoja(hoja);

  if (!actual.length) {
    if (opts.enSeco) return { celdas: 0, agregadas: opts.filas.length, soloEnSheet: 0, sinClave: 0, pisadas: [] };
    await reemplazarHoja(hoja, [opts.columnas, ...opts.filas.map((f) => opts.columnas.map((c) => f[c]))], { forzar: true });
    return { celdas: 0, agregadas: opts.filas.length, soloEnSheet: 0, sinClave: 0, pisadas: [] };
  }

  const encabezado = [...actual[0]];
  const faltantes = opts.columnas.filter((c) => !encabezado.includes(c));
  const escrituras: { range: string; values: Celda[][] }[] = [];
  if (faltantes.length) {
    escrituras.push({
      range: `'${hoja}'!${columna(encabezado.length)}1`,
      values: [faltantes],
    });
    encabezado.push(...faltantes);
  }
  const col = new Map(encabezado.map((h, i) => [h, i]));

  const comoRegistro = (f: string[]) => Object.fromEntries(encabezado.map((h, i) => [h, f[i] ?? ""]));
  const porClave = new Map<string, number>();
  let sinClave = 0;
  actual.slice(1).forEach((f, i) => {
    const k = opts.clave(comoRegistro(f));
    if (k) porClave.set(k, i + 1);
    else if (f.some(Boolean)) sinClave++;
  });

  const pisadas: Pisada[] = [];
  const nuevas: Celda[][] = [];
  const vistas = new Set<string>();
  let celdas = 0;

  for (const f of opts.filas) {
    const registro = Object.fromEntries(opts.columnas.map((c) => [c, texto(f[c])]));
    const k = opts.clave(registro);
    if (!k) continue;
    vistas.add(k);
    const r = porClave.get(k);

    if (r === undefined) {
      nuevas.push(encabezado.map((h) => (opts.columnas.includes(h) ? celda(f[h]) : "")));
      continue;
    }
    for (const c of opts.columnas) {
      const i = col.get(c)!;
      const enSheet = actual[r][i] ?? "";
      const nuestro = registro[c];
      if (enSheet === nuestro) continue;
      if (noVaciar.has(c)) {
        if (!nuestro) continue; // nunca vaciar lo que escribió una persona
        if (enSheet) pisadas.push({ clave: k, columna: c, antes: enSheet, ahora: nuestro });
      }
      escrituras.push({ range: `'${hoja}'!${columna(i)}${r + 1}`, values: [[celda(f[c])]] });
      celdas++;
    }
  }

  let soloEnSheet = 0;
  for (const [k, r] of porClave) {
    if (vistas.has(k)) continue;
    soloEnSheet++;
    if (opts.ausentes) {
      const i = col.get(opts.ausentes.columna);
      if (i !== undefined && (actual[r][i] ?? "") !== opts.ausentes.valor) {
        escrituras.push({ range: `'${hoja}'!${columna(i)}${r + 1}`, values: [[opts.ausentes.valor]] });
        celdas++;
      }
    }
  }

  if (opts.enSeco) return { celdas, agregadas: nuevas.length, soloEnSheet, sinClave, pisadas };

  // De a 500 rangos: el batchUpdate aguanta más, pero el webhook tiene 60 s.
  for (let i = 0; i < escrituras.length; i += 500) {
    await api("POST", "/values:batchUpdate", { valueInputOption: "RAW", data: escrituras.slice(i, i + 500) });
  }
  if (nuevas.length) {
    await api(
      "POST",
      `/values/${rango(hoja, "A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { values: nuevas },
    );
  }

  return { celdas, agregadas: nuevas.length, soloEnSheet, sinClave, pisadas };
}

/** Una línea de resumen para la consola. */
export function describir(hoja: string, r: Resultado): string {
  const partes = [
    `${r.celdas} celda(s) actualizadas`,
    `${r.agregadas} fila(s) nuevas`,
    r.soloEnSheet ? `${r.soloEnSheet} solo en el Sheet (no se tocan)` : "",
    r.sinClave ? `${r.sinClave} sin clave (filas a mano, no se tocan)` : "",
    r.pisadas.length ? `\x1b[33m${r.pisadas.length} valor(es) escritos a mano reemplazados\x1b[0m` : "",
  ].filter(Boolean);
  return `  Sheet · ${hoja.padEnd(15)} ${partes.join(" · ")}`;
}

/**
 * Deja en `.context/sheet/` lo que se pisó, con fecha. Si alguien había
 * corregido una URL en el Sheet sin importarla antes, acá la recupera.
 */
export async function guardarPisadas(hoja: string, pisadas: Pisada[]): Promise<string | null> {
  if (!pisadas.length) return null;
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync(".context/sheet", { recursive: true });
  const archivo = `.context/sheet/pisadas-${hoja.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.tsv`;
  writeFileSync(
    archivo,
    ["clave\tcolumna\tantes\tahora", ...pisadas.map((p) => [p.clave, p.columna, p.antes, p.ahora].join("\t"))].join("\n") + "\n",
  );
  return archivo;
}
