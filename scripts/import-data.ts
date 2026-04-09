/**
 * Script de importacion de datos a Sanity
 *
 * Uso:
 *   npx tsx scripts/import-data.ts
 *
 * Prerequisitos:
 *   - SANITY_API_TOKEN con permisos de escritura en .env.local
 *   - NEXT_PUBLIC_SANITY_PROJECT_ID configurado
 *   - Archivo data/cars.json con el catálogo normalizado
 *
 * Este script:
 *   1. Lee el JSON normalizado de autos
 *   2. Crea las marcas (brands) si no existen
 *   3. Crea las categorias si no existen
 *   4. Crea los autos con sus versiones y referencias
 */

import { createClient } from "@sanity/client";
import * as fs from "fs";
import * as path from "path";

// Configuracion directa para el script (no usa Next.js)
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || "",
  useCdn: false,
});

interface RawCarData {
  name: string;
  brand: string;
  category: string;
  tagline?: string;
  description?: string;
  basePrice: number;
  discountPrice?: number;
  batteryCapacity: number;
  range: number;
  power: number;
  traction: "FWD" | "RWD" | "AWD";
  isNew?: boolean;
  isFeatured?: boolean;
  isHotDeal?: boolean;
  hotDealBonusAmount?: number;
  hotDealExpiry?: string;
  safetyFeatures?: string[];
  techFeatures?: string[];
  versions?: Array<{
    name: string;
    price: number;
    discountPrice?: number;
    batteryCapacity: number;
    range: number;
    power: number;
    torque?: number;
    acceleration?: number;
    topSpeed?: number;
    traction: "FWD" | "RWD" | "AWD";
    seats?: number;
    seatRows?: number;
    trunkCapacity?: number;
    chargeTimeDC?: string;
    chargeTimeAC?: string;
  }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getOrCreateBrand(name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await client.fetch(
    `*[_type == "brand" && slug.current == $slug][0]._id`,
    { slug }
  );

  if (existing) {
    console.log(`  Brand "${name}" ya existe: ${existing}`);
    return existing;
  }

  const doc = await client.create({
    _type: "brand",
    name,
    slug: { _type: "slug", current: slug },
  });

  console.log(`  Brand "${name}" creada: ${doc._id}`);
  return doc._id;
}

async function getOrCreateCategory(name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await client.fetch(
    `*[_type == "category" && slug.current == $slug][0]._id`,
    { slug }
  );

  if (existing) {
    console.log(`  Category "${name}" ya existe: ${existing}`);
    return existing;
  }

  const doc = await client.create({
    _type: "category",
    name,
    slug: { _type: "slug", current: slug },
  });

  console.log(`  Category "${name}" creada: ${doc._id}`);
  return doc._id;
}

async function importCars() {
  const dataPath = path.resolve(__dirname, "../data/cars.json");

  if (!fs.existsSync(dataPath)) {
    console.error(`\nArchivo no encontrado: ${dataPath}`);
    console.error(`Crea el archivo data/cars.json con el catalogo normalizado.\n`);
    process.exit(1);
  }

  const rawData: RawCarData[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`\nImportando ${rawData.length} autos...\n`);

  // Paso 1: Crear marcas y categorias unicas
  const brandIds = new Map<string, string>();
  const categoryIds = new Map<string, string>();

  const uniqueBrands = [...new Set(rawData.map((c) => c.brand))];
  const uniqueCategories = [...new Set(rawData.map((c) => c.category))];

  console.log("--- Creando marcas ---");
  for (const brand of uniqueBrands) {
    brandIds.set(brand, await getOrCreateBrand(brand));
  }

  console.log("\n--- Creando categorias ---");
  for (const category of uniqueCategories) {
    categoryIds.set(category, await getOrCreateCategory(category));
  }

  // Paso 2: Crear autos
  console.log("\n--- Creando autos ---");
  for (const car of rawData) {
    const slug = slugify(`${car.brand}-${car.name}`);

    const existing = await client.fetch(
      `*[_type == "car" && slug.current == $slug][0]._id`,
      { slug }
    );

    if (existing) {
      console.log(`  Auto "${car.brand} ${car.name}" ya existe, saltando...`);
      continue;
    }

    const brandId = brandIds.get(car.brand)!;
    const categoryId = categoryIds.get(car.category)!;

    const doc = await client.create({
      _type: "car",
      name: car.name,
      slug: { _type: "slug", current: slug },
      brand: { _type: "reference", _ref: brandId },
      category: { _type: "reference", _ref: categoryId },
      tagline: car.tagline,
      description: car.description,
      basePrice: car.basePrice,
      discountPrice: car.discountPrice,
      batteryCapacity: car.batteryCapacity,
      range: car.range,
      power: car.power,
      traction: car.traction,
      isNew: car.isNew ?? false,
      isFeatured: car.isFeatured ?? false,
      isHotDeal: car.isHotDeal ?? false,
      hotDealBonusAmount: car.hotDealBonusAmount,
      hotDealExpiry: car.hotDealExpiry,
      safetyFeatures: car.safetyFeatures,
      techFeatures: car.techFeatures,
      versions: car.versions?.map((v) => ({
        _type: "version",
        _key: slugify(v.name),
        ...v,
      })),
    });

    console.log(`  Auto "${car.brand} ${car.name}" creado: ${doc._id}`);
  }

  console.log("\nImportacion completada!\n");
}

importCars().catch((err) => {
  console.error("Error durante la importacion:", err);
  process.exit(1);
});
