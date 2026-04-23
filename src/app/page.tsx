"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { getPreference, setPreference, addRecentPassage } from "@/lib/preferences";
import dynamic from "next/dynamic";
import StarBackground from "@/components/StarBackground";
import Tooltip, { TooltipContext } from "@/components/Tooltip";
import DetailPanel from "@/components/DetailPanel";
import ReadingPane from "@/components/ReadingPane";
import ReadingsPill from "@/components/ReadingsPill";
import ReadingPlanCard from "@/components/ReadingPlanCard";
import CelestialOrreryToggle from "@/components/CelestialOrreryToggle";
import FilterPanel from "@/components/FilterPanel";
import SearchPalette from "@/components/SearchPalette";
import SearchTrigger from "@/components/SearchTrigger";
import { DensityStop, DENSITY_THRESHOLDS } from "@/components/EdgeDensitySlider";
import { BibleBook, Canon, LiturgicalSeason, ReadingLocation, ViewMode, VerseCrossRef } from "@/lib/types";
import { LITURGICAL_COLORS } from "@/lib/colors";
import { getDailyReadings } from "@/lib/readings";
import { getMajorFeast } from "@/lib/liturgical";
import { parseReadingReference } from "@/lib/bible-api";
import { clearVerseTextCache } from "@/lib/search-index";
import { buildVerseNavigation } from "@/lib/verse-navigation";
import { getVerseCrossRefs, getTargetBookCounts } from "@/lib/crossref-utils";
import { bookMap } from "@/data/books";
import ArcZoomControls from "@/components/ArcZoomControls";
import Link from "next/link";

const ForceGraph = dynamic(() => import("@/components/ForceGraph"), {
  ssr: false,
});

const ArcDiagram = dynamic(() => import("@/components/ArcDiagram"), {
  ssr: false,
});

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("arcs");
  const [canon, setCanon] = useState<Canon>("catholic");
  const [translation, setTranslation] = useState("rsv-ce");
  const [edgeDensity, setEdgeDensity] = useState<DensityStop>("medium");
  const edgeThreshold = DENSITY_THRESHOLDS[edgeDensity];
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [hoveredBook, setHoveredBook] = useState<{
    book: BibleBook;
    x: number;
    y: number;
  } | null>(null);
  const [constellationReady, setConstellationReady] = useState(false);
  const arcRef = useRef<{ zoomIn: () => void; zoomOut: () => void; resetZoom: () => void } | null>(null);
  const [arcZoomLevel, setArcZoomLevel] = useState(100);
  const [viewTransitionBook, setViewTransitionBook] = useState<string | null>(null);
  const prevViewModeRef = useRef(viewMode);
  const [readings] = useState(() => {
    try {
      return getDailyReadings();
    } catch (err) {
      console.warn("[bible-atlas] getDailyReadings failed:", err);
      return null;
    }
  });
  const [todayBookIds] = useState(() =>
    readings
      ? readings.readings.map((r) => r.bookId).filter((id): id is string => !!id)
      : []
  );

  // Soft filter: dim non-readings books. Cleared on book click, canon change,
  // or edge-density change. Persistence across sessions is out of scope here
  // (session 6 will handle that).
  const [readingsFilterActive, setReadingsFilterActive] = useState(true);

  // Signal to open the expanded readings card (from the "Reading today" chip).
  const [readingsCardOpenSignal, setReadingsCardOpenSignal] = useState(0);
  const handleOpenReadingsCard = useCallback(() => {
    setReadingsCardOpenSignal((n) => n + 1);
  }, []);

  // ─── DISMISSAL STATE ───
  // showReadingPlan: true when user has dismissed readings for today or prefers plan by default.
  // showDefaultPrompt: true when user has dismissed 3+ consecutive days and hasn't set a default.
  const [showReadingPlan, setShowReadingPlan] = useState(false);
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);

  // Feast-day pulse target: only computed on first load, only if today is a
  // major feast. Cleared after a single pulse cycle so it doesn't retrigger.
  const [feastPulseBookId, setFeastPulseBookId] = useState<string | null>(null);

  // Tracks whether the current session was restored from persisted navigation.
  // Non-null → show "Continue reading" chip with the stored book/chapter label.
  const [restoredChip, setRestoredChip] = useState<{
    bookId: string;
    chapter: number | null;
  } | null>(null);

  // ─── READING PANE STATE ───
  const [activeReading, setActiveReading] = useState<{
    index: number;
    reading: { type: string; reference: string; bookId: string };
  } | null>(null);

  // ─── READING PANE CROSS-REFS ───
  const [readingPaneCrossRefs, setReadingPaneCrossRefs] = useState<VerseCrossRef[]>([]);

  // ─── DRILL-DOWN STATE (reported from DetailPanel) ───
  const [drillState, setDrillState] = useState<{
    bookId: string | null;
    chapter: number | null;
    verse: number | null;
  } | null>(null);

  // Pending cross-reference navigation pushed down into DetailPanel.
  // Updating `key` always wins the most recent click — no stack.
  const [pendingNavigation, setPendingNavigation] = useState<{
    bookId: string;
    chapter: number;
    verse: number;
    key: number;
  } | null>(null);

  // Stack of prior reading locations. Pushed before each "Jump to passage"
  // cross-ref navigation so the jump is reversible via the Back breadcrumb.
  // Arc/search navigations do NOT push — they reset reader context entirely.
  const [readingHistory, setReadingHistory] = useState<ReadingLocation[]>([]);

  // Cross-refs for the selected book (shared between ForceGraph and DetailPanel)
  const [bookCrossRefs, setBookCrossRefs] = useState<VerseCrossRef[]>([]);
  const [crossRefBookId, setCrossRefBookId] = useState<string | null>(null);

  // Reset cross-refs when book changes (derived state pattern)
  if (crossRefBookId !== selectedBookId) {
    setCrossRefBookId(selectedBookId);
    setBookCrossRefs([]);
  }

  // Debounce ref for persisting navigation state (prevents thrashing on rapid clicks)
  const navWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── FIRST-LOAD: RESTORE PREFERENCES + OPEN TO PERSISTED BOOK OR TODAY'S GOSPEL ───
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── Readings dismissal: auto-expire or activate plan card ──
    const todayStr = new Date().toISOString().slice(0, 10);
    const dismissedDate = getPreference<string>("readings-dismissed-date");
    const defaultView = getPreference<string>("default-daily-view");
    const consecutiveCount = getPreference<number>("consecutive-dismissals") ?? 0;

    let willShowPlan = false;
    if (dismissedDate !== null) {
      if (dismissedDate < todayStr) {
        // Stale dismissal from a previous day — auto-expire it.
        setPreference<string>("readings-dismissed-date", null);
      } else {
        // Dismissed earlier today — keep plan card up.
        willShowPlan = true;
      }
    }
    if (defaultView === "plan") willShowPlan = true;

    if (willShowPlan) {
      setShowReadingPlan(true);
      if (defaultView === null && consecutiveCount >= 3) {
        setShowDefaultPrompt(true);
      }
    }

    // Apply persisted filter preferences
    const savedTranslation = getPreference<string>("translation");
    const savedCanon = getPreference<Canon>("canon");
    const savedDensity = getPreference<DensityStop>("density");
    if (savedTranslation) setTranslation(savedTranslation);
    if (savedCanon) setCanon(savedCanon);
    if (savedDensity) setEdgeDensity(savedDensity);

    // Check for persisted navigation (stale if older than 14 days)
    const persistedBook = getPreference<string>("last-book");
    const persistedDate = getPreference<string>("last-view-date");
    if (persistedBook && persistedDate) {
      const daysSince =
        (Date.now() - new Date(persistedDate).getTime()) / 86_400_000;
      if (daysSince <= 14) {
        const persistedChapter = getPreference<number>("last-chapter");
        const persistedVerse = getPreference<number>("last-verse");
        const navKey =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        setSelectedBookId(persistedBook);
        if (persistedChapter !== null) {
          setPendingNavigation({
            bookId: persistedBook,
            chapter: persistedChapter,
            verse: persistedVerse ?? 1,
            key: navKey,
          });
        }
        setRestoredChip({ bookId: persistedBook, chapter: persistedChapter });
        return;
      }
    }

    // No valid persisted state → fall through to today's Gospel (liturgical landing)
    if (!readings || readings.readings.length === 0) {
      console.warn("[bible-atlas] No readings available for first-load state");
      return;
    }

    const gospel = readings.readings.find((r) => r.type === "Gospel");
    if (!gospel || !gospel.bookId) {
      console.warn("[bible-atlas] No Gospel reading found for first-load state");
      return;
    }

    const parsed = parseReadingReference(gospel.reference);
    if (!parsed) {
      console.warn(
        "[bible-atlas] Unable to parse Gospel reference:",
        gospel.reference,
      );
      return;
    }

    const key =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    setSelectedBookId(gospel.bookId);
    setPendingNavigation({
      bookId: gospel.bookId,
      chapter: parsed.chapter,
      verse: parsed.startVerse,
      key,
    });

    // Feast-day pulse — only on major General Roman Calendar feasts.
    if (getMajorFeast() !== null) {
      setFeastPulseBookId(gospel.bookId);
      setTimeout(() => setFeastPulseBookId(null), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load cross-refs when book changes
  useEffect(() => {
    if (!selectedBookId) return;
    let cancelled = false;
    fetch(`/crossrefs/${selectedBookId}.json`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: VerseCrossRef[]) => {
        if (!cancelled) setBookCrossRefs(data);
      })
      .catch(() => {
        if (!cancelled) setBookCrossRefs([]);
      });
    return () => { cancelled = true; };
  }, [selectedBookId]);

  // Load cross-refs for reading pane
  useEffect(() => {
    const bookId = activeReading?.reading.bookId;
    if (!bookId) {
      setReadingPaneCrossRefs([]);
      return;
    }
    let cancelled = false;
    fetch(`/crossrefs/${bookId}.json`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: VerseCrossRef[]) => {
        if (!cancelled) setReadingPaneCrossRefs(data);
      })
      .catch(() => {
        if (!cancelled) setReadingPaneCrossRefs([]);
      });
    return () => { cancelled = true; };
  }, [activeReading?.reading.bookId]);

  // Persist navigation state (debounced 500ms to avoid thrashing on rapid clicks).
  // Every write of last-book also writes last-view-date.
  useEffect(() => {
    if (!drillState?.bookId) return;
    if (navWriteTimerRef.current) clearTimeout(navWriteTimerRef.current);
    navWriteTimerRef.current = setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      setPreference<string>("last-book", drillState.bookId!);
      setPreference<string>("last-view-date", today);
      setPreference<number | null>("last-chapter", drillState.chapter ?? null);
      setPreference<number | null>("last-verse", drillState.verse ?? null);
    }, 500);
    return () => {
      if (navWriteTimerRef.current) clearTimeout(navWriteTimerRef.current);
    };
  }, [drillState]);

  // Compute drill-down target books for ForceGraph highlighting
  const selectedChapter = drillState?.chapter ?? null;
  const selectedVerse = drillState?.verse ?? null;

  const drillDownTargetBooks = useMemo(() => {
    if (!selectedBookId || bookCrossRefs.length === 0) return null;

    if (selectedVerse !== null && selectedChapter !== null) {
      const verseRefs = getVerseCrossRefs(bookCrossRefs, selectedChapter, selectedVerse);
      return getTargetBookCounts(verseRefs);
    }

    if (selectedChapter !== null) {
      const chapterRefs = getVerseCrossRefs(bookCrossRefs, selectedChapter);
      return getTargetBookCounts(chapterRefs);
    }

    return null;
  }, [selectedBookId, selectedChapter, selectedVerse, bookCrossRefs]);

  const handleHover = useCallback(
    (book: BibleBook | null, x: number, y: number) => {
      if (book) {
        setHoveredBook({ book, x, y });
      } else {
        setHoveredBook(null);
      }
    },
    []
  );

  const handleSelectBook = useCallback((id: string | null) => {
    setSelectedBookId(id);
    setDrillState(null);
    setArcHighlightBookId(null);
    setPendingNavigation(null);
    setReadingsFilterActive(false);
    setRestoredChip(null);
    setReadingHistory([]);
  }, []);

  const handleCanonChange = useCallback((next: Canon) => {
    setCanon(next);
    setReadingsFilterActive(false);
    setPreference<string>("canon", next);
  }, []);

  const handleDensityChange = useCallback((next: DensityStop) => {
    setEdgeDensity(next);
    setReadingsFilterActive(false);
    setPreference<string>("density", next);
  }, []);

  const handleSelectChapter = useCallback((chapter: number | null) => {
    setDrillState((prev) => prev ? { ...prev, chapter, verse: null } : null);
  }, []);

  const handleNavigationChange = useCallback(
    (state: { bookId: string | null; chapter: number | null; verse: number | null }) => {
      setDrillState(state);
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    setSelectedBookId(null);
    setDrillState(null);
    setPendingNavigation(null);
    setRestoredChip(null);
    setReadingHistory([]);
  }, []);

  const handleCrossRefNavigate = useCallback(
    (bookId: string, chapter: number, verse: number) => {
      // Snapshot current reading location before jumping so the user can
      // reverse the jump via the Back breadcrumb. Skip the push if we don't
      // have a concrete current verse (no drill state) — there's nothing
      // meaningful to return to.
      // TODO: capture scrollY from DetailPanel once it exposes a scroll ref.
      if (
        drillState?.bookId &&
        drillState.chapter !== null &&
        drillState.verse !== null
      ) {
        const snapshot: ReadingLocation = {
          bookId: drillState.bookId,
          chapter: drillState.chapter,
          verse: drillState.verse,
          translation,
        };
        setReadingHistory((prev) => [...prev, snapshot]);
      }

      const key =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      setSelectedBookId(bookId);
      setPendingNavigation({ bookId, chapter, verse, key });
      setRestoredChip(null);
      const book = bookMap.get(bookId);
      if (book) addRecentPassage({ book: book.name, chapter, verse });
    },
    [drillState, translation]
  );

  const handleReadingHistoryBack = useCallback(() => {
    setReadingHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const target = prev[prev.length - 1];
      const key =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      setSelectedBookId(target.bookId);
      setPendingNavigation({
        bookId: target.bookId,
        chapter: target.chapter,
        verse: target.verse,
        key,
      });
      setRestoredChip(null);
      return next;
    });
  }, []);

  const handleTranslationChange = useCallback((next: string) => {
    setTranslation(next);
    setPreference<string>("translation", next);
    // Palette verse previews are translation-scoped; drop cached text so
    // subsequent lookups refetch in the new translation.
    clearVerseTextCache();
  }, []);

  const handleDismissContinue = useCallback(() => {
    setPreference<string>("last-book", null);
    setPreference<number>("last-chapter", null);
    setPreference<number>("last-verse", null);
    setPreference<string>("last-view-date", null);
    setRestoredChip(null);
    // Return to today's Gospel
    if (!readings || readings.readings.length === 0) return;
    const gospel = readings.readings.find((r) => r.type === "Gospel");
    if (!gospel || !gospel.bookId) return;
    const parsed = parseReadingReference(gospel.reference);
    if (!parsed) return;
    const key =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    setSelectedBookId(gospel.bookId);
    setPendingNavigation({
      bookId: gospel.bookId,
      chapter: parsed.chapter,
      verse: parsed.startVerse,
      key,
    });
  }, [readings]);

  // ─── DISMISSAL HANDLERS ───
  const handleDismissReadings = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const prevDismissedDate = getPreference<string>("readings-dismissed-date");
    const prevCount = getPreference<number>("consecutive-dismissals") ?? 0;

    setPreference<string>("readings-dismissed-date", todayStr);
    const newCount = prevDismissedDate === yesterday ? prevCount + 1 : 1;
    setPreference<number>("consecutive-dismissals", newCount);

    setShowReadingPlan(true);

    const defaultView = getPreference<string>("default-daily-view");
    if (defaultView === null && newCount >= 3) {
      setShowDefaultPrompt(true);
    }
  }, []);

  const handleShowReadings = useCallback(() => {
    setPreference<string>("readings-dismissed-date", null);
    setShowReadingPlan(false);
    setShowDefaultPrompt(false);
  }, []);

  const handleDefaultPromptYes = useCallback(() => {
    setPreference<string>("default-daily-view", "plan");
    setShowDefaultPrompt(false);
  }, []);

  const handleDefaultPromptNo = useCallback(() => {
    setPreference<string>("default-daily-view", "readings");
    setShowDefaultPrompt(false);
  }, []);

  const handleNavigateTo = useCallback((bookId: string, chapter: number) => {
    const key = typeof performance !== "undefined" ? performance.now() : Date.now();
    setSelectedBookId(bookId);
    setPendingNavigation({ bookId, chapter, verse: 1, key });
    setRestoredChip(null);
  }, []);

  const handleOpenReading = useCallback((bookId: string, reference: string, type: string, index: number) => {
    // If detail panel is open, close it first and delay opening reading pane
    if (selectedBookId !== null) {
      setSelectedBookId(null);
      setDrillState(null);
      setTimeout(() => {
        setActiveReading({ index, reading: { type, reference, bookId } });
      }, 250); // wait for DetailPanel exit animation
    } else {
      setActiveReading({ index, reading: { type, reference, bookId } });
    }
  }, [selectedBookId]);

  const handleReadAll = useCallback(() => {
    if (!readings) return;
    const firstValidIndex = readings.readings.findIndex(r => !!r.bookId);
    if (firstValidIndex === -1) return;
    const r = readings.readings[firstValidIndex];
    handleOpenReading(r.bookId!, r.reference, r.type, firstValidIndex);
  }, [readings, handleOpenReading]);

  const handleNavigateReading = useCallback((index: number) => {
    if (!readings) return;
    const r = readings.readings[index];
    if (!r || !r.bookId) return;
    setActiveReading({
      index,
      reading: { type: r.type, reference: r.reference, bookId: r.bookId },
    });
  }, [readings]);

  const handleCloseReading = useCallback(() => {
    setActiveReading(null);
  }, []);

  const handleExploreFromReading = useCallback((bookId: string) => {
    setActiveReading(null);
    setTimeout(() => {
      handleSelectBook(bookId);
    }, 250); // wait for ReadingPane exit animation
  }, [handleSelectBook]);

  const handleVerseFromReading = useCallback((bookId: string, chapter: number, verse: number) => {
    setActiveReading(null);
    setTimeout(() => {
      setSelectedBookId(bookId);
      setDrillState({ bookId, chapter, verse });
    }, 250); // wait for ReadingPane exit animation
  }, []);

  // ─── ARC HIGHLIGHT STATE (separate from selectedBookId to avoid opening DetailPanel) ───
  const [arcHighlightBookId, setArcHighlightBookId] = useState<string | null>(null);

  // ─── ARC FOCUS MODE (persisted) ───
  const [arcFocusMode, setArcFocusMode] = useState<"auto" | "off" | "on">(
    () => (getPreference("arc-focus-mode") as "auto" | "off" | "on" | null) ?? "auto",
  );

  const handleArcFocusModeChange = useCallback(
    (mode: "auto" | "off" | "on") => {
      setArcFocusMode(mode);
      setPreference("arc-focus-mode", mode);
    },
    [],
  );

  const handleViewConnectionsFromReading = useCallback((bookId: string) => {
    setActiveReading(null);
    setArcHighlightBookId(bookId);
    setViewMode("arcs");
  }, []);

  // ─── COMMAND-K SEARCH PALETTE ───
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const handleSearchSelectBook = useCallback((bookId: string) => {
    setSelectedBookId(bookId);
    setDrillState(null);
    setArcHighlightBookId(null);
    setPendingNavigation(null);
    setReadingsFilterActive(false);
    setRestoredChip(null);
    setReadingHistory([]);
  }, []);

  const handleSearchSelectChapter = useCallback(
    (bookId: string, chapter: number) => {
      setSelectedBookId(bookId);
      setDrillState(null);
      setArcHighlightBookId(null);
      setPendingNavigation(buildVerseNavigation(bookId, chapter, 1));
      setReadingsFilterActive(false);
      setRestoredChip(null);
      setReadingHistory([]);
    },
    [],
  );

  const handleSearchSelectVerse = useCallback(
    (bookId: string, chapter: number, verse: number) => {
      setSelectedBookId(bookId);
      setDrillState(null);
      setArcHighlightBookId(null);
      setPendingNavigation(buildVerseNavigation(bookId, chapter, verse));
      setReadingsFilterActive(false);
      setRestoredChip(null);
      setReadingHistory([]);
    },
    [],
  );

  // Global Cmd/Ctrl+K and `/` shortcuts. Ignore key presses inside form fields
  // or contenteditable regions, except the palette's own input which this
  // effect never sees anyway (capture phase fires before bubble).
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K always opens regardless of focus target.
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setSearchOpen(true);
        return;
      }

      // "/" opens only when not already typing in a form field.
      if (e.key === "/" && !isMod && !e.altKey) {
        if (isTypingTarget(e.target)) return;
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  // ─── VIEW TRANSITION BOOK REMINDER ───
  useEffect(() => {
    if (prevViewModeRef.current !== viewMode) {
      prevViewModeRef.current = viewMode;
      if (selectedBookId) {
        const book = bookMap.get(selectedBookId);
        if (book) {
          setViewTransitionBook(book.name);
          const timer = setTimeout(() => setViewTransitionBook(null), 600);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [viewMode, selectedBookId]);

  // Reset drill-down state when canon changes and selected book is excluded (derived state pattern)
  const [lastCanon, setLastCanon] = useState(canon);
  if (lastCanon !== canon) {
    setLastCanon(canon);
    if (selectedBookId) {
      const book = bookMap.get(selectedBookId);
      if (book && !book.canons.includes(canon)) {
        setSelectedBookId(null);
        setDrillState(null);
      }
    }
  }

  const season = readings?.season as LiturgicalSeason | undefined;
  const seasonColor = season ? LITURGICAL_COLORS[season] : undefined;

  // Label for the "Continue reading" chip, computed from restored persistence state.
  const continueChipLabel = useMemo(() => {
    if (!restoredChip) return null;
    const book = bookMap.get(restoredChip.bookId);
    if (!book) return null;
    return restoredChip.chapter != null
      ? `${book.name} ${restoredChip.chapter}`
      : book.name;
  }, [restoredChip]);

  // Tooltip context — which variant renders is driven by these signals.
  // Canon mode fires when the user has picked a non-default canon; otherwise
  // readings mode or plain (no filter) mode.
  const tooltipContext: TooltipContext = useMemo(
    () => ({
      selectedBook: selectedBookId,
      filterMode: readingsFilterActive
        ? "readings"
        : canon !== "catholic"
          ? "canon"
          : "none",
      todayReadings: readings?.readings ?? null,
      canon,
    }),
    [selectedBookId, readingsFilterActive, canon, readings],
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden page-fade-in">
      <h1 className="sr-only">
        Bible Atlas — Interactive Cross-Reference Star Map
      </h1>
      {seasonColor && (
        <div
          className="fixed top-0 left-0 right-0 h-[2px] z-50"
          style={{ background: seasonColor }}
        />
      )}

      <StarBackground />

      <div key={viewMode} className="view-crossfade" style={{ position: "fixed", inset: 0 }}>
        {viewMode === "constellation" ? (
          <ForceGraph
            canon={canon}
            selectedBookId={selectedBookId}
            todayBookIds={todayBookIds}
            edgeThreshold={edgeThreshold}
            drillDownTargetBooks={drillDownTargetBooks}
            readingsFilterActive={readingsFilterActive}
            feastPulseBookId={feastPulseBookId}
            onSelectBook={handleSelectBook}
            onHover={handleHover}
            onReady={() => setConstellationReady(true)}
          />
        ) : (
          <ArcDiagram
            ref={arcRef}
            canon={canon}
            selectedBookId={selectedBookId ?? arcHighlightBookId}
            onSelectBook={handleSelectBook}
            translation={translation}
            selectedChapter={selectedChapter}
            selectedVerse={selectedVerse}
            onZoomChange={setArcZoomLevel}
            todayBookIds={todayBookIds}
            focusMode={arcFocusMode}
            onFocusModeChange={handleArcFocusModeChange}
            onOpenReader={(bookId, chapter, verse) => {
              setSelectedBookId(bookId);
              setDrillState(null);
              setArcHighlightBookId(null);
              setPendingNavigation(
                buildVerseNavigation(bookId, chapter, verse ?? 1),
              );
              setReadingsFilterActive(false);
              setRestoredChip(null);
              setReadingHistory([]);
            }}
          />
        )}
      </div>

      {/* View transition book reminder */}
      {viewTransitionBook && (
        <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div
            className="glass-panel view-transition-book-label"
            style={{
              padding: '12px 24px',
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              color: 'var(--color-accent)',
            }}
          >
            {viewTransitionBook}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {viewMode === "constellation" && !constellationReady && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none"
        >
          <div
            className="glass-panel flex flex-col items-center gap-4"
            style={{ padding: "32px 48px", borderRadius: 16 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--accent)",
                animation: "pulse-glow 1.4s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.2em",
                color: "var(--text-dim)",
                textTransform: "uppercase",
              }}
            >
              Initializing constellation
            </span>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-[14px] md:px-5"
        style={{
          background: "linear-gradient(to bottom, rgba(10,10,18,0.85) 0%, rgba(10,10,18,0.4) 70%, transparent 100%)",
        }}
      >
        {/* Far left: Wordmark */}
        <div
          className="flex items-center gap-2"
          style={{
            opacity: 0.7,
            transition: "var(--transition-base)",
            cursor: "default",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.opacity = "0.85")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.opacity = "0.7")
          }
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "22px",
              color: "var(--accent)",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            ☧
          </span>
          <span
            className="hidden md:inline"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "19px",
              fontVariant: "small-caps",
              letterSpacing: "0.12em",
              color: "var(--accent)",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            Bible Atlas
          </span>
        </div>

        {/* Center: Orrery Toggle */}
        <div className="flex items-center gap-4">
          <CelestialOrreryToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {/* Far right: Search + About link + Translation Selector */}
        <div
          className="flex items-center gap-2"
          style={{
            background: "rgba(20, 20, 40, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "24px",
            padding: "4px 6px",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <SearchTrigger ref={searchTriggerRef} onClick={openSearch} />
          <Link
            href="/about"
            className="text-[12px] font-mono hidden md:inline-block"
            style={{
              color: "var(--text-primary)",
              opacity: 0.85,
              transition: "var(--transition-base)",
              letterSpacing: "0.06em",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "6px 14px",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
          >
            About
          </Link>
          {/* Mobile: icon-only about button */}
          <Link
            href="/about"
            className="md:hidden text-[14px]"
            style={{
              color: "var(--text-primary)",
              opacity: 0.85,
              transition: "var(--transition-base)",
              lineHeight: 1,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "6px 10px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
            }}
            aria-label="About Bible Atlas"
          >
            ⓘ
          </Link>
        </div>
      </div>

      <FilterPanel
        canon={canon}
        onCanonChange={handleCanonChange}
        translation={translation}
        onTranslationChange={handleTranslationChange}
        edgeDensity={edgeDensity}
        onDensityChange={handleDensityChange}
      />

      <Tooltip
        book={hoveredBook?.book ?? null}
        x={hoveredBook?.x ?? 0}
        y={hoveredBook?.y ?? 0}
        context={tooltipContext}
      />

      <DetailPanel
        isOpen={selectedBookId !== null}
        selectedBook={selectedBookId}
        canon={canon}
        translation={translation}
        crossReferenceData={bookCrossRefs}
        onSelectBook={handleSelectBook}
        onNavigationChange={handleNavigationChange}
        onClose={handleClosePanel}
        onCrossRefNavigate={handleCrossRefNavigate}
        onOpenReadingsCard={handleOpenReadingsCard}
        pendingNavigation={pendingNavigation}
        continueChipLabel={continueChipLabel}
        onDismissContinue={handleDismissContinue}
        readingHistory={readingHistory}
        onReadingHistoryBack={handleReadingHistoryBack}
      />

      <ReadingPane
        isOpen={activeReading !== null}
        reading={activeReading?.reading ?? null}
        translation={translation}
        allReadings={readings?.readings ?? []}
        currentReadingIndex={activeReading?.index ?? 0}
        onClose={handleCloseReading}
        onNavigateReading={handleNavigateReading}
        onExploreBook={handleExploreFromReading}
        onViewConnections={handleViewConnectionsFromReading}
        crossReferenceData={readingPaneCrossRefs}
        onSelectVerse={handleVerseFromReading}
      />

      {/* Bottom-left control dock */}
      <div
        className="fixed z-40 bottom-3 left-3 md:bottom-4 md:left-4"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        {/* Three-day preference prompt — shown above the plan card */}
        {showDefaultPrompt && (
          <div
            className="readings-card"
            style={{
              width: "min(300px, calc(100vw - 32px))",
              background: "rgba(14, 14, 28, 0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-text-primary)",
                lineHeight: 1.6,
                marginBottom: "12px",
              }}
            >
              Prefer the reading plan by default?
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleDefaultPromptYes}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--color-accent)",
                  background: "var(--color-accent-muted)",
                  border: "1px solid var(--color-accent-border)",
                  borderRadius: "9999px",
                  padding: "5px 14px",
                  cursor: "pointer",
                  transition: "all 200ms ease-out",
                  opacity: 0.85,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              >
                Yes
              </button>
              <button
                onClick={handleDefaultPromptNo}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--color-text-secondary)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "9999px",
                  padding: "5px 14px",
                  cursor: "pointer",
                  transition: "all 200ms ease-out",
                  opacity: 0.75,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.75"; }}
              >
                No, keep showing readings
              </button>
            </div>
          </div>
        )}

        {showReadingPlan ? (
          <ReadingPlanCard
            onShowReadings={handleShowReadings}
            onNavigateTo={handleNavigateTo}
          />
        ) : (
          <ReadingsPill
            data={readings}
            onSelectBook={handleSelectBook}
            onSelectChapter={handleSelectChapter}
            onOpenReading={handleOpenReading}
            onReadAll={handleReadAll}
            openSignal={readingsCardOpenSignal}
            onDismiss={handleDismissReadings}
          />
        )}
      </div>

      {viewMode === "arcs" && (
        <div className="view-crossfade">
          <ArcZoomControls
            zoomLevel={arcZoomLevel}
            onZoomIn={() => arcRef.current?.zoomIn()}
            onZoomOut={() => arcRef.current?.zoomOut()}
            onResetZoom={() => arcRef.current?.resetZoom()}
          />
        </div>
      )}

      <SearchPalette
        isOpen={searchOpen}
        translation={translation}
        onClose={closeSearch}
        onSelectBook={handleSearchSelectBook}
        onSelectChapter={handleSearchSelectChapter}
        onSelectVerse={handleSearchSelectVerse}
      />

    </main>
  );
}
