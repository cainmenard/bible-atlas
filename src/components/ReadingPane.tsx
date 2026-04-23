"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fetchPassageText, getBookName, type PassageResult } from "@/lib/bible-api";
import { VerseCrossRef } from "@/lib/types";
import { getVerseRefCounts } from "@/lib/crossref-utils";

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

/* ─── Translation display names ─── */

const TRANSLATION_DISPLAY_NAMES: Record<string, string> = {
  "rsv-ce": "RSV-CE",
  jb: "Jerusalem Bible",
  kjv: "King James Version",
  web: "World English Bible",
  dra: "Douay-Rheims",
};

const BIBLEGATEWAY_VERSIONS: Record<string, string> = {
  "rsv-ce": "RSVCE",
  jb: "JB",
  kjv: "KJV",
  web: "WEB",
  dra: "DRA",
};

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
  onViewConnections?: (bookId: string) => void;
  crossReferenceData?: VerseCrossRef[];
  onSelectVerse?: (bookId: string, chapter: number, verse: number) => void;
  /** Set when the active lectionary is a placeholder rotation (e.g. Lent
   * weekday readings indexed by dayOfWeek). Surfaced as an italic note. */
  placeholderNote?: string;
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
  onViewConnections,
  crossReferenceData,
  onSelectVerse,
  placeholderNote,
}: ReadingPaneProps) {
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getIsMobileServer);

  /* Extract chapter number from reference (e.g. "Genesis 1:1-5" → 1) */
  const chapterFromRef = useMemo(() => {
    if (!reading) return null;
    const m = reading.reference.match(/(\d+):/);
    return m ? parseInt(m[1], 10) : null;
  }, [reading?.reference]);

  /* Verse-level cross-ref counts for indicator dots */
  const verseRefCounts = useMemo(() => {
    if (!crossReferenceData || !chapterFromRef) return null;
    return getVerseRefCounts(crossReferenceData, chapterFromRef);
  }, [crossReferenceData, chapterFromRef]);

  const [passage, setPassage] = useState<PassageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [overrideTranslation, setOverrideTranslation] = useState<string | null>(null);

  /* Reset override when the parent translation or reading changes */
  useEffect(() => {
    setOverrideTranslation(null);
  }, [translation, reading?.reference]);

  const effectiveTranslation = overrideTranslation ?? translation;

  /* Fetch passage when reading or translation changes */
  useEffect(() => {
    if (!reading) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setPassage(null);

    fetchPassageText(reading.reference, effectiveTranslation).then((result) => {
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
  }, [reading?.reference, effectiveTranslation]);

  if (!reading) return null;

  const typeColor = getTypeColor(reading.type);
  const typeLabel = reading.type.toUpperCase();
  const bookName = getBookName(reading.bookId);
  const hasPrev = currentReadingIndex > 0;
  const hasNext = currentReadingIndex < allReadings.length - 1;
  const bgVersion = BIBLEGATEWAY_VERSIONS[effectiveTranslation] || "RSVCE";
  const bibleGatewayUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reading.reference)}&version=${bgVersion}`;

  /* Detect if the returned translation differs from what was requested */
  const requestedName = TRANSLATION_DISPLAY_NAMES[effectiveTranslation] || effectiveTranslation.toUpperCase();
  const isFallback =
    passage !== null &&
    effectiveTranslation !== "web" &&
    effectiveTranslation !== "kjv" &&
    effectiveTranslation !== "dra" &&
    !passage.translation.toLowerCase().includes(effectiveTranslation.replace("-", "").toLowerCase());
  const fallbackGatewayUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reading.reference)}&version=${BIBLEGATEWAY_VERSIONS[effectiveTranslation] || "RSVCE"}`;

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
                {passage?.translation || effectiveTranslation.toUpperCase()}
              </span>

              {/* Placeholder lectionary notice */}
              {placeholderNote && (
                <p
                  style={{
                    marginTop: "var(--space-sm)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    lineHeight: 1.5,
                    color: "var(--color-text-muted)",
                    fontStyle: "italic",
                    letterSpacing: "0.02em",
                    margin: "var(--space-sm) 0 0",
                  }}
                >
                  {placeholderNote}
                </p>
              )}

              {/* Fallback translation notice */}
              {isFallback && (
                <div style={{ marginTop: "var(--space-sm)" }}>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      fontStyle: "italic",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {requestedName} not available for free reading. Showing {passage.translation}.
                  </p>
                  <a
                    href={fallbackGatewayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="three-state-interactive"
                    style={{
                      display: "inline-block",
                      marginTop: "4px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--color-accent)",
                      textDecoration: "none",
                      fontStyle: "italic",
                    }}
                  >
                    Read in {requestedName} on BibleGateway →
                  </a>
                  {effectiveTranslation === "rsv-ce" && (
                    <button
                      onClick={() => setOverrideTranslation("dra")}
                      className="three-state-interactive"
                      style={{
                        display: "block",
                        marginTop: "4px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "var(--color-text-muted)",
                        fontStyle: "italic",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationColor: "var(--color-text-disabled)",
                        textUnderlineOffset: "2px",
                      }}
                    >
                      Try Douay-Rheims (Catholic, public domain)
                    </button>
                  )}
                </div>
              )}
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
                  {passage.verses.map((v) => {
                    const refCount = verseRefCounts?.get(v.verse) ?? 0;
                    const hasRefs = refCount > 0 && onSelectVerse && chapterFromRef !== null;

                    return (
                      <span key={v.verse}>
                        {hasRefs ? (
                          <sup
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectVerse(reading.bookId, chapterFromRef, v.verse)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectVerse(reading.bookId, chapterFromRef, v.verse);
                              }
                            }}
                            className="crossref-verse-indicator"
                            style={{
                              display: "inline",
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.65em",
                              verticalAlign: "super",
                              color: "var(--color-accent)",
                              opacity: 0.4,
                              marginRight: 2,
                              userSelect: "none",
                              cursor: "pointer",
                              transition: "opacity 200ms ease-out",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; }}
                            title={`${refCount} cross-reference${refCount > 1 ? "s" : ""}`}
                          >
                            {v.verse}
                            <span
                              style={{
                                display: "inline-block",
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                background: "var(--color-accent)",
                                marginLeft: 1,
                                verticalAlign: "super",
                              }}
                            />
                          </sup>
                        ) : (
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
                        )}
                        {v.text}{" "}
                      </span>
                    );
                  })}
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
            {onViewConnections && (
              <button
                onClick={() => onViewConnections(reading.bookId)}
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
                View connections in Arc →
              </button>
            )}
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
