# Restyle the Insight → Arrival screens (1–4)

I have a React + CSS app ("MuNu"). I want to restyle screens **1 through
4** of the insight → arrival flow to a new calm, cream + Lora look with a flowing
"sound wave" background. **This is a VISUAL RESTYLE ONLY** — do not change flow,
routing, screen order, state, logic, navigation, timing, or copy. Reuse my
EXISTING handlers, data, and text; only the presentation (markup + styles) changes.

The four screens, in order:
  1. **Loading** — "Thanks for sharing. / Hang tight while we put together
     something for you." + a faint "Listening to where you are…" line.
  2. **Insight (loading)** — "Where the music meets you now" + the insight
     paragraph, with a faint "Mapping the journey forward…" line while the
     playlist is still being generated.
  3. **Insight (ready)** — the same insight, but the faint line is replaced by a
     "Show me my playlist" button once the playlist is ready.
  4. **Playlist / arrival** — "Musical nutrients for the journey forward", a
     "Why these songs?" link, a "ViVi's walkthrough" pill, the song card with
     album art + play bar, the song title/artist/note + carousel dots, and a
     "Copy song list" button.

(Screens 2 and 3 are the SAME screen in two states — use one component, toggle
the footer between the status line and the CTA with your existing "is the
playlist ready" state.)

## Files added (in `design-docs/arrival/` — move next to your components and fix
import paths as needed)

- `LoadingScreen.jsx`   → screen 1
- `InsightScreen.jsx`   → screens 2 & 3 (status line ↔ CTA)
- `PlaylistScreen.jsx`  → screen 4
- `ArrivalScreens.css`  → styles for all of the above
- `SoundWave.jsx` + `SoundWave.css` → the flowing wave background (already
  included here; if you used the earlier sound-wave handoff, reuse that copy)

## What to do

1. **Map each existing screen to its component** and list the mapping for me
   before editing.

2. **Refactor each screen to render the matching component**, passing the
   EXISTING copy, data, and handlers. Examples:

   ```jsx
   // 1 · Loading
   <LoadingScreen accent="var(--accent)" />   // or pass your own title/status

   // 2 & 3 · Insight — one component, two states
   <InsightScreen
     accent="var(--accent)"
     title={insight.title}                 // your existing strings
     status="Mapping the journey forward"  // shown while NOT ready
     onContinue={playlistReady ? goToPlaylist : undefined}  // CTA shows once ready
     continueLabel="Show me my playlist"
   >
     {insight.body}                          {/* your generated paragraph */}
   </InsightScreen>

   // 4 · Playlist
   <PlaylistScreen
     accent="var(--accent)"
     title="Musical nutrients for the journey forward"
     song={{ name, artist, note, art, duration }}   // current track from your state
     index={currentIndex} count={tracks.length}
     playing={isPlaying} progress={progress}
     onPlayToggle={togglePlay} onPrev={prev} onNext={next}
     onWhy={openWhy} onVivi={openVivi} viviAvatar={viviImg}
     onCopy={copySongList}
   />
   ```

   - Pass each screen's REAL handlers (the functions already wired to these
     buttons) so behavior is identical. Omit a prop to fall back to the default.
   - The components are presentational; keep YOUR audio/playback, playlist
     generation, and navigation logic exactly where it is.

3. **Container / layering:** each component is already `position: relative` with
   the wave behind (`z-index 0`) and content above (`z-index 1`); the wave is
   `pointer-events: none`. If you mount them inside another wrapper, that wrapper
   shouldn't clip them (no `overflow: hidden` cutting off the 100vh screen).

4. **Accent:** set `--accent` (or pass the `accent` prop) to my app's existing
   accent color so the palette matches.

5. **Reduced motion** is already handled (wave + the "…" hold still).

## Do NOT

- change the autoscroll / transition behavior between screens (keep my existing
  scroll + timing logic),
- change any copy, route, or state,
- swap out my audio player logic — `PlaylistScreen` just renders the controls and
  calls my handlers.

## After you're done

Show me each of the 4 screens and confirm: same copy, same behavior, new look
with the wave background, text legible, nothing overlapping. Start with screen 1,
then 2/3, then 4 — one at a time so I can confirm before moving on.

## Tuning knobs

- `accent` prop / `--accent` — the palette.
- Wave height/intensity: `SoundWave` props (`amplitude`, `mode`) + `SoundWave.css`.
- Type sizes / spacing: `ArrivalScreens.css`.

Note: `ArrivalScreens.css` uses `color-mix()` for accent tints (well-supported in
current browsers). If I need older-browser support, tell me and substitute fixed
rgba() values.
