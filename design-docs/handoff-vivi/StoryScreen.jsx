import SoundWave from "./SoundWave";        // from the soundwaves handoff
import "./SoundWave.css";
import "./StoryScreen.css";

/*
 * StoryScreen — the "Meet ViVi" look: a centered illustration above a muted
 * narrative paragraph, the sound-wave horizon, and a Back / forward footer.
 * Reusable for any story / character / narrative-step screen.
 *
 *   <StoryScreen
 *     image={viviSrc}                 // or pass `imageSlot` for a drop target
 *     imageAlt="ViVi waving"
 *     onBack={goBack}
 *     continueLabel="Follow along"
 *     onContinue={goNext}
 *   >
 *     This is <b>ViVi</b>. She’s a 28-year-old barista… so she opened <b>MuNu</b>.
 *   </StoryScreen>
 *
 * Props:
 *   image          illustration URL (rendered inside the rounded frame)
 *   imageAlt       alt text for the illustration
 *   imageSlot      OR a custom node to render in the frame (e.g. your own
 *                  drag-and-drop image component). Takes precedence over `image`.
 *   placeholder    label shown when neither image nor imageSlot is provided
 *                  (default "Illustration")
 *   children       the narrative paragraph (wrap key words in <b> to emphasize)
 *   backLabel      default "Back"        · onBack       (hides if omitted)
 *   continueLabel  default "Follow along" · onContinue  (hides if omitted)
 *   showArrow      show the → on the forward button (default true)
 *   accent         CSS accent color (default var(--accent))
 */

export default function StoryScreen({
  image,
  imageAlt = "",
  imageSlot,
  placeholder = "Illustration",
  children,
  backLabel = "Back",
  onBack,
  continueLabel = "Follow along",
  onContinue,
  showArrow = true,
  accent = "var(--accent, #8a5cf6)",
}) {
  return (
    <div className="story-screen" style={{ "--accent": accent }}>
      <SoundWave mode="floor" color={accent} />

      <div className="story-screen__content">
        <div className="story-screen__art">
          {imageSlot
            ? imageSlot
            : image
              ? <img className="story-screen__img" src={image} alt={imageAlt} />
              : <span className="story-screen__placeholder">{placeholder}</span>}
        </div>
        <p className="story-screen__body">{children}</p>
      </div>

      {(onBack || onContinue) && (
        <div className="story-screen__footer">
          {onBack
            ? <button type="button" className="story-screen__back" onClick={onBack}>{backLabel}</button>
            : <span />}
          {onContinue && (
            <button type="button" className="story-screen__next" onClick={onContinue}>
              {continueLabel}
              {showArrow && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
