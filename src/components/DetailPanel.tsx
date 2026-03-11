"use client";

import { useState, useEffect } from "react";
import { bookMap } from "@/data/books";
import { edges } from "@/data/edges";
import { GENRE_COLORS, ACCENT } from "@/lib/colors";
import { BibleBook, Canon } from "@/lib/types";

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

// Map book IDs to bible-api.com compatible names
const BIBLE_API_NAMES: Record<string, string> = {
  GEN: "Genesis", EXO: "Exodus", LEV: "Leviticus", NUM: "Numbers",
  DEU: "Deuteronomy", JOS: "Joshua", JDG: "Judges", RUT: "Ruth",
  "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Kings", "2KI": "2 Kings",
  "1CH": "1 Chronicles", "2CH": "2 Chronicles", EZR: "Ezra", NEH: "Nehemiah",
  EST: "Esther", JOB: "Job", PSA: "Psalms", PRO: "Proverbs",
  ECC: "Ecclesiastes", SNG: "Song of Solomon", ISA: "Isaiah", JER: "Jeremiah",
  LAM: "Lamentations", EZK: "Ezekiel", DAN: "Daniel", HOS: "Hosea",
  JOL: "Joel", AMO: "Amos", OBA: "Obadiah", JON: "Jonah",
  MIC: "Micah", NAH: "Nahum", HAB: "Habakkuk", ZEP: "Zephaniah",
  HAG: "Haggai", ZEC: "Zechariah", MAL: "Malachi",
  MAT: "Matthew", MRK: "Mark", LUK: "Luke", JHN: "John",
  ACT: "Acts", ROM: "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians",
  GAL: "Galatians", EPH: "Ephesians", PHP: "Philippians", COL: "Colossians",
  "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
  "1TI": "1 Timothy", "2TI": "2 Timothy", TIT: "Titus", PHM: "Philemon",
  HEB: "Hebrews", JAS: "James", "1PE": "1 Peter", "2PE": "2 Peter",
  "1JN": "1 John", "2JN": "2 John", "3JN": "3 John", JUD: "Jude",
  REV: "Revelation",
};

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

  const connections: { book: BibleBook; weight: number }[] = [];
  edges.forEach((e) => {
    if (e.source === bookId && activeBooks.has(e.target)) {
      const b = bookMap.get(e.target);
      if (b) connections.push({ book: b, weight: e.weight });
    } else if (e.target === bookId && activeBooks.has(e.source)) {
      const b = bookMap.get(e.source);
      if (b) connections.push({ book: b, weight: e.weight });
    }
  });

  connections.sort((a, b) => b.weight - a.weight);
  return connections;
}

export default function DetailPanel({
  bookId,
  canon,
  translation,
  onSelectBook,
  onClose,
}: Props) {
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(false);

  const book = bookId ? bookMap.get(bookId) : null;

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
        // Fallback to WEB if other translation fails
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

  if (!book || !bookId) {
    return null;
  }

  const connections = getConnections(bookId, canon);
  const color = GENRE_COLORS[book.genre];
  const apiName = BIBLE_API_NAMES[bookId] || book.name;
  const bgUrl = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(apiName)}+1&version=RSVCE`;

  return (
    <div
      className={`fixed z-50 bg-[#070d1f]/95 backdrop-blur-md border-l border-white/5
        overflow-y-auto
        md:right-0 md:top-0 md:h-full md:w-[380px]
        max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[65vh] max-md:rounded-t-2xl max-md:border-t max-md:border-l-0
        panel-active`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/40 hover:text-white/80 text-lg"
      >
        &times;
      </button>

      <div className="p-6">
        {/* Badge */}
        <div
          className="inline-block px-3 py-1 rounded-md text-sm font-bold mb-3"
          style={{ background: color + "25", color: color }}
        >
          {bookId}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-white/90 mb-1">{book.name}</h2>
        <p className="text-xs text-white/40 mb-4">
          {book.genre} &middot;{" "}
          {book.testament === "DC" ? "Deuterocanonical" : book.testament === "OT" ? "Old Testament" : "New Testament"}
          {book.testament === "DC" && (
            <span className="ml-2 text-white/25">({book.canons.join(", ")})</span>
          )}
        </p>

        {/* Stats */}
        <div className="flex gap-4 mb-6 text-xs">
          <div className="text-center">
            <div className="text-white/80 font-semibold text-lg">{book.chapters}</div>
            <div className="text-white/30">Chapters</div>
          </div>
          <div className="text-center">
            <div className="text-white/80 font-semibold text-lg">{book.verses.toLocaleString()}</div>
            <div className="text-white/30">Verses</div>
          </div>
          <div className="text-center">
            <div className="text-white/80 font-semibold text-lg">{connections.length}</div>
            <div className="text-white/30">Connections</div>
          </div>
        </div>

        {/* Featured Verse */}
        {(loading || verse) && (
          <div
            className="rounded-lg p-4 mb-6"
            style={{ background: color + "08", border: `1px solid ${color}15` }}
          >
            {loading ? (
              <div className="text-white/30 text-xs">Loading verse...</div>
            ) : verse ? (
              <>
                <p className="serif text-white/70 text-sm leading-relaxed italic mb-2">
                  &ldquo;{verse.text.trim()}&rdquo;
                </p>
                <p className="text-xs" style={{ color: color + "aa" }}>
                  {verse.reference}
                </p>
              </>
            ) : null}
          </div>
        )}

        {/* Connections */}
        <h3 className="text-xs text-white/30 uppercase tracking-wider mb-3">
          Connections ({connections.length})
        </h3>
        <div className="space-y-1 mb-6">
          {connections.map(({ book: conn, weight }) => (
            <button
              key={conn.id}
              onClick={() => onSelectBook(conn.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-left"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: GENRE_COLORS[conn.genre] }}
              />
              <span className="text-sm text-white/70 flex-1">{conn.name}</span>
              <div className="w-16">
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
        </div>

        {/* Read more link */}
        <a
          href={bgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs hover:opacity-100 transition-opacity"
          style={{ color: ACCENT, opacity: 0.7 }}
        >
          Read on Bible Gateway &rarr;
        </a>
      </div>
    </div>
  );
}
