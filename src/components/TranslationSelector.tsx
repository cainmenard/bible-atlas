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
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.06em",
      }}
    >
      {TRANSLATIONS.map((t, i) => {
        const isActive = translation === t.id;
        const isHovered = hovered === t.id;
        return (
          <span key={t.id} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: "1px",
                  height: "11px",
                  background: "var(--glass-border)",
                  margin: "0 9px",
                  flexShrink: 0,
                }}
              />
            )}
            <button
              onClick={() => onChange(t.id)}
              title={t.desc}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: "none",
                border: "none",
                padding: "6px 0",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                letterSpacing: "0.06em",
                lineHeight: 1,
                color: isActive ? "var(--accent)" : "var(--text-primary)",
                opacity: isActive ? 1 : isHovered ? 0.75 : 0.45,
                transition: "var(--transition-base)",
              }}
            >
              {t.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
