/**
 * Mete las `url_oficial` del Sheet de vuelta a Sanity (`sourceUrls`).
 *
 *   # En el Sheet: Archivo → Descargar → Valores separados por tabulaciones (.tsv)
 *   npx tsx --env-file=.env.local scripts/import-sheet-fuentes.ts ~/Downloads/autos.tsv
 *   npx tsx --env-file=.env.local scripts/import-sheet-fuentes.ts ~/Downloads/autos.tsv --aplicar
 *
 * Existe para no quedar bloqueados esperando la credencial de Google en n8n: se
 * exporta el Sheet a TSV y esto escribe. Cuando la credencial exista, el mismo
 * trabajo lo hará un workflow y este script queda como respaldo manual.
 *
 * Solo toca `sourceUrls`. No cambia precios, ni specs, ni publica nada.
 */

import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { isChileConfirmedUrl } from "@/lib/chile-url";

const file = process.argv.find((a) => a.endsWith(".tsv") || a.endsWith(".csv"));
const aplicar = process.argv.includes("--aplicar");

if (!file) {
  console.error("Uso: npx tsx --env-file=.env.local scripts/import-sheet-fuentes.ts <archivo.tsv> [--aplicar]");
  process.exit(1);
}

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

interface Row {
  pdp_id: string;
  marca: string;
  modelo: string;
  url_oficial: string;
}

function parse(raw: string): Row[] {
  const sep = raw.includes("\t") ? "\t" : ",";
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iId = idx("pdp_id");
  const iUrl = idx("url_oficial");
  if (iId < 0 || iUrl < 0) {
    console.error(`El archivo no tiene las columnas pdp_id y url_oficial. Encabezados: ${header.join(", ")}`);
    process.exit(1);
  }
  return lines.slice(1).map((l) => {
    const c = l.split(sep);
    return {
      pdp_id: (c[iId] ?? "").trim(),
      marca: (c[idx("marca")] ?? "").trim(),
      modelo: (c[idx("modelo")] ?? "").trim(),
      url_oficial: (c[iUrl] ?? "").trim(),
    };
  });
}

async function main(): Promise<void> {
  const rows = parse(readFileSync(file!, "utf8"));
  const conUrl = rows.filter((r) => r.pdp_id && r.url_oficial);

  console.log(`\n${rows.length} filas · ${conUrl.length} con pdp_id y url_oficial.\n`);

  const actual = await sanity.fetch<{ id: string; sourceUrls: string[] | null }[]>(
    `*[_type == "car" && _id in $ids]{ "id": _id, sourceUrls }`,
    { ids: conUrl.map((r) => r.pdp_id) }
  );
  const porId = new Map(actual.map((a) => [a.id, a.sourceUrls?.[0] ?? null]));

  const cambios: { id: string; label: string; url: string }[] = [];
  const problemas: string[] = [];

  for (const r of conUrl) {
    const label = `${r.marca} ${r.modelo}`.trim() || r.pdp_id;

    if (!porId.has(r.pdp_id)) {
      problemas.push(`${label}: el pdp_id no existe en Sanity (${r.pdp_id})`);
      continue;
    }
    let url: URL;
    try {
      url = new URL(r.url_oficial);
    } catch {
      problemas.push(`${label}: "${r.url_oficial}" no es una URL válida`);
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      problemas.push(`${label}: protocolo no soportado (${url.protocol})`);
      continue;
    }
    // Misma red de seguridad que usan pdp-research y price-check: una fuente que
    // no confirma mercado chileno da precios de otro país.
    if (!isChileConfirmedUrl(r.url_oficial)) {
      problemas.push(`${label}: la URL no confirma mercado Chile — ${r.url_oficial}`);
      continue;
    }
    if (porId.get(r.pdp_id) === r.url_oficial) continue; // ya está igual

    cambios.push({ id: r.pdp_id, label, url: r.url_oficial });
  }

  if (problemas.length) {
    console.log(`\x1b[33m${problemas.length} fila(s) rechazada(s):\x1b[0m`);
    for (const p of problemas.slice(0, 25)) console.log(`  · ${p}`);
    if (problemas.length > 25) console.log(`  … y ${problemas.length - 25} más`);
    console.log("");
  }

  if (!cambios.length) {
    console.log("Nada nuevo que escribir.\n");
    return;
  }

  console.log(`\x1b[1m${cambios.length} auto(s) a actualizar:\x1b[0m`);
  for (const c of cambios.slice(0, 15)) console.log(`  ${c.label.padEnd(32)} → ${c.url}`);
  if (cambios.length > 15) console.log(`  … y ${cambios.length - 15} más`);

  if (!aplicar) {
    console.log(`\n(no se escribió nada — correr con --aplicar)\n`);
    return;
  }

  // `setIfMissing` + `insert` perdería el orden y podría duplicar. Se reemplaza
  // el primer elemento y se conservan los extras (ej. el PDF de ficha técnica).
  const tx = cambios.reduce((t, c) => {
    const previas = actual.find((a) => a.id === c.id)?.sourceUrls ?? [];
    const resto = previas.slice(1).filter((u) => u !== c.url);
    return t.patch(c.id, (p) => p.set({ sourceUrls: [c.url, ...resto] }));
  }, sanity.transaction());

  await tx.commit();
  console.log(`\n\x1b[32m✓ ${cambios.length} actualizados\x1b[0m\n`);
}

void main();
