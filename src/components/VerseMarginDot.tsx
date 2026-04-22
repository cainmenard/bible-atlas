"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { getReferencesForVerse, type Reference } from "@/lib/verse-index";
import VerseMarginPopover from "./VerseMarginPopover";

const portalTarget: HTMLElement | null =
  typeof document !== "undefined" ? document.body : null;

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  // Ref tracks pinned synchronously so timeout callbacks always see current value.
  const pinnedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [refs, setRefs] = useState<Reference[]>([]);
  const popoverId = useId();

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
    const el = buttonRef.current;
    if (!el) return;
    const resolved = getReferencesForVerse(book, chapter, verse);
    if (resolved.length === 0) return;
    setRefs(resolved);
    setAnchorRect(el.getBoundingClientRect());
    setOpen(true);
  }, [book, chapter, verse]);

  const closePopover = useCallback(() => {
    pinnedRef.current = false;
    setPinned(false);
    setOpen(false);
    setAnchorRect(null);
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimers();
    openTimer.current = window.setTimeout(openPopover, HOVER_DELAY_MS);
  }, [clearTimers, openPopover]);

  const handleMouseLeave = useCallback(() => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      if (pinnedRef.current) return;
      setOpen(false);
      setAnchorRect(null);
    }, HIDE_DELAY_MS);
  }, [clearTimers]);

  const handleFocus = useCallback(() => {
    clearTimers();
    openPopover();
  }, [clearTimers, openPopover]);

  const handleBlur = useCallback(() => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      if (pinnedRef.current) return;
      setOpen(false);
      setAnchorRect(null);
    }, HIDE_DELAY_MS);
  }, [clearTimers]);

  const handleClick = useCallback(() => {
    clearTimers();
    if (!open) {
      openPopover();
      pinnedRef.current = true;
      setPinned(true);
    } else if (pinned) {
      closePopover();
    } else {
      pinnedRef.current = true;
      setPinned(true);
    }
  }, [open, pinned, clearTimers, openPopover, closePopover]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closePopover();
      }
    },
    [handleClick, closePopover]
  );

  const handlePopoverEnter = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const handlePopoverLeave = useCallback(() => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      if (pinnedRef.current) return;
      setOpen(false);
      setAnchorRect(null);
    }, HIDE_DELAY_MS);
  }, [clearTimers]);

  const handleJump = useCallback(
    (targetBook: string, targetChapter: number, targetVerse: number) => {
      clearTimers();
      pinnedRef.current = false;
      setPinned(false);
      setOpen(false);
      setAnchorRect(null);
      onNavigate(targetBook, targetChapter, targetVerse);
    },
    [clearTimers, onNavigate]
  );

  // Dismiss when the user clicks outside the button+popover while pinned.
  useEffect(() => {
    if (!pinned) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const popoverEl = document.getElementById(popoverId);
      if (popoverEl?.contains(target)) return;
      closePopover();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pinned, closePopover, popoverId]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="verse-num verse-num-interactive"
        data-has-xref={String(count)}
        aria-label={`Verse ${verse}, ${count} cross-references`}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-haspopup="dialog"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <span className="verse-margin-dot" aria-hidden="true" />
        {verse}
      </button>
      {open && anchorRect && portalTarget &&
        createPortal(
          <VerseMarginPopover
            id={popoverId}
            anchorRect={anchorRect}
            refs={refs}
            translation={translation}
            pinned={pinned}
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
