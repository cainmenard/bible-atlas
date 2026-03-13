"use client";

import { useState, useEffect } from "react";
import { bookMap } from "@/data/books";
import { edges } from "@/data/edges";
import { GENRE_COLORS, ACCENT } from "@/lib/colors";
import { BibleBook, Canon, VerseCrossRef } from "@/lib/types";
import { BIBLE_API_NAMES, formatRef } from "@/lib/bible-api";

interface Props {
  bookId: string | null;
  canon: Canon;
  translation: string;
  onSelectBook: (id: string) => void;
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
  // Deuterocanonical
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

const CROSSREFS_PER_PAGE = 20;

export default function DetailPanel({
  bookId,
  canon,
  translation,
  onSelectBook,
  onClose,
}: Props) {
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [crossRefs, setCrossRefs] = useState<VerseCrossRef[]>([]);
  const [crossRefsLoading, setCrossRefsLoading] = useState(false);
  const [showCrossRefs, setShowCrossRefs] = useState(false);
  const [crossRefPage, setCrossRefPage] = useState(1);
  const [filterBook, setFilterBook] = useState<string | null>(null);

  const book = bookId ? bookMap.get(bookId) : null;

  // Load featured verse
  useEffect(() => {
    if (!bookId || !FEATURED_VERSES[bookId]) {
      setVerse(null);
      return;
    }

    setLoading(true);
    const ref = FEATURED_VERSES[bookId];
    const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${translation}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.text) {
          setVerse({ reference: data.reference || ref, text: data.text });
        }
      })
      .catch(() => {
        if (translation !== "web") {
          fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=web`)
            .then((r) => r.json())
            .then((data) => {
              if (data.text) setVerse({ reference: data.reference || ref, text: data.text });
            })
            .catch(() => setVerse(null));
        } else {
          setVerse(null);
        }
      })
      .finally(() => setLoading(false));
  }, [bookId, translation]);

  // Load verse-level cross-references from per-book JSON
  useEffect(() => {
    if (!bookId) {
      setCrossRefs([]);
      setShowCrossRefs(false);
      setCrossRefPage(1);
      setFilterBook(null);
      return;
    }

    setCrossRefsLoading(true);
    fetch(`/crossrefs/${bookId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: VerseCrossRef[]) => {
        setCrossRefs(data);
      })
      .catch(() => {
        setCrossRefs([]);
      })
      .finally(() => setCrossRefsLoading(false));
  }, [bookId]);

  // Reset page when filter changes
  useEffect(() => {
    setCrossRefPage(1);
  }, [filterBook]);

  if (!book || !bookId) {
    return null;
  }

  const connections = getConnections(bookId, canon);
  const totalCrossRefs = crossRefs.length;
  const color = GENRE_COLORS[book.genre];
  const apiName = BIBLE_API_NAMES[bookId] || book.name;
  const bgUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(apiName)}+1&version=RSVCE`;

  // Filter cross-refs by target book if selected
  const filteredRefs = filterBook
    ? crossRefs.filter((r) => r.to.startsWith(filterBook + "."))
    : crossRefs;
  const pagedRefs = filteredRefs.slice(0, crossRefPage * CROSSREFS_PER_PAGE);
  const hasMore = pagedRefs.length < filteredRefs.length;

  return (
    <div
      className={`fixed z-50 glass-panel overflow-y-auto
        md:right-0 md:top-0 md:h-full md:w-[380px]
        max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[65vh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0
        panel-active`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-lg three-state-interactive"
        style={{ color: "var(--text-secondary)" }}
      >
        &times;
      </button>

      <div className="p-6">
        {/* Badge */}
        <div
          className="inline-block px-3 py-1 rounded-md text-sm font-bold mb-3 font-mono"
          style={{ background: color + "25", color: color }}
        >
          {bookId}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-1 font-serif" style={{ color: "var(--text-primary)" }}>{book.name}</h2>
        <p className="text-xs mb-4 font-mono" style={{ color: "var(--text-secondary)" }}>
          {book.genre} &middot;{" "}
          {book.testament === "DC" ? "Deuterocanonical" : book.testament === "OT" ? "Old Testament" : "New Testament"}
          {book.testament === "DC" && (
            <span className="ml-2" style={{ color: "var(--text-dim)" }}>({book.canons.join(", ")})</span>
          )}
        </p>

        {/* Stats */}
        <div className="flex gap-6 mb-6 text-xs">
          <div className="text-center">
            <div className="font-semibold text-lg font-mono" style={{ color: "var(--text-primary)" }}>{book.chapters}</div>
            <div className="font-mono" style={{ color: "var(--text-dim)" }}>Chapters</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg font-mono" style={{ color: "var(--text-primary)" }}>{book.verses.toLocaleString()}</div>
            <div className="font-mono" style={{ color: "var(--text-dim)" }}>Verses</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg font-mono" style={{ color: "var(--text-primary)" }}>{totalCrossRefs.toLocaleString()}</div>
            <div className="font-mono" style={{ color: "var(--text-dim)" }}>Cross-refs</div>
          </div>
        </div>

        {/* Featured Verse */}
        {(loading || verse) && (
          <div
            className="rounded-lg p-4 mb-6"
            style={{ background: color + "08", border: `1px solid ${color}15` }}
          >
            {loading ? (
              <div className="font-mono text-xs" style={{ color: "var(--text-dim)" }}>Loading verse...</div>
            ) : verse ? (
              <>
                <p className="font-serif text-sm leading-relaxed italic mb-2" style={{ color: "var(--text-primary)", opacity: 0.8 }}>
                  &ldquo;{verse.text.trim()}&rdquo;
                </p>
                <p className="text-xs font-mono" style={{ color: color + "aa" }}>
                  {verse.reference}
                </p>
              </>
            ) : null}
          </div>
        )}

        {/* Book-level Connections */}
        <h3 className="text-xs uppercase tracking-wider mb-3 font-mono" style={{ color: "var(--text-dim)" }}>
          Connected Books ({connections.length})
        </h3>
        <div className="space-y-1 mb-6">
          {connections.slice(0, 15).map(({ book: conn, weight, count }) => (
            <button
              key={conn.id}
              onClick={() => onSelectBook(conn.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left group"
              style={{ transition: "var(--transition-base)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: GENRE_COLORS[conn.genre] }}
              />
              <span className="text-sm flex-1 font-serif" style={{ color: "var(--text-primary)", opacity: 0.7 }}>{conn.name}</span>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-dim)" }}>
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
          {connections.length > 15 && !showCrossRefs && (
            <div className="text-[10px] px-3 pt-1" style={{ color: "var(--text-dim)" }}>
              +{connections.length - 15} more
            </div>
          )}
        </div>

        {/* Verse Cross-References */}
        {totalCrossRefs > 0 && (
          <>
            <button
              onClick={() => setShowCrossRefs(!showCrossRefs)}
              className="w-full flex items-center justify-between text-xs uppercase tracking-wider mb-3 font-mono"
              style={{ color: "var(--text-dim)", transition: "var(--transition-base)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
            >
              <span>
                Verse Cross-References ({filterBook ? `${filteredRefs.length} to ${BIBLE_API_NAMES[filterBook] || filterBook}` : totalCrossRefs.toLocaleString()})
              </span>
              <span style={{ color: "var(--text-dim)" }}>{showCrossRefs ? "▲" : "▼"}</span>
            </button>

            {showCrossRefs && (
              <>
                {/* Filter by target book */}
                {filterBook && (
                  <button
                    onClick={() => setFilterBook(null)}
                    className="text-[10px] px-2 py-1 rounded mb-2 inline-block"
                    style={{ background: color + "15", color: color }}
                  >
                    Showing refs to {BIBLE_API_NAMES[filterBook] || filterBook} &times;
                  </button>
                )}

                {crossRefsLoading ? (
                  <div className="text-xs py-2 font-mono" style={{ color: "var(--text-dim)" }}>Loading cross-references...</div>
                ) : (
                  <div className="space-y-0.5 mb-4">
                    {pagedRefs.map((ref, i) => {
                      const targetBookId = ref.to.split(".")[0];
                      const targetBook = bookMap.get(targetBookId);
                      const targetColor = targetBook ? GENRE_COLORS[targetBook.genre] : "#888";
                      return (
                        <div
                          key={`${ref.from}-${ref.to}-${i}`}
                          className="flex items-start gap-2 px-2 py-1.5 rounded text-[11px] leading-tight"
                          style={{ transition: "var(--transition-base)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <span className="shrink-0 font-mono" style={{ color: "var(--text-secondary)" }}>
                            {formatRef(ref.from)}
                          </span>
                          <span className="shrink-0" style={{ color: "var(--text-dim)" }}>&rarr;</span>
                          <button
                            onClick={() => {
                              if (targetBook) onSelectBook(targetBookId);
                            }}
                            className="text-left shrink-0 hover:underline font-mono"
                            style={{ color: targetColor + "cc" }}
                          >
                            {formatRef(ref.to)}
                          </button>
                          <span
                            className="ml-auto text-[9px] shrink-0 font-mono"
                            style={{ color: "var(--text-dim)" }}
                            title={`${ref.votes} community votes`}
                          >
                            {ref.votes > 0 ? `+${ref.votes}` : ref.votes}
                          </span>
                        </div>
                      );
                    })}

                    {hasMore && (
                      <button
                        onClick={() => setCrossRefPage((p) => p + 1)}
                        className="w-full text-center text-[10px] py-2 font-mono"
                        style={{ color: "var(--text-dim)", transition: "var(--transition-base)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                      >
                        Show more ({filteredRefs.length - pagedRefs.length} remaining)
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
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
      </div>
    </div>
  );
}
