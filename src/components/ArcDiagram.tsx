"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { GENRE_COLORS } from "@/lib/colors";
import { Canon } from "@/lib/types";
import { books, bookMap } from "@/data/books";
import { CHAPTER_VERSES } from "@/data/chapter-verses";
import { ArcRenderer } from "@/lib/arc-renderer";
import { indexToVerseRef, formatVerseRef } from "@/lib/verse-index";
import {
  computeBookLabels,
  computeChapterLabels,
  type LabelItem,
  type TickItem,
} from "@/lib/label-layout";
import { fetchVerseText, getBibleGatewayUrl, getBookName } from "@/lib/bible-api";
import VersePopover from "@/components/VersePopover";

interface ArcData {
  totalVerses: number;
  genres: string[];
  books: { id: string; offset: number; verses: number; genre: number }[];
  arcs: number[][]; // [fromIndex, toIndex, genreIndex] or [fromIndex, toIndex, genreIndex, votes]
}

interface SelectedArc {
  arcIndex: number;
  fromIdx: number;
  toIdx: number;
  genreIdx: number;
  votes: number;
  screenX: number;
  screenY: number;
}

interface VersePopoverState {
  bookId: string;
  chapter: number;
  verse?: number;
  screenX: number;
  screenY: number;
}

interface Props {
  canon: Canon;
  selectedBookId: string | null;
  onSelectBook: (id: string | null) => void;
  translation?: string;
}

const GENRE_COLOR_LIST = Object.values(GENRE_COLORS);
const MARGIN = 40;

/** Find the label at a screen point. Returns the label or null. */
function findLabelAtPoint(
  mouseX: number,
  mouseY: number,
  labels: LabelItem[],
): LabelItem | null {
  for (let i = labels.length - 1; i >= 0; i--) {
    const l = labels[i];
    // Labels are drawn with textAlign="center", so x is the center
    const halfW = l.width / 2;
    const top = l.y - l.height;
    if (
      mouseX >= l.x - halfW &&
      mouseX <= l.x + halfW &&
      mouseY >= top &&
      mouseY <= l.y + 4 // small padding below baseline
    ) {
      return l;
    }
  }
  return null;
}

/** Find the arc closest to a screen point. Returns arc index or null. */
function computeArcRy(
  fromIdx: number,
  toIdx: number,
  totalVerses: number,
  maxArcHeight: number,
  maxArcHeightBelow: number,
  scaleX: number,
  axisY: number,
  canvasHeight: number
): number {
  const distance = Math.abs(toIdx - fromIdx);
  const normalizedDist = distance / totalVerses;
  const isForward = toIdx > fromIdx;
  const ryBase = isForward
    ? Math.max(3, normalizedDist * maxArcHeight * 2)
    : Math.max(3, normalizedDist * maxArcHeightBelow * 2);
  const ryScaled = ryBase * Math.sqrt(scaleX);
  const maxRy = isForward ? (axisY - 5) : (canvasHeight - axisY - 5);
  return Math.min(ryScaled, maxRy);
}

function findArcAtPoint(
  mouseX: number,
  mouseY: number,
  arcs: number[][],
  totalVerses: number,
  offsetX: number,
  scaleX: number,
  width: number,
  height: number,
  activeBookIds: Set<string>,
  arcBooks: ArcData["books"],
  activeVerseSet?: Uint8Array
): number | null {
  const axisY = height * 0.52;
  const totalWidth = (width - MARGIN * 2) * scaleX;
  const xScale = totalWidth / totalVerses;
  const maxArcHeight = axisY - 20;
  const maxArcHeightBelow = height - axisY - 30;
  const clickedAbove = mouseY < axisY;
  const threshold = 8; // pixels

  let bestDist = Infinity;
  let bestIdx = -1;

  for (let i = 0; i < arcs.length; i++) {
    const arc = arcs[i];
    const fromIdx = arc[0];
    const toIdx = arc[1];

    // Skip invisible arcs (canon filtering)
    if (activeVerseSet && (!activeVerseSet[fromIdx] || !activeVerseSet[toIdx]))
      continue;

    const x1 = MARGIN + offsetX + fromIdx * xScale;
    const x2 = MARGIN + offsetX + toIdx * xScale;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);

    // Viewport culling
    if (maxX < -50 || minX > width + 50) continue;

    // Quick X range check
    if (mouseX < minX - threshold || mouseX > maxX + threshold) continue;

    const isForward = toIdx > fromIdx;
    // Skip if click is on wrong side of axis
    if (isForward && !clickedAbove) continue;
    if (!isForward && clickedAbove) continue;

    const cx = (x1 + x2) / 2;
    const rx = (maxX - minX) / 2;
    if (rx < 1) continue;

    const ry = computeArcRy(fromIdx, toIdx, totalVerses, maxArcHeight, maxArcHeightBelow, scaleX, axisY, height);

    // Find arc Y at mouseX using parametric ellipse
    const dx = mouseX - cx;
    const cosVal = dx / rx;
    if (Math.abs(cosVal) > 1) continue;

    let arcY: number;
    if (isForward) {
      const angle = Math.PI - Math.acos(cosVal);
      arcY = axisY - ry * Math.sin(angle);
    } else {
      const angle = Math.acos(cosVal);
      arcY = axisY + ry * Math.sin(angle);
    }

    const dist = Math.abs(mouseY - arcY);
    if (dist < threshold && dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx >= 0 ? bestIdx : null;
}

export default function ArcDiagram({
  canon,
  selectedBookId,
  onSelectBook,
  translation = "web",
}: Props) {
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ArcRenderer | null>(null);
  const dataRef = useRef<ArcData | null>(null);
  const activeVerseSetRef = useRef<Uint8Array | null>(null);
  const [loaded, setLoaded] = useState(false);
  const transformRef = useRef({ offsetX: 0, scaleX: 1 });
  const animRef = useRef<number>(0);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
  } | null>(null);
  const [selectedArc, setSelectedArc] = useState<SelectedArc | null>(null);
  const selectedArcRef = useRef<SelectedArc | null>(null);

  // Verse text fetched for the arc detail card
  const [arcFromText, setArcFromText] = useState<string | null>(null);
  const [arcToText, setArcToText] = useState<string | null>(null);
  const [arcTextLoading, setArcTextLoading] = useState(false);

  // Verse popover state (for clicking verse/chapter labels)
  const [versePopover, setVersePopover] = useState<VersePopoverState | null>(null);

  // Store rendered labels for hit-testing
  const renderedLabelsRef = useRef<LabelItem[]>([]);

  // Pre-compute book name lookup (stable, no deps)
  const bookNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of books) m.set(b.id, b.name);
    return m;
  }, []);

  // Keep ref in sync with state for use in draw callback
  useEffect(() => {
    selectedArcRef.current = selectedArc;
  }, [selectedArc]);

  // Fetch verse text when an arc is selected
  useEffect(() => {
    if (!selectedArc || !dataRef.current) {
      setArcFromText(null);
      setArcToText(null);
      return;
    }

    const data = dataRef.current;
    const fromRef = indexToVerseRef(selectedArc.fromIdx, data.books);
    const toRef = indexToVerseRef(selectedArc.toIdx, data.books);
    if (!fromRef || !toRef) return;

    setArcTextLoading(true);
    setArcFromText(null);
    setArcToText(null);

    Promise.all([
      fetchVerseText(fromRef.bookId, fromRef.chapter, fromRef.verse, translation),
      fetchVerseText(toRef.bookId, toRef.chapter, toRef.verse, translation),
    ]).then(([fromResult, toResult]) => {
      setArcFromText(fromResult?.text || null);
      setArcToText(toResult?.text || null);
      setArcTextLoading(false);
    });
  }, [selectedArc, translation]);

  // Track last overlay canvas size to avoid unnecessary resets
  const lastOverlaySizeRef = useRef({ width: 0, height: 0, dpr: 0 });

  // Load arc data and initialize WebGL renderer
  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    if (!glCanvas) return;

    let renderer: ArcRenderer | null = null;
    try {
      renderer = new ArcRenderer(glCanvas);
      rendererRef.current = renderer;
    } catch {
      console.warn("WebGL2 not available for arc rendering");
      return;
    }

    fetch("/arc-crossrefs.json")
      .then((r) => r.json())
      .then((data: ArcData) => {
        dataRef.current = data;
        renderer!.setArcData(data.arcs, data.totalVerses);
        setLoaded(true);
      });

    return () => {
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Update visibility when canon or data changes
  useEffect(() => {
    const data = dataRef.current;
    const renderer = rendererRef.current;
    if (!data || !renderer) return;

    const activeBookIds = new Set(
      books.filter((b) => b.canons.includes(canon)).map((b) => b.id)
    );

    const activeSet = new Uint8Array(data.totalVerses);
    for (const b of data.books) {
      if (activeBookIds.has(b.id)) {
        activeSet.fill(1, b.offset, b.offset + b.verses);
      }
    }
    activeVerseSetRef.current = activeSet;
    renderer.setVisibility(activeSet);
  }, [canon, loaded]);

  // Update selection uniforms when selectedBookId changes
  useEffect(() => {
    const data = dataRef.current;
    const renderer = rendererRef.current;
    if (!data || !renderer) return;

    if (selectedBookId) {
      const bd = data.books.find((b) => b.id === selectedBookId);
      if (bd) {
        renderer.setSelection(bd.offset, bd.offset + bd.verses);
      } else {
        renderer.setSelection(-1, -1);
      }
    } else {
      renderer.setSelection(-1, -1);
    }
  }, [selectedBookId, loaded]);

  // Draw function: WebGL arcs + Canvas 2D overlay
  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    const data = dataRef.current;
    if (!data) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const { offsetX, scaleX } = transformRef.current;

    // Render arcs via WebGL
    if (renderer) {
      renderer.render(width, height, offsetX, scaleX);
    }

    // Render overlay (axis, labels, title) via Canvas 2D
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Only resize overlay when dimensions change
    const last = lastOverlaySizeRef.current;
    if (last.width !== width || last.height !== height || last.dpr !== dpr) {
      overlay.width = width * dpr;
      overlay.height = height * dpr;
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;
      lastOverlaySizeRef.current = { width, height, dpr };
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // --- Draw axis line ---
    const axisY = height * 0.52;
    const totalWidth = (width - MARGIN * 2) * scaleX;

    // --- Dark gradient band behind label area for text contrast ---
    {
      const bandTop = axisY - 4;
      const bandBottom = axisY + 64;
      const bandGrad = ctx.createLinearGradient(0, bandTop, 0, bandBottom);
      bandGrad.addColorStop(0, "rgba(2, 5, 14, 0)");
      bandGrad.addColorStop(0.1, "rgba(2, 5, 14, 0.55)");
      bandGrad.addColorStop(0.4, "rgba(2, 5, 14, 0.7)");
      bandGrad.addColorStop(1, "rgba(2, 5, 14, 0.4)");
      ctx.fillStyle = bandGrad;
      ctx.fillRect(0, bandTop, width, bandBottom - bandTop);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN + offsetX, axisY);
    ctx.lineTo(MARGIN + offsetX + totalWidth, axisY);
    ctx.stroke();

    // --- Draw book labels & markers ---
    const xScale = totalWidth / data.totalVerses;
    const activeBookIds = new Set(
      books.filter((b) => b.canons.includes(canon)).map((b) => b.id)
    );

    ctx.textAlign = "center";

    // --- Book boundary ticks (always drawn for visible books) ---
    {
      const boundaryAlpha = Math.min(0.4, 0.1 + Math.log2(Math.max(1, scaleX)) * 0.03);
      const boundaryHeight = Math.min(30, 4 + Math.log2(Math.max(1, scaleX)) * 2);
      let bookIdx = 0;
      for (const b of data.books) {
        if (!activeBookIds.has(b.id)) { bookIdx++; continue; }
        const bookStartX = MARGIN + offsetX + b.offset * xScale;
        const bookEndX = MARGIN + offsetX + (b.offset + b.verses) * xScale;
        if (bookEndX < -50 || bookStartX > width + 50) { bookIdx++; continue; }

        // Alternating background bands at high zoom
        if (scaleX > 5 && bookIdx % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.015)";
          ctx.fillRect(bookStartX, axisY - 60, bookEndX - bookStartX, 120);
        }

        // Adaptive boundary line
        ctx.strokeStyle = `rgba(255,255,255,${boundaryAlpha})`;
        ctx.lineWidth = scaleX > 50 ? 1.0 : 0.5;
        ctx.beginPath();
        ctx.moveTo(bookStartX, axisY - boundaryHeight);
        ctx.lineTo(bookStartX, axisY + boundaryHeight);
        ctx.stroke();
        bookIdx++;
      }
    }

    // --- Compute book labels with dynamic sizing ---
    const bookLabels = computeBookLabels(
      data.books,
      activeBookIds,
      bookNameMap,
      xScale,
      offsetX,
      MARGIN,
      width,
      axisY,
      selectedBookId,
      GENRE_COLOR_LIST,
    );

    // --- Compute chapter labels + ticks for visible books ---
    const allChapterLabels: LabelItem[] = [];
    const allChapterTicks: TickItem[] = [];
    for (const b of data.books) {
      if (!activeBookIds.has(b.id)) continue;
      const bookStartX = MARGIN + offsetX + b.offset * xScale;
      const bookEndX = MARGIN + offsetX + (b.offset + b.verses) * xScale;
      if (bookEndX < -50 || bookStartX > width + 50) continue;
      const chapters = CHAPTER_VERSES[b.id];
      if (!chapters) continue;
      const { labels, ticks } = computeChapterLabels(
        b.id, b.offset, chapters, xScale, offsetX, MARGIN, width, axisY,
      );
      allChapterLabels.push(...labels);
      allChapterTicks.push(...ticks);
    }

    // --- Draw chapter ticks (batch) ---
    if (allChapterTicks.length > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      for (const t of allChapterTicks) {
        ctx.beginPath();
        ctx.moveTo(t.x, t.yTop);
        ctx.lineTo(t.x, t.yBot);
        ctx.stroke();
      }
    }

    // --- Batch-draw book labels (sorted by font size to minimize ctx.font switches) ---
    bookLabels.sort((a, b) => a.fontSize - b.fontSize);
    {
      let curFont = "";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      for (const item of bookLabels) {
        const font = `bold ${item.fontSize}px monospace`;
        if (font !== curFont) { ctx.font = font; curFont = font; }
        ctx.globalAlpha = item.alpha;
        // Dark outline for contrast
        ctx.strokeStyle = "rgba(2, 5, 14, 0.9)";
        ctx.lineWidth = 3;
        ctx.strokeText(item.text, item.x, item.y);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
      }
      ctx.globalAlpha = 1;
    }

    // --- Batch-draw chapter labels (sorted by font size) ---
    allChapterLabels.sort((a, b) => a.fontSize - b.fontSize);
    {
      let curFont = "";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      for (const item of allChapterLabels) {
        const font = `${item.fontSize}px monospace`;
        if (font !== curFont) { ctx.font = font; curFont = font; }
        ctx.globalAlpha = item.alpha;
        // Dark outline for contrast
        ctx.strokeStyle = "rgba(2, 5, 14, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.strokeText(item.text, item.x, item.y);
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
      }
      ctx.globalAlpha = 1;
    }

    // --- Verse ticks & labels (deep zoom) ---
    const allVerseLabels: LabelItem[] = [];
    if (scaleX >= 50) {
      const visibleStartIdx = Math.max(
        0,
        Math.floor((-offsetX - MARGIN) / xScale)
      );
      const visibleEndIdx = Math.min(
        data.totalVerses,
        Math.ceil((width - MARGIN - offsetX) / xScale)
      );
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let v = visibleStartIdx; v < visibleEndIdx; v++) {
        const vx = MARGIN + offsetX + v * xScale;
        if (vx < -5 || vx > width + 5) continue;
        ctx.beginPath();
        ctx.moveTo(vx, axisY - 2);
        ctx.lineTo(vx, axisY + 2);
        ctx.stroke();
      }

      // Verse reference labels at extreme zoom
      const versePixelWidth = xScale;
      if (versePixelWidth > 14) {
        const verseFontSize = Math.min(14, Math.max(8, Math.floor(versePixelWidth * 0.4)));
        ctx.font = `${verseFontSize}px monospace`;
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        for (let v = visibleStartIdx; v < visibleEndIdx; v++) {
          const vx = MARGIN + offsetX + v * xScale;
          if (vx < -5 || vx > width + 5) continue;
          const ref = indexToVerseRef(v, data.books);
          if (ref) {
            const vText = `${ref.chapter}:${ref.verse}`;
            const verseAlpha = Math.min(1, (versePixelWidth - 14) / 6);
            ctx.globalAlpha = verseAlpha;
            // Dark outline for contrast
            ctx.strokeStyle = "rgba(2, 5, 14, 0.8)";
            ctx.lineWidth = 2;
            ctx.strokeText(vText, vx, axisY + 52);
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.fillText(vText, vx, axisY + 52);
            allVerseLabels.push({
              text: vText,
              x: vx,
              y: axisY + 52,
              fontSize: verseFontSize,
              color: "rgba(255,255,255,0.75)",
              alpha: verseAlpha,
              type: "verse",
              bookId: ref.bookId,
              chapter: ref.chapter,
              verse: ref.verse,
              width: vText.length * verseFontSize * 0.6,
              height: verseFontSize,
            });
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // Store all labels for hit-testing
    renderedLabelsRef.current = [...bookLabels, ...allChapterLabels, ...allVerseLabels];

    // --- Draw selected arc highlight ---
    const selArc = selectedArcRef.current;
    if (selArc) {
      const { fromIdx, toIdx, genreIdx } = selArc;
      const x1 = MARGIN + offsetX + fromIdx * xScale;
      const x2 = MARGIN + offsetX + toIdx * xScale;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const cx = (x1 + x2) / 2;
      const rx = (maxX - minX) / 2;
      const isForward = toIdx > fromIdx;
      const maxArcH = axisY - 20;
      const maxArcHBelow = height - axisY - 30;
      const ry = computeArcRy(fromIdx, toIdx, data.totalVerses, maxArcH, maxArcHBelow, scaleX, axisY, height);

      const genreColor = GENRE_COLOR_LIST[genreIdx % GENRE_COLOR_LIST.length];
      ctx.strokeStyle = genreColor;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();

      const SEGS = 64;
      for (let s = 0; s <= SEGS; s++) {
        const t = s / SEGS;
        const angle = t * Math.PI;
        let px: number, py: number;
        if (isForward) {
          px = cx + rx * Math.cos(Math.PI - angle);
          py = axisY - ry * Math.sin(angle);
        } else {
          px = cx + rx * Math.cos(angle);
          py = axisY + ry * Math.sin(angle);
        }
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw endpoint dots
      ctx.fillStyle = genreColor;
      ctx.beginPath();
      ctx.arc(x1, axisY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, axisY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Draw minimap when zoomed in ---
    if (scaleX > 2) {
      const miniY = 8;
      const miniH = 24;
      const miniLeft = MARGIN;
      const miniRight = width - MARGIN;
      const miniW = miniRight - miniLeft;

      // Background bar
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(miniLeft, miniY, miniW, miniH);

      // Draw book regions as colored segments
      for (const b of data.books) {
        if (!activeBookIds.has(b.id)) continue;
        const bx = miniLeft + (b.offset / data.totalVerses) * miniW;
        const bw = (b.verses / data.totalVerses) * miniW;
        const genreColor = GENRE_COLOR_LIST[b.genre % GENRE_COLOR_LIST.length];
        ctx.fillStyle = genreColor;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(bx, miniY, bw, miniH);
      }
      ctx.globalAlpha = 1;

      // Viewport indicator rectangle
      const visStart = (-offsetX / totalWidth) * miniW + miniLeft;
      const visWidth = (width / totalWidth) * miniW;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        Math.max(miniLeft, visStart),
        miniY,
        Math.max(2, Math.min(miniW, visWidth)),
        miniH
      );
    }

    // --- Draw title ---
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.textAlign = "left";
    const titleY = scaleX > 2 ? 52 : 28;
    ctx.fillText(
      `${data.arcs.length.toLocaleString()} Cross References`,
      16,
      titleY
    );

    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillText("Above: target is later in the Bible", 16, titleY + 16);
    ctx.fillText("Below: target is earlier in the Bible", 16, titleY + 30);

    // --- Zoom indicator with location ---
    if (scaleX > 1.05) {
      const visStartIdx = Math.max(0, Math.floor((-offsetX) / xScale));
      const visEndIdx = Math.min(data.totalVerses - 1, Math.ceil((width - 2 * MARGIN - offsetX) / xScale));
      const startRef = indexToVerseRef(visStartIdx, data.books);
      const endRef = indexToVerseRef(visEndIdx, data.books);

      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "right";

      const zoomText = `${scaleX < 10 ? scaleX.toFixed(1) : Math.round(scaleX)}x`;
      ctx.fillText(zoomText, width - 16, height - 32);

      if (startRef && endRef) {
        const startBook = bookNameMap.get(startRef.bookId) || startRef.bookId;
        const endBook = bookNameMap.get(endRef.bookId) || endRef.bookId;
        const locText = startRef.bookId === endRef.bookId
          ? `${startBook} ${startRef.chapter}\u2013${endRef.chapter}`
          : `${startBook} \u2013 ${endBook}`;
        ctx.fillText(locText, width - 16, height - 16);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaded triggers initial draw after data fetch
  }, [canon, selectedBookId, loaded]);

  // Reusable zoom helpers for controls and keyboard
  const applyZoom = useCallback((factor: number, centerX: number) => {
    const t = transformRef.current;
    const mx = centerX - MARGIN;
    const newScale = Math.max(0.5, Math.min(1000, t.scaleX * factor));
    const scaleChange = newScale / t.scaleX;
    t.offsetX = mx - scaleChange * (mx - t.offsetX);
    t.scaleX = newScale;
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const resetZoom = useCallback(() => {
    transformRef.current = { offsetX: 0, scaleX: 1 };
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [draw]);

  /** Smoothly zoom to center a specific verse range in the viewport */
  const zoomToRange = useCallback((startIdx: number, endIdx: number) => {
    const data = dataRef.current;
    if (!data) return;
    const width = window.innerWidth;
    const baseWidth = width - MARGIN * 2;
    const rangeVerses = endIdx - startIdx;
    // Target: range fills ~60% of viewport
    const targetScale = (baseWidth * 0.6) / (rangeVerses * (baseWidth / data.totalVerses));
    const newScale = Math.max(1, Math.min(1000, targetScale));
    const centerIdx = (startIdx + endIdx) / 2;
    const newOffsetX = (width / 2 - MARGIN) - centerIdx * (baseWidth * newScale / data.totalVerses);
    transformRef.current = { offsetX: newOffsetX, scaleX: newScale };
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // Handle zoom and pan
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const t = transformRef.current;
      const mouseX = e.clientX - MARGIN;

      const newScale = Math.max(0.5, Math.min(1000, t.scaleX * zoomFactor));
      const scaleChange = newScale / t.scaleX;
      t.offsetX = mouseX - scaleChange * (mouseX - t.offsetX);
      t.scaleX = newScale;

      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(draw);
    }

    function handleMouseDown(e: MouseEvent) {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: transformRef.current.offsetX,
      };
      overlay!.style.cursor = "grabbing";
    }

    function handleMouseMove(e: MouseEvent) {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        transformRef.current.offsetX = dragRef.current.startOffsetX + dx;
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Check if hovering over a label — change cursor
      const hitLabel = findLabelAtPoint(e.clientX, e.clientY, renderedLabelsRef.current);
      overlay!.style.cursor = hitLabel ? "pointer" : "grab";
    }

    function handleMouseUp() {
      dragRef.current = null;
      overlay!.style.cursor = "grab";
    }

    function handleClick(e: MouseEvent) {
      if (!dataRef.current) return;
      const data = dataRef.current;
      const { offsetX, scaleX } = transformRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Disambiguate click vs drag
      if (dragRef.current) {
        const dx = Math.abs(e.clientX - dragRef.current.startX);
        const dy = Math.abs(e.clientY - dragRef.current.startY);
        if (dx > 3 || dy > 3) return;
      }

      const clickX = e.clientX;
      const clickY = e.clientY;

      // 1. Check label hit-test first
      const hitLabel = findLabelAtPoint(clickX, clickY, renderedLabelsRef.current);
      if (hitLabel) {
        if (hitLabel.type === "book") {
          onSelectBook(selectedBookId === hitLabel.bookId ? null : hitLabel.bookId);
          setSelectedArc(null);
          setVersePopover(null);
          return;
        }
        if (hitLabel.type === "chapter" && hitLabel.chapter) {
          // Zoom to chapter + show info popover
          const bookData = data.books.find((b) => b.id === hitLabel.bookId);
          const chapters = CHAPTER_VERSES[hitLabel.bookId];
          if (bookData && chapters) {
            let chapterOffset = bookData.offset;
            for (let i = 0; i < hitLabel.chapter - 1 && i < chapters.length; i++) {
              chapterOffset += chapters[i];
            }
            const chapterVerses = chapters[hitLabel.chapter - 1] || 0;
            zoomToRange(chapterOffset, chapterOffset + chapterVerses);
            setVersePopover({
              bookId: hitLabel.bookId,
              chapter: hitLabel.chapter,
              screenX: clickX,
              screenY: clickY,
            });
            setSelectedArc(null);
          }
          return;
        }
        if (hitLabel.type === "verse" && hitLabel.chapter && hitLabel.verse) {
          setVersePopover({
            bookId: hitLabel.bookId,
            chapter: hitLabel.chapter,
            verse: hitLabel.verse,
            screenX: clickX,
            screenY: clickY,
          });
          setSelectedArc(null);
          return;
        }
      }

      // 2. Try arc hit-test
      const activeBookIds = new Set(
        books.filter((bk) => bk.canons.includes(canon)).map((bk) => bk.id)
      );
      const hitIdx = findArcAtPoint(
        clickX,
        clickY,
        data.arcs,
        data.totalVerses,
        offsetX,
        scaleX,
        width,
        height,
        activeBookIds,
        data.books,
        activeVerseSetRef.current || undefined
      );

      if (hitIdx !== null) {
        const arc = data.arcs[hitIdx];
        setSelectedArc({
          arcIndex: hitIdx,
          fromIdx: arc[0],
          toIdx: arc[1],
          genreIdx: arc[2],
          votes: arc.length > 3 ? arc[3] : 0,
          screenX: clickX,
          screenY: clickY,
        });
        setVersePopover(null);
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // 3. Clear selections if clicking elsewhere
      if (selectedArcRef.current) {
        setSelectedArc(null);
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
      }
      if (versePopover) {
        setVersePopover(null);
      }

      // 4. Fall through to book selection on the axis
      const totalWidth = (width - MARGIN * 2) * scaleX;
      const xScale = totalWidth / data.totalVerses;
      const verseIdx = (clickX - MARGIN - offsetX) / xScale;

      for (const b of data.books) {
        if (verseIdx >= b.offset && verseIdx < b.offset + b.verses) {
          const activeIds = new Set(
            books
              .filter((bk) => bk.canons.includes(canon))
              .map((bk) => bk.id)
          );
          if (activeIds.has(b.id)) {
            onSelectBook(selectedBookId === b.id ? null : b.id);
          }
          return;
        }
      }
      onSelectBook(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      const centerX = window.innerWidth / 2;
      if (e.key === "=" || e.key === "+") {
        applyZoom(1.3, centerX);
      } else if (e.key === "-") {
        applyZoom(1 / 1.3, centerX);
      } else if (e.key === "0") {
        resetZoom();
      } else if (e.key === "ArrowLeft") {
        transformRef.current.offsetX += window.innerWidth * 0.1;
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
      } else if (e.key === "ArrowRight") {
        transformRef.current.offsetX -= window.innerWidth * 0.1;
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
      } else if (e.key === "Escape") {
        setSelectedArc(null);
        setVersePopover(null);
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
      }
    }

    overlay.addEventListener("wheel", handleWheel, { passive: false });
    overlay.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    overlay.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      overlay.removeEventListener("wheel", handleWheel);
      overlay.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      overlay.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, applyZoom, resetZoom, zoomToRange, canon, selectedBookId, onSelectBook, versePopover]);

  // Redraw on data load, resize, or prop changes
  useEffect(() => {
    draw();

    const handleResize = () => {
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  // Build arc detail card content
  const arcDetail = selectedArc
    ? (() => {
        const data = dataRef.current;
        if (!data) return null;
        const fromRef = indexToVerseRef(selectedArc.fromIdx, data.books);
        const toRef = indexToVerseRef(selectedArc.toIdx, data.books);
        if (!fromRef || !toRef) return null;
        const fromBook = bookMap.get(fromRef.bookId);
        const toBook = bookMap.get(toRef.bookId);
        const fromColor = fromBook ? GENRE_COLORS[fromBook.genre] : "#888";
        const toColor = toBook ? GENRE_COLORS[toBook.genre] : "#888";
        return { fromRef, toRef, fromColor, toColor, fromBook, toBook };
      })()
    : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <canvas
        ref={glCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
      <canvas
        ref={overlayCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          cursor: "grab",
        }}
      />

      {/* Arc detail card with scripture text */}
      {selectedArc && arcDetail && (
        <div
          style={{
            position: "fixed",
            left: Math.min(selectedArc.screenX + 12, window.innerWidth - 340),
            top: Math.min(Math.max(selectedArc.screenY - 80, 8), window.innerHeight - 350),
            background: "rgba(8, 12, 20, 0.95)",
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 8,
            padding: "14px 16px",
            color: "#e0e0e0",
            fontFamily: "monospace",
            fontSize: 12,
            zIndex: 100,
            maxWidth: 320,
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedArc(null)}
            style={{
              position: "absolute",
              top: 6,
              right: 8,
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            &times;
          </button>

          {/* From verse */}
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={() => {
                onSelectBook(arcDetail.fromRef.bookId);
                setSelectedArc(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: arcDetail.fromColor,
                fontWeight: "bold",
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
                fontFamily: "monospace",
                textDecoration: "underline",
                textDecorationColor: `${arcDetail.fromColor}44`,
              }}
            >
              {formatVerseRef(arcDetail.fromRef)}
            </button>
            {arcDetail.fromBook && (
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginLeft: 6 }}>
                {arcDetail.fromBook.genre}
              </span>
            )}
            {arcTextLoading ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginTop: 4, fontSize: 11 }}>
                Loading...
              </div>
            ) : arcFromText ? (
              <p style={{
                color: "rgba(255,255,255,0.7)",
                fontFamily: "Georgia, serif",
                fontSize: 12,
                lineHeight: "1.5",
                fontStyle: "italic",
                margin: "4px 0 0",
              }}>
                &ldquo;{arcFromText}&rdquo;
              </p>
            ) : null}
          </div>

          {/* Direction indicator */}
          <div style={{ color: "rgba(255,255,255,0.3)", margin: "4px 0", fontSize: 11 }}>
            {selectedArc.toIdx > selectedArc.fromIdx ? "\u2193" : "\u2191"} references
          </div>

          {/* To verse */}
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={() => {
                onSelectBook(arcDetail.toRef.bookId);
                setSelectedArc(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: arcDetail.toColor,
                fontWeight: "bold",
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
                fontFamily: "monospace",
                textDecoration: "underline",
                textDecorationColor: `${arcDetail.toColor}44`,
              }}
            >
              {formatVerseRef(arcDetail.toRef)}
            </button>
            {arcDetail.toBook && (
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginLeft: 6 }}>
                {arcDetail.toBook.genre}
              </span>
            )}
            {arcTextLoading ? (
              <div style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginTop: 4, fontSize: 11 }}>
                Loading...
              </div>
            ) : arcToText ? (
              <p style={{
                color: "rgba(255,255,255,0.7)",
                fontFamily: "Georgia, serif",
                fontSize: 12,
                lineHeight: "1.5",
                fontStyle: "italic",
                margin: "4px 0 0",
              }}>
                &ldquo;{arcToText}&rdquo;
              </p>
            ) : null}
          </div>

          {/* Votes */}
          {selectedArc.votes > 0 && (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginBottom: 6 }}>
              {selectedArc.votes} community votes
            </div>
          )}

          {/* BibleGateway links */}
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <a
              href={getBibleGatewayUrl(arcDetail.fromRef.bookId, arcDetail.fromRef.chapter, arcDetail.fromRef.verse)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: arcDetail.fromColor, fontSize: 10, opacity: 0.7, textDecoration: "none" }}
            >
              Read {getBookName(arcDetail.fromRef.bookId)} &rarr;
            </a>
            <a
              href={getBibleGatewayUrl(arcDetail.toRef.bookId, arcDetail.toRef.chapter, arcDetail.toRef.verse)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: arcDetail.toColor, fontSize: 10, opacity: 0.7, textDecoration: "none" }}
            >
              Read {getBookName(arcDetail.toRef.bookId)} &rarr;
            </a>
          </div>
        </div>
      )}

      {/* Verse/Chapter popover */}
      {versePopover && (
        <VersePopover
          bookId={versePopover.bookId}
          chapter={versePopover.chapter}
          verse={versePopover.verse}
          translation={translation}
          screenX={versePopover.screenX}
          screenY={versePopover.screenY}
          onClose={() => setVersePopover(null)}
          onSelectBook={(id) => {
            onSelectBook(id);
            setVersePopover(null);
          }}
        />
      )}

      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 50,
        }}
      >
        {[
          { label: "+", action: () => applyZoom(1.3, window.innerWidth / 2) },
          { label: "\u2212", action: () => applyZoom(1 / 1.3, window.innerWidth / 2) },
          { label: "1:1", action: () => resetZoom() },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: 32,
              height: 32,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4,
              color: "rgba(255,255,255,0.6)",
              fontSize: label === "1:1" ? 10 : 16,
              fontFamily: "monospace",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
