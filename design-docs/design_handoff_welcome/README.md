# Handoff: MuNu — Welcome Screen

## Overview
The **Welcome** screen is the entry point of MuNu, an app that helps people process
emotions through music using the ISO principle (meet someone at their current
emotional state, then guide them toward calm). This screen sets the emotional tone:
calm, soothing, unhurried — "a hug." It introduces the app and invites the user to
begin, or to watch a guided demo.

This handoff covers **only the Welcome screen** — a deliberate first slice to confirm
the visual language reproduces cleanly in the real codebase before the rest of the
flow (genres, artists, reflection, insight, arrival/player) is handed over.

## About the design files
The file in this bundle — **`welcome-reference.html`** — is a **design reference**
created in plain HTML/CSS. It is *not* meant to be copied into the app verbatim.
The task is to **recreate this screen in the target codebase's existing environment**
(React, Vue, SwiftUI, native, etc.) using its established components, tokens, and
patterns. If no front-end environment exists yet, pick the most appropriate framework
for the project and implement it there.

`welcome-reference.html` has **no dependencies and no build step** — open it directly
in a browser to see the exact intended result, including the animation. It uses only
two Google Fonts (Lora, Hanken Grotesk) and inline CSS, all heavily commented.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, and the animation are
all final. Reproduce pixel-accurately, but express the values through the codebase's
own token/theme system rather than hard-coding where a token already exists.

---

## The screen

### Name
Welcome / Intro

### Purpose
First impression. Communicate what MuNu is in a warm, low-pressure way and offer two
paths: **Get Started** (primary — begin the flow) and **See it in action** (secondary —
watch a guided demo of someone going from anxious to calm).

### Layout
- Full-viewport screen on the app background (`--cream` #f8f4ec).
- A single **centered column**, vertically and horizontally centered, max-width **560px**,
  centered text.
- Behind the column, two layered ambient elements (both centered on the screen,
  non-interactive, `z-index: 0`): a soft radial **bloom** and the concentric **ripple**.
- Content column is `z-index: 1` above them.
- Vertical order within the column:
  1. Brand mark (dot + "MuNu" wordmark) — `margin-bottom: 30px`
  2. Greeting (serif headline)
  3. Subtext (`margin-top: 22px`)
  4. Primary CTA "Get Started" (`margin-top: 36px`)
  5. Aside group (`margin-top: 42px`, `gap: 14px`): italic hint, then "See it in action"

### Components

**Brand mark**
- Row: `display:flex; align-items:center; gap:11px`.
- **Dot**: 30×30px circle. Fill = radial-gradient from `--tint` (highlight, top-left) to
  `--fill`. Glow via two stacked box-shadows in `--bloom-rgb` (a 6px soft ring + a 24px
  blur). This dot is conceptually the *source* of the ripple. It pulses (see Animation).
- **Wordmark**: "MuNu", Hanken Grotesk, 16px, weight 600, color `--ink`.

**Greeting** (serif headline)
- Lora, **31px**, weight **500**, line-height **1.48**, letter-spacing **-0.005em**,
  color `--ink`. `text-wrap: pretty`.
- The trailing phrase "already feels like yours." is wrapped in an italic `<em>` colored
  `--accent-text`.
- Copy: *"Hi there. Welcome to MuNu — a quiet place to move through how you feel, with
  music that already feels like yours."*

**Subtext**
- Hanken Grotesk, **17px**, line-height **1.66**, color `--ink-muted`, max-width **430px**.
- Copy: *"We'll get to know your taste, ask how you're doing today, and build a playlist
  that helps you find your way through."*

**Primary CTA — "Get Started"** (a soft "pebble")
- Hanken Grotesk, 16px, weight 600, letter-spacing 0.01em.
- Text `--on-fill` on background `--fill`. Padding **15px 40px**. Border-radius **999px** (full pill).
- Shadow: `0 2px 6px -2px rgba(--fill-rgb,0.35), 0 12px 28px -12px rgba(--fill-rgb,0.45)`.
- Hover: `translateY(-2px)` + `filter: brightness(1.05)`. Transition 0.2s.

**Italic hint**
- Lora *italic*, 16px, color `--ink-faint`, max-width 340px, `text-wrap: balance`.
- Copy: *"Short on time, or just curious? See how MuNu guides someone from anxious to calm."*

**Secondary — "See it in action"** (outlined pebble)
- Hanken Grotesk, 15px, weight 500, color `--accent-text`.
- Transparent background, border `1.5px solid rgba(--fill-rgb,0.28)`, padding 12px 28px,
  border-radius 999px.
- Hover: background `rgba(--fill-rgb,0.07)`, border `rgba(--fill-rgb,0.5)`.

---

## Interactions & behavior
- **Get Started** → advances into the flow (next screen: genre picker). Wire to the app's router.
- **See it in action** → opens the guided demo ("anxious → calm" walkthrough).
- Both buttons have the hover states above. Give them visible focus rings per the app's
  a11y conventions.
- No form state on this screen.

## Animation (the signature detail)
The ripple = sound radiating from the MuNu dot, like a stone dropped in still water.
- **Ripple** (`.welcome__rings span`, five of them): each ring animates from
  ~110px → 1300px diameter while fading opacity 0 → 0.85 → 0, over **9s**, `ease-out`,
  `infinite`, `animation-fill-mode: backwards`. The five rings are **staggered** by
  1.8s each (0 / 1.8 / 3.6 / 5.4 / 7.2s) so a new wave is born roughly every 1.8s —
  a continuous, unhurried emanation. Border `1.5px` in `rgba(--fill-rgb,0.32)`.
- **Dot pulse** (`.welcome__dot`): box-shadow gently swells and settles on the same
  9s `ease-in-out infinite` cycle (peaks at 12%), so the source "breathes" in time.
- **Bloom**: static radial gradient, no animation.
- Easing/timing are deliberate — keep them slow. Faster motion breaks the calm.

### Accessibility (important — this app serves distressed users)
- Honor `prefers-reduced-motion: reduce`: **stop all motion.** When reduced, the rings
  hold still at fixed concentric sizes (250 / 470 / 710 / 970 / 1250px) with decreasing
  opacity (0.15 / 0.11 / 0.075 / 0.05 / 0.03), and the dot stops pulsing. See the media
  query at the bottom of `welcome-reference.html`.
- Maintain text contrast: body/headline use the warm near-black `--ink` on cream.
  The accent fills are all light with **dark** text on top (`--on-fill`), never light
  text on a light fill.

## State management
None for this screen beyond navigation. (Two click handlers → route changes.)

---

## Design tokens

### Foundation
| Token | Value | Use |
|---|---|---|
| `--cream` | `#f8f4ec` | app background |
| `--ink` | `#39322a` | primary text (warm near-black) |
| `--ink-muted` | `#6f675b` | secondary text (subtext) |
| `--ink-faint` | `#9a9387` | tertiary text (hint) |

### Accent (single swappable token set — default = **Lilac**)
Swap all six together to re-hue the entire screen. The chosen default is Lilac; the
other curated calm options are listed for reference (the live prototype lets the
designer flip between them).

| Token | Lilac (default) | Meaning |
|---|---|---|
| `--fill` | `#c2b0cf` | light fill for primary button / selected states |
| `--on-fill` | `#3d3147` | dark text *on* the fill |
| `--accent-text` | `#6b5878` | accent-colored text on the cream bg |
| `--tint` | `#d6cbdd` | dot highlight / hover borders |
| `--fill-rgb` | `107,84,120` | deep hue (as RGB) for rings, shadows, borders at low alpha |
| `--bloom-rgb` | `194,176,207` | light tint (as RGB) for the bloom + dot glow |

Other palettes (fill / on-fill / accent-text / tint / fill-rgb / bloom-rgb):
- **Clay**    `#cda288` / `#4a2f22` / `#8a5a42` / `#ddbca8` / `125,78,57`  / `205,162,136`
- **Sage**    `#aebf9c` / `#353f2b` / `#5a6a48` / `#c8d4ba` / `90,106,72`  / `174,191,156`
- **Dusk**    `#a9bdc7` / `#2f3d45` / `#506670` / `#c6d5dc` / `79,100,114` / `169,189,199`
- **Rose**    `#dcb2ad` / `#4a2f2d` / `#8a5450` / `#e9cdca` / `138,79,74`  / `220,178,173`
- **Heather** `#9fc1bb` / `#28403b` / `#4c6661` / `#c2dad5` / `64,96,90`   / `159,193,187`

### Typography
| Role | Family | Size / weight / line-height |
|---|---|---|
| Headline / serif | **Lora** (400–600, + italic) | greeting 31/500/1.48; hint 16 italic |
| UI / sans | **Hanken Grotesk** (400/500/600) | subtext 17/400/1.66; buttons 15–16/600; wordmark 16/600 |

Both are Google Fonts. Use the codebase's existing font-loading approach.

### Radii & shadows
- Buttons: `border-radius: 999px` (full pill).
- Primary shadow: `0 2px 6px -2px rgba(--fill-rgb,0.35), 0 12px 28px -12px rgba(--fill-rgb,0.45)`.
- Dot glow: `0 0 0 6px rgba(--bloom-rgb,0.18), 0 0 24px 4px rgba(--bloom-rgb,0.4)`.

### Spacing rhythm (within the centered column)
mark→greeting 30 · greeting→sub 22 · sub→CTA 36 · CTA→aside 42 · hint→ghost 14 (px).

## Assets
- **Fonts**: Lora + Hanken Grotesk (Google Fonts).
- **No images** on this screen. The dot and ripple are pure CSS.
- No icons.

## Files in this bundle
- `welcome-reference.html` — the standalone, dependency-free reference (open in a browser).
- `README.md` — this spec.

## Suggested first task for Claude Code / Cursor
> "Implement the MuNu Welcome screen described in `README.md`, matching
> `welcome-reference.html`. Use our existing component library and theme tokens —
> add the accent token set (default Lilac) to our theme. Reproduce the ripple +
> dot-pulse animation and the `prefers-reduced-motion` fallback exactly. Wire
> 'Get Started' to the onboarding route and 'See it in action' to the demo."
