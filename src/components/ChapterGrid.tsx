"use client";

import React from "react";
import { CHAPTER_VERSES } from "@/data/chapter-verses";

interface ChapterGridProps {
  bookId: string;
  bookName: string;
  totalChapters: number;
  selectedChapter?: number | null;
  onSelectChapter: (chapter: number) => void;
}

export default function ChapterGrid({
  bookId,
  bookName,
  totalChapters,
  selectedChapter,
  onSelectChapter,
}: ChapterGridProps) {
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);
  const verseCounts = CHAPTER_VERSES[bookId] ?? [];

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
          grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
          gap: var(--space-sm);
        }

        .chapter-grid-btn {
          min-width: 52px;
          min-height: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: var(--color-surface-2);
          color: var(--color-text-secondary);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          cursor: pointer;
          transition: all var(--transition-fast);
          padding: 0;
        }

        .chapter-grid-num {
          font-size: var(--text-sm);
          font-weight: 500;
          line-height: 1;
        }

        .chapter-grid-verses {
          font-family: var(--font-mono);
          font-size: 0.625rem;
          font-weight: 400;
          line-height: 1;
          letter-spacing: 0.04em;
          color: var(--color-text-muted);
        }

        .chapter-grid-btn:hover {
          background: var(--color-surface-3);
          color: var(--color-text-primary);
          border-color: var(--color-accent-border);
        }

        .chapter-grid-btn:hover .chapter-grid-verses {
          color: var(--color-text-secondary);
        }

        .chapter-grid-btn:active {
          background: var(--color-surface-4);
          color: var(--color-accent);
          transform: scale(0.95);
        }

        .chapter-grid-btn[data-selected="true"] {
          background: linear-gradient(
            180deg,
            rgba(212, 160, 74, 0.22) 0%,
            rgba(212, 160, 74, 0.14) 100%
          );
          color: var(--color-accent);
          border-color: var(--color-accent);
          font-weight: 600;
          box-shadow:
            0 0 0 1px rgba(212, 160, 74, 0.4),
            0 0 18px rgba(212, 160, 74, 0.45),
            inset 0 0 12px rgba(212, 160, 74, 0.12);
        }

        .chapter-grid-btn[data-selected="true"] .chapter-grid-num {
          text-shadow: 0 0 10px rgba(212, 160, 74, 0.6);
        }

        .chapter-grid-btn[data-selected="true"] .chapter-grid-verses {
          color: var(--color-accent-hover);
          opacity: 0.9;
        }

        .chapter-grid-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        @media (max-width: 480px) {
          .chapter-grid {
            grid-template-columns: repeat(auto-fill, minmax(46px, 1fr));
          }
          .chapter-grid-btn {
            min-width: 46px;
            min-height: 50px;
          }
        }
      `}</style>

      <div className="chapter-grid-header">Chapters</div>

      <div className="chapter-grid" role="grid" aria-label={`${bookName} chapters`}>
        {chapters.map((chapter) => {
          const count = verseCounts[chapter - 1];
          const hasCount = typeof count === "number";
          return (
            <button
              key={chapter}
              type="button"
              className="chapter-grid-btn"
              data-selected={selectedChapter === chapter ? "true" : undefined}
              onClick={() => onSelectChapter(chapter)}
              aria-label={
                hasCount
                  ? `${bookName} chapter ${chapter}, ${count} verses`
                  : `${bookName} chapter ${chapter}`
              }
              aria-pressed={selectedChapter === chapter}
            >
              <span className="chapter-grid-num">{chapter}</span>
              <span className="chapter-grid-verses" aria-hidden="true">
                {hasCount ? `${count}v` : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
