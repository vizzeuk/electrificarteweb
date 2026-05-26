import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

const SECRET = process.env.SANITY_REVALIDATE_SECRET;

export async function POST(req: NextRequest) {
  // El secret es OBLIGATORIO — si la env var no está configurada, el endpoint
  // rechaza todo. Antes, sin la env var, cualquiera podía invalidar el cache.
  if (!SECRET) {
    return NextResponse.json(
      { message: "SANITY_REVALIDATE_SECRET no configurado" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const incomingSecret = req.headers.get("x-sanity-secret") ?? body._secret;
  if (incomingSecret !== SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const type: string = body._type ?? "";

  if (type === "blogPost") {
    // Invalidate the fetch data cache for all blogPost queries
    revalidateTag("blogPost", "default");
    revalidatePath("/");
    revalidatePath("/blog");
    const slug: string | undefined = body.slug?.current;
    if (slug) revalidatePath(`/blog/${slug}`);
    else revalidatePath("/blog/[slug]", "page");
  }

  if (type === "homePage") {
    revalidateTag("homePage", "default");
    revalidatePath("/", "page");
  }

  if (type === "car") {
    revalidateTag("car", "default");
    revalidatePath("/");
    revalidatePath("/marcas");
    revalidatePath("/comparador");
    const slug: string | undefined = body.slug?.current;
    if (slug) revalidatePath(`/auto/${slug}`);
  }

  if (type === "brand") {
    revalidateTag("brand", "default");
    revalidatePath("/");
    revalidatePath("/marcas");
  }

  // Generic fallback: if called without a type, revalidate everything
  if (!type) {
    revalidateTag("blogPost", "default");
    revalidateTag("homePage", "default");
    revalidateTag("car", "default");
    revalidateTag("brand", "default");
    revalidateTag("collection", "default");
    revalidatePath("/");
    revalidatePath("/blog");
  }

  return NextResponse.json({ revalidated: true, type, now: Date.now() });
}
