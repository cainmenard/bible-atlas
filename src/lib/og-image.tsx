import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site-config";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_ALT = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const OG_IMAGE_CONTENT_TYPE = "image/png";

export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at 50% 50%, #12121f 0%, #0a0a12 70%)",
          color: "#e8e0d0",
          fontFamily: "serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        {/* Starfield dots */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexWrap: "wrap",
            opacity: 0.35,
          }}
        >
          {Array.from({ length: 48 }).map((_, i) => {
            const x = (i * 137) % 1200;
            const y = (i * 241) % 630;
            const s = (i % 3) + 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: s,
                  height: s,
                  borderRadius: s,
                  background: "#e8e0d0",
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            fontSize: 120,
            color: "#d4a04a",
            lineHeight: 1,
            marginBottom: 24,
            textShadow: "0 0 60px rgba(212, 160, 74, 0.5)",
          }}
        >
          ☧
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 300,
            letterSpacing: "0.06em",
            color: "#e8e0d0",
            lineHeight: 1,
          }}
        >
          {SITE_NAME}
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            fontStyle: "italic",
            color: "#e8e0d0",
            opacity: 0.7,
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          {SITE_TAGLINE}
        </div>

        <div
          style={{
            marginTop: 48,
            width: 120,
            height: 1,
            background: "#d4a04a",
            opacity: 0.6,
          }}
        />

        <div
          style={{
            marginTop: 28,
            fontSize: 18,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#8a8a9a",
            fontFamily: "monospace",
          }}
        >
          bibleatlas.dev
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
