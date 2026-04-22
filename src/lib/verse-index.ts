import { CHAPTER_VERSES } from "@/data/chapter-verses";
import { books } from "@/data/books";

export interface VerseRef {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
}

/**
 * A single cross-reference entry. `bookId`/`chapter`/`verse` point at the
 * OTHER side of an arc; `idx` is the target's linear verse index (0..31102);
 * `weight` is the third field of the arc (genre classifier / vote count).
 */
export interface Reference {
  bookId: string;
  chapter: number;
  verse: number;
  idx: number;
  weight: number;
}

interface BookEntry {
  id: string;
  offset: number;
  verses: number;
}

interface ArcCrossrefsShape {
  totalVerses: number;
  books: BookEntry[];
  arcs: number[][];
}

// Pre-computed cumulative chapter offsets per book: [0, ch1Verses, ch1+ch2, ...]
const chapterOffsets = new Map<string, number[]>();

let initialized = false;

function ensureInit(arcBooks: BookEntry[]) {
  if (initialized) return;
  for (const b of arcBooks) {
    const chapters = CHAPTER_VERSES[b.id];
    if (!chapters) continue;
    const offsets = [0];
    for (let i = 0; i < chapters.length; i++) {
      offsets.push(offsets[i] + chapters[i]);
    }
    chapterOffsets.set(b.id, offsets);
  }
  initialized = true;
}

/**
 * Convert a linear verse index (0–31102) to a human-readable verse reference.
 * Requires arcBooks (from arc-crossrefs.json) to map index ranges to book IDs.
 */
export function indexToVerseRef(
  verseIdx: number,
  arcBooks: BookEntry[]
): VerseRef | null {
  ensureInit(arcBooks);

  // Binary search for the book containing this verse index
  let lo = 0;
  let hi = arcBooks.length - 1;
  let bookEntry: BookEntry | null = null;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = arcBooks[mid];
    if (verseIdx < b.offset) {
      hi = mid - 1;
    } else if (verseIdx >= b.offset + b.verses) {
      lo = mid + 1;
    } else {
      bookEntry = b;
      break;
    }
  }

  if (!bookEntry) return null;

  const localIdx = verseIdx - bookEntry.offset;
  const offsets = chapterOffsets.get(bookEntry.id);

  // Look up the full book name
  const fullBook = books.find((b) => b.id === bookEntry!.id);
  const bookName = fullBook ? fullBook.name : bookEntry.id;

  if (!offsets) {
    // No chapter data — return book-level only
    return { bookId: bookEntry.id, bookName, chapter: 1, verse: localIdx + 1 };
  }

  // Binary search for the chapter containing localIdx
  let cLo = 0;
  let cHi = offsets.length - 2; // offsets has chapters+1 entries
  let chapter = 0;

  while (cLo <= cHi) {
    const mid = (cLo + cHi) >> 1;
    if (localIdx < offsets[mid]) {
      cHi = mid - 1;
    } else if (localIdx >= offsets[mid + 1]) {
      cLo = mid + 1;
    } else {
      chapter = mid;
      break;
    }
  }

  const verse = localIdx - offsets[chapter] + 1;
  return { bookId: bookEntry.id, bookName, chapter: chapter + 1, verse };
}

/**
 * Format a VerseRef as a human-readable string like "Genesis 1:1"
 */
export function formatVerseRef(ref: VerseRef): string {
  return `${ref.bookName} ${ref.chapter}:${ref.verse}`;
}

// ────────────────────────────────────────────────────────────
// Verse-level cross-reference index
// ────────────────────────────────────────────────────────────

const bookIdByName = new Map<string, string>(
  books.flatMap((b) => [
    [b.name.toLowerCase(), b.id],
    [b.id.toLowerCase(), b.id],
  ])
);

function resolveBookId(book: string): string | null {
  return bookIdByName.get(book.toLowerCase()) ?? null;
}

let cachedIndex: Map<string, Reference[]> | null = null;
let indexPromise: Promise<Map<string, Reference[]>> | null = null;

/**
 * Build (or return cached) a verse-keyed cross-reference index.
 * Keys are `"{bookId}-{chapter}-{verse}"` (e.g. `"GEN-1-1"`).
 * Each entry lists references pointing to the OTHER endpoint of every arc
 * that touches this verse (arcs are bidirectional for reader purposes).
 */
export function buildVerseIndex(): Promise<Map<string, Reference[]>> {
  if (indexPromise) return indexPromise;

  const pending = (async () => {
    const res = await fetch("/arc-crossrefs.json");
    if (!res.ok) throw new Error(`arc-crossrefs.json: ${res.status}`);
    const data = (await res.json()) as ArcCrossrefsShape;

    const n = data.totalVerses;
    const bookIdByIdx = new Array<string>(n);
    const chapterByIdx = new Uint8Array(n);
    const verseByIdx = new Uint16Array(n);

    for (const b of data.books) {
      const chArr = CHAPTER_VERSES[b.id];
      if (!chArr) continue;
      let idx = b.offset;
      for (let ch = 0; ch < chArr.length; ch++) {
        const vCount = chArr[ch];
        for (let v = 0; v < vCount; v++) {
          bookIdByIdx[idx] = b.id;
          chapterByIdx[idx] = ch + 1;
          verseByIdx[idx] = v + 1;
          idx++;
        }
      }
    }

    const map = new Map<string, Reference[]>();
    const arcs = data.arcs;

    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const fromIdx = arc[0];
      const toIdx = arc[1];
      const weight = arc[2] ?? 0;

      const fromBookId = bookIdByIdx[fromIdx];
      const toBookId = bookIdByIdx[toIdx];
      if (!fromBookId || !toBookId) continue;

      const fromCh = chapterByIdx[fromIdx];
      const fromV = verseByIdx[fromIdx];
      const toCh = chapterByIdx[toIdx];
      const toV = verseByIdx[toIdx];

      const fromKey = `${fromBookId}-${fromCh}-${fromV}`;
      const toKey = `${toBookId}-${toCh}-${toV}`;

      let fromList = map.get(fromKey);
      if (!fromList) {
        fromList = [];
        map.set(fromKey, fromList);
      }
      fromList.push({
        bookId: toBookId,
        chapter: toCh,
        verse: toV,
        idx: toIdx,
        weight,
      });

      let toList = map.get(toKey);
      if (!toList) {
        toList = [];
        map.set(toKey, toList);
      }
      toList.push({
        bookId: fromBookId,
        chapter: fromCh,
        verse: fromV,
        idx: fromIdx,
        weight,
      });
    }

    cachedIndex = map;
    return map;
  })();

  pending.catch(() => {
    if (indexPromise === pending) indexPromise = null;
  });
  indexPromise = pending;
  return pending;
}

/**
 * Synchronous lookup. Returns `[]` until `buildVerseIndex()` resolves.
 * Accepts either a full book name ("Genesis") or book id ("GEN").
 */
export function getReferencesForVerse(
  book: string,
  chapter: number,
  verse: number
): Reference[] {
  if (!cachedIndex) return [];
  const id = resolveBookId(book);
  if (!id) return [];
  return cachedIndex.get(`${id}-${chapter}-${verse}`) ?? [];
}
