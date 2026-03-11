"use client";

import { ACCENT } from "@/lib/colors";

interface Props {
  translation: string;
  onChange: (t: string) => void;
}

const TRANSLATIONS = [
  { id: "web", label: "WEB", desc: "World English Bible" },
  { id: "kjv", label: "KJV", desc: "King James Version" },
];

export default function TranslationSelector({ translation, onChange }: Props) {
  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="rounded-xl bg-[#070d1f]/90 backdrop-blur-md border border-white/5 p-3">
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
          Translation
        </div>
        <div className="flex gap-1">
          {TRANSLATIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                translation === t.id
                  ? "bg-white/10 text-white/90"
                  : "text-white/35 hover:text-white/60 hover:bg-white/5"
              }`}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
