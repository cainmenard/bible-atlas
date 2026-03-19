"use client";

import { useState } from "react";

interface Props {
  translation: string;
  onChange: (t: string) => void;
}

const TRANSLATIONS = [
  { id: "rsv-ce", label: "RSV-CE", desc: "Revised Standard Version Catholic Edition" },
  { id: "jb",     label: "JB",     desc: "Jerusalem Bible" },
  { id: "kjv",    label: "KJV",    desc: "King James Version" },
];

export default function TranslationSelector({ translation, onChange }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        letterSpacing: "0.06em",
        background: "var(--color-surface-1)",
        borderRadius: "9999px",
        padding: "2px",
      }}
    >
      {TRANSLATIONS.map((t) => {
        const isActive = translation === t.id;
        const isHovered = hovered === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            title={t.desc}
            onMouseEnter={() => setHovered(t.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.06em",
              lineHeight: 1,
              padding: "6px 12px",
              borderRadius: "9999px",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              border: isActive
                ? "1px solid var(--color-accent)"
                : "1px solid transparent",
              background: isActive
                ? "var(--color-accent-muted)"
                : isHovered
                  ? "var(--color-surface-3)"
                  : "transparent",
              color: isActive
                ? "var(--color-accent)"
                : isHovered
                  ? "var(--color-text-primary)"
                  : "var(--color-text-muted)",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
