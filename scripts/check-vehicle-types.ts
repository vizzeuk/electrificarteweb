import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "wd30r9b0",
  dataset: "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  const types = await client.fetch(`*[_type == 'vehicleType'] | order(navbarOrder asc) { _id, label, 'slug': slug.current, 'count': count(*[_type=='car' && vehicleType._ref == ^._id]) }`);
  console.log("VEHICLE TYPES:");
  types.forEach((t: any) => console.log(`  [${t.count}] ${t.label} (${t.slug})`));

  const unassigned = await client.fetch(`*[_type == 'car' && !defined(vehicleType)] | order(name asc) { name, 'brand': brand->name }`);
  console.log(`\nSIN TIPO ASIGNADO (${unassigned.length}):`);
  unassigned.forEach((c: any) => console.log(`  - ${c.brand} ${c.name}`));

  const allCars = await client.fetch(`*[_type == 'car'] | order(name asc) { _id, name, 'brand': brand->name, 'vt': vehicleType->label, 'vtSlug': vehicleType->slug.current }`);
  console.log(`\nAUTOS POR TIPO:`);
  const grouped: Record<string, string[]> = {};
  allCars.forEach((c: any) => { const k = c.vt ?? "SIN TIPO"; grouped[k] = grouped[k] ?? []; grouped[k].push(`${c.brand} ${c.name}`); });
  Object.entries(grouped).sort().forEach(([k, v]) => {
    console.log(`\n  ${k} (${v.length}):`);
    v.forEach((n) => console.log(`    - ${n}`));
  });
}

main().catch(console.error);
