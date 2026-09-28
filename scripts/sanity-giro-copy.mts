// Deja el contenido de Sanity alineado con el giro (sep-2026): sin "negociamos", sin $19.990 en
// el copy, sin cifras de ahorro "negociado" y sin "concesionarios". La negociación se nombra solo
// como un servicio futuro (/negociacion).
//
//   npx tsx --env-file=.env.local scripts/sanity-giro-copy.mts [--dry-run]
//
// Antes de escribir guarda los valores originales en scripts/data/sanity-giro-backup.json para
// poder restaurarlos si se reactiva la Oferta. Idempotente. Toca publicados y borradores.
// NO toca formServicePrice / heroOffer*Price: son la configuración de la Oferta en standby
// (el sitio no los muestra mientras OFERTA_STANDBY esté activo).
import { createClient } from "@sanity/client";
import { existsSync, writeFileSync } from "node:fs";

const c = createClient({ projectId: "wd30r9b0", dataset: "production", apiVersion: "2025-01-01", token: process.env.SANITY_API_TOKEN, useCdn: false });
const DRY = process.argv.includes("--dry-run");

type Cambio = { id: string; set: Record<string, string> };
const HOME: Cambio = { id: "homePage", set: {
  heroBadge: "El catálogo de autos electrificados de Chile",
  heroTitle: "Elige bien tu próximo",
  heroTitleHighlight: "auto electrificado.",
  heroSubtitle: "Explora el catálogo de autos electrificados en Chile, compara modelos y calcula cuánto ahorras frente a la bencina. Si no sabes cuál elegir, te asesoramos por WhatsApp.",
  testimonialsTitle: "Opiniones de dueños de autos electrificados",
} };
const COLECCIONES: Cambio[] = [
  { id: "6IFqLXQK07mFWbhNIg4fNC", set: { description: "Autos eléctricos e híbridos en Chile a menos de $20.000.000, con el precio de lista y la ficha técnica de cada modelo." } },
  { id: "6IFqLXQK07mFWbhNIg4fsh", set: { description: "Toda la gama BYD disponible en Chile: Seal, Atto 3, Yuan Plus, Dolphin y más, con precios de lista y fichas técnicas." } },
  { id: "Azr6jnPnblfJFZmxpyV8He", set: { description: "Los mejores SUV eléctricos e híbridos con 7 asientos disponibles en Chile, con el precio de lista y la ficha técnica de cada modelo." } },
];
// Blog: por bloque (_key). "span" = texto del único span de un bloque normal; "callout" = campo text.
const BLOG: { id: string; bloques: { key: string; tipo: "span" | "callout"; texto: string }[] }[] = [
  { id: "Vls8ret4Yd1rRWA2HiukWP", bloques: [
    { key: "hcibgq1bjyk", tipo: "span", texto: "El precio de lista rara vez es el precio final: los bonos de marca, por financiamiento o por entregar tu auto en parte de pago pueden cambiar bastante el total. Antes de decidir, cotiza el mismo modelo y versión con más de un vendedor oficial, pide la cotización por escrito y revisa qué incluye: cargador, instalación, mantenciones y garantía de la batería." },
    { key: "snp8m5j5l4", tipo: "callout", texto: "Pronto abriremos en Electrificarte un servicio para buscar, dentro de nuestra red de vendedores oficiales, un precio mejor que el de lista para el modelo que elegiste. Todavía no está disponible: si quieres enterarte cuando abra, súmate a la waitlist en electrificarte.com/negociacion." },
    { key: "w2pk19ieahc", tipo: "span", texto: "El mejor auto eléctrico para ti depende de tu presupuesto, tus kilómetros diarios y qué tanto valoras la tecnología frente al precio. No existe una respuesta única, pero con esta guía tienes los criterios para tomar una decisión informada. Si todavía no sabes cuál elegir, en Electrificarte te asesoramos por WhatsApp según tu uso y tu presupuesto." },
  ] },
  { id: "Vls8ret4Yd1rRWA2HiulJD", bloques: [
    { key: "wjqmvvo8r8i", tipo: "callout", texto: "Antes de elegir marca, compara también la red de servicio técnico cerca de ti, la garantía de la batería y la disponibilidad de repuestos: pesan tanto como el precio a la hora de vivir con el auto." },
    { key: "gzwvfogrjv", tipo: "span", texto: "No hay una respuesta universal: las tres marcas son buenas opciones dependiendo de tu perfil. Si tienes dudas, en Electrificarte te ayudamos a comparar modelos específicos según tu uso y tu presupuesto con nuestra asesoría por WhatsApp." },
  ] },
];

const conBorrador = async (id: string) => [id, ...(await c.fetch<string[]>(`*[_id == $d]._id`, { d: `drafts.${id}` }))];

// 1. Respaldo (solo la primera vez: si ya existe, no se pisa con valores ya corregidos).
const BACKUP = "scripts/data/sanity-giro-backup.json";
if (!existsSync(BACKUP)) {
  const backup: Record<string, unknown> = {};
  for (const ch of [HOME, ...COLECCIONES]) for (const id of await conBorrador(ch.id))
    backup[id] = await c.fetch(`*[_id == $id][0]{${Object.keys(ch.set).join(",")}}`, { id });
  for (const b of BLOG) for (const id of await conBorrador(b.id)) {
    const body = await c.fetch<any[]>(`*[_id == $id][0].body`, { id });
    backup[id] = Object.fromEntries(b.bloques.map((x) => [x.key, body?.find((y) => y._key === x.key) ?? null]));
  }
  writeFileSync(BACKUP, JSON.stringify(backup, null, 2) + "\n");
  console.log(`respaldo: ${BACKUP}`);
}

// 2. Cambios en una transacción.
const tx = c.transaction();
let n = 0;
for (const ch of [HOME, ...COLECCIONES]) for (const id of await conBorrador(ch.id)) { tx.patch(id, (p) => p.set(ch.set)); n++; }
for (const b of BLOG) for (const id of await conBorrador(b.id)) {
  const body = await c.fetch<any[]>(`*[_id == $id][0].body`, { id });
  const set: Record<string, string> = {};
  for (const x of b.bloques) {
    const bloque = body?.find((y) => y._key === x.key);
    if (!bloque) { console.log(`  (${id}: no tiene el bloque ${x.key}, se salta)`); continue; }
    if (x.tipo === "span") {
      if (bloque.children?.length !== 1) throw new Error(`${id}/${x.key}: se esperaba 1 span`);
      set[`body[_key=="${x.key}"].children[_key=="${bloque.children[0]._key}"].text`] = x.texto;
    } else set[`body[_key=="${x.key}"].text`] = x.texto;
  }
  if (Object.keys(set).length) { tx.patch(id, (p) => p.set(set)); n++; }
}
console.log(`${n} documentos a actualizar`);
if (DRY) { console.log("--dry-run: no se escribió nada"); process.exit(0); }
await tx.commit();
console.log("✓ Sanity actualizado");
