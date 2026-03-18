"use client";

import { useState, useEffect, useMemo } from "react";
import { VerseCrossRef } from "@/lib/types";
import { bookMap } from "@/data/books";
import { edges } from "@/data/edges";
import { fetchVerseText, getBookName, getBibleGatewayUrl } from "@/lib/bible-api";
import { GENRE_COLORS, ACCENT } from "@/lib/colors";
import { getVerseCrossRefs, getInboundRefs } from "@/lib/crossref-utils";
import CrossRefItem from "./CrossRefItem";

interface Props {
  bookId: string;
  chapter: number;
  verse: number;
  crossRefs: VerseCrossRef[];
  translation: string;
  onNavigateTo: (bookId: string, chapter: number, verse: number) => void;
}

const REFS_PER_PAGE = 15;

export default function VerseView({
  bookId,
  chapter,
  verse,
  crossRefs,
  translation,
  onNavigateTo,
}: Props) {
  const book = bookMap.get(bookId);
  const bookName = getBookName(bookId);
  const genreColor = book ? GENRE_COLORS[book.genre] : "#888";

  // Verse text
  const [verseText, setVerseText] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(true);

  // Inbound refs
  const [inboundRefs, setInboundRefs] = useState<VerseCrossRef[]>([]);
  const [inboundLoading, setInboundLoading] = useState(false);
  const [showInbound, setShowInbound] = useState(false);

  // Pagination
  const [outboundPage, setOutboundPage] = useState(1);
  const [inboundPage, setInboundPage] = useState(1);

  // Outbound cross-refs for this specific verse
  const outboundRefs = useMemo(
    () => getVerseCrossRefs(crossRefs, chapter, verse),
    [crossRefs, chapter, verse]
  );

  // Load verse text
  useEffect(() => {
    setTextLoading(true);
    setVerseText(null);
    let cancelled = false;

    fetchVerseText(bookId, chapter, verse, translation).then((result) => {
      if (!cancelled) {
        setVerseText(result?.text || null);
        setTextLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bookId, chapter, verse, translation]);

  // Reset pagination when verse changes
  useEffect(() => {
    setOutboundPage(1);
    setInboundPage(1);
    setShowInbound(false);
    setInboundRefs([]);
  }, [bookId, chapter, verse]);

  // Load inbound refs when requested
  const handleShowInbound = async () => {
    if (showInbound) {
      setShowInbound(false);
      return;
    }
    setShowInbound(true);
    if (inboundRefs.length > 0) return;

    setInboundLoading(true);

    // Get connected book IDs from the book-level edges
    const connectedBookIds: string[] = [];
    edges.forEach((e) => {
      if (e.source === bookId) connectedBookIds.push(e.target);
      else if (e.target === bookId) connectedBookIds.push(e.source);
    });

    const refs = await getInboundRefs(bookId, chapter, verse, connectedBookIds);
    setInboundRefs(refs);
    setInboundLoading(false);
  };

  const pagedOutbound = outboundRefs.slice(0, outboundPage * REFS_PER_PAGE);
  const hasMoreOutbound = pagedOutbound.length < outboundRefs.length;

  const pagedInbound = inboundRefs.slice(0, inboundPage * REFS_PER_PAGE);
  const hasMoreInbound = pagedInbound.length < inboundRefs.length;

  const bgUrl = getBibleGatewayUrl(bookId, chapter, verse);

  return (
    <div>
      {/* Verse text */}
      <div
        className="rounded-lg p-4 mb-5"
        style={{
          background: genreColor + "08",
          border: `1px solid ${genreColor}15`,
        }}
      >
        {textLoading ? (
          <div
            className="font-mono text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            Loading verse...
          </div>
        ) : verseText ? (
          <>
            <p
              className="font-serif text-[15px] leading-relaxed italic mb-2"
              style={{ color: "var(--text-primary)", opacity: 0.9 }}
            >
              &ldquo;{verseText}&rdquo;
            </p>
            <p
              className="text-xs font-mono"
              style={{ color: genreColor + "aa" }}
            >
              {bookName} {chapter}:{verse}
            </p>
          </>
        ) : (
          <div
            className="font-mono text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            Verse text unavailable
          </div>
        )}
      </div>

      {/* Outbound cross-references */}
      <h3
        className="text-xs uppercase tracking-wider mb-2 font-mono"
        style={{ color: "var(--text-secondary)" }}
      >
        References from this verse ({outboundRefs.length})
      </h3>
      {outboundRefs.length === 0 ? (
        <p
          className="text-[11px] font-mono mb-4"
          style={{ color: "var(--text-dim)" }}
        >
          No outbound cross-references found
        </p>
      ) : (
        <div className="space-y-0.5 mb-4">
          {pagedOutbound.map((ref, i) => (
            <CrossRefItem
              key={`out-${ref.from}-${ref.to}-${i}`}
              crossRef={ref}
              direction="outbound"
              translation={translation}
              onNavigateTo={onNavigateTo}
            />
          ))}
          {hasMoreOutbound && (
            <button
              onClick={() => setOutboundPage((p) => p + 1)}
              className="w-full text-center text-[10px] py-2 font-mono"
              style={{
                color: "var(--text-dim)",
                transition: "var(--transition-base)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-dim)")
              }
            >
              Show more ({outboundRefs.length - pagedOutbound.length} remaining)
            </button>
          )}
        </div>
      )}

      {/* Inbound cross-references */}
      <button
        onClick={handleShowInbound}
        className="w-full flex items-center justify-between text-xs uppercase tracking-wider mb-2 font-mono"
        style={{
          color: "var(--text-secondary)",
          transition: "var(--transition-base)",
        }}
      >
        <span>
          References to this verse
          {inboundRefs.length > 0 ? ` (${inboundRefs.length})` : ""}
        </span>
        <span style={{ color: "var(--text-dim)" }}>
          {showInbound ? "▲" : "▼"}
        </span>
      </button>

      {showInbound && (
        <div className="mb-4">
          {inboundLoading ? (
            <div
              className="text-[10px] py-2 font-mono"
              style={{ color: "var(--text-dim)" }}
            >
              Searching for inbound references...
            </div>
          ) : inboundRefs.length === 0 ? (
            <p
              className="text-[11px] font-mono"
              style={{ color: "var(--text-dim)" }}
            >
              No inbound cross-references found
            </p>
          ) : (
            <div className="space-y-0.5">
              {pagedInbound.map((ref, i) => (
                <CrossRefItem
                  key={`in-${ref.from}-${ref.to}-${i}`}
                  crossRef={ref}
                  direction="inbound"
                  translation={translation}
                  onNavigateTo={onNavigateTo}
                />
              ))}
              {hasMoreInbound && (
                <button
                  onClick={() => setInboundPage((p) => p + 1)}
                  className="w-full text-center text-[10px] py-2 font-mono"
                  style={{
                    color: "var(--text-dim)",
                    transition: "var(--transition-base)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-secondary)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-dim)")
                  }
                >
                  Show more (
                  {inboundRefs.length - pagedInbound.length} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* BibleGateway link */}
      <a
        href={bgUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs font-mono three-state-interactive"
        style={{ color: ACCENT }}
      >
        Read on Bible Gateway &rarr;
      </a>
    </div>
  );
}
