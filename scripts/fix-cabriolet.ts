import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN || "",
  useCdn: false,
});

async function main() {
  // El duplicado sin contenido (auto-creado antes del script)
  const OLD_ID = "9MKTZ8UxCDmrjzzYMxhVbI";
  // El creado por import-types.ts con contenido completo
  const KEEP_ID = "QnO7x4BjxSH5gdfvmT0sZd";

  await client.delete(OLD_ID);
  console.log(`✓ Duplicado eliminado: ${OLD_ID}`);
  console.log(`✓ Se mantiene: ${KEEP_ID} (con contenido completo)`);
}

main().catch(console.error);
