/**
 * Configura el home del sitio en Sanity:
 * 1. Sube las 3 fotos de colecciones como assets
 * 2. Crea (o actualiza) 3 colecciones con esas fotos
 * 3. Actualiza el documento homePage con autos reales que tengan imagen
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/setup-home.ts
 */

import { createClient } from "@sanity/client";
import * as fs from "fs";
import * as path from "path";

const client = createClient({
  projectId:   process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset:     process.env.NEXT_PUBLIC_SANITY_DATASET   || "production",
  apiVersion:  "2025-01-01",
  token:       process.env.SANITY_API_TOKEN || "",
  useCdn:      false,
  perspective: "raw" as const,
});

// ─── Colecciones a crear ─────────────────────────────────────────────────────

const COLLECTIONS = [
  {
    title:      "SUV Familiar 7 Asientos",
    slug:       "suv-familiar-7-asientos",
    badge:      "7 ASIENTOS",
    subtitle:   "Espacio para toda la familia, sin emisiones",
    description:"Los mejores SUV eléctricos e híbridos con 7 asientos disponibles en Chile. Precio negociado, entrega en concesionario.",
    ctaText:    "Ver SUVs familiares",
    homeOrder:  1,
    imageFile:  "public/images/coleccion-suv-7-asientos.webp",
    imageExt:   "webp",
    filterMode: "automatic",
    filterMinSeats: 7,
  },
  {
    title:      "Autos bajo $20 millones",
    slug:       "autos-bajo-20-millones",
    badge:      "ACCESIBLE",
    subtitle:   "Eléctrico a precio justo",
    description:"Autos eléctricos e híbridos en Chile a menos de $20.000.000 con precios negociados por Electrificarte.",
    ctaText:    "Ver autos accesibles",
    homeOrder:  2,
    imageFile:  "public/images/coleccion-menos-20m.webp",
    imageExt:   "webp",
    filterMode: "automatic",
    filterMaxPrice: 20,
  },
  {
    title:      "BYD Eléctrico",
    slug:       "byd-electrico",
    badge:      "BYD",
    subtitle:   "La marca líder en eléctricos",
    description:"Toda la gama BYD disponible en Chile: Seal, Atto 3, Yuan Plus, Dolphin y más. Precios negociados exclusivos.",
    ctaText:    "Ver gama BYD",
    homeOrder:  3,
    imageFile:  "public/images/coleccion-byd-electrico.jpg",
    imageExt:   "jpeg",
    filterMode: "automatic",
    // Se filtra por brand slug byd — se resuelve en el script
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function uploadImage(filePath: string, filename: string, ext: string) {
  const buffer = fs.readFileSync(path.resolve(process.cwd(), filePath));
  const contentType = ext === "webp" ? "image/webp"
                    : ext === "jpeg" || ext === "jpg" ? "image/jpeg"
                    : "image/png";
  const asset = await client.assets.upload("image", buffer, { filename, contentType });
  console.log(`  ✓ Asset subido: ${filename} → ${asset._id}`);
  return asset._id;
}

function imageRef(assetId: string) {
  return { _type: "image", asset: { _type: "reference", _ref: assetId } };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🚀 Configurando el home de Electrificarte...\n");

  // ── 1. Buscar brand BYD ─────────────────────────────────────────────────────
  const bydBrand = await client.fetch(
    `*[_type == "brand" && slug.current == "byd"][0]{ _id, name }`
  );
  if (bydBrand) console.log(`  ✓ Brand BYD encontrada: ${bydBrand._id}`);
  else console.log(`  ⚠ Brand BYD no encontrada — colección BYD sin filtro de marca`);

  // ── 2. Crear / actualizar colecciones ────────────────────────────────────────
  console.log("\n📚 Creando colecciones...");

  for (const col of COLLECTIONS) {
    // Verificar si ya existe
    const existing = await client.fetch(
      `*[_type == "collection" && slug.current == $slug][0]._id`,
      { slug: col.slug }
    );

    // Subir imagen
    const assetId = await uploadImage(col.imageFile, `coleccion-${col.slug}.${col.imageExt}`, col.imageExt);

    const doc: Record<string, unknown> & { _type: string } = {
      _type:       "collection",
      title:       col.title,
      slug:        { _type: "slug", current: col.slug },
      badge:       col.badge,
      subtitle:    col.subtitle,
      description: col.description,
      ctaText:     col.ctaText,
      heroImage:   imageRef(assetId),
      showInHome:  true,
      homeOrder:   col.homeOrder,
      filterMode:  col.filterMode,
    };

    if (col.filterMinSeats)  doc.filterMinSeats  = col.filterMinSeats;
    if (col.filterMaxPrice)  doc.filterMaxPrice  = col.filterMaxPrice;
    if (col.slug === "byd-electrico" && bydBrand) {
      doc.filterBrand = { _type: "reference", _ref: bydBrand._id };
    }

    if (existing) {
      await client.patch(existing).set(doc).commit();
      console.log(`  ✓ Colección actualizada: "${col.title}"`);
    } else {
      await client.create(doc);
      console.log(`  ✓ Colección creada: "${col.title}"`);
    }
  }

  // ── 3. Autos con imagen para el home ────────────────────────────────────────
  console.log("\n🚗 Buscando autos con imagen en Sanity...");

  const carsWithImage = await client.fetch(`
    *[_type == "car" && defined(mainImage.asset)] {
      _id, name, isHotDeal, isNew, isTopSeller,
      "brand": brand->name,
      "slug": slug.current,
      discountPrice
    } | order(discountPrice asc)
  `);

  console.log(`  → ${carsWithImage.length} autos con imagen encontrados`);

  if (carsWithImage.length === 0) {
    console.log("\n  ⚠ No hay autos con imagen en Sanity.");
    console.log("    Sube imágenes a los autos desde el Studio y vuelve a ejecutar.\n");
    return;
  }

  // Elegir hot deal
  const hotDeal = carsWithImage.find((c: { isHotDeal: boolean }) => c.isHotDeal)
               ?? carsWithImage[0];

  // Últimos lanzamientos (isNew primero, luego relleno)
  const newCars = carsWithImage.filter((c: { isNew: boolean }) => c.isNew).slice(0, 3);
  const latestLaunches = newCars.length >= 3
    ? newCars
    : [...newCars, ...carsWithImage.filter((c: { isNew: boolean }) => !c.isNew).slice(0, 3 - newCars.length)];

  // Oportunidades (excluir los ya usados, tomar hasta 6)
  const usedIds = new Set([hotDeal._id, ...latestLaunches.map((c: { _id: string }) => c._id)]);
  const opportunities = carsWithImage
    .filter((c: { _id: string }) => !usedIds.has(c._id))
    .slice(0, 6);

  console.log(`\n  Hot deal:          ${hotDeal.brand} ${hotDeal.name}`);
  console.log(`  Últimos lanz.:     ${latestLaunches.map((c: { brand: string; name: string }) => `${c.brand} ${c.name}`).join(", ")}`);
  console.log(`  Oportunidades:     ${opportunities.length} autos`);

  // ── 4. Crear o actualizar homePage ──────────────────────────────────────────
  console.log("\n🏠 Configurando homePage en Sanity...");

  // Always target the published document (fixed singleton ID "homePage")
  const publishedId = "homePage";

  const ref = (id: string) => ({ _type: "reference", _ref: id });
  const keyedRef = (id: string, i: number) => ({ ...ref(id), _key: `car_${i}` });

  const carData = {
    hotDealCar:          ref(hotDeal._id),
    latestLaunchesCars:  latestLaunches.map((c: { _id: string }, i: number) => keyedRef(c._id, i)),
    opportunitiesCars:   opportunities.map((c: { _id: string }, i: number) => keyedRef(c._id, i + 10)),
  };

  const existingPublished = await client.fetch(`*[_id == "${publishedId}"][0]._id`);

  if (existingPublished) {
    await client.patch(publishedId).set(carData).commit();
    console.log("  ✓ homePage actualizado\n");
  } else {
    await client.createOrReplace({
      _id:   publishedId,
      _type: "homePage",
      // Hero defaults
      heroBadge:            "Más de 500 compras negociadas en Chile",
      heroTitle:            "Paga menos por tu próximo",
      heroTitleHighlight:   "auto eléctrico",
      heroSubtitle:         "Negociamos con nuestra red de concesionarios y te traemos la mejor oferta del mercado en 24 horas. Si no ahorras, te devolvemos el dinero.",
      heroCta1Text:         "Ver autos disponibles",
      heroCta1Href:         "/marcas",
      heroCta2Text:         "Cómo funciona",
      heroStatSavings:      "$4.200.000 CLP",
      heroStatCars:         "500+",
      heroStatDiscount:     "27%",
      heroStatResponse:     "24h",
      heroOfferOldPrice:    "$29.990",
      heroOfferNewPrice:    "$19.990",
      heroOfferBadge:       "33% dcto Electric Sale",
      latestLaunchesTitle:  "Últimos lanzamientos",
      opportunitiesTitle:   "Destacados Electrificarte",
      // Car sections
      ...carData,
    });
    console.log("  ✓ homePage creado y publicado\n");
  }

  console.log("✅ ¡Todo listo! Recarga el home para ver los cambios.\n");
}

main().catch((err) => {
  console.error("\n✗ Error fatal:", err);
  process.exit(1);
});
