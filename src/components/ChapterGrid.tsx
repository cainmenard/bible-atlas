"use client";

import { useState, useCallback } from "react";

interface ChapterGridProps {
  bookName: string;
  totalChapters: number;
  selectedChapter?: number | null;
  onSelectChapter: (chapter: number) => void;
}

export default function ChapterGrid({
  bookName,
  totalChapters,
  selectedChapter,
  onSelectChapter,
}: ChapterGridProps) {
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null);
  const [pressedChapter, setPressedChapter] = useState<number | null>(null);
  const [focusedChapter, setFocusedChapter] = useState<number | null>(null);

  const handleMouseEnter = useCallback((chapter: number) => {
    setHoveredChapter(chapter);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredChapter(null);
    setPressedChapter(null);
  }, []);

  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  return (
    <div style={{ padding: "var(--space-lg)" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "var(--space-md)",
        }}
      >
        Chapters
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))",
          gap: "var(--space-sm)",
        }}
      >
        {chapters.map((chapter) => {
          const isSelected = selectedChapter === chapter;
          const isHovered = hoveredChapter === chapter;
          const isPressed = pressedChapter === chapter;
          const isFocusVisible = focusedChapter === chapter;

          return (
            <button
              key={chapter}
              type="button"
              aria-label={`${bookName} chapter ${chapter}`}
              aria-pressed={isSelected}
              onClick={() => onSelectChapter(chapter)}
              onMouseEnter={() => handleMouseEnter(chapter)}
              onMouseLeave={handleMouseLeave}
              onMouseDown={() => setPressedChapter(chapter)}
              onMouseUp={() => setPressedChapter(null)}
              onFocus={(e) => {
                if (e.target.matches(":focus-visible")) {
                  setFocusedChapter(chapter);
                }
              }}
              onBlur={() => setFocusedChapter(null)}
              style={{
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                fontWeight: isSelected ? 600 : 500,
                color:
                  isSelected || isPressed
                    ? "var(--color-accent)"
                    : isHovered
                      ? "var(--color-text-primary)"
                      : "var(--color-text-secondary)",
                background:
                  isSelected
                    ? "var(--color-accent-muted)"
                    : isPressed
                      ? "var(--color-surface-4)"
                      : isHovered
                        ? "var(--color-surface-3)"
                        : "var(--color-surface-2)",
                border: `1px solid ${
                  isSelected
                    ? "var(--color-accent)"
                    : isHovered
                      ? "var(--color-accent-border)"
                      : "transparent"
                }`,
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "var(--transition-fast)",
                transform: isPressed ? "scale(0.95)" : "scale(1)",
                outline: isFocusVisible
                  ? "2px solid var(--color-accent)"
                  : "none",
                outlineOffset: isFocusVisible ? 2 : 0,
                padding: 0,
              }}
            >
              {chapter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
