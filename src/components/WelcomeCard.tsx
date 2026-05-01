"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface WelcomeCardProps {
  onChooseGospel: () => void;
  onChooseExplore: () => void;
}

export default function WelcomeCard({ onChooseGospel, onChooseExplore }: WelcomeCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      <motion.div
        key="welcome-backdrop"
        role="presentation"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(12, 10, 8, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-xl)",
          pointerEvents: "auto",
        }}
      >
        <motion.div
          key="welcome-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-card-wordmark"
          aria-describedby="welcome-card-orientation"
          className="glass-panel"
          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeOut", delay: reduceMotion ? 0 : 0.05 }}
          style={{
            width: "min(440px, 100%)",
            padding: "var(--space-2xl) var(--space-2xl) var(--space-xl)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-xl)",
            textAlign: "center",
          }}
        >
          <span
            id="welcome-card-wordmark"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-2xl)",
              fontVariant: "small-caps",
              letterSpacing: "0.12em",
              color: "var(--accent)",
              lineHeight: 1,
              userSelect: "none",
            }}
          >
            Bible Atlas
          </span>

          <p
            id="welcome-card-orientation"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-lg)",
              lineHeight: 1.5,
              color: "var(--color-text-primary)",
              margin: 0,
              maxWidth: "32ch",
            }}
          >
            A reading tool for Scripture, with cross-references as the map.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
              width: "100%",
              marginTop: "var(--space-sm)",
            }}
          >
            <PrimaryButton onClick={onChooseGospel}>Read today&rsquo;s Gospel</PrimaryButton>
            <SecondaryButton onClick={onChooseExplore}>Explore the map</SecondaryButton>
          </div>
        </motion.div>

        <a
          href="/about"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "fixed",
            right: "var(--space-xl)",
            bottom: "var(--space-xl)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.06em",
            color: "var(--color-text-muted)",
            textDecoration: "none",
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            background: "rgba(20, 20, 40, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            transition: "all 200ms ease-out",
            zIndex: 61,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-text-secondary)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-text-muted)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
          }}
        >
          What is this?
        </a>
      </motion.div>
    </AnimatePresence>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 20px",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        letterSpacing: "0.06em",
        color: "var(--accent)",
        background: "var(--color-accent-muted)",
        border: "1px solid var(--color-accent-border)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        lineHeight: 1,
        transition: "all 200ms ease-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(212, 160, 74, 0.22)";
        e.currentTarget.style.borderColor = "rgba(212, 160, 74, 0.5)";
        e.currentTarget.style.color = "var(--color-accent-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-accent-muted)";
        e.currentTarget.style.borderColor = "var(--color-accent-border)";
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.background = "rgba(212, 160, 74, 0.32)";
        e.currentTarget.style.borderColor = "rgba(212, 160, 74, 0.7)";
        e.currentTarget.style.color = "var(--color-accent-active)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.background = "rgba(212, 160, 74, 0.22)";
        e.currentTarget.style.borderColor = "rgba(212, 160, 74, 0.5)";
        e.currentTarget.style.color = "var(--color-accent-hover)";
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 20px",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        letterSpacing: "0.06em",
        color: "var(--color-text-secondary)",
        background: "transparent",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        lineHeight: 1,
        transition: "all 200ms ease-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--color-text-primary)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--color-text-secondary)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.borderColor = "var(--color-accent-border)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.color = "var(--color-text-primary)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
      }}
    >
      {children}
    </button>
  );
}
