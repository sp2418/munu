import SoundWave from "./SoundWave";
import "./SoundWave.css";
import "./ArrivalScreens.css";

/*
 * LoadingScreen — Screen 1 of the Insight → Arrival flow.
 * "Thanks for sharing. / Hang tight…" with a faint "Listening…" line.
 * Visual-only: pass your existing copy. Show/hide it with your own state.
 *
 * Props:
 *   title     main message (string or node). Default matches the design.
 *   status    the faint italic status line (an animated "…" is appended)
 *   accent    CSS accent color (default var(--accent))
 */
export default function LoadingScreen({
  title = (<>Thanks for sharing.<br />Hang tight while we put together something for you.</>),
  status = "Listening to where you are",
  accent = "var(--accent, #b9a0cf)",
}) {
  return (
    <div className="arr-screen" style={{ "--accent": accent }}>
      <SoundWave mode="floor" color={accent} />
      <div className="arr-screen__content">
        <p className="arr-load__title">{title}</p>
        {status && <p className="arr-load__sub arr-dots">{status}</p>}
      </div>
    </div>
  );
}
