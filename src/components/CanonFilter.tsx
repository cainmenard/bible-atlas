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
    <div className="glass-panel rounded-xl px-4 py-3">
      <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-2 font-mono">
        Canon
      </div>
      <div className="flex gap-2">
        {(Object.keys(CANON_LABELS) as Canon[]).map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`px-3 py-2 rounded-md text-[11px] transition-all font-mono ${
              canon === c
                ? "bg-white/10 text-[var(--accent)] opacity-100"
                : "text-[var(--text-secondary)] opacity-[var(--opacity-rest)] hover:opacity-[var(--opacity-hover)]"
            }`}
          >
            {CANON_LABELS[c].label}
          </button>
        ))}
      </div>
      <div className="text-[10px] text-[var(--text-dim)] mt-2 font-mono">
        {count} books
      </div>
    </div>
  );
}
