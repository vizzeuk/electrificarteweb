// Flujo v2 (creacion de PDP desde el Sheet): de una fila del Sheet al encargo que
// recibe el Managed Agent, y al override de herramientas que lo encierra en una
// sola fuente.
//
// Ver docs/FLUJO-PDP-N8N.md §3 y el board de Miro "FLUJO PDP's" → "Flujo PDP v2".
// R4: marca, modelo, anio, tipo, electrificacion, URL y versiones son del humano.
// El agente no los cambia; solo extrae, normaliza y redacta (R5).

export interface FilaSheet {
  marca: string;
  modelo: string;
  anio: number;
  tipo: string;
  electrificacion: string;
  url_oficial: string;
  /** "GLX|24990000, GLS AWD|27490000" — nombre|precio en pesos, sin puntos. */
  versiones: string;
}

export interface VersionDeclarada {
  nombre: string;
  precio: number;
}

/** Parte la columna `versiones` del Sheet. Tolera espacios, puntos y $ de mas. */
export function parseVersiones(raw: string): VersionDeclarada[] {
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

  const lineas = [
    `Extrae la ficha de este auto leyendo UNICAMENTE la URL de abajo.`,
    ``,
    `Marca: ${fila.marca}`,
    `Modelo: ${fila.modelo}`,
    `Ano del modelo: ${fila.anio}`,
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
    lineas.push(`El humano no declaro versiones. Deja \`versiones\` vacio y pon todo en \`base\`.`, ``);
  }

  lineas.push(
    `Recorda: sin cita textual en la fuente, el campo se omite (R3). Los precios no los fijas tu.`,
    `Termina llamando \`entregar_pdp\` una sola vez.`,
  );

  return lineas.join("\n");
}
