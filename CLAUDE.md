# Bible Atlas — Design System & Development Rules

Every change to this project must follow these rules without exception.

---

## Project Context

Bible Atlas is a reading tool for Scripture with a cross-reference visualization as its navigation layer. On first load it opens directly to today's Gospel reading in the inline verse reader, with the visualization behind it filtered to today's lectionary books. A returning user who viewed a passage within the last 14 days is restored to that passage via a "Continue reading" chip.

Primary navigation is the **Cmd+K / `/` search palette** (`SearchPalette`), which parses book names, chapter/verse references (`john 3:16`, `mk4:1`), genres (`gospels`, `prophets`), and surfaces recent passages. The visualization views — **Arc** (default) and **Constellation** — are secondary entry points into the same drill-down.

Users can filter by:
- Canon: Catholic, Protestant, Ethiopian, Orthodox
- Translation: RSV-CE, JB, KJV (plus WEB, Douay-Rheims)
- Edge density (connection density threshold)

---

## Keeping CLAUDE.md current

Every session must leave CLAUDE.md accurate. Before committing, check whether this session's changes meaningfully affect what future sessions need to know. If yes, update CLAUDE.md in the same commit.

**Update CLAUDE.md when the session:**

- Adds a new component in `src/components/` → add to File Structure with one-sentence description
- Adds a new file in `src/lib/` or `src/data/` → add to File Structure with one-sentence description
- Deletes a component or lib file that was previously documented → remove it
- Introduces a new architectural pattern (caching, state management, persistence, data attributes that serve as attachment points) → document it in Architecture Patterns
- Adds a file that shouldn't be modified by future sessions → add to the "Do NOT modify" list
- Changes the product thesis, default behavior, or primary user flow → update Project Context and Core Interaction Model

**Do NOT update CLAUDE.md for:**

- Bug fixes that don't change architecture
- Styling tweaks already covered by the design system
- Implementation details: cache sizes, debounce values, animation durations, color hex codes already in tokens.css
- One-off refactors that don't introduce new patterns
- Performance improvements that don't change the public interface

**When updating:**

- Keep the diff minimal. Preserve sections that are still accurate; do NOT rewrite for rewriting's sake.
- One sentence per component or lib file is enough. CLAUDE.md is a map, not a manual.
- Commit the CLAUDE.md update in the same commit as the code change. A separate doc-only commit makes the history harder to follow.
- If unsure whether a change warrants an update, skip it. Over-documentation drifts faster than under-documentation.

This section is a standing directive. Every future session reads it and acts on it automatically.

---

## Core Interaction Model

The visualization surfaces cross-reference structure; the `DetailPanel` is where reading happens. Opening a book drills from book → chapter → verse, and at the verse level `VerseReader` renders the full passage with margin dots that expose outbound cross-references. `ReadingPane` is a separate expanded view for liturgical readings (first reading, psalm, gospel, etc.) reached from `ReadingsPill`. Default state on first load is driven by the daily lectionary: today's Gospel opens in the reader, unless the user has either (a) a persisted last-passage within 14 days, or (b) dismissed today's readings, in which case `ReadingPlanCard` shows the M'Cheyne plan for the day.

---

## Typography

**Two fonts only. No exceptions.**

| Font | Usage |
|------|-------|
| **Cormorant Garamond** (fallback: EB Garamond) | All content text, headings, reading references, body copy |
| **JetBrains Mono** | All labels, data values, UI chrome, navigation items, counts, metadata |

- Import both from Google Fonts.
- No other fonts. No system fonts in any visible UI element.

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0a0a12` – `#12121f` range | Page background. Never pure black. |
| Primary accent | `#d4a04a` (warm amber) | Active states, title wordmark, key emphasis. Used sparingly. |
| Text primary | `#e8e0d0` (warm off-white) | Body text, headings |
| Text secondary | `#8a8a9a` (muted) | Supporting text, labels |
| Text dim | `#4a4a5a` (very muted) | Placeholders, disabled states |
| Glass panel bg | `rgba(20, 20, 40, 0.7)` | Floating panels, cards |
| Glass border | `rgba(255, 255, 255, 0.06)` | 1px border on glass elements |

Liturgical season colors are used **only** for the Today's Readings card border and season indicator dot.

---

## Interaction States

Every interactive element has exactly **three states**:

| State | Appearance |
|-------|-----------|
| **Rest** | Dim, receding, low opacity (40–50%) |
| **Hover** | Present, slightly brighter (70–80%), subtle transition |
| **Active** | Glowing, amber-tinted, full presence |

- All state changes use `transition: all 200ms ease-out`. No instant switches.

---

## Glass Morphism

All floating panels use dark glass — the visualization must be faintly visible through them.

```css
background: rgba(20, 20, 40, 0.7); /* alpha 0.7–0.85 */
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.06);
```

- No solid backgrounds on any overlapping elements.

---

## No Browser Defaults

Zero native form controls. Every input, slider, select, button, and toggle is custom-built.

> If it looks like it came from a browser stylesheet, rebuild it.

---

## Spacing

- Generous spacing everywhere. Padding is larger than feels necessary.
- Sacred content deserves breathing room.
- **Minimum 16px** padding on all interactive elements.
- **24px+** padding on cards.

---

## Tabs / View Order

1. **Arc view** — default view on page load
2. **Constellation view** — second tab

---

## Constraints

- **Do NOT modify the Arc visualization** — its rendering logic, data binding, and SVG generation must remain untouched. Only modify surrounding UI, text, popups, and controls. The files to leave untouched are `src/lib/arc-renderer.ts`, `src/lib/arc-shaders.ts`, and the core rendering logic in `src/components/ArcDiagram.tsx`.
- **Do NOT modify `src/lib/verse-index.ts`** — it builds a one-time global index over `arc-crossrefs.json` (≈500k entries) that `VerseReader`, `VerseMarginDot`, and `SearchPalette` all depend on. Changing its shape, keys, or cache lifecycle breaks reader navigation and verse popovers across the app.
- **Do NOT change the `PreferenceKey` schema in `src/lib/preferences.ts` without a migration.** The keys and value shapes are read from existing users' `localStorage` on every page load; renaming or repurposing keys silently wipes user state (last passage, dismissal streaks, recent-passages list, filter settings).
- The **Constellation view visualization will be rebuilt from scratch** in a separate prompt. Do not attempt to preserve its current rendering code.
- **Desktop-first.** Mobile responsiveness is secondary to desktop quality.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Arc visualization | D3.js + WebGL shaders | 7.9.0 |
| Constellation visualization | Three.js | 0.183.2 |
| Panel / reader animations | motion (framer-motion successor) | 12.x |
| List virtualization | @tanstack/react-virtual | 3.x |
| Styling | Tailwind CSS v4 + PostCSS | 4.x |
| Language | TypeScript (strict mode) | 5.9.3 |
| Deployment | gh-pages (static export) | 6.3.0 |

**Tailwind v4 note:** This project uses Tailwind CSS v4, which has breaking changes from v3. Do not use v3 syntax or `tailwind.config.js`. Configuration is done via PostCSS (`postcss.config.mjs`).

---

## Developer Commands

```bash
npm run dev           # Start local dev server (localhost:3000)
npm run build         # Production build (runs validate-data via prebuild hook)
npm run lint          # Run ESLint
npm run validate-data # Assert chapter-verses.ts agrees with books.ts (length + sum per book)
```

There is no test suite. Verify changes by running `npm run build` — it catches TypeScript errors and verse-count drift.

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                # Root page — all top-level state and first-load logic lives here
│   ├── layout.tsx              # Root layout + metadata + font loading
│   ├── about/page.tsx          # About page
│   ├── about/layout.tsx        # About page metadata
│   ├── manifest.ts             # PWA web app manifest
│   ├── robots.ts               # robots.txt route
│   ├── sitemap.ts              # sitemap.xml route
│   ├── opengraph-image.tsx     # OG image generation route
│   ├── twitter-image.tsx       # Twitter card image route
│   ├── globals.css             # Global reset, typography utilities, .glass-panel class
│   └── tokens.css              # ALL CSS custom properties (fonts, colors, spacing, transitions)
├── components/
│   ├── ArcDiagram.tsx          # ⚠️  DO NOT MODIFY rendering logic
│   ├── ForceGraph.tsx          # Constellation view — to be rebuilt
│   ├── StarBackground.tsx      # Animated star field behind the visualization
│   ├── CelestialOrreryToggle.tsx # Arc/Constellation view switcher in the top bar
│   ├── ArcZoomControls.tsx     # Zoom in/out/reset controls shown only in Arc view
│   ├── FilterPanel.tsx         # Canon + translation + density controls (glass panel)
│   ├── TranslationSelector.tsx # Translation dropdown inside FilterPanel
│   ├── EdgeDensitySlider.tsx   # Slider that picks an edge-density threshold
│   ├── Tooltip.tsx             # Context-aware book hover tooltip (readings/canon/plain modes)
│   ├── VersePopover.tsx        # Verse selection popup used by ArcDiagram
│   ├── SearchPalette.tsx       # Cmd+K / "/" command palette — book, chapter, verse, genre, recents
│   ├── SearchTrigger.tsx       # Top-bar button that opens SearchPalette
│   ├── ReadingsPill.tsx        # Today's liturgical readings card (peek/pill/expanded states)
│   ├── ReadingPlanCard.tsx     # M'Cheyne plan card shown when the reader has dismissed today's readings
│   ├── ReadingPane.tsx         # Expanded single-reading pane with passage text + cross-refs
│   ├── DetailPanel.tsx         # Book → chapter → verse drill-down panel
│   ├── PanelBreadcrumb.tsx     # Breadcrumb trail with chapter chevrons inside DetailPanel
│   ├── AnimatedPanelContent.tsx # motion/react slide+crossfade wrapper for drill-down levels
│   ├── BookDetailView.tsx      # Book-level view inside DetailPanel (chapter grid + connected books)
│   ├── ChapterDetailView.tsx   # Chapter-level view (verse grid + cross-refs)
│   ├── VerseDetailView.tsx     # Verse-level view (verse text + cross-refs)
│   ├── ChapterGrid.tsx         # Chapter grid with density amber glow and verse-count sub-label
│   ├── VerseGrid.tsx           # Verse-number grid with per-verse cross-ref density indicator
│   ├── VerseReader.tsx         # Inline passage reader inside DetailPanel — margin dots, pulse-on-nav
│   ├── VerseMarginDot.tsx      # Dot rendered beside verse numbers that exposes cross-refs on hover
│   ├── VerseMarginPopover.tsx  # Popover listing a verse's cross-refs with verse-text previews
│   ├── CrossReferenceList.tsx  # Virtualized (react-virtual) list of cross-references
│   └── CrossReferenceItem.tsx  # Single cross-reference row
├── data/
│   ├── books.ts                # 66 Bible books — testament, genre, chapters, canons
│   ├── edges.ts                # Cross-reference edges (TSK dataset)
│   ├── chapter-verses.ts       # Verse counts per chapter (lookup table)
│   ├── book-edges.json         # Pre-aggregated book-to-book edge weights
│   ├── book-pair-notes.ts      # Human-written thematic notes for common book pairs (tooltip copy)
│   └── mcheyne.ts              # M'Cheyne one-year reading plan day map + reference parser
└── lib/
    ├── types.ts                # All TypeScript interfaces — start here when unsure
    ├── colors.ts               # Genre and liturgical season color maps
    ├── site-config.ts          # SITE_URL/NAME/TITLE/DESCRIPTION used by metadata + OG routes
    ├── og-image.tsx            # Shared render function for opengraph-image + twitter-image routes
    ├── bible-api.ts            # External Bible API (bible-api.com) integration
    ├── readings.ts             # Daily lectionary lookup
    ├── liturgical.ts           # Liturgical season + major-feast detection
    ├── arc-renderer.ts         # ⚠️  DO NOT MODIFY
    ├── arc-shaders.ts          # ⚠️  DO NOT MODIFY
    ├── label-layout.ts         # Label positioning algorithm
    ├── verse-index.ts          # ⚠️  Perf-critical — global index over arc-crossrefs.json (see Constraints)
    ├── verse-navigation.ts     # `VerseNavigationRequest` + `buildVerseNavigation` (one-shot signal key)
    ├── crossref-utils.ts       # Cross-ref grouping, per-book crossref fetch + module-level cache
    ├── search-index.ts         # Book aliases, palette query parser, genre search, verse-preview cache
    ├── preferences.ts          # ⚠️  localStorage-backed preference API (see Constraints for schema rules)
    └── panelNavigation.ts      # DetailPanel reducer (book/chapter/verse drill state + history)

public/
├── arc-crossrefs.json          # Full cross-reference dataset (4.9 MB) — do not edit
└── crossrefs/                  # Per-book cross-ref files fetched on demand
```

---

## Architecture Patterns

**State management:** All top-level state (view mode, selected book, canon, translation, edge density, active reading, drill state, persisted-restore chip) is lifted into `src/app/page.tsx` and passed down as props. There is no global state library.

**SSR disabled for visualizations:** Both `ArcDiagram` and `ForceGraph` are dynamically imported with `{ ssr: false }` because they use browser-only APIs (Canvas, WebGL, Three.js). Do the same for any new visualization components.

**CSS custom properties over Tailwind for design tokens:** Colors, fonts, spacing, and transitions are defined in `tokens.css` as CSS variables (e.g., `var(--accent)`, `var(--font-serif)`). Use these variables instead of hardcoding values or using Tailwind color utilities for design-system values.

**Data pipeline:** `edges.ts` (raw TSK cross-references) → `book-edges.json` (pre-aggregated book weights) → `arc-crossrefs.json` (full dataset for the arc renderer) → `public/crossrefs/{BOOK_ID}.json` (per-book files fetched lazily by `crossref-utils`). Do not modify the JSON files directly.

**Preference persistence:** All user settings and navigation restore state go through `src/lib/preferences.ts`, which wraps `localStorage` under a `bible-atlas-` namespace, guards every call against SSR (`typeof window`), and falls back to an in-memory `Map` on `QuotaExceededError`. Keys are enumerated as the `PreferenceKey` union (`translation`, `canon`, `density`, `last-book`, `last-chapter`, `last-verse`, `last-view-date`, `readings-dismissed-date`, `default-daily-view`, `consecutive-dismissals`, `recent-passages`, `arc-focus-mode`) — add new keys there and treat the existing set as a stable schema (see Constraints). Writes that can fire on every interaction (e.g. `last-book`/`last-chapter` as the user drills) are debounced in `page.tsx` before calling `setPreference`.

**Arc focus mode precedence:** The Arc's "focus" state is a two-layer system driven by `focusMode` (`"auto" | "off" | "on"`, persisted as `arc-focus-mode`). Explicit book/chapter/verse selection always wins and drives both the shader-selection alpha tier and the deep-zoom visibility rebuild. With no explicit selection, `focusMode` gates the implicit path: `"off"` disables it entirely; `"on"` treats the viewport as an implicit selection at any zoom; `"auto"` only engages above the `FOCUS_SELECTION_SCALE` threshold. At deep zoom (above `FOCUS_VISIBILITY_SCALE`), the visibility mask intersects the canon mask with the union of arcs touching the viewport and arcs touching the explicit selection — viewport and selection contribute additively rather than one overriding the other. Threshold constants live alongside `FOCUS_SELECTION_SCALE`/`FOCUS_VISIBILITY_SCALE`/`READER_HANDOFF_SCALE` near the top of `ArcDiagram.tsx`.

**Module-level caches:** Several lib files hold process-lifetime caches to avoid refetching or rebuilding expensive data: `verse-index.ts` lazily builds a single cross-reference index (`buildVerseIndex()` returns the same promise on every call); `crossref-utils.ts` caches per-book crossref JSON by `bookId`; `search-index.ts` caches palette verse-text previews (and `clearVerseTextCache()` is called when the active translation changes). Treat these caches as module state — reach for them through their exported functions rather than re-implementing fetches.

**One-shot navigation signals:** Imperative navigations into the reader (from search palette, cross-ref clicks, persisted restore, continue-reading chip) go through a `VerseNavigationRequest` (`src/lib/verse-navigation.ts`). Every request carries a fresh `key` (from `performance.now()`) so repeating a navigation to the same verse still retriggers the effect. `DetailPanel` consumes the signal and `VerseReader` plays the amber `.verse-pulse` outline on the target.

**Drill-down reducer:** `DetailPanel` uses `panelNavigationReducer` (`src/lib/panelNavigation.ts`) for book → chapter → verse state, history, and animation direction. Chapter swaps via the breadcrumb chevrons use `CHANGE_CHAPTER` (no history push); all other transitions push history and animate forward. `AnimatedPanelContent` consumes the animation direction to slide levels left or right.

**Data attributes as attachment points:** `VerseReader` renders each line with `data-verse={n}` so the pulse-on-navigate effect can `querySelector` the target without threading refs through every verse row. This is a localized pattern — don't introduce broader `data-*` selectors without a reason.

**Panel/reader animation:** Entrance/exit and drill-down transitions use the `motion` package (formerly framer-motion) via `motion/react`. `DetailPanel`, `ReadingPane`, and `AnimatedPanelContent` wrap their root in `AnimatePresence`; rely on that existing pattern instead of adding alternative animation libraries.

**SEO / metadata:** All marketing copy (`SITE_NAME`, `SITE_TITLE`, `SITE_DESCRIPTION`, keywords, theme color) is centralized in `src/lib/site-config.ts` and consumed by `layout.tsx`, the OG/Twitter image routes, `manifest.ts`, `sitemap.ts`, and `robots.ts`. Update copy there rather than in individual route files.

---

## Styling Conventions

- Use CSS variables from `tokens.css` for all design-system values.
- The `.glass-panel` utility class (defined in `globals.css`) applies the standard glass morphism styles. Use it instead of repeating the CSS.
- The `.three-state-interactive` utility class applies the standard rest/hover/active opacity pattern.
- Tailwind utilities are acceptable for layout (flex, grid, positioning) but not for color or typography — use CSS variables for those.
