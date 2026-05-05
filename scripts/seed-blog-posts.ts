/**
 * Crea los 3 artículos de blog de ejemplo en Sanity.
 * Estos son los mismos posts que aparecen como fallback en BlogPreview.tsx.
 *
 * Uso:  npx tsx --env-file=.env.local scripts/seed-blog-posts.ts
 */

import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "wd30r9b0",
  dataset:   "production",
  apiVersion: "2025-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function key(id: string) { return id; }

function block(text: string, style = "normal", _key = Math.random().toString(36).slice(2)): any {
  return {
    _type: "block",
    _key,
    style,
    markDefs: [],
    children: [{ _type: "span", _key: _key + "s", text, marks: [] }],
  };
}

function h2(text: string) {
  return block(text, "h2", Math.random().toString(36).slice(2));
}

function h3(text: string) {
  return block(text, "h3", Math.random().toString(36).slice(2));
}

function p(text: string) {
  return block(text, "normal", Math.random().toString(36).slice(2));
}

function bullets(items: string[]): any[] {
  return items.map((text) => ({
    _type: "block",
    _key: Math.random().toString(36).slice(2),
    style: "normal",
    listItem: "bullet",
    markDefs: [],
    children: [{ _type: "span", _key: Math.random().toString(36).slice(2), text, marks: [] }],
  }));
}

function numbered(items: string[]): any[] {
  return items.map((text) => ({
    _type: "block",
    _key: Math.random().toString(36).slice(2),
    style: "normal",
    listItem: "number",
    markDefs: [],
    children: [{ _type: "span", _key: Math.random().toString(36).slice(2), text, marks: [] }],
  }));
}

function callout(text: string, type: "info" | "tip" | "warning" = "tip"): any {
  return { _type: "callout", _key: Math.random().toString(36).slice(2), text, type };
}

// ─── Posts ───────────────────────────────────────────────────────────────────

const posts = [
  // ── 1. Guía definitiva ────────────────────────────────────────────────────
  {
    _type: "blogPost",
    title: "Guía definitiva: ¿Cuál auto eléctrico conviene más en Chile en 2025?",
    slug: { _type: "slug", current: "guia-auto-electrico-chile-2025" },
    publishedAt: "2025-03-15T10:00:00Z",
    excerpt: "Comparamos los 10 modelos más vendidos del mercado chileno en precio, autonomía y costo de mantención. Todo lo que necesitas saber antes de decidir.",
    category: "guia-compra",
    readingTime: 8,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["guia", "comparativa", "2025"],
    articleType: "HowTo",
    geoRegions: ["Región Metropolitana"],
    metaTitle: "¿Cuál auto eléctrico conviene más en Chile 2025? Guía completa",
    metaDescription: "Comparamos los 10 EVs más vendidos en Chile: precio, autonomía, costo de carga y mantención. Encuentra el auto eléctrico ideal para tu presupuesto.",
    keywords: ["auto eléctrico Chile", "mejor auto eléctrico 2025", "comparativa EV Chile", "precio auto eléctrico"],
    featuredSnippet: "En 2025, los autos eléctricos más convenientes en Chile son el BYD Yuan Plus (la mejor relación precio-autonomía con 410 km desde $22.890.000), el JAC E30X (la opción más accesible desde $19.590.000) y el Hyundai IONIQ 5 (el mejor en tecnología y garantía). La elección depende de tu presupuesto y uso diario.",
    faqBlock: [
      {
        _key: "faq1",
        _type: "object",
        question: "¿Cuánto cuesta mantener un auto eléctrico en Chile?",
        answer: "El costo de mantención de un auto eléctrico es hasta 3 veces menor que uno a gasolina. No hay cambios de aceite, filtros de aire ni embrague. Solo revisar neumáticos, líquido de frenos y frenos regenerativos cada 30.000–40.000 km. El servicio promedio cuesta entre $50.000 y $120.000 CLP."
      },
      {
        _key: "faq2",
        _type: "object",
        question: "¿Qué auto eléctrico tiene más autonomía en Chile?",
        answer: "En 2025, el Tesla Model 3 Long Range lidera con 629 km de autonomía WLTP. Entre las marcas más vendidas, el BYD Seal ofrece 570 km, seguido del Tesla Model Y con 533 km. Para uso urbano diario, cualquier modelo con más de 300 km es más que suficiente."
      },
      {
        _key: "faq3",
        _type: "object",
        question: "¿Es buen momento para comprar un auto eléctrico en Chile?",
        answer: "Sí. En 2025 los precios han bajado entre un 15% y un 30% vs. 2023, hay más de 40 marcas disponibles, la red de carga rápida supera los 500 puntos a nivel nacional y las garantías de batería llegaron a 8 años en la mayoría de las marcas premium."
      },
    ],
    body: [
      p("El mercado de autos eléctricos en Chile creció un 48% en 2024 y se proyecta que superará las 25.000 unidades vendidas en 2025. Con más de 40 marcas y 120 modelos disponibles, elegir puede ser abrumador. Esta guía te entrega los criterios clave y los modelos que más convienen según tu perfil."),

      h2("Los 5 factores clave para elegir un auto eléctrico en Chile"),

      p("Antes de ver modelos concretos, debes evaluar estos cinco factores según tu situación personal:"),

      bullets([
        "Autonomía real vs. declarada: los fabricantes publican cifras WLTP que suelen reducirse un 15–25% en uso real en Santiago. Siempre pregunta por la autonomía real en ciclo urbano.",
        "Infraestructura de carga en tu zona: si vives en un departamento sin carga en el estacionamiento, necesitarás un auto con mayor autonomía para cargar solo en electrolineras.",
        "Garantía de batería: busca mínimo 8 años o 160.000 km. BYD, Hyundai y Kia ofrecen las mejores garantías del mercado chileno.",
        "Red de servicio técnico: las marcas chinas más nuevas pueden tener red limitada fuera de Santiago. Considera esto si vives en regiones.",
        "Precio de reventa: Tesla, Hyundai y BYD tienen la mejor retención de valor en el mercado chileno según datos de portales de usados.",
      ]),

      h2("Top 5 autos eléctricos más convenientes en Chile 2025"),

      h3("1. BYD Yuan Plus — Mejor relación precio-autonomía"),
      p("Con 410 km de autonomía real y un precio con descuento de $22.890.000 CLP, el Yuan Plus es el punto dulce del mercado. Batería de 60 kWh con garantía de 8 años, carga rápida DC de 80 kW que carga del 10% al 80% en 45 minutos. Ideal para familias jóvenes y uso mixto ciudad-carretera."),

      h3("2. JAC E30X — La puerta de entrada más accesible"),
      p("Desde $19.590.000 CLP, el E30X es el eléctrico más económico con acabados dignos del mercado chileno. Sus 322 km de autonomía son suficientes para el 95% de los conductores urbanos que recorren menos de 80 km diarios. La garantía de batería es de 8 años."),

      h3("3. Hyundai IONIQ 5 — La mejor tecnología y garantía"),
      p("A $44.990.000 CLP, el IONIQ 5 justifica su precio con carga ultra-rápida de 800V (0–80% en 18 minutos), plataforma E-GMP exclusiva para eléctricos, y la mejor garantía del mercado: 5 años en el vehículo y 8 años en la batería. Para quienes buscan la mejor experiencia sin compromisos."),

      h3("4. BYD Seal — El sedán que destrona al Tesla"),
      p("570 km de autonomía, diseño coupé ejecutivo y tracción trasera o AWD desde $35.990.000 CLP. La plataforma CTB integra la batería en la estructura del piso, bajando el centro de gravedad y mejorando la rigidez torsional. El rival directo del Tesla Model 3 a menor precio."),

      h3("5. MG Marvel R — El SUV eléctrico con más equipamiento por precio"),
      p("A $29.390.000 CLP, el Marvel R ofrece pantalla de 19 pulgadas, tracción en las 4 ruedas, 402 km de autonomía y Autopilot incluido de serie. Si buscas SUV con buen equipamiento y presupuesto acotado, esta es tu opción."),

      callout("Consejo Electrificarte: Si no sabes cuánto vas a usar el auto, empieza calculando tus kilómetros mensuales. La regla de oro es tener al menos el doble de tu recorrido diario en autonomía para ir con comodidad sin depender de la carga pública.", "tip"),

      h2("¿Cómo comprar un auto eléctrico al mejor precio en Chile?"),

      p("El precio de lista rara vez es el precio real. En Electrificarte negociamos directamente con la red de concesionarios para conseguir el mejor precio del mercado. Nuestro proceso es simple:"),

      numbered([
        "Nos indicas el modelo que te interesa y tu presupuesto.",
        "Consultamos a toda nuestra red de concesionarios simultáneamente.",
        "Te presentamos la mejor oferta en menos de 24 horas.",
        "Si no ahorras al menos $500.000 CLP vs. el precio de lista, no te cobramos nada.",
      ]),

      callout("Nuestro ahorro promedio por cliente es de $4.200.000 CLP. El máximo registrado fue de $8.500.000 CLP en un Tesla Model Y negociado en diciembre de 2024.", "info"),

      h2("Conclusión"),

      p("El mejor auto eléctrico para ti depende de tu presupuesto, tus kilómetros diarios y qué tanto valoras la tecnología vs. el precio. No existe una respuesta única, pero con esta guía tienes los criterios para tomar una decisión informada. Si quieres que te ayudemos a negociar el mejor precio, ingresa tu solicitud en Electrificarte y te respondemos en 24 horas."),
    ],
  },

  // ── 2. Costo de carga ─────────────────────────────────────────────────────
  {
    _type: "blogPost",
    title: "¿Cuánto cuesta cargar un auto eléctrico en Chile? Cálculo real",
    slug: { _type: "slug", current: "costo-carga-auto-electrico-chile" },
    publishedAt: "2025-02-28T10:00:00Z",
    excerpt: "Analizamos el costo por kilómetro de los principales EVs vs gasolina. Los números te van a sorprender: hasta 5 veces más barato en uso diario.",
    category: "ahorro",
    readingTime: 5,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["ahorro", "carga", "costos"],
    articleType: "Article",
    geoRegions: ["Región Metropolitana", "Valparaíso", "Biobío"],
    metaTitle: "¿Cuánto cuesta cargar un auto eléctrico en Chile? Cálculo 2025",
    metaDescription: "Calculamos el costo real por kilómetro de cargar un auto eléctrico en Chile vs gasolina 95. Datos reales de tarifa eléctrica y consumo en 2025.",
    keywords: ["costo carga auto eléctrico Chile", "tarifa eléctrica Chile", "costo por km EV", "cargar auto eléctrico precio"],
    featuredSnippet: "Cargar un auto eléctrico en Chile cuesta entre $25 y $45 CLP por kilómetro recorrido, dependiendo de si cargas en casa (tarifa eléctrica residencial ~$130/kWh) o en electrolinera pública (~$250–400/kWh). Un auto a gasolina 95 cuesta entre $100 y $140 CLP por kilómetro, lo que hace al EV entre 3 y 5 veces más económico en combustible.",
    faqBlock: [
      {
        _key: "faq1",
        _type: "object",
        question: "¿Cuánto cuesta cargar un auto eléctrico desde 0% a 100% en casa?",
        answer: "Depende del tamaño de la batería. Un BYD Yuan Plus de 60 kWh cuesta aproximadamente $7.800 CLP en carga completa (60 kWh × $130/kWh tarifa residencial nocturna). Un Tesla Model Y de 75 kWh cuesta unos $9.750 CLP. La mayoría de los usuarios carga de noche con tarifa reducida."
      },
      {
        _key: "faq2",
        _type: "object",
        question: "¿Cuánto cuesta usar una electrolinera pública en Chile?",
        answer: "Las electrolineras públicas en Chile cobran entre $250 y $400 CLP por kWh. Una carga rápida del 20% al 80% (unos 45 kWh en un SUV mediano) cuesta entre $11.250 y $18.000 CLP. Las redes más extendidas son Copec Voltex, Enel X Way y Zunder."
      },
      {
        _key: "faq3",
        _type: "object",
        question: "¿Conviene instalar un Wallbox en casa?",
        answer: "Sí, si tienes estacionamiento propio. Un Wallbox de 7.4 kW carga la mayoría de los autos en 6–10 horas (carga nocturna completa). El costo de instalación varía entre $350.000 y $600.000 CLP incluyendo el equipo y mano de obra. El retorno de inversión es de 8–14 meses vs. usar electrolineras públicas."
      },
    ],
    body: [
      p("Una de las preguntas más frecuentes que recibimos en Electrificarte es: ¿realmente es tan barato cargar un auto eléctrico? La respuesta corta es sí, y vamos a demostrarlo con números reales del mercado chileno de 2025."),

      h2("El costo de la electricidad en Chile (2025)"),

      p("La tarifa eléctrica residencial en Chile varía según distribuidora y zona, pero en la Región Metropolitana oscila entre $120 y $145 CLP por kWh en horario normal. Las tarifas con discriminación horaria (TDD) permiten cargar de noche desde las 23:00 a las 07:00 hrs a una tarifa reducida de aproximadamente $95–110 CLP/kWh."),

      callout("Consejo: Si instalas un Wallbox con temporizador, puedes programar la carga nocturna y ahorrar entre un 25% y un 35% adicional en el costo por kilómetro.", "tip"),

      h2("Costo por kilómetro: EV vs gasolina"),

      p("Usemos un ejemplo concreto: conductor que recorre 1.500 km al mes en Santiago."),

      h3("Auto eléctrico: BYD Yuan Plus (60 kWh, 410 km autonomía)"),
      bullets([
        "Consumo real: ~17 kWh / 100 km",
        "Para 1.500 km necesitas: 255 kWh",
        "Costo cargando en casa (tarifa normal $130/kWh): $33.150 CLP",
        "Costo cargando en casa (tarifa nocturna $100/kWh): $25.500 CLP",
        "Costo por km: entre $17 y $22 CLP/km",
      ]),

      h3("Auto a gasolina equivalente: Toyota RAV4 2.0L"),
      bullets([
        "Consumo real: ~10 L/100 km en ciclo mixto",
        "Para 1.500 km necesitas: 150 litros",
        "Precio gasolina 95 en marzo 2025: ~$1.170 CLP/L",
        "Costo total: $175.500 CLP al mes",
        "Costo por km: $117 CLP/km",
      ]),

      callout("Resultado: el BYD Yuan Plus cuesta entre $25.500 y $33.150 al mes en energía vs. $175.500 de un RAV4 equivalente. El ahorro mensual es de entre $142.000 y $150.000 CLP, es decir, más de $1.700.000 CLP al año solo en combustible.", "info"),

      h2("Comparativa completa de 5 modelos populares"),

      p("La siguiente tabla muestra el costo mensual de energía para 1.500 km recorridos con tarifa eléctrica residencial normal de $130/kWh:"),

      bullets([
        "BYD Yuan Plus (60 kWh / 410 km): ~$33.150 CLP/mes",
        "Hyundai IONIQ 5 (77 kWh / 481 km): ~$40.560 CLP/mes",
        "Tesla Model 3 SR (60 kWh / 430 km): ~$35.100 CLP/mes",
        "BYD Seal (82 kWh / 570 km): ~$34.320 CLP/mes",
        "MG Marvel R (70 kWh / 402 km): ~$38.220 CLP/mes",
      ]),

      p("En comparación, un auto a gasolina con consumo promedio de 9–11 L/100 km gasta entre $157.000 y $193.000 CLP al mes con los precios actuales de la bencina 95."),

      h2("¿Cuánto ahorro en total al cambiarme al eléctrico?"),

      p("Considerando solo el ahorro en combustible (sin contar mantención, que también es menor en un EV):"),

      bullets([
        "Ahorro mensual promedio: $130.000–$155.000 CLP",
        "Ahorro anual: $1.560.000–$1.860.000 CLP",
        "Ahorro en 5 años: $7.800.000–$9.300.000 CLP",
        "Ahorro en 10 años: $15.600.000–$18.600.000 CLP",
      ]),

      callout("Si sumas el ahorro en mantención (sin cambios de aceite, menos desgaste de frenos, sin bujías), el ahorro real en 10 años supera los $22.000.000 CLP para la mayoría de los conductores chilenos.", "info"),

      h2("Opciones de carga en Chile"),

      h3("1. Carga en casa (Nivel 1 — enchufe normal 220V)"),
      p("Velocidad: 8–12 km/hora de carga. Suficiente para conductores que recorren menos de 50 km diarios si cargan toda la noche. No requiere instalación especial, pero es la opción más lenta."),

      h3("2. Wallbox doméstico (Nivel 2 — 7.4 kW)"),
      p("Velocidad: 50–70 km/hora de carga. Carga completa en 6–10 horas. Es la opción más recomendada para uso doméstico. Costo de instalación: $350.000–$600.000 CLP."),

      h3("3. Electrolineras públicas (DC Fast Charging)"),
      p("Velocidad: 100–350 km en 30–45 minutos (dependiendo del modelo del auto y potencia del cargador). Redes disponibles: Copec Voltex (más de 200 puntos), Enel X Way, Zunder, y Electromaps. Costo: $250–$400 CLP/kWh."),

      h2("Conclusión"),

      p("Los números son claros: cargar un auto eléctrico en Chile es entre 3 y 5 veces más barato que llenar el estanque de un auto a gasolina equivalente. El ahorro en combustible solo amortiza el costo inicial de un EV en 5–7 años para la mayoría de los compradores. Si estás considerando el cambio, en Electrificarte podemos ayudarte a encontrar el modelo que más se ajusta a tu presupuesto y hábitos de manejo."),
    ],
  },

  // ── 3. BYD vs Hyundai vs MG ───────────────────────────────────────────────
  {
    _type: "blogPost",
    title: "BYD vs Hyundai vs MG: ¿qué marca eléctrica gana en Chile?",
    slug: { _type: "slug", current: "byd-vs-hyundai-vs-mg-chile" },
    publishedAt: "2025-02-10T10:00:00Z",
    excerpt: "Las tres marcas dominan el mercado eléctrico chileno. Analizamos garantía, red de servicio, precio y tecnología para que elijas con información.",
    category: "comparativa",
    readingTime: 7,
    author: { name: "Equipo Electrificarte", role: "Experto en electromovilidad" },
    tags: ["BYD", "Hyundai", "MG", "comparativa"],
    articleType: "ComparisonArticle",
    geoRegions: ["Región Metropolitana", "Valparaíso", "Biobío"],
    metaTitle: "BYD vs Hyundai vs MG eléctrico en Chile 2025 — ¿Cuál comprar?",
    metaDescription: "Comparativa completa entre BYD, Hyundai y MG en el mercado eléctrico chileno. Analizamos precios, garantías, red de servicio y tecnología en 2025.",
    keywords: ["BYD Chile", "Hyundai eléctrico Chile", "MG eléctrico Chile", "mejor marca eléctrica Chile 2025"],
    featuredSnippet: "BYD gana en precio y volumen de modelos disponibles; Hyundai lidera en tecnología, garantía y experiencia de conducción; MG ofrece el mejor equipamiento de serie por precio. En Chile 2025, BYD es la marca más vendida con un 34% de cuota de mercado EV, seguida de MG (19%) e Hyundai (14%).",
    faqBlock: [
      {
        _key: "faq1",
        _type: "object",
        question: "¿Qué marca eléctrica tiene mejor garantía en Chile?",
        answer: "Hyundai y Kia ofrecen la mejor garantía: 5 años en el vehículo y 8 años o 160.000 km en la batería. BYD también ofrece 8 años en batería pero 3 años en el vehículo para sus modelos de entrada. MG tiene 5 años de garantía general con 8 años en batería para todos sus modelos."
      },
      {
        _key: "faq2",
        _type: "object",
        question: "¿Cuál es la marca eléctrica más vendida en Chile en 2025?",
        answer: "BYD lidera el mercado eléctrico chileno con una participación del 34% en ventas de enero–diciembre 2024. Le siguen MG (19%), Hyundai (14%), Kia (9%) y Tesla (7%). BYD vende modelos desde los $19 millones hasta los $55 millones, lo que le permite cubrir todos los segmentos."
      },
      {
        _key: "faq3",
        _type: "object",
        question: "¿Tiene BYD buena red de servicio técnico en Chile?",
        answer: "Sí. BYD cuenta con más de 35 talleres autorizados en Chile al 2025, distribuidos en 12 regiones. En Santiago tiene 9 puntos de servicio. Los tiempos de atención mejoraron significativamente vs. 2022–2023 y la disponibilidad de repuestos es buena para los modelos más vendidos como Atto 3, Yuan Plus y Seal."
      },
    ],
    body: [
      p("BYD, Hyundai y MG concentran juntos el 67% de las ventas de autos eléctricos en Chile. Si estás considerando comprar un EV, es muy probable que alguno de estos tres modelos esté en tu lista. Esta comparativa analiza los factores que más importan para la decisión de compra en el mercado chileno."),

      h2("Resumen ejecutivo: ¿quién gana en cada categoría?"),

      bullets([
        "Precio de entrada: BYD (Yuan Plus desde $22.890.000) > MG (ZS EV desde $24.990.000) > Hyundai (Kona Electric desde $29.990.000)",
        "Tecnología: Hyundai (plataforma E-GMP, carga 800V) > BYD (plataforma CTB, V2L) > MG (plataforma estándar, funcional)",
        "Garantía: Hyundai = MG (8 años batería, 5 vehículo) > BYD (8 años batería, 3–5 vehículo según modelo)",
        "Red de servicio: Hyundai (más de 60 puntos) > BYD (más de 35 puntos) > MG (más de 25 puntos)",
        "Variedad de modelos: BYD (12 modelos EV disponibles) > MG (6 modelos) > Hyundai (4 modelos pure EV)",
        "Retención de valor (resventa): Hyundai > Tesla > BYD > MG (según datos Yapo/Chileautos 2024)",
      ]),

      h2("BYD en Chile: volumen, precio y tecnología propia"),

      p("BYD (Build Your Dreams) es el fabricante de baterías y autos eléctricos más grande del mundo. En Chile opera con más de 12 modelos que cubren todos los segmentos, desde el pequeño Dolphin hasta el SUV premium Tang. Su principal ventaja es la integración vertical: fabrican sus propias baterías LFP (hierro-litio), lo que reduce costos y mejora la confiabilidad a largo plazo."),

      h3("Lo que más nos gusta de BYD"),
      bullets([
        "Batería LFP: más segura, sin riesgo de incendio térmico, mayor vida útil (3.000+ ciclos vs. 1.500 de las NCM)",
        "Plataforma CTB (Cell to Body): integra la batería en la carrocería, bajando el centro de gravedad",
        "V2L (Vehicle to Load): en varios modelos puedes alimentar electrodomésticos desde el auto",
        "DiLink: sistema de infoentretenimiento con pantalla giratoria en algunos modelos",
        "Precio competitivo en todos los segmentos",
      ]),

      h3("Lo que debes considerar"),
      bullets([
        "Red de servicio más pequeña que Hyundai, aunque creciendo rápido",
        "Los modelos más populares (Atto 3, Yuan Plus) pueden tener espera de 2–4 meses",
        "Interfaz de software menos pulida que Hyundai en algunos modelos de entrada",
      ]),

      h2("Hyundai en Chile: la experiencia premium sin marca de lujo"),

      p("Hyundai invirtió más de USD 7.400 millones en su plataforma E-GMP exclusiva para vehículos eléctricos. El resultado es una experiencia de conducción superior: el IONIQ 5 y IONIQ 6 cargan a 800V (los únicos en este rango de precio), lo que significa pasar de 10% a 80% en menos de 20 minutos en un cargador compatible."),

      h3("Lo que más nos gusta de Hyundai"),
      bullets([
        "Carga ultra-rápida de 800V: única en su categoría de precio en Chile",
        "V2L de serie en todos los IONIQ 5 e IONIQ 6",
        "Mejor garantía del mercado: 5 años vehículo, 8 años batería, sin condiciones",
        "Red de servicio más amplia del segmento premium EV en Chile",
        "Mayor retención de valor en el mercado de usados",
      ]),

      h3("Lo que debes considerar"),
      bullets([
        "Precio más alto: los modelos de entrada parten en $29.990.000 vs. $22.890.000 de BYD",
        "Gama más reducida (4 modelos pure EV) vs. BYD o MG",
        "El IONIQ 5 no se actualiza con frecuencia — el modelo 2025 tiene cambios menores",
      ]),

      h2("MG en Chile: máximo equipamiento al menor precio"),

      p("MG (propiedad de SAIC Motor, China) se ha posicionado como la marca que ofrece el mayor equipamiento de serie por peso. Su ZS EV tiene pantalla de 10 pulgadas, cámara de 360°, asistentes de manejo y tapicería cuero de fábrica en versiones que cuestan menos de $28.000.000 CLP. Para quienes comparan hojas de especificaciones, MG suele ganar en papel."),

      h3("Lo que más nos gusta de MG"),
      bullets([
        "Mejor equipamiento de serie por precio del mercado chileno",
        "El Marvel R ofrece AWD (tracción 4 ruedas) a un precio donde otros solo ofrecen RWD",
        "Diseño moderno y agresivo que gusta en el mercado local",
        "Garantía de 8 años en batería en todos los modelos",
      ]),

      h3("Lo que debes considerar"),
      bullets([
        "Red de servicio más reducida que BYD o Hyundai fuera de Santiago",
        "La calidad de materiales interiores es correcta pero no destaca vs. Hyundai",
        "Menor variedad de opciones de configuración vs. BYD",
      ]),

      callout("En Electrificarte hemos procesado más de 500 solicitudes de compra en 2024. Los modelos más solicitados fueron BYD Yuan Plus (28%), MG Marvel R (18%), Hyundai IONIQ 5 (17%) y BYD Seal (14%). El ahorro promedio negociado fue de $4.200.000 CLP sobre el precio de lista.", "info"),

      h2("¿Cuál deberías elegir?"),

      h3("Elige BYD si..."),
      bullets([
        "Quieres el mejor precio por kilómetro de autonomía",
        "Prefieres la tecnología de batería LFP para mayor durabilidad",
        "Necesitas variedad: BYD tiene eléctricos desde $19M hasta $55M",
        "Te interesa el V2L para acampar o emergencias",
      ]),

      h3("Elige Hyundai si..."),
      bullets([
        "La velocidad de carga es prioritaria para ti (viajes frecuentes)",
        "Valoras la garantía más sólida y la red de servicio más amplia",
        "Planeas mantener el auto 8–10 años y te importa la retención de valor",
        "Tienes presupuesto sobre $40.000.000 CLP",
      ]),

      h3("Elige MG si..."),
      bullets([
        "Buscas máximo equipamiento visual y tecnológico a bajo precio",
        "El diseño y las prestaciones en papel son tu criterio principal",
        "Tu presupuesto es de $24.000.000–$32.000.000 CLP",
        "Vives en Santiago y tienes acceso a servicio técnico cercano",
      ]),

      h2("Conclusión"),

      p("No hay una respuesta universal: las tres marcas son buenas opciones dependiendo de tu perfil. Si tienes dudas, en Electrificarte te ayudamos a comparar modelos específicos según tus necesidades y a negociar el mejor precio disponible en el mercado chileno. Haz tu solicitud y te respondemos en menos de 24 horas."),
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  for (const post of posts) {
    const slug = (post.slug as any).current;

    // Check if already exists
    const existing = await client.fetch(
      `*[_type == "blogPost" && slug.current == $slug][0]._id`,
      { slug }
    );

    if (existing) {
      console.log(`⚠️  Ya existe: "${post.title}" — omitiendo.`);
      continue;
    }

    const result = await client.create(post as any);
    console.log(`✅  Creado: "${post.title}" (_id: ${result._id})`);
  }

  console.log("\nListo. Revisa los posts en https://electrificarte.sanity.studio/");
}

main().catch((err) => { console.error(err); process.exit(1); });
