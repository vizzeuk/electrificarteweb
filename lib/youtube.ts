// Studio pide "YouTube embed URL", pero lo que la gente pega es el link de compartir
// (youtu.be/ID?si=…) o el de la barra (watch?v=ID). Cualquiera de esas formas se lleva a la URL
// de embed; lo que no es YouTube devuelve null y la PDP no muestra el video.

const ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, tipo, valor] = u.pathname.split("/");
    id = tipo === "watch" ? u.searchParams.get("v") : ["embed", "shorts", "live", "v"].includes(tipo) ? valor ?? null : null;
  }
  return id && ID.test(id) ? id : null;
}

/** URL para el iframe (sin cookies de seguimiento hasta que se reproduce), o null. */
export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}
