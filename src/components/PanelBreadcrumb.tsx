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
}

export default function PanelBreadcrumb({
  state,
  dispatch,
  onClose,
}: PanelBreadcrumbProps) {
  const items = getBreadcrumbItems(state);
  const showBackButton = state.level !== "book";

  return (
    <nav
      aria-label="Scripture navigation"
      className="glass-header sticky top-0 z-10 flex items-center gap-2"
      style={{
        padding: "var(--space-md) var(--space-lg)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
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

              {isLast ? (
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
