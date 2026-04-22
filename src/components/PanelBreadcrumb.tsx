"use client";

import React from "react";
import {
  type PanelNavigationState,
  type PanelNavigationAction,
  getBreadcrumbItems,
} from "@/lib/panelNavigation";

interface PanelBreadcrumbProps {
  state: PanelNavigationState;
  dispatch: React.Dispatch<PanelNavigationAction>;
  onClose: () => void;
  totalChapters?: number;
  onChapterChange?: (chapter: number) => void;
}

export default function PanelBreadcrumb({
  state,
  dispatch,
  onClose,
  totalChapters,
  onChapterChange,
}: PanelBreadcrumbProps) {
  const items = getBreadcrumbItems(state);
  const showBackButton = state.level !== "book";

  // Chevrons appear when viewing a chapter. The CSS animation runs on DOM
  // mount, which only happens when entering chapter view (not on in-place
  // chapter changes via the chevrons themselves), matching the spec.
  const showChevrons =
    state.level === "chapter" && state.selectedChapter !== null;

  const currentChapter = state.selectedChapter ?? 0;
  const prevDisabled = !totalChapters || currentChapter <= 1;
  const nextDisabled = !totalChapters || currentChapter >= totalChapters;

  const goPrev = () => {
    if (prevDisabled) return;
    const prev = currentChapter - 1;
    dispatch({ type: "CHANGE_CHAPTER", chapter: prev });
    onChapterChange?.(prev);
  };
  const goNext = () => {
    if (nextDisabled) return;
    const next = currentChapter + 1;
    dispatch({ type: "CHANGE_CHAPTER", chapter: next });
    onChapterChange?.(next);
  };

  return (
    <nav
      aria-label="Scripture navigation"
      className="glass-header sticky top-0 z-10 flex items-center gap-2"
      style={{
        padding: "var(--space-md) var(--space-lg)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <style>{`
        @keyframes chapter-chevrons-in {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .chapter-chevron-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          animation: chapter-chevrons-in 150ms ease-out both;
        }

        .chapter-chevron-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          min-height: 24px;
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1;
          color: var(--text-secondary);
          background: none;
          border: none;
          padding: 0 4px;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .chapter-chevron-btn:hover:not(:disabled) {
          color: var(--accent);
        }

        .chapter-chevron-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          color: var(--text-secondary);
        }

        @media (prefers-reduced-motion: reduce) {
          .chapter-chevron-wrap {
            animation: none;
          }
        }
      `}</style>

      {/* Back button — only visible when deeper than book level */}
      {showBackButton && (
        <button
          type="button"
          aria-label="Go back"
          onClick={() => dispatch({ type: "GO_BACK" })}
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: 28,
            height: 28,
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            transition: "var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-text-primary)";
            e.currentTarget.style.background = "var(--color-surface-3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-text-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          ←
        </button>
      )}

      {/* Breadcrumb list */}
      <ol className="flex min-w-0 flex-1 items-center gap-0" role="list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isChapterSegment =
            isLast && item.level === "chapter" && showChevrons;

          return (
            <li key={`${item.level}-${item.label}`} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="mx-1 select-none"
                  style={{
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                  }}
                >
                  ›
                </span>
              )}

              {isChapterSegment ? (
                <span className="chapter-chevron-wrap">
                  <button
                    type="button"
                    className="chapter-chevron-btn"
                    aria-label="Previous chapter"
                    disabled={prevDisabled}
                    onClick={goPrev}
                  >
                    ‹
                  </button>
                  <span
                    aria-current="location"
                    className="truncate font-medium"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {item.label}
                  </span>
                  <button
                    type="button"
                    className="chapter-chevron-btn"
                    aria-label="Next chapter"
                    disabled={nextDisabled}
                    onClick={goNext}
                  >
                    ›
                  </button>
                </span>
              ) : isLast ? (
                /* Current segment — non-interactive */
                <span
                  aria-current="location"
                  className="truncate font-medium"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {item.label}
                </span>
              ) : (
                /* Clickable segment */
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: "GO_TO_LEVEL", level: item.level })
                  }
                  className="breadcrumb-button cursor-pointer truncate"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    transition: "var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--color-accent)";
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {/* Close button */}
      <button
        type="button"
        aria-label="Close detail panel"
        onClick={onClose}
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 16,
          transition: "var(--transition-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--color-text-primary)";
          e.currentTarget.style.background = "var(--color-surface-3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--color-text-muted)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        ×
      </button>
    </nav>
  );
}
