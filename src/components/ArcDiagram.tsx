"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { GENRE_COLORS } from "@/lib/colors";
import { Canon } from "@/lib/types";
import { books } from "@/data/books";

interface ArcData {
  totalVerses: number;
  genres: string[];
  books: { id: string; offset: number; verses: number; genre: number }[];
  arcs: [number, number, number][]; // [fromIndex, toIndex, genreIndex]
}

interface Props {
  canon: Canon;
  selectedBookId: string | null;
  onSelectBook: (id: string | null) => void;
}

const GENRE_COLOR_LIST = Object.values(GENRE_COLORS);
const GENRE_KEY_LIST = Object.keys(GENRE_COLORS);

// Pre-compute genre RGB once at module level — never recomputed
const genreRgb: [number, number, number][] = GENRE_KEY_LIST.map((_, i) => {
  const hex = GENRE_COLOR_LIST[i];
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
});

export default function ArcDiagram({
  canon,
  selectedBookId,
  onSelectBook,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<ArcData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const transformRef = useRef({ offsetX: 0, scaleX: 1 });
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ startX: number; startOffsetX: number } | null>(null);

  // Pre-sorted arcs (sorted once at load, never again)
  const sortedArcsRef = useRef<[number, number, number][] | null>(null);

  // Fast O(1) active-verse lookup: 1 = active, 0 = inactive
  const activeVerseSetRef = useRef<Uint8Array | null>(null);

  // OffscreenCanvas cache: stores the fully-rendered arc layer
  const cacheCanvasRef = useRef<OffscreenCanvas | null>(null);
  // Transform that was in effect when cacheCanvas was last rendered
  const cacheTransformRef = useRef<{ offsetX: number; scaleX: number } | null>(null);
  // Whether the cache is valid (same selection + canon as current draw)
  const cacheValidRef = useRef(false);

  // Interaction state for deferred full-quality re-render
  const isInteractingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track last canvas size to avoid unnecessary resets
  const lastCanvasSizeRef = useRef({ width: 0, height: 0, dpr: 0 });

  // Load arc data and pre-sort once
  useEffect(() => {
    fetch("/arc-crossrefs.json")
      .then((r) => r.json())
      .then((data: ArcData) => {
        dataRef.current = data;
        // Sort by arc distance descending — larger arcs drawn first (done once)
        sortedArcsRef.current = [...data.arcs].sort(
          (a, b) => Math.abs(b[0] - b[1]) - Math.abs(a[0] - a[1])
        );
        setLoaded(true);
      });
  }, []);

  // Rebuild the active-verse Uint8Array whenever canon or data changes
  useEffect(() => {
    const data = dataRef.current;
    if (!data) return;

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
    cacheValidRef.current = false; // invalidate cache on canon change
  }, [canon, loaded]);

  // Core arc-rendering function: draws arcs onto any canvas context
  // Used both for the OffscreenCanvas cache and the main canvas
  const renderArcs = useCallback(
    (
      ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
      width: number,
      height: number,
      offsetX: number,
      scaleX: number
    ) => {
      const data = dataRef.current;
      const sortedArcs = sortedArcsRef.current;
      const activeVerseSet = activeVerseSetRef.current;
      if (!data || !sortedArcs || !activeVerseSet) return;

      const axisY = height * 0.52;
      const margin = 40;
      const totalWidth = (width - margin * 2) * scaleX;
      const xScale = totalWidth / data.totalVerses;

      const maxArcHeight = axisY - 20;
      const maxArcHeightBelow = height - axisY - 30;

      // Determine selected range once
      let selStart = -1;
      let selEnd = -1;
      if (selectedBookId) {
        const bd = data.books.find((b: ArcData["books"][number]) => b.id === selectedBookId);
        if (bd) {
          selStart = bd.offset;
          selEnd = bd.offset + bd.verses;
        }
      }
      const hasSelection = selStart >= 0;

      ctx.lineWidth = 0.4;
      ctx.globalCompositeOperation = "lighter";

      // --- Path batching ---
      // Group arcs by (genreIdx, alphaTier): 10 genres × up to 3 tiers = ≤30 groups
      // alphaTier: 0 = default (0.015), 1 = highlighted (0.08), 2 = dimmed (0.003)
      const NUM_GENRES = genreRgb.length;
      // Each group is an array of arc parameter tuples to draw
      // We store groups as a flat map: key = genreIdx * 3 + alphaTier
      type ArcParams = { cx: number; rx: number; ry: number; isForward: boolean };
      const groups: ArcParams[][] = Array.from(
        { length: NUM_GENRES * 3 },
        () => []
      );

      for (const arc of sortedArcs) {
        const [fromIdx, toIdx, genreIdx] = arc;

        // O(1) active-verse check
        if (!activeVerseSet[fromIdx] || !activeVerseSet[toIdx]) continue;

        const x1 = margin + offsetX + fromIdx * xScale;
        const x2 = margin + offsetX + toIdx * xScale;

        // Viewport cull
        const minX = x1 < x2 ? x1 : x2;
        const maxX = x1 < x2 ? x2 : x1;
        if (maxX < -50 || minX > width + 50) continue;

        const distance = toIdx > fromIdx ? toIdx - fromIdx : fromIdx - toIdx;
        const isForward = toIdx > fromIdx;

        const normalizedDist = distance / data.totalVerses;
        const arcHeight = isForward
          ? Math.max(3, normalizedDist * maxArcHeight * 2)
          : Math.max(3, normalizedDist * maxArcHeightBelow * 2);

        let alphaTier: number;
        if (!hasSelection) {
          alphaTier = 0;
        } else {
          const fromInSel = fromIdx >= selStart && fromIdx < selEnd;
          const toInSel = toIdx >= selStart && toIdx < selEnd;
          alphaTier = fromInSel || toInSel ? 1 : 2;
        }

        const groupKey = (genreIdx % NUM_GENRES) * 3 + alphaTier;
        groups[groupKey].push({
          cx: (x1 + x2) / 2,
          rx: (maxX - minX) / 2,
          ry: arcHeight,
          isForward,
        });
      }

      // Draw each non-empty group as a single batched path
      const alphaValues = [0.015, 0.08, 0.003];
      for (let gi = 0; gi < NUM_GENRES; gi++) {
        const [r, g, b] = genreRgb[gi];
        for (let ai = 0; ai < 3; ai++) {
          const group = groups[gi * 3 + ai];
          if (group.length === 0) continue;

          const alpha = alphaValues[ai];
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.beginPath();
          for (const { cx, rx, ry, isForward } of group) {
            if (isForward) {
              ctx.ellipse(cx, axisY, rx, ry, 0, Math.PI, 0);
            } else {
              ctx.ellipse(cx, axisY, rx, ry, 0, 0, Math.PI);
            }
          }
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "source-over";
    },
    [selectedBookId]
  );

  // Rebuild the OffscreenCanvas cache at current transform + selection
  const rebuildCache = useCallback(
    (width: number, height: number, dpr: number) => {
      const { offsetX, scaleX } = transformRef.current;

      const offscreen = new OffscreenCanvas(width * dpr, height * dpr);
      const octx = offscreen.getContext(
        "2d"
      ) as OffscreenCanvasRenderingContext2D | null;
      if (!octx) return;

      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Transparent background — composited onto main canvas
      octx.clearRect(0, 0, width, height);

      renderArcs(octx, width, height, offsetX, scaleX);

      cacheCanvasRef.current = offscreen;
      cacheTransformRef.current = { offsetX, scaleX };
      cacheValidRef.current = true;
    },
    [renderArcs]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const data = dataRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Only resize canvas when dimensions actually change (avoids full context reset)
    const last = lastCanvasSizeRef.current;
    if (last.width !== width || last.height !== height || last.dpr !== dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      lastCanvasSizeRef.current = { width, height, dpr };
      cacheValidRef.current = false; // size changed, cache stale
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear background
    ctx.fillStyle = "#020509";
    ctx.fillRect(0, 0, width, height);

    const { offsetX, scaleX } = transformRef.current;

    if (isInteractingRef.current && cacheValidRef.current && cacheCanvasRef.current && cacheTransformRef.current) {
      // Fast interaction path: blit cached arc layer with pixel-accurate offset
      const cached = cacheTransformRef.current;
      const margin = 40;
      const totalWidth = (width - margin * 2);

      // How much has the rendered-position shifted since the cache was built?
      // At scale=1, each verse occupies xScale pixels.
      // Cached xScale = totalWidth * cached.scaleX / data.totalVerses
      // Current xScale = totalWidth * scaleX / data.totalVerses
      // We need to transform the cached image to match current transform.
      // Strategy: use ctx.drawImage with a composite transform.
      //
      // The cached image was rendered with offsetX=cached.offsetX, scaleX=cached.scaleX.
      // The axis origin (verse 0) was at: margin + cached.offsetX (in CSS px).
      // Now verse 0 is at: margin + offsetX.
      // Also scale has changed: scaleRatio = scaleX / cached.scaleX
      //
      // So: newX = margin + offsetX + (verseIdx * xScale)
      //          = scaleRatio * (margin + cached.offsetX + verseIdx * cachedXScale) + (margin + offsetX - scaleRatio * (margin + cached.offsetX))
      //
      // The transform for the cached image:
      //   translate by (margin + offsetX - scaleRatio*(margin + cached.offsetX))
      //   scale by scaleRatio
      //   but only horizontally (arc heights stay the same relative to axisY)
      //
      // Since arc heights scale with the viewport height (not transform), and axisY
      // is always height*0.52, we only need horizontal re-mapping.
      // We'll use ctx save/restore with a horizontal-only transform.

      const scaleRatio = scaleX / cached.scaleX;
      const cachedOriginX = margin + cached.offsetX;
      const currentOriginX = margin + offsetX;
      const translateX = currentOriginX - scaleRatio * cachedOriginX;

      ctx.save();
      ctx.transform(scaleRatio, 0, 0, 1, translateX, 0);
      ctx.drawImage(cacheCanvasRef.current, 0, 0, width, height);
      ctx.restore();
    } else {
      // Full-quality path: render arcs directly + update cache
      renderArcs(ctx, width, height, offsetX, scaleX);
      // Rebuild cache in background so next interaction is fast
      rebuildCache(width, height, dpr);
    }

    // --- Draw axis line ---
    const axisY = height * 0.52;
    const margin = 40;
    const totalWidth = (width - margin * 2) * scaleX;

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin + offsetX, axisY);
    ctx.lineTo(margin + offsetX + totalWidth, axisY);
    ctx.stroke();

    // --- Draw book labels ---
    const xScale = totalWidth / data.totalVerses;
    const activeBookIds = new Set(
      books.filter((b) => b.canons.includes(canon)).map((b) => b.id)
    );

    ctx.font = "9px monospace";
    ctx.textAlign = "center";

    for (const b of data.books) {
      if (!activeBookIds.has(b.id)) continue;

      const bookCenterX = margin + offsetX + (b.offset + b.verses / 2) * xScale;
      if (bookCenterX < -50 || bookCenterX > width + 50) continue;

      const bookStartX = margin + offsetX + b.offset * xScale;
      const bookEndX = margin + offsetX + (b.offset + b.verses) * xScale;

      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(bookStartX, axisY - 4);
      ctx.lineTo(bookStartX, axisY + 4);
      ctx.stroke();

      const isSelected = selectedBookId === b.id;
      const genreColor = GENRE_COLOR_LIST[b.genre % GENRE_COLOR_LIST.length];
      ctx.fillStyle = isSelected ? genreColor : "rgba(255,255,255,0.4)";

      if (bookEndX - bookStartX > 20) {
        ctx.fillText(b.id, bookCenterX, axisY + 18);
      }
    }

    // --- Draw title ---
    ctx.globalCompositeOperation = "source-over";
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
  }, [canon, selectedBookId, loaded, renderArcs, rebuildCache]);

  // Invalidate cache whenever selection or canon changes so arcs re-render
  useEffect(() => {
    cacheValidRef.current = false;
  }, [selectedBookId, canon]);

  // Handle zoom and pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function scheduleSettle() {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      isInteractingRef.current = true;
      settleTimerRef.current = setTimeout(() => {
        isInteractingRef.current = false;
        cacheValidRef.current = false; // force full re-render after settling
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
      }, 150);
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const t = transformRef.current;
      const mouseX = e.clientX - 40;

      const newScale = Math.max(0.5, Math.min(20, t.scaleX * zoomFactor));
      const scaleChange = newScale / t.scaleX;
      t.offsetX = mouseX - scaleChange * (mouseX - t.offsetX);
      t.scaleX = newScale;

      scheduleSettle();
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(draw);
    }

    function handleMouseDown(e: MouseEvent) {
      dragRef.current = {
        startX: e.clientX,
        startOffsetX: transformRef.current.offsetX,
      };
    }

    function handleMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      transformRef.current.offsetX = dragRef.current.startOffsetX + dx;
      scheduleSettle();
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
      const margin = 40;
      const width = window.innerWidth;
      const totalWidth = (width - margin * 2) * scaleX;
      const xScale = totalWidth / data.totalVerses;

      const clickX = e.clientX;
      const verseIdx = (clickX - margin - offsetX) / xScale;

      for (const b of data.books) {
        if (verseIdx >= b.offset && verseIdx < b.offset + b.verses) {
          const activeBookIds = new Set(
            books.filter((bk) => bk.canons.includes(canon)).map((bk) => bk.id)
          );
          if (activeBookIds.has(b.id)) {
            onSelectBook(selectedBookId === b.id ? null : b.id);
          }
          return;
        }
      }
      onSelectBook(null);
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("click", handleClick);
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

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        cursor: dragRef.current ? "grabbing" : "grab",
      }}
    />
  );
}
