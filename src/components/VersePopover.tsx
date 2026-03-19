"use client";

import { useState, useEffect } from "react";
import { fetchVerseText, getBibleGatewayUrl, getBookName } from "@/lib/bible-api";
import { GENRE_COLORS } from "@/lib/colors";
import { bookMap } from "@/data/books";

interface Props {
  bookId: string;
  chapter: number;
  verse?: number;
  translation: string;
  screenX: number;
  screenY: number;
  onClose: () => void;
  onSelectBook: (id: string) => void;
}

export default function VersePopover({
  bookId,
  chapter,
  verse,
  translation,
  screenX,
  screenY,
  onClose,
  onSelectBook,
}: Props) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const book = bookMap.get(bookId);
  const color = book ? GENRE_COLORS[book.genre] : "#888";
  const bookName = getBookName(bookId);
  const refStr = verse ? `${bookName} ${chapter}:${verse}` : `${bookName} ${chapter}`;

  useEffect(() => {
    if (!verse) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    fetchVerseText(bookId, chapter, verse, translation).then((result) => {
      if (!cancelled) {
        setText(result?.text || null);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [bookId, chapter, verse, translation]);

  // ESC key closes the popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Position: keep within viewport, respecting min(320px, 90vw) width
  const maxWidth = Math.min(320, window.innerWidth * 0.9);
  const left = Math.max(8, Math.min(screenX + 12, window.innerWidth - maxWidth - 8));
  const top = Math.max(8, Math.min(screenY - 40, window.innerHeight - 80));

  return (
    <div
      className="glass-panel"
      style={{
        position: "fixed",
        left,
        top,
        borderLeft: `3px solid ${color}`,
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg) var(--space-xl)",
        color: "var(--color-text-primary)",
        zIndex: 110,
        maxWidth,
        overflowY: "auto",
        maxHeight: "80vh",
      }}
    >
      <button
        onClick={onClose}
        className="three-state-interactive"
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          background: "none",
          border: "none",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          fontSize: 14,
          padding: 0,
        }}
      >
        &times;
      </button>

      <button
        onClick={() => onSelectBook(bookId)}
        style={{
          background: "none",
          border: "none",
          color,
          fontFamily: "var(--font-display)",
          fontWeight: "bold",
          fontSize: 15,
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
          textDecorationColor: `${color}44`,
        }}
      >
        {refStr}
      </button>

      {book && (
        <div style={{
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-muted)",
          fontSize: "var(--text-xs)",
          marginTop: 4,
        }}>
          {book.genre} &middot; {book.testament === "OT" ? "Old Testament" : book.testament === "NT" ? "New Testament" : "Deuterocanonical"}
        </div>
      )}

      {verse && (
        <div style={{ marginTop: 10 }}>
          {loading ? (
            <div style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-muted)",
              fontStyle: "italic",
              fontSize: "var(--text-xs)",
            }}>
              Loading scripture...
            </div>
          ) : text ? (
            <p style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text-primary)",
              opacity: 0.8,
              fontSize: 13,
              lineHeight: "1.6",
              fontStyle: "italic",
              margin: 0,
            }}>
              &ldquo;{text}&rdquo;
            </p>
          ) : (
            <div style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-muted)",
              fontSize: "var(--text-xs)",
            }}>
              Verse text unavailable
            </div>
          )}
        </div>
      )}

      {!verse && (
        <div style={{
          fontFamily: "var(--font-mono)",
          marginTop: 8,
          color: "var(--color-text-secondary)",
          fontSize: "var(--text-xs)",
        }}>
          {book ? `${book.chapters} chapters \u00b7 ${book.verses.toLocaleString()} verses` : ""}
        </div>
      )}

      <a
        href={getBibleGatewayUrl(bookId, chapter, verse)}
        target="_blank"
        rel="noopener noreferrer"
        className="three-state-interactive"
        style={{
          display: "inline-block",
          marginTop: 10,
          fontFamily: "var(--font-mono)",
          color,
          fontSize: "var(--text-xs)",
          textDecoration: "none",
        }}
      >
        Read on BibleGateway &rarr;
      </a>
    </div>
  );
}
