import { ImageResponse } from "next/og";

export const alt = "Siggy — Email signatures that don't look like Arial 11pt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F7F4EE",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          position: "relative",
        }}
      >
        {/* Kicker row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "20px",
            fontWeight: 500,
            letterSpacing: "0.14em",
            color: "#6B6864",
            textTransform: "uppercase",
          }}
        >
          Siggy · Email signature builder
        </div>

        {/* Indigo S badge — top right */}
        <div
          style={{
            position: "absolute",
            top: "72px",
            right: "72px",
            width: "112px",
            height: "112px",
            background: "#4F46E5",
            borderRadius: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "76px",
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1,
          }}
        >
          S
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            fontSize: "104px",
            fontWeight: 900,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            color: "#17161A",
            maxWidth: "1000px",
          }}
        >
          Your name deserves better than Arial 11pt.
        </div>

        {/* Anchor row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontSize: "22px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "#4F46E5",
            textTransform: "uppercase",
          }}
        >
          <span>$19</span>
          <span style={{ color: "#D6CFC2" }}>·</span>
          <span>Own it forever</span>
          <span style={{ color: "#D6CFC2" }}>·</span>
          <span>No subscription</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
