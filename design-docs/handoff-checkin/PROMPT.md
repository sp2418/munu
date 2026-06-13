# Restyle the centered intro / transition screens (the "check-in intro" look)

I have a React + CSS app ("MuNu"). I want to apply ONE consistent look
to all the **centered intro / transition / interstitial screens** — the screens
that show a short centered message and Back / Continue (the "Now, let's check in
with you." screen is the reference). This is a **visual restyle only**: do not
change flow, routing, state, navigation, or copy.

Files added (in `design-docs/checkin/` — move next to your components):

- `IntroScreen.jsx` + `IntroScreen.css` — a reusable template for this look.
- It depends on `SoundWave.jsx` + `SoundWave.css` (from the sound-wave handoff).
  Make sure those exist in the project and fix the import path at the top of
  `IntroScreen.jsx` if needed.

## The look

- Foundation: warm cream `#f8f4ec` background, **Lora** serif headline.
- A soft **pulsing accent dot**, a small uppercase eyebrow, the Lora title, a
  muted **Hanken Grotesk** subtitle — all vertically centered.
- The flowing **sound wave** as a low horizon behind the content.
- A bottom footer: outlined **Back** (left) + filled pebble **Continue** (right).
- Accent color comes from `--accent` (or the `accent` prop). Point it at the
  app's existing accent so the palette is unchanged.

## What to do

1. **Identify every screen that shares this look** — a centered short message
   with Back/Continue (the stage lead-ins / interstitials). List them for me.

2. **Refactor each to render `<IntroScreen>`**, passing the existing copy and the
   existing navigation handlers. Keep the SAME handlers/routes — only the
   presentation changes:

   ```jsx
   import IntroScreen from "@/components/IntroScreen";

   function CheckInScreen({ goBack, goNext }) {
     return (
       <IntroScreen
         eyebrow="Checking in"
         title="Now, let’s check in with you."
         subtitle="A few questions about how you’re feeling right now, so we can meet you there."
         backLabel="Back"      onBack={goBack}
         continueLabel="Continue" onContinue={goNext}
         accent="var(--accent)"
       />
     );
   }
   ```

   - Omit `eyebrow` / `subtitle` / `showDot` where a screen doesn't need them.
   - If a screen has no Back (or no forward) action, omit that handler and the
     button won't render.
   - Use the matching label + handler from each screen's current implementation
     (e.g. "Follow along", "Get started") so behavior is identical.

3. **Don't change flow/logic.** Reuse the existing onClick/navigation functions.
   No new routes, no state changes, no copy edits.

4. **Reduced motion** is already handled (dot + wave hold still).

## After you're done

Show me each screen you converted and confirm: same copy, same Back/Continue
behavior, new centered look with the wave horizon, text legible, nothing
overlapping. Start with the check-in screen so I can confirm before you roll it
across the others.

## Tuning knobs

- `accent` prop / `--accent` — the palette.
- `showDot={false}` to drop the pulsing dot on a given screen.
- Wave height/intensity: `SoundWave` props (`amplitude`) and `SoundWave.css`.
- Type sizes / spacing: `IntroScreen.css`.
