"use client";

import { useState, useEffect } from "react";

interface ArcZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  zoomLevel: number;
}

export default function ArcZoomControls({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoomLevel,
}: ArcZoomControlsProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const buttonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono)",
    fontSize: 16,
    color: "var(--color-text-secondary)",
    opacity: 0.5,
    transition: "all var(--transition-fast)",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    lineHeight: 1,
  };

  const dividerStyle: React.CSSProperties = {
    width: 1,
    height: 18,
    background: "var(--glass-border)",
    alignSelf: "center",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: isMobile ? 88 : 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 35,
        display: "flex",
        alignItems: "center",
        width: 175,
        height: 36,
        background: "var(--glass-bg)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
        border: "1px solid var(--glass-border)",
        borderRadius: 9999,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* Zoom out */}
      <button
        onClick={onZoomOut}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.5";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.color = "var(--color-accent)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.opacity = "0.85";
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
        aria-label="Zoom out"
      >
        &minus;
      </button>

      <div style={dividerStyle} />

      {/* Zoom percentage */}
      <div
        style={{
          width: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          letterSpacing: "0.04em",
          color: "var(--color-text-secondary)",
          userSelect: "none",
        }}
      >
        {zoomLevel}%
      </div>

      <div style={dividerStyle} />

      {/* Zoom in */}
      <button
        onClick={onZoomIn}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.5";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.color = "var(--color-accent)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.opacity = "0.85";
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
        aria-label="Zoom in"
      >
        +
      </button>

      <div style={dividerStyle} />

      {/* Fit to view */}
      <button
        onClick={onResetZoom}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.5";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.color = "var(--color-accent)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.opacity = "0.85";
          e.currentTarget.style.color = "var(--color-text-secondary)";
        }}
        aria-label="Fit to view"
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Top-left corner with inward arrow */}
          <polyline points="4.5,1 1,1 1,4.5" />
          <line x1="1" y1="1" x2="4.5" y2="4.5" />
          {/* Top-right corner with inward arrow */}
          <polyline points="9.5,1 13,1 13,4.5" />
          <line x1="13" y1="1" x2="9.5" y2="4.5" />
          {/* Bottom-left corner with inward arrow */}
          <polyline points="4.5,13 1,13 1,9.5" />
          <line x1="1" y1="13" x2="4.5" y2="9.5" />
          {/* Bottom-right corner with inward arrow */}
          <polyline points="9.5,13 13,13 13,9.5" />
          <line x1="13" y1="13" x2="9.5" y2="9.5" />
        </svg>
      </button>
    </div>
  );
}
