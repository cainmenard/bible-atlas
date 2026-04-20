"use client";

import { useEffect, useRef, useState } from "react";
import { BibleBook, Canon, DailyReading } from "@/lib/types";
import { books } from "@/data/books";
import bookEdges from "@/data/book-edges.json";
import { bookPairNotes } from "@/data/book-pair-notes";

export type TooltipFilterMode = "none" | "readings" | "canon";

export interface TooltipContext {
  selectedBook: string | null;
  filterMode: TooltipFilterMode;
  todayReadings: DailyReading[] | null;
  canon: Canon;
}

interface Props {
  book: BibleBook | null;
  x: number;
  y: number;
  context: TooltipContext;
}

const CANON_LABELS: Record<Canon, string> = {
  catholic: "Catholic",
  protestant: "Protestant",
  orthodox: "Orthodox",
  ethiopian: "Ethiopian",
};

const TESTAMENT_LABELS: Record<BibleBook["testament"], string> = {
  OT: "Old Testament",
  NT: "New Testament",
  DC: "Deuterocanonical",
};

const BOOK_INDEX = new Map(books.map((b, i) => [b.id, i]));

function crossRefCountBetween(aId: string, bId: string): number {
  let total = 0;
  for (const e of bookEdges) {
    if (
      (e.source === aId && e.target === bId) ||
      (e.source === bId && e.target === aId)
    ) {
      total += e.count;
    }
  }
  return total;
}

function pairNoteKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function directionalRefCounts(bookId: string): {
  referencedByLater: number;
  referencesEarlier: number;
} {
  const idx = BOOK_INDEX.get(bookId);
  if (idx === undefined) return { referencedByLater: 0, referencesEarlier: 0 };
  let referencedByLater = 0;
  let referencesEarlier = 0;
  for (const e of bookEdges) {
    if (e.target === bookId) {
      const sourceIdx = BOOK_INDEX.get(e.source);
      if (sourceIdx !== undefined && sourceIdx > idx) {
        referencedByLater += e.count;
      }
    }
    if (e.source === bookId) {
      const targetIdx = BOOK_INDEX.get(e.target);
      if (targetIdx !== undefined && targetIdx < idx) {
        referencesEarlier += e.count;
      }
    }
  }
  return { referencedByLater, referencesEarlier };
}

function formatTestament(t: BibleBook["testament"]): string {
  return TESTAMENT_LABELS[t];
}

function pickVariant(
  book: BibleBook,
  ctx: TooltipContext
): "A" | "B" | "C" | "D" {
  if (ctx.selectedBook && ctx.selectedBook !== book.id) return "A";
  if (
    ctx.filterMode === "readings" &&
    ctx.todayReadings &&
    ctx.todayReadings.some((r) => r.bookId === book.id)
  ) {
    return "B";
  }
  if (ctx.filterMode === "canon") return "D";
  return "C";
}

export default function Tooltip({ book, x, y, context }: Props) {
  const [visible, setVisible] = useState(false);
  const [displayBook, setDisplayBook] = useState<BibleBook | null>(null);
  const [displayCtx, setDisplayCtx] = useState<TooltipContext>(context);
  const [displayPos, setDisplayPos] = useState({ x: 0, y: 0 });
  const [tipSize, setTipSize] = useState({ w: 240, h: 96 });
  const tipRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);

  // 150ms hover-to-appear, immediate dismiss on leave.
  useEffect(() => {
    if (!book) {
      setVisible(false);
      visibleRef.current = false;
      return;
    }
    if (visibleRef.current) {
      // already showing — swap content immediately
      setDisplayBook(book);
      setDisplayCtx(context);
      setDisplayPos({ x, y });
      return;
    }
    const timer = setTimeout(() => {
      setDisplayBook(book);
      setDisplayCtx(context);
      setDisplayPos({ x, y });
      setVisible(true);
      visibleRef.current = true;
    }, 150);
    return () => clearTimeout(timer);
    // position-only updates while waiting are rare; intentionally not re-running on x/y alone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id, context.selectedBook, context.filterMode]);

  // Track position updates while visible without resetting the timer.
  useEffect(() => {
    if (visibleRef.current && book) {
      setDisplayPos({ x, y });
    }
  }, [x, y, book]);

  // Measure rendered tooltip after content changes so we can clamp it against
  // the viewport accurately.
  useEffect(() => {
    if (!tipRef.current) return;
    const rect = tipRef.current.getBoundingClientRect();
    if (rect.width && rect.height) {
      setTipSize({ w: rect.width, h: rect.height });
    }
  }, [displayBook, displayCtx]);

  if (!displayBook) return null;

  const MARGIN = 16;
  const OFFSET = 12;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const left = Math.max(
    MARGIN,
    Math.min(displayPos.x + OFFSET, vw - tipSize.w - MARGIN)
  );
  const top = Math.max(
    MARGIN,
    Math.min(displayPos.y + OFFSET, vh - tipSize.h - MARGIN)
  );

  const variant = pickVariant(displayBook, displayCtx);

  return (
    <div
      ref={tipRef}
      role="tooltip"
      aria-live="polite"
      className="tooltip glass-panel"
      style={{
        left,
        top,
        opacity: visible ? 1 : 0,
        transition: visible
          ? "opacity 200ms ease-out"
          : "opacity 100ms ease-out",
      }}
    >
      <TooltipBody variant={variant} book={displayBook} ctx={displayCtx} />
    </div>
  );
}

function TooltipBody({
  variant,
  book,
  ctx,
}: {
  variant: "A" | "B" | "C" | "D";
  book: BibleBook;
  ctx: TooltipContext;
}) {
  const title = (
    <div
      style={{
        fontFamily: "var(--font-serif)",
        fontSize: 16,
        lineHeight: 1.25,
        color: "var(--text-primary)",
        marginBottom: 6,
      }}
    >
      {book.name}
    </div>
  );

  if (variant === "A" && ctx.selectedBook) {
    const selected = books.find((b) => b.id === ctx.selectedBook);
    const selectedName = selected?.name ?? ctx.selectedBook;
    const count = selected ? crossRefCountBetween(book.id, selected.id) : 0;
    const noteKey = selected ? pairNoteKey(book.name, selected.name) : "";
    const note = bookPairNotes[noteKey];
    const fallback = `Shared references across ${book.chapters} chapters.`;
    return (
      <>
        {title}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          {count.toLocaleString()} cross-references to {selectedName}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 12,
            lineHeight: 1.45,
            color: "var(--text-dim)",
          }}
        >
          {note ?? fallback}
        </div>
      </>
    );
  }

  if (variant === "B" && ctx.todayReadings) {
    const reading = ctx.todayReadings.find((r) => r.bookId === book.id);
    if (reading) {
      return (
        <>
          {title}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-secondary)",
            }}
          >
            Contains today&rsquo;s {reading.type}, {reading.reference}.
          </div>
        </>
      );
    }
  }

  if (variant === "D") {
    const bookCanonLabels = book.canons.map((c) => CANON_LABELS[c]);
    const intersection = book.canons.includes(ctx.canon)
      ? [CANON_LABELS[ctx.canon]]
      : [];
    const canonText =
      intersection.length > 0
        ? intersection.join(", ")
        : `not in ${CANON_LABELS[ctx.canon]} (in ${bookCanonLabels.join(", ")})`;
    return (
      <>
        {title}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          {book.genre} &middot; {formatTestament(book.testament)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-dim)",
          }}
        >
          In your canon: {canonText}.
        </div>
      </>
    );
  }

  // Variant C (default)
  const { referencedByLater, referencesEarlier } = directionalRefCounts(book.id);
  const primaryIsReferencedBy = referencedByLater >= referencesEarlier;
  const refLine = primaryIsReferencedBy
    ? `Referenced ${referencedByLater.toLocaleString()} times by later books`
    : `References ${referencesEarlier.toLocaleString()} earlier books`;
  return (
    <>
      {title}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-secondary)",
          marginBottom: 6,
        }}
      >
        {book.genre} &middot; {formatTestament(book.testament)} &middot;{" "}
        {book.chapters} chapters
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-dim)",
        }}
      >
        {refLine}
      </div>
    </>
  );
}
