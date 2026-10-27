import { tool } from "@opencode-ai/plugin";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";

// La salida del re-check de precios (lib/catalog-recheck/read-source.ts → OUTPUT_SCHEMA en la web,
// copiada por scripts/pdp-runner-sync.ts). La valida Ajv; si no calza, el modelo corrige.
const schemaPath = join(import.meta.dir, "..", "..", "entregar_revision.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const validar = new Ajv({ allErrors: true, strict: false }).compile(schema);

export default tool({
  description:
    "Entrega lo que leiste de la pagina oficial. Llamala exactamente una vez, al terminar. Un precio sin cita textual va en null. El argumento `contrato` es un objeto que cumple este JSON Schema:\n" +
    JSON.stringify(schema),
  args: { contrato: tool.schema.object({}).passthrough().describe("El objeto de la entrega, segun el JSON Schema de la descripcion") },
  async execute({ contrato }) {
    let c: unknown = contrato;
    if (typeof c === "string") {
      try { c = JSON.parse(c); } catch { return "contrato no es JSON valido. Vuelve a llamar entregar_revision con un objeto."; }
    }
    if (!validar(c)) {
      const errores = (validar.errors ?? []).slice(0, 15).map((e) => `${e.instancePath || "/"} ${e.message}${e.params ? " " + JSON.stringify(e.params) : ""}`);
      return `La entrega NO cumple el esquema. Corrige y vuelve a llamar entregar_revision:\n- ${errores.join("\n- ")}`;
    }
    const out = process.env.PDP_OUT;
    if (out) writeFileSync(out, JSON.stringify(c));
    return "Recibido. No sigas trabajando.";
  },
});
