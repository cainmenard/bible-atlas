"use client";

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
      {TRANSLATIONS.map((t, i) => (
        <span key={t.id} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 && (
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: "1px",
                height: "11px",
                background: "rgba(255,255,255,0.15)",
                margin: "0 9px",
                flexShrink: 0,
              }}
            />
          )}
          <button
            onClick={() => onChange(t.id)}
            title={t.desc}
            style={{
              background: "none",
              border: "none",
              padding: "6px 0",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.06em",
              lineHeight: 1,
              color: translation === t.id ? "var(--accent)" : "var(--text-primary)",
              opacity: translation === t.id ? 1 : 0.65,
              transition: "var(--transition-base)",
            }}
            onMouseEnter={(e) => {
              if (translation !== t.id) {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
              }
            }}
            onMouseLeave={(e) => {
              if (translation !== t.id) {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.65";
              }
            }}
          >
            {t.label}
          </button>
        </span>
      ))}
    </div>
  );
}
