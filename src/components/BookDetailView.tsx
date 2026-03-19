"use client";

import React from "react";
import ChapterGrid from "./ChapterGrid";

interface BookDetailViewProps {
  book: {
    name: string;
    testament: "OT" | "NT";
    category: string;
    totalChapters: number;
    totalVerses: number;
    totalCrossReferences: number;
  };
  connectedBooks: Array<{
    name: string;
    connectionCount: number;
  }>;
  onSelectChapter: (chapter: number) => void;
  onSelectConnectedBook: (bookName: string) => void;
}

export default function BookDetailView({
  book,
  connectedBooks,
  onSelectChapter,
  onSelectConnectedBook,
}: BookDetailViewProps) {
  const top8 = connectedBooks.slice(0, 8);
  const maxCount = top8.length > 0 ? top8[0].connectionCount : 1;

  return (
    <div className="book-detail-view">
      <style>{`
        .book-detail-view {
          padding: var(--space-lg) var(--space-xl);
        }

        /* ── Header ── */
        .book-detail-title {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.2;
          margin: 0;
        }

        .book-detail-badge {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          margin-left: var(--space-sm);
          vertical-align: middle;
          line-height: 1.6;
        }

        .book-detail-badge[data-testament="OT"] {
          background: rgba(120, 140, 170, 0.15);
          color: #8a9ab5;
        }

        .book-detail-badge[data-testament="NT"] {
          background: var(--color-accent-muted);
          color: var(--color-accent);
        }

        .book-detail-category {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          margin-top: var(--space-xs);
        }

        .book-detail-stats {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-top: var(--space-md);
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }

        .book-detail-stats-dot {
          color: var(--color-text-disabled);
          user-select: none;
        }

        /* ── Section headers ── */
        .book-detail-section-header {
          font-family: var(--font-display);
          font-size: var(--text-lg);
          color: var(--color-text-secondary);
          margin-top: var(--space-xl);
          margin-bottom: var(--space-md);
        }

        /* ── Connected books list ── */
        .book-detail-conn-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .book-detail-conn-item {
          display: block;
          width: 100%;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          padding: var(--space-sm) var(--space-md);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
        }

        .book-detail-conn-item:hover {
          background: var(--color-surface-2);
        }

        .book-detail-conn-item:hover .book-detail-conn-name {
          color: var(--color-text-primary);
        }

        .book-detail-conn-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .book-detail-conn-name {
          font-family: var(--font-display);
          font-size: var(--text-base);
          color: var(--color-text-secondary);
          transition: color var(--transition-fast);
        }

        .book-detail-conn-count {
          font-family: var(--font-mono);
          font-size: var(--text-sm);
          color: var(--color-text-muted);
          flex-shrink: 0;
          margin-left: var(--space-md);
        }

        .book-detail-conn-bar {
          height: 3px;
          border-radius: 2px;
          background: var(--color-accent-muted);
          margin-top: 4px;
          transition: width var(--transition-normal);
        }
      `}</style>

      {/* ── Book Header ── */}
      <div>
        <h2 className="book-detail-title">
          {book.name}
          <span
            className="book-detail-badge"
            data-testament={book.testament}
          >
            {book.testament}
          </span>
        </h2>
        <div className="book-detail-category">{book.category}</div>
        <div className="book-detail-stats">
          <span>{book.totalChapters} chapters</span>
          <span className="book-detail-stats-dot">&middot;</span>
          <span>{book.totalVerses.toLocaleString()} verses</span>
          <span className="book-detail-stats-dot">&middot;</span>
          <span>{book.totalCrossReferences.toLocaleString()} cross-references</span>
        </div>
      </div>

      {/* ── Chapter Selector ── */}
      <div className="book-detail-section-header">Select a chapter</div>
      <ChapterGrid
        bookName={book.name}
        totalChapters={book.totalChapters}
        onSelectChapter={onSelectChapter}
      />

      {/* ── Connected Books ── */}
      {top8.length > 0 && (
        <>
          <div className="book-detail-section-header">Most connected books</div>
          <div className="book-detail-conn-list" role="list">
            {top8.map((conn) => (
              <button
                key={conn.name}
                type="button"
                className="book-detail-conn-item"
                onClick={() => onSelectConnectedBook(conn.name)}
                role="listitem"
              >
                <div className="book-detail-conn-row">
                  <span className="book-detail-conn-name">{conn.name}</span>
                  <span className="book-detail-conn-count">
                    {conn.connectionCount.toLocaleString()}
                  </span>
                </div>
                <div
                  className="book-detail-conn-bar"
                  style={{
                    width: `${(conn.connectionCount / maxCount) * 100}%`,
                  }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
