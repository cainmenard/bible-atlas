"use client";

import { forwardRef } from "react";

interface Props {
  onClick: () => void;
}

function SearchIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  // `navigator.platform` is deprecated but still the most reliable signal
  // for modifier-key labelling across Chrome/Firefox/Safari today.
  const platform = navigator.platform ?? "";
  if (platform) return /mac/i.test(platform);
  return /mac/i.test(navigator.userAgent ?? "");
}

const SearchTrigger = forwardRef<HTMLButtonElement, Props>(function SearchTrigger(
  { onClick },
  ref,
) {
  // Platform is detected inline. Under SSR this returns false, so the server
  // HTML ships with "Ctrl K". The hint span is hydration-suppressed so the
  // client swap to "⌘K" on Mac doesn't trigger a mismatch warning.
  const isMac = detectIsMac();
  const hint = isMac ? "⌘K" : "Ctrl K";

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="search-trigger"
      aria-label="Open search palette"
      aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
    >
      <span className="search-trigger-icon">
        <SearchIcon />
      </span>
      <span className="search-trigger-label">Search</span>
      <span className="search-trigger-hint" suppressHydrationWarning>
        {hint}
      </span>
    </button>
  );
});

export default SearchTrigger;
