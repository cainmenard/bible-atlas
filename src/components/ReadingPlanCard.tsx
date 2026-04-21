"use client";

import { useState } from "react";
import { getPreference } from "@/lib/preferences";
import { getMcheyneForDate, parseMcheyneRef, McheyneDay } from "@/data/mcheyne";
import { bookMap } from "@/data/books";

interface Props {
  onShowReadings: () => void;
  onNavigateTo: (bookId: string, chapter: number) => void;
}

const NOISE_SVG = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.04'/></svg>")`;

const STREAM_LABELS: Record<keyof McheyneDay, string> = {
  family:  'Family',
  secret:  'Secret',
  church1: 'Church',
  church2: 'Church',
};

const STREAMS: (keyof McheyneDay)[] = ['family', 'secret', 'church1', 'church2'];

export default function ReadingPlanCard({ onShowReadings, onNavigateTo }: Props) {
  const [lastBookId] = useState(() => getPreference<string>('last-book'));
  const [lastChapter] = useState(() => getPreference<number>('last-chapter'));
  const [hoveredPassage, setHoveredPassage] = useState<string | null>(null);

  const today = getMcheyneForDate(new Date());

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const mon = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const yr = now.getFullYear();
  const shortDate = `${day} ${mon} ${yr}`;

  const lastBook = lastBookId ? bookMap.get(lastBookId) : null;
  const isContinueMode = !!lastBook;

  const handlePassageClick = (ref: string) => {
    const parsed = parseMcheyneRef(ref);
    if (!parsed) return;
    onNavigateTo(parsed.bookId, parsed.chapter);
  };

  const continueLabel = lastBook
    ? `${lastBook.name}${lastChapter != null ? ` ${lastChapter}` : ''}`
    : '';

  return (
    <div
      className="readings-card"
      style={{
        width: 'min(300px, calc(100vw - 32px))',
        background: 'rgba(14, 14, 28, 0.88)',
        backgroundImage: NOISE_SVG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        borderLeft: '2px solid var(--color-accent)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Reading Plan
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            opacity: 0.75,
          }}
        >
          {shortDate}
        </span>
      </div>

      {/* Separator */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />

      {isContinueMode ? (
        // ── Continue mode ──
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Continue reading
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-primary)',
              }}
            >
              → {continueLabel}
            </span>
          </div>
          <button
            onClick={() => {
              if (!lastBookId) return;
              onNavigateTo(lastBookId, lastChapter ?? 1);
            }}
            style={{
              alignSelf: 'flex-start',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: 'var(--color-accent)',
              background: 'var(--color-accent-muted)',
              border: '1px solid var(--color-accent-border)',
              borderRadius: '9999px',
              padding: '6px 16px',
              cursor: 'pointer',
              transition: 'all 200ms ease-out',
              opacity: 0.85,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          >
            Start →
          </button>
        </div>
      ) : (
        // ── M'Cheyne mode ──
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STREAMS.map((key, i) => {
            const ref = today[key];
            const isHovered = hoveredPassage === key;
            return (
              <button
                key={key + i}
                onClick={() => handlePassageClick(ref)}
                onMouseEnter={() => setHoveredPassage(key)}
                onMouseLeave={() => setHoveredPassage(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 4px',
                  background: isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderRadius: '4px',
                  transition: 'background 150ms ease-out',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    width: '44px',
                    flexShrink: 0,
                    opacity: 0.7,
                  }}
                >
                  {STREAM_LABELS[key]}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '15px',
                    color: 'var(--color-text-primary)',
                    opacity: isHovered ? 1 : 0.9,
                    fontWeight: 500,
                    transition: 'opacity 150ms ease-out',
                  }}
                >
                  {ref}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Separator */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '12px 0 10px' }} />

      {/* Footer */}
      <button
        onClick={onShowReadings}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-secondary)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          letterSpacing: '0.06em',
          transition: 'color 200ms ease-out',
          textDecoration: 'underline',
          textDecorationColor: 'rgba(196, 184, 168, 0.3)',
          textUnderlineOffset: '3px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
      >
        Show today&apos;s readings
      </button>
    </div>
  );
}
