// Flujo v2 (creacion de PDP desde el Sheet): de una fila del Sheet al encargo que
// recibe el Managed Agent, y al override de herramientas que lo encierra en una
// sola fuente.
//
// Ver docs/FLUJO-PDP-N8N.md §3 y el board de Miro "FLUJO PDP's" → "Flujo PDP v2".
// R4: marca, modelo, tipo y electrificacion son del humano, y tambien el anio, la URL y las
// versiones cuando los declara. El agente no los cambia; solo extrae, normaliza y redacta (R5).
//
// Desde oct-2026 (pedido de Vicente) anio, URL y versiones son OPCIONALES en el panel:
// - Sin URL, la fuente es el sitio oficial de la marca (`brand.website` en Sanity) y el agente
//   navega dentro de ESE dominio hasta la ficha del modelo. Sigue siendo una sola fuente (R2).
// - Sin versiones, el precio de la PDP es el precio de lista que el agente lee de la fuente CON
//   cita textual (R3), marcado para que una persona lo confirme. Sin cita, la PDP queda sin
//   precio y en "borrador con faltantes". Nunca se publica sola (R6).

export interface FilaSheet {
  marca: string;
  modelo: string;
  /** Opcional desde oct-2026. null/0 = no declarado. */
  anio?: number | null;
  tipo: string;
  electrificacion: string;
  /** Opcional desde oct-2026: vacio = buscar en el sitio oficial de la marca. */
  url_oficial?: string | null;
  /**
   * true cuando `url_oficial` es el sitio de la marca (no la ficha del modelo): el agente tiene
   * que encontrar la ficha navegando ese dominio. Lo pone `validarFila`, no se guarda.
   */
  sitio_marca?: boolean;
  /**
   * El Sheet manda texto: "GLX|24990000, GLS AWD|27490000" (nombre|precio en
   * pesos, sin puntos). El panel manda el arreglo ya armado — así un nombre con
   * coma no rompe nada.
   */
  versiones?: string | VersionDeclarada[] | null;
}

export interface VersionDeclarada {
  nombre: string;
  precio: number;
}

/**
 * Normaliza `versiones` venga como texto (Sheet, CLI) o como arreglo (panel).
 * Tolera espacios, puntos y $ de mas. Lanza con un mensaje accionable.
 */
export function parseVersiones(raw: string | VersionDeclarada[] | null | undefined): VersionDeclarada[] {
  if (Array.isArray(raw)) {
    return raw.map((v, i) => {
      const nombre = String(v?.nombre ?? "").trim();
      const precio = Number(String(v?.precio ?? "").replace(/[^\d]/g, ""));
      if (!nombre) throw new Error(`Version ${i + 1} sin nombre`);
      if (!Number.isFinite(precio) || precio <= 0) throw new Error(`Precio invalido en la version "${nombre}"`);
      return { nombre, precio };
    });
  }
  return String(raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((token) => {
      const i = token.lastIndexOf("|");
      if (i < 0) throw new Error(`Version sin precio: "${token}" (formato: nombre|precio)`);
      const nombre = token.slice(0, i).trim();
      const precio = Number(token.slice(i + 1).replace(/[^\d]/g, ""));
      if (!nombre) throw new Error(`Version sin nombre: "${token}"`);
      if (!Number.isFinite(precio) || precio <= 0) throw new Error(`Precio invalido en "${token}"`);
      return { nombre, precio };
    });
}

/** Host de una URL, sin www. Lanza si la URL no es https. */
export function hostDe(url: string): string {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error(`La fuente tiene que ser https: ${url}`);
  return u.hostname.replace(/^www\./, "");
}

/**
 * Override de `tools` para la sesion: el mismo toolset del agente, pero con
 * `web_fetch` encerrado en el host de la fila (R2 — una sola fuente).
 *
 * Va como `agent_with_overrides` en sessions.create porque los overrides
 * reemplazan el campo ENTERO: hay que repetir el toolset completo, incluido el
 * custom tool, o la sesion se queda sin forma de entregar el resultado.
 */
export function toolsConHost(host: string, entregarPdp?: unknown): unknown[] {
  return [
    {
      type: "agent_toolset_20260401",
      default_config: { enabled: true, permission_policy: { type: "always_allow" } },
      configs: [
        { name: "web_search", enabled: false },
        { name: "web_fetch", enabled: true, allowed_domains: [host], max_content_tokens: 60000 },
      ],
    },
    ...(entregarPdp ? [entregarPdp] : []),
  ];
}

/** El mensaje inicial de la sesion. Todo lo que el agente sabe del auto. */
export function armarEncargo(fila: FilaSheet): string {
  const versiones = parseVersiones(fila.versiones);
  const base = versiones.length
    ? versiones.reduce((a, b) => (b.precio < a.precio ? b : a))
    : null;
  const anio = Number(fila.anio) || null;
  const dominio = fila.url_oficial ? hostDe(fila.url_oficial) : "";

  const lineas = fila.sitio_marca
    ? [
        `Extrae la ficha de este auto. No te damos la pagina del modelo: buscala dentro del sitio oficial de la marca en Chile.`,
        ``,
        `Marca: ${fila.marca}`,
        `Modelo: ${fila.modelo}`,
        anio ? `Ano del modelo: ${anio}` : `Ano del modelo: no declarado (no lo inventes; si la fuente lo publica, mencionalo en \`notas\`).`,
        `Tipo de vehiculo: ${fila.tipo}`,
        `Electrificacion declarada: ${fila.electrificacion}`,
        `Sitio oficial de la marca (punto de partida): ${fila.url_oficial}`,
        ``,
        `Empieza por esa URL y navega con \`web_fetch\` SOLO dentro del dominio ${dominio} (menu de modelos, catalogo, ficha, configurador, precios o PDF de ficha tecnica) hasta la pagina de ESTE modelo. Ningun otro dominio. Si el sitio no tiene este modelo, entrega estado "sin_datos" y dilo en \`motivo\`.`,
        `En \`fuente_leida\` pon la URL de la ficha del modelo que terminaste leyendo (no la home).`,
        ``,
      ]
    : [
        `Extrae la ficha de este auto leyendo UNICAMENTE la URL de abajo.`,
        ``,
        `Marca: ${fila.marca}`,
        `Modelo: ${fila.modelo}`,
        anio ? `Ano del modelo: ${anio}` : `Ano del modelo: no declarado (no lo inventes; si la fuente lo publica, mencionalo en \`notas\`).`,
        `Tipo de vehiculo: ${fila.tipo}`,
        `Electrificacion declarada: ${fila.electrificacion}`,
        `Fuente oficial (la unica que puedes leer): ${fila.url_oficial}`,
        ``,
      ];

  if (versiones.length) {
    lineas.push(
      `Versiones declaradas por el humano (nombre y precio son suyos, no los cambies):`,
      ...versiones.map((v) => `  - ${v.nombre} — $${v.precio.toLocaleString("es-CL")} CLP`),
      ``,
      `Usa "${base!.nombre}" como version base: sus specs van en \`base\`.`,
      versiones.length > 1
        ? `En \`versiones[]\` pon las otras ${versiones.length - 1}, SOLO con los campos que difieren de la base.`
        : `Como hay una sola version, \`versiones\` va vacio.`,
      ``,
    );
  } else {
    lineas.push(
      `El humano no declaro versiones ni precios. Deja \`versiones\` vacio y pon en \`base\` las specs de la version mas economica que publique la fuente.`,
      `Reporta en \`precio_lista_leido\` el precio de lista MAS BAJO que publica la fuente para este modelo (sin bonos ni descuentos), con su cita textual en \`evidencia_precio\`. Sin cita, omite el precio: una persona lo completa.`,
      ``,
    );
  }

  lineas.push(
    `Recorda: sin cita textual en la fuente, el campo se omite (R3). Los precios no los fijas tu: solo los reportas con su cita.`,
    `Termina llamando \`entregar_pdp\` una sola vez.`,
  );

  return lineas.join("\n");
}
