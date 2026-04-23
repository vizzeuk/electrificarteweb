import { useCallback, useState } from "react";
import { ObjectInputProps, set, useClient, useFormValue } from "sanity";

type GalleryImage = {
  _key: string;
  _type: string;
  asset?: { _ref: string; _type: string };
  hotspot?: object;
  crop?: object;
  alt?: string;
};

type CurrentImage = {
  asset?: { _ref: string; _type: string };
};

function refToUrl(ref: string, projectId: string, dataset: string, w = 400, h = 250): string {
  if (!ref || !projectId || !dataset) return "";
  const parts = ref.split("-");
  if (parts.length < 4 || parts[0] !== "image") return "";
  const ext  = parts[parts.length - 1];
  const dims = parts[parts.length - 2];
  const id   = parts.slice(1, -2).join("-");
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dims}.${ext}?w=${w}&h=${h}&fit=crop`;
}

export function CoverImageInput(props: ObjectInputProps) {
  const { onChange, renderDefault, value } = props;
  const client     = useClient({ apiVersion: "2025-01-01" });
  const { projectId = "", dataset = "" } = client.config();
  const gallery    = useFormValue(["gallery"]) as GalleryImage[] | undefined;
  const galleryImgs = (gallery ?? []).filter((img) => img.asset?._ref);

  // Preview: ref of the image being hovered (null = show current mainImage)
  const [hoverRef, setHoverRef] = useState<string | null>(null);

  const currentRef = (value as CurrentImage | undefined)?.asset?._ref ?? null;
  const previewRef = hoverRef ?? currentRef;
  const previewUrl = previewRef ? refToUrl(previewRef, projectId, dataset, 640, 400) : null;

  const pickFromGallery = useCallback(
    (img: GalleryImage) => {
      const val: Record<string, unknown> = { _type: "image", asset: img.asset };
      if (img.hotspot) val.hotspot = img.hotspot;
      if (img.crop)    val.crop    = img.crop;
      onChange(set(val));
    },
    [onChange]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {renderDefault(props)}

      {/* Card preview */}
      {previewUrl && (
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {hoverRef ? "Vista previa (hover)" : "Así se ve en la card"}
          </p>
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "320px",
              aspectRatio: "16/9",
              borderRadius: "10px",
              overflow: "hidden",
              border: hoverRef ? "2px solid #00e5e5" : "2px solid rgba(255,255,255,0.12)",
              background: "#111",
              transition: "border-color 0.15s",
            }}
          >
            <img
              src={previewUrl}
              alt="Vista previa"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
              padding: "8px 10px 6px",
            }}>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                16:10 · igual que la card
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Gallery picker */}
      {galleryImgs.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Usar foto de la galería como portada
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {galleryImgs.map((img) => {
              const thumbUrl = refToUrl(img.asset!._ref, projectId, dataset, 200, 130);
              const isActive = img.asset?._ref === currentRef;
              return (
                <button
                  key={img._key}
                  type="button"
                  title={img.alt ? `Usar: ${img.alt}` : "Usar como portada"}
                  onClick={() => pickFromGallery(img)}
                  onMouseEnter={() => setHoverRef(img.asset!._ref)}
                  onMouseLeave={() => setHoverRef(null)}
                  style={{
                    padding: 0,
                    margin: 0,
                    border: isActive ? "2px solid #00e5e5" : "2px solid rgba(255,255,255,0.12)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    overflow: "hidden",
                    width: "88px",
                    height: "60px",
                    flexShrink: 0,
                    background: "#1a1a1a",
                    transition: "border-color 0.15s, transform 0.1s",
                    position: "relative",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#00e5e5"; }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = isActive ? "#00e5e5" : "rgba(255,255,255,0.12)"; }}
                >
                  {thumbUrl && (
                    <img
                      src={thumbUrl}
                      alt={img.alt ?? ""}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                    />
                  )}
                  {isActive && (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,229,229,0.25)",
                    }}>
                      <span style={{ fontSize: "18px", color: "#00e5e5" }}>✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px" }}>
            Pasa el mouse para previsualizar · haz clic para establecer como portada
          </p>
        </div>
      )}
    </div>
  );
}
