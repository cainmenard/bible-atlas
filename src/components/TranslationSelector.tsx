"use client";

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
    <div className="glass-panel rounded-xl px-4 py-3">
      <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider mb-2 font-mono">
        Translation
      </div>
      <div className="flex gap-2">
        {TRANSLATIONS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`px-3 py-2 rounded-md text-[11px] transition-all font-mono ${
              translation === t.id
                ? "bg-white/10 text-[var(--accent)] opacity-100"
                : "text-[var(--text-secondary)] opacity-[var(--opacity-rest)] hover:opacity-[var(--opacity-hover)]"
            }`}
            title={t.desc}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
