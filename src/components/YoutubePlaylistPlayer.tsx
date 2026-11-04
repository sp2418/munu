import { useEffect, useMemo, useRef, useState } from "react"
import { Eye, EyeOff, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { cn } from "../lib/utils"
import type { SyncedPlayerProps, SyncedPlaylistTrack } from "./playlistPlayerTypes"

type YtPlayer = {
  destroy: () => void
  playVideo: () => void
  pauseVideo: () => void
  nextVideo: () => void
  previousVideo: () => void
  playVideoAt: (index: number) => void
  cuePlaylist: (playlist: string | string[], index?: number) => void
  getPlayerState: () => number
  getPlaylistIndex: () => number
  getPlaylist: () => string[] | null | undefined
}

type YtPlayerStateMap = {
  UNSTARTED: number
  ENDED: number
  PLAYING: number
  PAUSED: number
  BUFFERING: number
  CUED: number
}

type YtNamespace = {
  Player: new (
    element: HTMLElement | string,
    options: {
      width?: string | number
      height?: string | number
      videoId?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: { target: YtPlayer }) => void
        onStateChange?: (event: { data: number; target: YtPlayer }) => void
      }
    },
  ) => YtPlayer
  PlayerState: YtPlayerStateMap
}

declare global {
  interface Window {
    YT?: YtNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<YtNamespace> | null = null

function loadYoutubeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve) => {
    const prior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prior?.()
      if (window.YT) resolve(window.YT)
    }

    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script")
      tag.id = "yt-iframe-api"
      tag.src = "https://www.youtube.com/iframe_api"
      document.body.appendChild(tag)
    } else if (window.YT?.Player) {
      resolve(window.YT)
    }
  })

  return youtubeApiPromise
}

function buildPlayableMaps(tracks: SyncedPlaylistTrack[]) {
  const playableIds: string[] = []
  const playableToFull: number[] = []
  const fullToPlayable: Array<number | null> = tracks.map(() => null)

  tracks.forEach((track, fullIndex) => {
    const id = typeof track.videoId === "string" ? track.videoId.trim() : ""
    if (!id) return
    const playableIndex = playableIds.length
    playableIds.push(id)
    playableToFull.push(fullIndex)
    fullToPlayable[fullIndex] = playableIndex
  })

  return { playableIds, playableToFull, fullToPlayable }
}

export type YoutubePlaylistPlayerProps = SyncedPlayerProps

export default function YoutubePlaylistPlayer({
  tracks,
  activeIndex,
  onActiveIndexChange,
  className,
}: YoutubePlaylistPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const readyRef = useRef(false)
  const queuedPlayableIndexRef = useRef<number | null>(null)
  /** Suppress playVideoAt during initial cue so the playlist doesn't autoplay on load. */
  const suppressAutoplayRef = useRef(true)
  const activeIndexRef = useRef(activeIndex)
  const onActiveIndexChangeRef = useRef(onActiveIndexChange)
  const applyingFromListRef = useRef(false)

  const { playableIds, playableToFull, fullToPlayable } = useMemo(
    () => buildPlayableMaps(tracks),
    [tracks],
  )
  const playableKey = playableIds.join(",")
  const mapsRef = useRef({ playableIds, playableToFull, fullToPlayable })

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [playlistIndex, setPlaylistIndex] = useState(0)
  const [videoCovered, setVideoCovered] = useState(false)

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    onActiveIndexChangeRef.current = onActiveIndexChange
  }, [onActiveIndexChange])

  useEffect(() => {
    mapsRef.current = { playableIds, playableToFull, fullToPlayable }
  }, [playableIds, playableToFull, fullToPlayable])

  useEffect(() => {
    if (playableIds.length === 0 || !mountRef.current) return

    let cancelled = false
    const host = document.createElement("div")
    host.className = "arr-youtube__host"
    mountRef.current.replaceChildren(host)

    readyRef.current = false
    queuedPlayableIndexRef.current = null
    suppressAutoplayRef.current = true
    setReady(false)
    setPlaying(false)
    setPlaylistIndex(0)

    const ids = playableIds
    const initialPlayable =
      fullToPlayable[Math.min(Math.max(0, activeIndexRef.current), tracks.length - 1)] ?? 0

    void loadYoutubeApi().then((YT) => {
      if (cancelled) return

      playerRef.current?.destroy()
      playerRef.current = null

      // Seed with the first ID only — do NOT pass `playlist` in playerVars.
      // videoId + playlist=rest drops song 1 from the player's queue and shifts
      // every index, so list clicks land on the wrong track. Load the full set
      // via cuePlaylist in onReady instead.
      playerRef.current = new YT.Player(host, {
        width: "100%",
        height: "100%",
        videoId: ids[0],
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return
            const startAt = queuedPlayableIndexRef.current ?? initialPlayable
            queuedPlayableIndexRef.current = null
            // cuePlaylist loads without playing (unlike playVideoAt).
            event.target.cuePlaylist(ids, startAt)
            readyRef.current = true
            setReady(true)
            setPlaylistIndex(Math.max(0, event.target.getPlaylistIndex() || startAt))

            // Allow list clicks to play only after the initial cue has settled.
            window.requestAnimationFrame(() => {
              if (!cancelled) suppressAutoplayRef.current = false
            })
          },
          onStateChange: (event) => {
            if (cancelled) return
            const state = event.data
            setPlaying(state === YT.PlayerState.PLAYING)
            if (
              state === YT.PlayerState.PLAYING ||
              state === YT.PlayerState.PAUSED ||
              state === YT.PlayerState.BUFFERING ||
              state === YT.PlayerState.CUED
            ) {
              const nextPlaylistIndex = Math.max(0, event.target.getPlaylistIndex() || 0)
              setPlaylistIndex(nextPlaylistIndex)

              if (applyingFromListRef.current) {
                applyingFromListRef.current = false
                return
              }

              const fullIndex = mapsRef.current.playableToFull[nextPlaylistIndex]
              if (
                typeof fullIndex === "number" &&
                fullIndex !== activeIndexRef.current
              ) {
                onActiveIndexChangeRef.current(fullIndex)
              }
            }
          },
        },
      })
    })

    return () => {
      cancelled = true
      readyRef.current = false
      playerRef.current?.destroy()
      playerRef.current = null
      mountRef.current?.replaceChildren()
    }
  }, [playableKey]) // eslint-disable-line react-hooks/exhaustive-deps -- rebuild on playable id set only

  // List → player: jump when activeIndex maps to a playable video.
  useEffect(() => {
    const playableIndex = fullToPlayable[activeIndex]
    if (playableIndex == null) return

    const player = playerRef.current
    if (!readyRef.current || !player) {
      queuedPlayableIndexRef.current = playableIndex
      return
    }

    let current = -1
    try {
      current = player.getPlaylistIndex()
    } catch {
      queuedPlayableIndexRef.current = playableIndex
      return
    }

    if (current === playableIndex) return

    applyingFromListRef.current = true
    try {
      if (suppressAutoplayRef.current) {
        player.cuePlaylist(mapsRef.current.playableIds, playableIndex)
      } else {
        player.playVideoAt(playableIndex)
      }
      setPlaylistIndex(playableIndex)
    } catch {
      applyingFromListRef.current = false
      queuedPlayableIndexRef.current = playableIndex
    }
  }, [activeIndex, fullToPlayable])

  const canPrev = ready && playlistIndex > 0
  const canNext = ready && playlistIndex < playableIds.length - 1
  const activeTrack = tracks[activeIndex]

  if (playableIds.length === 0) {
    return (
      <div className={cn("arr-youtube__player-wrap", className)}>
        <p className="arr-followup__hint">No playable YouTube videos for this playlist.</p>
      </div>
    )
  }

  return (
    <div className={cn("arr-youtube__player-wrap", className)}>
      <div className={cn("arr-youtube__stage", videoCovered && "arr-youtube__stage--covered")}>
        <div className="arr-youtube__player" ref={mountRef} />

        {videoCovered ? (
          <div className="arr-youtube__cover" aria-hidden>
            <div className="arr-youtube__cover-glow" />
            <p className="arr-youtube__cover-label">
              {playing ? "Listening with video covered" : "Video covered"}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          className="arr-youtube__cover-toggle"
          onClick={() => setVideoCovered((prev) => !prev)}
          aria-pressed={videoCovered}
          aria-label={videoCovered ? "Show video" : "Cover video"}
          title={videoCovered ? "Show video" : "Cover video"}
        >
          {videoCovered ? (
            <Eye aria-hidden size={16} strokeWidth={2.25} />
          ) : (
            <EyeOff aria-hidden size={16} strokeWidth={2.25} />
          )}
          <span>{videoCovered ? "Show video" : "Cover video"}</span>
        </button>
      </div>

      {(activeTrack?.title || activeTrack?.artist || activeTrack?.explanation) && (
        <div className="arr-youtube__caption" aria-live="polite">
          {activeTrack.title ? <p className="arr-youtube__song">{activeTrack.title}</p> : null}
          {activeTrack.artist ? <p className="arr-youtube__artist">by {activeTrack.artist}</p> : null}
          {activeTrack.explanation ? (
            <p className="arr-youtube__note">{activeTrack.explanation}</p>
          ) : null}
        </div>
      )}

      <div className="arr-youtube__transport" role="group" aria-label="Playlist controls">
        <button
          type="button"
          className="arr-youtube__ctrl"
          onClick={() => playerRef.current?.previousVideo()}
          disabled={!canPrev}
          aria-label="Previous song"
        >
          <SkipBack aria-hidden size={18} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          className="arr-youtube__ctrl arr-youtube__ctrl--primary"
          onClick={() => {
            const player = playerRef.current
            if (!player) return
            if (playing) player.pauseVideo()
            else player.playVideo()
          }}
          disabled={!ready}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause aria-hidden size={20} strokeWidth={2.25} />
          ) : (
            <Play aria-hidden size={20} strokeWidth={2.25} />
          )}
        </button>
        <button
          type="button"
          className="arr-youtube__ctrl"
          onClick={() => playerRef.current?.nextVideo()}
          disabled={!canNext}
          aria-label="Next song"
        >
          <SkipForward aria-hidden size={18} strokeWidth={2.25} />
        </button>
      </div>

      <p className="arr-youtube__track" aria-live="polite">
        {ready
          ? `Song ${(playableToFull[playlistIndex] ?? 0) + 1} of ${tracks.length}`
          : "Loading player…"}
      </p>
    </div>
  )
}
