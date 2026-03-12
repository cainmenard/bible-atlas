"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { GENRE_COLORS } from "@/lib/colors";
import { Canon } from "@/lib/types";
import { books } from "@/data/books";
import { ArcRenderer } from "@/lib/arc-renderer";

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

export default function ArcDiagram({
  canon,
  selectedBookId,
  onSelectBook,
}: Props) {
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ArcRenderer | null>(null);
  const dataRef = useRef<ArcData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const transformRef = useRef({ offsetX: 0, scaleX: 1 });
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ startX: number; startOffsetX: number } | null>(
    null
  );

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
      // WebGL2 not supported — component will render nothing
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
    const margin = 40;
    const totalWidth = (width - margin * 2) * scaleX;

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

      const bookCenterX =
        margin + offsetX + (b.offset + b.verses / 2) * xScale;
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
      const mouseX = e.clientX - 40;

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

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%" }}>
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
    </div>
  );
}
