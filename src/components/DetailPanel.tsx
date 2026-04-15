"use client";

import { useReducer, useEffect, useMemo, useCallback, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { bookMap } from "@/data/books";
import { books } from "@/data/books";
import { edges } from "@/data/edges";
import { CHAPTER_VERSES } from "@/data/chapter-verses";
import {
  panelNavigationReducer,
  initialPanelNavigationState,
  type PanelNavigationState,
  type PanelNavigationAction,
  type DrillLevel,
} from "@/lib/panelNavigation";
import { parseRef, getVerseCrossRefs, getVerseRefCounts } from "@/lib/crossref-utils";
import type { BibleBook, Canon, VerseCrossRef } from "@/lib/types";
import PanelBreadcrumb from "./PanelBreadcrumb";
import AnimatedPanelContent from "./AnimatedPanelContent";
import BookDetailView from "./BookDetailView";
import ChapterDetailView, { type CrossReference } from "./ChapterDetailView";
import VerseDetailView from "./VerseDetailView";

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

  // ─── Notify parent of navigation changes ───
  useEffect(() => {
    onNavigationChange?.({
      bookId: navState.selectedBook,
      chapter: navState.selectedChapter,
      verse: navState.selectedVerse,
    });
  }, [navState.selectedBook, navState.selectedChapter, navState.selectedVerse, onNavigationChange]);

  // ─── Keyboard: Escape closes panel ───
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  const connectedBooks = useMemo(() => {
    if (!navState.selectedBook) return [];
    return getConnections(navState.selectedBook, canon).map((c) => ({
      name: c.book.name,
      connectionCount: c.count,
    }));
  }, [navState.selectedBook, canon]);

  const chapterCrossRefs = useMemo(() => {
    if (navState.selectedChapter === null) return [];
    return transformCrossRefs(
      getVerseCrossRefs(crossReferenceData, navState.selectedChapter),
    );
  }, [crossReferenceData, navState.selectedChapter]);

  const chapterCrossRefCounts = useMemo(() => {
    if (navState.selectedChapter === null) return new Map<number, number>();
    return getVerseRefCounts(crossReferenceData, navState.selectedChapter);
  }, [crossReferenceData, navState.selectedChapter]);

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

  const totalVerses = useMemo(() => {
    if (!navState.selectedBook || navState.selectedChapter === null) return 0;
    const chapters = CHAPTER_VERSES[navState.selectedBook];
    if (!chapters) return 0;
    return chapters[navState.selectedChapter - 1] ?? 0;
  }, [navState.selectedBook, navState.selectedChapter]);

  // ─── Callbacks for sub-components ───
  const handleSelectChapter = useCallback(
    (chapter: number) => {
      dispatch({ type: "SELECT_CHAPTER", chapter });
    },
    [],
  );

  const handleSelectVerse = useCallback(
    (verse: number) => {
      dispatch({ type: "SELECT_VERSE", verse });
    },
    [],
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

    switch (navState.level) {
      case "book":
        return (
          <BookDetailView
            book={{
              name: book.name,
              testament: book.testament === "DC" ? "OT" : book.testament,
              category: book.genre,
              totalChapters: book.chapters,
              totalVerses: book.verses,
              totalCrossReferences: crossReferenceData.length,
            }}
            connectedBooks={connectedBooks}
            onSelectChapter={handleSelectChapter}
            onSelectConnectedBook={handleSelectConnectedBook}
          />
        );

      case "chapter":
        if (navState.selectedChapter === null) return null;
        return (
          <ChapterDetailView
            bookName={book.name}
            chapter={navState.selectedChapter}
            totalVerses={totalVerses}
            crossReferences={chapterCrossRefs}
            crossReferenceCounts={chapterCrossRefCounts}
            onSelectVerse={handleSelectVerse}
            onNavigateCrossRef={handleNavigateCrossRef}
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
          {/* Sticky breadcrumb header */}
          <PanelBreadcrumb
            state={navState}
            dispatch={dispatch}
            onClose={onClose}
          />

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
