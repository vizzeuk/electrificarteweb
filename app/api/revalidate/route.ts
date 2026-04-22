import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

const SECRET = process.env.SANITY_REVALIDATE_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Validate secret if configured
  if (SECRET) {
    const incomingSecret = req.headers.get("x-sanity-secret") ?? body._secret;
    if (incomingSecret !== SECRET) {
      return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
    }
  }

  const type: string = body._type ?? "";

  if (type === "blogPost") {
    // Invalidate the fetch data cache for all blogPost queries
    revalidateTag("blogPost");
    revalidatePath("/");
    revalidatePath("/blog");
    const slug: string | undefined = body.slug?.current;
    if (slug) revalidatePath(`/blog/${slug}`);
    else revalidatePath("/blog/[slug]", "page");
  }

  if (type === "homePage") {
    revalidateTag("homePage");
    revalidatePath("/", "page");
  }

  if (type === "car") {
    revalidateTag("car");
    revalidatePath("/");
    revalidatePath("/marcas");
    revalidatePath("/comparador");
    const slug: string | undefined = body.slug?.current;
    if (slug) revalidatePath(`/auto/${slug}`);
  }

  if (type === "brand") {
    revalidateTag("brand");
    revalidatePath("/");
    revalidatePath("/marcas");
  }

  // Generic fallback: if called without a type, revalidate everything
  if (!type) {
    revalidateTag("blogPost");
    revalidateTag("homePage");
    revalidateTag("car");
    revalidateTag("brand");
    revalidateTag("collection");
    revalidatePath("/");
    revalidatePath("/blog");
  }

  return NextResponse.json({ revalidated: true, type, now: Date.now() });
}
