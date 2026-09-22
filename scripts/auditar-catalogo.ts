/**
 * Auditoría de consistencia del catálogo (docs/FLUJO-PDP-N8N.md).
 *
 *   npx tsx --env-file=.env.local scripts/auditar-catalogo.ts
 *   npx tsx --env-file=.env.local scripts/auditar-catalogo.ts --check versiones-iguales
 *
 * Solo lee y reporta: no escribe nada en Sanity. Las correcciones van en scripts
 * aparte, para que cada una se revise por separado.
 *
 * El catálogo se armó con investigación automática de fetch básico, así que los
 * errores esperables son de lectura, no de tipeo: versiones duplicadas, versiones
 * "superiores" copiadas de la base, precios que no ordenan, y el nombre del modelo
 * arrastrando la versión (que es lo que rompió el calce de URLs en la Fase 0).
 */

import { createClient } from "@sanity/client";
import { writeFileSync } from "node:fs";

const soloCheck = process.argv.includes("--check")
  ? process.argv[process.argv.indexOf("--check") + 1]
  : null;
/** Escribe .context/sheet/REVISAR.tsv para pegarlo como hoja del Sheet. */
const comoTsv = process.argv.includes("--tsv");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

interface Version {
  name?: string;
  price?: number | null;
  discountPrice?: number | null;
  batteryCapacity?: number | null;
  range?: number | null;
  power?: number | null;
  torque?: number | null;
  acceleration?: number | null;
  topSpeed?: number | null;
  traction?: string | null;
  seats?: number | null;
  maxDCChargingPower?: number | null;
  electricRangeKm?: number | null;
  fuelConsumption?: number | null;
}

interface Car {
  id: string;
  name: string;
  brand: string;
  brandId: string;
  slug: string;
  hidden: boolean | null;
  modelYear: number | null;
  basePrice: number | null;
  discountPrice: number | null;
  electricType: string | null;
  vehicleType: string | null;
  range: number | null;
  batteryCapacity: number | null;
  power: number | null;
  versions: Version[] | null;
  sourceUrls: string[] | null;
}

/**
 * "+" se conserva como palabra: sin eso "Max" y "Max+" colapsan al mismo texto y
 * el Geely EX5 EM-i aparecía con una versión duplicada que no existe. En los
 * nombres de versión chilenos el "+" suele ser la diferencia entre dos trims.
 */
const norm = (s: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]/g, "");
const clp = (n?: number | null) => (typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—");

/** Los campos que distinguen una versión de otra. Si coinciden todos, son la misma. */
const SPEC_KEYS: (keyof Version)[] = [
  "batteryCapacity", "range", "power", "torque", "acceleration", "topSpeed",
  "traction", "seats", "maxDCChargingPower", "electricRangeKm", "fuelConsumption",
];

const huella = (v: Version) => SPEC_KEYS.map((k) => v[k] ?? "").join("|");
const tieneSpecs = (v: Version) => SPEC_KEYS.some((k) => v[k] !== null && v[k] !== undefined);

interface Hallazgo {
  check: string;
  gravedad: "alta" | "media" | "baja";
  auto: string;
  detalle: string;
  id?: string;
}

const hallazgos: Hallazgo[] = [];
const add = (check: string, gravedad: Hallazgo["gravedad"], auto: string, detalle: string, id?: string) => {
  if (soloCheck && check !== soloCheck) return;
  hallazgos.push({ check, gravedad, auto, detalle, id });
};

async function main(): Promise<void> {
  const cars = await sanity.fetch<Car[]>(
    `*[_type == "car" && !(_id in path("drafts.**"))] | order(brand->name asc, name asc) {
      "id": _id, name, "brand": brand->name, "brandId": brand->_id, "slug": slug.current,
      hidden, modelYear, basePrice, discountPrice,
      "electricType": electricType->name, "vehicleType": vehicleType->name,
      range, batteryCapacity, power, sourceUrls,
      "versions": versions[]{
        name, price, discountPrice, batteryCapacity, range, power, torque, acceleration,
        topSpeed, traction, seats, maxDCChargingPower, electricRangeKm, fuelConsumption
      }
    }`
  );

  console.log(`\nAuditando ${cars.length} autos (${cars.filter((c) => c.hidden !== true).length} publicados)…\n`);

  // ── 1. PDPs duplicadas ────────────────────────────────────────────────────
  const porNombre = new Map<string, Car[]>();
  for (const c of cars) {
    const k = `${norm(c.brand)}|${norm(c.name)}`;
    porNombre.set(k, [...(porNombre.get(k) ?? []), c]);
  }
  for (const [, grupo] of porNombre) {
    if (grupo.length < 2) continue;
    const estados = grupo.map((g) => `${g.id.slice(0, 12)} (${g.hidden === true ? "oculto" : "publicado"}, ${clp(g.basePrice)})`);
    add("pdp-duplicada", "alta", `${grupo[0].brand} ${grupo[0].name}`,
      `${grupo.length} documentos con la misma marca+modelo: ${estados.join(" · ")}`, grupo[0].id);
  }

  // PDPs distintas de la misma marca con la MISMA ficha técnica. Es el caso que
  // el chequeo por nombre no ve: "E-Kwid" y "Kwid E-TECH" son el mismo Renault
  // (298 km, 26,8 kWh, 65 CV) con dos slugs y dos precios distintos.
  const fichaDeAuto = (c: Car) => {
    const vs = (c.versions ?? []).filter((v) => v?.name && tieneSpecs(v));
    if (!vs.length) return null;
    return [...vs.map(huella)].sort().join("//");
  };
  const porFicha = new Map<string, Car[]>();
  for (const c of cars) {
    const f = fichaDeAuto(c);
    if (!f) continue;
    const k = `${norm(c.brand)}|${f}`;
    porFicha.set(k, [...(porFicha.get(k) ?? []), c]);
  }
  for (const [, grupo] of porFicha) {
    if (grupo.length < 2) continue;
    // Si ya salieron por nombre igual, no se repite el hallazgo.
    if (new Set(grupo.map((g) => norm(g.name))).size === 1) continue;
    const detalle = grupo
      .map((g) => `"${g.name}" (${clp(g.basePrice)}, /${g.slug}${g.hidden === true ? ", oculto" : ""})`)
      .join(" · ");
    add("pdp-misma-ficha", "alta", `${grupo[0].brand} ${grupo[0].name}`,
      `${grupo.length} PDPs de la misma marca con ficha técnica idéntica y nombres distintos: ${detalle}`, grupo[0].id);
  }

  const porSlug = new Map<string, Car[]>();
  for (const c of cars) porSlug.set(c.slug, [...(porSlug.get(c.slug) ?? []), c]);
  for (const [slug, grupo] of porSlug) {
    if (grupo.length < 2) continue;
    add("slug-duplicado", "alta", `${grupo[0].brand} ${grupo[0].name}`,
      `${grupo.length} documentos comparten el slug "${slug}" — solo uno es alcanzable en /auto/${slug}`, grupo[0].id);
  }

  for (const c of cars) {
    const etiqueta = `${c.brand} ${c.name}`;
    const vs = (c.versions ?? []).filter((v) => v?.name);

    // ── 2. Versiones duplicadas dentro del mismo auto ───────────────────────
    const vistos = new Map<string, number>();
    for (const v of vs) {
      const k = norm(v.name!);
      vistos.set(k, (vistos.get(k) ?? 0) + 1);
    }
    for (const [k, n] of vistos) {
      if (n > 1) {
        const nombre = vs.find((v) => norm(v.name!) === k)!.name;
        add("version-duplicada", "alta", etiqueta, `"${nombre}" aparece ${n} veces`, c.id);
      }
    }

    // ── 3. Versiones con specs idénticas ────────────────────────────────────
    // Lo que el usuario describe como "versión superior con las mismas
    // características que la base": el fetch básico copió la ficha de la base
    // en todas las versiones porque la página solo mostraba una tabla.
    const porHuella = new Map<string, Version[]>();
    for (const v of vs) {
      if (!tieneSpecs(v)) continue;
      porHuella.set(huella(v), [...(porHuella.get(huella(v)) ?? []), v]);
    }
    /**
     * Que dos versiones tengan la misma ficha NO siempre es un error: en las
     * gamas chilenas GL y GLX, o Core/Plus/Ultra, son niveles de EQUIPAMIENTO
     * sobre el mismo tren motriz — misma batería, misma potencia. Flagearlas
     * ensuciaba la lista con 30 casos de los que la mayoría estaban bien.
     *
     * Solo es sospechoso cuando el propio NOMBRE dice que el tren motriz difiere:
     * otra capacidad de batería, otra tracción, otra cantidad de motores. Ahí sí
     * es imposible que las specs coincidan.
     */
    const señalTren = (n: string) => {
      const t = norm(n);
      return {
        kwh: (n.match(/(\d+[.,]?\d*)\s*kw/i) ?? [])[1] ?? "",
        traccion: /awd|4wd|4x4|quattro|twin|xdrive|allrad/.test(t) ? "awd"
          : /rwd|fwd|4x2|2wd|single/.test(t) ? "2wd" : "",
        motor: (n.match(/(\d[.,]\d)\s*(?:t|l|tsi|tdi)?/i) ?? [])[1] ?? "",
      };
    };
    for (const [, grupo] of porHuella) {
      if (grupo.length < 2) continue;
      const señales = grupo.map((v) => señalTren(v.name ?? ""));
      const difiere = (k: "kwh" | "traccion" | "motor") =>
        new Set(señales.map((s) => s[k]).filter(Boolean)).size > 1;
      if (!difiere("kwh") && !difiere("traccion") && !difiere("motor")) continue;

      const nombres = grupo.map((v) => `${v.name} (${clp(v.price)})`);
      const porQue = [
        difiere("kwh") && "distinta batería",
        difiere("traccion") && "distinta tracción",
        difiere("motor") && "distinto motor",
      ].filter(Boolean).join(" y ");
      add("versiones-iguales", "alta", etiqueta,
        `${grupo.length} versiones con ficha idéntica pese a declarar ${porQue} en el nombre: ${nombres.join(" · ")}`, c.id);
    }

    // ── 4. Versiones sin ninguna spec ───────────────────────────────────────
    const sinSpecs = vs.filter((v) => !tieneSpecs(v));
    if (sinSpecs.length && sinSpecs.length === vs.length && vs.length > 0) {
      add("versiones-sin-specs", "media", etiqueta,
        `las ${vs.length} versiones están sin una sola spec — solo nombre y precio`, c.id);
    }

    // ── 5. Orden de precios ─────────────────────────────────────────────────
    const conPrecio = vs.filter((v) => typeof v.price === "number" && v.price! > 0);
    for (let i = 1; i < conPrecio.length; i++) {
      const a = conPrecio[i - 1];
      const b = conPrecio[i];
      if (b.price! < a.price!) {
        add("precio-desordenado", "baja", etiqueta,
          `"${b.name}" (${clp(b.price)}) va después de "${a.name}" (${clp(a.price)}) pero cuesta menos`, c.id);
        break;
      }
    }

    // Dos versiones distintas al mismo precio exacto: o son la misma, o falta un dato.
    const porPrecio = new Map<number, Version[]>();
    for (const v of conPrecio) porPrecio.set(v.price!, [...(porPrecio.get(v.price!) ?? []), v]);
    for (const [precio, grupo] of porPrecio) {
      if (grupo.length < 2) continue;
      add("mismo-precio", "media", etiqueta,
        `${grupo.length} versiones al mismo precio exacto (${clp(precio)}): ${grupo.map((v) => v.name).join(" · ")}`, c.id);
    }

    // ── 6. basePrice contra las versiones ───────────────────────────────────
    if (conPrecio.length && typeof c.basePrice === "number") {
      const min = Math.min(...conPrecio.map((v) => v.price!));
      if (c.basePrice !== min) {
        const delta = Math.abs(c.basePrice - min) / min;
        add("baseprice-no-calza", delta > 0.05 ? "alta" : "baja", etiqueta,
          `basePrice ${clp(c.basePrice)} pero la versión más barata es ${clp(min)} (${(delta * 100).toFixed(1)}% de diferencia)`, c.id);
      }
    }

    // ── 7. Precio con descuento mayor que el de lista ───────────────────────
    if (typeof c.discountPrice === "number" && typeof c.basePrice === "number" && c.discountPrice > c.basePrice) {
      add("descuento-invertido", "alta", etiqueta,
        `discountPrice ${clp(c.discountPrice)} es MAYOR que basePrice ${clp(c.basePrice)} — la PDP muestra un "descuento" más caro`, c.id);
    }
    for (const v of vs) {
      if (typeof v.discountPrice === "number" && typeof v.price === "number" && v.discountPrice > v.price) {
        add("descuento-invertido", "alta", etiqueta,
          `versión "${v.name}": descuento ${clp(v.discountPrice)} > precio ${clp(v.price)}`, c.id);
      }
    }

    // ── 8. Precio implausible ───────────────────────────────────────────────
    const PISO = 3_000_000;
    if (typeof c.basePrice === "number" && c.basePrice < PISO) {
      add("precio-implausible", "alta", etiqueta, `basePrice ${clp(c.basePrice)} está bajo el piso de ${clp(PISO)}`, c.id);
    }
    for (const v of conPrecio) {
      if (v.price! < PISO) {
        add("precio-implausible", "alta", etiqueta, `versión "${v.name}" a ${clp(v.price)}, bajo el piso`, c.id);
      }
    }

    // ── 8b. Precios que no son redondos ─────────────────────────────────────
    // En Chile los precios de lista se publican en miles redondos. Un
    // $48.021.708 no lo publicó nadie: salió de convertir UF, o de leer un
    // número que no era el precio. Es la señal más barata de una mala lectura.
    const noRedondo = (n: number) => n % 1000 !== 0;
    if (typeof c.basePrice === "number" && noRedondo(c.basePrice)) {
      add("precio-no-redondo", "media", etiqueta,
        `basePrice ${clp(c.basePrice)} no termina en miles redondos — probable conversión de UF o mala lectura`, c.id);
    }
    const raros = conPrecio.filter((v) => noRedondo(v.price!));
    if (raros.length) {
      add("precio-no-redondo", "media", etiqueta,
        `${raros.length} versión(es) con precio no redondo: ${raros.map((v) => `${v.name} ${clp(v.price)}`).join(" · ")}`, c.id);
    }

    // ── 9. El nombre del modelo arrastra la versión ─────────────────────────
    // Es lo que rompió el calce de URLs: "i4 eDrive40 Gran Coupé" como NOMBRE
    // DEL MODELO. El modelo es "i4"; lo demás es versión.
    if (vs.length === 1 && norm(vs[0].name ?? "") === norm(c.name)) {
      add("version-espejo", "baja", etiqueta,
        `única versión se llama igual que el modelo ("${vs[0].name}") — es un placeholder, no una versión real`, c.id);
    }
    const palabras = c.name.trim().split(/\s+/);
    if (palabras.length >= 3) {
      add("nombre-con-version", "media", etiqueta,
        `el nombre del modelo tiene ${palabras.length} palabras — probablemente incluye la versión`, c.id);
    }
    if (norm(c.name).startsWith(norm(c.brand)) && norm(c.brand).length > 2) {
      add("nombre-con-marca", "media", etiqueta,
        `el nombre del modelo empieza con la marca ("${c.name}") — debería ser solo el modelo`, c.id);
    }

    // ── 10. Sin versiones ───────────────────────────────────────────────────
    if (vs.length === 0) {
      add("sin-versiones", "media", etiqueta, `no tiene ninguna versión cargada`, c.id);
    }

    // ── 11. Electrificación vs. el nombre ───────────────────────────────────
    const n = norm(c.name);
    const et = norm(c.electricType ?? "");
    const diceHibrido = /hibrid|hev|phev|mhev/.test(n);
    const diceElectrico = /electric|\bev\b/.test(n) && !/phev|mhev|hev/.test(n);
    if (diceHibrido && /^(ev|electrico|bev)$/.test(et)) {
      add("electrificacion-contradice", "alta", etiqueta,
        `el nombre dice híbrido pero electricType es "${c.electricType}"`, c.id);
    }
    if (diceElectrico && /phev|hev|mhev/.test(et)) {
      add("electrificacion-contradice", "alta", etiqueta,
        `el nombre dice eléctrico pero electricType es "${c.electricType}"`, c.id);
    }

    // ── 12. Año de modelo ───────────────────────────────────────────────────
    if (c.hidden !== true && !c.modelYear) {
      add("sin-anio", "baja", etiqueta, `publicado sin modelYear`, c.id);
    }
  }

  // ── 13. Marcas que en realidad son familias de otra marca ────────────────
  // El re-check ya lo descubrió en la Fase 0 y vale para el catálogo entero.
  const SUBMARCAS: Record<string, string> = {
    haval: "GWM", ora: "GWM", tank: "GWM", poer: "GWM",
    nammi: "Dongfeng", jaecoo: "Chery", omoda: "Chery",
    deepal: "Changan", avtr: "Changan (Avatr)",
  };
  const marcasPresentes = new Set(cars.map((c) => norm(c.brand)));
  for (const [sub, madre] of Object.entries(SUBMARCAS)) {
    if (!marcasPresentes.has(sub)) continue;
    const n = cars.filter((c) => norm(c.brand) === sub).length;
    add("submarca", "baja", cars.find((c) => norm(c.brand) === sub)!.brand,
      `${n} auto(s). En Chile se vende bajo ${madre} — su sitio propio no existe o redirige`);
  }

  // ── Reporte ───────────────────────────────────────────────────────────────
  const porCheck = new Map<string, Hallazgo[]>();
  for (const h of hallazgos) porCheck.set(h.check, [...(porCheck.get(h.check) ?? []), h]);

  const ORDEN: Hallazgo["gravedad"][] = ["alta", "media", "baja"];
  const color = { alta: "\x1b[31m", media: "\x1b[33m", baja: "\x1b[90m" };

  for (const g of ORDEN) {
    const checks = [...porCheck.entries()].filter(([, hs]) => hs[0].gravedad === g);
    if (!checks.length) continue;
    for (const [check, hs] of checks.sort((a, b) => b[1].length - a[1].length)) {
      console.log(`${color[g]}■ ${check}\x1b[0m  (${hs.length})`);
      for (const h of hs.slice(0, 40)) console.log(`    ${h.auto.padEnd(34)} ${h.detalle}`);
      if (hs.length > 40) console.log(`    … y ${hs.length - 40} más`);
      console.log("");
    }
  }

  if (comoTsv) {
    // Ordenado por gravedad y luego por check, que es el orden en que conviene
    // trabajarlos: primero lo que está mal en el sitio ahora.
    const peso = { alta: 0, media: 1, baja: 2 };
    const filas = [...hallazgos].sort(
      (a, b) => peso[a.gravedad] - peso[b.gravedad] || a.check.localeCompare(b.check) || a.auto.localeCompare(b.auto),
    );
    const celda = (v: string) => (v ?? "").replace(/[\t\r\n]+/g, " ").trim();
    const tsv = [
      ["gravedad", "tipo", "auto", "detalle", "resuelto", "nota"].join("\t"),
      ...filas.map((h) => [h.gravedad, h.check, h.auto, celda(h.detalle), "", ""].join("\t")),
    ].join("\n");
    writeFileSync(".context/sheet/REVISAR.tsv", tsv + "\n");
    console.log(`  → .context/sheet/REVISAR.tsv (${filas.length} filas)\n`);
  }

  console.log(`── ${hallazgos.length} hallazgos ──`);
  for (const g of ORDEN) {
    const n = hallazgos.filter((h) => h.gravedad === g).length;
    if (n) console.log(`  ${g}: ${n}`);
  }
  console.log("");
}

void main();
