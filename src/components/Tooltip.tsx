"use client";

import { BibleBook } from "@/lib/types";
import { GENRE_COLORS } from "@/lib/colors";

interface Props {
  book: BibleBook | null;
  x: number;
  y: number;
}

export default function Tooltip({ book, x, y }: Props) {
  if (!book) return null;

  const canons = book.canons.join(", ");
  // Clamp within viewport; tooltip width is at most min(240px, 90vw)
  const tooltipW = typeof window !== "undefined" ? Math.min(240, window.innerWidth * 0.9) : 240;
  const clampedLeft = typeof window !== "undefined"
    ? Math.max(8, Math.min(x + 16, window.innerWidth - tooltipW - 8))
    : x + 16;
  const clampedTop = typeof window !== "undefined"
    ? Math.max(8, Math.min(y - 10, window.innerHeight - 160))
    : y - 10;

  return (
    <div
      className="tooltip glass-panel"
      style={{
        left: clampedLeft,
        top: clampedTop,
        borderColor: GENRE_COLORS[book.genre] + "40",
      }}
    >
      <div
        className="font-serif"
        style={{ color: GENRE_COLORS[book.genre], fontWeight: 600, marginBottom: 6, fontSize: 14 }}
      >
        {book.name}
      </div>
      <div className="font-mono" style={{ color: "var(--text-secondary)", fontSize: 11 }}>
        {book.genre} &middot; {book.testament === "DC" ? "Deuterocanonical" : book.testament}
      </div>
      <div className="font-mono" style={{ color: "var(--text-secondary)", marginTop: 6, fontSize: 11 }}>
        {book.chapters} ch &middot; {book.verses.toLocaleString()} verses
      </div>
      <div className="font-mono" style={{ color: "var(--text-dim)", marginTop: 4, fontSize: 10 }}>
        Canons: {canons}
      </div>
    </div>
  );
}
