"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import StarBackground from "@/components/StarBackground";
import Tooltip from "@/components/Tooltip";
import DetailPanel from "@/components/DetailPanel";
import ReadingsCard from "@/components/ReadingsCard";
import OrbitalRingSelector from "@/components/OrbitalRingSelector";
import TranslationSelector from "@/components/TranslationSelector";
import CelestialOrreryToggle from "@/components/CelestialOrreryToggle";
import EdgeDensitySelector from "@/components/EdgeDensitySelector";
import { BibleBook, Canon, LiturgicalSeason, NavigationEntry, ViewMode, VerseCrossRef } from "@/lib/types";
import { LITURGICAL_COLORS } from "@/lib/colors";
import { getDailyReadings } from "@/lib/readings";
import { getBookName } from "@/lib/bible-api";
import { getVerseCrossRefs, getTargetBookCounts } from "@/lib/crossref-utils";
import { bookMap } from "@/data/books";
import Link from "next/link";

const ForceGraph = dynamic(() => import("@/components/ForceGraph"), {
  ssr: false,
});

const ArcDiagram = dynamic(() => import("@/components/ArcDiagram"), {
  ssr: false,
});

const NAV_STACK_MAX = 50;

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("constellation");
  const [canon, setCanon] = useState<Canon>("catholic");
  const [translation, setTranslation] = useState("rsv-ce");
  const [edgeThreshold, setEdgeThreshold] = useState(5);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [hoveredBook, setHoveredBook] = useState<{
    book: BibleBook;
    x: number;
    y: number;
  } | null>(null);
  const [constellationReady, setConstellationReady] = useState(false);
  const [readings] = useState(() => getDailyReadings());
  const [todayBookIds] = useState(() =>
    readings.readings.map((r) => r.bookId).filter((id): id is string => !!id)
  );

  // ─── DRILL-DOWN STATE ───
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [navigationStack, setNavigationStack] = useState<NavigationEntry[]>([]);

  // Cross-refs for the selected book (loaded by DetailPanel, cached here for ForceGraph)
  const [bookCrossRefs, setBookCrossRefs] = useState<VerseCrossRef[]>([]);
  const [crossRefBookId, setCrossRefBookId] = useState<string | null>(null);

  // Reset cross-refs when book changes (derived state pattern)
  if (crossRefBookId !== selectedBookId) {
    setCrossRefBookId(selectedBookId);
    setBookCrossRefs([]);
  }

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

  // Compute drill-down target books for ForceGraph highlighting
  const drillDownTargetBooks = useMemo(() => {
    if (!selectedBookId || bookCrossRefs.length === 0) return null;

    if (selectedVerse !== null && selectedChapter !== null) {
      // Verse level: only books referenced by this specific verse
      const verseRefs = getVerseCrossRefs(bookCrossRefs, selectedChapter, selectedVerse);
      return getTargetBookCounts(verseRefs);
    }

    if (selectedChapter !== null) {
      // Chapter level: books referenced by this chapter
      const chapterRefs = getVerseCrossRefs(bookCrossRefs, selectedChapter);
      return getTargetBookCounts(chapterRefs);
    }

    // Book level: no drill-down filtering
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
    // Reset drill-down when changing books
    setSelectedChapter(null);
    setSelectedVerse(null);
  }, []);

  const handleSelectChapter = useCallback((chapter: number | null) => {
    setSelectedChapter(chapter);
    setSelectedVerse(null);
  }, []);

  const handleSelectVerse = useCallback((verse: number | null) => {
    setSelectedVerse(verse);
  }, []);

  // Navigate to a specific verse (used by cross-ref "Go to" buttons)
  const handleNavigateTo = useCallback(
    (bookId: string, chapter: number, verse: number) => {
      // Push current location onto navigation stack
      if (selectedBookId) {
        const bookName = getBookName(selectedBookId);
        let label = bookName;
        if (selectedChapter !== null) label += ` ${selectedChapter}`;
        if (selectedVerse !== null) label += `:${selectedVerse}`;

        setNavigationStack((prev) => {
          const next = [
            ...prev,
            {
              bookId: selectedBookId,
              chapter: selectedChapter ?? undefined,
              verse: selectedVerse ?? undefined,
              label,
            },
          ];
          // Cap at max
          if (next.length > NAV_STACK_MAX) next.shift();
          return next;
        });
      }

      // Navigate to the target
      setSelectedBookId(bookId);
      setSelectedChapter(chapter);
      setSelectedVerse(verse);
    },
    [selectedBookId, selectedChapter, selectedVerse]
  );

  // Navigate back to a previous entry in the stack
  const handleNavigateBack = useCallback(
    (entry: NavigationEntry | null) => {
      if (!entry) {
        // Clear everything
        setSelectedBookId(null);
        setSelectedChapter(null);
        setSelectedVerse(null);
        setNavigationStack([]);
        return;
      }

      // Pop stack to this entry
      setNavigationStack((prev) => {
        const idx = prev.findIndex(
          (e) =>
            e.bookId === entry.bookId &&
            e.chapter === entry.chapter &&
            e.verse === entry.verse
        );
        return idx >= 0 ? prev.slice(0, idx) : prev;
      });

      setSelectedBookId(entry.bookId);
      setSelectedChapter(entry.chapter ?? null);
      setSelectedVerse(entry.verse ?? null);
    },
    []
  );

  // ESC key: step back one drill-down level
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedVerse !== null) {
          setSelectedVerse(null);
        } else if (selectedChapter !== null) {
          setSelectedChapter(null);
        } else if (selectedBookId !== null) {
          setSelectedBookId(null);
          setNavigationStack([]);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedBookId, selectedChapter, selectedVerse]);

  // Reset drill-down state when canon changes and selected book is excluded (derived state pattern)
  const [lastCanon, setLastCanon] = useState(canon);
  if (lastCanon !== canon) {
    setLastCanon(canon);
    if (selectedBookId) {
      const book = bookMap.get(selectedBookId);
      if (book && !book.canons.includes(canon)) {
        setSelectedBookId(null);
        setSelectedChapter(null);
        setSelectedVerse(null);
        setNavigationStack([]);
      }
    }
  }

  const season = readings?.season as LiturgicalSeason | undefined;
  const seasonColor = season ? LITURGICAL_COLORS[season] : undefined;

  return (
    <main className="relative w-screen h-screen overflow-hidden page-fade-in">
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
            onSelectBook={handleSelectBook}
            onHover={handleHover}
            onReady={() => setConstellationReady(true)}
          />
        ) : (
          <ArcDiagram
            canon={canon}
            selectedBookId={selectedBookId}
            onSelectBook={handleSelectBook}
            translation={translation}
          />
        )}
      </div>

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

        {/* Center: Orrery Toggle + Edge Density */}
        <div className="flex items-center gap-4">
          <CelestialOrreryToggle viewMode={viewMode} onChange={setViewMode} />
          {viewMode === "constellation" && (
            <div className="hidden md:block">
              <EdgeDensitySelector
                value={edgeThreshold}
                onChange={setEdgeThreshold}
              />
            </div>
          )}
        </div>

        {/* Far right: About link + Translation Selector */}
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
          <TranslationSelector translation={translation} onChange={setTranslation} />
        </div>
      </div>

      {/* Orbital ring canon selector */}
      <OrbitalRingSelector canon={canon} onChange={setCanon} />

      <Tooltip
        book={hoveredBook?.book ?? null}
        x={hoveredBook?.x ?? 0}
        y={hoveredBook?.y ?? 0}
      />

      <DetailPanel
        bookId={selectedBookId}
        canon={canon}
        translation={translation}
        selectedChapter={selectedChapter}
        selectedVerse={selectedVerse}
        navigationStack={navigationStack}
        onSelectBook={handleSelectBook}
        onSelectChapter={handleSelectChapter}
        onSelectVerse={handleSelectVerse}
        onNavigateBack={handleNavigateBack}
        onNavigateTo={handleNavigateTo}
        onClose={() => {
          setSelectedBookId(null);
          setSelectedChapter(null);
          setSelectedVerse(null);
          setNavigationStack([]);
        }}
      />

      <ReadingsCard
        data={readings}
        onSelectBook={handleSelectBook}
        onSelectChapter={handleSelectChapter}
      />

    </main>
  );
}
