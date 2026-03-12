# Bible Atlas — Design System & Development Rules

Every change to this project must follow these rules without exception.

---

## Project Context

Bible Atlas is a web app that visualizes cross-references between books of the Bible. It has two views:

- **Arc view** — chord diagram (default)
- **Graph view** — node-link graph

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
| **Rest** | Dim, receding, low opacity (30–50%) |
| **Hover** | Present, slightly brighter (60–80%), subtle transition |
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

1. **Arc view** — first tab, default view on page load
2. **Graph view** — second tab

---

## Constraints

- **Do NOT modify the Arc visualization** — its rendering logic, data binding, and SVG generation must remain untouched. Only modify surrounding UI, text, popups, and controls.
- The **Graph view visualization will be rebuilt from scratch** in a separate prompt. Do not attempt to preserve its current rendering code.
- **Desktop-first.** Mobile responsiveness is secondary to desktop quality.
