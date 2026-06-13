# Replace the concentric-circles background with the flowing sound wave

I have a React/CSS web app (the "MuNu" music app). Several screens
currently render an animated **concentric-circles / ripple** background behind
their content. I want to replace that background everywhere with a calm,
continuously undulating **sound wave** — without changing any flow, structure,
navigation, transitions, state, or copy. This is a **visual swap only**.

I've added these files to the project (in `design-docs/soundwaves/` — move them
to wherever components live):

- `SoundWave.jsx` + `SoundWave.css`  → the wave background (the replacement)
- `CursorNotes.jsx` + `CursorNotes.css` → OPTIONAL: a stream of musical notes
  that follows the cursor (only add if I say so / see the "Optional" section)

## What to do

1. **Find the concentric-circles background.** Search the codebase for the
   existing ripple/rings background — likely a component or element rendered on
   multiple screens (look for names/classes like `rings`, `ripple`, `circles`,
   `concentric`, `pulse`, `halo`, `bloom`, or repeated `border-radius: 50%`
   `<span>`/`<div>` rings, or an SVG of concentric `<circle>`s, possibly with a
   `@keyframes` that scales/fades them). Show me each place it's used before
   editing if you're unsure.

2. **Replace it with `<SoundWave />`.** For each screen that rendered the
   circles, remove the circles element and render `<SoundWave />` in the same
   spot (as the first child of that screen's container, behind the content).
   - Import the CSS once (e.g. in `SoundWave.jsx`'s consumers or your global
     stylesheet): `import "./SoundWave.css";`
   - **Mode:** use `mode="floor"` for most screens (the wave sits low, like a
     horizon, below the content). Use `mode="center"` only for screens where
     content is vertically centered and you want the wave to read at the left/
     right margins (it's masked to dissolve behind centered text).
   - **Color:** pass the app's accent — either `color="<accent>"` or set
     `--wave-color` on a parent and let it default. Match whatever the circles
     used so the palette is unchanged.
   - **Swell on interaction (optional):** pass `swell={0.4}` to make the wave
     gently swell then settle whenever the user clicks or types within the
     screen (it listens on the container by default — `swellOn="parent"`). Set
     `swell={0}` (default) to keep it purely ambient. For a custom trigger,
     pass a ref and call `ref.current.excite()`.

3. **Container requirements (important):**
   - The screen container that holds `<SoundWave />` must be
     `position: relative` (so the absolutely-positioned wave fills it).
   - The actual screen content must sit **above** the wave: give the content
     wrapper `position: relative; z-index: 1` (the wave is `z-index: 0`).
   - `<SoundWave />` is `pointer-events: none`, so it won't block interaction.

4. **Keep behavior identical.** Do NOT touch routing, component state, form
   logic, props that drive the flow, or copy. Only swap the background element
   and the minimal CSS needed for layering. If the old circles component is no
   longer referenced anywhere, you may delete it.

5. **Reduced motion:** `SoundWave` already renders a single static frame when
   the user prefers reduced motion — no extra work needed.

## Example

```jsx
import SoundWave from "@/components/SoundWave";
import "@/components/SoundWave.css";

function CheckInScreen() {
  return (
    <div className="screen" style={{ position: "relative", overflow: "hidden" }}>
      <SoundWave mode="floor" color="var(--accent)" swell={0.4} />
      <div className="screen__content" style={{ position: "relative", zIndex: 1 }}>
        {/* …unchanged existing content… */}
      </div>
    </div>
  );
}
```

## Optional — cursor note stream

If I ask for it, also add `<CursorNotes />` (import `CursorNotes.css`) as a
sibling of `<SoundWave />` inside the same `position: relative` container. It
emits a sparse, slow trickle of musical notes (♪ ♫ ♩) that follow the cursor and
fade; it's `pointer-events: none` so it never blocks clicks. Pass the same
`color`. Tune density with the `every` prop (ms between notes; higher = sparser).

## After you're done

Show me each screen you changed and confirm: the circles are gone, the wave
renders behind legible content, nothing overlaps or blocks clicks, and the flow/
navigation is unchanged. Start with ONE screen so I can confirm the look before
you roll it across the rest.

## Tuning knobs (for later)

- `amplitude` prop on `SoundWave` (default 1) — `0.7` calmer, `1.4` more present.
- `swell` prop (default 0) — strength of the click/type swell; `0.4` is gentle.
  `swellOn` chooses the listen target ("parent" | "document" | an Element).
- Mask spread / wave height: edit `SoundWave.css` (the `--center` / `--floor`
  mask gradients) and the `cy` values in `SoundWave.jsx` (`floor` = 648,
  `center` = 360 within the 1120×720 viewBox).
- Line count/opacity/speed: the `LINES` array in `SoundWave.jsx`.
