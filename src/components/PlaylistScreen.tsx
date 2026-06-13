import type { CSSProperties, ReactNode } from "react"

import SoundWave from "./SoundWave"
import { cn } from "../lib/utils"
import "./ArrivalScreens.css"

export interface PlaylistSong {
  name?: string
  artist?: string
  note?: string
  art?: string
  duration?: string
}

export interface PlaylistScreenProps {
  title?: ReactNode
  song?: PlaylistSong
  index?: number
  count?: number
  previewBar?: ReactNode
  onPrev?: () => void
  onNext?: () => void
  onWhy?: () => void
  whyButtonId?: string
  whyPanelId?: string
  whyExpanded?: boolean
  whyPanel?: ReactNode
  onCopy?: () => void
  copyLabel?: string
  copyStatus?: ReactNode
  accent?: string
  className?: string
  contentClassName?: string
  titleClassName?: string
  whyClassName?: string
  stageClassName?: string
  cardClassName?: string
  cardStyle?: CSSProperties
  captionClassName?: string
  captionStyle?: CSSProperties
  waveGetCy?: () => number
  waveCy?: number
  children?: ReactNode
}

export default function PlaylistScreen({
  title = "Musical nutrients for the journey forward",
  song = {},
  index = 0,
  count = 0,
  previewBar,
  onPrev,
  onNext,
  onWhy,
  whyButtonId,
  whyPanelId,
  whyExpanded,
  whyPanel,
  onCopy,
  copyLabel = "Copy song list",
  copyStatus,
  accent = "var(--fill)",
  className,
  contentClassName,
  titleClassName,
  whyClassName,
  stageClassName,
  cardClassName,
  cardStyle,
  captionClassName,
  captionStyle,
  waveGetCy,
  waveCy = 300,
  children,
}: PlaylistScreenProps) {
  return (
    <div
      className={cn("arr-screen arr-screen--playlist", className)}
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className={cn("arr-screen__content arr-player__content", contentClassName)}>
        <h2 className={cn("arr-player__title", titleClassName)}>{title}</h2>

        {onWhy ? (
          <div className={cn("arr-player__why-wrap", whyClassName)}>
            <button
              type="button"
              id={whyButtonId}
              className="arr-player__why"
              aria-expanded={whyExpanded}
              aria-controls={whyPanelId}
              onClick={onWhy}
            >
              Why these songs?
            </button>
            {whyPanel}
          </div>
        ) : null}

        <div className={cn("arr-player__stage", stageClassName)}>
          <div className="arr-player__stage-wave" aria-hidden>
            <SoundWave
              mode="band"
              color={accent}
              cy={waveCy}
              getCy={waveGetCy}
              swell={0.4}
            />
          </div>
          <button type="button" className="arr-arrow" aria-label="Previous" onClick={onPrev}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className={cn("arr-card", cardClassName)} style={cardStyle}>
            {song.art ? (
              <img
                className="arr-card__art"
                src={song.art}
                alt={song.name ? `${song.name} album art` : "Album art"}
              />
            ) : (
              <div className="arr-card__art arr-card__art--placeholder" aria-hidden />
            )}
            {previewBar ? (
              <div className="arr-card__bar arr-card__bar--preview">{previewBar}</div>
            ) : null}
          </div>

          <button type="button" className="arr-arrow" aria-label="Next" onClick={onNext}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="arr-player__meta">
          <div
            className={cn("arr-player__caption", captionClassName)}
            style={captionStyle}
          >
            {song.name ? <p className="arr-player__song">{song.name}</p> : null}
            {song.artist ? <p className="arr-player__artist">by {song.artist}</p> : null}
            {song.note ? <p className="arr-player__note">{song.note}</p> : null}
          </div>
          {count > 0 ? (
            <div className="arr-player__dots" aria-hidden>
              {Array.from({ length: count }).map((_, i) => (
                <span key={i} className={i === index ? "is-on" : ""} />
              ))}
            </div>
          ) : null}
          {onCopy ? (
            <div className="arr-player__copy-wrap">
              <button type="button" className="arr-player__copy" onClick={onCopy}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copyLabel}
              </button>
              {copyStatus}
            </div>
          ) : null}
        </div>

        {children}
      </div>
    </div>
  )
}
