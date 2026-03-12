"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { GENRE_COLORS } from "@/lib/colors";
import { Canon } from "@/lib/types";
import { books } from "@/data/books";
import { CHAPTER_VERSES } from "@/data/chapter-verses";
import { ArcRenderer } from "@/lib/arc-renderer";
import { indexToVerseRef, formatVerseRef } from "@/lib/verse-index";
import {
  computeBookLabels,
  computeChapterLabels,
  type LabelItem,
  type TickItem,
} from "@/lib/label-layout";

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

interface Props {
  canon: Canon;
  selectedBookId: string | null;
  onSelectBook: (id: string | null) => void;
}

const GENRE_COLOR_LIST = Object.values(GENRE_COLORS);
const MARGIN = 40;

/** Find the arc closest to a screen point. Returns arc index or null. */
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

    const distance = Math.abs(toIdx - fromIdx);
    const normalizedDist = distance / totalVerses;
    const ry = isForward
      ? Math.max(3, normalizedDist * maxArcHeight * 2)
      : Math.max(3, normalizedDist * maxArcHeightBelow * 2);

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
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.5;
    for (const b of data.books) {
      if (!activeBookIds.has(b.id)) continue;
      const bookStartX = MARGIN + offsetX + b.offset * xScale;
      const bookEndX = MARGIN + offsetX + (b.offset + b.verses) * xScale;
      if (bookEndX < -50 || bookStartX > width + 50) continue;
      ctx.beginPath();
      ctx.moveTo(bookStartX, axisY - 4);
      ctx.lineTo(bookStartX, axisY + 4);
      ctx.stroke();
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
      for (const item of bookLabels) {
        const font = `${item.fontSize}px monospace`;
        if (font !== curFont) { ctx.font = font; curFont = font; }
        ctx.globalAlpha = item.alpha;
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
      }
      ctx.globalAlpha = 1;
    }

    // --- Batch-draw chapter labels (sorted by font size) ---
    allChapterLabels.sort((a, b) => a.fontSize - b.fontSize);
    {
      let curFont = "";
      for (const item of allChapterLabels) {
        const font = `${item.fontSize}px monospace`;
        if (font !== curFont) { ctx.font = font; curFont = font; }
        ctx.globalAlpha = item.alpha;
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, item.x, item.y);
      }
      ctx.globalAlpha = 1;
    }

    // --- Verse ticks (deep zoom) ---
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
        ctx.font = "8px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.globalAlpha = Math.min(1, (versePixelWidth - 14) / 10);
        for (let v = visibleStartIdx; v < visibleEndIdx; v++) {
          const vx = MARGIN + offsetX + v * xScale;
          if (vx < -5 || vx > width + 5) continue;
          const ref = indexToVerseRef(v, data.books);
          if (ref) {
            ctx.fillText(`${ref.chapter}:${ref.verse}`, vx, axisY + 38);
          }
        }
        ctx.globalAlpha = 1;
      }
    }

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
      const distance = Math.abs(toIdx - fromIdx);
      const normalizedDist = distance / data.totalVerses;
      const maxArcH = axisY - 20;
      const maxArcHBelow = height - axisY - 30;
      const ry = isForward
        ? Math.max(3, normalizedDist * maxArcH * 2)
        : Math.max(3, normalizedDist * maxArcHBelow * 2);

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

    // --- Draw title ---
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.textAlign = "left";
    ctx.fillText(
      `${data.arcs.length.toLocaleString()} Cross References`,
      16,
      28
    );

    ctx.font = "10px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillText("Above: target is later in the Bible", 16, 44);
    ctx.fillText("Below: target is earlier in the Bible", 16, 58);

    // --- Zoom indicator ---
    if (scaleX > 1.05) {
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.textAlign = "right";
      ctx.fillText(
        `${scaleX < 10 ? scaleX.toFixed(1) : Math.round(scaleX)}x`,
        width - 16,
        height - 16
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaded triggers initial draw after data fetch
  }, [canon, selectedBookId, loaded]);

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
    }

    function handleMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      transformRef.current.offsetX = dragRef.current.startOffsetX + dx;
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(draw);
    }

    function handleMouseUp() {
      dragRef.current = null;
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

      // Try arc hit-test first
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
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Clear arc selection if clicking elsewhere
      if (selectedArcRef.current) {
        setSelectedArc(null);
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
      }

      // Fall through to book selection
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

    overlay.addEventListener("wheel", handleWheel, { passive: false });
    overlay.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    overlay.addEventListener("click", handleClick);

    return () => {
      overlay.removeEventListener("wheel", handleWheel);
      overlay.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      overlay.removeEventListener("click", handleClick);
    };
  }, [draw, canon, selectedBookId, onSelectBook]);

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

  // Build arc tooltip content
  const tooltipContent = selectedArc
    ? (() => {
        const data = dataRef.current;
        if (!data) return null;
        const fromRef = indexToVerseRef(selectedArc.fromIdx, data.books);
        const toRef = indexToVerseRef(selectedArc.toIdx, data.books);
        if (!fromRef || !toRef) return null;
        const genreColor =
          GENRE_COLOR_LIST[selectedArc.genreIdx % GENRE_COLOR_LIST.length];
        return { fromRef, toRef, genreColor };
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
      {/* Arc info tooltip */}
      {selectedArc && tooltipContent && (
        <div
          style={{
            position: "absolute",
            left: Math.min(
              selectedArc.screenX + 12,
              window.innerWidth - 280
            ),
            top: Math.min(
              selectedArc.screenY - 60,
              window.innerHeight - 120
            ),
            background: "rgba(8, 12, 20, 0.92)",
            border: `1px solid ${tooltipContent.genreColor}44`,
            borderLeft: `3px solid ${tooltipContent.genreColor}`,
            borderRadius: "6px",
            padding: "10px 14px",
            color: "#e0e0e0",
            fontFamily: "monospace",
            fontSize: "12px",
            pointerEvents: "none",
            zIndex: 100,
            maxWidth: "280px",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ color: tooltipContent.genreColor, fontWeight: "bold", marginBottom: 4 }}>
            {formatVerseRef(tooltipContent.fromRef)}
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", margin: "2px 0" }}>
            {selectedArc.toIdx > selectedArc.fromIdx ? "→" : "←"} references
          </div>
          <div style={{ color: tooltipContent.genreColor, fontWeight: "bold", marginBottom: 4 }}>
            {formatVerseRef(tooltipContent.toRef)}
          </div>
          {selectedArc.votes > 0 && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", marginTop: 4 }}>
              {selectedArc.votes} community votes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
