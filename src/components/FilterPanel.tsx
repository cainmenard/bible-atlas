"use client";

import { useState, useRef, useEffect } from "react";
import { Canon } from "@/lib/types";
import TranslationSelector from "@/components/TranslationSelector";
import EdgeDensitySlider, { DensityStop } from "@/components/EdgeDensitySlider";

interface Props {
  canon: Canon;
  onCanonChange: (c: Canon) => void;
  translation: string;
  onTranslationChange: (t: string) => void;
  edgeDensity: DensityStop;
  onDensityChange: (d: DensityStop) => void;
}

const CANONS: { id: Canon; label: string; bookCount: number }[] = [
  { id: "catholic", label: "Catholic", bookCount: 73 },
  { id: "protestant", label: "Protestant", bookCount: 66 },
  { id: "orthodox", label: "Orthodox", bookCount: 81 },
  { id: "ethiopian", label: "Ethiopian", bookCount: 84 },
];

export default function FilterPanel({
  canon,
  onCanonChange,
  translation,
  onTranslationChange,
  edgeDensity,
  onDensityChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!expanded) return;
    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [expanded]);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  const activeCanon = CANONS.find((c) => c.id === canon)!;

  return (
    <div
      ref={panelRef}
      className="glass-panel"
      style={{
        position: "fixed",
        top: 64,
        right: 16,
        zIndex: 40,
        minWidth: expanded ? 228 : "auto",
        padding: expanded ? "16px" : "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: expanded ? 20 : 10,
        transition: "padding 200ms ease-out, min-width 200ms ease-out",
      }}
    >
      {/* Chevron toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse filter panel" : "Expand filter panel"}
        style={{
          alignSelf: "flex-end",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--text-secondary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 0 2px 0",
          letterSpacing: "0.08em",
          display: "flex",
          alignItems: "center",
          gap: 4,
          opacity: 0.7,
          transition: "opacity 200ms ease-out",
          lineHeight: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; }}
      >
        <span>{expanded ? "filters ▴" : "filters ▾"}</span>
      </button>

      {/* Translation */}
      <div style={{ display: "flex", flexDirection: "column", gap: expanded ? 8 : 4 }}>
        {expanded && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.15em",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            Translation
          </span>
        )}
        <TranslationSelector translation={translation} onChange={onTranslationChange} />
      </div>

      {/* Canon */}
      <div style={{ display: "flex", flexDirection: "column", gap: expanded ? 8 : 4 }}>
        {expanded && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.15em",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            Canon
          </span>
        )}
        {expanded ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {CANONS.map((c) => {
              const isActive = c.id === canon;
              return (
                <CanonRow
                  key={c.id}
                  label={c.label}
                  bookCount={c.bookCount}
                  isActive={isActive}
                  onClick={() => onCanonChange(c.id)}
                />
              );
            })}
          </div>
        ) : (
          <CanonCompact canon={activeCanon} onClick={() => setExpanded(true)} />
        )}
      </div>

      {/* Connection Density */}
      <div style={{ display: "flex", flexDirection: "column", gap: expanded ? 0 : 4 }}>
        {!expanded && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.1em",
              color: "var(--text-secondary)",
              opacity: 0.7,
              textTransform: "uppercase",
            }}
          >
            Density
          </span>
        )}
        <EdgeDensitySlider value={edgeDensity} onChange={onDensityChange} />
      </div>
    </div>
  );
}

/* ── Canon compact chip (collapsed state) ─────────────────── */

function CanonCompact({
  canon,
  onClick,
}: {
  canon: { id: Canon; label: string; bookCount: number };
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        letterSpacing: "0.06em",
        background: hovered ? "rgba(255,255,255,0.04)" : "none",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-sm)",
        padding: "6px 10px",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
        color: "var(--color-text-secondary)",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--color-accent)" }}>✦</span>
      <span>{canon.label}</span>
      <span style={{ color: "var(--text-dim)", fontSize: 10 }}>▾</span>
    </button>
  );
}

/* ── Canon row (expanded state) ───────────────────────────── */

function CanonRow({
  label,
  bookCount,
  isActive,
  onClick,
}: {
  label: string;
  bookCount: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 10px",
        background: !isActive && hovered ? "rgba(255,255,255,0.04)" : "none",
        border: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "background var(--transition-fast)",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        letterSpacing: "0.04em",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          flexShrink: 0,
          background: isActive ? "var(--color-accent)" : "transparent",
          border: isActive ? "none" : "1.5px solid var(--color-text-muted)",
          boxShadow: isActive ? "0 0 5px rgba(212,160,74,0.4)" : "none",
          transition: "all var(--transition-fast)",
        }}
      />
      <span
        style={{
          color: isActive
            ? "var(--color-accent)"
            : hovered
              ? "var(--color-text-primary)"
              : "var(--color-text-secondary)",
          transition: "color var(--transition-fast)",
          flex: 1,
          textAlign: "left",
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
        {bookCount}
      </span>
    </button>
  );
}
