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
        className="fixed bottom-4 left-4 z-40 px-3 py-2 rounded-lg text-xs
          bg-[#070d1f]/90 backdrop-blur-md border border-white/5 text-white/50
          hover:text-white/80 transition-colors"
      >
        Today&apos;s Readings
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-72 rounded-xl bg-[#070d1f]/90 backdrop-blur-md border border-white/5 overflow-hidden">
      {/* Season accent bar */}
      <div className="h-1" style={{ background: seasonColor }} />

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xs text-white/50 uppercase tracking-wider">
              Today&apos;s Readings
            </h3>
            <p className="text-xs text-white/30 mt-1">{data.date}</p>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="text-white/30 hover:text-white/60 text-xs"
          >
            &#x2715;
          </button>
        </div>

        <div className="space-y-2">
          {data.readings.map((r, i) => (
            <button
              key={i}
              onClick={() => r.bookId && onSelectBook(r.bookId)}
              className="w-full text-left flex items-baseline gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors"
            >
              <span className="text-[10px] text-white/30 uppercase w-20 shrink-0">
                {r.type}
              </span>
              <span className="text-xs text-white/60">{r.reference}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: seasonColor }}
          />
          <span className="text-[10px] text-white/25 capitalize">
            {data.season} Time
          </span>
        </div>
      </div>
    </div>
  );
}
