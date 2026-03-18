import { VerseCrossRef, ChapterCrossRefSummary } from "./types";

/**
 * Group cross-references by their source chapter number.
 * Parses the "from" field (e.g. "GEN.1.1") to extract the chapter.
 */
export function groupCrossRefsByChapter(
  refs: VerseCrossRef[]
): Map<number, VerseCrossRef[]> {
  const map = new Map<number, VerseCrossRef[]>();
  for (const ref of refs) {
    const parts = ref.from.split(".");
    const chapter = parseInt(parts[1], 10);
    if (isNaN(chapter)) continue;
    const arr = map.get(chapter);
    if (arr) {
      arr.push(ref);
    } else {
      map.set(chapter, [ref]);
    }
  }
  return map;
}

/**
 * Get per-chapter summaries: total ref count + top 3 target books.
 */
export function getChapterSummaries(
  refs: VerseCrossRef[],
  totalChapters: number
): ChapterCrossRefSummary[] {
  const grouped = groupCrossRefsByChapter(refs);
  const summaries: ChapterCrossRefSummary[] = [];

  for (let ch = 1; ch <= totalChapters; ch++) {
    const chapterRefs = grouped.get(ch) || [];
    const bookCounts = new Map<string, number>();
    for (const r of chapterRefs) {
      const targetBookId = r.to.split(".")[0];
      bookCounts.set(targetBookId, (bookCounts.get(targetBookId) || 0) + 1);
    }
    const topTargetBooks = Array.from(bookCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([bookId, count]) => ({ bookId, count }));

    summaries.push({
      chapter: ch,
      totalRefs: chapterRefs.length,
      topTargetBooks,
    });
  }

  return summaries;
}

/**
 * Filter cross-references to a specific chapter and optionally a specific verse.
 */
export function getVerseCrossRefs(
  refs: VerseCrossRef[],
  chapter: number,
  verse?: number
): VerseCrossRef[] {
  return refs.filter((r) => {
    const parts = r.from.split(".");
    const ch = parseInt(parts[1], 10);
    if (ch !== chapter) return false;
    if (verse !== undefined) {
      const v = parseInt(parts[2], 10);
      return v === verse;
    }
    return true;
  });
}

/**
 * Parse a cross-reference string like "GEN.1.1" or "GEN.1.1-3" into components.
 */
export function parseRef(ref: string): {
  bookId: string;
  chapter: number;
  verse: number;
} | null {
  const parts = ref.split(".");
  if (parts.length < 3) return null;
  const bookId = parts[0];
  const chapter = parseInt(parts[1], 10);
  // Handle verse ranges like "1-3" by taking the first verse
  const versePart = parts[2].split("-")[0];
  const verse = parseInt(versePart, 10);
  if (isNaN(chapter) || isNaN(verse)) return null;
  return { bookId, chapter, verse };
}

/**
 * Get unique target book IDs from a set of cross-references,
 * with the count of references to each.
 */
export function getTargetBookCounts(
  refs: VerseCrossRef[]
): { bookId: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of refs) {
    const bookId = r.to.split(".")[0];
    counts.set(bookId, (counts.get(bookId) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([bookId, count]) => ({ bookId, count }))
    .sort((a, b) => b.count - a.count);
}

// Cache for loaded per-book crossref files
const crossrefCache = new Map<string, VerseCrossRef[]>();

/**
 * Load a book's crossref file from /crossrefs/{BOOK_ID}.json.
 * Results are cached in memory.
 */
export async function loadBookCrossRefs(
  bookId: string
): Promise<VerseCrossRef[]> {
  if (crossrefCache.has(bookId)) {
    return crossrefCache.get(bookId)!;
  }
  try {
    const res = await fetch(`/crossrefs/${bookId}.json`);
    if (!res.ok) return [];
    const data: VerseCrossRef[] = await res.json();
    crossrefCache.set(bookId, data);
    return data;
  } catch {
    return [];
  }
}

/**
 * Find inbound cross-references: verses from other books that reference the given verse.
 * Searches through crossref files of books that are known to connect to the target book.
 */
export async function getInboundRefs(
  targetBookId: string,
  chapter: number,
  verse: number,
  connectedBookIds: string[]
): Promise<VerseCrossRef[]> {
  const targetPrefix = `${targetBookId}.${chapter}.${verse}`;
  const results: VerseCrossRef[] = [];

  // Load crossrefs from connected books and filter for refs pointing to our verse
  const promises = connectedBookIds
    .filter((id) => id !== targetBookId)
    .map(async (bookId) => {
      const refs = await loadBookCrossRefs(bookId);
      return refs.filter((r) => {
        // Match exact verse or verse range containing our verse
        if (r.to === targetPrefix) return true;
        // Handle ranges like "GEN.1.1-3"
        if (r.to.startsWith(`${targetBookId}.${chapter}.`)) {
          const versePart = r.to.split(".")[2];
          if (versePart.includes("-")) {
            const [start, end] = versePart.split("-").map(Number);
            return verse >= start && verse <= end;
          }
        }
        return false;
      });
    });

  const allResults = await Promise.all(promises);
  for (const bookRefs of allResults) {
    results.push(...bookRefs);
  }

  // Sort by votes descending
  results.sort((a, b) => b.votes - a.votes);
  return results;
}

/**
 * Get verse-level cross-ref counts for each verse in a chapter.
 * Returns a Map from verse number to outbound ref count.
 */
export function getVerseRefCounts(
  refs: VerseCrossRef[],
  chapter: number
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const r of refs) {
    const parts = r.from.split(".");
    if (parseInt(parts[1], 10) !== chapter) continue;
    const verse = parseInt(parts[2], 10);
    if (isNaN(verse)) continue;
    counts.set(verse, (counts.get(verse) || 0) + 1);
  }
  return counts;
}
