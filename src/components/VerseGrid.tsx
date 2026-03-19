"use client";

import React from "react";

interface VerseGridProps {
  bookName: string;
  chapter: number;
  totalVerses: number;
  selectedVerse?: number | null;
  onSelectVerse: (verse: number) => void;
  crossReferenceCounts?: Map<number, number>;
}

export default function VerseGrid({
  bookName,
  chapter,
  totalVerses,
  selectedVerse,
  onSelectVerse,
  crossReferenceCounts,
}: VerseGridProps) {
  const verses = Array.from({ length: totalVerses }, (_, i) => i + 1);

  const getCrossRefLevel = (verse: number): "none" | "low" | "high" => {
    if (!crossReferenceCounts) return "none";
    const count = crossReferenceCounts.get(verse) ?? 0;
    if (count >= 6) return "high";
    if (count >= 1) return "low";
    return "none";
  };

  return (
    <div className="verse-grid-container">
      <style>{`
        .verse-grid-container {
          padding: var(--space-lg);
        }

        .verse-grid-header {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: var(--space-md);
        }

        .verse-grid-scroll-note {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          font-style: italic;
          margin-top: 2px;
          margin-bottom: var(--space-sm);
        }

        .verse-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
          gap: var(--space-sm);
        }

        .verse-grid-btn {
          position: relative;
          min-width: 38px;
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface-2);
          color: var(--color-text-secondary);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          padding: 0;
          line-height: 1;
        }

        .verse-grid-btn:hover {
          background: var(--color-surface-3);
          color: var(--color-text-primary);
          border-color: var(--color-accent-border);
        }

        .verse-grid-btn:active {
          background: var(--color-surface-4);
          color: var(--color-accent);
          transform: scale(0.95);
        }

        .verse-grid-btn[data-selected="true"] {
          background: var(--color-accent-muted);
          color: var(--color-accent);
          border-color: var(--color-accent);
          font-weight: 600;
        }

        .verse-grid-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .verse-grid-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          border-radius: 50%;
          background: var(--color-accent);
          pointer-events: none;
        }

        .verse-grid-dot[data-level="low"] {
          width: 4px;
          height: 4px;
        }

        .verse-grid-dot[data-level="high"] {
          width: 6px;
          height: 6px;
          box-shadow: 0 0 4px var(--color-accent-muted);
        }
      `}</style>

      <div className="verse-grid-header">Verses</div>

      {totalVerses > 80 && (
        <div className="verse-grid-scroll-note">(scroll to see all)</div>
      )}

      <div className="verse-grid" role="grid" aria-label={`${bookName} chapter ${chapter} verses`}>
        {verses.map((verse) => {
          const level = getCrossRefLevel(verse);
          return (
            <button
              key={verse}
              type="button"
              className="verse-grid-btn"
              data-selected={selectedVerse === verse ? "true" : undefined}
              onClick={() => onSelectVerse(verse)}
              aria-label={`${bookName} chapter ${chapter} verse ${verse}`}
              aria-pressed={selectedVerse === verse}
            >
              {verse}
              {level !== "none" && (
                <span className="verse-grid-dot" data-level={level} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
