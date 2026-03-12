/**
 * Pure layout functions for dynamic font sizing and label placement
 * in the Arc Diagram. No Canvas dependency — only computes positions,
 * sizes, and visibility for batch rendering.
 */

export interface LabelItem {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  alpha: number;
}

export interface TickItem {
  x: number;
  yTop: number;
  yBot: number;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Round font size to nearest 2px to minimize ctx.font switches */
export function quantizeFontSize(size: number): number {
  return Math.round(size / 2) * 2;
}

export function computeBookFontSize(bookPixelWidth: number): number {
  return quantizeFontSize(clamp(Math.sqrt(bookPixelWidth) * 1.1, 10, 22));
}

export function computeChapterFontSize(chapterPixelWidth: number): number {
  return quantizeFontSize(clamp(Math.sqrt(chapterPixelWidth) * 0.95, 8, 20));
}

/** Books that remain visible at all zoom levels when stride culling is active */
export const LANDMARK_BOOKS = new Set([
  "GEN", "PSA", "ISA", "MAT", "ROM", "REV",
]);

const MIN_BOOK_LABEL_WIDTH = 18;
const MIN_CHAPTER_LABEL_WIDTH = 12;

/** Compute stride — show every Nth book to avoid overlap */
function computeBookStride(avgBookPixelWidth: number, fontSize: number): number {
  const approxLabelWidth = fontSize * 0.6 * 3 + 8;
  if (avgBookPixelWidth >= approxLabelWidth * 1.5) return 1;
  if (avgBookPixelWidth >= approxLabelWidth * 0.8) return 2;
  if (avgBookPixelWidth >= approxLabelWidth * 0.4) return 4;
  return 8;
}

/** Compute stride for chapter numbers */
function computeChapterStride(avgChapterPixelWidth: number): number {
  if (avgChapterPixelWidth >= 20) return 1;
  if (avgChapterPixelWidth >= 10) return 2;
  if (avgChapterPixelWidth >= 5) return 5;
  return 10;
}

export function computeBookLabels(
  dataBooks: { id: string; offset: number; verses: number; genre: number }[],
  activeBookIds: Set<string>,
  bookNameMap: Map<string, string>,
  xScale: number,
  offsetX: number,
  margin: number,
  viewportWidth: number,
  axisY: number,
  selectedBookId: string | null,
  genreColors: string[],
): LabelItem[] {
  const labels: LabelItem[] = [];

  // Compute average book pixel width for stride calculation
  const activeBooks = dataBooks.filter((b) => activeBookIds.has(b.id));
  if (activeBooks.length === 0) return labels;

  const totalActiveVerses = activeBooks.reduce((s, b) => s + b.verses, 0);
  const avgBookPixelWidth = (totalActiveVerses / activeBooks.length) * xScale;
  const representativeFontSize = computeBookFontSize(avgBookPixelWidth);
  const stride = computeBookStride(avgBookPixelWidth, representativeFontSize);

  let visibleIndex = 0;
  for (const b of dataBooks) {
    if (!activeBookIds.has(b.id)) continue;

    const bookStartX = margin + offsetX + b.offset * xScale;
    const bookEndX = margin + offsetX + (b.offset + b.verses) * xScale;
    const bookPixelWidth = bookEndX - bookStartX;
    const bookCenterX = (bookStartX + bookEndX) / 2;

    // Viewport culling
    if (bookEndX < -50 || bookStartX > viewportWidth + 50) {
      visibleIndex++;
      continue;
    }

    // Width threshold + stride culling (landmarks always pass)
    const passesStride = stride === 1 || visibleIndex % stride === 0 || LANDMARK_BOOKS.has(b.id);
    if (bookPixelWidth < MIN_BOOK_LABEL_WIDTH || !passesStride) {
      visibleIndex++;
      continue;
    }

    const fontSize = computeBookFontSize(bookPixelWidth);

    // Decide full name vs abbreviation
    const fullName = bookNameMap.get(b.id);
    const fullNameWidth = fullName ? fullName.length * fontSize * 0.6 + 16 : Infinity;
    const text = fullName && bookPixelWidth > fullNameWidth ? fullName : b.id;

    // Smooth alpha fade near visibility threshold
    const alpha = clamp((bookPixelWidth - MIN_BOOK_LABEL_WIDTH) / 10, 0.15, 1.0);

    const isSelected = selectedBookId === b.id;
    const genreColor = genreColors[b.genre % genreColors.length];
    const color = isSelected ? genreColor : "rgba(255,255,255,0.7)";

    labels.push({
      text,
      x: bookCenterX,
      y: axisY + 20,
      fontSize,
      color,
      alpha,
    });

    visibleIndex++;
  }

  return labels;
}

export function computeChapterLabels(
  bookId: string,
  bookOffset: number,
  chapters: number[],
  xScale: number,
  offsetX: number,
  margin: number,
  viewportWidth: number,
  axisY: number,
): { labels: LabelItem[]; ticks: TickItem[] } {
  const labels: LabelItem[] = [];
  const ticks: TickItem[] = [];

  // Compute average chapter pixel width for this book
  const avgChapterPixelWidth = (chapters.reduce((s, v) => s + v, 0) / chapters.length) * xScale;

  // Don't render chapters if too small
  if (avgChapterPixelWidth < 3) return { labels, ticks };

  const stride = computeChapterStride(avgChapterPixelWidth);

  let verseOffset = bookOffset;
  for (let ch = 0; ch < chapters.length; ch++) {
    const chStartX = margin + offsetX + verseOffset * xScale;
    const chEndX = margin + offsetX + (verseOffset + chapters[ch]) * xScale;
    const chWidth = chEndX - chStartX;

    if (chStartX > viewportWidth + 20) break;
    if (chEndX > -20) {
      // Always add tick
      ticks.push({ x: chStartX, yTop: axisY - 3, yBot: axisY + 3 });

      // Chapter number label with stride
      if (chWidth > MIN_CHAPTER_LABEL_WIDTH && ch % stride === 0) {
        const fontSize = computeChapterFontSize(chWidth);
        const alpha = clamp((chWidth - MIN_CHAPTER_LABEL_WIDTH) / 10, 0.15, 0.85);

        labels.push({
          text: String(ch + 1),
          x: chStartX + chWidth / 2,
          y: axisY + 36,
          fontSize,
          color: "rgba(255,255,255,0.3)",
          alpha,
        });
      }
    }
    verseOffset += chapters[ch];
  }

  return { labels, ticks };
}
