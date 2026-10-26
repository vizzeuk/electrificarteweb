import { tool } from "@opencode-ai/plugin";
import { existsSync, readFileSync } from "node:fs";

// Reemplaza al `read` nativo de OpenCode (un custom tool con el mismo nombre tiene prioridad).
// El nativo lee cualquier archivo del proyecto, incluidos el .env del runner y la sesion de
// Copilot: una pagina con prompt injection podria sacarlos por la entrega. Este solo lee la
// ficha tecnica de ESTA corrida (PDP_FICHA, ya pasada a texto por el runner).
export default tool({
  description: "Lee la ficha tecnica adjunta al encargo (ya convertida a texto, con marcas de pagina). Es el unico archivo que se puede leer.",
  args: { filePath: tool.schema.string().describe("La ruta de la ficha que indica el encargo") },
  async execute({ filePath }) {
    const ficha = process.env.PDP_FICHA;
    if (!ficha || !existsSync(ficha)) return "Este encargo no trae ficha tecnica adjunta.";
    if (filePath !== ficha) return `Rechazado: solo se puede leer la ficha del encargo (${ficha}).`;
    return readFileSync(ficha, "utf8").slice(0, 200_000);
  },
});
