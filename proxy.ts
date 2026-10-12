import { NextResponse, type NextRequest } from "next/server";

/**
 * Solo para /studio. Studio guarda en la dirección la "perspectiva" elegida, y con
 * `?perspective=published` muestra todo en SOLO LECTURA: no deja borrar fotos, elegir portada ni
 * editar nada. Francisco quedó ahí sin darse cuenta (oct-2026) y parecía que el CMS no funcionaba.
 * Al entrar o recargar se quita ese parámetro y Studio abre en el modo normal (borradores).
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  if (url.searchParams.get("perspective") === "published") {
    const limpia = url.clone();
    limpia.searchParams.delete("perspective");
    return NextResponse.redirect(limpia);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*"],
};
