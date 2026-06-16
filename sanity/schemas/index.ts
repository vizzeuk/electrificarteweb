import { brand }        from "./brand";
import { car }          from "./car";
import { vehicleType }  from "./vehicleType";
import { electricType } from "./electricType";
import { siteSettings } from "./siteSettings";
import { homePage }     from "./homePage";
import { collection }   from "./collection";
import { blockContent } from "./blockContent";
import { blogPost }     from "./blogPost";
import { plpBanner }    from "./plpBanner";
import { advisorKnowledge } from "./advisorKnowledge";

export const schemaTypes = [
  // ─── Singleton documents (una sola instancia) ───────────────────────────
  siteSettings,
  homePage,

  // ─── Blog ────────────────────────────────────────────────────────────────
  blogPost,

  // ─── Asesor IA (conocimiento del chatbot de WhatsApp) ────────────────────
  advisorKnowledge,

  // ─── Colecciones (secciones vendibles / temáticas) ───────────────────────
  collection,

  // ─── Contenido del catálogo ──────────────────────────────────────────────
  brand,
  car,

  // ─── Taxonomías (clasificaciones) ────────────────────────────────────────
  vehicleType,
  electricType,

  // ─── Tipos de contenido reutilizables ────────────────────────────────────
  blockContent,
  plpBanner,
];
