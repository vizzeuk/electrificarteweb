/// <reference types="node" />
/**
 * Siembra reseñas APROBADAS de ejemplo en PDPs reales, para mostrarle a Francisco
 * cómo se ve la sección funcionando. Pasan por la tabla real y la vista real —
 * no es UI falsa, es el sistema de verdad con datos de demostración.
 *
 *   npx tsx --env-file=.env.local scripts/qa/seed-reviews-demo.ts            # sembrar
 *   npx tsx --env-file=.env.local scripts/qa/seed-reviews-demo.ts --cleanup  # borrar
 *
 * Todas se marcan con source='demo' y email @demo.electrificarte.test, así que se
 * borran de una sin tocar reseñas reales.
 */
import { createClient } from "@supabase/supabase-js";

const DEMO_SOURCE = "demo";
const DEMO_DOMAIN = "@demo.electrificarte.test";

interface Demo {
  slug: string; brand: string; model: string; year: number;
  first: string; last: string; rating: number; color: string; version: string; body: string;
}

const RESENAS: Demo[] = [
  // ── BYD Dolphin Mini ──
  { slug: "byd-dolphin-mini", brand: "BYD", model: "Dolphin Mini", year: 2025,
    first: "Camila", last: "Rojas", rating: 5, color: "Blanco", version: "GL",
    body: "Lo compré para moverme en Santiago y fue la mejor decisión. Cargo en la noche en casa y con eso me sobra para toda la semana: hago unos 40 km diarios y llego con más de la mitad de batería. Lo que más me sorprendió es lo barato que sale: pasé de gastar $120.000 al mes en bencina a unos $18.000 de luz. Para ciudad es perfecto; para viajes largos hay que planificar las cargas." },
  { slug: "byd-dolphin-mini", brand: "BYD", model: "Dolphin Mini", year: 2025,
    first: "Matías", last: "Fuentes", rating: 4, color: "Gris", version: "GL",
    body: "Muy buen auto por lo que cuesta. La autonomía real en ciudad anda en los 280 km, algo menos de lo que dice la ficha pero igual suficiente. El maletero es chico, ahí está su límite si andas con familia. La pantalla giratoria es entretenida pero el software a veces se demora en partir. Lo volvería a comprar." },

  // ── BYD Song Plus DM-i ──
  { slug: "byd-song-plus-dm-i", brand: "BYD", model: "Song Plus DM-i", year: 2025,
    first: "Rodrigo", last: "Medina", rating: 5, color: "Negro", version: "Flagship",
    body: "El híbrido enchufable me resolvió la duda de si dar el salto al eléctrico puro. Durante la semana ando 100% eléctrico porque cargo en casa, y para salir a la costa el motor bencinero me deja tranquilo. He hecho Santiago–Viña sin pensar en cargadores. El consumo en carretera anda en 5 L/100 km, muy bueno para el tamaño que tiene." },

  // ── Hyundai IONIQ 5 ──
  { slug: "hyundai-ioniq-5", brand: "Hyundai", model: "IONIQ 5", year: 2025,
    first: "Francisca", last: "Soto", rating: 5, color: "Gris Ciment", version: "Long Range AWD",
    body: "Llevo 8 meses y sigue sorprendiéndome. La carga rápida es de otro nivel: en un alto de 18 minutos en ruta pasé de 20% a 80%. El espacio interior es enorme, el piso plano hace la diferencia. Lo único a considerar es que en carretera a 120 km/h el consumo sube harto y la autonomía real cae a unos 380 km. En ciudad rinde muchísimo más." },
  { slug: "hyundai-ioniq-5", brand: "Hyundai", model: "IONIQ 5", year: 2024,
    first: "Andrés", last: "Vergara", rating: 4, color: "Blanco", version: "Long Range RWD",
    body: "Excelente auto, pero hay que ser honesto con la infraestructura: si no tienes dónde cargar en casa, la experiencia cambia mucho. Yo instalé un cargador en el estacionamiento y ahí todo fluye. El V2L para enchufar cosas afuera lo he usado más de lo que pensaba. La terminación interior es impecable." },

  // ── Kia EV6 ──
  { slug: "kia-ev6", brand: "Kia", model: "EV6", year: 2025,
    first: "Valentina", last: "Muñoz", rating: 5, color: "Azul", version: "GT-Line",
    body: "Venía de un SUV bencinero y el cambio fue brutal. La aceleración te empuja contra el asiento y aun así el consumo es bajísimo. Hice Santiago–Concepción con una sola parada de carga de 25 minutos. El maletero es más chico de lo que parece por fuera, es lo único que le critico." },

  // ── Hyundai Tucson Híbrido ──
  { slug: "hyundai-tucson-hibrido", brand: "Hyundai", model: "Tucson Híbrido", year: 2025,
    first: "Jorge", last: "Castillo", rating: 4, color: "Plata", version: "HEV",
    body: "Para quien no quiere complicarse con enchufes, este es el punto medio. No hay que cargarlo nunca, se carga solo, y el consumo bajó de 11 a 6 L/100 km comparado con mi auto anterior del mismo porte. No es el más entretenido de manejar, pero es cómodo, silencioso y confiable para el día a día con niños." },
];

async function main() {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  if (process.argv.includes("--cleanup")) {
    const { data } = await sb.from("reviews").delete().eq("source", DEMO_SOURCE).select("id");
    console.log(`\n🧹 ${data?.length ?? 0} reseñas de demo borradas.\n`);
    return;
  }

  const { data: yaHay } = await sb.from("reviews").select("id").eq("source", DEMO_SOURCE);
  if ((yaHay?.length ?? 0) > 0) {
    console.log(`\n⚠️  Ya hay ${yaHay!.length} reseñas de demo. Corré con --cleanup primero.\n`);
    return;
  }

  const filas = RESENAS.map((r, i) => ({
    first_name: r.first, last_name: r.last,
    email: `demo-${i}${DEMO_DOMAIN}`,
    phone: "+56 900000000",
    rating: r.rating, body: r.body,
    car_slug: r.slug, car_brand: r.brand, car_model: r.model,
    car_year: r.year, car_color: r.color, car_version: r.version,
    status: "aprobada",                 // ya moderadas: se ven de inmediato
    moderated_at: new Date().toISOString(),
    moderated_by: "demo",
    compra_verificada: i % 2 === 0,     // algunas con el sello, para mostrar el badge
    source: DEMO_SOURCE,
  }));

  const { data, error } = await sb.from("reviews").insert(filas).select("car_slug, rating");
  if (error) { console.error("\n✗ " + error.message + "\n"); process.exit(1); }

  const porAuto = new Map<string, number[]>();
  for (const r of data!) {
    porAuto.set(r.car_slug!, [...(porAuto.get(r.car_slug!) ?? []), r.rating]);
  }
  console.log(`\n✅ ${data!.length} reseñas sembradas y APROBADAS:\n`);
  for (const [slug, ratings] of porAuto) {
    const prom = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
    console.log(`   ★${prom}  (${ratings.length})  https://www.electrificarte.com/auto/${slug}`);
  }
  console.log(`\n   Para borrarlas:  npx tsx --env-file=.env.local scripts/qa/seed-reviews-demo.ts --cleanup\n`);
}
main();
