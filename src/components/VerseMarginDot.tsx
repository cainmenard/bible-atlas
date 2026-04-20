"use client";

import type { KeyboardEvent } from "react";

/*
 * Positioning: Option B (inline with the superscript) — chosen as the
 * lower-risk option per the brief. The dot is rendered as a child of the
 * verse-number sup and absolutely positioned inside a fixed padding-left
 * slot on that sup (see `.verse-num` / `.verse-margin-dot` in VerseReader).
 *
 * Why not Option A (paragraph-wide gutter): verses wrap across multiple
 * lines inside a prose paragraph, so a single left-rail gutter can't align
 * to every verse's first line without per-verse measurement.
 *
 * Layout stability: the sup always reserves horizontal space for the dot
 * via uniform padding-left, so text does not shift when a dot is or isn't
 * rendered, or when the index resolves after initial paint.
 */

interface VerseMarginDotProps {
  book: string;
  chapter: number;
  verse: number;
  count: number;
}

export default function VerseMarginDot({
  book,
  chapter,
  verse,
  count,
}: VerseMarginDotProps) {
  const handleActivate = () => {
    // Session 2B will replace this with popover/navigation logic.
    console.log(`[verse-xref] ${book} ${chapter}:${verse} — ${count} refs`);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <span
      className="verse-margin-dot"
      role="button"
      tabIndex={0}
      aria-label={`${count} cross-references for verse ${verse}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    />
  );
}
