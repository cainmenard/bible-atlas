"use client";

import { useState } from "react";
import { VerseCrossRef } from "@/lib/types";
import { bookMap } from "@/data/books";
import { formatRef, fetchVerseText } from "@/lib/bible-api";
import { GENRE_COLORS } from "@/lib/colors";
import { parseRef } from "@/lib/crossref-utils";

interface Props {
  crossRef: VerseCrossRef;
  direction: "outbound" | "inbound";
  translation: string;
  onNavigateTo: (bookId: string, chapter: number, verse: number) => void;
}

export default function CrossRefItem({
  crossRef,
  direction,
  translation,
  onNavigateTo,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [verseText, setVerseText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refStr = direction === "outbound" ? crossRef.to : crossRef.from;
  const parsed = parseRef(refStr);
  const targetBook = parsed ? bookMap.get(parsed.bookId) : null;
  const targetColor = targetBook ? GENRE_COLORS[targetBook.genre] : "#888";

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (verseText !== null || !parsed) return;

    setLoading(true);
    const result = await fetchVerseText(
      parsed.bookId,
      parsed.chapter,
      parsed.verse,
      translation
    );
    setVerseText(result?.text || null);
    setLoading(false);
  };

  const handleNavigate = () => {
    if (!parsed) return;
    onNavigateTo(parsed.bookId, parsed.chapter, parsed.verse);
  };

  return (
    <div
      className="rounded-[4px] overflow-hidden"
      style={{
        transition: "var(--transition-base)",
        border: expanded
          ? `1px solid ${targetColor}20`
          : "1px solid transparent",
        background: expanded ? "rgba(255, 255, 255, 0.02)" : "transparent",
      }}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 text-[11px] leading-tight cursor-pointer"
        onClick={handleExpand}
        style={{ transition: "var(--transition-base)" }}
        onMouseEnter={(e) => {
          if (!expanded)
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
        }}
        onMouseLeave={(e) => {
          if (!expanded) e.currentTarget.style.background = "transparent";
        }}
      >
        {direction === "outbound" ? (
          <>
            <span
              className="shrink-0 font-mono"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatRef(crossRef.from)}
            </span>
            <span className="shrink-0" style={{ color: "var(--text-dim)" }}>
              &rarr;
            </span>
            <span
              className="font-mono shrink-0"
              style={{ color: targetColor + "cc" }}
            >
              {formatRef(crossRef.to)}
            </span>
          </>
        ) : (
          <>
            <span
              className="font-mono shrink-0"
              style={{ color: targetColor + "cc" }}
            >
              {formatRef(crossRef.from)}
            </span>
            <span className="shrink-0" style={{ color: "var(--text-dim)" }}>
              &rarr;
            </span>
            <span
              className="shrink-0 font-mono"
              style={{ color: "var(--text-secondary)" }}
            >
              {formatRef(crossRef.to)}
            </span>
          </>
        )}
        <span
          className="ml-auto text-[9px] shrink-0 font-mono"
          style={{ color: "var(--text-dim)" }}
          title={`${crossRef.votes} community votes`}
        >
          {crossRef.votes > 0 ? `+${crossRef.votes}` : crossRef.votes}
        </span>
        <span
          className="text-[9px] font-mono"
          style={{ color: "var(--text-dim)", opacity: expanded ? 1 : 0.5 }}
        >
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 pt-1">
          {loading ? (
            <div
              className="font-mono text-[10px]"
              style={{ color: "var(--text-dim)" }}
            >
              Loading verse...
            </div>
          ) : verseText ? (
            <p
              className="font-serif text-[12px] leading-relaxed italic mb-2"
              style={{ color: "var(--text-primary)", opacity: 0.85 }}
            >
              &ldquo;{verseText}&rdquo;
            </p>
          ) : (
            <div
              className="font-mono text-[10px] mb-2"
              style={{ color: "var(--text-dim)" }}
            >
              Verse text unavailable
            </div>
          )}

          {/* Navigate button */}
          {parsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate();
              }}
              className="font-mono text-[10px] px-2 py-1 rounded three-state-interactive"
              style={{
                color: targetColor,
                border: `1px solid ${targetColor}30`,
                background: `${targetColor}08`,
              }}
            >
              Go to {formatRef(refStr)} &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
