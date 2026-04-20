"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPassageText, parseReadingReference } from "@/lib/bible-api";
import { getDailyReadings } from "@/lib/readings";
import { buildVerseIndex, getReferencesForVerse } from "@/lib/verse-index";
import VerseMarginDot from "@/components/VerseMarginDot";

interface VerseReaderProps {
  book: string;
  chapter: number;
  translation: string;
}

type Status = "loading" | "ready" | "error";

interface VerseLine {
  verse: number;
  text: string;
}

const TRANSLATION_LABELS: Record<string, string> = {
  "rsv-ce": "RSV-CE",
  "kjv": "KJV",
  "jb": "JB",
  "web": "WEB",
};

function translationLabel(code: string): string {
  return TRANSLATION_LABELS[code.toLowerCase()] ?? code.toUpperCase();
}

function todayReadingTypeFor(bookName: string, chapter: number): string | null {
  const today = getDailyReadings();
  const target = bookName.toLowerCase();
  for (const r of today.readings) {
    const parsed = parseReadingReference(r.reference);
    if (!parsed) continue;
    if (parsed.bookName.toLowerCase() === target && parsed.chapter === chapter) {
      return r.type;
    }
  }
  return null;
}

export default function VerseReader({ book, chapter, translation }: VerseReaderProps) {
  const requestKey = `${book}|${chapter}|${translation}`;
  const [lastKey, setLastKey] = useState(requestKey);
  const [status, setStatus] = useState<Status>("loading");
  const [verses, setVerses] = useState<VerseLine[]>([]);
  const [xrefCounts, setXrefCounts] = useState<Map<number, number>>(new Map());
  const anchorRef = useRef<HTMLElement>(null);

  if (lastKey !== requestKey) {
    setLastKey(requestKey);
    setStatus("loading");
    setVerses([]);
    setXrefCounts(new Map());
  }

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [book, chapter]);

  useEffect(() => {
    let cancelled = false;
    const ref = `${book} ${chapter}`;

    fetchPassageText(ref, translation)
      .then((result) => {
        if (cancelled) return;
        if (result && result.verses.length > 0) {
          setVerses(result.verses);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [book, chapter, translation]);

  useEffect(() => {
    if (verses.length === 0) return;
    let cancelled = false;
    buildVerseIndex()
      .then(() => {
        if (cancelled) return;
        const counts = new Map<number, number>();
        for (const v of verses) {
          const refs = getReferencesForVerse(book, chapter, v.verse);
          if (refs.length > 0) counts.set(v.verse, refs.length);
        }
        setXrefCounts(counts);
      })
      .catch(() => {
        // Index failures are non-fatal — the reader still shows verses.
      });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, verses]);

  const readingType = todayReadingTypeFor(book, chapter);
  const bylineParts = [`${book} ${chapter}`, translationLabel(translation)];
  if (readingType) bylineParts.push(`From today's ${readingType}`);
  const byline = bylineParts.join(" · ");

  return (
    <section
      ref={anchorRef}
      id="verse-reader-anchor"
      role="region"
      aria-label={`${book} chapter ${chapter}`}
      className="verse-reader"
    >
      <style>{`
        .verse-reader {
          margin-top: var(--space-xl);
          padding-top: var(--space-lg);
          border-top: 1px solid var(--glass-border);
        }

        .verse-reader-body {
          font-family: var(--font-display);
          font-size: 18px;
          line-height: 1.6;
          color: var(--color-text-primary);
          max-width: 60ch;
          margin: 0;
          font-weight: 400;
        }

        .verse-num {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
          margin-right: 0.35em;
          margin-left: 0.25em;
          vertical-align: super;
          line-height: 0;
          transition: color var(--transition-fast);
        }

        .verse-num:first-child {
          margin-left: 0;
        }

        .verse-num[data-has-xref]:hover {
          color: var(--accent);
        }

        /* Uniform horizontal slot keeps text flow stable whether a dot
           renders or not, and regardless of when the index resolves. */
        .verse-margin-dot,
        .verse-margin-dot-slot {
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 4px;
          vertical-align: middle;
          border-radius: 50%;
        }

        .verse-margin-dot-slot {
          visibility: hidden;
        }

        .verse-margin-dot {
          background: var(--accent);
          opacity: 0.6;
          cursor: pointer;
          transition: opacity 200ms ease-out;
          animation: verse-dot-fade-in 200ms ease-out both;
        }

        .verse-margin-dot:hover,
        .verse-margin-dot:focus-visible {
          opacity: 1;
          outline: none;
        }

        @keyframes verse-dot-fade-in {
          from { opacity: 0; }
          to   { opacity: 0.6; }
        }

        @media (prefers-reduced-motion: reduce) {
          .verse-margin-dot {
            animation: none;
          }
        }

        .verse-reader-byline {
          margin-top: var(--space-lg);
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 0.02em;
        }

        .verse-reader-error {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.6;
        }

        .verse-reader-skeleton {
          max-width: 60ch;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .verse-reader-skeleton-bar {
          height: 18px;
          background: var(--text-dim);
          border-radius: 3px;
          opacity: 0.3;
          animation: reader-pulse 1.6s ease-in-out infinite;
        }

        @keyframes reader-pulse {
          0%, 100% { opacity: 0.18; }
          50% { opacity: 0.38; }
        }

        @media (prefers-reduced-motion: reduce) {
          .verse-reader-skeleton-bar {
            animation: none;
            opacity: 0.28;
          }
        }
      `}</style>

      {status === "loading" && (
        <div className="verse-reader-skeleton" aria-hidden="true">
          <div className="verse-reader-skeleton-bar" style={{ width: "90%" }} />
          <div className="verse-reader-skeleton-bar" style={{ width: "96%" }} />
          <div className="verse-reader-skeleton-bar" style={{ width: "74%" }} />
        </div>
      )}

      {status === "error" && (
        <p className="verse-reader-error">
          Unable to load {book} {chapter}. Try another translation.
        </p>
      )}

      {status === "ready" && (
        <>
          <p className="verse-reader-body">
            {verses.map((v, i) => {
              const count = xrefCounts.get(v.verse) ?? 0;
              const hasXref = count > 0;
              return (
                <span key={v.verse}>
                  <sup
                    className="verse-num"
                    {...(hasXref ? { "data-has-xref": String(count) } : {})}
                    aria-label={`Verse ${v.verse}`}
                  >
                    {hasXref ? (
                      <VerseMarginDot
                        book={book}
                        chapter={chapter}
                        verse={v.verse}
                        count={count}
                      />
                    ) : (
                      <span className="verse-margin-dot-slot" aria-hidden="true" />
                    )}
                    {v.verse}
                  </sup>
                  {v.text}
                  {i < verses.length - 1 ? " " : ""}
                </span>
              );
            })}
          </p>
          <footer className="verse-reader-byline">{byline}</footer>
        </>
      )}
    </section>
  );
}
