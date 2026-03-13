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
    fetchVerseText(bookId, chapter, verse, translation).then((result) => {
      setText(result?.text || null);
      setLoading(false);
    });
  }, [bookId, chapter, verse, translation]);

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
        borderRadius: 10,
        padding: "16px 20px",
        color: "var(--text-primary)",
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
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: 14,
          padding: 0,
        }}
      >
        &times;
      </button>

      <button
        onClick={() => onSelectBook(bookId)}
        className="font-serif"
        style={{
          background: "none",
          border: "none",
          color,
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
        <div className="font-mono" style={{ color: "var(--text-dim)", fontSize: 10, marginTop: 4 }}>
          {book.genre} &middot; {book.testament === "OT" ? "Old Testament" : book.testament === "NT" ? "New Testament" : "Deuterocanonical"}
        </div>
      )}

      {verse && (
        <div style={{ marginTop: 10 }}>
          {loading ? (
            <div className="font-mono" style={{ color: "var(--text-dim)", fontStyle: "italic", fontSize: 11 }}>
              Loading scripture...
            </div>
          ) : text ? (
            <p className="font-serif" style={{
              color: "var(--text-primary)",
              opacity: 0.8,
              fontSize: 13,
              lineHeight: "1.6",
              fontStyle: "italic",
              margin: 0,
            }}>
              &ldquo;{text}&rdquo;
            </p>
          ) : (
            <div className="font-mono" style={{ color: "var(--text-dim)", fontSize: 10 }}>
              Verse text unavailable
            </div>
          )}
        </div>
      )}

      {!verse && (
        <div className="font-mono" style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 11 }}>
          {book ? `${book.chapters} chapters \u00b7 ${book.verses.toLocaleString()} verses` : ""}
        </div>
      )}

      <a
        href={getBibleGatewayUrl(bookId, chapter, verse)}
        target="_blank"
        rel="noopener noreferrer"
        className="three-state-interactive font-mono"
        style={{
          display: "inline-block",
          marginTop: 10,
          color,
          fontSize: 10,
          textDecoration: "none",
        }}
      >
        Read on BibleGateway &rarr;
      </a>
    </div>
  );
}
