/**
 * Navigation primitives for jumping to a specific verse in the reader.
 *
 * The reader uses a one-shot "pending navigation" signal pattern:
 *   1. `page.tsx` holds a `pendingNavigation` state shaped like
 *      `VerseNavigationRequest`.
 *   2. Setting it to a new value (with a fresh `key`) tells `DetailPanel` to
 *      drill into the requested chapter and hand the verse off to
 *      `VerseReader`.
 *   3. `VerseReader` scrolls the target verse into view and plays the
 *      single-pulse amber outline (`.verse-pulse` class).
 *
 * The `key` field exists so repeated navigations to the same target retrigger
 * the effect — React's dependency comparison sees a new value even if the
 * book/chapter/verse triple hasn't changed.
 */
export interface VerseNavigationRequest {
  bookId: string;
  chapter: number;
  verse: number;
  key: number;
}

/**
 * Build a navigation request with a unique key. Uses `performance.now()` when
 * available so two requests within the same millisecond tick still differ.
 */
export function buildVerseNavigation(
  bookId: string,
  chapter: number,
  verse: number,
): VerseNavigationRequest {
  const key =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  return { bookId, chapter, verse, key };
}
