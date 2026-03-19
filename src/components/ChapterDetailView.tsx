"use client";

import React from "react";
import VerseGrid from "./VerseGrid";
import CrossReferenceList from "./CrossReferenceList";

export interface CrossReference {
  targetBook: string;
  targetChapter: number;
  targetVerseStart: number;
  targetVerseEnd?: number;
  verseText?: string;
  votes?: number;
}

interface ChapterDetailViewProps {
  bookName: string;
  chapter: number;
  totalVerses: number;
  crossReferences: Array<CrossReference>;
  crossReferenceCounts: Map<number, number>;
  onSelectVerse: (verse: number) => void;
  onNavigateCrossRef: (book: string, chapter: number, verse: number) => void;
}

export default function ChapterDetailView({
  bookName,
  chapter,
  totalVerses,
  crossReferences,
  crossReferenceCounts,
  onSelectVerse,
  onNavigateCrossRef,
}: ChapterDetailViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Chapter Header */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          padding: "var(--space-lg) var(--space-lg) 0",
        }}
      >
        {bookName} {chapter}
      </div>

      {/* Verse Selector */}
      <VerseGrid
        bookName={bookName}
        chapter={chapter}
        totalVerses={totalVerses}
        crossReferenceCounts={crossReferenceCounts}
        onSelectVerse={onSelectVerse}
      />

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
            Cross-references from this chapter
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            ({crossReferences.length})
          </span>
        </div>

        <CrossReferenceList
          references={crossReferences}
          groupBy="book"
          onNavigate={onNavigateCrossRef}
        />
      </div>
    </div>
  );
}
