"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fetchPassageText, getBookName, type PassageResult } from "@/lib/bible-api";

/* ─── Reading type colors (matches ReadingsPill) ─── */

const TYPE_COLORS: Record<string, string> = {
  "First Reading": "#fb923c",
  "Second Reading": "#a78bfa",
  Psalm: "#fde68a",
  "Responsorial Psalm": "#fde68a",
  Gospel: "#38bdf8",
};
const DEFAULT_TYPE_COLOR = "#8a8a9a";

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR;
}

/* ─── Mobile detection (same pattern as DetailPanel) ─── */

const MOBILE_QUERY = "(max-width: 768px)";

function subscribeMobile(cb: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getIsMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

const getIsMobileServer = () => false;

/* ─── Props ─── */

interface ReadingPaneProps {
  isOpen: boolean;
  reading: { type: string; reference: string; bookId: string } | null;
  translation: string;
  allReadings: Array<{ type: string; reference: string; bookId?: string }>;
  currentReadingIndex: number;
  onClose: () => void;
  onNavigateReading: (index: number) => void;
  onExploreBook: (bookId: string) => void;
}

/* ─── Component ─── */

export default function ReadingPane({
  isOpen,
  reading,
  translation,
  allReadings,
  currentReadingIndex,
  onClose,
  onNavigateReading,
  onExploreBook,
}: ReadingPaneProps) {
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getIsMobileServer);

  const [passage, setPassage] = useState<PassageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  /* Fetch passage when reading or translation changes */
  useEffect(() => {
    if (!reading) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setPassage(null);

    fetchPassageText(reading.reference, translation).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result) {
        setPassage(result);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [reading?.reference, translation]);

  if (!reading) return null;

  const typeColor = getTypeColor(reading.type);
  const typeLabel = reading.type.toUpperCase();
  const bookName = getBookName(reading.bookId);
  const hasPrev = currentReadingIndex > 0;
  const hasNext = currentReadingIndex < allReadings.length - 1;
  const bibleGatewayUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reading.reference)}&version=RSVCE`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="reading-pane"
          role="complementary"
          aria-label="Scripture reading"
          initial={isMobile ? { y: "100%" } : { x: "100%" }}
          animate={isMobile ? { y: "0%" } : { x: "0%" }}
          exit={isMobile ? { y: "100%" } : { x: "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: isMobile ? "auto" : 0,
            bottom: isMobile ? 0 : "auto",
            right: 0,
            width: isMobile ? "100%" : 440,
            minWidth: isMobile ? "100%" : 440,
            height: isMobile ? "85vh" : "100vh",
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--glass-bg-heavy)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            borderLeft: isMobile ? "none" : "1px solid var(--glass-border)",
            borderTop: isMobile ? "1px solid var(--glass-border)" : "none",
            borderTopLeftRadius: isMobile ? "var(--radius-lg)" : 0,
            borderTopRightRadius: isMobile ? "var(--radius-lg)" : 0,
            boxShadow: isMobile
              ? "0 -4px 24px rgba(0, 0, 0, 0.3)"
              : "-4px 0 24px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* ─── HEADER ─── */}
          <div
            className="glass-header"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-lg) var(--space-xl)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
              {/* Reading type label */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  letterSpacing: "0.12em",
                  color: typeColor,
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {typeLabel}
              </span>

              {/* Navigation */}
              {allReadings.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-xs)",
                    marginLeft: "var(--space-sm)",
                  }}
                >
                  <button
                    onClick={() => onNavigateReading(currentReadingIndex - 1)}
                    disabled={!hasPrev}
                    className="three-state-interactive"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      background: "none",
                      border: "none",
                      color: hasPrev ? "var(--color-text-secondary)" : "var(--color-text-disabled)",
                      cursor: hasPrev ? "pointer" : "default",
                      padding: "var(--space-xs) var(--space-sm)",
                      opacity: hasPrev ? undefined : 0.3,
                    }}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => onNavigateReading(currentReadingIndex + 1)}
                    disabled={!hasNext}
                    className="three-state-interactive"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      background: "none",
                      border: "none",
                      color: hasNext ? "var(--color-text-secondary)" : "var(--color-text-disabled)",
                      cursor: hasNext ? "pointer" : "default",
                      padding: "var(--space-xs) var(--space-sm)",
                      opacity: hasNext ? undefined : 0.3,
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="three-state-interactive"
              aria-label="Close reading pane"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "1.25rem",
                background: "none",
                border: "none",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                padding: "var(--space-xs) var(--space-sm)",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* ─── PASSAGE CONTENT ─── */}
          <div
            className="detail-panel-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {/* Reference heading */}
            <div
              style={{
                padding: "var(--space-2xl) var(--space-2xl) 0",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-2xl)",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {reading.reference}
              </h2>

              {/* Translation badge */}
              <span
                style={{
                  display: "inline-block",
                  marginTop: "var(--space-sm)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                  background: "var(--color-surface-3)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {passage?.translation || translation.toUpperCase()}
              </span>
            </div>

            {/* Passage text area */}
            <div
              style={{
                padding: "var(--space-2xl)",
              }}
            >
              {loading && (
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    fontStyle: "italic",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Loading passage…
                </p>
              )}

              {failed && (
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    color: "var(--color-text-muted)",
                    lineHeight: 1.85,
                  }}
                >
                  <p style={{ margin: "0 0 var(--space-lg)" }}>
                    This translation is not available for free reading. You can read it on
                    BibleGateway:
                  </p>
                  <a
                    href={bibleGatewayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="three-state-interactive"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-accent)",
                      textDecoration: "none",
                    }}
                  >
                    Read on BibleGateway →
                  </a>
                </div>
              )}

              {passage && passage.verses.length > 0 && (
                <div
                  style={{
                    borderLeft: `3px solid ${typeColor}`,
                    paddingLeft: "var(--space-2xl)",
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    lineHeight: 1.85,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {passage.verses.map((v) => (
                    <span key={v.verse}>
                      <sup
                        style={{
                          display: "inline",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.65em",
                          verticalAlign: "super",
                          color: "var(--color-accent)",
                          opacity: 0.6,
                          marginRight: 2,
                          userSelect: "none",
                        }}
                      >
                        {v.verse}
                      </sup>
                      {v.text}{" "}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── FOOTER ─── */}
          <div
            className="glass-header"
            style={{
              position: "sticky",
              bottom: 0,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-lg) var(--space-xl)",
              borderBottom: "none",
              borderTop: "1px solid var(--glass-border)",
            }}
          >
            <a
              href={bibleGatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="three-state-interactive"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--color-accent)",
                textDecoration: "none",
              }}
            >
              Read on BibleGateway →
            </a>
            <button
              onClick={() => onExploreBook(reading.bookId)}
              className="three-state-interactive"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-secondary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "var(--space-xs) var(--space-sm)",
              }}
            >
              Explore {bookName} →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
