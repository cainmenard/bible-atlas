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
      className="tooltip"
      style={{
        left: x + 16,
        top: y - 10,
        borderColor: GENRE_COLORS[book.genre] + "40",
      }}
    >
      <div style={{ color: GENRE_COLORS[book.genre], fontWeight: 600, marginBottom: 4 }}>
        {book.name}
      </div>
      <div style={{ opacity: 0.7 }}>
        {book.genre} &middot; {book.testament === "DC" ? "Deuterocanonical" : book.testament}
      </div>
      <div style={{ opacity: 0.6, marginTop: 4 }}>
        {book.chapters} ch &middot; {book.verses.toLocaleString()} verses
      </div>
      <div style={{ opacity: 0.45, marginTop: 2, fontSize: 10 }}>
        Canons: {canons}
      </div>
    </div>
  );
}
