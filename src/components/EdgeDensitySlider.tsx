"use client";

import { useState, useRef, useCallback } from "react";

export type DensityStop = "sparse" | "low" | "medium" | "high" | "dense";

export const DENSITY_THRESHOLDS: Record<DensityStop, number> = {
  sparse: 10,
  low: 7,
  medium: 5,
  high: 3,
  dense: 1,
};

const STOPS: DensityStop[] = ["sparse", "low", "medium", "high", "dense"];
const TRACK_WIDTH = 200;

interface Props {
  value: DensityStop;
  onChange: (density: DensityStop) => void;
}

export default function EdgeDensitySlider({ value, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const stopIndex = STOPS.indexOf(value);
  const pct = (stopIndex / (STOPS.length - 1)) * 100;
  const thumbSize = isHovered || isDragging ? 14 : 12;

  const getStopFromClientX = useCallback((clientX: number): DensityStop => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (STOPS.length - 1));
    return STOPS[idx];
  }, [value]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);

    const emit = (clientX: number) => {
      const now = performance.now();
      if (now - lastFrameTimeRef.current < 16.67) return;
      lastFrameTimeRef.current = now;
      onChange(getStopFromClientX(clientX));
    };

    emit(e.clientX);

    function onMouseMove(ev: MouseEvent) {
      if (isDraggingRef.current) emit(ev.clientX);
    }
    function onMouseUp() {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [onChange, getStopFromClientX]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current) return;
    onChange(getStopFromClientX(e.clientX));
  }, [onChange, getStopFromClientX]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = STOPS.indexOf(value);
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      if (idx < STOPS.length - 1) onChange(STOPS[idx + 1]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      if (idx > 0) onChange(STOPS[idx - 1]);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(STOPS[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(STOPS[STOPS.length - 1]);
    }
  }, [value, onChange]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, userSelect: "none" }}>
      {/* Label above track */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--text-secondary)",
          letterSpacing: "0.04em",
        }}
      >
        Connection density
      </span>

      {/* Track container */}
      <div
        ref={trackRef}
        style={{
          position: "relative",
          width: TRACK_WIDTH,
          height: 24,
          cursor: "pointer",
        }}
        onClick={handleTrackClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 2,
            transform: "translateY(-50%)",
            background: "rgba(74, 74, 90, 0.4)",
            borderRadius: 1,
            pointerEvents: "none",
          }}
        />

        {/* Tick marks at 0/25/50/75/100% */}
        {STOPS.map((_, i) => {
          const tickPct = (i / (STOPS.length - 1)) * 100;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: `${tickPct}%`,
                transform: "translate(-50%, -50%)",
                width: 1,
                height: 6,
                background: "var(--text-dim)",
                opacity: 0.6,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Thumb (drag handle + slider role) */}
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={stopIndex}
          aria-valuetext={value}
          aria-label="Connection density"
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            position: "absolute",
            top: "50%",
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            width: thumbSize,
            height: thumbSize,
            borderRadius: "50%",
            background: "var(--accent)",
            cursor: isDragging ? "grabbing" : "grab",
            outline: isFocused ? "2px solid rgba(212, 160, 74, 0.6)" : "none",
            outlineOffset: 2,
            boxShadow: isDragging
              ? "0 0 6px rgba(212, 160, 74, 0.3)"
              : "none",
            transition: isDragging
              ? "width 200ms ease-out, height 200ms ease-out, box-shadow 200ms ease-out"
              : "width 200ms ease-out, height 200ms ease-out, left 200ms ease-out, box-shadow 200ms ease-out",
            zIndex: 1,
          }}
        />
      </div>

      {/* Stop name below track */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "var(--accent)",
          letterSpacing: "0.06em",
          textTransform: "lowercase",
        }}
      >
        {value}
      </span>
    </div>
  );
}
