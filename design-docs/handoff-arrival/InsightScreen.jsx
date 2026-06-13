import SoundWave from "./SoundWave";
import "./SoundWave.css";
import "./ArrivalScreens.css";

/*
 * InsightScreen — Screens 2 & 3 of the Insight → Arrival flow.
 * The insight title + body, with a footer that is EITHER a faint status line
 * ("Mapping the journey forward…", screen 2, while the playlist is still being
 * built) OR the primary CTA ("Show me my playlist", screen 3, once it's ready).
 *
 * Drive which one shows with YOUR existing state:
 *   - still loading the playlist → pass `status="Mapping the journey forward"`
 *   - ready                      → pass `onContinue={...}` (CTA replaces status)
 * If onContinue is provided it takes precedence over status.
 *
 * Props:
 *   title          insight headline (default matches the design)
 *   children       the insight body paragraph (pass your generated text)
 *   status         faint italic footer line while loading (animated "…")
 *   continueLabel  CTA label (default "Show me my playlist")
 *   onContinue     CTA handler — when set, the CTA shows instead of the status
 *   accent         CSS accent color (default var(--accent))
 */
export default function InsightScreen({
  title = "Where the music meets you now",
  children,
  status = "Mapping the journey forward",
  continueLabel = "Show me my playlist",
  onContinue,
  accent = "var(--accent, #b9a0cf)",
}) {
  return (
    <div className="arr-screen" style={{ "--accent": accent }}>
      <SoundWave mode="floor" color={accent} />
      <div className="arr-screen__content">
        <div className="arr-insight__inner">
          <h2 className="arr-insight__title">{title}</h2>
          <p className="arr-insight__body">{children}</p>
        </div>
      </div>
      <div className="arr-foot">
        {onContinue
          ? <button className="arr-cta" onClick={onContinue}>{continueLabel}</button>
          : status
            ? <span className="arr-status arr-dots">{status}</span>
            : null}
      </div>
    </div>
  );
}
