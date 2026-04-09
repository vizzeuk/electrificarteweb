import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schemas";

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

            S.divider(),

            // ─── Taxonomías ─────────────────────────────────────────────────
            S.documentTypeListItem("vehicleType").title("📂 Tipos de Vehículo"),
            S.documentTypeListItem("electricType").title("🔋 Tipos Eléctricos"),
            S.documentTypeListItem("category").title("🏷️ Categorías"),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
});
