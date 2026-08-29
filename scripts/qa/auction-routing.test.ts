/// <reference types="node" />
/**
 * Tests de geo (cercanía) y ruteo (lead→vendedores). Puros y deterministas.
 *   npx tsx scripts/qa/auction-routing.test.ts
 */

import assert from "node:assert/strict";
import { normalize, regionIndex, cercaniaZona } from "@/lib/auction/geo";
import { detectBrand, matchVendors, type VendorProfile } from "@/lib/auction/routing";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n      ${(e as Error).message.split("\n")[0]}`);
  }
}

console.log("\nnormalize (acentos):");
test("quita acentos y baja a minúsculas", () => {
  assert.equal(normalize("Biobío"), "biobio");
  assert.equal(normalize("Ñuble"), "nuble");
  assert.equal(normalize("  VALPARAÍSO "), "valparaiso");
});

console.log("\nregionIndex (variantes de escritura):");
test("reconoce nombres oficiales y variantes", () => {
  assert.equal(regionIndex("Metropolitana de Santiago"), 6);
  assert.equal(regionIndex("Región Metropolitana"), 6);
  assert.equal(regionIndex("RM"), 6);
  assert.equal(regionIndex("Libertador General Bernardo O'Higgins"), 7);
  assert.equal(regionIndex("La Araucanía"), 11);
  assert.equal(regionIndex("no existe"), null);
});

console.log("\ncercaniaZona:");
test("misma comuna → local", () =>
  assert.equal(cercaniaZona("Metropolitana", "Providencia", "Metropolitana", "Providencia"), "local"));
test("misma región, otra comuna → regional", () =>
  assert.equal(cercaniaZona("Metropolitana", "Providencia", "Metropolitana", "Maipú"), "regional"));
test("región contigua → vecina (RM ↔ Valparaíso)", () =>
  assert.equal(cercaniaZona("Metropolitana", "Providencia", "Valparaíso", "Viña"), "vecina"));
test("región lejana → distante (RM ↔ Araucanía)", () =>
  assert.equal(cercaniaZona("Metropolitana", "Providencia", "La Araucanía", "Temuco"), "distante"));
test("delivery gratis fuerza local", () =>
  assert.equal(cercaniaZona("Metropolitana", "Providencia", "La Araucanía", "Temuco", { deliveryGratis: true }), "local"));
test("región desconocida → distante (conservador)", () =>
  assert.equal(cercaniaZona("Marte", "X", "Metropolitana", "Y"), "distante"));

console.log("\ndetectBrand:");
test("detecta marca con lista conocida", () =>
  assert.equal(detectBrand("BYD Dolphin GS", ["BYD", "Tesla", "MG"]), "byd"));
test("prefiere el match de marca más largo", () =>
  assert.equal(detectBrand("Great Wall Ora 03", ["Wall", "Great Wall"]), "great wall"));
test("sin lista, cae al primer token", () =>
  assert.equal(detectBrand("Tesla Model 3"), "tesla"));

console.log("\nmatchVendors:");
const lead = { region: "Metropolitana de Santiago", comuna: "Providencia", targetModel: "BYD Dolphin" };
const vendors: VendorProfile[] = [
  { id: "v1", nombre: "BYD Santiago", region: "Metropolitana de Santiago", comuna: "Providencia", marcas: "BYD, MG", estado: "activo" },
  { id: "v2", nombre: "BYD Temuco", region: "La Araucanía", comuna: "Temuco", marcas: "BYD", estado: "activo" },
  { id: "v3", nombre: "Tesla Santiago", region: "Metropolitana de Santiago", comuna: "Las Condes", marcas: "Tesla", estado: "activo" },
  { id: "v4", nombre: "BYD suspendido", region: "Metropolitana de Santiago", comuna: "Ñuñoa", marcas: "BYD", estado: "suspendido" },
];

test("solo vendedores activos que manejan la marca son elegibles", () => {
  const r = matchVendors(lead, vendors, { knownBrands: ["BYD", "Tesla", "MG"] });
  const elegibles = r.filter((m) => m.elegible).map((m) => m.vendor.id);
  assert.deepEqual(elegibles.sort(), ["v1", "v2"], "v1 y v2 (BYD activos); v3 marca distinta, v4 suspendido");
});
test("el elegible más cercano va primero (local antes que distante)", () => {
  const r = matchVendors(lead, vendors, { knownBrands: ["BYD", "Tesla", "MG"] });
  assert.equal(r[0].vendor.id, "v1");
  assert.equal(r[0].cercania, "local");
});
test("vendedor suspendido queda no elegible con motivo", () => {
  const r = matchVendors(lead, vendors, { knownBrands: ["BYD", "Tesla", "MG"] });
  const v4 = r.find((m) => m.vendor.id === "v4")!;
  assert.equal(v4.elegible, false);
  assert.ok(v4.motivos.some((m) => m.includes("no activo")));
});

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} pasaron, ${failed} fallaron\n`);
process.exit(failed === 0 ? 0 : 1);
