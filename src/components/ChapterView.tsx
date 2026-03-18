"use client";

import { useMemo } from "react";
import { VerseCrossRef } from "@/lib/types";
import { bookMap } from "@/data/books";
import { CHAPTER_VERSES } from "@/data/chapter-verses";
import { getVerseCrossRefs, getVerseRefCounts, getTargetBookCounts } from "@/lib/crossref-utils";
import { GENRE_COLORS } from "@/lib/colors";

interface Props {
  bookId: string;
  chapter: number;
  crossRefs: VerseCrossRef[];
  genreColor: string;
  onSelectVerse: (verse: number) => void;
  onSelectBook: (bookId: string) => void;
}

export default function ChapterView({
  bookId,
  chapter,
  crossRefs,
  genreColor,
  onSelectVerse,
  onSelectBook,
}: Props) {
  const verseCount = CHAPTER_VERSES[bookId]?.[chapter - 1] ?? 0;

  // Cross-refs from this chapter
  const chapterRefs = useMemo(
    () => getVerseCrossRefs(crossRefs, chapter),
    [crossRefs, chapter]
  );

  // Per-verse outbound ref counts
  const verseRefCounts = useMemo(
    () => getVerseRefCounts(crossRefs, chapter),
    [crossRefs, chapter]
  );

  // Target book counts for this chapter
  const targetBooks = useMemo(
    () => getTargetBookCounts(chapterRefs),
    [chapterRefs]
  );

  const maxVerseRefs = Math.max(...Array.from(verseRefCounts.values()), 1);

  return (
    <div>
      {/* Chapter stats */}
      <div className="flex gap-6 mb-5 text-xs">
        <div className="text-center">
          <div
            className="font-semibold text-lg font-mono"
            style={{ color: "var(--text-primary)" }}
          >
            {verseCount}
          </div>
          <div className="font-mono" style={{ color: "var(--text-dim)" }}>
            Verses
          </div>
        </div>
        <div className="text-center">
          <div
            className="font-semibold text-lg font-mono"
            style={{ color: "var(--text-primary)" }}
          >
            {chapterRefs.length.toLocaleString()}
          </div>
          <div className="font-mono" style={{ color: "var(--text-dim)" }}>
            Cross-refs
          </div>
        </div>
        <div className="text-center">
          <div
            className="font-semibold text-lg font-mono"
            style={{ color: "var(--text-primary)" }}
          >
            {targetBooks.length}
          </div>
          <div className="font-mono" style={{ color: "var(--text-dim)" }}>
            Books linked
          </div>
        </div>
      </div>

      {/* Verse list */}
      <h3
        className="text-xs uppercase tracking-wider mb-2 font-mono"
        style={{ color: "var(--text-secondary)" }}
      >
        Verses
      </h3>
      <div className="space-y-0 mb-5">
        {Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => {
          const refCount = verseRefCounts.get(v) || 0;
          const intensity = refCount / maxVerseRefs;

          return (
            <button
              key={v}
              onClick={() => onSelectVerse(v)}
              className="w-full flex items-center gap-3 px-3 py-[6px] rounded-[3px] text-left"
              style={{ transition: "var(--transition-base)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                className="font-mono text-[11px] w-6 text-right shrink-0"
                style={{
                  color:
                    refCount > 0
                      ? "var(--text-primary)"
                      : "var(--text-dim)",
                  opacity: refCount > 0 ? 0.9 : 0.5,
                }}
              >
                {v}
              </span>

              {/* Ref density bar */}
              <div
                className="flex-1 h-[3px] rounded-full overflow-hidden"
                style={{ background: "rgba(255, 255, 255, 0.04)" }}
              >
                {refCount > 0 && (
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(intensity * 100, 4)}%`,
                      background: genreColor,
                      opacity: 0.3 + intensity * 0.5,
                    }}
                  />
                )}
              </div>

              {refCount > 0 && (
                <span
                  className="font-mono text-[9px] shrink-0"
                  style={{ color: "var(--text-dim)" }}
                >
                  {refCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Connected books from this chapter */}
      {targetBooks.length > 0 && (
        <>
          <h3
            className="text-xs uppercase tracking-wider mb-2 font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            Connected Books ({targetBooks.length})
          </h3>
          <div className="space-y-0.5 mb-4">
            {targetBooks.slice(0, 10).map(({ bookId: targetId, count }) => {
              const target = bookMap.get(targetId);
              if (!target) return null;
              const color = GENRE_COLORS[target.genre];
              return (
                <button
                  key={targetId}
                  onClick={() => onSelectBook(targetId)}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-[3px] text-left"
                  style={{ transition: "var(--transition-base)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.04)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                  <span
                    className="text-sm flex-1 font-serif"
                    style={{ color: "var(--text-primary)", opacity: 0.85 }}
                  >
                    {target.name}
                  </span>
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {count} refs
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
