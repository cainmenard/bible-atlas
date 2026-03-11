"use client";

import { Canon } from "@/lib/types";
import { books } from "@/data/books";

interface Props {
  canon: Canon;
  onChange: (canon: Canon) => void;
}

const CANON_LABELS: Record<Canon, { label: string; desc: string }> = {
  catholic: { label: "Catholic", desc: "73 books" },
  protestant: { label: "Protestant", desc: "66 books" },
  orthodox: { label: "Orthodox", desc: "76 books" },
  ethiopian: { label: "Ethiopian", desc: "81 books" },
};

export default function CanonFilter({ canon, onChange }: Props) {
  const count = books.filter((b) => b.canons.includes(canon)).length;

  return (
    <div className="fixed top-4 left-4 z-40">
      <div className="rounded-xl bg-[#070d1f]/90 backdrop-blur-md border border-white/5 p-3">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
          Canon
        </div>
        <div className="flex gap-1">
          {(Object.keys(CANON_LABELS) as Canon[]).map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                canon === c
                  ? "bg-white/10 text-white/90"
                  : "text-white/35 hover:text-white/60 hover:bg-white/5"
              }`}
            >
              {CANON_LABELS[c].label}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-white/20 mt-2">
          Viewing: {CANON_LABELS[canon].label} Canon — {count} books
        </div>
      </div>
    </div>
  );
}
