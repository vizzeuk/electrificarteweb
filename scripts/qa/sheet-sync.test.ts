/// <reference types="node" />
/**
 * Tests de lib/sheet-sync.ts contra un Sheet simulado en memoria (se reemplaza
 * `fetch`: no toca red ni n8n). Correr con:
 *   npx tsx scripts/qa/sheet-sync.test.ts
 *
 * El Sheet lo edita gente. Lo que se prueba acá es justamente lo que no puede
 * fallar: que una sincronización nunca borre una fila agregada a mano, nunca
 * vacíe una columna de personas, y deje registro de lo que reemplazó.
 */

import assert from "node:assert/strict";
import { asegurarEncabezado, reemplazarHoja, sincronizar } from "@/lib/sheet-sync";

process.env.N8N_SHEET_SYNC_URL = "https://n8n.test/webhook/sheet-sync";
process.env.N8N_SHEET_SYNC_SECRET = "secreto";

type Celda = string | number | boolean;
const hojas = new Map<string, Celda[][]>();
let llamadas = 0;

function a1(ref: string): { hoja: string; fila?: number; col?: number } {
  const m = ref.match(/^'((?:[^']|'')+)'(?:!([A-Z]+)(\d+))?$/);
  if (!m) throw new Error(`rango raro: ${ref}`);
  const hoja = m[1].replace(/''/g, "'");
  if (!m[2]) return { hoja };
  const col = [...m[2]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { hoja, fila: Number(m[3]) - 1, col };
}

function escribir(hoja: string, fila: number, col: number, values: Celda[][]) {
  const h = hojas.get(hoja)!;
  values.forEach((f, i) => {
    h[fila + i] ??= [];
    f.forEach((v, j) => { h[fila + i][col + j] = v; });
  });
}

globalThis.fetch = (async (_url: string, init: { body: string; headers: Record<string, string> }) => {
  llamadas++;
  assert.equal(init.headers["x-sheet-sync-secret"], "secreto");
  const { metodo, ruta, cuerpo } = JSON.parse(init.body) as { metodo: string; ruta: string; cuerpo: any };
  const resto = ruta.replace(/^\/[^/:?]+/, "");
  const ok = (j: unknown) => new Response(JSON.stringify(j), { status: 200 });

  if (metodo === "GET" && resto.startsWith("?fields=")) {
    return ok({ sheets: [...hojas.keys()].map((title) => ({ properties: { title } })) });
  }
  if (resto === ":batchUpdate") {
    for (const r of cuerpo.requests) hojas.set(r.addSheet.properties.title, []);
    return ok({});
  }
  if (resto === "/values:batchUpdate") {
    for (const d of cuerpo.data) {
      const r = a1(d.range);
      escribir(r.hoja, r.fila!, r.col!, d.values);
    }
    return ok({});
  }
  const m = resto.match(/^\/values\/([^?:]+)(:append|:clear)?/);
  if (!m) throw new Error(`ruta no simulada: ${metodo} ${resto}`);
  const r = a1(decodeURIComponent(m[1]));
  if (metodo === "GET") return ok({ values: hojas.get(r.hoja) });
  if (m[2] === ":clear") { hojas.set(r.hoja, []); return ok({}); }
  if (m[2] === ":append") {
    const h = hojas.get(r.hoja)!;
    escribir(r.hoja, h.length, 0, cuerpo.values);
    return ok({});
  }
  escribir(r.hoja, r.fila!, r.col!, cuerpo.values);
  return ok({});
}) as unknown as typeof fetch;

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
  hojas.clear();
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${(e as Error).message.split("\n").join("\n      ")}`);
  }
}

const COLS = ["estado", "pdp_id", "modelo", "url_oficial", "versiones"];
const opts = (filas: Record<string, unknown>[]) => ({
  columnas: COLS,
  filas,
  clave: (f: Record<string, string>) => f.pdp_id,
  noVaciar: ["estado", "url_oficial"],
});

async function main(): Promise<void> {
console.log("\nsincronizar:");

await test("hoja vacía → escribe encabezado y todas las filas", async () => {
  const r = await sincronizar("AUTOS", opts([{ pdp_id: "a", modelo: "EX30", versiones: "Core|32900000" }]));
  assert.equal(r.agregadas, 1);
  assert.deepEqual(hojas.get("AUTOS")![0], COLS);
  assert.equal(hojas.get("AUTOS")![1][2], "EX30");
});

await test("solo escribe las celdas que cambiaron", async () => {
  hojas.set("AUTOS", [COLS, ["", "a", "EX30", "https://x.cl", "Core|1"], ["", "b", "Ora 03", "https://y.cl", "SR|2"]]);
  const r = await sincronizar("AUTOS", opts([
    { pdp_id: "a", modelo: "EX30", url_oficial: "https://x.cl", versiones: "Core|1" },
    { pdp_id: "b", modelo: "Ora 03", url_oficial: "https://y.cl", versiones: "SR|3" },
  ]));
  assert.equal(r.celdas, 1);
  assert.equal(hojas.get("AUTOS")![2][4], "SR|3");
});

await test("una fila agregada a mano (sin pdp_id) no se toca", async () => {
  const aMano = ["listo", "", "Auto nuevo", "https://z.cl", "X|1"];
  hojas.set("AUTOS", [COLS, ["", "a", "EX30", "", ""], [...aMano]]);
  const r = await sincronizar("AUTOS", opts([{ pdp_id: "a", modelo: "EX30" }]));
  assert.equal(r.sinClave, 1);
  assert.deepEqual(hojas.get("AUTOS")![2], aMano);
});

await test("una columna de personas no se vacía aunque nosotros no traigamos valor", async () => {
  hojas.set("AUTOS", [COLS, ["listo", "a", "EX30", "https://propuesta.cl", ""]]);
  await sincronizar("AUTOS", opts([{ pdp_id: "a", modelo: "EX30", estado: "", url_oficial: "" }]));
  assert.equal(hojas.get("AUTOS")![1][0], "listo");
  assert.equal(hojas.get("AUTOS")![1][3], "https://propuesta.cl");
});

await test("si traemos otro valor gana el nuestro, pero lo anterior queda en pisadas", async () => {
  hojas.set("AUTOS", [COLS, ["", "a", "EX30", "https://vieja.cl", ""]]);
  const r = await sincronizar("AUTOS", opts([{ pdp_id: "a", modelo: "EX30", url_oficial: "https://nueva.cl" }]));
  assert.equal(hojas.get("AUTOS")![1][3], "https://nueva.cl");
  assert.deepEqual(r.pisadas, [{ clave: "a", columna: "url_oficial", antes: "https://vieja.cl", ahora: "https://nueva.cl" }]);
});

await test("una columna automática sí se vacía (url_sugerida cuando ya hay fuente)", async () => {
  hojas.set("AUTOS", [COLS, ["", "a", "EX30", "", "Core|1"]]);
  await sincronizar("AUTOS", opts([{ pdp_id: "a", modelo: "EX30", versiones: "" }]));
  assert.equal(hojas.get("AUTOS")![1][4], "");
});

await test("las columnas se ubican por nombre: respeta el orden que dejó alguien en el Sheet", async () => {
  const reordenado = ["modelo", "pdp_id", "versiones", "estado", "url_oficial", "comentario de Francisco"];
  hojas.set("AUTOS", [reordenado, ["EX30", "a", "Core|1", "", "", "ojo con el precio"]]);
  await sincronizar("AUTOS", opts([{ pdp_id: "a", modelo: "EX30", versiones: "Core|2" }, { pdp_id: "b", modelo: "Ora 03" }]));
  const h = hojas.get("AUTOS")!;
  assert.deepEqual(h[0], reordenado);
  assert.equal(h[1][2], "Core|2");
  assert.equal(h[1][5], "ojo con el precio");
  assert.equal(h[2][0], "Ora 03"); // la nueva entra en el orden del Sheet
  assert.equal(h[2][1], "b");
});

await test("una columna nueva del script se agrega al final del encabezado", async () => {
  hojas.set("AUTOS", [["pdp_id", "modelo"], ["a", "EX30"]]);
  await sincronizar("AUTOS", opts([{ pdp_id: "a", modelo: "EX30", versiones: "Core|1" }]));
  const h = hojas.get("AUTOS")!;
  assert.deepEqual(h[0], ["pdp_id", "modelo", "estado", "url_oficial", "versiones"]);
  assert.equal(h[1][4], "Core|1");
});

await test("lo que ya no viene no se borra; con `ausentes` se marca", async () => {
  const C = ["tipo", "auto", "resuelto", "vigente"];
  hojas.set("REVISAR", [C, ["precio", "EX30", "sí, lo arreglé", "si"], ["precio", "Ora", "", "si"]]);
  const r = await sincronizar("REVISAR", {
    columnas: C,
    filas: [{ tipo: "precio", auto: "Ora", resuelto: "", vigente: "si" }],
    clave: (f) => `${f.tipo}|${f.auto}`,
    noVaciar: ["resuelto"],
    ausentes: { columna: "vigente", valor: "no" },
  });
  const h = hojas.get("REVISAR")!;
  assert.equal(r.soloEnSheet, 1);
  assert.equal(h.length, 3);
  assert.deepEqual(h[1], ["precio", "EX30", "sí, lo arreglé", "no"]);
});

await test("los números viajan como números (no como texto en el Sheet)", async () => {
  await sincronizar("AUTOS", opts([{ pdp_id: "a", modelo: "EX30", versiones: 32900000 }]));
  assert.equal(hojas.get("AUTOS")![1][4], 32900000);
});

await test("una segunda corrida sin cambios no escribe nada", async () => {
  const filas = [{ pdp_id: "a", modelo: "EX30", versiones: 32900000, url_oficial: "https://x.cl" }];
  await sincronizar("AUTOS", opts(filas));
  llamadas = 0;
  const r = await sincronizar("AUTOS", opts(filas));
  assert.equal(r.celdas + r.agregadas, 0);
  assert.equal(llamadas, 2); // listar hojas + leer; ninguna escritura
});

console.log("\nreemplazarHoja / asegurarEncabezado:");

await test("reemplazarHoja aborta si la hoja tiene columnas agregadas a mano", async () => {
  hojas.set("INSTRUCCIONES", [["Columna", "Qué va", "mis notas"]]);
  await assert.rejects(() => reemplazarHoja("INSTRUCCIONES", [["Columna", "Qué va"]]), /mis notas/);
  assert.deepEqual(hojas.get("INSTRUCCIONES")![0], ["Columna", "Qué va", "mis notas"]);
});

await test("asegurarEncabezado no toca una hoja que ya tiene datos (la llena n8n)", async () => {
  hojas.set("CORRIDAS", [["fecha"], ["2026-09-24"]]);
  assert.equal(await asegurarEncabezado("CORRIDAS", ["fecha", "runId"]), false);
  assert.equal(hojas.get("CORRIDAS")!.length, 2);
});

await test("asegurarEncabezado crea la hoja si no existe", async () => {
  assert.equal(await asegurarEncabezado("FALTAN FUENTES", ["fecha", "marca"]), true);
  assert.deepEqual(hojas.get("FALTAN FUENTES"), [["fecha", "marca"]]);
});

console.log(`\n${passed} ok · ${failed} fallaron\n`);
if (failed) process.exit(1);
}

void main();
