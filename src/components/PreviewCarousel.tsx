import { useEffect, useRef, type CSSProperties } from "react"
import { cn } from "../lib/utils"
import type { SyncedPlayerProps } from "./playlistPlayerTypes"
import "./ArrivalScreens.css"

export type PreviewCarouselProps = SyncedPlayerProps & {
  stageClassName?: string
  cardClassName?: string
  cardStyle?: CSSProperties
  captionClassName?: string
  captionStyle?: CSSProperties
}

export default function PreviewCarousel({
  tracks,
  activeIndex,
  onActiveIndexChange,
  className,
  stageClassName,
  cardClassName,
  cardStyle,
  captionClassName,
  captionStyle,
}: PreviewCarouselProps) {
  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(0, tracks.length - 1))
  const song = tracks[safeIndex]
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.load()
  }, [song?.previewUrl, safeIndex])

  const goPrev = () => {
    if (safeIndex <= 0) return
    onActiveIndexChange(safeIndex - 1)
  }

  const goNext = () => {
    if (safeIndex >= tracks.length - 1) return
    onActiveIndexChange(safeIndex + 1)
  }

  return (
    <div className={cn("arr-preview-carousel", className)}>
      <div className={cn("arr-player__stage", stageClassName)}>
        <button type="button" className="arr-arrow" aria-label="Previous" onClick={goPrev}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className={cn("arr-card", cardClassName)} style={cardStyle}>
          {song?.imageUrl ? (
            <img
              className="arr-card__art"
              src={song.imageUrl}
              alt={song.title ? `${song.title} album art` : "Album art"}
            />
          ) : (
            <div className="arr-card__art arr-card__art--placeholder" aria-hidden />
          )}
          <div className="arr-card__bar arr-card__bar--preview">
            {song?.previewUrl ? (
              <audio
                ref={audioRef}
                key={song.previewUrl}
                controls
                src={song.previewUrl}
                preload="none"
                onEnded={() => {
                  if (safeIndex < tracks.length - 1) onActiveIndexChange(safeIndex + 1)
                }}
              />
            ) : (
              <p className="arr-card__preview-missing">No 30-sec preview available</p>
            )}
          </div>
        </div>

        <button type="button" className="arr-arrow" aria-label="Next" onClick={goNext}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="arr-player__meta">
        <div className={cn("arr-player__caption", captionClassName)} style={captionStyle}>
          {song?.title ? <p className="arr-player__song">{song.title}</p> : null}
          {song?.artist ? <p className="arr-player__artist">by {song.artist}</p> : null}
          {song?.explanation ? <p className="arr-player__note">{song.explanation}</p> : null}
        </div>
        {tracks.length > 0 ? (
          <div className="arr-player__dots" aria-hidden>
            {Array.from({ length: tracks.length }).map((_, i) => (
              <span key={i} className={i === safeIndex ? "is-on" : ""} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
