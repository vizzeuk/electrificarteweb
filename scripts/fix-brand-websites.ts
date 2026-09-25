/**
 * Corrige `brand.website` y nombres de marca mal escritos en Sanity.
 *
 *   npx tsx --env-file=.env.local scripts/fix-brand-websites.ts            (reporta)
 *   npx tsx --env-file=.env.local scripts/fix-brand-websites.ts --aplicar
 *
 * Los `website` malos no solo rompen el descubrimiento de fuentes: también son el
 * enlace "Sitio oficial" de la página de marca del sitio. Cada corrección de acá
 * salió de comprobar el dominio a mano (DNS + HTTP), no de suponer.
 */

import { createClient } from "@sanity/client";

const aplicar = process.argv.includes("--aplicar");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

/** marca en Sanity → { website correcto, nombre correcto si está mal, por qué } */
const FIXES: Record<string, { website?: string; name?: string; motivo: string }> = {
  AVTR: { website: "https://www.avatrautos.cl", motivo: "no tenía website; el importador chileno es avatrautos.cl" },
  Leapmotor: { website: "https://www.leapmotorchile.cl", motivo: "leapmotor.cl no resuelve" },
  Jetour: { website: "https://jetourchile.cl", motivo: "jetour.cl no resuelve" },
  "Mercedes-Benz": { website: "https://www.kaufmann.cl/automoviles/mercedes-benz", motivo: "mercedes-benz.cl no resuelve; en Chile vende Kaufmann" },
  Jeep: { website: "https://www.jeepcotizador.com", motivo: "jeep.cl no sirve contenido" },
  BAIC: { website: "https://www.baic.cl", motivo: "no tenía website" },
  SOUEST: { name: "SOUEAST", website: "https://soueastchile.cl", motivo: "el nombre estaba mal escrito (SOUEST) y no tenía website" },
  Omoda: { website: "https://www.omodajaecoo.cl", motivo: "omoda.cl no carga; en Chile Omoda y Jaecoo comparten sitio" },
  Jaecoo: { website: "https://www.omodajaecoo.cl", motivo: "jaecoo.cl no carga; en Chile Omoda y Jaecoo comparten sitio" },
  Deepal: { website: "https://www.deepalautos.cl", motivo: "deepal.cl es un dominio estacionado en venta (dynadot); el sitio real lo linkea changan.cl" },
  DS: { website: "https://cotizador.dsautomobiles.cl", motivo: "www.ds-automobiles.cl no carga" },
  Smart: { website: "https://www.kaufmann.cl/automoviles/smart", motivo: "no tiene sitio .cl propio; en Chile vende Kaufmann" },
  Dongfeng: { website: "https://dongfengindumotora.cl", motivo: "el importador chileno es Indumotora" },
  Nammi: { website: "https://dongfengindumotora.cl", motivo: "nammi.cl no resuelve; en Chile el E70 lo vende Dongfeng/Indumotora" },
  GAC: { website: "https://www.gacautos.cl", motivo: "gac.cl no listaba modelos" },
  "Lynk & Co": { website: "https://www.lynkco.com/es-cl", motivo: "faltaba el locale es-cl" },
  Honda: { website: "https://autos.honda.cl", motivo: "honda.cl no lista el catálogo; el catálogo está en autos.honda.cl" },
  JMC: { website: "https://jmcchile.cl", motivo: "jmc.cl no listaba modelos" },
  Riddara: { website: "https://www.riddarachile.cl", motivo: "riddara.cl no sirve contenido" },
  Ora: { website: "https://www.gwm.cl", motivo: "ora.cl no sirve contenido; en Chile se vende bajo GWM" },
  Haval: { website: "https://www.gwm.cl", motivo: "haval.cl no resuelve; en Chile se vende bajo GWM" },
  Cupra: { website: "https://www.cupraofficial.cl", motivo: "cupra.cl no existe" },
  MG: { website: "https://www.mgmotor.cl", motivo: "mg.cl redirige al home y no sirve fichas; el sitio chileno es mgmotor.cl" },
  JAC: { website: "https://www.jacautoschile.cl", motivo: "el sitio chileno es jacautoschile.cl" },
};

interface Brand {
  _id: string;
  name: string;
  website: string | null;
}

async function main(): Promise<void> {
  const brands = await sanity.fetch<Brand[]>(`*[_type == "brand"]{ _id, name, website }`);
  const porNombre = new Map(brands.map((b) => [b.name, b]));

  const cambios: { id: string; label: string; set: Record<string, string>; motivo: string }[] = [];
  const noEncontradas: string[] = [];

  for (const [nombre, fix] of Object.entries(FIXES)) {
    const b = porNombre.get(nombre);
    if (!b) {
      noEncontradas.push(nombre);
      continue;
    }
    const set: Record<string, string> = {};
    if (fix.website && b.website !== fix.website) set.website = fix.website;
    if (fix.name && b.name !== fix.name) set.name = fix.name;
    if (Object.keys(set).length === 0) continue;
    cambios.push({ id: b._id, label: b.name, set, motivo: fix.motivo });
  }

  console.log(`\n${brands.length} marcas en Sanity · ${cambios.length} a corregir\n`);
  for (const c of cambios) {
    const detalle = Object.entries(c.set).map(([k, v]) => `${k} → ${v}`).join(" · ");
    console.log(`  ${c.label.padEnd(15)} ${detalle}`);
    console.log(`  ${"".padEnd(15)} \x1b[90m${c.motivo}\x1b[0m`);
  }
  if (noEncontradas.length) console.log(`\n  \x1b[33mno están en Sanity: ${noEncontradas.join(", ")}\x1b[0m`);

  if (!cambios.length) {
    console.log("\nNada que corregir.\n");
    return;
  }
  if (!aplicar) {
    console.log(`\n(no se escribió nada — correr con --aplicar)\n`);
    return;
  }

  // El slug NO se toca aunque cambie el nombre: /marcas/<slug> ya está indexado
  // y cambiarlo rompería la URL pública y los enlaces existentes.
  const tx = cambios.reduce((t, c) => t.patch(c.id, (p) => p.set(c.set)), sanity.transaction());
  await tx.commit();
  console.log(`\n\x1b[32m✓ ${cambios.length} marcas corregidas\x1b[0m\n`);
}

void main();
