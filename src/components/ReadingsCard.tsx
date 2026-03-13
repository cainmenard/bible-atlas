"use client";

import { DailyReadingsData } from "@/lib/types";
import { LITURGICAL_COLORS } from "@/lib/colors";
import { useState } from "react";

interface Props {
  data: DailyReadingsData | null;
  onSelectBook: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  "First Reading":      "#fb923c",
  "Second Reading":     "#a78bfa",
  "Psalm":              "#fde68a",
  "Responsorial Psalm": "#fde68a",
  "Gospel":             "#38bdf8",
};
const DEFAULT_TYPE_COLOR = "#8a8a9a";

const NOISE_SVG = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.04'/></svg>")`;

export default function ReadingsCard({ data, onSelectBook }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data) return null;

  const seasonColor = LITURGICAL_COLORS[data.season];

  // Format date as "13 MAR 2026"
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const mon = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const yr = now.getFullYear();
  const shortDate = `${day} ${mon} ${yr}`;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 md:left-4 md:translate-x-0 px-4 py-3 rounded-lg text-xs
          glass-panel three-state-interactive font-mono"
        style={{ color: "var(--text-secondary)" }}
      >
        Today&apos;s Readings
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 w-full rounded-t-[5px] md:bottom-4 md:left-4 md:right-auto md:w-80 md:rounded-[5px] readings-card"
      style={{
        backgroundColor: "rgba(14, 14, 28, 0.88)",
        backgroundImage: NOISE_SVG,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        overflow: "hidden",
      }}
    >
      {/* 2px top season color border */}
      <div style={{ height: "2px", background: seasonColor }} />

      <div style={{ padding: "24px" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <span
              className="font-mono"
              style={{
                color: "var(--accent)",
                fontSize: "12px",
                letterSpacing: "0.15em",
                fontVariantCaps: "small-caps",
                textTransform: "uppercase",
                display: "block",
              }}
            >
              Today&apos;s Readings
            </span>
            <span
              className="font-mono"
              style={{
                color: "var(--text-primary)",
                opacity: 0.75,
                fontSize: "12px",
                letterSpacing: "0.08em",
                display: "block",
                marginTop: "5px",
              }}
            >
              {shortDate}
            </span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="three-state-interactive"
            style={{ color: "var(--text-primary)", padding: "2px", lineHeight: 0 }}
            aria-label="Close readings card"
          >
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Hairline separator */}
        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.06)", marginBottom: "16px" }} />

        {/* Reading rows */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {data.readings.map((r, i) => {
            const isHovered = hoveredIndex === i;
            const dotColor = TYPE_COLORS[r.type] ?? DEFAULT_TYPE_COLOR;
            return (
              <button
                key={i}
                onClick={() => r.bookId && onSelectBook(r.bookId)}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 8px",
                  borderRadius: "3px",
                  background: isHovered ? "rgba(255, 255, 255, 0.04)" : "transparent",
                  transition: "background 200ms ease-out",
                  textAlign: "left",
                  width: "100%",
                  cursor: r.bookId ? "pointer" : "default",
                }}
              >
                {/* Genre dot */}
                <div
                  className={isHovered ? "genre-dot-pulse" : ""}
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: dotColor,
                    flexShrink: 0,
                  }}
                />
                {/* Reading type label */}
                <span
                  className="font-mono"
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text-primary)",
                    opacity: 0.7,
                    width: "104px",
                    flexShrink: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {r.type}
                </span>
                {/* Scripture reference */}
                <span
                  className="font-serif"
                  style={{
                    fontSize: "17px",
                    color: "var(--text-primary)",
                    opacity: isHovered ? 1 : 0.92,
                    fontWeight: 500,
                    transition: "opacity 200ms ease-out",
                    lineHeight: 1.3,
                  }}
                >
                  {r.reference}
                </span>
              </button>
            );
          })}
        </div>

        {/* Season indicator */}
        <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "7px" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: seasonColor,
              flexShrink: 0,
            }}
          />
          <span
            className="font-mono"
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-primary)",
              opacity: 0.7,
            }}
          >
            {data.season}
          </span>
        </div>
      </div>
    </div>
  );
}
