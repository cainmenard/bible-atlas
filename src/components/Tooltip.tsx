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

  return (
    <div
      className="tooltip glass-panel"
      style={{
        left: x + 16,
        top: y - 10,
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
