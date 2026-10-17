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
import { armarEncargo, hostDe, parseVersiones, sinTiposDelModelo, toolsConHost, versionBase, type FilaSheet } from "@/lib/pdp-creacion/encargo";
import { camposAplicables, importantes, medirLlenado, MIN_CAMPOS, vitales, type BasePdp, type ContratoPdp } from "@/lib/pdp-creacion/contrato";
import { armarDocumentoCar, armarVersiones, slugify } from "@/lib/pdp-creacion/sanity-doc";
import { formatoImagen } from "@/lib/pdp-creacion/imagenes";
import { filaDeSolicitud, filaDesdeEntrada, MINUTOS_TRABADA, razonTrabada, sePuedeReintentar } from "@/lib/pdp-creacion/solicitudes";
import { cuerpoSesion, falloDeSesion } from "@/lib/pdp-creacion/sesion";
import { esFileId, FICHA_MAX_BYTES, FICHA_RUTA, nombreFicha, validarPdf } from "@/lib/pdp-creacion/ficha";

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
  assert.equal(doc.isNew, true, "toda PDP del flujo nace como Nuevo lanzamiento");
  assert.equal(doc.aiGenerated, true);
  assert.deepEqual(doc.sourceUrls, [FILA.url_oficial]);
  assert.equal(doc.modelYear, 2026);
});

// ─── Año, URL y versiones opcionales (oct-2026) ───────────────────────────────

const SIN_NADA: FilaSheet = { marca: "GWM", modelo: "Ora 5", tipo: "SUV", electrificacion: "EV", url_oficial: null, anio: null, versiones: [] };

test("armarDocumentoCar: sin versiones, el precio es el leido de la fuente CON cita, y queda para confirmar", () => {
  const doc = armarDocumentoCar({ ...FILA, versiones: [] }, {
    estado: "listo", fuente_leida: FILA.url_oficial!,
    precio_lista_leido: 26490000, evidencia_precio: "Precio lista $26.490.000",
  }, REFS);
  assert.equal(doc.basePrice, 26490000);
  assert.deepEqual(doc.versions, []);
  const h = (doc.catalogFindings as Record<string, unknown>[])[0];
  assert.equal(h.kind, "precio_base");
  assert.match(String(h.detail), /Confirmalo/);
});

test("armarDocumentoCar: sin versiones y sin cita no hay precio (R3), pero el borrador igual se arma", () => {
  const doc = armarDocumentoCar({ ...FILA, versiones: [] }, { estado: "listo", fuente_leida: "x", precio_lista_leido: 26490000 }, REFS);
  assert.equal(doc.basePrice, undefined);
  assert.equal(doc.hidden, true);
});

test("armarDocumentoCar: sin año no se escribe modelYear (no se inventa)", () => {
  const doc = armarDocumentoCar({ ...FILA, anio: null }, { estado: "listo", fuente_leida: "x" }, REFS);
  assert.equal(doc.modelYear, undefined);
});

test("armarDocumentoCar: con el sitio de la marca como fuente, guarda la ficha que leyo el agente (no la home)", () => {
  const fila = { ...SIN_NADA, url_oficial: "https://www.gwm.cl/", sitio_marca: true };
  const doc = armarDocumentoCar(fila, { estado: "listo", fuente_leida: "https://www.gwm.cl/vehiculo/ora/ora-5/, https://www.gwm.cl/ficha-ora5.pdf" }, REFS);
  assert.deepEqual(doc.sourceUrls, ["https://www.gwm.cl/vehiculo/ora/ora-5/"]);
  const otra = armarDocumentoCar(fila, { estado: "listo", fuente_leida: "https://otro-sitio.cl/ora-5" }, REFS);
  assert.deepEqual(otra.sourceUrls, ["https://www.gwm.cl/"], "una ficha de otro dominio no se guarda");
});

test("armarEncargo: sin URL de ficha manda a buscar dentro del dominio de la marca, sin otro dominio", () => {
  const e = armarEncargo({ ...SIN_NADA, url_oficial: "https://www.gwm.cl/", sitio_marca: true });
  assert.match(e, /sitio oficial de la marca/);
  assert.match(e, /SOLO dentro del dominio gwm\.cl/);
  assert.match(e, /no declarado/, "el año se dice no declarado, no se inventa");
  assert.match(e, /precio de lista MAS BAJO/);
  assert.doesNotMatch(e, /null|undefined/);
});

test("filaDesdeEntrada: año, URL y versiones vacios quedan como null / null / []", () => {
  const f = filaDesdeEntrada({ marca: "GWM", modelo: "Ora 5", tipo: "SUV", electrificacion: "ev", anio: "", url_oficial: "  ", versiones: [] });
  assert.equal(f.anio, null);
  assert.equal(f.url_oficial, null);
  assert.deepEqual(f.versiones, []);
  assert.equal(f.electrificacion, "EV");
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

// ─── panel → solicitud (docs/DASHBOARD_PDP_CREACION.md) ───────────────────────

test("parseVersiones: acepta el arreglo del panel, y un nombre con coma no se parte", () => {
  assert.deepEqual(parseVersiones([{ nombre: "Long Range, AWD", precio: 39990000 }]), [
    { nombre: "Long Range, AWD", precio: 39990000 },
  ]);
  assert.throws(() => parseVersiones([{ nombre: "", precio: 1 }]), /sin nombre/);
  assert.throws(() => parseVersiones([{ nombre: "GLX", precio: 0 }]), /Precio invalido/);
});

test("filaDesdeEntrada: normaliza tipos del formulario (anio string, precio con puntos, tag en minuscula)", () => {
  const f = filaDesdeEntrada({
    marca: " GWM ", modelo: "Ora 03", anio: "2026", tipo: "City Car", electrificacion: "ev",
    url_oficial: "https://www.gwm.cl/vehiculo/ora/ora-03/ ",
    versiones: [{ nombre: "ORA 03 SR", precio: "17.990.000" }],
  });
  assert.equal(f.marca, "GWM");
  assert.equal(f.anio, 2026);
  assert.equal(f.electrificacion, "EV");
  assert.equal(f.url_oficial, "https://www.gwm.cl/vehiculo/ora/ora-03/");
  assert.deepEqual(f.versiones, [{ nombre: "ORA 03 SR", precio: 17990000 }]);
});

test("filaDeSolicitud: la fila de Supabase arma el MISMO documento que la fila del Sheet", () => {
  const desdePanel = filaDeSolicitud({ ...FILA, versiones: parseVersiones(FILA.versiones) });
  const contrato = { estado: "completo", base: {} } as unknown as ContratoPdp;
  const a = armarDocumentoCar(FILA, contrato, REFS);
  const b = armarDocumentoCar(desdePanel, contrato, REFS);
  assert.deepEqual(b.versions, a.versions);
  assert.equal(b.basePrice, a.basePrice);
  assert.equal(armarEncargo(desdePanel), armarEncargo(FILA));
});

test("sePuedeReintentar: fallidas si, terminadas bien no, activas solo si estan trabadas", () => {
  const ahora = Date.now();
  const hace = (min: number) => new Date(ahora - min * 60_000).toISOString();
  assert.equal(sePuedeReintentar({ estado: "error", updated_at: hace(0) }, ahora), true);
  assert.equal(sePuedeReintentar({ estado: "sin_datos", updated_at: hace(0) }, ahora), true);
  assert.equal(sePuedeReintentar({ estado: "listo_para_revisar", updated_at: hace(999) }, ahora), false);
  assert.equal(sePuedeReintentar({ estado: "borrador_incompleto", updated_at: hace(999) }, ahora), false);
  assert.equal(sePuedeReintentar({ estado: "procesando", updated_at: hace(5) }, ahora), false);
  assert.equal(sePuedeReintentar({ estado: "en cola", updated_at: hace(MINUTOS_TRABADA + 1) }, ahora), true);
});

// ─── Fallas: error con razon, no "sin datos" (oct-2026) ───────────────────────

test("falloDeSesion: una sesion caida es error, no sin datos", () => {
  const sin = { contrato: null, errores: [] as string[], stopReason: "end_turn" };
  // El agente termino sin entregar y sin errores: eso sigue siendo "sin datos".
  assert.equal(falloDeSesion("idle", sin), null);
  assert.match(falloDeSesion("idle", { ...sin, stopReason: "retries_exhausted", errores: ["overloaded"] })!, /reintentos.*overloaded/);
  assert.match(falloDeSesion("idle", { ...sin, stopReason: "budget_reached" })!, /tope de gasto/);
  assert.match(falloDeSesion("idle", { ...sin, errores: ["web_fetch: url_not_allowed"] })!, /url_not_allowed/);
  assert.match(falloDeSesion("terminated", sin)!, /sin entregar/);
  // Si el agente entrego, los errores intermedios no importan.
  const contrato = { estado: "completo" } as unknown as ContratoPdp;
  assert.equal(falloDeSesion("terminated", { contrato, errores: ["algo"], stopReason: "retries_exhausted" }), null);
});

test("razonTrabada: dice que paso segun lo que quedo de la sesion", () => {
  assert.match(razonTrabada({ estado: "listo", session_id: null }, null), /no la tomo.*VPS/);
  assert.match(razonTrabada({ estado: "en cola", session_id: null }, null), /n8n la tomo/);
  assert.match(razonTrabada({ estado: "procesando", session_id: null }, null), /no hay sesion/);
  const s = { estado: "procesando" as const, session_id: "sesn_1" };
  assert.match(razonTrabada(s, { status: "idle", fallo: "La sesion termino con error: x", entrego: false }), /error: x.*n8n no alcanzo/);
  assert.match(razonTrabada(s, { status: "running", fallo: null, entrego: false }), /seguia corriendo/);
  assert.match(razonTrabada(s, { status: "idle", fallo: null, entrego: true }), /no alcanzo a crear el borrador/);
  assert.match(razonTrabada(s, { status: null, fallo: null, entrego: false, errorConsulta: "503" }), /no se pudo revisar.*503/);
});

// ─── Ficha tecnica adjunta (oct-2026) ─────────────────────────────────────────

test("validarPdf: decide por los bytes y el tamano", () => {
  const pdf = (n: number) => { const b = new Uint8Array(n); b.set([0x25, 0x50, 0x44, 0x46, 0x2d]); return b; };
  assert.equal(validarPdf(pdf(2048)), null);
  assert.match(validarPdf(new TextEncoder().encode("<!DOCTYPE html>"))!, /PDF/);
  assert.match(validarPdf(new Uint8Array(0))!, /vacio/);
  assert.match(validarPdf(pdf(FICHA_MAX_BYTES + 1))!, /maximo es 4 MB/);
  assert.equal(esFileId("file_011CNha8iCJcU1wXNR6q4V8w"), true);
  assert.equal(esFileId("../../etc"), false);
  assert.equal(nombreFicha("C:\\fakepath\\ficha avatr.pdf"), "ficha avatr.pdf");
});

test("armarEncargo: sin ficha no la menciona; con ficha, solo specs y el precio como ultimo recurso", () => {
  assert.doesNotMatch(armarEncargo(FILA), /ficha-tecnica\.pdf/);
  const con = armarEncargo({ ...FILA, ficha: true });
  assert.ok(con.includes(FICHA_RUTA));
  assert.match(con, /mercado CHILENO/);
  assert.match(con, /SOLO para specs tecnicas/);
  assert.match(con, /La fuente web manda/);
  assert.match(con, /campos_de_ficha/);
  // Con versiones declaradas el precio es del humano: la ficha no lo toca.
  assert.match(con, /El precio no sale de la ficha/);
  assert.doesNotMatch(con, /precio_desde_ficha/);
  const sinVersiones = armarEncargo({ ...FILA, versiones: [], ficha: true });
  assert.match(sinVersiones, /ULTIMO recurso: solo si la fuente web no publica ningun precio/);
  assert.match(sinVersiones, /precio_desde_ficha: true/);
});

test("cuerpoSesion: monta la ficha como recurso y avisa en el encargo; sin ficha, sin resources", () => {
  const op = { agentId: "agent_1", environmentId: "env_1" };
  const sin = cuerpoSesion(FILA, "gwm.cl", op) as Record<string, unknown>;
  assert.equal("resources" in sin, false);
  const con = cuerpoSesion(FILA, "gwm.cl", { ...op, fichaFileId: "file_abc123456" }) as {
    resources: unknown[]; initial_events: { content: { text: string }[] }[];
  };
  assert.deepEqual(con.resources, [{ type: "file", file_id: "file_abc123456", mount_path: "/ficha-tecnica.pdf" }]);
  assert.ok(con.initial_events[0].content[0].text.includes(FICHA_RUTA));
});

// ─── Versiones de otra electrificacion o carroceria (oct-2026) ────────────────

const FILA_DS3: FilaSheet = {
  marca: "DS", modelo: "3", anio: 2026, tipo: "Hatchback", electrificacion: "HEV",
  url_oficial: "https://www.dsautomobiles.cl/ds-3.html",
  versiones: [
    { nombre: "E-Tense Opera", precio: 41490000, electrificacion: "ev", tipo: "SUV" },
    { nombre: "Etoile Hybrid", precio: 35990000 },
    { nombre: "Etoile Hybrid Plus", precio: 37990000, tipo: "hatchback", electrificacion: "HEV" },
  ],
};

test("parseVersiones: guarda tipo/electrificacion de la version (tag en mayuscula) y omite los vacios", () => {
  assert.deepEqual(parseVersiones([{ nombre: "A", precio: 1000000, tipo: " SUV ", electrificacion: "ev" }, { nombre: "B", precio: 2000000, tipo: "", electrificacion: "" }]), [
    { nombre: "A", precio: 1000000, tipo: "SUV", electrificacion: "EV" },
    { nombre: "B", precio: 2000000 },
  ]);
});

test("sinTiposDelModelo: un tipo igual al del modelo no cuenta como distinto", () => {
  const v = sinTiposDelModelo(parseVersiones(FILA_DS3.versiones), FILA_DS3);
  assert.deepEqual(v[2], { nombre: "Etoile Hybrid Plus", precio: 37990000 });
  assert.equal(v[0].electrificacion, "EV");
  assert.equal(v[0].tipo, "SUV");
});

test("versionBase: la mas barata de la electrificacion del modelo, aunque otra sea mas barata", () => {
  const v = sinTiposDelModelo(parseVersiones([
    { nombre: "EV barata", precio: 20000000, electrificacion: "EV" },
    { nombre: "HEV", precio: 30000000 },
  ]), { tipo: "SUV", electrificacion: "HEV" });
  assert.equal(versionBase(v)?.nombre, "HEV");
  // Si ninguna es del tipo del modelo, la mas barata de todas.
  assert.equal(versionBase([{ nombre: "X", precio: 5, electrificacion: "EV" }, { nombre: "Y", precio: 3, electrificacion: "EV" }])?.nombre, "Y");
});

test("armarEncargo: marca las versiones de otra tecnologia y pide sus specs completas", () => {
  const e = armarEncargo(FILA_DS3);
  assert.match(e, /E-Tense Opera — \$41\.490\.000 CLP \(electrificacion EV, carroceria SUV, distinta a la del modelo\)/);
  assert.match(e, /Usa "Etoile Hybrid" como version base/);
  assert.match(e, /TODAS sus specs propias/);
  assert.doesNotMatch(e, /Etoile Hybrid Plus — [^\n]*distinta/);
});

test("armarDocumentoCar: refs propias en la version, basePrice del tipo del modelo, sin heredar la base", () => {
  const refs = { ...REFS, versiones: [{ electricTypeId: "e-ev", vehicleTypeId: "t-suv" }, {}, {}] };
  const contrato: ContratoPdp = {
    estado: "listo", fuente_leida: FILA_DS3.url_oficial!,
    base: { fuelConsumption: 20.4, power: 145, batteryCapacity: 1.1 },
    versiones: [{ nombre: "E-Tense Opera", batteryCapacity: 54, range: 404, power: 156 }],
  };
  const doc = armarDocumentoCar(FILA_DS3, contrato, refs) as { basePrice: number; versions: Record<string, unknown>[]; catalogFindings?: { detail: string }[] };
  assert.equal(doc.basePrice, 35990000);
  const ev = doc.versions[0];
  assert.deepEqual(ev.electricType, { _type: "reference", _ref: "e-ev" });
  assert.deepEqual(ev.vehicleType, { _type: "reference", _ref: "t-suv" });
  assert.equal(ev.fuelConsumption, undefined, "la version EV no hereda el consumo del hibrido");
  assert.equal(ev.range, 404);
  assert.equal(doc.versions[1].fuelConsumption, 20.4, "la base hereda las specs del modelo");
  assert.equal(doc.versions[1].electricType, undefined);
  // A la EV le falta 0-100 y traccion (vitales): queda un hallazgo para completarla.
  assert.ok(doc.catalogFindings?.some((f) => /E-Tense Opera.*acceleration/.test(f.detail)));
});

test("filaDesdeEntrada: pasa tipo/electrificacion de cada version del panel", () => {
  const f = filaDesdeEntrada({ marca: "DS", modelo: "3", tipo: "Hatchback", electrificacion: "hev", versiones: [{ nombre: "E-Tense", precio: "41.490.000", tipo: "SUV", electrificacion: "ev" }, { nombre: "Hybrid", precio: 35990000, tipo: "", electrificacion: "" }] });
  assert.deepEqual(f.versiones, [
    { nombre: "E-Tense", precio: 41490000, tipo: "SUV", electrificacion: "EV" },
    { nombre: "Hybrid", precio: 35990000 },
  ]);
});

test("formatoImagen: decide por los bytes, no por el content-type", () => {
  const b = (...partes: (number[] | string)[]) =>
    new Uint8Array([...partes.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)), ...new Array(16).fill(0)]);
  assert.equal(formatoImagen(b([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(formatoImagen(b([0x89], "PNG", [0x0d, 0x0a])), "image/png");
  assert.equal(formatoImagen(b("GIF89a")), "image/gif");
  assert.equal(formatoImagen(b("RIFF", [1, 2, 3, 4], "WEBPVP8 ")), "image/webp");
  assert.equal(formatoImagen(b([0, 0, 0, 0x1c], "ftypavif")), "image/avif");
  // Lo que un CDN puede devolver con 200 y header de imagen, y no es una foto:
  assert.equal(formatoImagen(b("<!DOCTYPE html><html>")), null);
  assert.equal(formatoImagen(b('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(formatoImagen(b("%PDF-1.7")), null);
  assert.equal(formatoImagen(new Uint8Array([0xff, 0xd8])), null);
});

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
process.exit(failed === 0 ? 0 : 1);
