"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { getReferencesForVerse, type Reference } from "@/lib/verse-index";
import VerseMarginPopover from "./VerseMarginPopover";

// Portal target is document.body on the client; undefined during SSR. The
// popover only opens in response to user interaction, so this is always
// the client branch by the time it's read.
const portalTarget: HTMLElement | null =
  typeof document !== "undefined" ? document.body : null;

/*
 * Positioning: Option B (inline with the superscript) — chosen as the
 * lower-risk option per the brief. The dot is rendered as a child of the
 * verse-number sup and absolutely positioned inside a fixed padding-left
 * slot on that sup (see `.verse-num` / `.verse-margin-dot` in VerseReader).
 */

interface VerseMarginDotProps {
  book: string;
  chapter: number;
  verse: number;
  count: number;
  translation: string;
  onNavigate: (bookId: string, chapter: number, verse: number) => void;
}

const HOVER_DELAY_MS = 150;
const HIDE_DELAY_MS = 120;

export default function VerseMarginDot({
  book,
  chapter,
  verse,
  count,
  translation,
  onNavigate,
}: VerseMarginDotProps) {
  const dotRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [refs, setRefs] = useState<Reference[]>([]);

  const clearTimers = useCallback(() => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const openPopover = useCallback(() => {
    const el = dotRef.current;
    if (!el) return;
    const resolved = getReferencesForVerse(book, chapter, verse);
    if (resolved.length === 0) return;
    setRefs(resolved);
    setAnchorRect(el.getBoundingClientRect());
    setOpen(true);
  }, [book, chapter, verse]);

  const closePopover = useCallback(() => {
    setOpen(false);
    setAnchorRect(null);
    // Return focus to the dot on close
    dotRef.current?.focus({ preventScroll: true });
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimers();
    openTimer.current = window.setTimeout(() => {
      openPopover();
    }, HOVER_DELAY_MS);
  }, [clearTimers, openPopover]);

  const handleMouseLeave = useCallback(() => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setAnchorRect(null);
    }, HIDE_DELAY_MS);
  }, [clearTimers]);

  const handlePopoverEnter = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const handlePopoverLeave = useCallback(() => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setAnchorRect(null);
    }, HIDE_DELAY_MS);
  }, [clearTimers]);

  const handleJump = useCallback(
    (targetBook: string, targetChapter: number, targetVerse: number) => {
      clearTimers();
      setOpen(false);
      setAnchorRect(null);
      onNavigate(targetBook, targetChapter, targetVerse);
    },
    [clearTimers, onNavigate]
  );

  const handleActivate = useCallback(() => {
    clearTimers();
    const resolved =
      refs.length > 0 ? refs : getReferencesForVerse(book, chapter, verse);
    if (resolved.length === 0) return;
    const primary = resolved[0];
    setOpen(false);
    setAnchorRect(null);
    onNavigate(primary.bookId, primary.chapter, primary.verse);
  }, [book, chapter, verse, refs, onNavigate, clearTimers]);

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  const handleFocus = useCallback(() => {
    clearTimers();
    openPopover();
  }, [clearTimers, openPopover]);

  const handleBlur = useCallback(() => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setAnchorRect(null);
    }, HIDE_DELAY_MS);
  }, [clearTimers]);

  return (
    <>
      <span
        ref={dotRef}
        className="verse-margin-dot"
        role="button"
        tabIndex={0}
        aria-label={`${count} cross-references for verse ${verse}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {open && anchorRect && portalTarget &&
        createPortal(
          <VerseMarginPopover
            anchorRect={anchorRect}
            refs={refs}
            translation={translation}
            onJump={handleJump}
            onClose={closePopover}
            onMouseEnter={handlePopoverEnter}
            onMouseLeave={handlePopoverLeave}
          />,
          portalTarget
        )}
    </>
  );
}
