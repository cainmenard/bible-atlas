"use client";

import React, { useMemo } from "react";
import CrossReferenceList from "./CrossReferenceList";

export interface CrossReference {
  targetBook: string;
  targetChapter: number;
  targetVerseStart: number;
  targetVerseEnd?: number;
  verseText?: string;
  votes?: number;
}

interface VerseDetailViewProps {
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
  translation: string;
  crossReferences: Array<CrossReference>;
  onNavigateCrossRef: (book: string, chapter: number, verse: number) => void;
  onChangeTranslation: (translation: string) => void;
  availableTranslations: string[];
}

export default function VerseDetailView({
  bookName,
  chapter,
  verse,
  verseText,
  translation,
  crossReferences,
  onNavigateCrossRef,
  onChangeTranslation,
  availableTranslations,
}: VerseDetailViewProps) {
  const sortedRefs = useMemo(
    () =>
      [...crossReferences].sort(
        (a, b) => (b.votes ?? 0) - (a.votes ?? 0)
      ),
    [crossReferences]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Verse Header */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          padding: "var(--space-lg) var(--space-lg) 0",
        }}
      >
        {bookName} {chapter}:{verse}
      </div>

      {/* Verse Text Block */}
      <div
        style={{
          margin: "0 var(--space-lg)",
          background: "var(--color-surface-2)",
          padding: "var(--space-xl)",
          borderRadius: "var(--radius-md)",
          borderLeft: "3px solid var(--color-accent-muted)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            color: "var(--color-text-primary)",
            lineHeight: 1.65,
            fontStyle: "italic",
          }}
        >
          {verseText}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-md)",
          }}
        >
          &mdash; {translation}
        </div>
      </div>

      {/* Translation Selector */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
          padding: "0 var(--space-lg)",
        }}
      >
        {availableTranslations.map((t) => {
          const isSelected = t === translation;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChangeTranslation(t)}
              aria-pressed={isSelected}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                padding: "var(--space-xs) var(--space-md)",
                borderRadius: "9999px",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
                border: isSelected
                  ? "1px solid var(--color-accent)"
                  : "1px solid transparent",
                background: isSelected
                  ? "var(--color-accent-muted)"
                  : "var(--color-surface-2)",
                color: isSelected
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-muted)";
                }
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Cross-References Section */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "var(--space-sm)",
            padding: "0 var(--space-lg)",
            marginBottom: "var(--space-sm)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              fontWeight: 500,
            }}
          >
            Cross-references
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            ({sortedRefs.length})
          </span>
        </div>

        <CrossReferenceList
          references={sortedRefs}
          groupBy="book"
          onNavigate={onNavigateCrossRef}
        />
      </div>
    </div>
  );
}
