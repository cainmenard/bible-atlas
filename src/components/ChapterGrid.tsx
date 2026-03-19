"use client";

import React from "react";

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
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  return (
    <div className="chapter-grid-container">
      <style>{`
        .chapter-grid-container {
          padding: var(--space-lg);
        }

        .chapter-grid-header {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: var(--space-md);
        }

        .chapter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
          gap: var(--space-sm);
        }

        .chapter-grid-btn {
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface-2);
          color: var(--color-text-secondary);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          padding: 0;
          line-height: 1;
        }

        .chapter-grid-btn:hover {
          background: var(--color-surface-3);
          color: var(--color-text-primary);
          border-color: var(--color-accent-border);
        }

        .chapter-grid-btn:active {
          background: var(--color-surface-4);
          color: var(--color-accent);
          transform: scale(0.95);
        }

        .chapter-grid-btn[data-selected="true"] {
          background: var(--color-accent-muted);
          color: var(--color-accent);
          border-color: var(--color-accent);
          font-weight: 600;
        }

        .chapter-grid-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
      `}</style>

      <div className="chapter-grid-header">Chapters</div>

      <div className="chapter-grid" role="grid" aria-label={`${bookName} chapters`}>
        {chapters.map((chapter) => (
          <button
            key={chapter}
            type="button"
            className="chapter-grid-btn"
            data-selected={selectedChapter === chapter ? "true" : undefined}
            onClick={() => onSelectChapter(chapter)}
            aria-label={`${bookName} chapter ${chapter}`}
            aria-pressed={selectedChapter === chapter}
          >
            {chapter}
          </button>
        ))}
      </div>
    </div>
  );
}
