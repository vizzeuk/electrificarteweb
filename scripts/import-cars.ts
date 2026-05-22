/**
 * Importa autos nuevos a Sanity desde data/autos-nuevos.json
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/import-cars.ts          (importa todo)
 *   npx tsx --env-file=.env.local scripts/import-cars.ts --dry    (solo muestra qué haría)
 *   npx tsx --env-file=.env.local scripts/import-cars.ts --only=dongfeng-vigo
 *
 * Qué hace:
 *   1. Lee el JSON normalizado
 *   2. Resuelve referencias: marca (crea si falta), tipo de vehículo y tipo eléctrico
 *   3. Descarga las fotos del sitio oficial y las sube como assets a Sanity
 *   4. Crea el documento "car" con todos los campos disponibles
 *
 * Los autos cuyo slug ya existe se omiten (no se sobrescriben).
 * Los campos nulos/vacíos no se escriben — quedan en blanco para completar a mano.
 */

import { createClient } from "@sanity/client";
import * as fs from "fs";
import * as path from "path";

const DRY_RUN = process.argv.includes("--dry");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? null;

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

interface RawVersion {
  name: string;
  [key: string]: unknown;
}
interface RawCar {
  brand: string;
  name: string;
  slug: string;
  electricType: string | null;
  vehicleType: string | null;
  versions?: RawVersion[];
  images?: { main?: string | null; gallery?: string[] };
  [key: string]: unknown;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Elimina claves con valor null / undefined / "" para no escribir campos vacíos. */
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

// ─── Resolución de referencias ────────────────────────────────────────────────

async function getOrCreateBrand(name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await client.fetch<string | null>(
    `*[_type == "brand" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`,
    { slug }
  );
  if (existing) return existing;
  if (DRY_RUN) {
    console.log(`    · marca "${name}" NO existe — se crearía`);
    return `dry-brand-${slug}`;
  }
  const doc = await client.create({
    _type: "brand",
    name,
    slug: { _type: "slug", current: slug },
  });
  console.log(`    · marca "${name}" creada (${doc._id})`);
  return doc._id;
}

const vehicleTypeCache = new Map<string, string | null>();
async function resolveVehicleType(label: string | null): Promise<string | null> {
  if (!label) return null;
  const key = label.toLowerCase().trim();
  if (vehicleTypeCache.has(key)) return vehicleTypeCache.get(key)!;
  const id = await client.fetch<string | null>(
    `*[_type == "vehicleType" && lower(label) == $label && !(_id in path("drafts.**"))][0]._id`,
    { label: key }
  );
  vehicleTypeCache.set(key, id);
  return id;
}

const electricTypeCache = new Map<string, string | null>();
async function resolveElectricType(tag: string | null): Promise<string | null> {
  if (!tag) return null;
  const key = tag.toUpperCase().trim();
  if (electricTypeCache.has(key)) return electricTypeCache.get(key)!;
  const id = await client.fetch<string | null>(
    `*[_type == "electricType" && upper(tag) == $tag && !(_id in path("drafts.**"))][0]._id`,
    { tag: key }
  );
  electricTypeCache.set(key, id);
  return id;
}

// ─── Subida de imágenes ───────────────────────────────────────────────────────

async function uploadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.log(`    ! foto ${res.status}: ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const filename = decodeURIComponent(url.split("/").pop() ?? "image.jpg");
    if (DRY_RUN) {
      console.log(`    · foto OK (${(buf.length / 1024).toFixed(0)} KB) — ${filename}`);
      return `dry-asset-${filename}`;
    }
    const asset = await client.assets.upload("image", buf, { filename });
    return asset._id;
  } catch (err) {
    console.log(`    ! error descargando ${url}: ${(err as Error).message}`);
    return null;
  }
}

function imageRef(assetId: string, key?: string) {
  return {
    _type: "image" as const,
    ...(key ? { _key: key } : {}),
    asset: { _type: "reference" as const, _ref: assetId },
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

async function importCars() {
  const dataPath = path.resolve(__dirname, "../data/autos-nuevos.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`\nNo se encontró ${dataPath}\n`);
    process.exit(1);
  }

  let cars: RawCar[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  if (ONLY) cars = cars.filter((c) => c.slug === ONLY);

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Importando ${cars.length} auto(s)...\n`);
  let created = 0,
    skipped = 0,
    failed = 0;

  for (const car of cars) {
    const label = `${car.brand} ${car.name}`;
    console.log(`▶ ${label}  (${car.slug})`);

    try {
      const existing = await client.fetch<string | null>(
        `*[_type == "car" && slug.current == $slug && !(_id in path("drafts.**"))][0]._id`,
        { slug: car.slug }
      );
      if (existing) {
        console.log(`    = ya existe, se omite\n`);
        skipped++;
        continue;
      }

      const brandId = await getOrCreateBrand(car.brand);
      const vehicleTypeId = await resolveVehicleType(car.vehicleType);
      const electricTypeId = await resolveElectricType(car.electricType);
      if (!vehicleTypeId)
        console.log(`    ! tipo de vehículo "${car.vehicleType}" no encontrado — queda vacío`);
      if (!electricTypeId)
        console.log(`    ! tipo eléctrico "${car.electricType}" no encontrado — queda vacío`);

      // Fotos
      let mainImage = null;
      const gallery: ReturnType<typeof imageRef>[] = [];
      if (car.images?.main) {
        const id = await uploadImage(car.images.main);
        if (id) mainImage = imageRef(id);
      }
      for (let i = 0; i < (car.images?.gallery?.length ?? 0); i++) {
        const id = await uploadImage(car.images!.gallery![i]);
        if (id) gallery.push(imageRef(id, `g${i}`));
      }

      // Versiones
      const versions = (car.versions ?? []).map((v, i) => ({
        _type: "version",
        _key: slugify(v.name) || `v${i}`,
        ...clean(v as Record<string, unknown>),
      }));

      const doc = clean({
        _type: "car",
        name: car.name,
        slug: { _type: "slug", current: car.slug },
        brand: { _type: "reference", _ref: brandId },
        vehicleType: vehicleTypeId ? { _type: "reference", _ref: vehicleTypeId } : null,
        electricType: electricTypeId ? { _type: "reference", _ref: electricTypeId } : null,
        modelYear: car.modelYear ?? null,
        tagline: car.tagline ?? null,
        description: car.description ?? null,
        basePrice: car.basePrice ?? null,
        discountPrice: car.discountPrice ?? null,
        priceNote: car.priceNote ?? null,
        motorDescription: car.motorDescription ?? null,
        transmission: car.transmission ?? null,
        batteryCapacity: car.batteryCapacity ?? null,
        batteryType: car.batteryType ?? null,
        range: car.range ?? null,
        electricRangeKm: car.electricRangeKm ?? null,
        fuelConsumption: car.fuelConsumption ?? null,
        rendimientoElectrico: car.rendimientoElectrico ?? null,
        power: car.power ?? null,
        torque: car.torque ?? null,
        acceleration: car.acceleration ?? null,
        topSpeed: car.topSpeed ?? null,
        traction: car.traction ?? null,
        seats: car.seats ?? null,
        seatRows: car.seatRows ?? null,
        cargo: car.cargo ?? null,
        frunkCapacity: car.frunkCapacity ?? null,
        groundClearance: car.groundClearance ?? null,
        warranty: car.warranty ?? null,
        highlight: car.highlight ?? null,
        connectorType: car.connectorType ?? null,
        maxDCChargingPower: car.maxDCChargingPower ?? null,
        maxACChargingPower: car.maxACChargingPower ?? null,
        chargeTimeDC: car.chargeTimeDC ?? null,
        chargeTimeAC: car.chargeTimeAC ?? null,
        chargeType: car.chargeType ?? null,
        euroNcap: car.euroNcap ?? null,
        airbags: car.airbags ?? null,
        safetyFeatures: car.safetyFeatures ?? null,
        techFeatures: car.techFeatures ?? null,
        comfortFeatures: car.comfortFeatures ?? null,
        mainImage,
        gallery: gallery.length ? gallery : null,
        versions: versions.length ? versions : null,
      });

      if (DRY_RUN) {
        const fields = Object.keys(doc).length;
        console.log(
          `    → se crearía con ${fields} campos · ${gallery.length + (mainImage ? 1 : 0)} fotos · ${versions.length} versiones\n`
        );
        created++;
        continue;
      }

      const result = await client.create(doc);
      console.log(`    ✓ creado: ${result._id}\n`);
      created++;
    } catch (err) {
      console.error(`    ✗ ERROR: ${(err as Error).message}\n`);
      failed++;
    }
  }

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Listo — ${created} creados · ${skipped} omitidos · ${failed} con error\n`);
}

importCars().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
