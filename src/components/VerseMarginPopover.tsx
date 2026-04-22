"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Reference } from "@/lib/verse-index";
import { fetchVerseText, BIBLE_API_NAMES } from "@/lib/bible-api";

/* ──────────────────────────────────────────────────────────────
   Session-duration cache for referenced verse text.
   Keyed by bookId-chapter-verse-translation. Loaded on hover only.
   ────────────────────────────────────────────────────────────── */
interface VerseText {
  text: string;
  reference: string;
}

type CacheEntry = "pending" | "error" | VerseText;

const verseTextCache = new Map<string, CacheEntry>();

function cacheKey(bookId: string, ch: number, v: number, translation: string) {
  return `${bookId}-${ch}-${v}-${translation}`;
}

async function loadVerseText(
  bookId: string,
  ch: number,
  v: number,
  translation: string
): Promise<VerseText | null> {
  const key = cacheKey(bookId, ch, v, translation);
  const existing = verseTextCache.get(key);
  if (existing && existing !== "pending" && existing !== "error") return existing;
  if (existing === "error") return null;
  verseTextCache.set(key, "pending");
  const result = await fetchVerseText(bookId, ch, v, translation);
  if (result && result.text) {
    const vt: VerseText = { text: result.text, reference: result.reference };
    verseTextCache.set(key, vt);
    return vt;
  }
  verseTextCache.set(key, "error");
  return null;
}

function getCached(
  bookId: string,
  ch: number,
  v: number,
  translation: string
): VerseText | "pending" | "error" | undefined {
  return verseTextCache.get(cacheKey(bookId, ch, v, translation));
}

/* ──────────────────────────────────────────────────────────── */

interface VerseMarginPopoverProps {
  anchorRect: DOMRect;
  refs: Reference[];
  translation: string;
  onJump: (bookId: string, chapter: number, verse: number) => void;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const POPOVER_WIDTH = 320;
const VIEWPORT_MARGIN = 16;

export default function VerseMarginPopover({
  anchorRect,
  refs,
  translation,
  onJump,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: VerseMarginPopoverProps) {
  const [, forceRender] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch verse text for all refs.
  useEffect(() => {
    let cancelled = false;
    for (const r of refs) {
      const cached = getCached(r.bookId, r.chapter, r.verse, translation);
      if (cached === undefined) {
        loadVerseText(r.bookId, r.chapter, r.verse, translation).then(() => {
          if (!cancelled) forceRender((n) => n + 1);
        });
      }
    }
    return () => {
      cancelled = true;
    };
  }, [refs, translation]);

  // Position: anchored to dot, viewport-clamped, flipped upward if needed.
  // Written directly to style to avoid a re-render after DOM measurement.
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const measured = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchorRect.left + anchorRect.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, vw - POPOVER_WIDTH - VIEWPORT_MARGIN)
    );

    const gap = 8;
    const belowTop = anchorRect.bottom + gap;
    const aboveTop = anchorRect.top - measured.height - gap;
    const wouldOverflow = belowTop + measured.height > vh - VIEWPORT_MARGIN;
    const flipUp = wouldOverflow && aboveTop >= VIEWPORT_MARGIN;
    const top = flipUp ? aboveTop : belowTop;

    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.visibility = "visible";
  }, [anchorRect, refs.length]);

  // Dismiss on scroll anywhere in the document (capture phase catches
  // non-bubbling scroll events from scroll containers like DetailPanel).
  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-label="Cross-reference preview"
      className="glass-panel verse-margin-popover"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        width: POPOVER_WIDTH,
        zIndex: 60,
        padding: "14px 16px",
        visibility: "hidden",
      }}
    >
      <style>{`
        .verse-margin-popover {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: min(480px, calc(100vh - 32px));
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          animation: verse-popover-in 180ms ease-out both;
        }

        @keyframes verse-popover-in {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .verse-margin-popover-header {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .verse-margin-popover-count {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .verse-margin-popover-scroll {
          flex: 1 1 auto;
          overflow-y: auto;
          min-height: 0;
          padding-right: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 160, 74, 0.4) transparent;
        }

        .verse-margin-popover-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .verse-margin-popover-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .verse-margin-popover-scroll::-webkit-scrollbar-thumb {
          background: var(--color-accent);
          opacity: 0.4;
          border-radius: 3px;
        }

        .verse-margin-popover-scroll::-webkit-scrollbar-thumb:hover {
          opacity: 0.8;
        }

        .verse-margin-popover-entry {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .verse-margin-popover-entry + .verse-margin-popover-entry {
          padding-top: 14px;
          border-top: 1px solid var(--glass-border);
        }

        .verse-margin-popover-entry-header {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
        }

        .verse-margin-popover-body {
          font-family: var(--font-display);
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-primary);
        }

        .verse-margin-popover-body-error {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.7;
        }

        .verse-margin-popover-skeleton {
          display: block;
          height: 14px;
          border-radius: 3px;
          background: var(--text-dim);
          opacity: 0.3;
          animation: verse-popover-pulse 1.6s ease-in-out infinite;
        }

        @keyframes verse-popover-pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }

        .verse-margin-popover-jump {
          align-self: flex-start;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          color: var(--accent);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .verse-margin-popover-jump:hover {
          color: var(--color-accent-hover);
        }

        @media (prefers-reduced-motion: reduce) {
          .verse-margin-popover {
            animation: none;
          }
          .verse-margin-popover-skeleton {
            animation: none;
            opacity: 0.3;
          }
        }
      `}</style>

      {refs.length > 5 && (
        <div className="verse-margin-popover-header">
          <span className="verse-margin-popover-count">
            {refs.length} REFERENCES
          </span>
        </div>
      )}

      <div className="verse-margin-popover-scroll">
        {refs.map((r) => {
          const bookName = BIBLE_API_NAMES[r.bookId] ?? r.bookId;
          const cached = getCached(r.bookId, r.chapter, r.verse, translation);
          const isText =
            cached && cached !== "pending" && cached !== "error";
          const isError = cached === "error";
          return (
            <div
              key={`${r.bookId}-${r.chapter}-${r.verse}`}
              className="verse-margin-popover-entry"
            >
              <span className="verse-margin-popover-entry-header">
                {bookName} {r.chapter}:{r.verse}
              </span>
              {isText ? (
                <p className="verse-margin-popover-body">
                  {(cached as VerseText).text}
                </p>
              ) : isError ? (
                <p className="verse-margin-popover-body-error">
                  Unable to load referenced verse.
                </p>
              ) : (
                <span
                  className="verse-margin-popover-skeleton"
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                className="verse-margin-popover-jump"
                onClick={(e) => {
                  e.stopPropagation();
                  onJump(r.bookId, r.chapter, r.verse);
                }}
              >
                Jump to passage →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
