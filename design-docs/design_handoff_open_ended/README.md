# Handoff: MuNu — Open-Ended Question (free text)

## Overview
A **reusable open-ended (free-text) question** screen. The **Reflection** step
("Is there anything else about your relationship with music…") is one instance — the
same screen is used for every free-text question in the flow. One component, reused.

This is a **RESTYLE** task: the component, its state, validation, and routing already
exist and work in the codebase. **Do not rebuild logic** — only apply the visual
language below to the existing component. Shares the "Warm Resonance" language with the
Welcome and multiple-choice screens (default accent **Lilac**).

## About the design files
**`open-ended-reference.html`** is a **visual reference** (plain HTML/CSS, no build, no
deps). Open it in a browser to see the target and type in the field to feel the focus
state. Use it purely as the source of truth for colors, type, spacing, radii, states,
and the ambient ripple — applied to your existing component's markup.

## Fidelity
**High-fidelity.** All visual values are final.

---

## The screen (restyle target)

### Name
Open-ended question / free-text (e.g. **Reflection**).

### Layout
- Full-viewport screen on `--cream` (#f8f4ec), as a vertical flex column.
- **Body**: a 2-column grid, `grid-template-columns: 0.82fr 1.18fr`, `gap: 56px`,
  `align-items: start`, `padding: 72px 64px 24px`:
  - **Left**: the question (`.q-col` has `padding-top: 6px` to align with the field top).
  - **Right**: the free-text field.
- **Footer**: pinned bottom, space-between, `padding: 0 64px 48px` — **Back** (left),
  primary (right).
- Behind everything: ambient **bloom** + **breathing ripple** (`z-index:0`).
- **Optional** step counter top-right (same as multi-select) — include it when the
  question appears mid-wizard; omit on a final/standalone step (Reflection shows none).

### Elements to restyle

**Question**
- Lora, **30px**, weight 500, line-height **1.34**, letter-spacing **-0.008em**,
  color `--ink`, `max-width: 12em`, `text-wrap: pretty`.

**Free-text field** (the core element)
- `font-family: Lora`, **18px**, line-height **1.62**, color `--ink`.
- Background `rgba(255,255,255,0.55)`, border `1.5px solid rgba(33,29,23,0.14)`,
  `border-radius: 18px`, `padding: 22px 24px`, `resize: none`, generous min-height
  (~300–320px; let it fill the column).
- Placeholder color `--ink-faint`. (Placeholder copy is just example text.)
- **Focus**: border `rgba(--fill-rgb,0.45)`, background `rgba(255,255,255,0.78)`,
  ring `box-shadow: 0 0 0 4px rgba(--fill-rgb,0.08)`. Transition 0.2s.
- Note the field text is **serif (Lora)** — it reads like a personal note, intentionally.

**Footer — Back / primary**
- **Back**: outlined "ghost" pebble — Hanken Grotesk 15/500, color `--accent-text`,
  transparent bg, border `1.5px solid rgba(--fill-rgb,0.28)`, padding 12px 28px,
  radius 999px. Hover: bg `rgba(--fill-rgb,0.07)`, border `rgba(--fill-rgb,0.5)`.
- **Primary**: filled Lilac pebble — Hanken Grotesk 16/600, text `--on-fill` on `--fill`,
  padding 15px 40px, radius 999px, shadow
  `0 2px 6px -2px rgba(--fill-rgb,0.35), 0 12px 28px -12px rgba(--fill-rgb,0.45)`.
  Hover: `translateY(-2px)` + `brightness(1.05)`.
  **Label varies**: "Done" on the last step (Reflection), "Continue" mid-flow — keep
  whatever your existing component already uses.

**Optional step counter** (if present)
- Hanken Grotesk 14/500, color `--ink-faint`; bold number in `--accent-text`.

### Animation (presentational only)
- **Breathing ripple**: five concentric rings (fixed sizes 250/470/710/970/1250px,
  opacity 0.15→0.03 in `--fill-rgb`) scaling 1 → 1.035 → 1 over **7.5s**
  `ease-in-out infinite`, staggered 0.5s. **Bloom** static.
- Honor **`prefers-reduced-motion: reduce`** → motion stops. Purely decorative; don't
  let it intercept pointer events (`pointer-events:none`, `z-index:0`).

### Do NOT change
Existing controlled-input value/onChange, character limits/validation, autosave,
Back/primary handlers, and routing. This is a visual reskin only.

---

## Design tokens
Identical set to the other MuNu handoffs — define once in your theme, reuse everywhere.

### Foundation
`--cream #f8f4ec` · `--ink #39322a` · `--ink-muted #6f675b` · `--ink-faint #9a9387`

### Accent (single swappable set — default **Lilac**)
| Token | Lilac | Meaning |
|---|---|---|
| `--fill` | `#c2b0cf` | primary fill |
| `--on-fill` | `#3d3147` | dark text on the fill |
| `--accent-text` | `#6b5878` | accent text on cream (Back, step number) |
| `--tint` | `#d6cbdd` | hover/border accents |
| `--fill-rgb` | `107,84,120` | field focus ring, ripple, shadows (low alpha) |
| `--bloom-rgb` | `194,176,207` | bloom |

Other curated palettes (fill / on-fill / accent-text / tint / fill-rgb / bloom-rgb):
Clay `#cda288 / #4a2f22 / #8a5a42 / #ddbca8 / 125,78,57 / 205,162,136` ·
Sage `#aebf9c / #353f2b / #5a6a48 / #c8d4ba / 90,106,72 / 174,191,156` ·
Dusk `#a9bdc7 / #2f3d45 / #506670 / #c6d5dc / 79,100,114 / 169,189,199` ·
Rose `#dcb2ad / #4a2f2d / #8a5450 / #e9cdca / 138,79,74 / 220,178,173` ·
Heather `#9fc1bb / #28403b / #4c6661 / #c2dad5 / 64,96,90 / 159,193,187`

### Typography
- Question + field text: **Lora** (question 30/500/1.34; field 18/400/1.62).
- UI (buttons, step): **Hanken Grotesk** (15–16/500–600; step 14/500).

### Radii & spacing
- Field: `border-radius: 18px`, padding `22px 24px`.
- Buttons: `border-radius: 999px`.
- Body grid: cols `0.82fr 1.18fr`, gap `56px`, padding `72px 64px 24px`.
- Footer padding `0 64px 48px`.

## Assets
- Fonts: Lora + Hanken Grotesk (Google Fonts). No images, no icons.

## Files in this bundle
- `open-ended-reference.html` — standalone reference (open in a browser; type in the field).
- `README.md` — this spec.

## Suggested prompt for Cursor / Claude Code
> "We're RESTYLING our existing free-text question component (e.g. the Reflection step) —
> do NOT change state, validation, handlers, or routing. Use
> design-docs/open-ended/README.md + open-ended-reference.html as the visual source of
> truth. Apply: the two-column layout (question left, field right), the soft serif (Lora)
> text field with its focus ring, the Back (outlined pebble) + primary (filled Lilac
> pebble, keep its existing 'Done'/'Continue' label) footer, and the ambient
> bloom/breathing-ripple with the prefers-reduced-motion fallback. Use our theme tokens
> (add the accent set, default Lilac, if not already present). Reuse this styling for all
> our free-text question steps. Show me which style/token files you'll touch first, then
> make the change and compare to the reference."
