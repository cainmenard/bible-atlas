"use client";

import { ChapterCrossRefSummary } from "@/lib/types";

interface Props {
  summaries: ChapterCrossRefSummary[];
  genreColor: string;
  onSelectChapter: (chapter: number) => void;
}

export default function ChapterGrid({
  summaries,
  genreColor,
  onSelectChapter,
}: Props) {
  if (summaries.length === 0) return null;

  // Find max ref count for heat map scaling
  const maxRefs = Math.max(...summaries.map((s) => s.totalRefs), 1);

  return (
    <div className="mb-6">
      <h3
        className="text-xs uppercase tracking-wider mb-3 font-mono"
        style={{ color: "var(--text-secondary)" }}
      >
        Chapters ({summaries.length})
      </h3>
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(38px, 1fr))",
        }}
      >
        {summaries.map((s) => {
          const intensity = s.totalRefs / maxRefs;
          // Map intensity to opacity range 0.08 - 0.7
          const bgAlpha = 0.08 + intensity * 0.62;
          // Parse genre color hex to rgb for rgba
          const r = parseInt(genreColor.slice(1, 3), 16);
          const g = parseInt(genreColor.slice(3, 5), 16);
          const b = parseInt(genreColor.slice(5, 7), 16);

          return (
            <button
              key={s.chapter}
              onClick={() => onSelectChapter(s.chapter)}
              className="relative rounded-[3px] font-mono text-[11px] leading-none"
              style={{
                background: `rgba(${r}, ${g}, ${b}, ${bgAlpha})`,
                color:
                  intensity > 0.4
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                padding: "8px 4px",
                textAlign: "center",
                transition: "var(--transition-base)",
                border: "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.transform = "scale(1)";
              }}
              title={`Chapter ${s.chapter}: ${s.totalRefs} cross-references`}
            >
              {s.chapter}
              {s.totalRefs > 0 && (
                <span
                  className="block text-[8px] mt-0.5"
                  style={{
                    color:
                      intensity > 0.3
                        ? "var(--text-secondary)"
                        : "var(--text-dim)",
                  }}
                >
                  {s.totalRefs}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p
        className="text-[9px] mt-2 font-mono"
        style={{ color: "var(--text-dim)" }}
      >
        Brightness indicates cross-reference density
      </p>
    </div>
  );
}
