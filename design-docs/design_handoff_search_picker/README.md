# Handoff: MuNu — Search-Picker Question (search + scrollable picks)

## Overview
A **reusable search-picker question** screen: the user **searches a list**, picks results
from a **dropdown**, and their choices appear as **removable cards in a scrollable column
on the side**. The **"favorite artists"** step is one instance — the same screen is used
for **every question of this format** (search-and-add-from-a-large-list, e.g. artists,
songs, etc.). Build/style it **once** and reuse.

This is a **RESTYLE** task: the component, search/filter logic, selection state, and
routing already exist and work. **Do not rebuild the logic** — apply the visual language
below to the existing component. Shares the "Warm Resonance" language (default accent
**Lilac**) with the rest of the flow.

## About the design files
**`search-picker-reference.html`** is the **visual + interaction reference** (plain
HTML/CSS/JS, no build, no deps). Open it in a browser and try it: type in the search to
see the dropdown, click a result to add a card on the right, click a card's ✕ to remove.
Use it as the source of truth for layout, colors, type, spacing, states, and motion.

## Fidelity
**High-fidelity.** All visual values are final.

---

## The screen (restyle target)

### Key layout principles (these are the point of this iteration)
1. **Question sits at the TOP-LEFT**, not vertically centered — this frees the space
   beneath the search field for the results dropdown.
2. **Search field directly under the question**; its **results dropdown overlays the
   freed space below it** (absolutely positioned, doesn't shift layout).
3. **Chosen items live in a scrollable column on the RIGHT** — each a photo card with a
   ✕ to remove. The column scrolls when picks overflow.

### Layout structure
- Full-viewport screen on `--cream`, as a vertical flex column.
- **Top region** (`flex:1`, `min-height:0`): a 2-column grid `1fr 1fr`, gap 48px,
  `align-items:start`, `padding: 84px 64px 0`.
  - **Left**: question, then `searchwrap` (`margin-top:24px`, `max-width:460px`) holding
    the search field + the absolutely-positioned dropdown.
  - **Right**: `picks` — `overflow-y:auto`, `min-height:0`, centered column, `gap:18px`.
- **Footer** pinned bottom: Back (left) + Next (right), `padding: 16px 64px 40px`.
- Top-right **step counter** ("Question 2 of 5"). Ambient bloom + breathing ripple behind (`z-index:0`).

### Elements

**Question** — Lora 30/500, line-height 1.34, letter-spacing -0.008em, color `--ink`, max-width 12em.

**Search field** — pill: `border-radius:999px`, `padding:14px 22px`, bg `rgba(255,255,255,0.6)`,
border `1.5px solid rgba(33,29,23,0.13)`, a magnifier icon (`--ink-faint`) + input (Hanken 16, `--ink`).
Focus-within: border `rgba(--fill-rgb,0.45)`, bg `rgba(255,255,255,0.85)`, ring `0 0 0 4px rgba(--fill-rgb,0.08)`.

**Results dropdown** — absolutely positioned `top: calc(100% + 8px)`, full search width,
`max-height:360px`, `overflow-y:auto`, `z-index:6`. Surface `#fdfbf6`, border
`1.5px solid rgba(33,29,23,0.1)`, `border-radius:16px`, shadow `0 22px 48px -22px rgba(33,29,23,0.5)`, `padding:6px`.
Each option (`.opt`): full-width left-aligned button, **Lora 18**, color `--ink`, `padding:12px 18px`,
`border-radius:10px`; hover bg `rgba(--fill-rgb,0.12)`, color `--accent-text`.

**Pick card** (chosen item) — `width:270px`, `border-radius:16px`, `overflow:hidden`,
shadow `0 12px 30px -16px rgba(33,29,23,0.55)`. Contains:
- the artist **photo** (270×290; here a gray gradient placeholder — wire to your real image source),
- a **✕ remove button** top-right: 30×30 circle, `rgba(255,255,255,0.88)`, ✕ glyph in `--ink`,
  soft shadow; hover → white + `scale(1.06)`,
- a **name label** bottom-left over a `linear-gradient(180deg, transparent, rgba(20,16,12,0.66))`,
  Hanken 14/600, white.
- Empty state: italic Lora hint `--ink-faint` ("The artists you pick will gather here.").

**Footer — Back / Next** — Back = outlined "ghost" pebble (Hanken 15/500, `--accent-text`,
border `1.5px rgba(--fill-rgb,0.28)`, radius 999px). Next = filled Lilac pebble (Hanken 16/600,
`--on-fill` on `--fill`, padding 15px 40px, radius 999px, soft shadow; hover `translateY(-2px)` + `brightness(1.05)`).

**Step counter** — Hanken 14/500, `--ink-faint`; bold number `--accent-text`.

### Interaction (already built — match the styling/affordances)
- Typing filters the list (case-insensitive contains); the dropdown shows matches with
  already-selected items removed. (Reference also shows the full list on focus before typing
  — keep whatever your component already does.)
- Clicking a result adds it to the picks column and clears the query.
- Clicking a card's ✕ removes it.
- The dropdown closes on blur.

### Animation
Breathing ripple (five rings 250→1250px, opacity 0.15→0.03 in `--fill-rgb`, scale 1→1.035→1,
7.5s ease-in-out, staggered 0.5s) + static bloom. Honor `prefers-reduced-motion: reduce` (stops).
Decorative only — `pointer-events:none`, `z-index:0`.

### Do NOT change
The search/filter logic, selection state, data source, add/remove handlers, and routing.
Visual reskin only.

---

## Design tokens
Same set as the other MuNu handoffs.

### Foundation
`--cream #f8f4ec` · `--ink #39322a` · `--ink-muted #6f675b` · `--ink-faint #9a9387`

### Accent (single swappable set — default **Lilac**)
`--fill #c2b0cf` · `--on-fill #3d3147` · `--accent-text #6b5878` · `--tint #d6cbdd`
· `--fill-rgb 107,84,120` · `--bloom-rgb 194,176,207`

Other palettes (fill / on-fill / accent-text / tint / fill-rgb / bloom-rgb):
Clay `#cda288 / #4a2f22 / #8a5a42 / #ddbca8 / 125,78,57 / 205,162,136` ·
Sage `#aebf9c / #353f2b / #5a6a48 / #c8d4ba / 90,106,72 / 174,191,156` ·
Dusk `#a9bdc7 / #2f3d45 / #506670 / #c6d5dc / 79,100,114 / 169,189,199` ·
Rose `#dcb2ad / #4a2f2d / #8a5450 / #e9cdca / 138,79,74 / 220,178,173` ·
Heather `#9fc1bb / #28403b / #4c6661 / #c2dad5 / 64,96,90 / 159,193,187`

### Typography
- Question + dropdown options: **Lora** (question 30/500; options 18).
- UI (search input, buttons, name labels, step): **Hanken Grotesk** (14–16).

### Radii & spacing
- Search + buttons: `border-radius:999px`. Dropdown + cards: `16px`. Option rows: `10px`.
- Top grid: cols `1fr 1fr`, gap 48px, `padding:84px 64px 0`. Footer `16px 64px 40px`.
- Search wrap `max-width:460px`, `margin-top:24px`. Cards `width:270px`, gap 18px.

## Assets
- Fonts: Lora + Hanken Grotesk (Google Fonts).
- Artist photos come from your data — the reference uses gray gradient placeholders.

## Files in this bundle
- `search-picker-reference.html` — standalone, interactive reference.
- `README.md` — this spec.

## Suggested prompt for Cursor / Claude Code
> "We're RESTYLING our existing search-picker question component (the 'favorite artists'
> step, and any other search-and-add-from-a-list questions) — do NOT change the
> search/filter logic, selection state, data, add/remove handlers, or routing. Use
> design-docs/search-picker/README.md + search-picker-reference.html as the visual source
> of truth.
>
> Apply: question pinned TOP-LEFT (Lora) so the dropdown has room beneath; the pill search
> field with its focus ring; the results dropdown overlaying the space below the field
> (Lora option rows, hover tint); the chosen items as a SCROLLABLE right-hand column of
> photo cards, each with a ✕ remove button and a gradient name label; Back (outlined pebble)
> + Next (filled Lilac pebble) footer; the top-right step counter; and the ambient
> bloom/breathing-ripple with the prefers-reduced-motion fallback.
>
> Use our theme tokens (add the accent set, default Lilac, if missing). Reuse this styling
> for every search-picker question. Show me which token/style files you'll touch first,
> then make the change and compare to the reference."
