import { tool } from "@opencode-ai/plugin";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";

// El mismo input_schema del custom tool del Managed Agent (claude/agents/extractor-pdp.json en la
// web). En Anthropic la plataforma validaba la forma; aca la valida Ajv y, si no calza, se le
// devuelve el error al modelo para que corrija y vuelva a entregar.
const schemaPath = join(import.meta.dir, "..", "..", "entregar_pdp.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const validar = new Ajv({ allErrors: true, strict: false }).compile(schema);

export default tool({
  description:
    "Entrega el resultado final de la extraccion. Llamala exactamente una vez, al terminar. Omite todo campo que no puedas respaldar con texto literal de la fuente. El argumento `contrato` es un objeto que cumple este JSON Schema:\n" +
    JSON.stringify(schema),
  args: { contrato: tool.schema.object({}).passthrough().describe("El objeto de la entrega, segun el JSON Schema de la descripcion") },
  async execute({ contrato }) {
    let c: unknown = contrato;
    if (typeof c === "string") {
      try { c = JSON.parse(c); } catch { return "contrato no es JSON valido. Vuelve a llamar entregar_pdp con un objeto."; }
    }
    if (!validar(c)) {
      const errores = (validar.errors ?? []).slice(0, 15).map((e) => `${e.instancePath || "/"} ${e.message}${e.params ? " " + JSON.stringify(e.params) : ""}`);
      return `La entrega NO cumple el esquema. Corrige y vuelve a llamar entregar_pdp:\n- ${errores.join("\n- ")}`;
    }
    const out = process.env.PDP_OUT;
    if (out) writeFileSync(out, JSON.stringify(c));
    return "Recibido. La PDP quedo como borrador oculto. No sigas trabajando.";
  },
});
