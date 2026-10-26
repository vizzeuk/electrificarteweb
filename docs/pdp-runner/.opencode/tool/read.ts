import { tool } from "@opencode-ai/plugin";
import { existsSync, readFileSync } from "node:fs";

// Reemplaza al `read` nativo de OpenCode (un custom tool con el mismo nombre tiene prioridad).
// El nativo lee cualquier archivo del proyecto, incluidos el .env del runner y la sesion de
// Copilot: una pagina con prompt injection podria sacarlos por la entrega. Este solo lee las
// fichas tecnicas de ESTA corrida (PDP_FICHAS, una ruta por linea, ya pasadas a texto).
export default tool({
  description: "Lee una ficha tecnica adjunta al encargo (ya convertida a texto, con marcas de pagina). Solo se pueden leer las rutas de ficha que da el encargo.",
  args: { filePath: tool.schema.string().describe("La ruta de la ficha, tal como la indica el encargo") },
  async execute({ filePath }) {
    const fichas = (process.env.PDP_FICHAS ?? "").split("\n").filter(Boolean);
    if (!fichas.length) return "Este encargo no trae fichas tecnicas adjuntas.";
    if (!fichas.includes(filePath) || !existsSync(filePath)) {
      return `Rechazado: solo se pueden leer las fichas del encargo:\n${fichas.join("\n")}`;
    }
    return readFileSync(filePath, "utf8").slice(0, 200_000);
  },
});
