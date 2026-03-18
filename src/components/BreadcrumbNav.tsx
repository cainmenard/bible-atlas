"use client";

import { NavigationEntry } from "@/lib/types";
import { getBookName } from "@/lib/bible-api";

interface Props {
  bookId: string;
  chapter: number | null;
  verse: number | null;
  navigationStack: NavigationEntry[];
  onNavigateBack: (entry: NavigationEntry | null) => void;
  onGoToBook: () => void;
  onGoToChapter: () => void;
}

export default function BreadcrumbNav({
  bookId,
  chapter,
  verse,
  navigationStack,
  onNavigateBack,
  onGoToBook,
  onGoToChapter,
}: Props) {
  const bookName = getBookName(bookId);

  return (
    <div className="flex items-center gap-1 flex-wrap mb-4">
      {/* Navigation stack history (show last 3) */}
      {navigationStack.length > 0 && (
        <>
          {navigationStack.slice(-3).map((entry, i) => (
            <span key={i} className="flex items-center gap-1">
              <button
                onClick={() => onNavigateBack(entry)}
                className="font-mono text-[10px] three-state-interactive"
                style={{ color: "var(--text-dim)" }}
              >
                {entry.label}
              </button>
              <span
                className="font-mono text-[10px]"
                style={{ color: "var(--text-dim)", opacity: 0.5 }}
              >
                &rsaquo;
              </span>
            </span>
          ))}
        </>
      )}

      {/* Current book */}
      {chapter !== null ? (
        <button
          onClick={onGoToBook}
          className="font-mono text-[10px] three-state-interactive"
          style={{ color: "var(--accent)" }}
        >
          {bookName}
        </button>
      ) : (
        <span
          className="font-mono text-[10px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {bookName}
        </span>
      )}

      {/* Chapter breadcrumb */}
      {chapter !== null && (
        <>
          <span
            className="font-mono text-[10px]"
            style={{ color: "var(--text-dim)", opacity: 0.5 }}
          >
            &rsaquo;
          </span>
          {verse !== null ? (
            <button
              onClick={onGoToChapter}
              className="font-mono text-[10px] three-state-interactive"
              style={{ color: "var(--accent)" }}
            >
              Ch. {chapter}
            </button>
          ) : (
            <span
              className="font-mono text-[10px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Ch. {chapter}
            </span>
          )}
        </>
      )}

      {/* Verse breadcrumb */}
      {verse !== null && (
        <>
          <span
            className="font-mono text-[10px]"
            style={{ color: "var(--text-dim)", opacity: 0.5 }}
          >
            &rsaquo;
          </span>
          <span
            className="font-mono text-[10px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            v. {verse}
          </span>
        </>
      )}
    </div>
  );
}
