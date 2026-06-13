# Handoff: MuNu — Multiple-Choice Question (reusable)

## Overview
A **reusable multiple-choice (multi-select) question** screen. The "favorite genres"
step is **one instance** of it — the same screen is used for *every* multi-select
question in the onboarding flow (e.g. genres, moods, listening contexts, etc.).
Build it **once** as a generic, data-driven component and reuse it for each question.

This is the second slice of the MuNu handoff (after the Welcome screen). It shares the
same visual language ("Warm Resonance", default accent **Lilac**).

## About the design files
**`multiple-choice-reference.html`** is a **design reference** (plain HTML/CSS + a few
lines of JS to demonstrate the toggle). It is *not* meant to be shipped verbatim —
recreate it in the target codebase's environment using its existing components, tokens,
and patterns. No dependencies, no build step: open it in a browser to see the target,
and click the pills to feel the selection behavior.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and interaction are final.

---

## The component

### Name
`MultiSelectQuestion` (suggested) — a single screen that asks one question and lets the
user pick **any number** of options (zero-to-many).

### It is generic — driven by data
The same component renders every multi-select step. Parameterize it:

| Prop | Type | Example |
|---|---|---|
| `question` | string | "What are your favorite genres of music?" |
| `hint` | string (optional) | "Pick as many as feel like you — there are no wrong answers." |
| `options` | string[] (or `{id,label}[]`) | ["Hip Hop","R&B","Pop", …] |
| `selected` | Set/array of selected ids | ["R&B","Pop","Indie"] |
| `onToggle(id)` | callback | toggles membership |
| `stepCurrent` / `stepTotal` | number | 1 / 5 |
| `onBack()` | callback | go to previous step |
| `onContinue()` | callback | commit selection, advance |

**Multi-select semantics**: tapping a pill toggles it on/off; multiple can be selected;
none-selected is valid. (If you later need a *single*-select variant, it's the same
screen with single-choice logic — but this instance is multi-select.)

### Layout
- Full-viewport screen on `--cream` (#f8f4ec).
- **Step counter** absolutely positioned top-right (top 40, right 48), `z-index:2`.
- Main content is a **2-column grid**, vertically centered, `padding: 76px 64px`,
  `gap: 64px`, `grid-template-columns: 0.85fr 1.15fr`:
  - **Left**: the question (+ optional hint).
  - **Right**: the options grid.
- A **footer row** pinned at the bottom with **Back** (left) and **Continue** (right).
- Behind everything: the ambient **bloom** + **breathing ripple** (`z-index:0`) — same
  motif as Welcome, but here it *breathes* slowly rather than emanating (it must not
  distract while the user is choosing). See Animation.

### Components

**Step counter**
- Hanken Grotesk, 14px, weight 500, color `--ink-faint`. The number is bold and colored
  `--accent-text`. Copy pattern: "Question **1** of 5". Keep on one line (`white-space:nowrap`).

**Question**
- Lora, **30px**, weight 500, line-height **1.34**, letter-spacing **-0.008em**,
  color `--ink`, `max-width: 12em`, `text-wrap: pretty`.

**Hint** (optional)
- Hanken Grotesk, 15px, line-height 1.6, color `--ink-muted`, `max-width: 23em`,
  `margin-top: 16px`.

**Options grid**
- `display:grid; grid-template-columns: repeat(4, max-content); gap: 13px 15px;
  justify-content:start`. (A 4-up max-content grid; a flex-wrap row also works — the
  point is pills sized to content, wrapping to multiple rows.)

**Flow navigation (Back / Continue)**
- A footer row pinned at the bottom (`padding: 0 64px 48px`, space-between).
- **Back**: outlined "ghost" pebble — Hanken Grotesk 15/500, color `--accent-text`,
  transparent bg, border `1.5px solid rgba(--fill-rgb,0.28)`, padding 12px 28px,
  radius 999px. Hover: bg `rgba(--fill-rgb,0.07)`, border `rgba(--fill-rgb,0.5)`.
- **Continue**: primary filled pebble — Hanken Grotesk 16/600, text `--on-fill` on
  `--fill`, padding 15px 40px, radius 999px, shadow
  `0 2px 6px -2px rgba(--fill-rgb,0.35), 0 12px 28px -12px rgba(--fill-rgb,0.45)`.
  Hover: `translateY(-2px)` + `brightness(1.05)`.
- Optionally gate Continue on a minimum selection count.

**Option pill (chip)** — the core element
- Hanken Grotesk, 15px, weight 500, `white-space:nowrap`, `padding: 12px 22px`,
  `border-radius: 999px`.
- **Unselected**: text `#5b5247`, background `rgba(255,255,255,0.5)`,
  border `1.5px solid rgba(33,29,23,0.13)`.
- **Hover (unselected)**: border → `--tint`, text → `--accent-text`, `translateY(-1px)`.
- **Selected**: text `--on-fill`, background `--fill`, border `--fill`,
  shadow `0 3px 10px -4px rgba(--fill-rgb,0.5)`. (Dark text on the light fill — keep that contrast.)
- Transition 0.18s on background/border/color/transform.
- Use a real toggle button with **`aria-pressed`** reflecting selection (the reference does this).

### Selection model
- Maintain a Set of selected option ids in component/form state.
- `onToggle(id)` adds/removes; the pill's `aria-pressed` / selected class follows.
- The reference pre-selects R&B, Pop, Indie purely as an example — real defaults come
  from your data.
- **Back** returns to the previous step; **Continue** commits the selection and advances.

---

## Interactions & behavior
- **Tap a pill** → toggle selected. Hover states as above. Visible focus ring per your a11y conventions.
- **Back** (quiet outlined pebble, bottom-left) → previous step. **Continue** (primary filled
  pebble, bottom-right) → commit selections and advance. Wire both to your flow/wizard.
  Optionally disable Continue until a minimum number of options is selected (if a step
  requires at least one); this instance leaves it always enabled.
- Reordering/wrapping: pills wrap naturally; order comes from the data.

## Animation
- **Breathing ripple**: five concentric rings (fixed sizes 250/470/710/970/1250px,
  decreasing opacity 0.15→0.03 in `--fill-rgb`) that scale 1 → 1.035 → 1 over **7.5s**
  `ease-in-out infinite`, staggered 0.5s each. Very subtle — the screen feels alive but calm.
- **Bloom**: static.
- **`prefers-reduced-motion: reduce`** → ripple holds still (no scaling). Honor it.

## State management
- `selected: Set<id>` per question, lifted into the flow's form state.
- `stepCurrent` / `stepTotal` from the wizard.
- No data fetching on the screen itself (options are supplied to it).

---

## Design tokens
Same set as the Welcome handoff — define once, reuse app-wide.

### Foundation
`--cream #f8f4ec` · `--ink #39322a` · `--ink-muted #6f675b` · `--ink-faint #9a9387`

### Accent (single swappable set — default **Lilac**)
| Token | Lilac | Meaning |
|---|---|---|
| `--fill` | `#c2b0cf` | selected-pill / primary fill |
| `--on-fill` | `#3d3147` | dark text on the fill |
| `--accent-text` | `#6b5878` | accent text on cream (step number, hover) |
| `--tint` | `#d6cbdd` | hover border |
| `--fill-rgb` | `107,84,120` | rings / shadows / borders at low alpha |
| `--bloom-rgb` | `194,176,207` | bloom + glow |

Other curated palettes (fill / on-fill / accent-text / tint / fill-rgb / bloom-rgb):
Clay `#cda288 / #4a2f22 / #8a5a42 / #ddbca8 / 125,78,57 / 205,162,136` ·
Sage `#aebf9c / #353f2b / #5a6a48 / #c8d4ba / 90,106,72 / 174,191,156` ·
Dusk `#a9bdc7 / #2f3d45 / #506670 / #c6d5dc / 79,100,114 / 169,189,199` ·
Rose `#dcb2ad / #4a2f2d / #8a5450 / #e9cdca / 138,79,74 / 220,178,173` ·
Heather `#9fc1bb / #28403b / #4c6661 / #c2dad5 / 64,96,90 / 159,193,187`

### Typography
- Question / serif: **Lora** 30/500/1.34.
- UI / sans: **Hanken Grotesk** — pills 15/500, hint 15/400, step 14/500.

### Radii & spacing
- Pills: `border-radius: 999px`, padding `12px 22px`.
- Grid gap `13px 15px`. Layout padding `76px 64px`, column gap `64px`.
- Question→hint `16px`.

## Assets
- Fonts: Lora + Hanken Grotesk (Google Fonts). No images, no icons.

## Files in this bundle
- `multiple-choice-reference.html` — standalone reference (open in a browser; click pills).
- `README.md` — this spec.

## Suggested prompt for Claude Code / Cursor
> "Read design-docs/multiple-choice/README.md and open multiple-choice-reference.html.
> Build a reusable `MultiSelectQuestion` component in our stack — generic over
> `question`, optional `hint`, `options`, `selected`, `onToggle`, and step
> `current/total`. The 'favorite genres' screen is one instance; we'll reuse this for
> every multi-select step. Match the pill styling, selected state (dark text on the
> Lilac fill), the two-column layout, the top-right step counter, the Back/Continue
> footer, and the breathing ripple + reduced-motion fallback. Reuse our theme tokens
> (add the accent set if not present). Give me a short plan first, then implement."
