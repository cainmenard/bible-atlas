"use client";

import { DailyReadingsData } from "@/lib/types";
import { LITURGICAL_COLORS } from "@/lib/colors";
import { useState } from "react";

interface Props {
  data: DailyReadingsData | null;
  onSelectBook: (id: string) => void;
}

export default function ReadingsCard({ data, onSelectBook }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (!data) return null;

  const seasonColor = LITURGICAL_COLORS[data.season];

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 left-4 z-40 px-4 py-3 rounded-lg text-xs
          glass-panel three-state-interactive font-mono"
        style={{ color: "var(--text-secondary)" }}
      >
        Today&apos;s Readings
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-72 rounded-xl glass-panel overflow-hidden">
      {/* Season accent bar */}
      <div className="h-1" style={{ background: seasonColor }} />

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs uppercase tracking-wider font-mono" style={{ color: "var(--text-secondary)" }}>
              Today&apos;s Readings
            </h3>
            <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-dim)" }}>{data.date}</p>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="three-state-interactive text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            &#x2715;
          </button>
        </div>

        <div className="space-y-2">
          {data.readings.map((r, i) => (
            <button
              key={i}
              onClick={() => r.bookId && onSelectBook(r.bookId)}
              className="w-full text-left flex items-baseline gap-3 px-3 py-2 rounded hover:bg-white/5 transition-all"
            >
              <span className="text-[10px] uppercase w-20 shrink-0 font-mono" style={{ color: "var(--text-dim)" }}>
                {r.type}
              </span>
              <span className="text-xs font-serif" style={{ color: "var(--text-primary)", opacity: 0.7 }}>{r.reference}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: seasonColor }}
          />
          <span className="text-[10px] capitalize font-mono" style={{ color: "var(--text-dim)" }}>
            {data.season} Time
          </span>
        </div>
      </div>
    </div>
  );
}
