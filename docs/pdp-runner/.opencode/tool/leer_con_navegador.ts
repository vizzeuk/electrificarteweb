import { tool } from "@opencode-ai/plugin";
import { anotarPagina, dentroDelCerco, fueraDelCerco, recortar } from "./_comun";

// Mismo contrato que el custom tool del Managed Agent: Firecrawl renderiza el JS. Cuesta 1 credit,
// por eso es el ultimo recurso. Sin FIRECRAWL_API_KEY degrada avisando, no rompe.
export default tool({
  description:
    "Vuelve a pedir la MISMA pagina, pero renderizada con un navegador real. Usala SOLO cuando web_fetch ya fallo en esa URL: devolvio la pagina vacia, sin specs, o fue bloqueada. Devuelve el contenido en markdown. Solo URLs del dominio del encargo.",
  args: {
    url: tool.schema.string().describe("Una pagina del MISMO dominio de la fuente del encargo que web_fetch no pudo leer."),
    motivo: tool.schema.string().describe("Que devolvio web_fetch: vacio, sin specs, bloqueado, error."),
  },
  async execute({ url }) {
    if (!dentroDelCerco(url)) return fueraDelCerco(url);
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) return "No hay navegador disponible en este entorno. Sigue con lo que tengas.";
    try {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false }),
        signal: AbortSignal.timeout(45_000),
      });
      const j = (await res.json()) as { success?: boolean; data?: { markdown?: string } };
      if (!res.ok || !j.success) return `El navegador fallo (HTTP ${res.status}).`;
      anotarPagina(url, j.data?.markdown ?? "");
      return recortar(j.data?.markdown ?? "(vacio)");
    } catch (e) {
      return `El navegador fallo: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});
