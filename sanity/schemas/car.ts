import { defineField, defineType, defineArrayMember } from "sanity";

const connectorList = [
  { title: "CCS2",     value: "CCS2" },
  { title: "Type 2 (AC)", value: "Type2" },
  { title: "CHAdeMO",  value: "CHAdeMO" },
  { title: "GB/T",     value: "GBT" },
  { title: "NACS (Tesla)", value: "NACS" },
  { title: "Type 1",   value: "Type1" },
];

const batteryTypeList = [
  { title: "LFP (Litio Ferrofosfato)", value: "LFP" },
  { title: "NMC (Níquel-Manganeso-Cobalto)", value: "NMC" },
  { title: "NCA (Níquel-Cobalto-Aluminio)", value: "NCA" },
  { title: "NMCA", value: "NMCA" },
  { title: "Otra", value: "other" },
];

const versionFields = [
  defineField({ name: "name",        title: "Nombre de versión",         type: "string", validation: (r) => r.required() }),
  defineField({ name: "price",       title: "Precio (CLP)",              type: "number", validation: (r) => r.required().positive() }),
  defineField({ name: "discountPrice", title: "Precio con descuento (CLP)", type: "number" }),
  defineField({ name: "batteryCapacity", title: "Batería (kWh)",         type: "number" }),
  defineField({ name: "batteryType", title: "Tipo de batería",           type: "string", options: { list: batteryTypeList } }),
  defineField({ name: "range",       title: "Autonomía WLTP (km)",       type: "number" }),
  defineField({ name: "electricRangeKm", title: "Autonomía eléctrica (km) — PHEV", type: "number", description: "Solo para PHEV/REEV: kilómetros en modo 100% eléctrico." }),
  defineField({ name: "power",       title: "Potencia (CV/HP)",          type: "number" }),
  defineField({ name: "motorDescription", title: "Motor",                type: "string", description: 'Ej: "2 Motores Eléctricos", "Motor 1.5 GDI + Motor Eléctrico"' }),
  defineField({ name: "torque",      title: "Torque (Nm)",               type: "number" }),
  defineField({ name: "acceleration", title: "0-100 km/h (seg)",         type: "number" }),
  defineField({ name: "topSpeed",    title: "Velocidad máxima (km/h)",   type: "number" }),
  defineField({
    name: "traction", title: "Tracción", type: "string",
    options: { list: [{ title: "FWD - Delantera", value: "FWD" }, { title: "RWD - Trasera", value: "RWD" }, { title: "AWD - Total", value: "AWD" }] },
  }),
  defineField({ name: "transmission", title: "Transmisión",              type: "string", description: 'Ej: "Automática de 1 velocidad", "DCT 7 velocidades"' }),
  defineField({ name: "fuelConsumption", title: "Consumo combustible (L/100km)", type: "number", description: "Solo para HEV/PHEV/MHEV" }),
  defineField({ name: "maxDCChargingPower", title: "Carga DC máxima (kW)", type: "number" }),
  defineField({ name: "maxACChargingPower", title: "Carga AC máxima (kW)", type: "number" }),
  defineField({ name: "connectorType", title: "Conector de carga",       type: "string", options: { list: connectorList } }),
  defineField({ name: "chargeTimeDC", title: "Carga rápida DC",          type: "string", description: 'Ej: "30 min (10-80%)"' }),
  defineField({ name: "chargeTimeAC", title: "Carga AC",                 type: "string", description: 'Ej: "7h (0-100%)"' }),
  defineField({ name: "seats",       title: "Asientos",                  type: "number" }),
  defineField({ name: "seatRows",    title: "Corridas de asientos",      type: "number" }),
  defineField({ name: "trunkCapacity", title: "Maletero (litros)",       type: "number" }),
  defineField({ name: "frunkCapacity", title: "Frunk / maletero delantero (litros)", type: "number" }),
];

export const car = defineType({
  name: "car",
  title: "Auto",
  type: "document",
  groups: [
    { name: "general",  title: "📋 General",            default: true },
    { name: "specs",    title: "⚡ Especificaciones"                   },
    { name: "charging", title: "🔌 Carga"                             },
    { name: "safety",   title: "🛡️ Seguridad"                        },
    { name: "features", title: "✅ Equipamiento"                       },
    { name: "media",    title: "🖼️ Multimedia"                       },
    { name: "deal",     title: "🔥 Ofertas y etiquetas"               },
    { name: "seo",      title: "🔍 SEO"                               },
  ],
  fields: [
    // ─── General ────────────────────────────────────────────────────────────
    defineField({
      name: "name", title: "Nombre del modelo", type: "string",
      group: "general", validation: (r) => r.required(),
      description: 'Ej: "IONIQ 5" (sin la marca)',
    }),
    defineField({
      name: "slug", title: "Slug (URL)", type: "slug",
      options: { source: "name", maxLength: 96 },
      group: "general", validation: (r) => r.required(),
      description: "Se genera automáticamente. Ej: /auto/hyundai-ioniq-5",
    }),
    defineField({
      name: "brand", title: "Marca", type: "reference", to: [{ type: "brand" }],
      group: "general", validation: (r) => r.required(),
    }),
    defineField({
      name: "vehicleType", title: "Tipo de Vehículo", type: "reference", to: [{ type: "vehicleType" }],
      group: "general", validation: (r) => r.required(),
      description: "SUV, Sedán, City Car, etc.",
    }),
    defineField({
      name: "electricType", title: "Tipo Eléctrico", type: "reference", to: [{ type: "electricType" }],
      group: "general", validation: (r) => r.required(),
      description: "EV, PHEV, HEV, EREV o MHEV",
    }),
    defineField({ name: "category", title: "Categoría (legado)", type: "reference", to: [{ type: "category" }], group: "general" }),
    defineField({ name: "modelYear", title: "Año del modelo", type: "number", group: "general", description: "Ej: 2025" }),
    defineField({
      name: "tagline", title: "Tagline corto", type: "string",
      group: "general",
      description: 'Una línea descriptiva. Ej: "El SUV eléctrico más innovador del mercado"',
    }),
    defineField({
      name: "description", title: "Descripción completa", type: "text", rows: 6,
      group: "general",
      description: "Texto largo para la página del auto (PDP). Describe el modelo, plataforma, experiencia.",
    }),

    // ─── Specs ──────────────────────────────────────────────────────────────
    defineField({
      name: "basePrice", title: "Precio lista (CLP)", type: "number",
      group: "specs", validation: (r) => r.required().positive(),
      description: "Precio oficial sin descuentos",
    }),
    defineField({
      name: "discountPrice", title: "Precio con descuento Electrificarte (CLP)", type: "number",
      group: "specs",
      description: "Precio negociado. Si no hay descuento, dejar vacío.",
    }),
    defineField({
      name: "priceNote", title: "Nota de precio", type: "string",
      group: "specs",
      description: 'Ej: "Incluye Bonos", "Precio incluye IVA"',
    }),
    defineField({
      name: "motorDescription", title: "Motor", type: "string",
      group: "specs",
      description: 'Ej: "2 Motores Eléctricos", "Motor 1.5 GDI + Motor Eléctrico"',
    }),
    defineField({
      name: "transmission", title: "Transmisión", type: "string",
      group: "specs",
      description: 'Ej: "Automática de 1 velocidad", "DCT 7 velocidades"',
    }),
    defineField({
      name: "batteryCapacity", title: "Batería (kWh)", type: "number",
      group: "specs",
    }),
    defineField({
      name: "batteryType", title: "Tipo de batería", type: "string",
      group: "specs",
      options: { list: batteryTypeList },
    }),
    defineField({
      name: "range", title: "Autonomía WLTP (km)", type: "number",
      group: "specs",
    }),
    defineField({
      name: "electricRangeKm", title: "Autonomía eléctrica (km) — PHEV/REEV", type: "number",
      group: "specs",
      description: "Solo para PHEV/REEV: kilómetros en modo 100% eléctrico.",
    }),
    defineField({
      name: "fuelConsumption", title: "Consumo combustible (L/100km)", type: "number",
      group: "specs",
      description: "Solo para HEV / PHEV / MHEV",
    }),
    defineField({ name: "power",        title: "Potencia (CV/HP)",         type: "number", group: "specs" }),
    defineField({ name: "torque",       title: "Torque (Nm)",              type: "number", group: "specs" }),
    defineField({ name: "acceleration", title: "0-100 km/h (seg)",         type: "number", group: "specs" }),
    defineField({ name: "topSpeed",     title: "Velocidad máxima (km/h)",  type: "number", group: "specs" }),
    defineField({
      name: "traction", title: "Tracción", type: "string", group: "specs",
      options: { list: [{ title: "Delantera (FWD)", value: "FWD" }, { title: "Trasera (RWD)", value: "RWD" }, { title: "Total (AWD)", value: "AWD" }] },
    }),
    defineField({ name: "seats",           title: "Asientos",                    type: "number", group: "specs" }),
    defineField({ name: "seatRows",        title: "Corridas de asientos",         type: "number", group: "specs" }),
    defineField({ name: "cargo",           title: "Maletero (litros)",           type: "number", group: "specs" }),
    defineField({ name: "frunkCapacity",   title: "Frunk / maletero delantero (litros)", type: "number", group: "specs" }),
    defineField({ name: "groundClearance", title: "Altura al piso (mm)",         type: "number", group: "specs" }),
    defineField({
      name: "warranty", title: "Garantía", type: "string", group: "specs",
      description: 'Ej: "5 años o 200.000 km"',
    }),
    defineField({
      name: "highlight", title: "Punto destacado (comparador)", type: "string", group: "specs",
      description: 'Texto corto para destacar en el comparador. Ej: "Carga ultrarrápida 800V"',
    }),

    // ─── Versions ───────────────────────────────────────────────────────────
    defineField({
      name: "versions", title: "Versiones disponibles", type: "array", group: "specs",
      description: "Agrega las distintas versiones del modelo con sus precios y specs.",
      of: [defineArrayMember({
        type: "object", name: "version", title: "Versión", fields: versionFields,
        preview: {
          select: { title: "name", price: "price" },
          prepare({ title, price }: any) {
            return { title: title || "Sin nombre", subtitle: price ? `$${price.toLocaleString("es-CL")}` : "Sin precio" };
          },
        },
      })],
    }),

    // ─── Charging ───────────────────────────────────────────────────────────
    defineField({
      name: "connectorType", title: "Conector de carga", type: "string", group: "charging",
      options: { list: connectorList },
      description: "Conector principal de carga rápida DC",
    }),
    defineField({
      name: "maxDCChargingPower", title: "Carga DC máxima (kW)", type: "number", group: "charging",
      description: "Potencia máxima aceptada en cargador rápido DC",
    }),
    defineField({
      name: "maxACChargingPower", title: "Carga AC máxima (kW)", type: "number", group: "charging",
      description: "Potencia máxima en carga en corriente alterna",
    }),
    defineField({
      name: "chargeTimeDC", title: "Tiempo carga rápida DC", type: "string", group: "charging",
      description: 'Ej: "18 min (10-80%)"',
    }),
    defineField({
      name: "chargeTimeAC", title: "Tiempo carga AC", type: "string", group: "charging",
      description: 'Ej: "7h (0-100%) con cargador 11kW"',
    }),
    defineField({
      name: "chargeType", title: "Descripción de carga", type: "string", group: "charging",
      description: 'Info adicional. Ej: "800V · CCS2 + AC Type2"',
    }),

    // ─── Safety ─────────────────────────────────────────────────────────────
    defineField({
      name: "euroNcap", title: "Euro NCAP (estrellas)", type: "number", group: "safety",
      description: "Calificación 1-5 estrellas de Euro NCAP",
      validation: (r) => r.min(1).max(5),
    }),
    defineField({
      name: "airbags", title: "Número de airbags", type: "number", group: "safety",
    }),
    defineField({
      name: "safetyFeatures", title: "Seguridad activa y pasiva", type: "array", group: "safety",
      description: 'Ej: "Freno autónomo de emergencia (AEB)", "Control de punto ciego (BSM)", "Lane Keeping"',
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),

    // ─── Equipment ──────────────────────────────────────────────────────────
    defineField({
      name: "techFeatures", title: "Tecnología y conectividad", type: "array", group: "features",
      description: 'Ej: "Pantalla 12.3\\" dual", "Apple CarPlay inalámbrico", "Head-Up Display"',
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "comfortFeatures", title: "Confort e interior", type: "array", group: "features",
      description: 'Ej: "Asientos calefaccionados", "Climatizador bi-zona", "Techo panorámico"',
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),

    // ─── Media ──────────────────────────────────────────────────────────────
    defineField({
      name: "mainImage", title: "Imagen principal", type: "image", group: "media",
      options: { hotspot: true }, validation: (r) => r.required(),
    }),
    defineField({
      name: "gallery", title: "Galería de fotos", type: "array", group: "media",
      description: "Agrega hasta 8-10 fotos del auto",
      of: [defineArrayMember({
        type: "image", options: { hotspot: true },
        fields: [
          defineField({ name: "alt", type: "string", title: "Texto alternativo" }),
          defineField({ name: "caption", type: "string", title: "Leyenda" }),
        ],
      })],
    }),
    defineField({
      name: "videoUrl", title: "Video (YouTube embed URL)", type: "url", group: "media",
      description: 'URL de YouTube. Ej: "https://www.youtube.com/embed/xxxx"',
    }),
    defineField({ name: "videoTitle",    title: "Título del video",   type: "string", group: "media" }),
    defineField({ name: "videoDuration", title: "Duración del video", type: "string", group: "media", description: 'Ej: "12:34"' }),

    // ─── Deal flags ─────────────────────────────────────────────────────────
    defineField({
      name: "isNew", title: "🆕 Nuevo lanzamiento", type: "boolean", group: "deal",
      initialValue: false, description: "Muestra badge NUEVO en tarjetas y listados",
    }),
    defineField({
      name: "isFeatured", title: "⭐ Destacado en Home", type: "boolean", group: "deal",
      initialValue: false, description: "Aparece en la sección de Últimos Lanzamientos del home",
    }),
    defineField({
      name: "isTopSeller", title: "🏆 Más Vendido", type: "boolean", group: "deal",
      initialValue: false, description: "Muestra badge 'Más Vendido' en tarjetas",
    }),
    defineField({
      name: "isHotDeal", title: "🔥 HOT DEAL", type: "boolean", group: "deal",
      initialValue: false, description: "Activa la sección Hot Deal. El auto aparece con precio especial y bono.",
    }),
    defineField({
      name: "hotDealBonusAmount", title: "Monto del bono Hot Deal (CLP)", type: "number",
      group: "deal",
      hidden: ({ document }) => !document?.isHotDeal,
      description: "Bono adicional exclusivo Electrificarte",
    }),
    defineField({
      name: "hotDealExpiry", title: "Vencimiento de la oferta", type: "datetime",
      group: "deal",
      hidden: ({ document }) => !document?.isHotDeal,
    }),

    // ─── SEO ────────────────────────────────────────────────────────────────
    defineField({ name: "metaTitle",       title: "Meta Title",       type: "string",       group: "seo" }),
    defineField({ name: "metaDescription", title: "Meta Description", type: "text", rows: 2, group: "seo" }),
    defineField({
      name: "keywords", title: "Keywords", type: "array", group: "seo",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
  ],
  preview: {
    select: { title: "name", brand: "brand.name", media: "mainImage", isHotDeal: "isHotDeal", isFeatured: "isFeatured" },
    prepare({ title, brand, media, isHotDeal, isFeatured }: any) {
      const badges = [isHotDeal && "🔥", isFeatured && "⭐"].filter(Boolean).join(" ");
      return { title: `${brand || ""} ${title || ""}`.trim(), subtitle: badges || undefined, media };
    },
  },
  orderings: [
    { title: "Precio (menor a mayor)", name: "priceAsc",  by: [{ field: "discountPrice", direction: "asc" }] },
    { title: "Precio (mayor a menor)", name: "priceDesc", by: [{ field: "discountPrice", direction: "desc" }] },
    { title: "Mayor autonomía",        name: "rangeDesc", by: [{ field: "range",          direction: "desc" }] },
    { title: "Nombre A-Z",             name: "nameAsc",   by: [{ field: "name",           direction: "asc" }] },
  ],
});
