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

  // Position: keep within viewport
  const left = Math.min(screenX + 12, window.innerWidth - 320);
  const top = Math.min(Math.max(screenY - 40, 8), window.innerHeight - 200);

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        background: "rgba(8, 12, 20, 0.95)",
        border: `1px solid ${color}44`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: "12px 16px",
        color: "#e0e0e0",
        fontFamily: "monospace",
        fontSize: 12,
        zIndex: 110,
        maxWidth: 300,
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 6,
          right: 8,
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.4)",
          cursor: "pointer",
          fontSize: 14,
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
          fontWeight: "bold",
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          fontFamily: "monospace",
          textDecoration: "underline",
          textDecorationColor: `${color}44`,
        }}
      >
        {refStr}
      </button>

      {book && (
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 2 }}>
          {book.genre} &middot; {book.testament === "OT" ? "Old Testament" : book.testament === "NT" ? "New Testament" : "Deuterocanonical"}
        </div>
      )}

      {verse && (
        <div style={{ marginTop: 8 }}>
          {loading ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
              Loading scripture...
            </div>
          ) : text ? (
            <p style={{
              color: "rgba(255,255,255,0.7)",
              fontFamily: "Georgia, serif",
              fontSize: 12,
              lineHeight: "1.5",
              fontStyle: "italic",
              margin: 0,
            }}>
              &ldquo;{text}&rdquo;
            </p>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>
              Verse text unavailable
            </div>
          )}
        </div>
      )}

      {!verse && (
        <div style={{ marginTop: 6, color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
          {book ? `${book.chapters} chapters \u00b7 ${book.verses.toLocaleString()} verses` : ""}
        </div>
      )}

      <a
        href={getBibleGatewayUrl(bookId, chapter, verse)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          marginTop: 8,
          color,
          fontSize: 10,
          opacity: 0.7,
          textDecoration: "none",
        }}
      >
        Read on BibleGateway &rarr;
      </a>
    </div>
  );
}
