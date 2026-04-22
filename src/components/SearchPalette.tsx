"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  parseQuery,
  bookByCanonicalName,
  getCachedVerseText,
  fetchVersePreview,
  clearVerseTextCache,
  type ParsedQuery,
} from "@/lib/search-index";
import { CHAPTER_VERSES } from "@/data/chapter-verses";
import type { BibleBook } from "@/lib/types";

interface Props {
  isOpen: boolean;
  translation: string;
  onClose: () => void;
  onSelectBook: (bookId: string) => void;
  onSelectChapter: (bookId: string, chapter: number) => void;
  onSelectVerse: (bookId: string, chapter: number, verse: number) => void;
}

type ResultKind = "book" | "chapter" | "verse";

interface PaletteResult {
  kind: ResultKind;
  book: BibleBook;
  chapter?: number;
  verse?: number;
}

const VERSE_PREVIEW_MAX = 140;

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

function verseCountForChapter(bookId: string, chapter: number): number | null {
  const arr = CHAPTER_VERSES[bookId];
  if (!arr) return null;
  if (chapter < 1 || chapter > arr.length) return null;
  return arr[chapter - 1];
}

function truncatePreview(text: string): string {
  if (text.length <= VERSE_PREVIEW_MAX) return text;
  return text.slice(0, VERSE_PREVIEW_MAX).trimEnd() + "…";
}

function toResult(parsed: ParsedQuery): PaletteResult | null {
  const book = bookByCanonicalName.get(parsed.book);
  if (!book) return null;
  if (parsed.verse !== undefined && parsed.chapter !== undefined) {
    return { kind: "verse", book, chapter: parsed.chapter, verse: parsed.verse };
  }
  if (parsed.chapter !== undefined) {
    return { kind: "chapter", book, chapter: parsed.chapter };
  }
  return { kind: "book", book };
}

export default function SearchPalette({
  isOpen,
  translation,
  onClose,
  onSelectBook,
  onSelectChapter,
  onSelectVerse,
}: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [exiting, setExiting] = useState(false);
  // Bumps whenever we want to rerender after a verse preview fetch settles
  // or the translation changes. The tick value is never read; calling the
  // setter with a fresh value is what forces the re-render.
  const [, setPreviewTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  // Debounce the query at 80ms so we don't re-rank on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 80);
    return () => clearTimeout(t);
  }, [query]);

  const results: PaletteResult[] = useMemo(() => {
    if (debounced.trim().length === 0) return [];
    const parsed = parseQuery(debounced);
    const out: PaletteResult[] = [];
    for (const p of parsed) {
      const r = toResult(p);
      if (r) out.push(r);
    }
    return out;
  }, [debounced]);

  // Reset selection when the query changes.
  const [lastDebounced, setLastDebounced] = useState(debounced);
  if (lastDebounced !== debounced) {
    setLastDebounced(debounced);
    setSelectedIdx(0);
  }

  // Translation change: drop verse-preview cache so previews refetch.
  // Derived-state-during-render pattern avoids the setState-in-effect
  // cascade: when `translation` flips we synchronously clear the cache and
  // bump a tick that invalidates any displayed previews.
  const [lastTranslation, setLastTranslation] = useState(translation);
  if (lastTranslation !== translation) {
    setLastTranslation(translation);
    clearVerseTextCache();
    setPreviewTick((n) => n + 1);
  }

  // Fetch verse previews for every Type C result currently visible. Cache
  // dedupes concurrent calls and persists across re-renders within the
  // translation.
  useEffect(() => {
    let cancelled = false;
    for (const r of results) {
      if (r.kind !== "verse") continue;
      const chapterVerses = verseCountForChapter(r.book.id, r.chapter!);
      if (chapterVerses === null) continue;
      if (r.verse! < 1 || r.verse! > chapterVerses) continue;
      const cached = getCachedVerseText(translation, r.book.name, r.chapter!, r.verse!);
      if (cached !== undefined) continue;
      fetchVersePreview(translation, r.book.name, r.chapter!, r.verse!).then(() => {
        if (!cancelled) setPreviewTick((n) => n + 1);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [results, translation]);

  // Mount-time: capture the element that had focus, then autofocus the input.
  useEffect(() => {
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  const close = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      onClose();
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    }, 150);
  }, [onClose]);

  const execute = useCallback(
    (r: PaletteResult) => {
      if (r.kind === "verse") {
        onSelectVerse(r.book.id, r.chapter!, r.verse!);
      } else if (r.kind === "chapter") {
        onSelectChapter(r.book.id, r.chapter!);
      } else {
        onSelectBook(r.book.id);
      }
      close();
    },
    [onSelectBook, onSelectChapter, onSelectVerse, close],
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

  // Palette-local keyboard handler.
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
        if (pick) execute(pick);
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
            aria-label="Search for a passage"
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
                No passages match &ldquo;{debounced}&rdquo;
              </div>
            ) : (
              results.map((r, idx) => (
                <PaletteResultRow
                  key={`${r.kind}-${r.book.id}-${r.chapter ?? ""}-${r.verse ?? ""}`}
                  result={r}
                  idx={idx}
                  selected={idx === selectedIdx}
                  optionId={`${listboxId}-opt-${idx}`}
                  translation={translation}
                  onHover={() => setSelectedIdx(idx)}
                  onClick={() => execute(r)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

interface RowProps {
  result: PaletteResult;
  idx: number;
  selected: boolean;
  optionId: string;
  translation: string;
  onHover: () => void;
  onClick: () => void;
}

function PaletteResultRow({
  result,
  idx,
  selected,
  optionId,
  translation,
  onHover,
  onClick,
}: RowProps) {
  const { kind, book } = result;

  if (kind === "book") {
    return (
      <div
        id={optionId}
        role="option"
        aria-selected={selected}
        data-idx={idx}
        tabIndex={-1}
        className={`search-palette-result${selected ? " selected" : ""}`}
        onMouseEnter={onHover}
        onClick={onClick}
      >
        <span className="search-palette-badge">{testamentBadge(book.testament)}</span>
        <span className="search-palette-book-name">{book.name}</span>
        <span className="search-palette-meta">
          {book.genre} · {book.chapters} chapters
        </span>
      </div>
    );
  }

  if (kind === "chapter") {
    const chapter = result.chapter!;
    const chapterVerses = verseCountForChapter(book.id, chapter);
    const outOfRange = chapterVerses === null;
    return (
      <div
        id={optionId}
        role="option"
        aria-selected={selected}
        data-idx={idx}
        tabIndex={-1}
        className={`search-palette-result${selected ? " selected" : ""}`}
        onMouseEnter={onHover}
        onClick={onClick}
      >
        <span className="search-palette-badge">{testamentBadge(book.testament)}</span>
        <span className="search-palette-book-name">
          {book.name}{" "}
          <span style={{ color: "var(--accent)" }}>{chapter}</span>
        </span>
        {outOfRange ? (
          <span className="search-palette-meta search-palette-warn">
            chapter out of range
          </span>
        ) : (
          <span className="search-palette-meta">{chapterVerses} verses</span>
        )}
      </div>
    );
  }

  // Verse result (Type C)
  const chapter = result.chapter!;
  const verse = result.verse!;
  const chapterVerses = verseCountForChapter(book.id, chapter);
  const chapterOutOfRange = chapterVerses === null;
  const verseOutOfRange = !chapterOutOfRange && (verse < 1 || verse > chapterVerses);
  const outOfRange = chapterOutOfRange || verseOutOfRange;

  let previewLine: ReactNode;
  if (outOfRange) {
    previewLine = (
      <span className="search-palette-verse-status">
        {chapterOutOfRange ? "chapter out of range" : "verse out of range"}
      </span>
    );
  } else {
    const cached = getCachedVerseText(translation, book.name, chapter, verse);
    if (cached === undefined) {
      previewLine = (
        <span className="search-palette-verse-status">Loading verse…</span>
      );
    } else if (cached === null) {
      previewLine = (
        <span className="search-palette-verse-status">
          Verse text unavailable
        </span>
      );
    } else {
      previewLine = (
        <span className="search-palette-verse-preview">
          {truncatePreview(cached)}
        </span>
      );
    }
  }

  return (
    <div
      id={optionId}
      role="option"
      aria-selected={selected}
      data-idx={idx}
      tabIndex={-1}
      className={`search-palette-result search-palette-result-verse${selected ? " selected" : ""}`}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <span className="search-palette-badge">{testamentBadge(book.testament)}</span>
      <div className="search-palette-verse-body">
        <div className="search-palette-verse-ref">
          {book.name} {chapter}:{verse}
        </div>
        <div className="search-palette-verse-line">{previewLine}</div>
      </div>
    </div>
  );
}
