import { ImageResponse } from "next/og";

import { DEVELOPER_NAME } from "@/lib/site";

// Social preview for the landing page. Uses ImageResponse's built-in font and
// plain shapes only, so nothing is fetched at build time.
export const alt =
  "PipelineHQ (Demo): a CRM dashboard portfolio demo with a deal pipeline, revenue charts and contacts. Fake data only.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#4f46e5";
const INK = "#0b0b0b";
const MUTED = "#52514e";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "18px 22px",
        borderRadius: 16,
        border: "2px solid #e5e5e5",
        background: "white",
        width: 220,
      }}
    >
      <div style={{ fontSize: 22, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: 700, color: INK, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

export default function OpengraphImage() {
  const bars = [38, 52, 44, 61, 48, 70, 57, 66, 74, 63, 82, 90];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: 72,
            height: 72,
            borderRadius: 18,
            background: BRAND,
          }}
        >
          <div
            style={{
              width: 40,
              height: 8,
              borderRadius: 4,
              background: "white",
            }}
          />
          <div
            style={{
              width: 28,
              height: 8,
              borderRadius: 4,
              background: "white",
            }}
          />
          <div
            style={{
              width: 16,
              height: 8,
              borderRadius: 4,
              background: "white",
            }}
          />
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, color: INK }}>
          PipelineHQ
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#78350f",
            background: "#fef3c7",
            border: "2px solid #fcd34d",
            borderRadius: 999,
            padding: "4px 16px",
          }}
        >
          Demo
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", maxWidth: 560 }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.1,
            }}
          >
            The CRM demo for a calm, fast sales pipeline
          </div>
          <div style={{ fontSize: 28, color: MUTED, marginTop: 20 }}>
            Next.js · TypeScript · Firebase · real-time · accessible
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Kpi label="Open pipeline" value="$921K" />
            <Kpi label="Win rate" value="67%" />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              height: 150,
              padding: 20,
              borderRadius: 16,
              border: "2px solid #e5e5e5",
              background: "white",
            }}
          >
            {bars.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 24,
                  height: `${h}%`,
                  borderRadius: "4px 4px 0 0",
                  background: i === bars.length - 1 ? BRAND : "#2a78d6",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
        Fake data only · Built by {DEVELOPER_NAME}
      </div>
    </div>,
    size,
  );
}
