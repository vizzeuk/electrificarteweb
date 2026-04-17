/**
 * Script de importación y limpieza de vehicleType y electricType en Sanity
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/import-types.ts
 *
 * Qué hace:
 *  1. Migra referencias de autos desde IDs duplicados a IDs canónicos
 *  2. Elimina los documentos duplicados/vacíos
 *  3. Actualiza los canónicos con contenido completo
 *  4. Crea los nuevos (Cabriolet)
 */

import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || "",
  useCdn: false,
});

// ─── Mapa de fusiones ────────────────────────────────────────────────────────
// clave: ID a eliminar | valor: ID canónico al que migrar los autos

const VEHICLE_TYPE_MERGES: Record<string, string> = {
  "vehicleType-hatchback": "208f1dc8-c01b-41a0-bffa-7d554c697581", // → Hatchback
  "vehicleType-pick-up":   "ec31b9ff-670e-4656-9f65-943f2a01a772", // → Pickup
};

const ELECTRIC_TYPE_MERGES: Record<string, string> = {
  "electricType-100-electrico":          "efdaf152-e14b-414f-8441-415534cd1f41", // → EV
  "electricType-hibrido-enchufable-phev":"f3e5f1d7-0f89-4efc-b941-39d5f1e3a523", // → PHEV
  "electricType-hibrido-hev":            "55e00600-5524-440c-9db7-b2c9f6c35d1d", // → HEV
  "electricType-autonomia-extendida-reev":"f646ff3a-160a-4932-b5f9-bea10bf8b880",// → EREV
  "electricType-mild-hybrid-mhev":       "34973cc0-ef3d-472d-867b-bc045eca0049", // → MHEV
};

// ─── Contenido de tipos de vehículo ──────────────────────────────────────────

const VEHICLE_TYPES = [
  {
    _id: "5239b59b-3134-4d40-9a21-de121138b961",
    name: "SUV",
    label: "SUV",
    slug: "suv",
    navbarOrder: 1,
    icon: "directions_car",
    heroTagline: "Espacio, versatilidad y potencia eléctrica",
    heroDescription: "Los SUVs eléctricos son el segmento estrella del mercado EV en Chile. Combinan un interior amplio para toda la familia con la eficiencia de la tracción eléctrica, tracción total inteligente y la altura de conducción que te da total dominio de la ruta.",
    metaTitle: "SUVs Eléctricos e Híbridos en Chile | Electrificarte",
    metaDescription: "Encuentra el SUV eléctrico o híbrido perfecto para tu familia. Compara modelos, autonomía y precio al mejor valor del mercado.",
  },
  {
    _id: "a40ea459-3aac-4d6f-b2f3-02beb123444b",
    name: "Sedán",
    label: "Sedán",
    slug: "sedan",
    navbarOrder: 2,
    icon: "directions_car",
    heroTagline: "Elegancia aerodinámica y autonomía de largo alcance",
    heroDescription: "Los sedanes eléctricos representan la cúspide de la eficiencia aerodinámica. Su perfil bajo reduce la resistencia al viento maximizando la autonomía, mientras que su habitáculo refinado ofrece el máximo confort para quienes buscan un auto de representación sin emisiones.",
    metaTitle: "Sedanes Eléctricos e Híbridos en Chile | Electrificarte",
    metaDescription: "Los mejores sedanes eléctricos e híbridos del mercado chileno. Elegancia, autonomía y tecnología al mejor precio.",
  },
  {
    _id: "8cf25bb7-f515-4dcd-b7fe-8c26927ad150",
    name: "City Car",
    label: "City Car",
    slug: "city-car",
    navbarOrder: 3,
    icon: "electric_car",
    heroTagline: "El compañero perfecto para la ciudad",
    heroDescription: "Los City Cars eléctricos son la opción ideal para quienes viven y se mueven en la ciudad. Compactos para estacionar en cualquier lugar, ágiles en el tráfico y con una autonomía perfecta para el uso urbano diario. Además, son los EVs más accesibles del mercado.",
    metaTitle: "City Cars Eléctricos en Chile | Electrificarte",
    metaDescription: "City cars eléctricos compactos para la ciudad. Fáciles de estacionar, económicos y perfectos para el uso urbano diario.",
  },
  {
    _id: "ec31b9ff-670e-4656-9f65-943f2a01a772",
    name: "Pickup",
    label: "Pickup",
    slug: "pickup",
    navbarOrder: 4,
    icon: "local_shipping",
    heroTagline: "Potencia de trabajo, cero emisiones",
    heroDescription: "Las pickups eléctricas e híbridas combinan la capacidad de carga y tracción que necesita el trabajo duro con la tecnología de propulsión del futuro. Torque eléctrico instantáneo para remolcar, sin depender del combustible.",
    metaTitle: "Pickups Eléctricas e Híbridas en Chile | Electrificarte",
    metaDescription: "Pickups eléctricas e híbridas enchufables en Chile. Máxima capacidad de carga con mínimas emisiones.",
  },
  {
    _id: "208f1dc8-c01b-41a0-bffa-7d554c697581",
    name: "Hatchback",
    label: "Hatchback",
    slug: "hatchback",
    navbarOrder: 5,
    icon: "directions_car",
    heroTagline: "Ágil, práctico y 100% eléctrico",
    heroDescription: "Los hatchbacks eléctricos ofrecen la combinación ideal de practicidad urbana y dinamismo de conducción. Con maletero accesible, tamaño manejable y motores eléctricos de carácter deportivo, son el punto de entrada perfecto al mundo de la electromovilidad.",
    metaTitle: "Hatchbacks Eléctricos e Híbridos en Chile | Electrificarte",
    metaDescription: "Los mejores hatchbacks eléctricos e híbridos en Chile. Compactos, ágiles y perfectos para el día a día.",
  },
  {
    _id: "vehicleType-gran-coupe",
    name: "Gran Coupé",
    label: "Gran Coupé",
    slug: "gran-coupe",
    navbarOrder: 6,
    icon: "directions_car",
    heroTagline: "Deportividad premium en cuatro puertas",
    heroDescription: "El Gran Coupé fusiona la silueta deslizante y deportiva de un coupé con la practicidad de cuatro puertas y acceso trasero generoso. Una categoría donde el lujo y el rendimiento eléctrico se expresan sin compromiso estético.",
    metaTitle: "Gran Coupés Eléctricos en Chile | Electrificarte",
    metaDescription: "Gran Coupés eléctricos en Chile. La elegancia de un coupé con la practicidad de cuatro puertas.",
  },
  {
    _id: "vehicleType-suv-coupe",
    name: "SUV Coupé",
    label: "SUV Coupé",
    slug: "suv-coupe",
    navbarOrder: 7,
    icon: "directions_car",
    heroTagline: "La silueta de un coupé, el espacio de un SUV",
    heroDescription: "El SUV Coupé es la expresión más deportiva del segmento todoterreno. Combina la altura y presencia de un SUV con una línea de techo inclinada que le otorga un carácter dinámico único. Estilo y practicidad sin tener que elegir entre uno y otro.",
    metaTitle: "SUV Coupés Eléctricos en Chile | Electrificarte",
    metaDescription: "SUV Coupés eléctricos en Chile. El estilo deportivo de un coupé con la versatilidad de un SUV.",
  },
  {
    _id: "vehicleType-roadster",
    name: "Roadster",
    label: "Roadster",
    slug: "roadster",
    navbarOrder: 8,
    icon: "sports_motorsports",
    heroTagline: "Pura emoción eléctrica a cielo abierto",
    heroDescription: "El Roadster eléctrico es la expresión más pura del rendimiento sin emisiones. Un biplaza descapotable que pone toda la potencia del motor eléctrico al servicio de la conducción más emocionante. Para quienes el placer de conducir no tiene precio.",
    metaTitle: "Roadsters Eléctricos en Chile | Electrificarte",
    metaDescription: "Roadsters eléctricos en Chile. Deportivos descapotables con propulsión 100% eléctrica.",
  },
  {
    // Nuevo
    _id: undefined,
    name: "Cabriolet",
    label: "Cabriolet",
    slug: "cabriolet",
    navbarOrder: 9,
    icon: "wb_sunny",
    heroTagline: "Cielo abierto, emisiones cero",
    heroDescription: "El Cabriolet eléctrico redefine la experiencia de conducir al aire libre. A diferencia del Roadster deportivo, el Cabriolet prioriza el refinamiento y el confort con su techo retráctil, ofreciendo una experiencia premium para dos o cuatro pasajeros sin renunciar a la sostenibilidad.",
    metaTitle: "Cabriolets Eléctricos en Chile | Electrificarte",
    metaDescription: "Cabriolets eléctricos e híbridos en Chile. Disfruta del aire libre con tecnología de propulsión limpia.",
  },
];

// ─── Contenido de tipos eléctricos ───────────────────────────────────────────

const ELECTRIC_TYPES = [
  {
    _id: "efdaf152-e14b-414f-8441-415534cd1f41",
    name: "EV",
    label: "Eléctrico Puro",
    tag: "EV",
    slug: "ev",
    color: "#00E5E5",
    icon: "bolt",
    navbarOrder: 1,
    tagline: "Cero emisiones. Cero compromiso.",
    description: "Un vehículo 100% eléctrico funciona exclusivamente con uno o más motores eléctricos alimentados por una batería de alta capacidad. No tiene motor de combustión, ni tubo de escape, ni aceite de motor. Se carga conectándolo a la red eléctrica, ya sea en casa, en el trabajo o en una estación de carga pública.",
    howItWorks: [
      { icon: "battery_charging_full", title: "Carga la batería", desc: "Conecta el auto a un cargador doméstico (Modo 2) o a una estación pública (CCS/CHAdeMO) para cargar la batería." },
      { icon: "bolt", title: "Motor eléctrico", desc: "Al acelerar, la energía de la batería fluye al motor eléctrico, que convierte electricidad en movimiento con ~95% de eficiencia." },
      { icon: "sync", title: "Frenada regenerativa", desc: "Al frenar o soltar el acelerador, el motor actúa como generador y recupera energía cinética, recargando la batería." },
      { icon: "electric_car", title: "Cero emisiones directas", desc: "Sin motor de combustión, no hay emisiones directas de CO₂, NOx ni partículas finas. Emisiones totales dependen de la matriz eléctrica." },
    ],
    pros: ["Cero emisiones directas", "Costo por km muy bajo (electricidad vs. bencina)", "Mantenimiento mínimo (sin aceite, sin filtros, menos frenos)", "Conducción silenciosa y torque instantáneo", "Puede cargarse en casa durante la noche"],
    cons: ["Requiere planificación en viajes de larga distancia", "La red de carga rápida aún está en expansión en Chile", "El tiempo de carga completa es mayor al repostaje con bencina", "Precio de entrada generalmente mayor al de equivalentes a combustión"],
    idealFor: "Conductores urbanos o suburbanos que recorren menos de 300 km por día y tienen posibilidad de cargar en casa o el trabajo. También ideal para quienes buscan reducir al máximo su costo operativo mensual.",
    metaTitle: "Autos Eléctricos Puros (EV) en Chile | Electrificarte",
    metaDescription: "Catálogo completo de autos 100% eléctricos disponibles en Chile. Compara autonomía, precio y tecnología de carga.",
  },
  {
    _id: "f3e5f1d7-0f89-4efc-b941-39d5f1e3a523",
    name: "PHEV",
    label: "Híbrido Enchufable",
    tag: "PHEV",
    slug: "phev",
    color: "#6366F1",
    icon: "ev_station",
    navbarOrder: 2,
    tagline: "Lo mejor de dos mundos. Sin ansiedad de rango.",
    description: "Un Híbrido Enchufable (PHEV - Plug-in Hybrid Electric Vehicle) combina un motor de combustión interna con un motor eléctrico y una batería más grande que se puede cargar desde la red. Permite recorrer entre 40 y 100 km en modo 100% eléctrico para el uso diario, y usar el motor a combustión como respaldo en viajes largos.",
    howItWorks: [
      { icon: "battery_charging_full", title: "Carga la batería", desc: "Al igual que un EV, el PHEV se enchufar para cargar la batería eléctrica, típicamente en 2-4 horas con un cargador doméstico." },
      { icon: "bolt", title: "Modo eléctrico primero", desc: "Al arrancar usa solo el motor eléctrico. La mayoría de tus trayectos urbanos diarios serán en modo EV, sin consumir bencina." },
      { icon: "local_gas_station", title: "Motor a combustión de respaldo", desc: "Cuando la batería se agota, el motor de combustión toma el control automáticamente, sin interrupciones ni pérdida de potencia." },
      { icon: "sync", title: "Recarga en movimiento", desc: "El frenado regenerativo y el motor a combustión pueden recargar parcialmente la batería mientras conduces." },
    ],
    pros: ["Sin ansiedad de rango: autonomía ilimitada con el motor a combustión", "Uso urbano mayoritariamente eléctrico (ahorro real de bencina)", "Acceso a beneficios de autos eléctricos (TAG, estacionamiento, etc.)", "No requiere infraestructura de carga si se usa solo como híbrido", "Ideal como transición hacia el EV puro"],
    cons: ["Más pesado que un HEV o EV equivalente por tener dos sistemas de propulsión", "Requiere enchufarse para maximizar el ahorro (si no se carga, es menos eficiente que un HEV)", "Mayor precio que un HEV equivalente", "Mantenimiento doble: motor a combustión + sistema eléctrico"],
    idealFor: "Conductores que recorren 40-80 km diarios en ciudad pero ocasionalmente hacen viajes largos o no tienen certeza sobre la disponibilidad de carga. Perfecto como primer paso hacia la electromovilidad sin renunciar a la tranquilidad del respaldo a combustión.",
    metaTitle: "Híbridos Enchufables (PHEV) en Chile | Electrificarte",
    metaDescription: "Autos híbridos enchufables PHEV en Chile. Combina autonomía eléctrica para el día a día con el respaldo de un motor a combustión.",
  },
  {
    _id: "55e00600-5524-440c-9db7-b2c9f6c35d1d",
    name: "HEV",
    label: "Híbrido Clásico",
    tag: "HEV",
    slug: "hev",
    color: "#22C55E",
    icon: "sync_alt",
    navbarOrder: 3,
    tagline: "La electrificación que se recarga sola.",
    description: "Un Híbrido Clásico (HEV - Hybrid Electric Vehicle) combina motor de combustión con motor eléctrico y una batería pequeña que se recarga automáticamente mediante la frenada regenerativa y el propio motor a combustión. NO se enchufa. Consume menos bencina que un auto convencional, pero no puede circular en modo 100% eléctrico en distancias largas.",
    howItWorks: [
      { icon: "sync", title: "Frenada regenerativa", desc: "Cada vez que frenas o sueltas el acelerador, el motor eléctrico recupera energía cinética y la almacena en la batería." },
      { icon: "bolt", title: "Asistencia eléctrica", desc: "En aceleraciones y a bajas velocidades, el motor eléctrico asiste al motor a combustión, reduciendo el consumo de bencina." },
      { icon: "local_gas_station", title: "Motor a combustión principal", desc: "El motor a combustión sigue siendo el principal. El eléctrico es un asistente que mejora la eficiencia en escenarios específicos." },
      { icon: "battery_saver", title: "Sin enchufarse", desc: "La batería se mantiene siempre cargada de forma automática. No necesitas buscar cargadores ni cambiar tus hábitos de conducción." },
    ],
    pros: ["No requiere ningún cambio de hábito (nunca se enchufa)", "Ahorra 20-40% de combustible vs. motor convencional", "Excelente para conducción urbana con mucho frenado", "Menor precio que un PHEV", "Totalmente autosuficiente en zonas sin infraestructura de carga"],
    cons: ["No es 100% eléctrico en ningún momento significativo", "No accede a todos los beneficios legales de los EVs puros", "La batería no es tan grande como un PHEV o EV", "El ahorro de combustible es menor al de un PHEV o EV si se puede cargar"],
    idealFor: "Conductores que buscan reducir su gasto en bencina y emisiones sin cambiar sus hábitos de conducción. Especialmente eficiente en ciudad con mucho tráfico. Ideal para quienes viven lejos de estaciones de carga o hacen muchos viajes de larga distancia.",
    metaTitle: "Híbridos Clásicos (HEV) en Chile | Electrificarte",
    metaDescription: "Autos híbridos HEV en Chile. Ahorra bencina sin enchufarte nunca, con la tecnología híbrida que se recarga sola.",
  },
  {
    _id: "f646ff3a-160a-4932-b5f9-bea10bf8b880",
    name: "EREV",
    label: "Autonomía Extendida",
    tag: "EREV",
    slug: "erev",
    color: "#F59E0B",
    icon: "battery_full",
    navbarOrder: 4,
    tagline: "Las ventajas del EV. El alcance de un convencional.",
    description: "Un vehículo de Autonomía Extendida (EREV - Extended Range Electric Vehicle) es fundamentalmente un auto eléctrico con un pequeño motor de combustión que actúa únicamente como generador de electricidad para la batería. A diferencia del PHEV, el motor a combustión nunca mueve directamente las ruedas: solo genera electricidad para extender la autonomía cuando la batería se agota.",
    howItWorks: [
      { icon: "bolt", title: "Siempre eléctrico", desc: "Las ruedas siempre las mueve el motor eléctrico. La conducción es idéntica a un EV puro: silenciosa, suave y con torque instantáneo." },
      { icon: "battery_charging_full", title: "Carga enchufado", desc: "Como un PHEV o EV, se puede (y debe) enchufar para cargar la batería principal y maximizar el uso en modo eléctrico puro." },
      { icon: "local_gas_station", title: "Generador de respaldo", desc: "Cuando la batería baja del nivel mínimo, el motor a combustión arranca automáticamente como generador para producir electricidad, nunca para mover las ruedas directamente." },
      { icon: "electric_car", title: "Autonomía total extendida", desc: "La combinación de batería cargada y el depósito de combustible puede superar los 1.000 km de autonomía total sin paradas de carga largas." },
    ],
    pros: ["Experiencia de conducción 100% eléctrica siempre", "Autonomía total muy alta (800-1.200 km combinados)", "Elimina la ansiedad de rango definitivamente", "Más eficiente que un PHEV en modo eléctrico", "Ideal para conductores con acceso a carga en casa"],
    cons: ["Tecnología menos masiva que EV o PHEV (menos modelos disponibles)", "El motor a combustión añade peso y complejidad mecánica", "Si no se carga regularmente, el consumo de combustible puede ser alto", "Precio premium respecto a PHEV equivalentes"],
    idealFor: "Conductores que quieren la experiencia de un EV puro pero necesitan tranquilidad absoluta en viajes largos o en zonas con poca infraestructura de carga. También ideal para quienes viven en edificios sin acceso fácil a carga y hacen viajes frecuentes al sur u otras regiones.",
    metaTitle: "Autos de Autonomía Extendida (EREV/REEV) en Chile | Electrificarte",
    metaDescription: "Autos EREV con autonomía extendida en Chile. Conducción 100% eléctrica con respaldo de generador para viajes sin límites.",
  },
  {
    _id: "34973cc0-ef3d-472d-867b-bc045eca0049",
    name: "MHEV",
    label: "Mild Hybrid",
    tag: "MHEV",
    slug: "mhev",
    color: "#84CC16",
    icon: "battery_2_bar",
    navbarOrder: 5,
    tagline: "La electrificación más accesible.",
    description: "Un Mild Hybrid (MHEV - Mild Hybrid Electric Vehicle) usa un alternador-motor eléctrico de 48V que asiste al motor a combustión en las fases de mayor demanda energética. No puede circular en modo 100% eléctrico, pero reduce el consumo de combustible entre un 10% y 20%. Es la forma de electrificación más económica y sencilla.",
    howItWorks: [
      { icon: "battery_2_bar", title: "Sistema de 48V", desc: "Un motor-generador de 48V recupera energía en la frenada y la almacena en una pequeña batería auxiliar, separada de la batería de 12V convencional." },
      { icon: "bolt", title: "Asistencia en aceleración", desc: "Al acelerar, el motor-generador inyecta un pequeño impulso eléctrico al motor de combustión, reduciendo la demanda sobre él y el consumo de combustible." },
      { icon: "power_off", title: "Stop & Start mejorado", desc: "El sistema detiene el motor más eficientemente en paradas y lo rearrancar de forma más suave y rápida que un stop-start convencional." },
      { icon: "sync", title: "Frenada regenerativa básica", desc: "Recupera parte de la energía cinética de frenado para recargar la pequeña batería de 48V, aunque en menor escala que un HEV completo." },
    ],
    pros: ["El precio de entrada más bajo entre los vehículos electrificados", "No requiere enchufarse ni cambiar hábitos", "Reducción real de consumo entre 10-20%", "Tecnología madura y confiable", "Compatible con cualquier red de servicio convencional"],
    cons: ["No puede circular en modo eléctrico puro", "El ahorro de combustible es menor que un HEV completo", "No accede a beneficios legales de autos electrificados en Chile", "La batería de 48V no es intercambiable con cargadores externos"],
    idealFor: "Conductores que buscan un primer paso hacia la electrificación sin cambiar absolutamente nada de su rutina. Buena opción si el presupuesto no alcanza para un HEV o PHEV pero se quiere reducir el gasto en bencina con tecnología probada.",
    metaTitle: "Mild Hybrid (MHEV) en Chile | Electrificarte",
    metaDescription: "Autos Mild Hybrid MHEV en Chile. Electrificación accesible con menor consumo de combustible sin necesidad de enchufarse.",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function migrateCarsField(
  field: "vehicleType" | "electricType",
  fromId: string,
  toId: string
): Promise<number> {
  const cars = await client.fetch(
    `*[_type == "car" && ${field}._ref == $fromId]._id`,
    { fromId }
  );
  if (cars.length === 0) return 0;

  const tx = client.transaction();
  cars.forEach((carId: string) => {
    tx.patch(carId, (p) =>
      p.set({ [field]: { _type: "reference", _ref: toId } })
    );
  });
  await tx.commit();
  return cars.length;
}

async function deleteDoc(id: string): Promise<void> {
  await client.delete(id);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔧 Iniciando limpieza y migración de tipos...\n");

  // 1. Migrar referencias de vehicleType
  console.log("── Migrando tipos de vehículo duplicados ──");
  for (const [fromId, toId] of Object.entries(VEHICLE_TYPE_MERGES)) {
    const count = await migrateCarsField("vehicleType", fromId, toId);
    console.log(`  ✓ vehicleType: ${fromId} → ${toId} (${count} autos migrados)`);
    await deleteDoc(fromId);
    console.log(`  🗑  Eliminado: ${fromId}`);
  }

  // 2. Migrar referencias de electricType
  console.log("\n── Migrando tipos eléctricos duplicados ──");
  for (const [fromId, toId] of Object.entries(ELECTRIC_TYPE_MERGES)) {
    const count = await migrateCarsField("electricType", fromId, toId);
    console.log(`  ✓ electricType: ${fromId} → ${toId} (${count} autos migrados)`);
    await deleteDoc(fromId);
    console.log(`  🗑  Eliminado: ${fromId}`);
  }

  // 3. Actualizar / crear tipos de vehículo
  console.log("\n── Actualizando tipos de vehículo ──");
  for (const vt of VEHICLE_TYPES) {
    const { _id, slug, ...data } = vt;
    const payload = {
      _type: "vehicleType" as const,
      name: data.name,
      slug: { _type: "slug" as const, current: slug },
      label: data.label,
      icon: data.icon,
      navbarOrder: data.navbarOrder,
      heroTagline: data.heroTagline,
      heroDescription: data.heroDescription,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
    };

    if (_id) {
      await client.patch(_id).set(payload).commit();
      console.log(`  ✓ Actualizado: ${data.label} (${_id})`);
    } else {
      const doc = await client.create({ ...payload });
      console.log(`  ✓ Creado: ${data.label} (${doc._id})`);
    }
  }

  // 4. Actualizar tipos eléctricos
  console.log("\n── Actualizando tipos eléctricos ──");
  for (const et of ELECTRIC_TYPES) {
    const { _id, slug, howItWorks, pros, cons, ...data } = et;
    const payload = {
      _type: "electricType" as const,
      name: data.name,
      slug: { _type: "slug" as const, current: slug },
      label: data.label,
      tag: data.tag,
      color: data.color,
      icon: data.icon,
      navbarOrder: data.navbarOrder,
      tagline: data.tagline,
      description: data.description,
      howItWorks: howItWorks.map((s, i) => ({
        _type: "step",
        _key: `step-${i}`,
        icon: s.icon,
        title: s.title,
        desc: s.desc,
      })),
      pros,
      cons,
      idealFor: data.idealFor,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
    };

    await client.patch(_id).set(payload).commit();
    console.log(`  ✓ Actualizado: ${data.label} [${data.tag}] (${_id})`);
  }

  console.log("\n✅ Todo listo.");
  console.log("   Verifica en Sanity Studio que los tipos quedaron bien.");
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
