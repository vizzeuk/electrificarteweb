/// <reference types="node" />
/**
 * Tests del flujo v2 de creacion de PDP (lib/pdp-creacion/*).
 * Puro y determinista — no toca red ni Sanity. Correr con:
 *   npx tsx scripts/qa/pdp-contrato.test.ts
 *
 * Lo que cubre es exactamente donde el flujo puede publicar algo falso: quien
 * es dueno del precio (R4), que el borrador nazca oculto (R6), y que la metrica
 * N/M no castigue a un HEV por no tener campos que no le corresponden.
 */
import assert from "node:assert/strict";
import { armarEncargo, hostDe, parseVersiones, toolsConHost, type FilaSheet } from "@/lib/pdp-creacion/encargo";
import { camposAplicables, importantes, medirLlenado, MIN_CAMPOS, vitales, type BasePdp, type ContratoPdp } from "@/lib/pdp-creacion/contrato";
import { armarDocumentoCar, armarVersiones, slugify } from "@/lib/pdp-creacion/sanity-doc";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.error(`  ✗ ${name}`); console.error(`      ${(e as Error).message}`); }
}

const FILA: FilaSheet = {
  marca: "GWM", modelo: "Ora 03", anio: 2026, tipo: "City Car", electrificacion: "EV",
  url_oficial: "https://www.gwm.cl/vehiculo/ora/ora-03/",
  versiones: "ORA 03 SR|17990000, ORA 03 GT|21990000",
};
const REFS = { brandId: "b1", vehicleTypeId: "t1", electricTypeId: "e1" };

// ─── versiones del Sheet ──────────────────────────────────────────────────────

test("parseVersiones: nombre|precio, tolera espacios y puntos", () => {
  assert.deepEqual(parseVersiones(" GLX|24.990.000 ,GLS AWD| $27490000 "), [
    { nombre: "GLX", precio: 24990000 },
    { nombre: "GLS AWD", precio: 27490000 },
  ]);
});

test("parseVersiones: un nombre con | adentro usa el ULTIMO separador", () => {
  assert.deepEqual(parseVersiones("Long Range | AWD|39990000"), [{ nombre: "Long Range | AWD", precio: 39990000 }]);
});

test("parseVersiones: sin precio o con precio 0 revienta, no pasa silencioso", () => {
  assert.throws(() => parseVersiones("GLX"), /formato/);
  assert.throws(() => parseVersiones("GLX|0"), /Precio invalido/);
});

test("hostDe: saca www y exige https", () => {
  assert.equal(hostDe("https://www.gwm.cl/x"), "gwm.cl");
  assert.throws(() => hostDe("http://gwm.cl"), /https/);
});

// ─── R2: una sola fuente ──────────────────────────────────────────────────────

test("toolsConHost: web_search apagado y web_fetch encerrado en el host", () => {
  const [toolset] = toolsConHost("gwm.cl") as { configs: { name: string; enabled?: boolean; allowed_domains?: string[] }[] }[];
  const search = toolset.configs.find((c) => c.name === "web_search");
  const fetchCfg = toolset.configs.find((c) => c.name === "web_fetch");
  assert.equal(search?.enabled, false, "web_search tiene que ir apagado (R2)");
  assert.deepEqual(fetchCfg?.allowed_domains, ["gwm.cl"]);
});

test("toolsConHost: sin el custom tool, el override dejaria a la sesion sin entrega", () => {
  assert.equal(toolsConHost("gwm.cl").length, 1);
  assert.equal(toolsConHost("gwm.cl", { type: "custom", name: "entregar_pdp" }).length, 2);
});

test("armarEncargo: declara la version mas barata como base y nombra las otras", () => {
  const e = armarEncargo(FILA);
  assert.match(e, /Usa "ORA 03 SR" como version base/);
  assert.match(e, /SOLO con los campos que difieren/);
  assert.match(e, /gwm\.cl\/vehiculo\/ora\/ora-03/);
});

test("armarEncargo: una sola version → versiones vacio, sin pedir deltas", () => {
  const e = armarEncargo({ ...FILA, versiones: "Unica|19990000" });
  assert.match(e, /`versiones` va vacio/);
});

// ─── metrica N/M ──────────────────────────────────────────────────────────────

test("camposAplicables: 29 BEV · 31 PHEV/EREV · 25 HEV/MHEV (numeros del board)", () => {
  assert.equal(camposAplicables("EV").length, 29);
  assert.equal(camposAplicables("PHEV").length, 31);
  assert.equal(camposAplicables("EREV").length, 31);
  assert.equal(camposAplicables("HEV").length, 25);
  assert.equal(camposAplicables("MHEV").length, 25);
});

test("camposAplicables: un HEV no carga con conector ni carga DC", () => {
  const hev = camposAplicables("HEV");
  assert.ok(!hev.includes("connectorType"));
  assert.ok(!hev.includes("maxDCChargingPower"));
  assert.ok(hev.includes("fuelConsumption"));
});

test("vitales: en HEV/MHEV la vital de autonomia es el consumo, no el rango WLTP", () => {
  assert.ok(vitales("EV").includes("range"));
  assert.ok(vitales("HEV").includes("fuelConsumption"));
  assert.ok(!vitales("HEV").includes("range"));
});

function baseCompleta(electrificacion: string): BasePdp {
  const b: Record<string, unknown> = {};
  for (const k of camposAplicables(electrificacion)) {
    b[k] = ["safetyFeatures", "techFeatures", "comfortFeatures", "keywords"].includes(k)
      ? ["x"]
      : ["motorDescription", "transmission", "traction", "warranty", "batteryType", "connectorType", "chargeTimeDC", "chargeTimeAC", "tagline", "description", "metaTitle", "metaDescription"].includes(k)
        ? "x"
        : 1;
  }
  return b as BasePdp;
}

test("medirLlenado: un HEV perfecto llega a 25/25 y queda completo", () => {
  const l = medirLlenado(baseCompleta("HEV"), "HEV", "https://x.cl/foto.jpg");
  assert.equal(`${l.n}/${l.m}`, "25/25");
  assert.equal(l.completo, true);
});

test("importantes: los enchufables suman conector y carga DC; los hibridos no", () => {
  assert.equal(importantes("EV").length, 8);
  assert.equal(importantes("HEV").length, 6);
  assert.ok(importantes("EV").includes("connectorType"));
  assert.ok(!importantes("HEV").includes("connectorType"));
});

test("umbral: euroNcap y seatRows NO bloquean — las marcas chilenas no los publican", () => {
  const base = { ...baseCompleta("EV") } as Record<string, unknown>;
  delete base.euroNcap;
  delete base.seatRows;
  delete base.topSpeed;
  delete base.batteryType;
  const l = medirLlenado(base as BasePdp, "EV", "https://x.cl/f.jpg");
  assert.ok(l.porcentaje < 90, "cae por debajo del viejo 85% del board");
  assert.equal(l.completo, true, "pero sigue siendo una ficha publicable");
});

test("umbral: falta un importante (seats) → incompleto, y se nombra", () => {
  const base = { ...baseCompleta("EV") } as Record<string, unknown>;
  delete base.seats;
  const l = medirLlenado(base as BasePdp, "EV", "https://x.cl/f.jpg");
  assert.deepEqual(l.importantesFaltantes, ["seats"]);
  assert.equal(l.completo, false);
});

test(`umbral: piso de ${MIN_CAMPOS} campos — vitales llenas no alcanzan si el resto esta vacio`, () => {
  const base: Record<string, unknown> = { tagline: "x", description: "x", metaTitle: "x", metaDescription: "x" };
  for (const k of [...vitales("EV"), ...importantes("EV")]) base[k] = typeof k === "string" && ["motorDescription","transmission","warranty","traction","connectorType"].includes(k) ? "x" : 1;
  base.safetyFeatures = ["x"];
  const l = medirLlenado(base as BasePdp, "EV", "https://x.cl/f.jpg");
  assert.equal(l.vitalesFaltantes.length, 0);
  assert.equal(l.importantesFaltantes.length, 0);
  assert.ok(l.n < MIN_CAMPOS, `n=${l.n} tiene que quedar bajo el piso`);
  assert.equal(l.completo, false, "las vitales solas no hacen una ficha");
});

test("medirLlenado: sin portada no esta completo aunque tenga todos los campos", () => {
  const l = medirLlenado(baseCompleta("EV"), "EV", undefined);
  assert.equal(l.porcentaje, 100);
  assert.equal(l.completo, false, "el board pide portada para decir 'listo para publicar'");
});

test("medirLlenado: falta una vital → incompleto por mas alto que sea el porcentaje", () => {
  const base = { ...baseCompleta("EV") };
  delete (base as Record<string, unknown>).traction;
  const l = medirLlenado(base, "EV", "https://x.cl/f.jpg");
  assert.ok(l.porcentaje >= 85);
  assert.deepEqual(l.vitalesFaltantes, ["traction"]);
  assert.equal(l.completo, false);
});

test("medirLlenado: contrato vacio no revienta", () => {
  const l = medirLlenado(undefined, "EV");
  assert.equal(l.n, 0);
  assert.equal(l.completo, false);
});

test("medirLlenado: electrificacion desconocida revienta en vez de inventar un denominador", () => {
  assert.throws(() => medirLlenado({}, "DIESEL"), /desconocida/);
});

// ─── R4: el humano es dueno de los precios ────────────────────────────────────

test("armarDocumentoCar: basePrice sale del MINIMO declarado, no de lo que leyo el modelo", () => {
  const c: ContratoPdp = {
    estado: "listo", fuente_leida: FILA.url_oficial,
    precio_lista_leido: 26490000, evidencia_precio: "Precio Lista $26.490.000",
    base: { power: 169 },
  };
  const doc = armarDocumentoCar(FILA, c, REFS);
  assert.equal(doc.basePrice, 17990000);
});

test("armarDocumentoCar: el precio leido queda como hallazgo con su cita, sin aplicarse", () => {
  const c: ContratoPdp = {
    estado: "listo", fuente_leida: FILA.url_oficial,
    precio_lista_leido: 26490000, evidencia_precio: "Precio Lista $26.490.000",
  };
  const doc = armarDocumentoCar(FILA, c, REFS);
  const h = (doc.catalogFindings as Record<string, unknown>[])[0];
  assert.equal(h.kind, "precio_base");
  assert.equal(h.proposedPrice, 26490000);
  assert.match(String(h.evidence), /26\.490\.000/);
});

test("armarDocumentoCar: precio leido sin cita no genera hallazgo (R3)", () => {
  const doc = armarDocumentoCar(FILA, { estado: "listo", fuente_leida: "x", precio_lista_leido: 26490000 }, REFS);
  assert.equal(doc.catalogFindings, undefined);
});

test("armarDocumentoCar: las discrepancias de la fuente quedan registradas", () => {
  const doc = armarDocumentoCar(FILA, {
    estado: "listo", fuente_leida: "x",
    discrepancias: ["La fuente lo llama hatchback, la fila dice City Car"],
  }, REFS);
  const kinds = (doc.catalogFindings as { kind: string }[]).map((h) => h.kind);
  assert.deepEqual(kinds, ["discrepancia_fuente"]);
});

// ─── R6 y forma del documento ─────────────────────────────────────────────────

test("armarDocumentoCar: nace oculto, marcado como IA y con la fuente guardada", () => {
  const doc = armarDocumentoCar(FILA, { estado: "listo", fuente_leida: "x" }, REFS);
  assert.equal(doc.hidden, true);
  assert.equal(doc.aiGenerated, true);
  assert.deepEqual(doc.sourceUrls, [FILA.url_oficial]);
  assert.equal(doc.modelYear, 2026);
});

test("armarDocumentoCar: sin versiones declaradas no se crea nada", () => {
  assert.throws(() => armarDocumentoCar({ ...FILA, versiones: "" }, { estado: "listo", fuente_leida: "x" }, REFS), /version/);
});

test("slugify: marca + modelo, sin tildes", () => {
  assert.equal(slugify("Citroën ë-C4"), "citroen-e-c4");
  assert.equal(slugify("GWM Ora 03"), "gwm-ora-03");
});

// ─── deltas de version ────────────────────────────────────────────────────────

test("armarVersiones: la base hereda las specs del modelo, las otras solo su delta", () => {
  const vs = armarVersiones(
    parseVersiones(FILA.versiones),
    [{ nombre: "ORA 03 GT", batteryCapacity: 59.1, range: 400 }],
    { batteryCapacity: 47.8, range: 310, power: 169 },
  );
  const sr = vs.find((v) => v.name === "ORA 03 SR")!;
  const gt = vs.find((v) => v.name === "ORA 03 GT")!;
  assert.equal(sr.batteryCapacity, 47.8);
  assert.equal(sr.power, 169, "la base hereda lo que no difiere");
  assert.equal(gt.batteryCapacity, 59.1);
  assert.equal(gt.range, 400);
  assert.equal(gt.power, undefined, "un delta no repite lo que ya esta en la base");
});

test("armarVersiones: el precio siempre es el del humano, aunque el delta traiga otro campo", () => {
  const vs = armarVersiones(parseVersiones(FILA.versiones), [{ nombre: "ORA 03 GT", power: 200 }], {});
  assert.deepEqual(vs.map((v) => v.price), [17990000, 21990000]);
});

test("armarVersiones: un delta con nombre que no calza no borra ni inventa versiones", () => {
  const vs = armarVersiones(parseVersiones(FILA.versiones), [{ nombre: "Ora 03 Pro Max", power: 999 }], {});
  assert.deepEqual(vs.map((v) => v.name), ["ORA 03 SR", "ORA 03 GT"]);
  assert.ok(!vs.some((v) => v.power === 999));
});

test("armarVersiones: los _key son unicos (Sanity los exige en arrays)", () => {
  const vs = armarVersiones(parseVersiones("A|1000, B|2000, C|3000"), [], {});
  assert.equal(new Set(vs.map((v) => v._key)).size, 3);
});

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
process.exit(failed === 0 ? 0 : 1);
