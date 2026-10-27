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

import { esFileId, FICHA_RUTA, fichaVersionRuta, nombreFicha } from "./ficha";

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
  /**
   * true cuando la solicitud trae ficha tecnica (PDF) y la sesion la monta en FICHA_RUTA. No se
   * guarda: lo pone quien abre la sesion.
   */
  ficha?: boolean;
}

export interface VersionDeclarada {
  nombre: string;
  /** Precio de lista (el mas alto que publica la marca). */
  precio: number;
  /**
   * Precio con bonos y/o financiamiento (el mas bajo), opcional (oct-2026). Lo declara el humano
   * como el de lista (R4); sin el, la PDP usa el que el agente lea de la fuente con su cita.
   */
  precio_financiamiento?: number;
  /**
   * Carroceria y electrificacion de la version, SOLO si difieren de las del modelo (ej. DS 3
   * Hybrid + DS 3 E-Tense). Ausentes = las del modelo. Las declara el humano (R4), como el
   * tipo y la electrificacion del modelo. Solo las manda el panel (arreglo), no el texto del Sheet.
   */
  tipo?: string;
  electrificacion?: string;
  /**
   * Ficha tecnica (PDF) de ESTA version, opcional (oct-2026). Mismo origen que la del modelo
   * (POST /api/admin/pdp/ficha). Sirve para las specs de esta version que la web no publica.
   */
  ficha_file_id?: string;
  ficha_nombre?: string;
}

/**
 * Las versiones de la MISMA electrificacion que el modelo. La base (la que llena las specs del
 * modelo y la que mide el llenado) sale de aca: si la mas barata es de otra tecnologia, sus specs
 * no son las del modelo. Si ninguna es del mismo tipo, todas.
 */
export function versionesDelModelo(versiones: VersionDeclarada[]): VersionDeclarada[] {
  const propias = versiones.filter((v) => !v.electrificacion);
  return propias.length ? propias : versiones;
}

/** La version base: la mas barata entre las de la electrificacion del modelo. */
export function versionBase(versiones: VersionDeclarada[]): VersionDeclarada | null {
  const candidatas = versionesDelModelo(versiones);
  return candidatas.length ? candidatas.reduce((a, b) => (b.precio < a.precio ? b : a)) : null;
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
      const pf = Number(String((v as { precio_financiamiento?: unknown })?.precio_financiamiento ?? "").replace(/[^\d]/g, ""));
      if (pf > 0 && pf >= precio) {
        throw new Error(`El precio con financiamiento de "${nombre}" tiene que ser menor que el de lista`);
      }
      // Vacios = los del modelo: el campo no se guarda.
      const tipo = String(v?.tipo ?? "").trim();
      const electrificacion = String(v?.electrificacion ?? "").trim().toUpperCase();
      // La ficha de la version viaja con ella. Un id invalido no llega aca: lo rechaza la ruta.
      const ficha = esFileId(v?.ficha_file_id) ? { ficha_file_id: v.ficha_file_id, ficha_nombre: nombreFicha(v.ficha_nombre) } : {};
      return { nombre, precio, ...(pf > 0 ? { precio_financiamiento: pf } : {}), ...(tipo ? { tipo } : {}), ...(electrificacion ? { electrificacion } : {}), ...ficha };
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

/**
 * Quita de cada version la carroceria/electrificacion que repite la del modelo (el panel puede
 * mandar "SUV" en una version de un SUV): asi "distinta" significa distinta de verdad.
 */
export function sinTiposDelModelo(versiones: VersionDeclarada[], fila: Pick<FilaSheet, "tipo" | "electrificacion">): VersionDeclarada[] {
  const tipoModelo = String(fila.tipo ?? "").trim().toLowerCase();
  const electModelo = String(fila.electrificacion ?? "").trim().toUpperCase();
  return versiones.map(({ tipo, electrificacion, ...v }) => ({
    ...v,
    ...(tipo && tipo.trim().toLowerCase() !== tipoModelo ? { tipo } : {}),
    ...(electrificacion && electrificacion !== electModelo ? { electrificacion } : {}),
  }));
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
  const versiones = sinTiposDelModelo(parseVersiones(fila.versiones), fila);
  const base = versionBase(versiones);
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
    const distintas = versiones.filter((v) => v.electrificacion || v.tipo);
    const otraTecnologia = versiones.filter((v) => v.electrificacion);
    lineas.push(
      `Versiones declaradas por el humano (nombre, precios, carroceria y electrificacion son suyos, no los cambies):`,
      ...versiones.map((v) => {
        const tipos = [
          v.electrificacion ? `electrificacion ${v.electrificacion}` : "",
          v.tipo ? `carroceria ${v.tipo}` : "",
        ].filter(Boolean).join(", ");
        const fin = v.precio_financiamiento ? ` / con bonos y/o financiamiento $${v.precio_financiamiento.toLocaleString("es-CL")}` : "";
        return `  - ${v.nombre} — lista $${v.precio.toLocaleString("es-CL")} CLP${fin}${tipos ? ` (${tipos}, distinta a la del modelo)` : ""}`;
      }),
      `Igual reporta los precios que publique la fuente (el mas alto y el mas bajo de cada version, con su cita): son el control de lo declarado y, donde el humano no puso precio con financiamiento, el que se usa.`,
      ``,
      `Usa "${base!.nombre}" como version base: sus specs van en \`base\`.`,
      versiones.length > 1
        ? `En \`versiones[]\` pon las otras ${versiones.length - 1}, SOLO con los campos que difieren de la base.`
        : `Como hay una sola version, \`versiones\` va vacio.`,
      ...(otraTecnologia.length
        ? [
            `Las versiones de otra electrificacion (${otraTecnologia.map((v) => `"${v.nombre}"`).join(", ")}) son otra tecnologia: en \`versiones[]\` van con TODAS sus specs propias (bateria, autonomia, consumo, carga, potencia, torque, traccion...), no solo las diferencias. Nada de la base se les aplica.`,
          ]
        : []),
      ...(distintas.length ? [`Si la fuente no publica esas versiones, dilo en \`discrepancias\`.`] : []),
      ``,
    );
  } else {
    lineas.push(
      `El humano no declaro versiones ni precios. Deja \`versiones\` vacio y pon en \`base\` las specs de la version mas economica que publique la fuente.`,
      `De la version mas barata, reporta el precio MAS ALTO que publica la fuente (lista) en \`precio_lista_leido\` + \`evidencia_precio\`, y el MAS BAJO (con bonos y/o financiamiento) en \`precio_financiamiento_leido\` + \`evidencia_precio_financiamiento\`. Si publica uno solo, va en \`precio_lista_leido\`. Sin cita, omite el precio: una persona lo completa.`,
      ``,
    );
  }

  if (fila.ficha) {
    lineas.push(
      `Ficha tecnica adjunta: el humano adjunto el PDF oficial de la ficha tecnica en ${FICHA_RUTA}. Leela con la herramienta \`read\`. No es una segunda fuente web: es parte del encargo, y es la unica excepcion a R2.`,
      `- Primero confirma que sea de ESTE modelo y del mercado CHILENO (precios en CLP o sin precios, versiones que calcen con las del encargo o la web; nada de otro pais ni de otra moneda). Si es de otro modelo u otro mercado, NO uses nada de ella y dilo en \`discrepancias\`.`,
      `- Sirve SOLO para specs tecnicas que la fuente web no trae (bateria, autonomia, consumo, potencia, torque, aceleracion, dimensiones, maletero, carga, garantia, seguridad). Tagline, descripcion, SEO y fotos salen de la web.`,
      `- La fuente web manda. Si la web y la ficha dicen cosas distintas, queda el valor de la web y lo reportas en \`discrepancias\`.`,
      `- R3 sigue valiendo: el dato tiene que estar textual en la ficha. Pon en \`campos_de_ficha\` los nombres de los campos que sacaste de ella (ej. "torque", "seats", "versiones[GT].range").`,
      `- Si es un catalogo largo, lee solo las paginas de la tabla de especificaciones: la sesion tiene presupuesto acotado.`,
      ...(versiones.length
        ? [`- El precio no sale de la ficha: lo declaro el humano.`]
        : [`- Precio, ULTIMO recurso: solo si la fuente web no publica ningun precio de lista, tomalo de la ficha (con cita textual y la pagina en \`evidencia_precio\`) y marca \`precio_desde_ficha: true\`.`]),
      ``,
    );
  }

  const conFichaPropia = versiones.map((v, i) => ({ v, i })).filter(({ v }) => v.ficha_file_id);
  if (conFichaPropia.length) {
    lineas.push(
      `Fichas tecnicas de versiones: el humano adjunto el PDF oficial de algunas versiones. Leelas con la herramienta \`read\`:`,
      ...conFichaPropia.map(({ v, i }) => `  - "${v.nombre}": ${fichaVersionRuta(i)}`),
      `- Cada una sirve SOLO para las specs tecnicas de SU version que la fuente web no trae. Si es la version base, van en \`base\`; si no, en su entrada de \`versiones[]\` (con todas sus specs si es de otra electrificacion). Nunca para campos del modelo (tagline, descripcion, SEO, maletero, Euro NCAP).`,
      `- Primero confirma que sea de ESA version y del mercado CHILENO. Si no, no uses nada de ella y dilo en \`discrepancias\`.`,
      `- La fuente web manda: si dicen cosas distintas, queda la web y lo reportas en \`discrepancias\`. R3 sigue valiendo: el dato tiene que estar textual en la ficha.`,
      `- Pon en \`campos_de_ficha\` lo que sacaste de ellas como "versiones[<nombre>].<campo>" (ej. "versiones[${conFichaPropia[0].v.nombre}].range").`,
      `- El precio de esas versiones lo declaro el humano: no sale de su ficha.`,
      ``,
    );
  }

  lineas.push(
    `Recorda: sin cita textual en la fuente, el campo se omite (R3). Los precios no los fijas tu: solo los reportas con su cita.`,
    `Termina llamando \`entregar_pdp\` una sola vez.`,
  );

  return lineas.join("\n");
}
