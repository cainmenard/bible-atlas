# Bible Atlas — Design System & Development Rules

Every change to this project must follow these rules without exception.

---

## Project Context

Bible Atlas is a web app that visualizes cross-references between books of the Bible. It has two views:

- **Constellation view** — node-link graph (default)
- **Arc view** — chord diagram

The app fetches daily liturgical readings and displays them in a card. Users can filter by:
- Canon: Catholic, Protestant, Ethiopian, Orthodox
- Translation: RSV-CE, JB, KJV
- Edge density

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

1. **Constellation view** — first tab, default view on page load
2. **Arc view** — second tab

---

## Constraints

- **Do NOT modify the Arc visualization** — its rendering logic, data binding, and SVG generation must remain untouched. Only modify surrounding UI, text, popups, and controls. The files to leave untouched are `src/lib/arc-renderer.ts`, `src/lib/arc-shaders.ts`, and the core rendering logic in `src/components/ArcDiagram.tsx`.
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
| Styling | Tailwind CSS v4 + PostCSS | 4.x |
| Language | TypeScript (strict mode) | 5.9.3 |
| Deployment | gh-pages (static export) | 6.3.0 |

**Tailwind v4 note:** This project uses Tailwind CSS v4, which has breaking changes from v3. Do not use v3 syntax or `tailwind.config.js`. Configuration is done via PostCSS (`postcss.config.mjs`).

---

## Developer Commands

```bash
npm run dev      # Start local dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

There is no test suite. Verify changes by running `npm run build` — it catches TypeScript errors.

---

## File Structure

```
src/
├── app/
│   ├── page.tsx          # Root page — all top-level state lives here
│   ├── layout.tsx        # Root layout + metadata
│   ├── about/page.tsx    # About page
│   ├── globals.css       # Global reset, typography utilities, .glass-panel class
│   └── tokens.css        # ALL CSS custom properties (fonts, colors, spacing, transitions)
├── components/
│   ├── ArcDiagram.tsx    # ⚠️  DO NOT MODIFY rendering logic
│   ├── ForceGraph.tsx    # Constellation view — to be rebuilt
│   ├── ReadingsCard.tsx  # Today's liturgical readings card
│   ├── DetailPanel.tsx   # Book detail panel with cross-references
│   ├── OrbitalRingSelector.tsx  # Canon filter UI
│   ├── TranslationSelector.tsx  # Translation selector UI
│   ├── EdgeDensitySelector.tsx  # Edge density filter
│   ├── CelestialOrreryToggle.tsx # Constellation/Arc view switcher
│   ├── CanonFilter.tsx   # Canon filter logic
│   ├── Tooltip.tsx       # Book hover tooltip
│   ├── VersePopover.tsx  # Verse selection popup
│   └── StarBackground.tsx # Animated star field
├── data/
│   ├── books.ts          # 66 Bible books — testament, genre, chapters, canons
│   ├── edges.ts          # 42,000+ cross-reference edges (TSK dataset)
│   ├── chapter-verses.ts # Verse counts per chapter (lookup table)
│   └── book-edges.json   # Pre-aggregated book-to-book edge weights
└── lib/
    ├── types.ts           # All TypeScript interfaces — start here when unsure
    ├── colors.ts          # Genre and liturgical season color maps
    ├── bible-api.ts       # External Bible API (bible-api.com) integration
    ├── readings.ts        # Daily readings logic
    ├── liturgical.ts      # Liturgical season calculations
    ├── arc-renderer.ts    # ⚠️  DO NOT MODIFY
    ├── arc-shaders.ts     # ⚠️  DO NOT MODIFY
    ├── label-layout.ts    # Label positioning algorithm
    └── verse-index.ts     # Verse reference indexing

public/
├── arc-crossrefs.json    # Full cross-reference dataset (4.9 MB) — do not edit
└── crossrefs/            # Reference data
```

---

## Architecture Patterns

**State management:** All top-level state (view mode, selected book, canon, translation, edge density) is lifted into `src/app/page.tsx` and passed down as props. There is no global state library.

**SSR disabled for visualizations:** Both `ArcDiagram` and `ForceGraph` are dynamically imported with `{ ssr: false }` because they use browser-only APIs (Canvas, WebGL, Three.js). Do the same for any new visualization components.

**CSS custom properties over Tailwind for design tokens:** Colors, fonts, spacing, and transitions are defined in `tokens.css` as CSS variables (e.g., `var(--accent)`, `var(--font-serif)`). Use these variables instead of hardcoding values or using Tailwind color utilities for design-system values.

**Data pipeline:** `edges.ts` (raw TSK cross-references) → `book-edges.json` (pre-aggregated book weights) → `arc-crossrefs.json` (full dataset for the arc renderer). Do not modify the JSON files directly.

---

## Styling Conventions

- Use CSS variables from `tokens.css` for all design-system values.
- The `.glass-panel` utility class (defined in `globals.css`) applies the standard glass morphism styles. Use it instead of repeating the CSS.
- The `.three-state-interactive` utility class applies the standard rest/hover/active opacity pattern.
- Tailwind utilities are acceptable for layout (flex, grid, positioning) but not for color or typography — use CSS variables for those.
