"use client";

import { useRef, useState } from "react";
import { ViewMode } from "@/lib/types";

interface Props {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function GraphIcon({ active }: { active: boolean }) {
  const color = active ? "var(--accent)" : "rgba(138, 138, 154, 0.9)";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transition: "all 200ms ease-out" }}
    >
      {/* Constellation lines */}
      <line x1="9" y1="3" x2="3" y2="9" stroke={color} strokeWidth="0.8" strokeLinecap="round" style={{ transition: "stroke 200ms ease-out" }} />
      <line x1="9" y1="3" x2="15" y2="9" stroke={color} strokeWidth="0.8" strokeLinecap="round" style={{ transition: "stroke 200ms ease-out" }} />
      <line x1="3" y1="9" x2="5" y2="15" stroke={color} strokeWidth="0.8" strokeLinecap="round" style={{ transition: "stroke 200ms ease-out" }} />
      <line x1="15" y1="9" x2="13" y2="15" stroke={color} strokeWidth="0.8" strokeLinecap="round" style={{ transition: "stroke 200ms ease-out" }} />
      <line x1="3" y1="9" x2="15" y2="9" stroke={color} strokeWidth="0.8" strokeLinecap="round" style={{ transition: "stroke 200ms ease-out" }} />
      <line x1="5" y1="15" x2="13" y2="15" stroke={color} strokeWidth="0.8" strokeLinecap="round" style={{ transition: "stroke 200ms ease-out" }} />
      {/* Constellation dots */}
      <circle cx="9" cy="3" r="1.2" fill={color} style={{ transition: "fill 200ms ease-out" }} />
      <circle cx="3" cy="9" r="1.2" fill={color} style={{ transition: "fill 200ms ease-out" }} />
      <circle cx="15" cy="9" r="1.2" fill={color} style={{ transition: "fill 200ms ease-out" }} />
      <circle cx="5" cy="15" r="1.2" fill={color} style={{ transition: "fill 200ms ease-out" }} />
      <circle cx="13" cy="15" r="1.2" fill={color} style={{ transition: "fill 200ms ease-out" }} />
    </svg>
  );
}

function ArcsIcon({ active }: { active: boolean }) {
  const color = active ? "var(--accent)" : "rgba(138, 138, 154, 0.9)";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transition: "all 200ms ease-out" }}
    >
      {/* Outer semicircle boundary */}
      <path
        d="M 2 14 A 7 7 0 0 1 16 14"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
        style={{ transition: "stroke 200ms ease-out" }}
      />
      {/* Wide inner chord arc */}
      <path
        d="M 4 14 A 5 5 0 0 1 14 14"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
        style={{ transition: "stroke 200ms ease-out" }}
      />
      {/* Narrow inner chord arc */}
      <path
        d="M 6.5 14 A 2.5 2.5 0 0 1 11.5 14"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
        style={{ transition: "stroke 200ms ease-out" }}
      />
    </svg>
  );
}

export default function CelestialOrreryToggle({ viewMode, onChange }: Props) {
  const [activatingMode, setActivatingMode] = useState<ViewMode | null>(null);

  function handleClick(mode: ViewMode) {
    if (mode === viewMode) return;
    setActivatingMode(mode);
    onChange(mode);
  }

  function handleAnimationEnd() {
    setActivatingMode(null);
  }

  return (
    <div
      className="glass-panel flex items-center h-11 md:h-9"
      style={{
        width: 80,
        borderRadius: 18,
        padding: "2px 2px",
        gap: 2,
      }}
    >
      {/* Graph button */}
      <button
        onClick={() => handleClick("graph")}
        onAnimationEnd={handleAnimationEnd}
        className={`h-10 md:h-8 ${activatingMode === "graph" ? "orrery-activate" : ""}`}
        style={{
          width: 36,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            viewMode === "graph"
              ? "radial-gradient(circle, rgba(212,160,74,0.15) 0%, transparent 70%)"
              : "transparent",
          opacity: viewMode === "graph" ? 1 : 0.3,
          transition: "all 200ms ease-out",
          cursor: "pointer",
          border: "none",
          outline: "none",
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Graph view"
        aria-pressed={viewMode === "graph"}
      >
        <GraphIcon active={viewMode === "graph"} />
      </button>

      {/* Arcs button */}
      <button
        onClick={() => handleClick("arcs")}
        onAnimationEnd={handleAnimationEnd}
        className={`h-10 md:h-8 ${activatingMode === "arcs" ? "orrery-activate" : ""}`}
        style={{
          width: 36,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            viewMode === "arcs"
              ? "radial-gradient(circle, rgba(212,160,74,0.15) 0%, transparent 70%)"
              : "transparent",
          opacity: viewMode === "arcs" ? 1 : 0.3,
          transition: "all 200ms ease-out",
          cursor: "pointer",
          border: "none",
          outline: "none",
          padding: 0,
          flexShrink: 0,
        }}
        aria-label="Arc view"
        aria-pressed={viewMode === "arcs"}
      >
        <ArcsIcon active={viewMode === "arcs"} />
      </button>
    </div>
  );
}
