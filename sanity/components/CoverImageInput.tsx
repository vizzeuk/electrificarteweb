import { useCallback } from "react";
import { ObjectInputProps, set, useClient, useFormValue } from "sanity";

type GalleryImage = {
  _key: string;
  _type: string;
  asset?: { _ref: string; _type: string };
  hotspot?: object;
  crop?: object;
  alt?: string;
};

function refToUrl(ref: string, projectId: string, dataset: string): string {
  if (!ref || !projectId || !dataset) return "";
  const parts = ref.split("-");
  if (parts.length < 4 || parts[0] !== "image") return "";
  const ext  = parts[parts.length - 1];
  const dims = parts[parts.length - 2];
  const id   = parts.slice(1, -2).join("-");
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dims}.${ext}?w=300&h=200&fit=crop`;
}

export function CoverImageInput(props: ObjectInputProps) {
  const { onChange, renderDefault } = props;
  const client     = useClient({ apiVersion: "2025-01-01" });
  const { projectId = "", dataset = "" } = client.config();
  const gallery    = useFormValue(["gallery"]) as GalleryImage[] | undefined;
  const galleryImgs = (gallery ?? []).filter((img) => img.asset?._ref);

  const pickFromGallery = useCallback(
    (img: GalleryImage) => {
      const value: Record<string, unknown> = { _type: "image", asset: img.asset };
      if (img.hotspot) value.hotspot = img.hotspot;
      if (img.crop)    value.crop    = img.crop;
      onChange(set(value));
    },
    [onChange]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {renderDefault(props)}

      {galleryImgs.length > 0 && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "14px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#6b7280",
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Usar foto de la galería como portada
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {galleryImgs.map((img) => {
              const url = refToUrl(img.asset!._ref, projectId, dataset);
              return (
                <button
                  key={img._key}
                  type="button"
                  title={img.alt ? `Usar: ${img.alt}` : "Usar como portada"}
                  onClick={() => pickFromGallery(img)}
                  style={{
                    padding: 0,
                    margin: 0,
                    border: "2px solid rgba(255,255,255,0.12)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    overflow: "hidden",
                    width: "88px",
                    height: "60px",
                    flexShrink: 0,
                    background: "#1a1a1a",
                    transition: "border-color 0.15s, transform 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#00e5e5";
                    e.currentTarget.style.transform = "scale(1.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {url && (
                    <img
                      src={url}
                      alt={img.alt ?? ""}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px" }}>
            Haz clic en cualquier foto de la galería para usarla como imagen de portada
          </p>
        </div>
      )}
    </div>
  );
}
