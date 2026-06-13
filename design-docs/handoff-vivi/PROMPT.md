# Restyle the story / character screens (the "Meet ViVi" look)

I have a React + CSS app ("MuNu"). I want to apply ONE consistent look
to the **story / narrative screens** — a centered illustration above a short
narrative paragraph, with Back / forward navigation (the "This is ViVi…" screen
is the reference). **Visual restyle only**: don't change flow, routing, state,
navigation, or copy.

Files added (in `design-docs/story/` — move next to your components):

- `StoryScreen.jsx` + `StoryScreen.css` — a reusable template for this look.
- It depends on `SoundWave.jsx` + `SoundWave.css` (from the sound-wave handoff).
  Make sure those exist in the project and fix the import path at the top of
  `StoryScreen.jsx` if needed.

## The look

- Foundation: warm cream `#f8f4ec`, **Lora** serif.
- A centered **illustration** in a soft rounded frame, above a muted Lora
  paragraph (emphasis words in `<b>` turn a darker ink).
- The flowing **sound wave** as a low horizon behind the content.
- A bottom footer: outlined **Back** (left) + filled pebble forward button with
  a `→` (right).
- Accent from `--accent` (or the `accent` prop) — point it at the app's accent.

## What to do

1. **Identify the story / character screens** that share this look (the narrative
   walkthrough steps). List them for me.

2. **Refactor each to render `<StoryScreen>`**, passing the existing illustration,
   paragraph, and the existing navigation handlers — keep the SAME handlers and
   routes:

   ```jsx
   import StoryScreen from "@/components/StoryScreen";
   import viviImg from "@/assets/vivi.png";

   function MeetViviScreen({ goBack, goNext }) {
     return (
       <StoryScreen
         image={viviImg}
         imageAlt="ViVi waving"
         onBack={goBack}
         continueLabel="Follow along"
         onContinue={goNext}
         accent="var(--accent)"
       >
         This is <b>ViVi</b>. She’s a 28-year-old barista who just got off a long
         day of work. As one commonly does, she decided to relax by scrolling
         through social media — but it ended up making her feel more agitated
         than at ease. Luckily, music has always been a way for her to calm down,
         so she opened <b>MuNu</b>. Let’s see how it goes.
       </StoryScreen>
     );
   }
   ```

   - Pass the screen's REAL illustration via `image` (a URL/import).
   - If your illustration is a **drag-and-drop / upload slot** rather than a
     static asset, pass that component via the `imageSlot` prop instead of
     `image` — it renders inside the same frame. If neither is given, a labeled
     `placeholder` shows.
   - Reuse each screen's existing label + handler (e.g. "Follow along", "Next")
     so behavior is unchanged. Omit a handler to hide that button.

3. **Don't change flow/logic** — reuse existing navigation functions, no new
   routes, no copy edits.

4. **Reduced motion** is already handled (the wave holds still).

## After you're done

Show me each screen you converted and confirm: same illustration + copy + nav
behavior, new centered look with the wave horizon, paragraph legible, nothing
overlapping. Start with the Meet-ViVi screen so I can confirm before rolling out.

## Tuning knobs

- `accent` prop / `--accent` — the palette.
- Illustration size / shape: `.story-screen__art` in `StoryScreen.css`
  (and `object-fit` on `.story-screen__img`).
- Paragraph size / width / color: `.story-screen__body`.
- Wave height/intensity: `SoundWave` props (`amplitude`) and `SoundWave.css`.
