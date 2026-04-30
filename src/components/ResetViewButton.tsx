"use client";

import React, { useState, useEffect } from "react";

interface ResetViewButtonProps {
  isVisible: boolean;
  onReset: () => void;
}

export default function ResetViewButton({ isVisible, onReset }: ResetViewButtonProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <button
      onClick={onReset}
      title="Reset view"
      aria-label="Reset view"
      style={{
        position: "fixed",
        bottom: isMobile ? 88 : 28,
        // Sits to the right of the ArcZoomControls pill (~168px wide, centered at 50%)
        left: "calc(50% + 96px)",
        zIndex: 35,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 36,
        padding: "0 14px",
        background: "rgba(20, 20, 40, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: 18,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--color-text-secondary)",
        cursor: "pointer",
        opacity: isVisible ? 0.5 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        transition: "all 200ms ease-out",
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.opacity = "0.8";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.opacity = isVisible ? "0.5" : "0";
      }}
      onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.borderColor = "rgba(212, 160, 74, 0.3)";
      }}
      onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.color = "var(--color-text-secondary)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
        e.currentTarget.style.opacity = "0.8";
      }}
    >
      {/* ↺ circular return arrow */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3.5 8A4.5 4.5 0 1 0 5.2 4.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <polyline
          points="2,2 5.2,4.2 3,7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Reset view</span>
    </button>
  );
}
