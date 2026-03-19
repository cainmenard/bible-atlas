"use client";

import { useState } from "react";

interface CrossReferenceItemProps {
  reference: {
    targetBook: string;
    targetChapter: number;
    targetVerseStart: number;
    targetVerseEnd?: number;
    verseText?: string;
    votes?: number;
  };
  onNavigate: (book: string, chapter: number, verse: number) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function formatReference(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number
): string {
  const base = `${book} ${chapter}:${verseStart}`;
  if (verseEnd && verseEnd !== verseStart) {
    return `${base}–${verseEnd}`;
  }
  return base;
}

function getVoteDots(votes: number): number {
  if (votes < 5) return 1;
  if (votes <= 15) return 2;
  return 3;
}

export default function CrossReferenceItem({
  reference,
  onNavigate,
  isExpanded: controlledExpanded,
  onToggleExpand,
}: CrossReferenceItemProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const label = formatReference(
    reference.targetBook,
    reference.targetChapter,
    reference.targetVerseStart,
    reference.targetVerseEnd
  );

  const dotCount =
    reference.votes !== undefined ? getVoteDots(reference.votes) : 0;

  return (
    <div
      style={{
        padding: "var(--space-md) var(--space-lg)",
        borderBottom: "1px solid var(--glass-border)",
        transition: `background var(--transition-fast)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-surface-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
        }}
      >
        {/* Expand/collapse chevron */}
        {reference.verseText && (
          <button
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-label={`Show verse text for ${label}`}
            style={{
              background: "none",
              border: "none",
              padding: "2px",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              fontSize: "var(--text-sm)",
              lineHeight: 1,
              transition: `transform var(--transition-fast)`,
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ▸
          </button>
        )}

        {/* Navigate button */}
        <button
          onClick={() =>
            onNavigate(
              reference.targetBook,
              reference.targetChapter,
              reference.targetVerseStart
            )
          }
          aria-label={`Navigate to ${label}`}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            color: "var(--color-accent)",
            fontWeight: 500,
            textDecoration: "none",
            transition: `color var(--transition-fast)`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
        >
          {label}
        </button>

        {/* Vote dots */}
        {dotCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              marginLeft: "var(--space-xs)",
            }}
          >
            {Array.from({ length: dotCount }, (_, i) => (
              <span
                key={i}
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-accent)",
                  opacity: 0.6,
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Verse text */}
      {reference.verseText && (
        <div
          onClick={!expanded ? handleToggle : undefined}
          style={{
            marginTop: "var(--space-xs)",
            paddingLeft: reference.verseText ? "calc(var(--text-sm) + var(--space-sm) + 4px)" : "0",
            cursor: !expanded ? "pointer" : "default",
            ...(expanded
              ? {
                  borderLeft: "2px solid var(--color-accent-muted)",
                  paddingLeft: "var(--space-md)",
                  marginLeft: "calc(var(--text-sm) + var(--space-sm) + 2px)",
                }
              : {}),
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-base)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.55,
              fontStyle: "italic",
              margin: 0,
              ...(expanded
                ? {}
                : {
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical" as const,
                  }),
            }}
          >
            {reference.verseText}
          </p>
        </div>
      )}
    </div>
  );
}
