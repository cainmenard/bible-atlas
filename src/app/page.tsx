"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import StarBackground from "@/components/StarBackground";
import Tooltip from "@/components/Tooltip";
import DetailPanel from "@/components/DetailPanel";
import ReadingsCard from "@/components/ReadingsCard";
import OrbitalRingSelector from "@/components/OrbitalRingSelector";
import TranslationSelector from "@/components/TranslationSelector";
import CelestialOrreryToggle from "@/components/CelestialOrreryToggle";
import EdgeDensitySelector from "@/components/EdgeDensitySelector";
import { BibleBook, Canon, LiturgicalSeason, ViewMode } from "@/lib/types";
import { LITURGICAL_COLORS } from "@/lib/colors";
import { getDailyReadings } from "@/lib/readings";
import Link from "next/link";

const ForceGraph = dynamic(() => import("@/components/ForceGraph"), {
  ssr: false,
});

const ArcDiagram = dynamic(() => import("@/components/ArcDiagram"), {
  ssr: false,
});

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
  const [readings] = useState(() => getDailyReadings());
  const [todayBookIds] = useState(() =>
    getDailyReadings()
      .readings.map((r) => r.bookId)
      .filter((id): id is string => !!id)
  );

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
  }, []);

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
            onSelectBook={handleSelectBook}
            onHover={handleHover}
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

      {/* Top bar: Wordmark | Orrery Toggle | Translation Selector */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-[14px] md:px-5"
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
        <div className="flex items-center gap-3">
          <Link
            href="/about"
            className="text-[10px] font-mono three-state-interactive hidden md:inline"
            style={{ color: "var(--text-dim)" }}
          >
            About
          </Link>
          {/* Mobile: icon-only about button */}
          <Link
            href="/about"
            className="md:hidden text-[14px] three-state-interactive"
            style={{ color: "var(--text-dim)", lineHeight: 1 }}
            aria-label="About Bible Atlas"
          >
            ⓘ
          </Link>
          <TranslationSelector translation={translation} onChange={setTranslation} />
        </div>
      </div>

      {/* Orbital ring canon selector — fixed bottom-left */}
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
        onSelectBook={setSelectedBookId}
        onClose={() => setSelectedBookId(null)}
      />

      <ReadingsCard data={readings} onSelectBook={setSelectedBookId} />

    </main>
  );
}
