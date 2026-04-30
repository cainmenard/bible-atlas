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
  searchGenres,
  bookByCanonicalName,
  getCachedVerseText,
  fetchVersePreview,
  clearVerseTextCache,
  type ParsedQuery,
  type GenreMatch,
} from "@/lib/search-index";
import {
  addRecentPassage,
  getRecentPassages,
  type RecentPassage,
} from "@/lib/preferences";
import { CHAPTER_VERSES } from "@/data/chapter-verses";
import type { BibleBook, Canon } from "@/lib/types";

interface Props {
  isOpen: boolean;
  translation: string;
  canon: Canon;
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

// Discriminated union for what's keyboard-navigable.
type SelectableItem =
  | { mode: "result"; result: PaletteResult }
  | { mode: "recent"; passage: RecentPassage };

const VERSE_PREVIEW_MAX = 140;

const TRY_EXAMPLES = [
  { text: "gen 1", description: "Find a book and chapter" },
  { text: "john 3:16", description: "Find a specific verse" },
  { text: "gospels", description: "Find books by genre" },
] as const;

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

function formatPassageRef(p: RecentPassage): string {
  if (p.chapter === null) return p.book;
  if (p.verse === null) return `${p.book} ${p.chapter}`;
  return `${p.book} ${p.chapter}:${p.verse}`;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 3_600_000) return "Just now";

  const nowDate = new Date();
  const tsDate = new Date(timestamp);

  if (
    tsDate.getFullYear() === nowDate.getFullYear() &&
    tsDate.getMonth() === nowDate.getMonth() &&
    tsDate.getDate() === nowDate.getDate()
  ) {
    return "Today";
  }

  const yesterday = new Date(nowDate);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    tsDate.getFullYear() === yesterday.getFullYear() &&
    tsDate.getMonth() === yesterday.getMonth() &&
    tsDate.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }

  const daysAgo = Math.floor(diff / 86_400_000);
  if (daysAgo < 7) return `${daysAgo} days ago`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[tsDate.getMonth()]} ${tsDate.getDate()}`;
}

export default function SearchPalette({
  isOpen,
  translation,
  canon,
  onClose,
  onSelectBook,
  onSelectChapter,
  onSelectVerse,
}: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [recentPassages, setRecentPassages] = useState<RecentPassage[]>([]);
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  const [, setPreviewTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  // Debounce the query at 80ms.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 80);
    return () => clearTimeout(t);
  }, [query]);

  // Reload recent passages whenever the palette transitions to open (derived state during render).
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    if (isOpen) {
      setRecentPassages(getRecentPassages(5));
      setExiting(false);
      setQuery("");
      setDebounced("");
      setSelectedIdx(0);
    }
  }

  // ── Results computation ──────────────────────────────────
  const { bookResults, genreGroups, showGenreSeparator } = useMemo(() => {
    const q = debounced.trim();
    if (!q) return { bookResults: [], genreGroups: [] as GenreMatch[], showGenreSeparator: false };

    const genres = searchGenres(q, canon);
    const parsed = parseQuery(q, canon);
    const books: PaletteResult[] = [];
    for (const p of parsed) {
      const r = toResult(p);
      if (r) books.push(r);
    }

    if (genres.length > 0 && books.length === 0) {
      return { bookResults: [], genreGroups: genres, showGenreSeparator: false };
    }
    if (genres.length > 0 && books.length > 0) {
      return { bookResults: books, genreGroups: genres, showGenreSeparator: true };
    }
    return { bookResults: books, genreGroups: [] as GenreMatch[], showGenreSeparator: false };
  }, [debounced, canon]);

  // Precompute flat index offset for each genre group (for keyboard nav).
  const genreGroupOffsets = useMemo(() => {
    const map = new Map<string, number>();
    let offset = 0;
    for (const g of genreGroups) {
      map.set(g.genre, offset);
      offset += g.books.length;
    }
    return map;
  }, [genreGroups]);

  // Flat list of all keyboard-navigable items.
  const flatNavigable = useMemo((): SelectableItem[] => {
    const hasQ = debounced.trim().length > 0;
    if (!hasQ) {
      return recentPassages.map((passage) => ({ mode: "recent" as const, passage }));
    }
    const items: SelectableItem[] = bookResults.map((result) => ({ mode: "result" as const, result }));
    for (const group of genreGroups) {
      for (const bm of group.books) {
        items.push({ mode: "result", result: { kind: "book", book: bm.book } });
      }
    }
    return items;
  }, [debounced, bookResults, genreGroups, recentPassages]);

  // Reset selection when debounced query changes.
  const [lastDebounced, setLastDebounced] = useState(debounced);
  if (lastDebounced !== debounced) {
    setLastDebounced(debounced);
    setSelectedIdx(0);
  }

  // Translation change: drop verse-preview cache.
  const [lastTranslation, setLastTranslation] = useState(translation);
  if (lastTranslation !== translation) {
    setLastTranslation(translation);
    clearVerseTextCache();
    setPreviewTick((n) => n + 1);
  }

  // Fetch verse previews for Type C results.
  useEffect(() => {
    let cancelled = false;
    for (const r of bookResults) {
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
    return () => { cancelled = true; };
  }, [bookResults, translation]);

  // On each open: capture focused element, autofocus input.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = (document.activeElement as HTMLElement | null) ?? null;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [isOpen]);

  const close = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      onClose();
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    }, 150);
  }, [onClose]);

  const execute = useCallback(
    (item: SelectableItem) => {
      if (item.mode === "recent") {
        const p = item.passage;
        const bookEntry = bookByCanonicalName.get(p.book);
        if (!bookEntry) { close(); return; }
        if (p.verse !== null && p.chapter !== null) {
          onSelectVerse(bookEntry.id, p.chapter, p.verse);
          addRecentPassage({ book: p.book, chapter: p.chapter, verse: p.verse });
        } else if (p.chapter !== null) {
          onSelectChapter(bookEntry.id, p.chapter);
          addRecentPassage({ book: p.book, chapter: p.chapter, verse: null });
        } else {
          onSelectBook(bookEntry.id);
          addRecentPassage({ book: p.book, chapter: null, verse: null });
        }
      } else {
        const r = item.result;
        if (r.kind === "verse") {
          onSelectVerse(r.book.id, r.chapter!, r.verse!);
          addRecentPassage({ book: r.book.name, chapter: r.chapter!, verse: r.verse! });
        } else if (r.kind === "chapter") {
          onSelectChapter(r.book.id, r.chapter!);
          addRecentPassage({ book: r.book.name, chapter: r.chapter!, verse: null });
        } else {
          onSelectBook(r.book.id);
          addRecentPassage({ book: r.book.name, chapter: null, verse: null });
        }
      }
      close();
    },
    [onSelectBook, onSelectChapter, onSelectVerse, close],
  );

  // Keep selected item scrolled into view.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${selectedIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIdx, flatNavigable]);

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

      if (flatNavigable.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % flatNavigable.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + flatNavigable.length) % flatNavigable.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        setSelectedIdx(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSelectedIdx(flatNavigable.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const pick = flatNavigable[selectedIdx];
        if (pick) execute(pick);
      }
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [isOpen, flatNavigable, selectedIdx, close, execute]);

  // Simple focus trap.
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
  const showNoMatch = hasQuery && bookResults.length === 0 && genreGroups.length === 0;

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
              flatNavigable.length > 0
                ? `${listboxId}-opt-${selectedIdx}`
                : undefined
            }
            className="search-palette-input"
            spellCheck={false}
            autoComplete="off"
          />
          <span className="search-palette-esc" aria-hidden="true">Esc</span>
        </div>

        {/* Results / Empty state */}
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="search-palette-results"
        >
          {/* ── Empty state ── */}
          {!hasQuery && (
            <>
              {recentPassages.length > 0 && (
                <div role="group" aria-label="Recent passages">
                  <div className="search-palette-section-header" aria-hidden="true">
                    RECENT PASSAGES
                  </div>
                  {recentPassages.map((passage, idx) => (
                    <div
                      key={`${passage.book}-${passage.chapter}-${passage.verse}-${passage.timestamp}`}
                      id={`${listboxId}-opt-${idx}`}
                      role="option"
                      aria-selected={idx === selectedIdx}
                      data-idx={idx}
                      tabIndex={-1}
                      className={`search-palette-result search-palette-recent-row${idx === selectedIdx ? " selected" : ""}`}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => execute({ mode: "recent", passage })}
                    >
                      <span className="search-palette-book-name">{formatPassageRef(passage)}</span>
                      <span className="search-palette-meta">{formatRelativeTime(passage.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 16px gap between sections */}
              {recentPassages.length > 0 && <div className="search-palette-section-gap" />}

              <div className="search-palette-section-header" aria-hidden="true">
                TRY SEARCHING
              </div>
              {TRY_EXAMPLES.map(({ text, description }) => (
                <button
                  key={text}
                  type="button"
                  className="search-palette-try-row"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(text);
                    inputRef.current?.focus();
                  }}
                  tabIndex={0}
                >
                  <span className="search-palette-try-example">{text}</span>
                  <span className="search-palette-meta">{description}</span>
                </button>
              ))}
            </>
          )}

          {/* ── No match message ── */}
          {showNoMatch && (
            <div className="search-palette-empty">
              No passages match &ldquo;{debounced}&rdquo;
            </div>
          )}

          {/* ── Results ── */}
          {hasQuery && !showNoMatch && (
            <>
              {/* Book / chapter / verse results */}
              {bookResults.map((r, idx) => (
                <PaletteResultRow
                  key={`${r.kind}-${r.book.id}-${r.chapter ?? ""}-${r.verse ?? ""}`}
                  result={r}
                  idx={idx}
                  selected={idx === selectedIdx}
                  optionId={`${listboxId}-opt-${idx}`}
                  translation={translation}
                  onHover={() => setSelectedIdx(idx)}
                  onClick={() => execute({ mode: "result", result: r })}
                />
              ))}

              {/* Separator when both book results and genre results appear */}
              {showGenreSeparator && <div className="search-palette-separator" aria-hidden="true" />}

              {/* Genre groups */}
              {genreGroups.map((group) => {
                const groupOffset = genreGroupOffsets.get(group.genre) ?? 0;
                return (
                  <div key={group.genre} role="group" aria-label={group.genre}>
                    <div className="search-palette-genre-header" aria-hidden="true">
                      {group.genre.toUpperCase()}
                    </div>
                    {group.books.map((bm, i) => {
                      const flatIdx = bookResults.length + groupOffset + i;
                      const result: PaletteResult = { kind: "book", book: bm.book };
                      return (
                        <PaletteResultRow
                          key={bm.book.id}
                          result={result}
                          idx={flatIdx}
                          selected={flatIdx === selectedIdx}
                          optionId={`${listboxId}-opt-${flatIdx}`}
                          translation={translation}
                          onHover={() => setSelectedIdx(flatIdx)}
                          onClick={() => execute({ mode: "result", result })}
                          indent
                        />
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
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
  indent?: boolean;
}

function PaletteResultRow({
  result,
  idx,
  selected,
  optionId,
  translation,
  onHover,
  onClick,
  indent,
}: RowProps) {
  const { kind, book } = result;
  const indentStyle = indent ? { paddingLeft: 24 } : undefined;

  if (kind === "book") {
    return (
      <div
        id={optionId}
        role="option"
        aria-selected={selected}
        data-idx={idx}
        tabIndex={-1}
        className={`search-palette-result${selected ? " selected" : ""}`}
        style={indentStyle}
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
        style={indentStyle}
        onMouseEnter={onHover}
        onClick={onClick}
      >
        <span className="search-palette-badge">{testamentBadge(book.testament)}</span>
        <span className="search-palette-book-name">
          {book.name}{" "}
          <span style={{ color: "var(--accent)" }}>{chapter}</span>
        </span>
        {outOfRange ? (
          <span className="search-palette-meta search-palette-warn">chapter out of range</span>
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
      previewLine = <span className="search-palette-verse-status">Loading verse…</span>;
    } else if (cached === null) {
      previewLine = <span className="search-palette-verse-status">Verse text unavailable</span>;
    } else {
      previewLine = <span className="search-palette-verse-preview">{truncatePreview(cached)}</span>;
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
      style={indentStyle}
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
