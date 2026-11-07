import type { CSSProperties, ReactNode } from "react"
import { cn } from "../lib/utils"
import YoutubePlaylistPlayer from "./YoutubePlaylistPlayer"
import PreviewCarousel from "./PreviewCarousel"
import type { SyncedPlaylistTrack } from "./playlistPlayerTypes"
import "./ArrivalScreens.css"

export type PlaylistSyncedLayoutProps = {
  tracks: SyncedPlaylistTrack[]
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  /** YouTube when available; otherwise 30s preview carousel. */
  mode: "youtube" | "preview"
  /** When set, replaces the player slot (e.g. “Building playlist…”). */
  playerPlaceholder?: ReactNode
  leadingNotice?: ReactNode
  onCopy?: () => void
  copyLabel?: string
  /** Optional action beside Copy list (e.g. Open on YouTube). */
  headerAction?: ReactNode
  className?: string
  listClassName?: string
  playerClassName?: string
  /** Preview-only extras forwarded to PreviewCarousel. */
  previewStageClassName?: string
  previewCardClassName?: string
  previewCardStyle?: CSSProperties
  previewCaptionClassName?: string
  previewCaptionStyle?: CSSProperties
}

export default function PlaylistSyncedLayout({
  tracks,
  activeIndex,
  onActiveIndexChange,
  mode,
  playerPlaceholder,
  leadingNotice,
  onCopy,
  copyLabel = "Copy list",
  headerAction,
  className,
  listClassName,
  playerClassName,
  previewStageClassName,
  previewCardClassName,
  previewCardStyle,
  previewCaptionClassName,
  previewCaptionStyle,
}: PlaylistSyncedLayoutProps) {
  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(0, tracks.length - 1))
  const youtubeMode = mode === "youtube"

  return (
    <div className={cn("arr-playlist-sync", className)}>
      {leadingNotice ? (
        <div className="arr-playlist-sync__notice">{leadingNotice}</div>
      ) : null}

      <div className="arr-playlist-sync__grid">
        <div className={cn("arr-playlist-sync__list-col", listClassName)}>
          <div className="arr-playlist-sync__list-header">
            <div className="arr-playlist-sync__list-heading">
              <h3 className="arr-playlist-sync__list-title">Your playlist</h3>
            </div>
            {onCopy || headerAction ? (
              <div className="arr-playlist-sync__header-actions">
                {headerAction}
                {onCopy ? (
                  <button
                    type="button"
                    className="arr-playlist-sync__action"
                    onClick={onCopy}
                    aria-label={
                      copyLabel === "Copied" ? "Playlist copied" : "Copy playlist as plain text"
                    }
                  >
                    {copyLabel}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <ol className="arr-playlist-sync__rows" aria-label="Playlist songs">
            {tracks.map((track, i) => {
              const isActive = i === safeIndex
              const isPast = i < safeIndex
              const previewOnly = youtubeMode && !track.videoId
              const title = track.title?.trim() || "Unknown track"
              const artist = track.artist?.trim() || "Unknown artist"

              return (
                <li key={`sync-row-${i}-${title}-${artist}`} className="arr-playlist-sync__row-wrap">
                  <button
                    type="button"
                    className={cn(
                      "arr-playlist-sync__row",
                      isActive && "is-active",
                      isPast && "is-past",
                    )}
                    onClick={() => onActiveIndexChange(i)}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={`${i + 1}. ${title} by ${artist}${previewOnly ? " (preview only)" : ""}`}
                  >
                    <span className="arr-playlist-sync__num" aria-hidden>
                      {isActive ? (
                        <span className="arr-playlist-sync__playing" />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="arr-playlist-sync__text">
                      <span className="arr-playlist-sync__track-title">{title}</span>
                      <span className="arr-playlist-sync__track-artist">{artist}</span>
                    </span>
                    {previewOnly ? (
                      <span className="arr-playlist-sync__tag">preview only</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <div className={cn("arr-playlist-sync__player-col", playerClassName)}>
          {playerPlaceholder != null ? (
            playerPlaceholder
          ) : mode === "youtube" ? (
            <YoutubePlaylistPlayer
              tracks={tracks}
              activeIndex={safeIndex}
              onActiveIndexChange={onActiveIndexChange}
            />
          ) : (
            <PreviewCarousel
              tracks={tracks}
              activeIndex={safeIndex}
              onActiveIndexChange={onActiveIndexChange}
              stageClassName={previewStageClassName}
              cardClassName={previewCardClassName}
              cardStyle={previewCardStyle}
              captionClassName={previewCaptionClassName}
              captionStyle={previewCaptionStyle}
            />
          )}
        </div>
      </div>
    </div>
  )
}
