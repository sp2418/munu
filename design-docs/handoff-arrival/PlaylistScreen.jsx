import { useState } from "react";
import SoundWave from "./SoundWave";
import "./SoundWave.css";
import "./ArrivalScreens.css";

/*
 * PlaylistScreen — Screen 4 of the Insight → Arrival flow ("arrival").
 * Title, "Why these songs?", a ViVi walkthrough pill, the song card with album
 * art + a play bar, the song meta + carousel dots, and "Copy song list".
 *
 * Presentational only — wire YOUR existing data + handlers via props.
 *
 * Props:
 *   title         e.g. "Musical nutrients for the journey forward"
 *   song          { name, artist, note, art, duration } for the current track
 *   index, count  carousel position (0-based) + total, for the dots
 *   playing       boolean — current play state (you own the audio)
 *   onPlayToggle, onPrev, onNext   handlers
 *   onWhy         "Why these songs?" handler
 *   onVivi        ViVi walkthrough handler (pass viviAvatar for the image)
 *   onCopy        "Copy song list" handler
 *   accent        CSS accent color (default var(--accent))
 */
export default function PlaylistScreen({
  title = "Musical nutrients for the journey forward",
  song = {},
  index = 0,
  count = 5,
  playing = false,
  progress = 0,                 // 0..1 of the track
  onPlayToggle, onPrev, onNext,
  onWhy, onVivi, viviAvatar,
  onCopy,
  accent = "var(--accent, #b9a0cf)",
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => { onCopy && onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1900); };

  return (
    <div className="arr-screen" style={{ "--accent": accent }}>
      <SoundWave mode="floor" color={accent} />

      <button className="arr-player__vivi" onClick={onVivi}>
        <span className="arr-player__vivi-av">
          {viviAvatar && <img src={viviAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </span>
        ViVi’s walkthrough
      </button>

      <div className="arr-screen__content arr-player__content">
        <h2 className="arr-player__title">{title}</h2>
        <button className="arr-player__why" onClick={onWhy}>Why these songs?</button>

        <div className="arr-player__stage">
          <button className="arr-arrow" aria-label="Previous" onClick={onPrev}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>

          <div className="arr-card">
            {song.art
              ? <img className="arr-card__art" src={song.art} alt={song.name ? `${song.name} album art` : "Album art"} />
              : <div className="arr-card__art" style={{ background: "#efe7da" }} />}
            <div className="arr-card__bar">
              <button className="arr-play" aria-label={playing ? "Pause" : "Play"} onClick={onPlayToggle}>
                {playing
                  ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>}
              </button>
              <span className="arr-time">0:00</span>
              <div className="arr-track"><div className="arr-track__fill" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              <span className="arr-time">{song.duration || "3:02"}</span>
            </div>
          </div>

          <button className="arr-arrow" aria-label="Next" onClick={onNext}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        <div className="arr-player__meta">
          <p className="arr-player__song">{song.name || "Cinnamon Girl"}</p>
          <p className="arr-player__artist">by {song.artist || "Lana Del Rey"}</p>
          {song.note && <p className="arr-player__note">{song.note}</p>}
          <div className="arr-player__dots">
            {Array.from({ length: count }).map((_, i) => (
              <span key={i} className={i === index ? "is-on" : ""} />
            ))}
          </div>
          <button className={"arr-player__copy" + (copied ? " is-copied" : "")} onClick={copy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            {copied ? "Copied" : "Copy song list"}
          </button>
        </div>
      </div>
    </div>
  );
}
