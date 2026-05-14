/**
 * Actualiza los stats de cada marca en Sanity con datos reales verificados.
 * Ejecutar: npx tsx --env-file=.env.local scripts/update-brand-stats.ts
 */

import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "wd30r9b0",
  dataset: "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

type Stat = { label: string; value: string };

const BRAND_STATS: Record<string, Stat[]> = {
  "audi": [
    { label: "Año de fundación",      value: "1909" },
    { label: "Grupo automovilístico", value: "VW Group" },
    { label: "Países con presencia",  value: "100+" },
    { label: "Primer eléctrico",      value: "2018 (e-tron)" },
  ],
  "bmw": [
    { label: "Año de fundación",      value: "1916" },
    { label: "Primer eléctrico",      value: "2013 (i3)" },
    { label: "Países con presencia",  value: "140+" },
    { label: "Modelos electrificados",value: "25+" },
  ],
  "byd": [
    { label: "Año de fundación",      value: "1995" },
    { label: "Tecnología",            value: "Blade Battery" },
    { label: "Países con presencia",  value: "70+" },
    { label: "Unidades vendidas 2023",value: "3.000.000+" },
  ],
  "changan": [
    { label: "Año de fundación",      value: "1862" },
    { label: "Marcas del grupo",      value: "Deepal, Avatr, Nevo" },
    { label: "Países con presencia",  value: "50+" },
    { label: "Unidades vendidas año", value: "2.000.000+" },
  ],
  "chery": [
    { label: "Año de fundación",      value: "1997" },
    { label: "Marcas del grupo",      value: "Omoda, Jaecoo, Jetour" },
    { label: "Países con presencia",  value: "80+" },
    { label: "Modelos globales",      value: "60+" },
  ],
  "chevrolet": [
    { label: "Año de fundación",      value: "1911" },
    { label: "Grupo automovilístico", value: "General Motors" },
    { label: "Países con presencia",  value: "100+" },
    { label: "Unidades vendidas año", value: "6.000.000+" },
  ],
  "cupra": [
    { label: "Año de fundación",      value: "2018" },
    { label: "Países con presencia",  value: "40+" },
    { label: "Grupo automovilístico", value: "VW Group" },
    { label: "Meta 100% eléctrico",   value: "2030" },
  ],
  "dfsk": [
    { label: "Año de fundación",      value: "2003" },
    { label: "Especialidad",          value: "Furgones y SUVs" },
    { label: "Países con presencia",  value: "30+" },
    { label: "Grupo automovilístico", value: "Sokon Group" },
  ],
  "ds": [
    { label: "Año de fundación",      value: "2015" },
    { label: "Países con presencia",  value: "40+" },
    { label: "Grupo automovilístico", value: "Stellantis" },
    { label: "Meta 100% eléctrico",   value: "2024" },
  ],
  "deepal": [
    { label: "Año de fundación",      value: "2021" },
    { label: "Países con presencia",  value: "20+" },
    { label: "Grupo automovilístico", value: "Changan + CATL" },
    { label: "Tecnología",            value: "100% EV" },
  ],
  "dongfeng": [
    { label: "Año de fundación",      value: "1969" },
    { label: "Alianzas estratégicas", value: "Honda + Nissan" },
    { label: "Países con presencia",  value: "50+" },
    { label: "Unidades vendidas año", value: "2.000.000+" },
  ],
  "fiat": [
    { label: "Año de fundación",      value: "1899" },
    { label: "Historia",              value: "125+ años" },
    { label: "Grupo automovilístico", value: "Stellantis" },
    { label: "Países con presencia",  value: "100+" },
  ],
  "ford": [
    { label: "Año de fundación",      value: "1903" },
    { label: "Historia",              value: "120+ años" },
    { label: "Países con presencia",  value: "125+" },
    { label: "Unidades vendidas año", value: "4.000.000+" },
  ],
  "gac": [
    { label: "Año de fundación",      value: "1997" },
    { label: "Alianzas estratégicas", value: "Toyota + Honda" },
    { label: "Países con presencia",  value: "30+" },
    { label: "Unidades vendidas año", value: "2.400.000+" },
  ],
  "gwm": [
    { label: "Año de fundación",      value: "1984" },
    { label: "Marcas del grupo",      value: "Haval, ORA, Tank" },
    { label: "Países con presencia",  value: "60+" },
    { label: "Unidades vendidas año", value: "1.000.000+" },
  ],
  "geely": [
    { label: "Año de fundación",      value: "1986" },
    { label: "Países con presencia",  value: "40+" },
    { label: "Marcas del grupo",      value: "Volvo, ZEEKR, Lynk&Co" },
    { label: "Unidades vendidas año", value: "2.000.000+" },
  ],
  "haval": [
    { label: "Año de fundación",      value: "2013" },
    { label: "Países con presencia",  value: "60+" },
    { label: "Grupo automovilístico", value: "GWM Group" },
    { label: "Especialidad",          value: "SUV" },
  ],
  "honda": [
    { label: "Año de fundación",      value: "1948" },
    { label: "Meta 100% eléctrico",   value: "2040" },
    { label: "Países con presencia",  value: "150+" },
    { label: "Unidades vendidas año", value: "4.000.000+" },
  ],
  "hyundai": [
    { label: "Año de fundación",      value: "1967" },
    { label: "Marcas del grupo",      value: "Kia + Genesis" },
    { label: "Países con presencia",  value: "200+" },
    { label: "Meta carbono neutro",   value: "2045" },
  ],
  "jac": [
    { label: "Año de fundación",      value: "1964" },
    { label: "Alianza estratégica",   value: "Volkswagen Group" },
    { label: "Países con presencia",  value: "60+" },
    { label: "Historia",              value: "60+ años" },
  ],
  "jmc": [
    { label: "Año de fundación",      value: "1968" },
    { label: "Especialidad",          value: "Furgones y pickups" },
    { label: "Alianza estratégica",   value: "Ford" },
    { label: "Países con presencia",  value: "40+" },
  ],
  "jaecoo": [
    { label: "Año de fundación",      value: "2023" },
    { label: "Países con presencia",  value: "20+" },
    { label: "Grupo automovilístico", value: "Chery Group" },
    { label: "Segmento",              value: "SUV off-road" },
  ],
  "jeep": [
    { label: "Año de fundación",      value: "1943" },
    { label: "Historia",              value: "80+ años" },
    { label: "Grupo automovilístico", value: "Stellantis" },
    { label: "Países con presencia",  value: "100+" },
  ],
  "jetour": [
    { label: "Año de fundación",      value: "2018" },
    { label: "Países con presencia",  value: "30+" },
    { label: "Grupo automovilístico", value: "Chery Group" },
    { label: "Especialidad",          value: "SUV" },
  ],
  "kia": [
    { label: "Año de fundación",      value: "1944" },
    { label: "Meta 100% eléctrico",   value: "2035" },
    { label: "Países con presencia",  value: "190+" },
    { label: "Grupo automovilístico", value: "Hyundai Motor Group" },
  ],
  "leapmotor": [
    { label: "Año de fundación",      value: "2015" },
    { label: "Países con presencia",  value: "30+" },
    { label: "Alianza estratégica",   value: "Stellantis (20%)" },
    { label: "Tecnología",            value: "100% EV" },
  ],
  "lexus": [
    { label: "Año de fundación",      value: "1989" },
    { label: "Países con presencia",  value: "90+" },
    { label: "Grupo automovilístico", value: "Toyota Group" },
    { label: "Meta 100% eléctrico",   value: "2035" },
  ],
  "lynk-co": [
    { label: "Año de fundación",      value: "2016" },
    { label: "Países con presencia",  value: "20+" },
    { label: "Grupo automovilístico", value: "Geely-Volvo" },
    { label: "Tecnología",            value: "Híbrido / EV" },
  ],
  "mg": [
    { label: "Año de fundación",      value: "1924" },
    { label: "Historia",              value: "100+ años" },
    { label: "Grupo automovilístico", value: "SAIC Motor" },
    { label: "Países con presencia",  value: "80+" },
  ],
  "mini": [
    { label: "Año de fundación",      value: "1959" },
    { label: "Grupo automovilístico", value: "BMW Group" },
    { label: "Países con presencia",  value: "100+" },
    { label: "Meta 100% eléctrico",   value: "2030" },
  ],
  "maxus": [
    { label: "Año de fundación",      value: "2011" },
    { label: "Países con presencia",  value: "40+" },
    { label: "Grupo automovilístico", value: "SAIC Motor" },
    { label: "Especialidad",          value: "Vehículos comerciales" },
  ],
  "mazda": [
    { label: "Año de fundación",      value: "1920" },
    { label: "Primer eléctrico",      value: "2020 (MX-30)" },
    { label: "Países con presencia",  value: "130+" },
    { label: "Historia",              value: "104+ años" },
  ],
  "mercedes-benz": [
    { label: "Año de fundación",      value: "1926" },
    { label: "Historia",              value: "130+ años" },
    { label: "Países con presencia",  value: "130+" },
    { label: "Meta 100% eléctrico",   value: "2030" },
  ],
  "nammi": [
    { label: "Año de fundación",      value: "2023" },
    { label: "Grupo automovilístico", value: "BYD Group" },
    { label: "Tecnología",            value: "100% EV" },
    { label: "Segmento",              value: "City Car" },
  ],
  "nissan": [
    { label: "Año de fundación",      value: "1933" },
    { label: "Alianza estratégica",   value: "Renault + Mitsubishi" },
    { label: "Países con presencia",  value: "150+" },
    { label: "Primer EV masivo",      value: "2010 (Leaf)" },
  ],
  "omoda": [
    { label: "Año de fundación",      value: "2022" },
    { label: "Países con presencia",  value: "20+" },
    { label: "Grupo automovilístico", value: "Chery Group" },
    { label: "Segmento",              value: "SUV" },
  ],
  "ora": [
    { label: "Año de fundación",      value: "2018" },
    { label: "Países con presencia",  value: "30+" },
    { label: "Grupo automovilístico", value: "GWM Group" },
    { label: "Tecnología",            value: "100% EV" },
  ],
  "peugeot": [
    { label: "Año de fundación",      value: "1882" },
    { label: "Historia",              value: "140+ años" },
    { label: "Grupo automovilístico", value: "Stellantis" },
    { label: "Países con presencia",  value: "100+" },
  ],
  "porsche": [
    { label: "Año de fundación",      value: "1931" },
    { label: "Primer eléctrico",      value: "2019 (Taycan)" },
    { label: "Países con presencia",  value: "120+" },
    { label: "Grupo automovilístico", value: "VW Group" },
  ],
  "renault": [
    { label: "Año de fundación",      value: "1899" },
    { label: "Alianza estratégica",   value: "Nissan + Mitsubishi" },
    { label: "Países con presencia",  value: "130+" },
    { label: "Unidades vendidas año", value: "2.000.000+" },
  ],
  "riddara": [
    { label: "Año de fundación",      value: "2022" },
    { label: "Países con presencia",  value: "10+" },
    { label: "Tecnología",            value: "100% EV" },
    { label: "Segmento",              value: "Pickup eléctrica" },
  ],
  "skoda": [
    { label: "Año de fundación",      value: "1895" },
    { label: "Historia",              value: "130+ años" },
    { label: "Grupo automovilístico", value: "VW Group" },
    { label: "Primer eléctrico",      value: "2020 (Enyaq)" },
  ],
  "smart": [
    { label: "Año de fundación",      value: "1994" },
    { label: "Países con presencia",  value: "50+" },
    { label: "Propietarios",          value: "Mercedes-Benz + Geely" },
    { label: "100% eléctrico desde",  value: "2020" },
  ],
  "ssangyong": [
    { label: "Año de fundación",      value: "1954" },
    { label: "Historia",              value: "70+ años" },
    { label: "Nombre actual",         value: "KG Mobility" },
    { label: "Países con presencia",  value: "40+" },
  ],
  "subaru": [
    { label: "Año de fundación",      value: "1953" },
    { label: "Tecnología exclusiva",  value: "Motor Boxer" },
    { label: "Países con presencia",  value: "100+" },
    { label: "Distintivo",            value: "AWD simétrico" },
  ],
  "suzuki": [
    { label: "Año de fundación",      value: "1909" },
    { label: "Especialidad",          value: "City cars" },
    { label: "Países con presencia",  value: "200+" },
    { label: "Historia",              value: "115+ años" },
  ],
  "tesla": [
    { label: "Año de fundación",      value: "2003" },
    { label: "Primer EV",             value: "2008 (Roadster)" },
    { label: "Superchargers globales",value: "50.000+" },
    { label: "Unidades vendidas 2023",value: "1.800.000+" },
  ],
  "toyota": [
    { label: "Año de fundación",      value: "1937" },
    { label: "Marcas del grupo",      value: "Lexus, Daihatsu" },
    { label: "Países con presencia",  value: "170+" },
    { label: "Posición global",       value: "N°1 en ventas" },
  ],
  "volkswagen": [
    { label: "Año de fundación",      value: "1937" },
    { label: "Historia",              value: "85+ años" },
    { label: "Marcas del grupo",      value: "12 marcas" },
    { label: "Países con presencia",  value: "150+" },
  ],
  "volvo": [
    { label: "Año de fundación",      value: "1927" },
    { label: "Grupo automovilístico", value: "Geely Group" },
    { label: "Países con presencia",  value: "100+" },
    { label: "Meta 100% eléctrico",   value: "2030" },
  ],
};

async function run() {
  const brands = await client.fetch<{ _id: string; slug: string; name: string }[]>(
    `*[_type == "brand"]{ _id, "slug": slug.current, name }`
  );

  let updated = 0;
  let skipped = 0;

  for (const brand of brands) {
    const stats = BRAND_STATS[brand.slug];
    if (!stats) {
      console.log(`⚠️  Sin datos: ${brand.name} (${brand.slug})`);
      skipped++;
      continue;
    }

    const statsWithKeys = stats.map((s) => ({
      _key:  s.label.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      _type: "stat",
      label: s.label,
      value: s.value,
    }));

    await client.patch(brand._id).set({ stats: statsWithKeys }).commit();
    console.log(`✅ ${brand.name}`);
    updated++;
  }

  console.log(`\nListo: ${updated} actualizadas, ${skipped} sin datos.`);
}

run().catch(console.error);
