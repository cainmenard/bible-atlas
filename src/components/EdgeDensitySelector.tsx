"use client";

import { useState } from "react";

interface EdgeDensitySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export default function EdgeDensitySelector({ value, onChange }: EdgeDensitySelectorProps) {
  const [hoverLevel, setHoverLevel] = useState<number | null>(null);

  // While hovering, preview that level; otherwise show real value
  const displayLevel = hoverLevel ?? value;

  return (
    <div
      className="glass-panel"
      style={{
        width: 160,
        padding: "10px 16px 8px",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Label */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: "0.25em",
          color: "var(--text-dim)",
          textTransform: "uppercase",
          opacity: 0.85,
          userSelect: "none",
        }}
      >
        EDGES
      </span>

      {/* Tick marks — signal-strength meter (keyboard-accessible slider) */}
      <div
        role="slider"
        aria-label="Edge density"
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(10, value + 1));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(1, value - 1));
          } else if (e.key === "Home") {
            e.preventDefault();
            onChange(1);
          } else if (e.key === "End") {
            e.preventDefault();
            onChange(10);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          outline: "none",
          borderRadius: 4,
        }}
        onFocus={(e) => { e.currentTarget.style.outline = "1px solid rgba(212,160,74,0.4)"; }}
        onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const level = i + 1;
          const isLit = level <= displayLevel;
          const isHoveredTick = level === hoverLevel;

          return (
            <div
              key={level}
              onClick={() => onChange(level)}
              onMouseEnter={() => setHoverLevel(level)}
              onMouseLeave={() => setHoverLevel(null)}
              style={{
                width: 3,
                height: 14,
                borderRadius: 2,
                cursor: "pointer",
                backgroundColor: isLit
                  ? "var(--accent)"
                  : isHoveredTick
                  ? "rgba(212, 160, 74, 0.45)"
                  : "rgba(255, 255, 255, 0.15)",
                opacity: isLit ? 1 : isHoveredTick ? 0.7 : 0.25,
                boxShadow: isLit
                  ? "0 0 6px var(--accent), 0 0 12px rgba(212, 160, 74, 0.35)"
                  : isHoveredTick
                  ? "0 0 4px rgba(212, 160, 74, 0.3)"
                  : "none",
                // Staggered cascade: each tick transitions 30ms after the previous
                transition: "background-color 200ms ease-out, opacity 200ms ease-out, box-shadow 200ms ease-out",
                transitionDelay: `${i * 30}ms`,
              }}
            />
          );
        })}
      </div>

      {/* Numeric value */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--text-secondary)",
          opacity: 0.8,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {value}
      </span>
    </div>
  );
}
