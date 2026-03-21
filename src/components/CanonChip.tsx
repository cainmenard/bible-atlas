"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Canon } from "@/lib/types";

interface Props {
  canon: Canon;
  onChange: (c: Canon) => void;
}

const CANONS = [
  { id: "catholic" as Canon, label: "Catholic", bookCount: 73 },
  { id: "protestant" as Canon, label: "Protestant", bookCount: 66 },
  { id: "orthodox" as Canon, label: "Orthodox", bookCount: 81 },
  { id: "ethiopian" as Canon, label: "Ethiopian", bookCount: 84 },
];

export default function CanonChip({ canon, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLabel =
    CANONS.find((c) => c.id === canon)?.label ?? "Catholic";

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = useCallback(
    (id: Canon) => {
      onChange(id);
      setIsOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Popover (opens upward) */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            width: "min(190px, calc(100vw - 40px))",
            background: "var(--glass-bg-heavy)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 50,
            paddingBottom: 8,
            animation: "canon-popover-in 150ms ease-out forwards",
            transformOrigin: "bottom left",
          }}
        >
          {/* Header */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "12px 16px 8px",
            }}
          >
            Canon
          </div>

          {/* Separator */}
          <div
            style={{
              height: 1,
              background: "var(--glass-border)",
              margin: "0 12px",
            }}
          />

          {/* Options */}
          {CANONS.map((c) => {
            const isActive = c.id === canon;
            return (
              <CanonOption
                key={c.id}
                label={c.label}
                bookCount={c.bookCount}
                isActive={isActive}
                onClick={() => handleSelect(c.id)}
              />
            );
          })}
        </div>
      )}

      {/* Chip (always visible) */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          WebkitBackdropFilter: "blur(var(--glass-blur))",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-md)",
          padding: "8px 14px",
          cursor: "pointer",
          opacity: isOpen ? 1 : undefined,
          transition: "all var(--transition-normal)",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
        className={isOpen ? undefined : "three-state-interactive"}
        data-active={isOpen ? "true" : undefined}
        aria-label="Canon selector"
        aria-expanded={isOpen}
      >
        <span style={{ color: "var(--color-accent)", marginRight: 6 }}>✦</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{activeLabel}</span>
        <span
          style={{
            color: "var(--color-text-muted)",
            marginLeft: 6,
            fontSize: 10,
          }}
        >
          ▾
        </span>
      </button>

    </div>
  );
}

/* ── Option row ────────────────────────────────────────── */

function CanonOption({
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
        width: "100%",
        padding: "12px 16px",
        minHeight: "44px",
        background: !isActive && hovered ? "rgba(255,255,255,0.04)" : "none",
        border: "none",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
        fontFamily: "var(--font-mono)",
        lineHeight: 1,
      }}
    >
      {/* Radio dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flexShrink: 0,
          background: isActive ? "var(--color-accent)" : "transparent",
          border: isActive ? "none" : "1.5px solid var(--color-text-muted)",
          boxShadow: isActive ? "0 0 6px rgba(212,160,74,0.4)" : "none",
          transition: "all var(--transition-fast)",
        }}
      />

      {/* Label */}
      <span
        style={{
          marginLeft: 10,
          fontSize: 12,
          letterSpacing: "0.04em",
          color: isActive
            ? "var(--color-accent)"
            : hovered
              ? "var(--color-text-primary)"
              : "var(--color-text-secondary)",
          transition: "all var(--transition-fast)",
        }}
      >
        {label}
      </span>

      {/* Book count */}
      <span
        style={{
          marginLeft: "auto",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-muted)",
        }}
      >
        {bookCount}
      </span>
    </button>
  );
}
