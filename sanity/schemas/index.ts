import { brand }        from "./brand";
import { car }          from "./car";
import { category }     from "./category";
import { vehicleType }  from "./vehicleType";
import { electricType } from "./electricType";
import { siteSettings } from "./siteSettings";
import { homePage }     from "./homePage";
import { collection }   from "./collection";
import { blockContent } from "./blockContent";
import { blogPost }     from "./blogPost";

export const schemaTypes = [
  // ─── Singleton documents (una sola instancia) ───────────────────────────
  siteSettings,
  homePage,

  // ─── Blog ────────────────────────────────────────────────────────────────
  blogPost,

  // ─── Colecciones (secciones vendibles / temáticas) ───────────────────────
  collection,

  // ─── Contenido del catálogo ──────────────────────────────────────────────
  brand,
  car,

  // ─── Taxonomías (clasificaciones) ────────────────────────────────────────
  vehicleType,
  electricType,
  category,

  // ─── Tipos de contenido reutilizables ────────────────────────────────────
  blockContent,
];
