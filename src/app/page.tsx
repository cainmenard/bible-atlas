"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import StarBackground from "@/components/StarBackground";
import Tooltip from "@/components/Tooltip";
import DetailPanel from "@/components/DetailPanel";
import CanonChip from "@/components/CanonChip";
import ReadingsPill from "@/components/ReadingsPill";
import TranslationSelector from "@/components/TranslationSelector";
import CelestialOrreryToggle from "@/components/CelestialOrreryToggle";
import EdgeDensitySelector from "@/components/EdgeDensitySelector";
import { BibleBook, Canon, LiturgicalSeason, ViewMode, VerseCrossRef } from "@/lib/types";
import { LITURGICAL_COLORS } from "@/lib/colors";
import { getDailyReadings } from "@/lib/readings";
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
  const [edgeThreshold, setEdgeThreshold] = useState(5);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [hoveredBook, setHoveredBook] = useState<{
    book: BibleBook;
    x: number;
    y: number;
  } | null>(null);
  const [constellationReady, setConstellationReady] = useState(false);
  const arcRef = useRef<{ zoomIn: () => void; zoomOut: () => void; resetZoom: () => void } | null>(null);
  const [arcZoomLevel, setArcZoomLevel] = useState(100);
  const [readings] = useState(() => getDailyReadings());
  const [todayBookIds] = useState(() =>
    readings.readings.map((r) => r.bookId).filter((id): id is string => !!id)
  );

  // ─── DRILL-DOWN STATE (reported from DetailPanel) ───
  const [drillState, setDrillState] = useState<{
    bookId: string | null;
    chapter: number | null;
    verse: number | null;
  } | null>(null);

  // Cross-refs for the selected book (shared between ForceGraph and DetailPanel)
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
  }, []);

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
            ref={arcRef}
            canon={canon}
            selectedBookId={selectedBookId}
            onSelectBook={handleSelectBook}
            translation={translation}
            selectedChapter={selectedChapter}
            selectedVerse={selectedVerse}
            onZoomChange={setArcZoomLevel}
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

      <Tooltip
        book={hoveredBook?.book ?? null}
        x={hoveredBook?.x ?? 0}
        y={hoveredBook?.y ?? 0}
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
        <ReadingsPill
          data={readings}
          onSelectBook={handleSelectBook}
          onSelectChapter={handleSelectChapter}
        />
        <CanonChip canon={canon} onChange={setCanon} />
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

    </main>
  );
}
