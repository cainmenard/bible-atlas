import { bookMap } from "@/data/books";

/** Map book IDs to bible-api.com compatible names */
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
  const bookName = BIBLE_API_NAMES[bookId];
  if (!bookName) return null;

  const cacheKey = `${bookId}:${chapter}:${verse}:${translation}`;
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey)!;
  }

  const ref = `${bookName} ${chapter}:${verse}`;

  // Route through /api/verse to avoid CORS restrictions in production.
  // The proxy fetches bible-api.com server-side where CORS does not apply.
  const makeUrl = (t: string) =>
    `/api/verse?ref=${encodeURIComponent(ref)}&translation=${t}`;

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
    `/api/verse?ref=${encodeURIComponent(reference)}&translation=${t}`;

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
