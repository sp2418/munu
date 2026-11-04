import { useState, useEffect, useLayoutEffect, useId, useRef, useMemo, useCallback, type CSSProperties } from "react"

import LoadingScreen from "../components/LoadingScreen"
import PlaylistScreen from "../components/PlaylistScreen"
import PlaylistSyncedLayout from "../components/PlaylistSyncedLayout"
import type { SyncedPlaylistTrack } from "../components/playlistPlayerTypes"
import ScreenTransitionHost from "../components/ScreenTransitionHost"
import FlowBrandHeader from "../components/FlowBrandHeader"
import { Button } from "../components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { cn } from "../lib/utils"
import { getSpotifyAccessToken } from "../lib/spotifyToken"
import {
  enrichStoredMusicProfilesWithReccoBeats,
  type CurrEmotContext,
  type MusicBaseline,
} from "../lib/reccobeatsEnrich"
import { useFollowAlongPersona } from "../context/FollowAlongPersonaContext"
import { viviBakedResults } from "../personas/vivi-results"
import {
  CLAUDE_RESPONSE_CACHE_KEY,
  RESULTS_JOURNEY_CACHE_KEY,
  fingerprintForResultsInputs,
  readClaudeCache,
  readJourneyRowsCache,
  shouldUseViviBakedResults,
  writeViviBakedResultsCache,
  type ClaudeResponseCachePayload,
} from "../lib/resultsCache"
import {
  readResultsScreenProgress,
  writeAppProgress,
  writeResultsScreenProgress,
} from "../lib/appProgressStorage"
import {
  isShowingViviWalkthroughOnResults,
  isViviWalkthroughActive,
} from "../lib/viviWalkthroughStorage"
import { saveYoutubePlaylistToHistory } from "../lib/youtubePlaylistStorage"

const INSIGHT_LOADING_LINES = [
  "Listening to where you are...",
  "Reading the music you've been reaching for...",
  "Sitting with what you shared...",
  "Noticing the textures in your songs...",
  "Finding the throughline...",
  "Putting it into words...",
] as const

/** Time each line stays fully visible before crossfading to the next. */
const INSIGHT_LINE_MS = 3000
/** Fade out / fade in duration (keep in sync with `duration-300` below). */
const INSIGHT_LINE_FADE_MS = 300

/** Copy stagger on fullscreen insight-loading (mirror Onboarding prep pacing). */
const INSIGHT_LOADER_INTRO_MS = 500
const INSIGHT_LOADER_LINE_FADE_MS = 900
const INSIGHT_LOADER_INTRA_MS = 550
/** After the second line fades, brief beat before rotating status lines resume focus. */
const INSIGHT_LOADER_BEFORE_ROTATOR_MS = 450

/** Pause with the loader gone before the first mirror line fades in. */
const INSIGHT_STILLNESS_MS = 700

/** Offset between starting each staggered fade (mirror + playlist sub-blocks). */
const MIRROR_STAGGER_STEP_MS = 520

/** Matches insight `<p>` fade (`motion-safe:duration-[1400ms]`); journey lines appear after this. */
const INSIGHT_BODY_FADE_MS = 1400

/** Beat after the playlist starts fading before the footer CTA appears. */
const PLAYLIST_FOOTER_AFTER_REVEAL_MS = 1600

/** Pause after journey + YouTube settle before showing the “Ready for playlist” CTA. */
const PLAYLIST_AFTER_LOADER_MS = 380

/**
 * Dev: skip YouTube resolve and show the carousel fallback UI.
 * Also enabled with `?forceYoutubeFail=1` in the URL. Set back to false when done testing.
 */
const FORCE_YOUTUBE_PLAYLIST_FAIL = false

function shouldForceYoutubePlaylistFail(): boolean {
  if (FORCE_YOUTUBE_PLAYLIST_FAIL) return true
  if (typeof window === "undefined") return false
  try {
    return new URLSearchParams(window.location.search).get("forceYoutubeFail") === "1"
  } catch {
    return false
  }
}

/** ViVi walkthrough: minimum fullscreen insight loader before revealing baked copy. */
const WALKTHROUGH_INSIGHT_LOADER_MS =
  INSIGHT_LOADER_INTRO_MS +
  INSIGHT_LOADER_LINE_FADE_MS +
  INSIGHT_LOADER_INTRA_MS +
  INSIGHT_LOADER_LINE_FADE_MS +
  INSIGHT_LOADER_BEFORE_ROTATOR_MS +
  2200

/** ViVi walkthrough: journey rotating lines after mirror insight before carousel rows appear. */
const WALKTHROUGH_JOURNEY_LOADER_MS =
  INSIGHT_STILLNESS_MS + MIRROR_STAGGER_STEP_MS + INSIGHT_BODY_FADE_MS + 2600

function shouldPlayWalkthroughResultsDemo(snapshot: ResultsMountSnapshot): boolean {
  if (!snapshot.claude || snapshot.journeySongs.length === 0) return false
  if (!isViviWalkthroughActive()) return false
  const saved = readResultsScreenProgress()
  if (saved?.playlistRevealAllowed) return false
  return true
}

/** Slower than native `scroll-behavior: smooth`; playlist fades in after this finishes. */
const PLAYLIST_SCROLL_DURATION_MS = 2200

/** Matches `scroll-mt-8` on the playlist `<section>`. */
const PLAYLIST_SCROLL_MARGIN_PX = 32

/** Scroll duration when bringing the footer CTA into view. */
const PLAYLIST_READY_CTA_SCROLL_DURATION_MS = 1800

type JourneyOnlyRowsPayload = {
  fingerprint: string
  songs: any[]
}

function writeJourneyRowsCache(fingerprint: string, songs: any[]): void {
  if (!songs.length) return
  try {
    const payload: JourneyOnlyRowsPayload = { fingerprint, songs }
    localStorage.setItem(RESULTS_JOURNEY_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

function writeClaudeCache(
  fingerprint: string,
  parsed: unknown,
  options?: { journeySongsResolved?: any[] | null },
): void {
  try {
    let journeyOut: any[] | undefined
    if (options && Object.prototype.hasOwnProperty.call(options, "journeySongsResolved")) {
      const jr = options.journeySongsResolved
      journeyOut = jr != null && jr.length > 0 ? jr : undefined
    } else {
      const sidecar = readJourneyRowsCache(fingerprint)
      if (sidecar && sidecar.length > 0) {
        journeyOut = sidecar
      } else {
        const rawPrev = localStorage.getItem(CLAUDE_RESPONSE_CACHE_KEY)
        if (rawPrev) {
          const prev = JSON.parse(rawPrev) as ClaudeResponseCachePayload
          if (
            prev.fingerprint === fingerprint &&
            Array.isArray(prev.journeySongsResolved) &&
            prev.journeySongsResolved.length > 0
          ) {
            journeyOut = prev.journeySongsResolved
          }
        }
      }
    }
    const payload: ClaudeResponseCachePayload = {
      fingerprint,
      parsed,
      ...(journeyOut && journeyOut.length > 0 ? { journeySongsResolved: journeyOut } : {}),
    }
    localStorage.setItem(CLAUDE_RESPONSE_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Persist carousel snapshot using whatever baseline/check-in is currently in localStorage. */
function writeResultsCacheWithCurrentStorage(parsed: unknown, journeySongsResolved: any[]): void {
  try {
    const rawB = localStorage.getItem("musicBaseline")
    const rawC = localStorage.getItem("currEmotContext")
    if (!rawB || !rawC) return
    const baseline = JSON.parse(rawB) as MusicBaseline
    const curr = JSON.parse(rawC) as CurrEmotContext
    const fp = fingerprintForResultsInputs(baseline, curr)
    if (journeySongsResolved.length > 0) {
      writeJourneyRowsCache(fp, journeySongsResolved)
    }
    writeClaudeCache(fp, parsed, { journeySongsResolved })
  } catch {
    /* ignore */
  }
}

type ResultsMountSnapshot = {
  claude: any | null
  journeySongs: any[]
  journeySongsLoading: boolean
  /** Insight + playlist rows restored — skip staged animations and “Show playlist”. */
  resumeFullSnapshot: boolean
}

function tryHydrateResultsSnapshotSync(): ResultsMountSnapshot {
  if (typeof window === "undefined") {
    return {
      claude: null,
      journeySongs: [],
      journeySongsLoading: false,
      resumeFullSnapshot: false,
    }
  }
  try {
    const rawB = localStorage.getItem("musicBaseline")
    const rawC = localStorage.getItem("currEmotContext")
    if (!rawB || !rawC) {
      return {
        claude: null,
        journeySongs: [],
        journeySongsLoading: false,
        resumeFullSnapshot: false,
      }
    }
    const baseline = JSON.parse(rawB) as MusicBaseline
    const currEmotContext = JSON.parse(rawC) as CurrEmotContext
    const fp = fingerprintForResultsInputs(baseline, currEmotContext)

    // ViVi walkthrough always uses the in-repo bake so rebakes aren't shadowed by stale LS.
    if (shouldUseViviBakedResults(baseline, currEmotContext)) {
      const bakedJourney = viviBakedResults.journeySongsResolved
      try {
        writeViviBakedResultsCache(baseline, currEmotContext)
      } catch {
        /* ignore seed failures */
      }
      return {
        claude: viviBakedResults.parsed,
        journeySongs: bakedJourney,
        journeySongsLoading: bakedJourney.length === 0,
        resumeFullSnapshot: bakedJourney.length > 0,
      }
    }

    const raw = localStorage.getItem(CLAUDE_RESPONSE_CACHE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as ClaudeResponseCachePayload
      if (
        data &&
        typeof data.fingerprint === "string" &&
        data.fingerprint === fp &&
        data.parsed != null &&
        typeof data.parsed === "object" &&
        "insight" in (data.parsed as object)
      ) {
        let journey = Array.isArray(data.journeySongsResolved) ? data.journeySongsResolved : []
        if (journey.length === 0) {
          const sidecar = readJourneyRowsCache(fp)
          if (sidecar) journey = sidecar
        }
        const hasJourney = journey.length > 0
        return {
          claude: data.parsed as any,
          journeySongs: journey,
          journeySongsLoading: !hasJourney,
          resumeFullSnapshot: hasJourney,
        }
      }
    }
    return {
      claude: null,
      journeySongs: [],
      journeySongsLoading: false,
      resumeFullSnapshot: false,
    }
  } catch {
    return {
      claude: null,
      journeySongs: [],
      journeySongsLoading: false,
      resumeFullSnapshot: false,
    }
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function insightLoadingLineFadeClass(revealed: boolean) {
  return cn(
    "inline transition-opacity ease-out motion-reduce:transition-none",
    revealed ? "opacity-100 motion-safe:duration-[900ms]" : "opacity-0 motion-safe:duration-0",
  )
}

const JOURNEY_LOADING_LINES = [
  "Mapping the journey forward...",
  "Tracing the path from here...",
  "Matching tempo, valence, and energy to your taste...",
  "Looking for songs that meet you here...",
  "Threading the audio features together...",
  "Pulling previews...",
] as const

/** Crossfading pulse loader — shared by insight (fullscreen) and journey (below mirror). */
function RotatingLoadingLines({
  lines,
  active,
  className,
  lineClassName,
}: {
  lines: readonly string[]
  active: boolean
  className?: string
  lineClassName?: string
}) {
  const [lineIndex, setLineIndex] = useState(0)
  const [fadedIn, setFadedIn] = useState(true)

  useEffect(() => {
    if (!active) return

    queueMicrotask(() => {
      setLineIndex(0)
      setFadedIn(true)
    })

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      const id = window.setInterval(() => {
        setLineIndex((i) => (i + 1) % lines.length)
      }, INSIGHT_LINE_MS)
      return () => window.clearInterval(id)
    }

    let cancelled = false
    let dwellId: ReturnType<typeof setTimeout> | undefined
    let fadeId: ReturnType<typeof setTimeout> | undefined

    const clearTimers = () => {
      if (dwellId !== undefined) window.clearTimeout(dwellId)
      if (fadeId !== undefined) window.clearTimeout(fadeId)
    }

    /** Full-opacity dwell → fade out → swap line → fade in → wait for fade-in → dwell again */
    const scheduleCycle = (): void => {
      dwellId = window.setTimeout(() => {
        if (cancelled) return
        setFadedIn(false)
        fadeId = window.setTimeout(() => {
          if (cancelled) return
          setLineIndex((i) => (i + 1) % lines.length)
          setFadedIn(true)
          dwellId = window.setTimeout(() => scheduleCycle(), INSIGHT_LINE_FADE_MS + INSIGHT_LINE_MS)
        }, INSIGHT_LINE_FADE_MS)
      }, INSIGHT_LINE_MS)
    }

    scheduleCycle()

    return () => {
      cancelled = true
      clearTimers()
    }
  }, [active, lines])

  if (!active) return null

  const line = lines[lineIndex]
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  return (
    <div aria-live="polite" className={cn("mx-auto max-w-lg", className)}>
      <p
        className={cn(
          lineClassName ??
            "text-center text-sm text-muted-foreground motion-safe:animate-pulse",
          !reducedMotion && "transition-opacity duration-300 ease-in-out",
          !reducedMotion && (fadedIn ? "opacity-100" : "opacity-0"),
        )}
      >
        {line}
      </p>
    </div>
  )
}

function mirrorRevealClass(revealed: boolean) {
  return cn(
    "transition-opacity ease-out motion-reduce:transition-none",
    revealed ? "opacity-100 motion-safe:duration-[1400ms]" : "opacity-0 motion-safe:duration-0",
  )
}

function playlistRevealClass(revealed: boolean) {
  return cn(
    "transition-opacity ease-in-out motion-reduce:transition-none",
    revealed ? "opacity-100 motion-safe:duration-[2200ms]" : "opacity-0 motion-safe:duration-0",
  )
}

function formatJourneySongsForClipboard(songs: any[]): string {
  return songs
    .map((song) => {
      const title =
        typeof song?.title === "string" && song.title.trim() ? song.title.trim() : "Unknown track"
      const artist =
        typeof song?.artist === "string" && song.artist.trim() ? song.artist.trim() : "Unknown artist"
      return `${artist} – ${title}`
    })
    .join("\n")
}

interface ResultsProps {
  onStartCheckInFresh: () => void
  onExitFollowAlongToWelcome: () => void
}

function Results({
  onStartCheckInFresh,
  onExitFollowAlongToWelcome,
}: ResultsProps) {
  const followAlong = useFollowAlongPersona()
  const mountSnapshot = useMemo(() => tryHydrateResultsSnapshotSync(), [])
  const playWalkthroughDemo = useMemo(
    () => shouldPlayWalkthroughResultsDemo(mountSnapshot),
    [mountSnapshot],
  )
  const walkthroughDemoDataRef = useRef({
    claude: mountSnapshot.claude,
    journey: mountSnapshot.journeySongs,
  })
  const resumeFullSnapshotRef = useRef(
    playWalkthroughDemo ? false : mountSnapshot.resumeFullSnapshot,
  )

  const [profile, setProfile] = useState<{
    baseline: MusicBaseline | null
    currEmotContext: CurrEmotContext | null
  } | null>(null)

  const viviWalkthroughActive = useMemo(
    () =>
      isShowingViviWalkthroughOnResults(
        followAlong.walkthroughActive,
        profile?.baseline,
        profile?.currEmotContext,
      ),
    [followAlong.walkthroughActive, profile?.baseline, profile?.currEmotContext],
  )

  useEffect(() => {
    writeAppProgress({ view: "results" })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next = await enrichStoredMusicProfilesWithReccoBeats()
      if (!cancelled) setProfile(next)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const [claudeRes, setClaudeRes] = useState<any>(() =>
    playWalkthroughDemo ? null : mountSnapshot.claude,
  )
  /** Shown when /api/claude fails after retries; bump `claudeRetryTick` to retry. */
  const [claudeInsightError, setClaudeInsightError] = useState<string | null>(null)
  const [claudeRetryTick, setClaudeRetryTick] = useState(0)
  // const [previews, setPreviews] = useState<any[]>([])

  const [insightLoadingL1, setInsightLoadingL1] = useState(false)
  const [insightLoadingL2, setInsightLoadingL2] = useState(false)
  const [insightLoadingRotator, setInsightLoadingRotator] = useState(false)

  const [revealMirrorTitle, setRevealMirrorTitle] = useState(
    () => !playWalkthroughDemo && mountSnapshot.resumeFullSnapshot && !!mountSnapshot.claude,
  )
  const [revealMirrorInsight, setRevealMirrorInsight] = useState(
    () => !playWalkthroughDemo && mountSnapshot.resumeFullSnapshot && !!mountSnapshot.claude,
  )

  const [journeySongs, setJourneySongs] = useState<any[]>(() =>
    playWalkthroughDemo ? [] : mountSnapshot.journeySongs,
  )
  const [journeySongsLoading, setJourneySongsLoading] = useState(() =>
    playWalkthroughDemo ? true : mountSnapshot.journeySongsLoading,
  )
  const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState<string | null>(null)
  const [youtubeVideoIds, setYoutubeVideoIds] = useState<string[]>([])
  /** Parallel to journeySongs — null when that row has no YouTube match. */
  const [youtubeVideoIdByIndex, setYoutubeVideoIdByIndex] = useState<(string | null)[]>([])
  const [youtubePlaylistLoading, setYoutubePlaylistLoading] = useState(false)
  /** `journeySongKeys` value for which YouTube search has finished (null = not settled yet). */
  const [youtubeSettledKeys, setYoutubeSettledKeys] = useState<string | null>(() =>
    !playWalkthroughDemo && mountSnapshot.resumeFullSnapshot
      ? mountSnapshot.journeySongs
          .map((song: { title?: string; artist?: string }) => `${song.title ?? ""}\0${song.artist ?? ""}`)
          .join("\n")
      : null,
  )
  const journeySongKeys = useMemo(
    () =>
      journeySongs
        .map((song: { title?: string; artist?: string }) => `${song.title ?? ""}\0${song.artist ?? ""}`)
        .join("\n"),
    [journeySongs],
  )
  const youtubeSettled = youtubeSettledKeys === journeySongKeys

  const [playlistWhyExpanded, setPlaylistWhyExpanded] = useState(false)
  const playlistWhyTriggerId = useId()
  const playlistWhyPanelId = useId()

  const [activePlaylistIndex, setActivePlaylistIndex] = useState(0)
  const [playlistListCopied, setPlaylistListCopied] = useState(false)
  const [playlistCopyFailed, setPlaylistCopyFailed] = useState(false)
  const playlistCopyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playlistClipboardText = useMemo(
    () => formatJourneySongsForClipboard(journeySongs),
    [journeySongs],
  )

  useEffect(() => {
    setActivePlaylistIndex(0)
    setPlaylistListCopied(false)
    setPlaylistCopyFailed(false)
    if (playlistCopyResetTimerRef.current) {
      window.clearTimeout(playlistCopyResetTimerRef.current)
      playlistCopyResetTimerRef.current = null
    }
  }, [journeySongs])

  useEffect(() => {
    return () => {
      if (playlistCopyResetTimerRef.current) {
        window.clearTimeout(playlistCopyResetTimerRef.current)
      }
    }
  }, [])

  const handleCopyPlaylistList = useCallback(async () => {
    if (!playlistClipboardText.trim()) return
    if (playlistCopyResetTimerRef.current) {
      window.clearTimeout(playlistCopyResetTimerRef.current)
      playlistCopyResetTimerRef.current = null
    }
    try {
      await navigator.clipboard.writeText(playlistClipboardText)
      setPlaylistCopyFailed(false)
      setPlaylistListCopied(true)
    } catch {
      setPlaylistListCopied(false)
      setPlaylistCopyFailed(true)
    }
    playlistCopyResetTimerRef.current = window.setTimeout(() => {
      setPlaylistListCopied(false)
      setPlaylistCopyFailed(false)
      playlistCopyResetTimerRef.current = null
    }, 2000)
  }, [playlistClipboardText])

  const playlistSectionRef = useRef<HTMLElement>(null)
  const playlistReadyCtaRef = useRef<HTMLDivElement>(null)
  const playlistRevealHandledRef = useRef(false)
  const playlistStaggerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const [journeyLinesAllowed, setJourneyLinesAllowed] = useState(false)
  /** Opacity entrance for journey lines (starts false each time the block mounts). */
  const [journeyLinesEntered, setJourneyLinesEntered] = useState(false)
  const [playlistRevealButtonReady, setPlaylistRevealButtonReady] = useState(
    () => !playWalkthroughDemo && mountSnapshot.resumeFullSnapshot,
  )
  const [playlistRevealAllowed, setPlaylistRevealAllowed] = useState(() => {
    if (playWalkthroughDemo) return false
    const saved = readResultsScreenProgress()
    if (mountSnapshot.resumeFullSnapshot) return saved?.playlistRevealAllowed ?? true
    return saved?.playlistRevealAllowed ?? false
  })
  const [playlistCtaEntered, setPlaylistCtaEntered] = useState(() => {
    if (playWalkthroughDemo) return false
    const saved = readResultsScreenProgress()
    if (mountSnapshot.resumeFullSnapshot) return saved?.playlistRevealAllowed ?? true
    return false
  })

  const [revealPlaylistHeading, setRevealPlaylistHeading] = useState(() => {
    if (playWalkthroughDemo) return false
    const saved = readResultsScreenProgress()
    return mountSnapshot.resumeFullSnapshot && (saved?.playlistRevealAllowed ?? true)
  })
  const [revealPlaylistWhy, setRevealPlaylistWhy] = useState(() => {
    if (playWalkthroughDemo) return false
    const saved = readResultsScreenProgress()
    return mountSnapshot.resumeFullSnapshot && (saved?.playlistRevealAllowed ?? true)
  })
  const [revealPlaylistCarousel, setRevealPlaylistCarousel] = useState(() => {
    if (playWalkthroughDemo) return false
    const saved = readResultsScreenProgress()
    return mountSnapshot.resumeFullSnapshot && (saved?.playlistRevealAllowed ?? true)
  })
  const [revealPlaylistFooter, setRevealPlaylistFooter] = useState(() => {
    if (playWalkthroughDemo) return false
    const saved = readResultsScreenProgress()
    return mountSnapshot.resumeFullSnapshot && (saved?.playlistRevealAllowed ?? true)
  })
  const [playlistReadyModalOpen, setPlaylistReadyModalOpen] = useState(false)

  /** ViVi walkthrough: baked results are ready, but play the normal insight → journey → playlist pacing. */
  useEffect(() => {
    if (!playWalkthroughDemo) return

    const data = walkthroughDemoDataRef.current
    if (!data.claude) return

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      setClaudeRes(data.claude)
      setJourneySongs(data.journey)
      setJourneySongsLoading(false)
      return undefined
    }

    const insightTimer = window.setTimeout(() => {
      setClaudeRes(data.claude)
    }, WALKTHROUGH_INSIGHT_LOADER_MS)

    return () => window.clearTimeout(insightTimer)
  }, [playWalkthroughDemo])

  useEffect(() => {
    if (!playWalkthroughDemo || !claudeRes) return

    const data = walkthroughDemoDataRef.current
    if (!data.journey.length) return

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    setJourneySongs([])
    setJourneySongsLoading(true)

    const journeyTimer = window.setTimeout(
      () => {
        setJourneySongs(data.journey)
        setJourneySongsLoading(false)
      },
      reduced ? 0 : WALKTHROUGH_JOURNEY_LOADER_MS,
    )

    return () => window.clearTimeout(journeyTimer)
  }, [playWalkthroughDemo, claudeRes])

  useEffect(() => {
    writeResultsScreenProgress({
      scrollY: window.scrollY,
      playlistRevealAllowed,
    })
  }, [playlistRevealAllowed])

  useEffect(() => {
    const saved = readResultsScreenProgress()
    if (!saved?.scrollY || saved.scrollY <= 0) return
    if (!mountSnapshot.resumeFullSnapshot && !saved.playlistRevealAllowed) return
    const id = window.requestAnimationFrame(() => {
      window.scrollTo(0, saved.scrollY)
    })
    return () => window.cancelAnimationFrame(id)
  }, [mountSnapshot.resumeFullSnapshot])

  useEffect(() => {
    let scrollTimer = 0
    const persistScroll = () => {
      writeResultsScreenProgress({
        scrollY: window.scrollY,
        playlistRevealAllowed,
      })
    }
    const onScroll = () => {
      window.clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(persistScroll, 200)
    }
    const onPageHide = () => persistScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("pagehide", onPageHide)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pagehide", onPageHide)
      window.clearTimeout(scrollTimer)
    }
  }, [playlistRevealAllowed])

  const clearPlaylistStaggerTimers = () => {
    for (const id of playlistStaggerTimersRef.current) {
      window.clearTimeout(id)
    }
    playlistStaggerTimersRef.current = []
  }

  const resetPlaylistReveals = () => {
    setRevealPlaylistHeading(false)
    setRevealPlaylistWhy(false)
    setRevealPlaylistCarousel(false)
    setRevealPlaylistFooter(false)
  }

  useLayoutEffect(() => {
    if (!resumeFullSnapshotRef.current || !claudeRes) return
    // Resume restores reveal flags from initial state — don't block the reveal effect.
    clearPlaylistStaggerTimers()
  }, [claudeRes])

  useEffect(() => {
    if (claudeRes) {
      setInsightLoadingL1(false)
      setInsightLoadingL2(false)
      setInsightLoadingRotator(false)
      return
    }

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      queueMicrotask(() => {
        setInsightLoadingL1(true)
        setInsightLoadingL2(true)
        setInsightLoadingRotator(true)
      })
      return undefined
    }

    const intro = INSIGHT_LOADER_INTRO_MS
    const fade = INSIGHT_LOADER_LINE_FADE_MS
    const intra = INSIGHT_LOADER_INTRA_MS
    const beforeRot = INSIGHT_LOADER_BEFORE_ROTATOR_MS

    const line2At = intro + fade + intra
    const rotatorAt = line2At + fade + beforeRot

    const ids: ReturnType<typeof setTimeout>[] = [
      window.setTimeout(() => setInsightLoadingL1(true), intro),
      window.setTimeout(() => setInsightLoadingL2(true), line2At),
      window.setTimeout(() => setInsightLoadingRotator(true), rotatorAt),
    ]

    return () => {
      for (const id of ids) {
        window.clearTimeout(id)
      }
    }
  }, [claudeRes])

  /**
   * Bottom status on the insight screen: start once the title begins fading in.
   * Keep rotating lines visible until journey songs and YouTube resolution are both done.
   */
  useEffect(() => {
    const stillBuilding = journeySongsLoading || !youtubeSettled
    if (!claudeRes || !stillBuilding) {
      setJourneyLinesAllowed(false)
      return
    }
    if (!revealMirrorTitle) {
      setJourneyLinesAllowed(false)
      return
    }

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      setJourneyLinesAllowed(true)
      return undefined
    }

    const id = window.setTimeout(() => {
      setJourneyLinesAllowed(true)
    }, 180)

    return () => window.clearTimeout(id)
  }, [claudeRes, journeySongsLoading, youtubeSettled, revealMirrorTitle])

  /** After journey lines are allowed, fade the container in slowly (not an instant pop-in). */
  useLayoutEffect(() => {
    const stillBuilding = journeySongsLoading || !youtubeSettled
    if (!stillBuilding || !journeyLinesAllowed) {
      return
    }

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      setJourneyLinesEntered(true)
      return
    }

    let cancelled = false
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (!cancelled) setJourneyLinesEntered(true)
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(outerRaf)
      cancelAnimationFrame(innerRaf)
    }
  }, [journeySongsLoading, youtubeSettled, journeyLinesAllowed])

  /** Journey + YouTube settled → brief beat → show “Ready for playlist” (user taps to scroll + reveal). */
  useEffect(() => {
    if (!claudeRes) {
      setPlaylistRevealButtonReady(false)
      setPlaylistRevealAllowed(false)
      return
    }
    if (resumeFullSnapshotRef.current) {
      setPlaylistRevealButtonReady(true)
      return
    }
    if (journeySongsLoading || !youtubeSettled) {
      setPlaylistRevealButtonReady(false)
      return
    }
    if (playlistRevealAllowed) return

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const delay = reduced ? 0 : PLAYLIST_AFTER_LOADER_MS

    const id = window.setTimeout(() => {
      setPlaylistRevealButtonReady(true)
    }, delay)

    return () => window.clearTimeout(id)
  }, [claudeRes, journeySongsLoading, youtubeSettled, playlistRevealAllowed])

  /** Gentle fade-in for the playlist CTA. */
  useLayoutEffect(() => {
    if (resumeFullSnapshotRef.current) return
    if (
      !claudeRes ||
      journeySongsLoading ||
      !youtubeSettled ||
      !playlistRevealButtonReady ||
      playlistRevealAllowed
    ) {
      setPlaylistCtaEntered(false)
      return
    }

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      setPlaylistCtaEntered(true)
      return
    }

    let cancelled = false
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        if (!cancelled) setPlaylistCtaEntered(true)
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(outerRaf)
      cancelAnimationFrame(innerRaf)
    }
  }, [
    claudeRes,
    journeySongsLoading,
    youtubeSettled,
    playlistRevealButtonReady,
    playlistRevealAllowed,
  ])

  useEffect(() => {
    if (!claudeRes) {
      playlistRevealHandledRef.current = false
      clearPlaylistStaggerTimers()
      resetPlaylistReveals()
      setPlaylistReadyModalOpen(false)
      return
    }

    if (!playlistRevealAllowed) {
      playlistRevealHandledRef.current = false
      clearPlaylistStaggerTimers()
      resetPlaylistReveals()
      setPlaylistReadyModalOpen(false)
      return
    }

    if (playlistRevealHandledRef.current) return

    const el = playlistSectionRef.current
    if (!el) return
    playlistRevealHandledRef.current = true

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const rect = el.getBoundingClientRect()
    const startY = window.scrollY
    const targetY = Math.max(0, rect.top + window.scrollY - PLAYLIST_SCROLL_MARGIN_PX)
    const distance = targetY - startY

    const staggerMs = MIRROR_STAGGER_STEP_MS

    const revealAfterScroll = () => {
      clearPlaylistStaggerTimers()
      if (reduced) {
        queueMicrotask(() => {
          setRevealPlaylistHeading(true)
          setRevealPlaylistWhy(true)
          setRevealPlaylistCarousel(true)
        })
        return
      }
      queueMicrotask(() => setRevealPlaylistHeading(true))
      playlistStaggerTimersRef.current.push(
        window.setTimeout(() => setRevealPlaylistWhy(true), staggerMs),
        window.setTimeout(() => setRevealPlaylistCarousel(true), staggerMs * 2),
      )
    }

    if (reduced) {
      window.scrollTo({ top: targetY, behavior: "auto" })
      revealAfterScroll()
      return () => clearPlaylistStaggerTimers()
    }

    if (Math.abs(distance) < 2) {
      revealAfterScroll()
      return () => clearPlaylistStaggerTimers()
    }

    const t0 = performance.now()
    const rafRef = { current: 0 }

    const tick = (now: number) => {
      const elapsed = now - t0
      const t = Math.min(1, elapsed / PLAYLIST_SCROLL_DURATION_MS)
      const y = startY + distance * easeInOutCubic(t)
      window.scrollTo(0, y)
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(tick)
      } else {
        revealAfterScroll()
      }
    }

    rafRef.current = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(rafRef.current)
      clearPlaylistStaggerTimers()
    }
  }, [claudeRes, playlistRevealAllowed])

  /** Footer CTA waits until the playlist fade has a head start, then eases in more slowly. */
  useEffect(() => {
    if (!playlistRevealAllowed || !revealPlaylistCarousel) {
      setRevealPlaylistFooter(false)
      return
    }
    if (resumeFullSnapshotRef.current) {
      setRevealPlaylistFooter(true)
      return
    }

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced) {
      setRevealPlaylistFooter(true)
      return
    }

    const id = window.setTimeout(() => {
      setRevealPlaylistFooter(true)
    }, PLAYLIST_FOOTER_AFTER_REVEAL_MS)

    return () => window.clearTimeout(id)
  }, [playlistRevealAllowed, revealPlaylistCarousel])

  /** Once the footer CTA appears, scroll so the button is in view. */
  useEffect(() => {
    if (resumeFullSnapshotRef.current) return
    if (!revealPlaylistFooter || !playlistRevealAllowed || !claudeRes) return

    const rafRef = { current: 0 }
    // Wait a frame so the footer is laid out before measuring.
    const timeoutId = window.setTimeout(() => {
      const el = playlistReadyCtaRef.current
      if (!el) return

      const reduced =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

      const rect = el.getBoundingClientRect()
      const startY = window.scrollY
      const targetY = Math.max(
        0,
        rect.bottom + startY - window.innerHeight + 24,
      )
      const distance = targetY - startY

      if (reduced || Math.abs(distance) < 2) {
        if (Math.abs(distance) >= 2) window.scrollTo({ top: targetY, behavior: "auto" })
        return
      }

      const t0 = performance.now()
      const tick = (now: number) => {
        const elapsed = now - t0
        const t = Math.min(1, elapsed / PLAYLIST_READY_CTA_SCROLL_DURATION_MS)
        const y = startY + distance * easeInOutCubic(t)
        window.scrollTo(0, y)
        if (t < 1) {
          rafRef.current = window.requestAnimationFrame(tick)
        }
      }
      rafRef.current = window.requestAnimationFrame(tick)
    }, 80)

    return () => {
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(rafRef.current)
    }
  }, [revealPlaylistFooter, playlistRevealAllowed, claudeRes])

  useEffect(() => {
    if (!profile) return

    const { baseline, currEmotContext } = profile
    if (playWalkthroughDemo) return
    if (shouldUseViviBakedResults(baseline, currEmotContext)) return

    let cancelled = false

    const fingerprint =
      baseline && currEmotContext ? fingerprintForResultsInputs(baseline, currEmotContext) : null

    if (fingerprint) {
      const cached = readClaudeCache(fingerprint)
      if (
        cached !== null &&
        typeof cached === "object" &&
        cached !== null &&
        "insight" in cached
      ) {
        setClaudeRes((prev: any) => prev ?? cached)
        setClaudeInsightError(null)
        return
      }
    }

    if (claudeRes != null) return

    let lastHttpStatus: number | undefined

    const claudeBackoffMs = (attempt: number) =>
      Math.min(16_000, 1_000 * 2 ** attempt) + Math.floor(Math.random() * 400)

    const fetchClaudeResponse = async (attempt = 0, maxAttempts = 4) => {
      if (!cancelled) setClaudeInsightError(null)
      try {
        const response = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseline, currEmotContext }),
        })
        const data = (await response.json()) as { response?: string; error?: string }

        if (!response.ok) {
          lastHttpStatus = response.status
          const retryable =
            response.status === 429 ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 529
          if (retryable && attempt < maxAttempts - 1) {
            const wait = claudeBackoffMs(attempt)
            await new Promise((r) => setTimeout(r, wait))
            if (cancelled) return
            return fetchClaudeResponse(attempt + 1, maxAttempts)
          }
          throw new Error(data.error ?? `HTTP ${response.status}`)
        }

        if (typeof data.response !== "string") {
          throw new Error(data.error ?? "Missing model response")
        }

        const cleaned = data.response.replace(/```json|```/g, "").trim()
        const parsed = JSON.parse(cleaned)
        if (cancelled) return
        setClaudeRes(parsed)
        setClaudeInsightError(null)
        if (fingerprint) writeClaudeCache(fingerprint, parsed)
      } catch (error) {
        if (attempt < maxAttempts - 1) {
          const wait = claudeBackoffMs(attempt)
          await new Promise((r) => setTimeout(r, wait))
          if (cancelled) return
          return fetchClaudeResponse(attempt + 1, maxAttempts)
        }
        if (cancelled) return
        const statusOverload =
          lastHttpStatus === 429 ||
          lastHttpStatus === 502 ||
          lastHttpStatus === 503 ||
          lastHttpStatus === 529
        const messageOverload =
          error instanceof Error && /temporarily unavailable/i.test(error.message)
        const userMessage =
          statusOverload || messageOverload
            ? "The AI that helps to curate your results is temporarily overloaded or unavailable on their side. Please try again in a minute or two."
            : "We couldn’t finish building your insights. Check your connection, try again, or refresh the page."
        setClaudeInsightError(userMessage)
      }
    }

    void fetchClaudeResponse()

    return () => {
      cancelled = true
    }
  }, [profile, claudeRes, claudeRetryTick, playWalkthroughDemo])

  useEffect(() => {
    if (!claudeRes) {
      setRevealMirrorTitle(false)
      setRevealMirrorInsight(false)
      return
    }

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (resumeFullSnapshotRef.current) {
      queueMicrotask(() => {
        setRevealMirrorTitle(true)
        setRevealMirrorInsight(true)
      })
      return undefined
    }

    setRevealMirrorTitle(false)
    setRevealMirrorInsight(false)

    if (reduced) {
      queueMicrotask(() => {
        setRevealMirrorTitle(true)
        setRevealMirrorInsight(true)
      })
      return undefined
    }

    const base = INSIGHT_STILLNESS_MS
    const d = MIRROR_STAGGER_STEP_MS
    const t1 = window.setTimeout(() => setRevealMirrorTitle(true), base)
    const t2 = window.setTimeout(() => setRevealMirrorInsight(true), base + d)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [claudeRes])

  useEffect(() => {
    if (!claudeRes) return

    if (resumeFullSnapshotRef.current) return

    if (playWalkthroughDemo) return

    if (
      profile?.baseline &&
      profile?.currEmotContext &&
      shouldUseViviBakedResults(profile.baseline, profile.currEmotContext)
    ) {
      return
    }

    let cancelled = false
    setJourneySongsLoading(true)
    setJourneySongs([])

    const verifySongs = async (songs: any[]) => {
      const verifiedSongs: any[] = []
      const normalize = (str: string) =>
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

      const token = await getSpotifyAccessToken()
      if (!token) return verifiedSongs
      for (const song of songs) {
        await new Promise(resolve => setTimeout(resolve, 200))

        const title = song.title
        const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()

        const response = await fetch(`/api/spotify-search?q=${title}&type=track&artist=${cleanArtist}&token=${token}`)

        if (response.status === 429){
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }

        const result = await response.json()
        const items = result.tracks?.items

        if (!items || items.length === 0) {
          continue
        }

        const returnedTrack = items[0]
        const trackMatches = returnedTrack.name && normalize(returnedTrack.name).includes(normalize(title))
        const artistMatches = returnedTrack.artists.some((a: { name: string }) =>
          normalize(a.name).includes(normalize(cleanArtist))
        )

        if (trackMatches && artistMatches) {
          const imageUrl = returnedTrack.album?.images?.[0]?.url ?? null
          const durationMs =
            typeof returnedTrack.duration_ms === "number" && returnedTrack.duration_ms > 0
              ? returnedTrack.duration_ms
              : null
          verifiedSongs.push({ ...song, imageUrl, durationMs })
        }
      }
      return verifiedSongs
    }

    const run = async () => {
      let journeyWithPreviews: any[] = []
      try {
        const verifyJourneySongs = await verifySongs(claudeRes.journeySongs ?? [])
        if (cancelled) return
        journeyWithPreviews = await handleSongPreview(verifyJourneySongs)
        if (cancelled) return
        setJourneySongs(journeyWithPreviews)
        writeResultsCacheWithCurrentStorage(claudeRes, journeyWithPreviews)
      } finally {
        if (!cancelled) setJourneySongsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [claudeRes, profile?.baseline, profile?.currEmotContext, playWalkthroughDemo])

  useEffect(() => {
    if (!journeySongKeys) {
      setYoutubePlaylistUrl(null)
      setYoutubeVideoIds([])
      setYoutubeVideoIdByIndex([])
      setYoutubePlaylistLoading(false)
      setYoutubeSettledKeys("")
      return
    }

    const songs = journeySongs.map((song: { title?: string; artist?: string }) => ({
      title: song.title ?? "",
      artist: song.artist ?? "",
    }))
    const keysForFetch = journeySongKeys

    let cancelled = false
    setYoutubePlaylistLoading(true)
    setYoutubePlaylistUrl(null)
    setYoutubeVideoIds([])
    setYoutubeVideoIdByIndex(songs.map(() => null))

    void (async () => {
      try {
        if (shouldForceYoutubePlaylistFail()) {
          return
        }

        const res = await fetch("/api/youtube-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ journeySongs: songs }),
        })
        if (cancelled) return
        if (!res.ok) {
          setYoutubePlaylistUrl(null)
          setYoutubeVideoIds([])
          setYoutubeVideoIdByIndex(songs.map(() => null))
          return
        }
        const data = (await res.json()) as {
          videoIds?: string[]
          tracks?: { videoId?: string; title?: string; artist?: string }[]
          playlistUrl?: string
        }
        const resolvedTracks = Array.isArray(data.tracks) ? data.tracks : []
        const alignedIds = songs.map((song) => {
          const match = resolvedTracks.find(
            (t) =>
              String(t?.title ?? "").trim() === song.title &&
              String(t?.artist ?? "").trim() === song.artist,
          )
          const id = typeof match?.videoId === "string" ? match.videoId.trim() : ""
          return id || null
        })
        const videoIds = alignedIds.filter((id): id is string => Boolean(id))
        const playlistUrl = data.playlistUrl ?? null
        if (!cancelled) {
          setYoutubePlaylistUrl(playlistUrl)
          setYoutubeVideoIds(videoIds)
          setYoutubeVideoIdByIndex(alignedIds)
          if (videoIds.length > 0 && playlistUrl) {
            saveYoutubePlaylistToHistory({ videoIds, playlistUrl })
          }
        }
      } catch {
        if (!cancelled) {
          setYoutubePlaylistUrl(null)
          setYoutubeVideoIds([])
          setYoutubeVideoIdByIndex(songs.map(() => null))
        }
      } finally {
        if (!cancelled) {
          setYoutubePlaylistLoading(false)
          setYoutubeSettledKeys(keysForFetch)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [journeySongKeys, journeySongs])

  const handleSongPreview = async (songs: any[]) => {
    const songsWithPreviews: any[] = []
    for (const song of songs){
      const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()
      const response = await fetch(
        `/itunes/search?term=${song.title}+${cleanArtist}&media=music&entity=song&limit=1`
      )
      const data = await response.json()
      const result = data.results[0]

      if (!result) {
        songsWithPreviews.push({ ...song, previewUrl: null })
      }
      else{
        const normalize = (str: string) =>
          str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        const trackMatches = normalize(result.trackName).includes(normalize(song.title))
        const artistMatches = normalize(result.artistName).includes(normalize(cleanArtist))

        const matched = trackMatches && artistMatches
        const previewUrl = matched ? result.previewUrl : null
        const itunesDuration =
          matched && typeof result.trackTimeMillis === "number" && result.trackTimeMillis > 0
            ? result.trackTimeMillis
            : null
        const durationMs =
          typeof song.durationMs === "number" && song.durationMs > 0
            ? song.durationMs
            : itunesDuration

        songsWithPreviews.push({ ...song, previewUrl, durationMs })
      }

    }
    return songsWithPreviews
  }

  const youtubePlaylistReady = youtubeVideoIds.length > 0 || !!youtubePlaylistUrl
  const youtubePlaylistFailed =
    !youtubePlaylistLoading && journeySongs.length > 0 && !youtubePlaylistReady

  const syncedPlaylistTracks: SyncedPlaylistTrack[] = useMemo(
    () =>
      journeySongs.map((song: any, i: number) => ({
        title: typeof song?.title === "string" ? song.title : "",
        artist: typeof song?.artist === "string" ? song.artist : "",
        videoId: youtubeVideoIdByIndex[i] ?? null,
        previewUrl: song?.previewUrl ?? null,
        imageUrl: song?.imageUrl ?? null,
        durationMs:
          typeof song?.durationMs === "number" && song.durationMs > 0 ? song.durationMs : null,
        explanation: typeof song?.explanation === "string" ? song.explanation : null,
      })),
    [journeySongs, youtubeVideoIdByIndex],
  )

  const stillBuildingPlaylist = journeySongsLoading || !youtubeSettled
  const insightFooter =
    stillBuildingPlaylist && journeyLinesAllowed ? (
      <div
        className={cn(
          "transition-opacity ease-out motion-reduce:transition-none",
          "motion-safe:duration-[1200ms]",
          journeyLinesEntered ? "opacity-100" : "opacity-0",
        )}
      >
        <RotatingLoadingLines
          lines={JOURNEY_LOADING_LINES}
          active={stillBuildingPlaylist && journeyLinesAllowed}
          lineClassName="arr-status m-0"
        />
      </div>
    ) : playlistRevealButtonReady && !playlistRevealAllowed ? (
      <button
        type="button"
        className={cn(
          "arr-cta",
          "transition-opacity ease-out motion-reduce:transition-none",
          "motion-safe:duration-[1200ms]",
          playlistCtaEntered ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setPlaylistRevealAllowed(true)}
      >
        Ready for playlist
      </button>
    ) : null

  /** One key after loading so insight → playlist morphs in place (no crossfade jump). */
  const resultsScreenKey = useMemo(() => {
    if (!claudeRes) return "loading"
    return "results"
  }, [claudeRes])

  const resultsWave = useMemo(
    () => ({ mode: "floor" as const, color: "var(--fill)", swell: 0.4 }),
    [],
  )

  let resultsContent

  if (!claudeRes) {
    resultsContent = (
        <LoadingScreen accent="var(--fill)">
          {claudeInsightError ? (
            <div
              aria-live="assertive"
              className="mx-auto flex w-full max-w-md flex-col items-center gap-5"
            >
              <p className="arr-load__title text-pretty">{claudeInsightError}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setClaudeInsightError(null)
                  setClaudeRetryTick((t) => t + 1)
                }}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              <p aria-live="polite" className="arr-load__title">
                <span className={insightLoadingLineFadeClass(insightLoadingL1)}>Thanks for sharing.</span>
                <br />
                <span className={insightLoadingLineFadeClass(insightLoadingL2)}>
                  Hang tight while we put together something for you.
                </span>
              </p>
              <div
                className={cn(
                  "mx-auto w-full max-w-lg transition-opacity ease-out motion-reduce:transition-none",
                  "motion-safe:duration-[900ms]",
                  insightLoadingRotator
                    ? "opacity-100"
                    : "pointer-events-none opacity-0 motion-reduce:opacity-100",
                )}
              >
                <RotatingLoadingLines
                  lines={INSIGHT_LOADING_LINES}
                  active={insightLoadingRotator && !claudeRes}
                  lineClassName="arr-load__sub m-0"
                />
              </div>
            </>
          )}
        </LoadingScreen>
    )
  } else {
    resultsContent = (
            <div
              className={cn(
                "arr-insight-playlist",
                playlistRevealAllowed && "arr-insight-playlist--revealed",
                playlistRevealAllowed &&
                  !resumeFullSnapshotRef.current &&
                  "arr-insight-playlist--rise",
                viviWalkthroughActive && "arr-insight-playlist--walkthrough",
              )}
              style={{ "--accent": "var(--fill)" } as CSSProperties}
            >
              <div className="arr-insight-playlist__mirror">
                <div className="arr-insight__inner mx-auto">
                  <h2 className={cn("arr-insight__title", mirrorRevealClass(revealMirrorTitle))}>
                    Where the music meets you now
                  </h2>
                  <p className={cn("arr-insight__body", mirrorRevealClass(revealMirrorInsight))}>
                    {claudeRes.insight}
                  </p>
                </div>
                {!playlistRevealAllowed && insightFooter ? (
                  <div className="arr-insight-playlist__cta">{insightFooter}</div>
                ) : null}
              </div>
              <section
                ref={playlistSectionRef}
                className="arr-insight-playlist__playlist scroll-mt-8"
                aria-label="Your curated playlist"
                aria-hidden={!playlistRevealAllowed}
              >
                {playlistRevealAllowed && journeySongs.length > 0 ? (
                  <PlaylistScreen
                    accent="var(--fill)"
                    title="Musical nutrients for the journey forward"
                    titleClassName={playlistRevealClass(revealPlaylistHeading)}
                    onWhy={() => setPlaylistWhyExpanded((o) => !o)}
                    whyButtonId={playlistWhyTriggerId}
                    whyPanelId={playlistWhyPanelId}
                    whyExpanded={playlistWhyExpanded}
                    whyClassName={playlistRevealClass(revealPlaylistWhy)}
                    whyPanel={<p>{claudeRes.isoExplanation}</p>}
                  >
                    <PlaylistSyncedLayout
                      className={playlistRevealClass(revealPlaylistCarousel)}
                      tracks={syncedPlaylistTracks}
                      activeIndex={activePlaylistIndex}
                      onActiveIndexChange={setActivePlaylistIndex}
                      mode={youtubePlaylistFailed || !youtubePlaylistReady ? "preview" : "youtube"}
                      playerPlaceholder={
                        youtubePlaylistLoading ? (
                          <p className="arr-followup__hint">Building your YouTube playlist…</p>
                        ) : null
                      }
                      leadingNotice={
                        youtubePlaylistFailed ? (
                          <p className="arr-youtube-fallback__notice">
                            We&apos;ve hit today&apos;s limit for full playback, so we can&apos;t create a
                            YouTube playlist right now.
                            <br />
                            Here&apos;s a 30-second preview of each song, plus the full list so you can
                            build your own.
                          </p>
                        ) : null
                      }
                      headerAction={
                        youtubePlaylistUrl ? (
                          <a
                            className="arr-playlist-sync__action"
                            href={youtubePlaylistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            Open on YouTube
                          </a>
                        ) : null
                      }
                      onCopy={() => void handleCopyPlaylistList()}
                      copyLabel={
                        playlistListCopied
                          ? "Copied"
                          : playlistCopyFailed
                            ? "Copy failed"
                            : "Copy list"
                      }
                    />
                  </PlaylistScreen>
                ) : playlistRevealAllowed ? (
                  <p className="arr-player__note px-6 py-10 text-center">No songs matched for this journey.</p>
                ) : null}
              </section>
              {revealPlaylistFooter ? (
                viviWalkthroughActive ? (
                  <div
                    ref={playlistReadyCtaRef}
                    className={cn(
                      "arr-followup",
                      "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[2000ms] motion-safe:ease-in-out",
                    )}
                  >
                    <p className="arr-followup__hint">
                      Ready to try MuNu for yourself?
                    </p>
                    <button
                      type="button"
                      className="arr-cta"
                      onClick={() => onExitFollowAlongToWelcome()}
                    >
                      Start your own journey
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      ref={playlistReadyCtaRef}
                      className={cn(
                        "arr-followup",
                        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[2000ms] motion-safe:ease-in-out",
                      )}
                    >
                      <p className="arr-followup__hint">
                        Ready for a new playlist? Start with another quick check-in.
                      </p>
                      <button
                        type="button"
                        className="arr-cta"
                        onClick={() => {
                          if (journeySongs.length > 0) {
                            setPlaylistReadyModalOpen(true)
                            return
                          }
                          onStartCheckInFresh()
                        }}
                      >
                        I&apos;m Ready
                      </button>
                    </div>
                    <Dialog open={playlistReadyModalOpen} onOpenChange={setPlaylistReadyModalOpen}>
                      <DialogContent className="arr-dialog flex min-h-[22rem] flex-col items-center justify-center gap-8 py-8 text-center sm:max-w-lg sm:min-h-[26rem]">
                        <DialogHeader className="flex w-full max-w-full flex-col items-center gap-4 text-center">
                          <DialogTitle className="font-serif text-xl font-semibold text-[#39322a]">
                            Start a new check-in?
                          </DialogTitle>
                          <p className="arr-dialog__body sm:max-w-xs">
                            Your current playlist will be replaced and can&apos;t be recovered.
                            {youtubePlaylistUrl
                              ? " Open the YouTube link now if you want to keep it."
                              : null}
                          </p>
                        </DialogHeader>
                        <div className="arr-dialog__actions">
                          <button
                            type="button"
                            className="arr-back"
                            onClick={() => setPlaylistReadyModalOpen(false)}
                          >
                            Keep this playlist
                          </button>
                          <button
                            type="button"
                            className="arr-cta"
                            onClick={() => {
                              setPlaylistReadyModalOpen(false)
                              onStartCheckInFresh()
                            }}
                          >
                            Start new check-in
                          </button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )
              ) : null}
            </div>
    )
  }


  return (
    <div className="munu-flow-shell munu-flow-shell--branded">
      <FlowBrandHeader />
      <div className="munu-flow-shell__body">
        <ScreenTransitionHost screenKey={resultsScreenKey} wave={resultsWave}>
          {resultsContent}
        </ScreenTransitionHost>
      </div>
    </div>
  )
}

export default Results