"use client";

import { DailyReadingsData } from "@/lib/types";
import { LITURGICAL_COLORS } from "@/lib/colors";
import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  data: DailyReadingsData | null;
  onSelectBook: (id: string) => void;
  onSelectChapter?: (chapter: number) => void;
  onOpenReading?: (bookId: string, reference: string, type: string, index: number) => void;
  onReadAll?: () => void;
  /** Increment to request opening the expanded card (e.g. from the "Reading today" chip). */
  openSignal?: number;
  /** Increment to collapse the card back to pill state (e.g. from Reset View). */
  collapseSignal?: number;
  /** Called whenever the expanded state changes. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Called when the user clicks "Dismiss for today". */
  onDismiss?: () => void;
}

const SESSION_SHOWN_KEY = "bible-atlas-readings-shown-this-session";

const TYPE_COLORS: Record<string, string> = {
  "First Reading":      "#fb923c",
  "Second Reading":     "#a78bfa",
  "Psalm":              "#fde68a",
  "Responsorial Psalm": "#fde68a",
  "Gospel":             "#38bdf8",
};
const DEFAULT_TYPE_COLOR = "#8a8a9a";

const NOISE_SVG = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.04'/></svg>")`;

type DisplayState = "peek" | "pill" | "expanded";

export default function ReadingsPill({ data, onSelectBook, onSelectChapter, onOpenReading, onReadAll, openSignal, collapseSignal, onExpandedChange, onDismiss }: Props) {
  // First-session auto-expand: peek only on the first load of the session.
  // Subsequent re-mounts (e.g. navigating back from /about) start collapsed.
  const [displayState, setDisplayState] = useState<DisplayState>(() => {
    if (typeof window === "undefined") return "peek";
    try {
      if (sessionStorage.getItem(SESSION_SHOWN_KEY) === "1") return "pill";
      sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    } catch {
      // sessionStorage unavailable — fall back to always-peek.
    }
    return "peek";
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [pillVisible, setPillVisible] = useState(false);
  const [expandedVisible, setExpandedVisible] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const lastOpenSignalRef = useRef<number | undefined>(openSignal);
  const lastCollapseSignalRef = useRef<number | undefined>(collapseSignal);

  useEffect(() => {
    if (openSignal === undefined) return;
    if (lastOpenSignalRef.current === openSignal) return;
    lastOpenSignalRef.current = openSignal;
    setDisplayState("expanded");
  }, [openSignal]);

  useEffect(() => {
    if (collapseSignal === undefined) return;
    if (lastCollapseSignalRef.current === collapseSignal) return;
    lastCollapseSignalRef.current = collapseSignal;
    setDisplayState("pill");
  }, [collapseSignal]);

  useEffect(() => {
    onExpandedChange?.(displayState === "expanded");
  }, [displayState, onExpandedChange]);

  if (!data) return null;

  const seasonColor = LITURGICAL_COLORS[data.season];

  // Format date as "20 MAR 2026"
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const mon = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const yr = now.getFullYear();
  const shortDate = `${day} ${mon} ${yr}`;

  const handleReadingClick = useCallback((bookId: string | undefined, reference: string, type: string, index: number) => {
    if (!bookId) return;
    if (onOpenReading) {
      onOpenReading(bookId, reference, type, index);
      setDisplayState("pill");
      return;
    }
    onSelectBook(bookId);
    if (onSelectChapter) {
      const match = reference.match(/(\d+)[:.\-]/);
      if (match) {
        const ch = parseInt(match[1], 10);
        if (!isNaN(ch)) onSelectChapter(ch);
      }
    }
    setDisplayState("pill");
  }, [onSelectBook, onSelectChapter, onOpenReading]);

  // Auto-collapse peek → pill after 4500ms
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (displayState !== "peek") return;
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setDisplayState("pill");
        setFading(false);
      }, 300);
    }, 4500);
    return () => clearTimeout(timer);
  }, [displayState]);

  // Pill fade-in
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (displayState === "pill") {
      setPillVisible(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPillVisible(true));
      });
    }
  }, [displayState]);

  // Expanded animation
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (displayState === "expanded") {
      setExpandedVisible(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setExpandedVisible(true));
      });
    }
  }, [displayState]);

  // Click outside to close expanded
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (displayState !== "expanded") return;
    const handleMouseDown = (e: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(e.target as Node)) {
        setDisplayState("pill");
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [displayState]);

  // Escape key to close expanded
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (displayState !== "expanded") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDisplayState("pill");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [displayState]);

  // ─── STATE 1: PEEK ───
  if (displayState === "peek") {
    return (
      <div
        ref={componentRef}
        className="readings-card"
        style={{
          width: "min(300px, calc(100vw - 32px))",
          background: "rgba(14, 14, 28, 0.88)",
          backgroundImage: NOISE_SVG,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--glass-border)",
          borderLeft: `2px solid ${seasonColor}`,
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          opacity: fading ? 0 : 1,
          transition: "opacity var(--transition-normal)",
        }}
      >
        {/* Row 1: Title + Date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-accent)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            TODAY&apos;S READINGS
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-secondary)",
              opacity: 0.75,
            }}
          >
            {shortDate}
          </span>
        </div>

        {/* Separator */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "10px 0" }} />

        {/* Compact reading list */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {data.readings.map((r, i) => (
            <div
              key={i}
              onClick={() => handleReadingClick(r.bookId, r.reference, r.type, i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 0",
                cursor: r.bookId ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: TYPE_COLORS[r.type] ?? DEFAULT_TYPE_COLOR,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "15px",
                  color: "var(--color-text-primary)",
                  opacity: 0.9,
                  fontWeight: 500,
                }}
              >
                {r.reference}
              </span>
            </div>
          ))}
        </div>

        {/* Season indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "10px" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: seasonColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {data.season}
          </span>
        </div>
      </div>
    );
  }

  // ─── STATE 2: PILL ───
  if (displayState === "pill") {
    return (
      <div ref={componentRef} style={{ position: "relative" }}>
        <button
          onClick={() => setDisplayState("expanded")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "190px",
            height: "38px",
            background: "var(--glass-bg-heavy)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            border: "1px solid var(--glass-border)",
            borderLeft: `2px solid ${seasonColor}`,
            borderRadius: "var(--radius-md)",
            padding: "9px 16px",
            opacity: pillVisible ? 0.65 : 0,
            transition: "all var(--transition-normal)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.65"; }}
        >
          {/* Book icon */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M2 2.5C2 1.67 2.67 1 3.5 1H6.5V13H3.5C2.67 13 2 12.33 2 11.5V2.5Z"
              stroke="var(--color-text-secondary)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M12 2.5C12 1.67 11.33 1 10.5 1H7.5V13H10.5C11.33 13 12 12.33 12 11.5V2.5Z"
              stroke="var(--color-text-secondary)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-secondary)",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            Today&apos;s Readings
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--color-text-muted)",
              marginLeft: "4px",
            }}
          >
            ({data.readings.length})
          </span>
        </button>
      </div>
    );
  }

  // ─── STATE 3: EXPANDED ───
  return (
    <div ref={componentRef} style={{ position: "relative" }}>
      {/* Anchor: invisible pill-sized spacer at bottom */}
      <div style={{ width: "190px", height: "38px" }} />

      {/* Upward-expanding panel */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          zIndex: 50,
          width: "min(300px, calc(100vw - 32px))",
          maxHeight: expandedVisible ? "min(500px, calc(80vh - 100px))" : "0px",
          opacity: expandedVisible ? 1 : 0,
          overflowY: "auto",
          background: "rgba(14, 14, 28, 0.88)",
          backgroundImage: NOISE_SVG,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--glass-border)",
          borderLeft: `2px solid ${seasonColor}`,
          borderRadius: "var(--radius-md)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.3)",
          transition: "opacity var(--transition-normal), max-height var(--transition-normal)",
        }}
      >
        <div style={{ padding: "24px" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--color-accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  display: "block",
                }}
              >
                TODAY&apos;S READINGS
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--color-text-primary)",
                  opacity: 0.75,
                  letterSpacing: "0.08em",
                  display: "block",
                  marginTop: "5px",
                }}
              >
                {shortDate}
              </span>
            </div>
            <button
              onClick={() => setDisplayState("pill")}
              className="three-state-interactive"
              style={{ color: "var(--color-text-primary)", padding: "2px", lineHeight: 0 }}
              aria-label="Close readings panel"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Separator */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "16px" }} />

          {/* Reading rows */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.readings.map((r, i) => {
              const isHovered = hoveredIndex === i;
              const dotColor = TYPE_COLORS[r.type] ?? DEFAULT_TYPE_COLOR;
              return (
                <button
                  key={i}
                  onClick={() => handleReadingClick(r.bookId, r.reference, r.type, i)}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 8px",
                    minHeight: "44px",
                    borderRadius: "3px",
                    background: isHovered ? "rgba(255, 255, 255, 0.04)" : "transparent",
                    transition: "background var(--transition-fast)",
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
                  {/* Type label */}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--color-text-primary)",
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
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "17px",
                      color: "var(--color-text-primary)",
                      opacity: isHovered ? 1 : 0.92,
                      fontWeight: 500,
                      transition: "opacity var(--transition-fast)",
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
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--color-text-primary)",
                opacity: 0.7,
              }}
            >
              {data.season}
            </span>
          </div>

          {/* Placeholder lectionary notice */}
          {data.placeholderNote && (
            <p
              style={{
                marginTop: "12px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                lineHeight: 1.5,
                color: "var(--color-text-muted)",
                fontStyle: "italic",
                letterSpacing: "0.02em",
              }}
            >
              {data.placeholderNote}
            </p>
          )}

          {/* Read All button */}
          {onReadAll && (
            <button
              onClick={() => {
                onReadAll();
                setDisplayState("pill");
              }}
              className="three-state-interactive"
              style={{
                marginTop: "16px",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                background: "var(--color-accent-muted)",
                border: "1px solid var(--color-accent-border)",
                borderRadius: "9999px",
                padding: "8px 20px",
                color: "var(--color-accent)",
                cursor: "pointer",
              }}
            >
              Read All →
            </button>
          )}

          {/* Dismiss for today */}
          {onDismiss && (
            <button
              onClick={() => {
                onDismiss();
                setDisplayState("pill");
              }}
              style={{
                marginTop: "10px",
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--color-text-secondary)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                letterSpacing: "0.06em",
                transition: "color 200ms ease-out",
                textDecoration: "underline",
                textDecorationColor: "rgba(196, 184, 168, 0.3)",
                textUnderlineOffset: "3px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            >
              Dismiss for today
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
