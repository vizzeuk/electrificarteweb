import { tool } from "@opencode-ai/plugin";
import { anotarPagina, bajar, dentroDelCerco, fueraDelCerco, htmlAMarkdown, pdfATexto, recortar } from "./_comun";

export default tool({
  description:
    "Lee una pagina (o un PDF) del dominio de la fuente del encargo y la devuelve en markdown, con los links absolutos para seguir navegando. Solo acepta URLs de ese dominio (R2). No ejecuta JavaScript: si la pagina vuelve vacia o sin specs, usa leer_con_navegador.",
  args: { url: tool.schema.string().describe("URL https del MISMO dominio de la fuente del encargo") },
  async execute({ url }) {
    if (!dentroDelCerco(url)) return fueraDelCerco(url);
    try {
      const r = await bajar(url);
      if (!dentroDelCerco(r.final)) return `La pagina redirigio fuera del dominio (${r.final}). No se puede leer.`;
      if (r.status >= 400) return `HTTP ${r.status} al leer ${url}. Si es 403 o vacio, prueba leer_con_navegador.`;
      const esPdf = r.tipo.includes("pdf") || /\.pdf(\?|$)/i.test(r.final);
      const texto = esPdf ? await pdfATexto(r.cuerpo) : htmlAMarkdown(new TextDecoder().decode(r.cuerpo), r.final);
      anotarPagina(r.final, texto);
      return recortar(`URL final: ${r.final}\n\n${texto}`);
    } catch (e) {
      return `No se pudo leer ${url}: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
});
