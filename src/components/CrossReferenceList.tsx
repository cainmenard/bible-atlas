"use client";

import {
  useRef,
  useMemo,
  useDeferredValue,
  useCallback,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import CrossReferenceItem from "./CrossReferenceItem";
import { books } from "@/data/books";

interface CrossReferenceListProps {
  references: Array<{
    targetBook: string;
    targetChapter: number;
    targetVerseStart: number;
    targetVerseEnd?: number;
    verseText?: string;
    votes?: number;
  }>;
  groupBy?: "book" | "testament" | "none";
  onNavigate: (book: string, chapter: number, verse: number) => void;
  maxHeight?: string;
}

type FlatItem =
  | { type: "header"; label: string; count: number }
  | {
      type: "item";
      reference: CrossReferenceListProps["references"][number];
    };

const testamentLabels: Record<string, string> = {
  OT: "Old Testament",
  NT: "New Testament",
  DC: "Deuterocanonical",
};

function getTestamentForBook(bookName: string): string {
  const found = books.find((b) => b.name === bookName);
  return found
    ? testamentLabels[found.testament] || found.testament
    : "Other";
}

function buildFlatList(
  references: CrossReferenceListProps["references"],
  groupBy: "book" | "testament" | "none"
): FlatItem[] {
  const sorted = [...references].sort((a, b) => {
    const bookCmp = a.targetBook.localeCompare(b.targetBook);
    if (bookCmp !== 0) return bookCmp;
    const chapterCmp = a.targetChapter - b.targetChapter;
    if (chapterCmp !== 0) return chapterCmp;
    return a.targetVerseStart - b.targetVerseStart;
  });

  if (groupBy === "none") {
    return sorted.map((ref) => ({ type: "item", reference: ref }));
  }

  const groups = new Map<string, typeof sorted>();

  for (const ref of sorted) {
    const key =
      groupBy === "testament"
        ? getTestamentForBook(ref.targetBook)
        : ref.targetBook;
    const list = groups.get(key);
    if (list) {
      list.push(ref);
    } else {
      groups.set(key, [ref]);
    }
  }

  const items: FlatItem[] = [];
  for (const [label, refs] of groups) {
    items.push({ type: "header", label, count: refs.length });
    for (const ref of refs) {
      items.push({ type: "item", reference: ref });
    }
  }

  return items;
}

const headerStyle: React.CSSProperties = {
  background: "var(--color-surface-1)",
  fontFamily: "var(--font-display)",
  fontSize: "var(--text-sm)",
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "var(--space-sm) var(--space-lg)",
  display: "flex",
  alignItems: "baseline",
  gap: "var(--space-sm)",
  borderBottom: "1px solid var(--glass-border)",
  boxSizing: "border-box",
};

const headerCountStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  fontFamily: "var(--font-mono)",
  opacity: 0.7,
};

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={headerStyle}>
      <span>{label}</span>
      <span style={headerCountStyle}>
        ({count} reference{count !== 1 ? "s" : ""})
      </span>
    </div>
  );
}

function findActiveHeader(
  flatItems: FlatItem[],
  scrollTop: number,
  headerOffsets: Map<number, number>
): { label: string; count: number } | null {
  let lastHeader: { label: string; count: number } | null = null;
  for (let i = 0; i < flatItems.length; i++) {
    const item = flatItems[i];
    if (item.type !== "header") continue;
    const offset = headerOffsets.get(i) ?? 0;
    if (offset <= scrollTop) {
      lastHeader = { label: item.label, count: item.count };
    } else {
      break;
    }
  }
  return lastHeader;
}

export default function CrossReferenceList({
  references,
  groupBy = "book",
  onNavigate,
  maxHeight = "calc(100vh - 350px)",
}: CrossReferenceListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const deferredRefs = useDeferredValue(references);
  const [pinnedHeader, setPinnedHeader] = useState<{
    label: string;
    count: number;
  } | null>(null);

  const flatItems = useMemo(
    () => buildFlatList(deferredRefs, groupBy),
    [deferredRefs, groupBy]
  );

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (flatItems[index].type === "header" ? 40 : 72),
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  });

  // Pre-compute header indices for offset lookup
  const headerIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < flatItems.length; i++) {
      if (flatItems[i].type === "header") indices.push(i);
    }
    return indices;
  }, [flatItems]);

  const handleScroll = useCallback(() => {
    if (groupBy === "none") return;
    const el = scrollRef.current;
    if (!el) return;

    // Build offset map from virtualizer measurement cache
    const headerOffsets = new Map<number, number>();
    const cache = virtualizer.measurementsCache;
    for (const idx of headerIndices) {
      headerOffsets.set(idx, cache[idx]?.start ?? 0);
    }

    const header = findActiveHeader(flatItems, el.scrollTop, headerOffsets);
    setPinnedHeader(header);
  }, [flatItems, groupBy, virtualizer, headerIndices]);

  const handleNavigate = useCallback(
    (book: string, chapter: number, verse: number) => {
      onNavigate(book, chapter, verse);
    },
    [onNavigate]
  );

  if (references.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-2xl) var(--space-lg)",
          gap: "var(--space-md)",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-disabled)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="12" y1="6" x2="12" y2="13" />
          <line x1="8.5" y1="9.5" x2="15.5" y2="9.5" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-muted)",
          }}
        >
          No cross-references found
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Total count header */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
          padding: "var(--space-md) var(--space-lg)",
        }}
      >
        {references.length} cross-reference
        {references.length !== 1 ? "s" : ""}
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="crossref-list-scroll"
        onScroll={handleScroll}
        style={{
          maxHeight,
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Pinned sticky header */}
        {pinnedHeader && groupBy !== "none" && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
            }}
          >
            <GroupHeader
              label={pinnedHeader.label}
              count={pinnedHeader.count}
            />
          </div>
        )}

        {/* Virtual list content */}
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = flatItems[virtualRow.index];

            return (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.type === "header" ? (
                  <GroupHeader label={item.label} count={item.count} />
                ) : (
                  <CrossReferenceItem
                    reference={item.reference}
                    onNavigate={handleNavigate}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .crossref-list-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .crossref-list-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .crossref-list-scroll::-webkit-scrollbar-thumb {
          background: var(--color-surface-3);
          border-radius: 3px;
        }
        .crossref-list-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--color-surface-4);
        }
      `}</style>
    </div>
  );
}
