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
  const dragRef = useRef<{ startX: number; startOffsetX: number } | null>(
    null
  );

  // Load arc data
  useEffect(() => {
    fetch("/arc-crossrefs.json")
      .then((r) => r.json())
      .then((data: ArcData) => {
        dataRef.current = data;
        setLoaded(true);
      });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const data = dataRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = "#020509";
    ctx.fillRect(0, 0, width, height);

    const { offsetX, scaleX } = transformRef.current;

    // Layout: axis at vertical center
    const axisY = height * 0.52;
    const margin = 40;
    const totalWidth = (width - margin * 2) * scaleX;
    const xScale = totalWidth / data.totalVerses;

    // Filter books by canon
    const activeBookIds = new Set(
      books.filter((b) => b.canons.includes(canon)).map((b) => b.id)
    );

    // Map book IDs to their data for quick lookup
    const bookDataMap = new Map(data.books.map((b) => [b.id, b]));

    // Determine which verse ranges are active
    const activeRanges: [number, number][] = [];
    for (const b of data.books) {
      if (activeBookIds.has(b.id)) {
        activeRanges.push([b.offset, b.offset + b.verses]);
      }
    }

    function isActiveVerse(idx: number): boolean {
      for (const [start, end] of activeRanges) {
        if (idx >= start && idx < end) return true;
      }
      return false;
    }

    function verseToX(idx: number): number {
      return margin + offsetX + idx * xScale;
    }

    // Selected book range
    let selectedRange: [number, number] | null = null;
    if (selectedBookId) {
      const bd = bookDataMap.get(selectedBookId);
      if (bd) {
        selectedRange = [bd.offset, bd.offset + bd.verses];
      }
    }

    // --- Draw arcs ---
    const maxArcHeight = axisY - 20; // max height for arcs above
    const maxArcHeightBelow = height - axisY - 30; // max height for arcs below

    // Parse genre colors to RGB for alpha blending
    function hexToRgb(hex: string): [number, number, number] {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    }

    const genreRgb = GENRE_KEY_LIST.map((_, i) =>
      hexToRgb(GENRE_COLOR_LIST[i])
    );

    // Sort arcs by distance (draw larger arcs first for better layering)
    const sortedArcs = [...data.arcs].sort(
      (a, b) => Math.abs(b[0] - b[1]) - Math.abs(a[0] - a[1])
    );

    ctx.lineWidth = 0.4;

    // Use additive blending for the glow effect
    ctx.globalCompositeOperation = "lighter";

    for (const arc of sortedArcs) {
      const [fromIdx, toIdx, genreIdx] = arc;

      // Skip if either end is not in active canon
      if (!isActiveVerse(fromIdx) || !isActiveVerse(toIdx)) continue;

      const x1 = verseToX(fromIdx);
      const x2 = verseToX(toIdx);

      // Skip arcs entirely off-screen
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      if (maxX < -50 || minX > width + 50) continue;

      const distance = Math.abs(toIdx - fromIdx);
      const isForward = toIdx > fromIdx; // target is later in Bible

      // Arc height proportional to distance
      const normalizedDist = distance / data.totalVerses;
      const arcHeight = isForward
        ? Math.max(3, normalizedDist * maxArcHeight * 2)
        : Math.max(3, normalizedDist * maxArcHeightBelow * 2);

      // Determine opacity
      let alpha = 0.015;
      if (selectedRange) {
        const fromInSelected =
          fromIdx >= selectedRange[0] && fromIdx < selectedRange[1];
        const toInSelected =
          toIdx >= selectedRange[0] && toIdx < selectedRange[1];
        if (fromInSelected || toInSelected) {
          alpha = 0.08;
        } else {
          alpha = 0.003;
        }
      }

      const rgb = genreRgb[genreIdx % genreRgb.length];
      ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

      const cx = (x1 + x2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = arcHeight;

      ctx.beginPath();
      if (isForward) {
        // Arc above the axis
        ctx.ellipse(cx, axisY, rx, ry, 0, Math.PI, 0);
      } else {
        // Arc below the axis
        ctx.ellipse(cx, axisY, rx, ry, 0, 0, Math.PI);
      }
      ctx.stroke();
    }

    // Reset composite operation for labels
    ctx.globalCompositeOperation = "source-over";

    // --- Draw axis line ---
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin + offsetX, axisY);
    ctx.lineTo(margin + offsetX + totalWidth, axisY);
    ctx.stroke();

    // --- Draw book labels ---
    ctx.font = "9px monospace";
    ctx.textAlign = "center";

    for (const b of data.books) {
      if (!activeBookIds.has(b.id)) continue;

      const bookCenterX = verseToX(b.offset + b.verses / 2);
      if (bookCenterX < -50 || bookCenterX > width + 50) continue;

      const bookStartX = verseToX(b.offset);
      const bookEndX = verseToX(b.offset + b.verses);

      // Book separator tick
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(bookStartX, axisY - 4);
      ctx.lineTo(bookStartX, axisY + 4);
      ctx.stroke();

      // Label
      const isSelected = selectedBookId === b.id;
      const genreColor = GENRE_COLOR_LIST[b.genre % GENRE_COLOR_LIST.length];
      ctx.fillStyle = isSelected ? genreColor : "rgba(255,255,255,0.4)";

      // Only show label if there's enough space
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
  }, [canon, selectedBookId, loaded]);

  // Handle zoom and pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const t = transformRef.current;
      const mouseX = e.clientX - 40; // margin

      // Zoom around mouse position
      const newScale = Math.max(0.5, Math.min(20, t.scaleX * zoomFactor));
      const scaleChange = newScale / t.scaleX;
      t.offsetX = mouseX - scaleChange * (mouseX - t.offsetX);
      t.scaleX = newScale;

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

      // Convert click X to verse index
      const clickX = e.clientX;
      const verseIdx = (clickX - margin - offsetX) / xScale;

      // Find which book this falls in
      for (const b of data.books) {
        if (verseIdx >= b.offset && verseIdx < b.offset + b.verses) {
          const activeBookIds = new Set(
            books.filter((bk) => bk.canons.includes(canon)).map((bk) => bk.id)
          );
          if (activeBookIds.has(b.id)) {
            onSelectBook(
              selectedBookId === b.id ? null : b.id
            );
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
