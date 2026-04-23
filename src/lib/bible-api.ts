import { bookMap } from "@/data/books";

/**
 * Map book IDs to bible-api.com compatible names.
 *
 * Only the 66 Protestant books are listed. Deuterocanonical books (TOB, JDT,
 * WIS, SIR, BAR, 1MA, 2MA, 1ES, PMA, P151, 3MA, 1EN, JUB, 4BA) are intentionally
 * omitted — bible-api.com does not serve them in the translations we use, and
 * the project ships no local text source. Callers that miss the map fall
 * through to a `null` result (see `fetchVerseText`), and the reader /
 * `VerseMarginPopover` render an explicit "text not available" state instead.
 */
export const BIBLE_API_NAMES: Record<string, string> = {
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

/** Format "GEN.1.1" → "Genesis 1:1" */
export function formatRef(ref: string): string {
  const parts = ref.split(".");
  const bookId = parts[0];
  const bookName = BIBLE_API_NAMES[bookId] || bookMap.get(bookId)?.name || bookId;
  if (parts.length >= 3) {
    const rest = parts.slice(1).join(":");
    return `${bookName} ${rest}`;
  }
  return `${bookName} ${parts.slice(1).join(".")}`;
}

/** Get a human-readable book name from a book ID */
export function getBookName(bookId: string): string {
  return BIBLE_API_NAMES[bookId] || bookMap.get(bookId)?.name || bookId;
}

/** In-memory cache: key → settled result. Prevents redundant network calls. */
const verseCache = new Map<string, { text: string; reference: string } | null>();

export interface PassageResult {
  reference: string;
  verses: Array<{ verse: number; text: string }>;
  fullText: string;
  translation: string;
}

const passageCache = new Map<string, PassageResult | null>();

/**
 * Fetch the text of a single verse from bible-api.com.
 * Results are cached in memory for the lifetime of the page session.
 * Falls back to WEB translation if the requested translation fails.
 */
export async function fetchVerseText(
  bookId: string,
  chapter: number,
  verse: number,
  translation: string = "web",
): Promise<{ text: string; reference: string } | null> {
  // DC books have no entry in BIBLE_API_NAMES — bail before a doomed fetch.
  const bookName = BIBLE_API_NAMES[bookId];
  if (!bookName) return null;

  const cacheKey = `${bookId}:${chapter}:${verse}:${translation}`;
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey)!;
  }

  const ref = `${bookName} ${chapter}:${verse}`;

  const makeUrl = (t: string) =>
    `https://bible-api.com/${encodeURIComponent(ref)}?translation=${t}`;

  try {
    const res = await fetch(makeUrl(translation));
    const data = await res.json();
    if (data.text) {
      const result = { text: data.text.trim(), reference: data.reference || ref };
      verseCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // ignore
  }

  // Fallback to WEB translation
  if (translation !== "web") {
    const webKey = `${bookId}:${chapter}:${verse}:web`;
    if (verseCache.has(webKey)) {
      const cached = verseCache.get(webKey)!;
      verseCache.set(cacheKey, cached);
      return cached;
    }
    try {
      const res = await fetch(makeUrl("web"));
      const data = await res.json();
      if (data.text) {
        const result = { text: data.text.trim(), reference: data.reference || ref };
        verseCache.set(cacheKey, result);
        verseCache.set(webKey, result);
        return result;
      }
    } catch {
      // ignore
    }
  }

  verseCache.set(cacheKey, null);
  return null;
}

/**
 * Fetch the text of a passage range from bible-api.com.
 * Takes a human-readable reference like "Daniel 3:14-28" or "Psalm 23:1-6".
 * Results are cached in memory for the lifetime of the page session.
 * Falls back to WEB translation if the requested translation fails.
 */
export async function fetchPassageText(
  reference: string,
  translation: string = "web",
): Promise<PassageResult | null> {
  const cacheKey = `${reference}:${translation}`;
  if (passageCache.has(cacheKey)) {
    return passageCache.get(cacheKey)!;
  }

  const makeUrl = (t: string) =>
    `https://bible-api.com/${encodeURIComponent(reference)}?translation=${t}`;

  try {
    const res = await fetch(makeUrl(translation));
    const data = await res.json();
    if (data.verses && Array.isArray(data.verses)) {
      const result: PassageResult = {
        reference: data.reference || reference,
        verses: data.verses.map((v: { verse: number; text: string }) => ({
          verse: v.verse,
          text: v.text.trim(),
        })),
        fullText: (data.text || "").trim(),
        translation: data.translation_name || translation,
      };
      passageCache.set(cacheKey, result);
      return result;
    }
  } catch {
    // ignore
  }

  // Fallback to WEB translation
  if (translation !== "web") {
    const webKey = `${reference}:web`;
    if (passageCache.has(webKey)) {
      const cached = passageCache.get(webKey)!;
      passageCache.set(cacheKey, cached);
      return cached;
    }
    try {
      const res = await fetch(makeUrl("web"));
      const data = await res.json();
      if (data.verses && Array.isArray(data.verses)) {
        const result: PassageResult = {
          reference: data.reference || reference,
          verses: data.verses.map((v: { verse: number; text: string }) => ({
            verse: v.verse,
            text: v.text.trim(),
          })),
          fullText: (data.text || "").trim(),
          translation: data.translation_name || "web",
        };
        passageCache.set(cacheKey, result);
        passageCache.set(webKey, result);
        return result;
      }
    } catch {
      // ignore
    }
  }

  passageCache.set(cacheKey, null);
  return null;
}

/**
 * Parse a human-readable reading reference like "Daniel 3:14-28" into
 * structured data. Handles numbered book names ("1 Corinthians 15:54-58")
 * and comma-separated verse lists ("Psalm 104:1-2, 5-6, 10, 12, 24, 35").
 *
 * `endVerse` is the end of the FIRST explicit range (or `startVerse` when
 * there is no dash). Any additional comma-separated ranges are returned in
 * `additionalRanges` — a single verse "12" becomes `{start:12, end:12}`.
 * This lets consumers that want a tight upper bound use `endVerse`, and
 * consumers that want to highlight the full set iterate `additionalRanges`.
 *
 * Returns null if the reference cannot be parsed.
 */
export function parseReadingReference(reference: string): {
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  additionalRanges?: Array<{ start: number; end: number }>;
  fullRef: string;
} | null {
  // Match: optional number prefix + book name words + chapter:startVerse(-endVerse)?
  const match = reference.match(
    /^(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+):(\d+)(?:-(\d+))?/,
  );
  if (!match) return null;

  const bookName = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

  // Parse any comma-separated ranges after the first "chapter:range" segment.
  // "Psalm 104:1-2, 5-6, 10, 12" → additionalRanges = [{5,6},{10,10},{12,12}]
  const additionalRanges: Array<{ start: number; end: number }> = [];
  const commaIdx = reference.indexOf(",");
  if (commaIdx !== -1) {
    const tail = reference.slice(commaIdx + 1);
    const rangeRe = /(\d+)(?:\s*-\s*(\d+))?/g;
    let m: RegExpExecArray | null;
    while ((m = rangeRe.exec(tail)) !== null) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : start;
      additionalRanges.push({ start, end });
    }
  }

  return {
    bookName,
    chapter,
    startVerse,
    endVerse,
    ...(additionalRanges.length > 0 ? { additionalRanges } : {}),
    fullRef: reference,
  };
}

/** Build a BibleGateway URL for a specific verse */
export function getBibleGatewayUrl(
  bookId: string,
  chapter: number,
  verse?: number,
): string {
  const bookName = BIBLE_API_NAMES[bookId] || bookId;
  const ref = verse
    ? `${bookName} ${chapter}:${verse}`
    : `${bookName} ${chapter}`;
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=RSVCE`;
}
