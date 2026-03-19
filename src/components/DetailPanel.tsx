"use client";

import { useState, useEffect, useMemo } from "react";
import { bookMap } from "@/data/books";
import { edges } from "@/data/edges";
import { GENRE_COLORS, ACCENT } from "@/lib/colors";
import { BibleBook, Canon, VerseCrossRef, NavigationEntry } from "@/lib/types";
import { BIBLE_API_NAMES, getBookName } from "@/lib/bible-api";
import { getChapterSummaries } from "@/lib/crossref-utils";
import BreadcrumbNav from "./BreadcrumbNav";
import ChapterGrid from "./ChapterGrid";
import ChapterView from "./ChapterView";
import VerseView from "./VerseView";

interface Props {
  bookId: string | null;
  canon: Canon;
  translation: string;
  selectedChapter: number | null;
  selectedVerse: number | null;
  navigationStack: NavigationEntry[];
  onSelectBook: (id: string) => void;
  onSelectChapter: (chapter: number | null) => void;
  onSelectVerse: (verse: number | null) => void;
  onNavigateBack: (entry: NavigationEntry | null) => void;
  onNavigateTo: (bookId: string, chapter: number, verse: number) => void;
  onClose: () => void;
}

interface VerseData {
  reference: string;
  text: string;
}

// Notable opening verses for each book
const FEATURED_VERSES: Record<string, string> = {
  GEN: "Genesis 1:1", EXO: "Exodus 3:14", LEV: "Leviticus 19:18",
  NUM: "Numbers 6:24-26", DEU: "Deuteronomy 6:4-5", JOS: "Joshua 1:9",
  JDG: "Judges 6:12", RUT: "Ruth 1:16", "1SA": "1 Samuel 16:7",
  "2SA": "2 Samuel 7:16", "1KI": "1 Kings 3:9", "2KI": "2 Kings 2:11",
  "1CH": "1 Chronicles 16:34", "2CH": "2 Chronicles 7:14",
  EZR: "Ezra 7:10", NEH: "Nehemiah 8:10", EST: "Esther 4:14",
  JOB: "Job 19:25", PSA: "Psalms 23:1-3", PRO: "Proverbs 3:5-6",
  ECC: "Ecclesiastes 3:1", SNG: "Song of Solomon 2:4",
  ISA: "Isaiah 40:31", JER: "Jeremiah 29:11", LAM: "Lamentations 3:22-23",
  EZK: "Ezekiel 37:4-5", DAN: "Daniel 3:17-18", HOS: "Hosea 6:6",
  JOL: "Joel 2:28", AMO: "Amos 5:24", OBA: "Obadiah 1:4",
  JON: "Jonah 2:2", MIC: "Micah 6:8", NAH: "Nahum 1:7",
  HAB: "Habakkuk 2:4", ZEP: "Zephaniah 3:17", HAG: "Haggai 2:9",
  ZEC: "Zechariah 4:6", MAL: "Malachi 3:10",
  MAT: "Matthew 5:3-4", MRK: "Mark 1:1", LUK: "Luke 1:37",
  JHN: "John 1:1", ACT: "Acts 1:8", ROM: "Romans 8:28",
  "1CO": "1 Corinthians 13:4-7", "2CO": "2 Corinthians 5:17",
  GAL: "Galatians 5:22-23", EPH: "Ephesians 2:8-9",
  PHP: "Philippians 4:13", COL: "Colossians 3:23",
  "1TH": "1 Thessalonians 5:16-18", "2TH": "2 Thessalonians 3:3",
  "1TI": "1 Timothy 4:12", "2TI": "2 Timothy 1:7",
  TIT: "Titus 3:5", PHM: "Philemon 1:6",
  HEB: "Hebrews 11:1", JAS: "James 1:2-4",
  "1PE": "1 Peter 5:7", "2PE": "2 Peter 3:9",
  "1JN": "1 John 4:8", "2JN": "2 John 1:6", "3JN": "3 John 1:4",
  JUD: "Jude 1:3", REV: "Revelation 21:4",
  TOB: "Tobit 4:15", JDT: "Judith 13:18-19", WIS: "Wisdom 3:1",
  SIR: "Sirach 2:1", BAR: "Baruch 4:4",
  "1MA": "1 Maccabees 2:51", "2MA": "2 Maccabees 7:28",
};

function getConnections(bookId: string, canon: Canon) {
  const activeBooks = new Set(
    Array.from(bookMap.values())
      .filter((b) => b.canons.includes(canon))
      .map((b) => b.id)
  );

  const connections: { book: BibleBook; weight: number; count: number }[] = [];
  edges.forEach((e) => {
    if (e.source === bookId && activeBooks.has(e.target)) {
      const b = bookMap.get(e.target);
      if (b) connections.push({ book: b, weight: e.weight, count: e.count });
    } else if (e.target === bookId && activeBooks.has(e.source)) {
      const b = bookMap.get(e.source);
      if (b) connections.push({ book: b, weight: e.weight, count: e.count });
    }
  });

  connections.sort((a, b) => b.count - a.count);
  return connections;
}

export default function DetailPanel({
  bookId,
  canon,
  translation,
  selectedChapter,
  selectedVerse,
  navigationStack,
  onSelectBook,
  onSelectChapter,
  onSelectVerse,
  onNavigateBack,
  onNavigateTo,
  onClose,
}: Props) {
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [verseError, setVerseError] = useState(false);
  const [verseRetryKey, setVerseRetryKey] = useState(0);
  const [crossRefs, setCrossRefs] = useState<VerseCrossRef[]>([]);
  const [crossRefsLoading, setCrossRefsLoading] = useState(false);

  const book = bookId ? bookMap.get(bookId) : null;

  // Load featured verse
  useEffect(() => {
    if (!bookId || !FEATURED_VERSES[bookId]) {
      setVerse(null);
      setVerseError(false);
      return;
    }

    setLoading(true);
    setVerseError(false);
    setVerse(null);

    const controller = new AbortController();
    const ref = FEATURED_VERSES[bookId];
    const url = `/api/verse?ref=${encodeURIComponent(ref)}&translation=${translation}`;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 6000);

    const doFetch = async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (data.text) {
          setVerse({ reference: data.reference || ref, text: data.text });
          return;
        }
        if (translation !== "web") {
          const fallbackUrl = `/api/verse?ref=${encodeURIComponent(ref)}&translation=web`;
          const r2 = await fetch(fallbackUrl, { signal: controller.signal });
          const d2 = await r2.json();
          if (d2.text) {
            setVerse({ reference: d2.reference || ref, text: d2.text });
            return;
          }
        }
        setVerseError(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setVerseError(true);
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    doFetch();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [bookId, translation, verseRetryKey]);

  // Load verse-level cross-references from per-book JSON
  useEffect(() => {
    if (!bookId) {
      setCrossRefs([]);
      return;
    }

    const controller = new AbortController();
    setCrossRefsLoading(true);
    fetch(`/crossrefs/${bookId}.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: VerseCrossRef[]) => {
        setCrossRefs(data);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setCrossRefs([]);
        }
      })
      .finally(() => setCrossRefsLoading(false));

    return () => controller.abort();
  }, [bookId]);

  // Chapter summaries for the heat map grid
  const chapterSummaries = useMemo(() => {
    if (!book || crossRefs.length === 0) return [];
    return getChapterSummaries(crossRefs, book.chapters);
  }, [crossRefs, book]);

  if (!book || !bookId) {
    return null;
  }

  const connections = getConnections(bookId, canon);
  const totalCrossRefs = crossRefs.length;
  const color = GENRE_COLORS[book.genre];
  const apiName = BIBLE_API_NAMES[bookId] || book.name;
  const bgUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(apiName)}+1&version=RSVCE`;

  // Determine current drill-down level
  const drillLevel = selectedVerse !== null ? "verse" : selectedChapter !== null ? "chapter" : "book";

  // Header with back navigation
  const renderHeader = () => {
    const bookName = getBookName(bookId);
    let title = book.name;
    let subtitle = "";

    if (drillLevel === "chapter") {
      title = `${bookName} ${selectedChapter}`;
      subtitle = `Chapter ${selectedChapter} of ${book.chapters}`;
    } else if (drillLevel === "verse") {
      title = `${bookName} ${selectedChapter}:${selectedVerse}`;
      subtitle = `Chapter ${selectedChapter}, Verse ${selectedVerse}`;
    }

    return (
      <>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-lg three-state-interactive"
          style={{ color: "var(--text-secondary)" }}
        >
          &times;
        </button>

        <div className="p-6 pb-0">
          {/* Breadcrumb navigation (shown when drilled in) */}
          {(drillLevel !== "book" || navigationStack.length > 0) && (
            <BreadcrumbNav
              bookId={bookId}
              chapter={selectedChapter}
              verse={selectedVerse}
              navigationStack={navigationStack}
              onNavigateBack={onNavigateBack}
              onGoToBook={() => {
                onSelectChapter(null);
                onSelectVerse(null);
              }}
              onGoToChapter={() => {
                onSelectVerse(null);
              }}
            />
          )}

          {/* Badge */}
          <div
            className="inline-block px-3 py-1 rounded-md text-sm font-bold mb-3 font-mono"
            style={{ background: color + "25", color: color }}
          >
            {bookId}
          </div>

          {/* Title */}
          <h2
            className="text-xl font-semibold mb-1 font-serif"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h2>
          <p
            className="text-xs mb-4 font-mono"
            style={{ color: "var(--text-secondary)" }}
          >
            {drillLevel === "book" ? (
              <>
                {book.genre} &middot;{" "}
                {book.testament === "DC"
                  ? "Deuterocanonical"
                  : book.testament === "OT"
                    ? "Old Testament"
                    : "New Testament"}
                {book.testament === "DC" && (
                  <span
                    className="ml-2"
                    style={{ color: "var(--text-dim)" }}
                  >
                    ({book.canons.join(", ")})
                  </span>
                )}
              </>
            ) : (
              subtitle
            )}
          </p>
        </div>
      </>
    );
  };

  // ─── BOOK VIEW (Level 1) ───
  const renderBookView = () => (
    <>
      {/* Stats */}
      <div className="flex gap-6 mb-6 text-xs">
        <div className="text-center">
          <div
            className="font-semibold text-lg font-mono"
            style={{ color: "var(--text-primary)" }}
          >
            {book.chapters}
          </div>
          <div className="font-mono" style={{ color: "var(--text-dim)" }}>
            Chapters
          </div>
        </div>
        <div className="text-center">
          <div
            className="font-semibold text-lg font-mono"
            style={{ color: "var(--text-primary)" }}
          >
            {book.verses.toLocaleString()}
          </div>
          <div className="font-mono" style={{ color: "var(--text-dim)" }}>
            Verses
          </div>
        </div>
        <div className="text-center">
          <div
            className="font-semibold text-lg font-mono"
            style={{ color: "var(--text-primary)" }}
          >
            {totalCrossRefs.toLocaleString()}
          </div>
          <div className="font-mono" style={{ color: "var(--text-dim)" }}>
            Cross-refs
          </div>
        </div>
      </div>

      {/* Featured Verse */}
      {(loading || verse || verseError) && (
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            background: color + "08",
            border: `1px solid ${color}15`,
          }}
        >
          {loading ? (
            <div
              className="font-mono text-xs"
              style={{ color: "var(--text-dim)" }}
            >
              Loading verse...
            </div>
          ) : verseError ? (
            <div className="flex items-center gap-3">
              <span
                className="font-mono text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                Verse unavailable
              </span>
              <button
                onClick={() => setVerseRetryKey((k) => k + 1)}
                className="font-mono text-xs three-state-interactive"
                style={{
                  color: "var(--accent)",
                  padding: "2px 6px",
                  border: `1px solid ${color}30`,
                  borderRadius: 4,
                }}
              >
                ↺ Retry
              </button>
            </div>
          ) : verse ? (
            <>
              <p
                className="font-serif text-sm leading-relaxed italic mb-2"
                style={{ color: "var(--text-primary)", opacity: 0.9 }}
              >
                &ldquo;{verse.text.trim()}&rdquo;
              </p>
              <p
                className="text-xs font-mono"
                style={{ color: color + "aa" }}
              >
                {verse.reference}
              </p>
            </>
          ) : null}
        </div>
      )}

      {/* Connected Books */}
      <h3
        className="text-xs uppercase tracking-wider mb-3 font-mono"
        style={{ color: "var(--text-secondary)" }}
      >
        Connected Books ({connections.length})
      </h3>
      <div className="space-y-1 mb-6">
        {connections.slice(0, 15).map(({ book: conn, weight, count }) => (
          <button
            key={conn.id}
            onClick={() => onSelectBook(conn.id)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left group"
            style={{ transition: "var(--transition-base)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "rgba(255, 255, 255, 0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: GENRE_COLORS[conn.genre] }}
            />
            <span
              className="text-sm flex-1 font-serif"
              style={{ color: "var(--text-primary)", opacity: 0.85 }}
            >
              {conn.name}
            </span>
            <span
              className="text-[10px] font-mono"
              style={{ color: "var(--text-dim)" }}
            >
              {count} refs
            </span>
            <div className="w-12">
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{
                    width: `${weight * 10}%`,
                    background: GENRE_COLORS[conn.genre],
                  }}
                />
              </div>
            </div>
          </button>
        ))}
        {connections.length > 15 && (
          <div
            className="text-[10px] px-3 pt-1"
            style={{ color: "var(--text-dim)" }}
          >
            +{connections.length - 15} more
          </div>
        )}
      </div>

      {/* Chapter Grid (replaces old flat cross-ref list) */}
      {!crossRefsLoading && book.chapters > 0 && (
        <ChapterGrid
          bookName={book.name}
          totalChapters={book.chapters}
          selectedChapter={selectedChapter}
          onSelectChapter={onSelectChapter}
        />
      )}
      {crossRefsLoading && (
        <div
          className="text-xs py-2 font-mono"
          style={{ color: "var(--text-dim)" }}
        >
          Loading cross-references...
        </div>
      )}

      {/* Read more link */}
      <a
        href={bgUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs font-mono three-state-interactive"
        style={{ color: ACCENT }}
      >
        Read on Bible Gateway &rarr;
      </a>
    </>
  );

  return (
    <div
      className={`fixed z-50 glass-panel overflow-y-auto
        md:right-0 md:top-0 md:h-full md:w-[380px]
        max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[65vh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0
        panel-active`}
    >
      {renderHeader()}

      <div className="px-6 pb-6">
        {drillLevel === "book" && renderBookView()}

        {drillLevel === "chapter" && selectedChapter !== null && (
          <ChapterView
            bookId={bookId}
            chapter={selectedChapter}
            crossRefs={crossRefs}
            genreColor={color}
            onSelectVerse={onSelectVerse}
            onSelectBook={onSelectBook}
          />
        )}

        {drillLevel === "verse" &&
          selectedChapter !== null &&
          selectedVerse !== null && (
            <VerseView
              bookId={bookId}
              chapter={selectedChapter}
              verse={selectedVerse}
              crossRefs={crossRefs}
              translation={translation}
              onNavigateTo={onNavigateTo}
            />
          )}
      </div>
    </div>
  );
}
