"use client";

import {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { getPreference, setPreference } from "@/lib/preferences";
import type { ViewMode, BibleBook } from "@/lib/types";

type HintId = "search" | "click-arc" | "scroll-zoom" | "drag-pan";

interface CursorHintsProps {
  viewMode: ViewMode;
  isDetailPanelOpen: boolean;
  isReadingPaneOpen: boolean;
  isSearchOpen: boolean;
  hoveredBook: BibleBook | null;
}

interface PredicateCtx {
  viewMode: ViewMode;
  isDetailPanelOpen: boolean;
  cursorOverPanel: boolean;
  isSearchOpen: boolean;
  isReadingPaneOpen: boolean;
  hoveredBook: BibleBook | null;
}

interface HintConfig {
  id: HintId;
  label: string;
  glyph: ReactNode;
  visible: (c: PredicateCtx) => boolean;
}

type Phase = "first-a" | "first-b" | "hidden" | "idle";

const PAIR_A: HintId[] = ["scroll-zoom", "drag-pan"];
const PAIR_B: HintId[] = ["click-arc", "search"];
const IDLE_PRIORITY: HintId[] = ["search", "click-arc", "scroll-zoom", "drag-pan"];
const PAIR_DURATION_MS = 4000;
const IDLE_THRESHOLD_MS = 30_000;
const IDLE_DISMISS_MOVEMENT_PX = 20;
const DRAG_PAN_MIN_PX = 12;
const ORBIT_RADIUS = 90;

// 45° NE (upper-right): dx > 0, dy < 0 (screen y grows downward)
const NE_DX = ORBIT_RADIUS * Math.cos(-Math.PI / 4);
const NE_DY = ORBIT_RADIUS * Math.sin(-Math.PI / 4);
// 225° SW (lower-left): dx < 0, dy > 0
const SW_DX = ORBIT_RADIUS * Math.cos((3 * Math.PI) / 4);
const SW_DY = ORBIT_RADIUS * Math.sin((3 * Math.PI) / 4);

const accentGlyphStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-accent)",
  lineHeight: 1,
};

const symbolGlyphStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--color-text-secondary)",
  lineHeight: 1,
};

const HINTS: Record<HintId, HintConfig> = {
  search: {
    id: "search",
    label: "Press / to search",
    glyph: <span style={accentGlyphStyle}>/</span>,
    visible: (c) => !c.isSearchOpen && !c.isReadingPaneOpen,
  },
  "click-arc": {
    id: "click-arc",
    label: "Click any arc",
    glyph: <span style={symbolGlyphStyle}>◉</span>,
    visible: (c) =>
      c.viewMode === "arcs" && !c.cursorOverPanel && c.hoveredBook === null,
  },
  "scroll-zoom": {
    id: "scroll-zoom",
    label: "Scroll to wander deeper",
    glyph: <span style={symbolGlyphStyle}>↕</span>,
    visible: (c) => c.viewMode === "arcs" && !c.cursorOverPanel,
  },
  "drag-pan": {
    id: "drag-pan",
    label: "Drag to follow the line",
    glyph: <span style={symbolGlyphStyle}>↔</span>,
    visible: (c) => c.viewMode === "arcs" && !c.cursorOverPanel,
  },
};

function readDismissed(): boolean {
  return getPreference<boolean>("cursor-hints-dismissed") === true;
}

function readSatisfied(): Set<HintId> {
  const raw = getPreference<HintId[]>("cursor-hints-satisfied");
  return new Set(Array.isArray(raw) ? raw : []);
}

function persistSatisfied(set: Set<HintId>): void {
  setPreference<HintId[]>("cursor-hints-satisfied", Array.from(set));
}

function pickIdleHints(satisfied: Set<HintId>, ctx: PredicateCtx): HintId[] {
  // filter → prioritize → slice(0, 2)
  const filtered = (Object.keys(HINTS) as HintId[]).filter(
    (id) => !satisfied.has(id) && HINTS[id].visible(ctx),
  );
  filtered.sort(
    (a, b) => IDLE_PRIORITY.indexOf(a) - IDLE_PRIORITY.indexOf(b),
  );
  return filtered.slice(0, 2);
}

interface RenderedHint {
  id: HintId;
  config: HintConfig;
  position: "ne" | "sw";
}

export default function CursorHints({
  viewMode,
  isDetailPanelOpen,
  isReadingPaneOpen,
  isSearchOpen,
  hoveredBook,
}: CursorHintsProps) {
  const [enabled, setEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [satisfied, setSatisfied] = useState<Set<HintId>>(() => new Set());
  const [cursorOverPanel, setCursorOverPanel] = useState(false);

  // Refs that mirror state for use inside event handlers / rAF loops.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef({ x: -1000, y: -1000 });
  const overPanelRef = useRef(false);
  const phaseRef = useRef<Phase>("hidden");
  const satisfiedRef = useRef<Set<HintId>>(new Set());
  const viewModeRef = useRef(viewMode);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const idleLastMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const anyHintShownRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const rafScheduledRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    satisfiedRef.current = satisfied;
  }, [satisfied]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // Mount gate: desktop pointer + initial preference state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!hover.matches) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(reduced.matches);

    const dismissed = readDismissed();
    setSatisfied(readSatisfied());
    setEnabled(true);
    setPhase(dismissed ? "hidden" : "first-a");
  }, []);

  const markSatisfied = useCallback((id: HintId) => {
    setSatisfied((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persistSatisfied(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setPreference<boolean>("cursor-hints-dismissed", true);
    setPhase("hidden");
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // Cursor follow + per-frame panel-rect check.
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      rafScheduledRef.current = false;
      const root = rootRef.current;
      if (root) {
        root.style.transform = `translate3d(${cursorRef.current.x}px, ${cursorRef.current.y}px, 0)`;
      }
      const panel = document.querySelector(
        ".detail-panel-container",
      ) as HTMLElement | null;
      let over = false;
      if (panel) {
        const rect = panel.getBoundingClientRect();
        const { x, y } = cursorRef.current;
        over =
          x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      }
      if (over !== overPanelRef.current) {
        overPanelRef.current = over;
        setCursorOverPanel(over);
      }
    };

    const scheduleTick = () => {
      if (rafScheduledRef.current) return;
      rafScheduledRef.current = true;
      rafIdRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };

      // Idle re-engagement: any cursor move resets the 30s timer.
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      // If currently in idle phase, large movement dismisses the hints.
      if (phaseRef.current === "idle") {
        const dx = e.clientX - idleLastMoveRef.current.x;
        const dy = e.clientY - idleLastMoveRef.current.y;
        if (dx * dx + dy * dy > IDLE_DISMISS_MOVEMENT_PX * IDLE_DISMISS_MOVEMENT_PX) {
          setPhase("hidden");
        }
      } else {
        idleLastMoveRef.current = { x: e.clientX, y: e.clientY };
      }
      idleTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== "hidden") return;
        idleLastMoveRef.current = { ...cursorRef.current };
        setPhase("idle");
      }, IDLE_THRESHOLD_MS);

      scheduleTick();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [enabled]);

  // Esc to dismiss (window-scoped).
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phaseRef.current === "first-a" || phaseRef.current === "first-b") {
        dismissAll();
      } else if (phaseRef.current === "idle") {
        setPhase("hidden");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, dismissAll]);

  // Search satisfaction: detect false → true transition on isSearchOpen.
  const prevSearchOpen = useRef(isSearchOpen);
  useEffect(() => {
    if (!enabled) return;
    if (!prevSearchOpen.current && isSearchOpen) {
      markSatisfied("search");
    }
    prevSearchOpen.current = isSearchOpen;
  }, [enabled, isSearchOpen, markSatisfied]);

  // click-arc, scroll-zoom, drag-pan satisfaction listeners.
  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      if (viewModeRef.current !== "arcs") return;
      if (e.target instanceof HTMLCanvasElement) {
        markSatisfied("click-arc");
      }
    };
    const onWheel = () => {
      if (viewModeRef.current !== "arcs") return;
      if (overPanelRef.current) return;
      markSatisfied("scroll-zoom");
    };
    const onPointerDown = (e: PointerEvent) => {
      if (viewModeRef.current !== "arcs") return;
      if (!(e.target instanceof HTMLCanvasElement)) return;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (dx * dx + dy * dy > DRAG_PAN_MIN_PX * DRAG_PAN_MIN_PX) {
        markSatisfied("drag-pan");
        dragStartRef.current = null;
      }
    };
    const onPointerUp = () => {
      dragStartRef.current = null;
    };

    window.addEventListener("click", onClick);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [enabled, markSatisfied]);

  // Predicate context for filtering hints during render.
  const ctx = useMemo<PredicateCtx>(
    () => ({
      viewMode,
      isDetailPanelOpen,
      cursorOverPanel,
      isSearchOpen,
      isReadingPaneOpen,
      hoveredBook,
    }),
    [
      viewMode,
      isDetailPanelOpen,
      cursorOverPanel,
      isSearchOpen,
      isReadingPaneOpen,
      hoveredBook,
    ],
  );

  // Compute which hints to render given current phase + satisfied + ctx.
  const rendered = useMemo<RenderedHint[]>(() => {
    if (phase === "hidden" || !enabled) return [];
    if (phase === "idle") {
      if (ctx.isDetailPanelOpen) return [];
      const ids = pickIdleHints(satisfied, ctx);
      return ids.map((id, i) => ({
        id,
        config: HINTS[id],
        position: i === 0 ? "ne" : "sw",
      }));
    }
    const pair = phase === "first-a" ? PAIR_A : PAIR_B;
    const visible = pair
      .map((id) => ({ id, config: HINTS[id] }))
      .filter(({ id, config }) => !satisfied.has(id) && config.visible(ctx));
    return visible.map((h, i) => ({
      ...h,
      position: i === 0 ? "ne" : "sw",
    }));
  }, [phase, enabled, satisfied, ctx]);

  // Track whether any hint actually rendered during first-visit, so we know
  // whether to set the dismissed flag at the end.
  useEffect(() => {
    if ((phase === "first-a" || phase === "first-b") && rendered.length > 0) {
      anyHintShownRef.current = true;
    }
  }, [phase, rendered.length]);

  // Phase advancement timers + auto-skip when a pair has no visible hints.
  useEffect(() => {
    if (!enabled) return;
    if (phase !== "first-a" && phase !== "first-b") return;

    const advance = () => {
      if (phase === "first-a") {
        setPhase("first-b");
      } else {
        if (anyHintShownRef.current) {
          setPreference<boolean>("cursor-hints-dismissed", true);
        }
        setPhase("hidden");
      }
    };

    if (rendered.length === 0) {
      // Pair filtered to nothing — advance immediately on next tick.
      const t = setTimeout(advance, 0);
      return () => clearTimeout(t);
    }

    const t = setTimeout(advance, PAIR_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase, rendered.length, enabled]);

  if (!enabled) return null;

  // Motion timing — flat 200ms for reduced motion; otherwise pair-specific.
  const isIdle = phase === "idle";
  const fadeIn = reducedMotion ? 0.2 : isIdle ? 0.6 : 0.4;
  const fadeOut = reducedMotion ? 0.2 : isIdle ? 0.25 : 0.2;
  const stagger = reducedMotion ? 0 : 0.08;
  const maxOpacity = isIdle ? 0.55 : 0.85;

  return (
    <div
      ref={rootRef}
      aria-live="polite"
      // above ArcDiagram canvas (z-0) and ArcZoomControls (z-35),
      // below DetailPanel/ReadingPane (z-40), Tooltip (z-100), and SearchPalette overlay (z-90+)
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        pointerEvents: "none",
        zIndex: 38,
        willChange: "transform",
      }}
    >
      <AnimatePresence>
        {rendered.map((h, i) => {
          const dx = h.position === "ne" ? NE_DX : SW_DX;
          const dy = h.position === "ne" ? NE_DY : SW_DY;
          const labelSide = h.position === "ne" ? "right" : "left";
          return (
            <motion.div
              key={h.id}
              initial={{ opacity: 0 }}
              animate={{
                opacity: maxOpacity,
                transition: {
                  duration: fadeIn,
                  delay: i * stagger,
                  ease: "easeOut",
                },
              }}
              exit={{
                opacity: 0,
                transition: { duration: fadeOut, ease: "easeIn" },
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: `translate3d(${dx}px, ${dy}px, 0)`,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexDirection: labelSide === "right" ? "row" : "row-reverse",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(var(--glass-blur))",
                  WebkitBackdropFilter: "blur(var(--glass-blur))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                {h.config.glyph}
              </div>
              <span
                className="glass-panel"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.02em",
                  color: "var(--color-text-secondary)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {h.config.label}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
