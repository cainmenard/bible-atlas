"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { searchBooks, type BookMatch } from "@/lib/search-index";
import type { BibleBook } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (bookId: string) => void;
}

function SearchIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
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

function testamentBadge(t: BibleBook["testament"]) {
  return t;
}

export default function SearchPalette({ isOpen, onClose, onSelectBook }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [exiting, setExiting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  // Debounce the query at 80ms so we don't re-rank on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 80);
    return () => clearTimeout(t);
  }, [query]);

  const results: BookMatch[] = useMemo(
    () => (debounced.trim().length === 0 ? [] : searchBooks(debounced)),
    [debounced],
  );

  // Reset selection when the query changes. Derived state — resolved during
  // render to avoid the cascading render of setState-in-effect.
  const [lastDebounced, setLastDebounced] = useState(debounced);
  if (lastDebounced !== debounced) {
    setLastDebounced(debounced);
    setSelectedIdx(0);
  }

  // Mount-time: capture the element that had focus, then autofocus the input.
  // The palette unmounts when closed, so running this once per mount is
  // equivalent to "run whenever the palette opens".
  useEffect(() => {
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => {
    // Play exit animation then unmount via parent.
    setExiting(true);
    setTimeout(() => {
      onClose();
      // Restore focus to the element that opened the palette.
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    }, 150);
  }, [onClose]);

  const execute = useCallback(
    (book: BibleBook) => {
      onSelectBook(book.id);
      close();
    },
    [onSelectBook, close],
  );

  // Keep the selected option scrolled into view.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${selectedIdx}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx, results]);

  // Palette-local keyboard handler (arrow nav, enter, escape, home/end).
  // Registered on document in capture phase so Escape closes the palette
  // before any bubble-phase handlers (e.g. DetailPanel) can act on it.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        close();
        return;
      }

      if (results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        setSelectedIdx(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSelectedIdx(results.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const pick = results[selectedIdx];
        if (pick) execute(pick.book);
      }
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () =>
      document.removeEventListener("keydown", handler, { capture: true });
  }, [isOpen, results, selectedIdx, close, execute]);

  // Simple focus trap: keep Tab within the palette while open.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = document.getElementById(`${listboxId}-container`);
      if (!container) return;
      const focusable = container.querySelectorAll<HTMLElement>(
        'input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, listboxId]);

  if (!isOpen) return null;

  const stage = exiting ? "exiting" : "entering";
  const hasQuery = debounced.trim().length > 0;
  const showNoMatch = hasQuery && results.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`search-palette-backdrop search-palette-backdrop-${stage}`}
        onClick={() => close()}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        id={`${listboxId}-container`}
        role="dialog"
        aria-modal="true"
        aria-label="Search passages"
        className={`search-palette search-palette-${stage}`}
      >
        {/* Input row */}
        <div className="search-palette-input-row">
          <span className="search-palette-icon" aria-hidden="true">
            <SearchIcon size={14} color="var(--text-dim)" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a passage"
            aria-label="Search for a book"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={
              results.length > 0
                ? `${listboxId}-opt-${selectedIdx}`
                : undefined
            }
            className="search-palette-input"
            spellCheck={false}
            autoComplete="off"
          />
          <span className="search-palette-esc" aria-hidden="true">
            Esc
          </span>
        </div>

        {/* Results */}
        {(hasQuery || results.length > 0) && (
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className="search-palette-results"
          >
            {showNoMatch ? (
              <div className="search-palette-empty">
                No books match &ldquo;{debounced}&rdquo;
              </div>
            ) : (
              results.map((m, idx) => {
                const isSelected = idx === selectedIdx;
                return (
                  <div
                    key={m.book.id}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    data-idx={idx}
                    tabIndex={-1}
                    className={`search-palette-result${isSelected ? " selected" : ""}`}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => execute(m.book)}
                  >
                    <span className="search-palette-badge">
                      {testamentBadge(m.book.testament)}
                    </span>
                    <span className="search-palette-book-name">
                      {m.book.name}
                    </span>
                    <span className="search-palette-meta">
                      {m.book.genre} · {m.book.chapters} chapters
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

    </>
  );
}
