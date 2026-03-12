import { CHAPTER_VERSES } from "@/data/chapter-verses";
import { books } from "@/data/books";

export interface VerseRef {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
}

interface BookEntry {
  id: string;
  offset: number;
  verses: number;
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
