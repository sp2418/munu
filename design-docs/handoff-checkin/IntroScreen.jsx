import SoundWave from "./SoundWave";        // from the soundwaves handoff
// import CursorNotes from "./CursorNotes";  // optional note stream
import "./SoundWave.css";
import "./IntroScreen.css";

/*
 * IntroScreen — the "check-in intro" look as a REUSABLE template for any
 * centered intro / transition / interstitial screen in the flow (e.g.
 * "Now, let's check in with you.", stage hand-offs, "you're all set", etc).
 *
 * Centered: optional pulsing dot, optional eyebrow, a Lora title, a muted
 * subtitle, the flowing sound wave as a low horizon, and a bottom footer with
 * Back + a primary forward action. Everything is props so one component covers
 * every screen that shares this look.
 *
 *   <IntroScreen
 *     eyebrow="Checking in"
 *     title="Now, let’s check in with you."
 *     subtitle="A few questions about how you’re feeling right now, so we can meet you there."
 *     onBack={goBack}
 *     onContinue={goNext}
 *   />
 *
 * Props:
 *   eyebrow        small uppercase label above the title (optional)
 *   title          the headline (string or node)
 *   subtitle       muted supporting line (optional, string or node)
 *   showDot        show the pulsing accent dot above the eyebrow (default true)
 *   backLabel      default "Back"   · onBack       click handler (hides if omitted)
 *   continueLabel  default "Continue" · onContinue click handler (hides if omitted)
 *   accent         CSS accent color (default var(--accent))
 *   children       extra content rendered under the subtitle (optional)
 */

export default function IntroScreen({
  eyebrow,
  title,
  subtitle,
  showDot = true,
  backLabel = "Back",
  onBack,
  continueLabel = "Continue",
  onContinue,
  accent = "var(--accent, #8a5cf6)",
  children,
}) {
  return (
    <div className="intro-screen" style={{ "--accent": accent }}>
      <SoundWave mode="floor" color={accent} />
      {/* <CursorNotes color={accent} /> */}

      <div className="intro-screen__content">
        {showDot && <span className="intro-screen__dot" />}
        {eyebrow && <p className="intro-screen__eyebrow">{eyebrow}</p>}
        <h1 className="intro-screen__title">{title}</h1>
        {subtitle && <p className="intro-screen__sub">{subtitle}</p>}
        {children}
      </div>

      {(onBack || onContinue) && (
        <div className="intro-screen__footer">
          {onBack
            ? <button type="button" className="intro-screen__back" onClick={onBack}>{backLabel}</button>
            : <span />}
          {onContinue && (
            <button type="button" className="intro-screen__next" onClick={onContinue}>{continueLabel}</button>
          )}
        </div>
      )}
    </div>
  );
}
