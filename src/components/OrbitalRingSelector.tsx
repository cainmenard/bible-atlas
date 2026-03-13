"use client";

import { useState } from "react";
import { Canon } from "@/lib/types";

interface Props {
  canon: Canon;
  onChange: (canon: Canon) => void;
}

const CANONS: Canon[] = ["catholic", "protestant", "orthodox", "ethiopian"];

const CANON_LABELS: Record<Canon, string> = {
  catholic: "Catholic",
  protestant: "Protestant",
  orthodox: "Orthodox",
  ethiopian: "Ethiopian",
};

// Arc geometry — dome (upper semicircle)
const CX = 70;
const CY = 82;
const R = 54;

// Evenly spaced across 180° from left (180°) to right (0°), going counterclockwise
const ANGLES: Record<Canon, number> = {
  catholic: 180,
  protestant: 120,
  orthodox: 60,
  ethiopian: 0,
};

const DEG = Math.PI / 180;

function arcPoint(angleDeg: number) {
  const a = angleDeg * DEG;
  return {
    x: CX + R * Math.cos(a),
    y: CY - R * Math.sin(a), // SVG y-axis is flipped
  };
}

// Top of arc, used to split path into two unambiguous quarter-circles
const TOP = { x: CX, y: CY - R };
const LEFT = { x: CX - R, y: CY };
const RIGHT = { x: CX + R, y: CY };

// Arc path as two 90° arcs to avoid SVG semicircle ambiguity
const ARC_PATH = `M ${LEFT.x},${LEFT.y} A ${R},${R} 0 0,1 ${TOP.x},${TOP.y} A ${R},${R} 0 0,1 ${RIGHT.x},${RIGHT.y}`;

export default function OrbitalRingSelector({ canon, onChange }: Props) {
  const [hovered, setHovered] = useState<Canon | null>(null);

  // Preview the hovered canon label; fall back to active
  const preview = hovered ?? canon;

  return (
    <div
      className="fixed bottom-6 left-6 z-[40] select-none max-md:bottom-auto max-md:top-20 max-md:left-4"
    >
      <svg
        width="140"
        height="100"
        viewBox="0 0 140 100"
        style={{ overflow: "visible" }}
        aria-label="Canon selector"
      >
        <defs>
          {/* Soft amber glow for active point */}
          <radialGradient id="active-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d4a04a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d4a04a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Hairline arc */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="0.75"
        />

        {/* Subtle end-stop marks where arc terminates */}
        <line
          x1={LEFT.x - 3} y1={LEFT.y - 1}
          x2={LEFT.x - 3} y2={LEFT.y + 1}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.75"
        />
        <line
          x1={RIGHT.x + 3} y1={RIGHT.y - 1}
          x2={RIGHT.x + 3} y2={RIGHT.y + 1}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.75"
        />

        {/* Canon points */}
        {CANONS.map((c) => {
          const angle = ANGLES[c];
          const pt = arcPoint(angle);
          const isActive = canon === c;
          const isHovered = hovered === c;

          // Outward radial direction (away from center), in SVG coordinates
          const rad = angle * DEG;
          const ox = Math.cos(rad);
          const oy = -Math.sin(rad);

          // Tick mark: 4–9 px radially outward from the point center
          const t0 = { x: pt.x + ox * 4, y: pt.y + oy * 4 };
          const t1 = { x: pt.x + ox * 9, y: pt.y + oy * 9 };

          const dotColor = isActive
            ? "#d4a04a"
            : isHovered
            ? "rgba(212,160,74,0.65)"
            : "rgba(138,138,154,0.55)";

          const dotOpacity = isActive ? 1 : isHovered ? 0.7 : 0.32;
          const tickOpacity = isActive ? 0.9 : isHovered ? 0.55 : 0.22;
          const tickColor = isActive
            ? "#d4a04a"
            : "rgba(255,255,255,0.6)";

          return (
            <g
              key={c}
              onClick={() => onChange(c)}
              onMouseEnter={() => setHovered(c)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
              role="button"
              aria-label={CANON_LABELS[c]}
              aria-pressed={isActive}
            >
              {/* Generous transparent hit area */}
              <circle cx={pt.x} cy={pt.y} r={15} fill="transparent" />

              {/* Ambient glow behind active point */}
              {isActive && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={14}
                  fill="url(#active-glow)"
                  style={{ transition: "opacity 200ms ease-out" }}
                />
              )}

              {/* Radial tick mark */}
              <line
                x1={t0.x}
                y1={t0.y}
                x2={t1.x}
                y2={t1.y}
                stroke={tickColor}
                strokeWidth="0.75"
                opacity={tickOpacity}
                style={{ transition: "all 200ms ease-out" }}
              />

              {/* Point dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 2.5 : 2}
                fill={dotColor}
                opacity={dotOpacity}
                style={{ transition: "all 200ms ease-out" }}
              />

              {/* Fine outer ring on active point — astrolabe crosshair */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={5}
                fill="none"
                stroke="#d4a04a"
                strokeWidth="0.5"
                opacity={isActive ? 0.45 : 0}
                style={{ transition: "all 200ms ease-out" }}
              />
            </g>
          );
        })}

        {/* Canon name labels — one per point; only the active/hovered label is visible */}
        {CANONS.map((c) => {
          const pt = arcPoint(ANGLES[c]);
          const isVisible = preview === c;
          const isActive = canon === c && !hovered;

          return (
            <text
              key={c}
              x={pt.x}
              y={pt.y + 16}
              textAnchor="middle"
              fill={isActive ? "#d4a04a" : "#6a6a7a"}
              fontSize="6.5"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.06em"
              opacity={isVisible ? 1 : 0}
              style={{ transition: "opacity 200ms ease-out" }}
            >
              {CANON_LABELS[c]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
