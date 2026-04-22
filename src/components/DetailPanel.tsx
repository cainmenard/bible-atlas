"use client";

import { useReducer, useEffect, useMemo, useCallback, useRef, useState, useSyncExternalStore } from "react";
import { addRecentPassage } from "@/lib/preferences";
import { AnimatePresence, motion } from "motion/react";
import { bookMap } from "@/data/books";
import { books } from "@/data/books";
import { edges } from "@/data/edges";
import {
  panelNavigationReducer,
  initialPanelNavigationState,
} from "@/lib/panelNavigation";
import { parseRef, getVerseCrossRefs } from "@/lib/crossref-utils";
import type { BibleBook, Canon, ReadingLocation, VerseCrossRef } from "@/lib/types";
import PanelBreadcrumb from "./PanelBreadcrumb";
import AnimatedPanelContent from "./AnimatedPanelContent";
import BookDetailView from "./BookDetailView";
import { type CrossReference } from "./ChapterDetailView";
import VerseDetailView from "./VerseDetailView";
import VerseReader from "./VerseReader";

/* ─── Props ─── */
interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBook: string | null;
  crossReferenceData: VerseCrossRef[];
  translation: string;
  canon: Canon;
  onNavigationChange?: (state: {
    bookId: string | null;
    chapter: number | null;
    verse: number | null;
  }) => void;
  onSelectBook?: (bookId: string) => void;
  onCrossRefNavigate?: (bookId: string, chapter: number, verse: number) => void;
  onOpenReadingsCard?: () => void;
  pendingNavigation?: {
    bookId: string;
    chapter: number;
    verse: number;
    key: number;
  } | null;
  continueChipLabel?: string | null;
  onDismissContinue?: () => void;
  readingHistory?: ReadingLocation[];
  onReadingHistoryBack?: () => void;
}

/* ─── Helpers ─── */

function getConnections(bookId: string, canon: Canon) {
  const activeBooks = new Set(
    Array.from(bookMap.values())
      .filter((b) => b.canons.includes(canon))
      .map((b) => b.id),
  );

  // Edges are bidirectional: each book-pair appears as both source→target and
  // target→source with independent counts. Sum both directions per other-book
  // so each connected book appears exactly once in the list.
  const counts = new Map<string, number>();
  edges.forEach((e) => {
    let otherId: string | null = null;
    if (e.source === bookId && activeBooks.has(e.target)) otherId = e.target;
    else if (e.target === bookId && activeBooks.has(e.source)) otherId = e.source;
    if (!otherId) return;
    counts.set(otherId, (counts.get(otherId) ?? 0) + e.count);
  });

  const connections: { book: BibleBook; count: number }[] = [];
  counts.forEach((count, otherId) => {
    const b = bookMap.get(otherId);
    if (b) connections.push({ book: b, count });
  });

  connections.sort((a, b) => b.count - a.count);
  return connections;
}

function transformCrossRefs(refs: VerseCrossRef[]): CrossReference[] {
  const result: CrossReference[] = [];
  for (const ref of refs) {
    const parsed = parseRef(ref.to);
    if (!parsed) continue;
    const bookName = bookMap.get(parsed.bookId)?.name ?? parsed.bookId;
    result.push({
      targetBook: bookName,
      targetChapter: parsed.chapter,
      targetVerseStart: parsed.verse,
      votes: ref.votes,
    });
  }
  return result;
}

function findBookIdByName(name: string): string | null {
  for (const book of books) {
    if (book.name === name) return book.id;
  }
  return null;
}

const AVAILABLE_TRANSLATIONS = ["rsv-ce", "kjv", "web"];

/* ─── Mobile detection ─── */
const MOBILE_QUERY = "(max-width: 768px)";

function subscribeMobile(cb: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getIsMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

const getIsMobileServer = () => false;

/* ─── Component ─── */

export default function DetailPanel({
  isOpen,
  onClose,
  selectedBook,
  crossReferenceData,
  translation,
  canon,
  onNavigationChange,
  onSelectBook,
  onCrossRefNavigate,
  onOpenReadingsCard,
  pendingNavigation,
  continueChipLabel,
  onDismissContinue,
  readingHistory,
  onReadingHistoryBack,
}: DetailPanelProps) {
  const [navState, dispatch] = useReducer(
    panelNavigationReducer,
    initialPanelNavigationState,
  );

  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getIsMobileServer);

  const panelRef = useRef<HTMLDivElement>(null);
  const prevSelectedBook = useRef<string | null>(null);

  // Verse text fetching (for VerseDetailView)
  const [verseText, setVerseText] = useState("");
  const [verseLoading, setVerseLoading] = useState(false);

  // ─── Sync selectedBook prop → reducer ───
  useEffect(() => {
    if (selectedBook === prevSelectedBook.current) return;
    prevSelectedBook.current = selectedBook;

    if (selectedBook) {
      dispatch({ type: "INIT_BOOK", book: selectedBook });
    } else {
      dispatch({ type: "RESET" });
    }
  }, [selectedBook]);

  // ─── Apply pending cross-reference navigation (from margin dot click) ───
  const lastNavKeyRef = useRef<number | null>(null);
  const [pulseVerse, setPulseVerse] = useState<{
    chapter: number;
    verse: number;
    key: number;
  } | null>(null);

  useEffect(() => {
    if (!pendingNavigation) return;
    if (lastNavKeyRef.current === pendingNavigation.key) return;
    lastNavKeyRef.current = pendingNavigation.key;

    // INIT_BOOK resets the reducer, ensuring the prop-sync effect above
    // treats the next selectedBook change cleanly.
    prevSelectedBook.current = pendingNavigation.bookId;
    dispatch({ type: "INIT_BOOK", book: pendingNavigation.bookId });
    dispatch({ type: "CHANGE_CHAPTER", chapter: pendingNavigation.chapter });
    setPulseVerse({
      chapter: pendingNavigation.chapter,
      verse: pendingNavigation.verse,
      key: pendingNavigation.key,
    });
  }, [pendingNavigation]);

  // ─── Notify parent of navigation changes ───
  useEffect(() => {
    onNavigationChange?.({
      bookId: navState.selectedBook,
      chapter: navState.selectedChapter,
      verse: navState.selectedVerse,
    });
  }, [navState.selectedBook, navState.selectedChapter, navState.selectedVerse, onNavigationChange]);

  // ─── Keyboard shortcuts: Escape, Left / Right chapter navigation ───
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Only act on left/right when a chapter is active and focus is
      // within the panel (so arrow keys can still drive form controls).
      if (navState.level !== "chapter" || navState.selectedChapter === null) {
        return;
      }
      const active = document.activeElement;
      const panel = panelRef.current;
      if (panel && active && !panel.contains(active) && active !== panel) {
        return;
      }

      const bookEntry = navState.selectedBook
        ? bookMap.get(navState.selectedBook)
        : null;
      const total = bookEntry?.chapters ?? 0;
      const current = navState.selectedChapter;

      if (e.key === "ArrowLeft") {
        if (current > 1) {
          e.preventDefault();
          dispatch({ type: "CHANGE_CHAPTER", chapter: current - 1 });
        }
      } else if (e.key === "ArrowRight") {
        if (current < total) {
          e.preventDefault();
          dispatch({ type: "CHANGE_CHAPTER", chapter: current + 1 });
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    onClose,
    navState.level,
    navState.selectedBook,
    navState.selectedChapter,
  ]);

  // ─── Alt+ArrowLeft / Cmd+[ → reading-history back ───
  // Scoped to the panel container so it doesn't intercept global shortcuts.
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const handler = (e: KeyboardEvent) => {
      if (!readingHistory || readingHistory.length === 0) return;
      const isAltLeft = e.altKey && e.key === "ArrowLeft";
      const isCmdBracket = e.metaKey && e.key === "[";
      if (!isAltLeft && !isCmdBracket) return;
      e.preventDefault();
      e.stopPropagation();
      onReadingHistoryBack?.();
    };
    panel.addEventListener("keydown", handler);
    return () => panel.removeEventListener("keydown", handler);
  }, [isOpen, readingHistory, onReadingHistoryBack]);

  // ─── Focus panel on open ───
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  // ─── Fetch verse text for VerseDetailView ───
  useEffect(() => {
    if (
      navState.level !== "verse" ||
      !navState.selectedBook ||
      navState.selectedChapter === null ||
      navState.selectedVerse === null
    ) {
      setVerseText("");
      return;
    }

    const book = bookMap.get(navState.selectedBook);
    if (!book) return;

    const ref = `${book.name} ${navState.selectedChapter}:${navState.selectedVerse}`;
    const controller = new AbortController();
    setVerseLoading(true);
    setVerseText("");

    const doFetch = async () => {
      try {
        const url = `/api/verse?ref=${encodeURIComponent(ref)}&translation=${translation}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (data.text) {
          setVerseText(data.text);
          return;
        }
        // Fallback to WEB translation
        if (translation !== "web") {
          const fallbackUrl = `/api/verse?ref=${encodeURIComponent(ref)}&translation=web`;
          const r2 = await fetch(fallbackUrl, { signal: controller.signal });
          const d2 = await r2.json();
          if (d2.text) {
            setVerseText(d2.text);
            return;
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setVerseText("");
        }
      } finally {
        setVerseLoading(false);
      }
    };

    doFetch();
    return () => controller.abort();
  }, [
    navState.level,
    navState.selectedBook,
    navState.selectedChapter,
    navState.selectedVerse,
    translation,
  ]);

  // ─── Derived data ───
  const book = navState.selectedBook ? bookMap.get(navState.selectedBook) : null;

  const { connectedBooks, totalConnections } = useMemo(() => {
    if (!navState.selectedBook) return { connectedBooks: [], totalConnections: 0 };
    const connections = getConnections(navState.selectedBook, canon);
    const total = connections.reduce((sum, c) => sum + c.count, 0);
    return {
      connectedBooks: connections.map((c) => ({
        name: c.book.name,
        connectionCount: c.count,
      })),
      totalConnections: total,
    };
  }, [navState.selectedBook, canon]);

  const verseCrossRefs = useMemo(() => {
    if (navState.selectedChapter === null || navState.selectedVerse === null)
      return [];
    return transformCrossRefs(
      getVerseCrossRefs(
        crossReferenceData,
        navState.selectedChapter,
        navState.selectedVerse,
      ),
    );
  }, [crossReferenceData, navState.selectedChapter, navState.selectedVerse]);

  // ─── Callbacks for sub-components ───
  const handleSelectChapter = useCallback(
    (chapter: number) => {
      dispatch({ type: "SELECT_CHAPTER", chapter });
      const bookEntry = navState.selectedBook ? bookMap.get(navState.selectedBook) : null;
      if (bookEntry) addRecentPassage({ book: bookEntry.name, chapter, verse: null });
    },
    [navState.selectedBook],
  );

  const handleSelectConnectedBook = useCallback(
    (bookName: string) => {
      const bookId = findBookIdByName(bookName);
      if (!bookId) return;
      onSelectBook?.(bookId);
    },
    [onSelectBook],
  );

  const handleNavigateCrossRef = useCallback(
    (targetBookName: string, chapter: number, verse: number) => {
      const targetBookId = findBookIdByName(targetBookName);
      if (!targetBookId) return;

      addRecentPassage({ book: targetBookName, chapter, verse });

      if (targetBookId === navState.selectedBook) {
        // Same book — navigate within panel
        dispatch({ type: "GO_TO_LEVEL", level: "book" });
        dispatch({ type: "SELECT_CHAPTER", chapter });
        dispatch({ type: "SELECT_VERSE", verse });
      } else {
        // Different book — update visualization and let prop sync handle it
        onSelectBook?.(targetBookId);
      }
    },
    [navState.selectedBook, onSelectBook],
  );


  const handleChangeTranslation = useCallback(() => {
    // Translation is owned by page.tsx; no-op here
  }, []);

  // ─── Build unique key for AnimatedPanelContent ───
  const contentKey = `${navState.level}-${navState.selectedBook}-${navState.selectedChapter}-${navState.selectedVerse}`;

  // ─── Render content based on current level ───
  const renderContent = () => {
    if (!book || !navState.selectedBook) return null;

    const bookViewProps = {
      bookId: navState.selectedBook,
      book: {
        name: book.name,
        testament: (book.testament === "DC" ? "OT" : book.testament) as "OT" | "NT",
        category: book.genre,
        totalChapters: book.chapters,
        totalVerses: book.verses,
        totalCrossReferences: crossReferenceData.length,
      },
      connectedBooks,
      totalConnections,
      selectedChapter: navState.selectedChapter,
      onSelectChapter: handleSelectChapter,
      onSelectConnectedBook: handleSelectConnectedBook,
    };

    switch (navState.level) {
      case "book":
        return <BookDetailView {...bookViewProps} />;

      case "chapter":
        if (navState.selectedChapter === null) return null;
        return (
          <BookDetailView
            {...bookViewProps}
            verseReaderSlot={
              <VerseReader
                book={book.name}
                chapter={navState.selectedChapter}
                translation={translation}
                pulseVerse={
                  pulseVerse &&
                  pulseVerse.chapter === navState.selectedChapter
                    ? pulseVerse
                    : null
                }
                onNavigate={(targetBookId, targetChapter, targetVerse) => {
                  onCrossRefNavigate?.(targetBookId, targetChapter, targetVerse);
                }}
                onOpenReadingsCard={onOpenReadingsCard}
              />
            }
          />
        );

      case "verse":
        if (
          navState.selectedChapter === null ||
          navState.selectedVerse === null
        )
          return null;
        return (
          <VerseDetailView
            bookName={book.name}
            chapter={navState.selectedChapter}
            verse={navState.selectedVerse}
            verseText={verseLoading ? "Loading..." : verseText || "Verse text unavailable"}
            translation={translation}
            crossReferences={verseCrossRefs}
            onNavigateCrossRef={handleNavigateCrossRef}
            onChangeTranslation={handleChangeTranslation}
            availableTranslations={AVAILABLE_TRANSLATIONS}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && navState.selectedBook && (
        <motion.div
          ref={panelRef}
          key="detail-panel"
          role="complementary"
          aria-label="Scripture details"
          tabIndex={-1}
          initial={isMobile ? { y: "100%" } : { x: "100%" }}
          animate={isMobile ? { y: "0%" } : { x: "0%" }}
          exit={isMobile ? { y: "100%" } : { x: "100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="detail-panel-container"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: 400,
            minWidth: 400,
            height: "100vh",
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--glass-bg-heavy)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            borderLeft: "1px solid var(--glass-border)",
            boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.3)",
            outline: "none",
          }}
        >
          {/* Reading-history back breadcrumb — shown when the user has
              jumped from a prior passage via a cross-reference. Placed above
              PanelBreadcrumb so it reads as a stacked navigation affordance. */}
          {readingHistory && readingHistory.length > 0 && onReadingHistoryBack && (() => {
            const target = readingHistory[readingHistory.length - 1];
            const targetBook = bookMap.get(target.bookId);
            const label = targetBook
              ? `${targetBook.name} ${target.chapter}:${target.verse}`.toUpperCase()
              : `${target.bookId} ${target.chapter}:${target.verse}`;
            return (
              <div
                style={{
                  padding: "8px var(--space-lg) 6px",
                  borderBottom: "1px solid var(--glass-border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={onReadingHistoryBack}
                  aria-label={`Back to ${label}`}
                  className="reading-history-back"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "none",
                    border: "none",
                    padding: "6px 2px",
                    margin: "-6px -2px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                    transition: "color 200ms ease-out",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--color-text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                  }}
                >
                  <span>← BACK TO {label}</span>
                  {readingHistory.length > 1 && (
                    <span
                      aria-hidden="true"
                      style={{
                        color: "var(--color-text-muted)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      × {readingHistory.length}
                    </span>
                  )}
                </button>
              </div>
            );
          })()}

          {/* Sticky breadcrumb header */}
          <PanelBreadcrumb
            state={navState}
            dispatch={dispatch}
            onClose={onClose}
            totalChapters={book?.chapters}
            onChapterChange={(chapter) => {
              const bookEntry = navState.selectedBook ? bookMap.get(navState.selectedBook) : null;
              if (bookEntry) addRecentPassage({ book: bookEntry.name, chapter, verse: null });
            }}
          />

          {/* Continue-reading chip — shown when session was restored from persisted state */}
          {continueChipLabel && (
            <div style={{ padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={onDismissContinue}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-accent)',
                  background: 'rgba(212, 160, 74, 0.06)',
                  border: '1px solid rgba(212, 160, 74, 0.4)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'all 200ms ease-out',
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 160, 74, 0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 160, 74, 0.06)';
                }}
              >
                Continue reading → {continueChipLabel}
              </button>
            </div>
          )}

          {/* Scrollable content area */}
          <div
            aria-live="polite"
            className="detail-panel-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <AnimatedPanelContent
              level={navState.level}
              direction={navState.animationDirection}
              uniqueKey={contentKey}
            >
              {renderContent()}
            </AnimatedPanelContent>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
