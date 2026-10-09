import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schemas";
import { MostrarEnSitioAction, OcultaBadge } from "./sanity/actions";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset   = process.env.NEXT_PUBLIC_SANITY_DATASET!;

export default defineConfig({
  name:    "electrificarte-studio",
  title:   "Electrificarte CMS",
  projectId,
  dataset,

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Contenido")
          .items([
            // ─── Singletons ──────────────────────────────────────────────────
            S.listItem()
              .title("🏠 Página de Inicio")
              .id("homePage")
              .child(
                S.document()
                  .schemaType("homePage")
                  .documentId("homePage")
              ),

            S.listItem()
              .title("⚙️ Configuración del Sitio")
              .id("siteSettings")
              .child(
                S.document()
                  .schemaType("siteSettings")
                  .documentId("siteSettings")
              ),

            S.divider(),

            // ─── Blog ────────────────────────────────────────────────────────
            S.documentTypeListItem("blogPost").title("📝 Artículos del Blog"),

            S.divider(),

            // ─── Catálogo ───────────────────────────────────────────────────
            S.documentTypeListItem("brand").title("🚗 Marcas"),
            S.documentTypeListItem("car").title("⚡ Autos"),
            // Las PDPs que crea la IA desde el panel nacen ocultas: acá se encuentran para revisarlas
            // y publicarlas con "Mostrar en el sitio".
            S.listItem()
              .title("🆕 Fichas por revisar (ocultas, creadas por IA)")
              .id("autosPorRevisar")
              .child(
                S.documentList()
                  .title("Fichas por revisar")
                  .schemaType("car")
                  .filter('_type == "car" && hidden == true && aiGenerated == true')
                  .defaultOrdering([{ field: "_createdAt", direction: "desc" }])
              ),
            S.documentTypeListItem("collection").title("📦 Colecciones"),

            S.divider(),

            // ─── Taxonomías ─────────────────────────────────────────────────
            S.documentTypeListItem("vehicleType").title("📂 Tipos de Vehículo"),
            S.documentTypeListItem("electricType").title("🔋 Tipos Eléctricos"),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    // "Mostrar en el sitio" va primero en las fichas de autos ocultas: quita el oculto y publica.
    actions: (prev, ctx) => (ctx.schemaType === "car" ? [MostrarEnSitioAction, ...prev] : prev),
    badges: (prev, ctx) => (ctx.schemaType === "car" ? [OcultaBadge, ...prev] : prev),
  },
});
