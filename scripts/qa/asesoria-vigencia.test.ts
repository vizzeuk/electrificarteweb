/// <reference types="node" />
/**
 * Tests de la vigencia de la Asesoría $4.990 (lib/whatsapp/subscription.ts).
 * Puros — no tocan Supabase. Correr con:
 *   npx tsx scripts/qa/asesoria-vigencia.test.ts
 *
 * Cubren los cuatro agujeros que tenía el gating (sep-2026): la asesoría no
 * vencía nunca, contaba desde el formulario y no desde el pago, una fila
 * `pendiente` podía tapar una `pagado`, y el teléfono que guarda nuestro propio
 * formulario (`+56 9XXXXXXXX`, con espacio) no calzaba con ninguna búsqueda.
 */

import assert from "node:assert/strict";
import {
  algunaAsesoriaVigente,
  isRowActive,
  asesoriaVigente,
  ASESORIA_WINDOW_DAYS,
  inicioAsesoria,
  normalizePhone,
  phoneCandidates,
} from "@/lib/whatsapp/subscription";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${(e as Error).message.split("\n").join("\n      ")}`);
  }
}

const DIA = 24 * 60 * 60 * 1000;
const ahora = new Date("2026-09-24T12:00:00Z");
const haceDias = (d: number) => new Date(ahora.getTime() - d * DIA).toISOString();

console.log("\nvigencia:");

test("la ventana por defecto es de 10 días", () => {
  assert.equal(ASESORIA_WINDOW_DAYS, 10);
});

test("pagada hace 3 días → vigente", () => {
  assert.equal(asesoriaVigente({ status: "pagado", created_at: haceDias(3), paid_at: haceDias(3) }, ahora), true);
});

test("pagada hace 9,9 días → vigente todavía", () => {
  assert.equal(asesoriaVigente({ status: "pagado", paid_at: haceDias(9.9) }, ahora), true);
});

test("pagada hace 10 días → vencida (antes no vencía nunca)", () => {
  assert.equal(asesoriaVigente({ status: "pagado", paid_at: haceDias(10) }, ahora), false);
});

test("cuenta desde paid_at, no desde que se llenó el formulario", () => {
  // Llenó el formulario hace 12 días y pagó hace 2: le quedan 8.
  const fila = { status: "pagado", created_at: haceDias(12), paid_at: haceDias(2) };
  assert.equal(inicioAsesoria(fila)?.toISOString(), haceDias(2));
  assert.equal(asesoriaVigente(fila, ahora), true);
});

test("sin paid_at usa created_at", () => {
  assert.equal(inicioAsesoria({ created_at: haceDias(4) })?.toISOString(), haceDias(4));
  assert.equal(asesoriaVigente({ status: "pagado", created_at: haceDias(11) }, ahora), false);
});

test("pendiente nunca da acceso, aunque sea de hoy", () => {
  assert.equal(asesoriaVigente({ status: "pendiente", created_at: haceDias(0) }, ahora), false);
});

test("sin ninguna fecha → sin acceso (fail-closed)", () => {
  assert.equal(asesoriaVigente({ status: "pagado" }, ahora), false);
});

test('"Pendiente pago" (como lo escribe n8n en leads) no está activo', () => {
  for (const status of ["Pendiente pago", "pendiente", "PENDIENTE", " pendiente ", "pending_payment"]) {
    assert.equal(isRowActive({ status }), false, status);
  }
  assert.equal(isRowActive({ status: "pagado" }), true);
});

console.log("\nvarias filas del mismo número:");

test("una pendiente vieja no tapa la pagada (antes .limit(1) podía elegir la pendiente)", () => {
  const filas = [
    { status: "pendiente", created_at: haceDias(1) },
    { status: "pagado", created_at: haceDias(1), paid_at: haceDias(1) },
  ];
  assert.equal(algunaAsesoriaVigente(filas, ahora), true);
  assert.equal(algunaAsesoriaVigente([...filas].reverse(), ahora), true);
});

test("una asesoría vencida no da acceso aunque haya otra pendiente", () => {
  const filas = [
    { status: "pagado", paid_at: haceDias(15) },
    { status: "pendiente", created_at: haceDias(1) },
  ];
  assert.equal(algunaAsesoriaVigente(filas, ahora), false);
});

test("recompra: una vencida y una nueva pagada → vigente", () => {
  const filas = [
    { status: "pagado", paid_at: haceDias(30) },
    { status: "pagado", paid_at: haceDias(1) },
  ];
  assert.equal(algunaAsesoriaVigente(filas, ahora), true);
});

test("sin filas → sin acceso", () => {
  assert.equal(algunaAsesoriaVigente([], ahora), false);
});

console.log("\nteléfono:");

test("el formato de nuestro formulario (+56 9XXXXXXXX) está entre los candidatos", () => {
  // Kapso entrega el número sin símbolos; la fila la escribió el checkout.
  const desdeKapso = normalizePhone("56962327931");
  assert.ok(phoneCandidates(desdeKapso).includes("+56 962327931"));
});

test("también +56 9 1234 5678 y las variantes de antes", () => {
  const c = phoneCandidates("56912345678");
  for (const v of ["56912345678", "+56912345678", "912345678", "+56 912345678", "+56 9 1234 5678"]) {
    assert.ok(c.includes(v), `falta ${v}`);
  }
});

test("un número local de 9 dígitos genera las mismas variantes", () => {
  const c = phoneCandidates("912345678");
  for (const v of ["56912345678", "+56912345678", "+56 912345678"]) assert.ok(c.includes(v), `falta ${v}`);
});

test("un número extranjero no inventa variantes chilenas", () => {
  assert.deepEqual(phoneCandidates("14155551234"), ["14155551234", "+14155551234"]);
});

console.log(`\n${passed} ok · ${failed} fallaron\n`);
if (failed) process.exit(1);
