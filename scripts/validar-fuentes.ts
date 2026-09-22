/**
 * Valida candidatos de `url_oficial` y los escribe en .context/sheet/autos.tsv.
 *
 *   npx tsx --env-file=.env.local scripts/validar-fuentes.ts .context/candidatos.tsv
 *
 * El archivo de entrada es `marca<TAB>modelo<TAB>url`, una por línea (# = comentario).
 * Para cada una comprueba HTTP y si el precio está en el HTML estático, y actualiza
 * las columnas `url_sugerida`, `revision_url` y `necesita_navegador` de la hoja AUTOS.
 *
 * Separado del descubrimiento automático (gen-sheet-autos.ts) porque muchas marcas
 * chilenas no se pueden descubrir por sitemap ni por links: el candidato lo aporta
 * una persona (o una búsqueda web) y esto solo lo verifica en bloque.
 */

import { readFileSync, writeFileSync } from "node:fs";

const entrada = process.argv.find((a) => a.endsWith(".tsv") && !a.includes("sheet/AUTOS"));
const HOJA = ".context/sheet/AUTOS.tsv";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

if (!entrada) {
  console.error("Uso: npx tsx --env-file=.env.local scripts/validar-fuentes.ts <candidatos.tsv>");
  process.exit(1);
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function check(url: string): Promise<{ status: number; prices: number; final: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "es-CL,es;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = res.ok ? await res.text() : "";
    const prices = new Set(body.match(/\$\s?[0-9]{1,3}(?:[.,][0-9]{3}){2,}/g) ?? []).size;
    return { status: res.status, prices, final: res.url };
  } catch {
    return { status: 0, prices: 0, final: url };
  } finally {
    clearTimeout(timer);
  }
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += n) out.push(...(await Promise.all(items.slice(i, i + n).map(fn))));
  return out;
}

async function main(): Promise<void> {
  const cands = readFileSync(entrada!, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const [marca, modelo, url] = l.split("\t").map((x) => (x ?? "").trim());
      return { marca, modelo, url, key: norm(`${marca}${modelo}`) };
    })
    .filter((c) => c.marca && c.modelo && c.url);

  console.log(`\n${cands.length} candidatos a validar...\n`);

  const checked = await pool(cands, 5, async (c) => ({ ...c, ...(await check(c.url)) }));

  const rows = readFileSync(HOJA, "utf8").split(/\r?\n/).filter((l) => l.length > 0);
  const header = rows[0].split("\t");
  const col = (n: string) => header.indexOf(n);
  const [iMarca, iModelo, iUrl, iSug, iRev, iNav] = [
    "marca", "modelo", "url_oficial", "url_sugerida", "revision_url", "necesita_navegador",
  ].map(col);

  const byKey = new Map(checked.map((c) => [c.key, c]));
  let escritos = 0;
  const sinFila: string[] = [];
  const usados = new Set<string>();

  const out = rows.map((line, i) => {
    if (i === 0) return line;
    const c = line.split("\t");
    const key = norm(`${c[iMarca]}${c[iModelo]}`);
    const cand = byKey.get(key);
    if (!cand) return line;
    usados.add(key);
    if (c[iUrl]) return line; // ya tiene url_oficial: no se toca

    // El candidato final puede diferir por redirects; se guarda el que respondió.
    // Un 403/429 no dice que la URL esté mal: dice que el sitio bloquea clientes
    // sin navegador. Firecrawl sí la lee en la corrida, así que la URL sirve y lo
    // que corresponde es marcarla como "necesita navegador", no descartarla.
    const bloqueado = cand.status === 403 || cand.status === 429;
    const sirve = cand.status === 200 || bloqueado;

    c[iSug] = cand.status === 200 ? cand.final : cand.url;
    c[iRev] = bloqueado
      ? `el sitio bloquea clientes sin navegador (${cand.status}) — la lee Firecrawl`
      : cand.status !== 200
        ? `responde ${cand.status || "timeout"} — revisar`
        : cand.prices > 0
          ? `ok · ${cand.prices} precio(s) en el HTML`
          : "sin precio en el HTML estático — va a necesitar navegador (Firecrawl)";
    c[iNav] = sirve && cand.prices === 0 ? "SI" : "";
    escritos++;
    return c.join("\t");
  });

  for (const c of checked) if (!usados.has(c.key)) sinFila.push(`${c.marca} ${c.modelo}`);

  writeFileSync(HOJA, out.join("\n") + "\n");

  const ok = checked.filter((c) => c.status === 200 || c.status === 403 || c.status === 429);
  const conPrecio = ok.filter((c) => c.prices > 0);
  console.log(`  sirven (200, o 403/429 que lee Firecrawl): ${ok.length}/${checked.length}`);
  console.log(`  con precio en estático:   ${conPrecio.length}`);
  console.log(`  necesitan navegador:      ${ok.length - conPrecio.length}`);
  console.log(`  filas actualizadas:       ${escritos}`);
  if (sinFila.length) console.log(`  \x1b[33msin fila en la hoja (revisar nombre): ${sinFila.join(", ")}\x1b[0m`);

  const malos = checked.filter((c) => c.status !== 200 && c.status !== 403 && c.status !== 429);
  if (malos.length) {
    console.log(`\n  \x1b[33mNo responden:\x1b[0m`);
    for (const m of malos) console.log(`    ${m.marca} ${m.modelo}  ${m.status || "timeout"}  ${m.url}`);
  }
  console.log("");
}

void main();
