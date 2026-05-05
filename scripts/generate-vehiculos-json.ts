import { createClient } from "@sanity/client";
import { writeFileSync } from "fs";
import { join } from "path";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

function formatTime(kw: number | null | undefined, kWh: number | null | undefined, label: string): string {
  if (!kw || !kWh) return "N/D";
  return label;
}

interface SanityCar {
  _id: string;
  brand: { name: string };
  name: string;
  batteryCapacity?: number;
  maxACChargingPower?: number;
  maxDCChargingPower?: number;
  chargeTimeAC?: string;
  chargeTimeDC?: string;
  basePrice?: number;
  discountPrice?: number;
  versions?: Array<{
    name: string;
    price?: number;
    discountPrice?: number;
    batteryCapacity?: number;
    maxACChargingPower?: number;
    maxDCChargingPower?: number;
    chargeTimeAC?: string;
    chargeTimeDC?: string;
  }>;
}

interface VehicleRow {
  marca: string;
  modelo: string;
  version: string | null;
  bateria_kWh: number | null;
  carga_ac: string;
  carga_dc: string;
  potencia_ac_kW: number | null;
  potencia_dc_kW: number | null;
  precio_clp: number | null;
  precio_descuento_clp: number | null;
}

async function main() {
  const cars: SanityCar[] = await client.fetch(`
    *[_type == "car"] | order(brand->name asc, name asc) {
      _id,
      name,
      "brand": brand->{ name },
      batteryCapacity,
      maxACChargingPower,
      maxDCChargingPower,
      chargeTimeAC,
      chargeTimeDC,
      basePrice,
      discountPrice,
      "versions": versions[]{
        name,
        price,
        discountPrice,
        batteryCapacity,
        maxACChargingPower,
        maxDCChargingPower,
        chargeTimeAC,
        chargeTimeDC
      }
    }
  `);

  const rows: VehicleRow[] = [];
  const seen = new Set<string>();

  for (const car of cars) {
    const marca = car.brand?.name ?? "Sin marca";
    const modelo = car.name;

    const hasVersions = car.versions && car.versions.length > 0;

    if (hasVersions) {
      for (const v of car.versions!) {
        const key = `${marca}|${modelo}|${v.name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        rows.push({
          marca,
          modelo,
          version: v.name,
          bateria_kWh: v.batteryCapacity ?? car.batteryCapacity ?? null,
          carga_ac: v.chargeTimeAC ?? car.chargeTimeAC ?? "N/D",
          carga_dc: v.chargeTimeDC ?? car.chargeTimeDC ?? "N/D",
          potencia_ac_kW: v.maxACChargingPower ?? car.maxACChargingPower ?? null,
          potencia_dc_kW: v.maxDCChargingPower ?? car.maxDCChargingPower ?? null,
          precio_clp: v.price ?? car.basePrice ?? null,
          precio_descuento_clp: v.discountPrice ?? car.discountPrice ?? null,
        });
      }
    } else {
      const key = `${marca}|${modelo}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        marca,
        modelo,
        version: null,
        bateria_kWh: car.batteryCapacity ?? null,
        carga_ac: car.chargeTimeAC ?? "N/D",
        carga_dc: car.chargeTimeDC ?? "N/D",
        potencia_ac_kW: car.maxACChargingPower ?? null,
        potencia_dc_kW: car.maxDCChargingPower ?? null,
        precio_clp: car.basePrice ?? null,
        precio_descuento_clp: car.discountPrice ?? null,
      });
    }
  }

  rows.sort((a, b) => {
    const m = a.marca.localeCompare(b.marca, "es");
    if (m !== 0) return m;
    const mo = a.modelo.localeCompare(b.modelo, "es");
    if (mo !== 0) return mo;
    return (a.version ?? "").localeCompare(b.version ?? "", "es");
  });

  const outPath = join(process.cwd(), "public/vehiculos.json");
  writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf-8");

  const withVersions = rows.filter((r) => r.version !== null).length;
  const withoutVersions = rows.filter((r) => r.version === null).length;
  console.log(`✅ Generado: ${rows.length} filas (${withVersions} versiones, ${withoutVersions} modelos sin versiones)`);
  console.log(`📄 Guardado en: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
