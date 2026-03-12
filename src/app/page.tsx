"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import StarBackground from "@/components/StarBackground";
import Tooltip from "@/components/Tooltip";
import DetailPanel from "@/components/DetailPanel";
import ReadingsCard from "@/components/ReadingsCard";
import CanonFilter from "@/components/CanonFilter";
import TranslationSelector from "@/components/TranslationSelector";
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
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [canon, setCanon] = useState<Canon>("catholic");
  const [translation, setTranslation] = useState("web");
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
    <main className="relative w-screen h-screen overflow-hidden">
      {seasonColor && (
        <div
          className="fixed top-0 left-0 right-0 h-[2px] z-50"
          style={{ background: seasonColor }}
        />
      )}

      <StarBackground />

      {viewMode === "graph" ? (
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

      <CanonFilter canon={canon} onChange={setCanon} />

      {/* View mode toggle + edge threshold slider */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
        <div className="flex gap-1 bg-white/[0.06] backdrop-blur-sm rounded-full p-1 border border-white/[0.08]">
          <button
            onClick={() => setViewMode("graph")}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
              viewMode === "graph"
                ? "bg-white/15 text-white/90"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => setViewMode("arcs")}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
              viewMode === "arcs"
                ? "bg-white/15 text-white/90"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Arcs
          </button>
        </div>
        {viewMode === "graph" && (
          <div className="flex items-center gap-2 bg-white/[0.06] backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/[0.08]">
            <span className="text-[10px] text-white/40 whitespace-nowrap">Edges</span>
            <input
              type="range"
              min={1}
              max={10}
              value={edgeThreshold}
              onChange={(e) => setEdgeThreshold(Number(e.target.value))}
              className="w-16 h-1 accent-white/60 cursor-pointer"
            />
            <span className="text-[10px] text-white/50 w-4 text-center">{edgeThreshold}</span>
          </div>
        )}
      </div>
      <TranslationSelector translation={translation} onChange={setTranslation} />

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

      <Link
        href="/about"
        className="fixed bottom-4 right-4 z-40 text-[10px] text-white/20 hover:text-white/50 transition-colors"
      >
        About Bible Atlas
      </Link>

      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center">
        <h1 className="text-white/[0.07] text-3xl font-light tracking-[0.3em] uppercase">
          Bible Atlas
        </h1>
      </div>
    </main>
  );
}
