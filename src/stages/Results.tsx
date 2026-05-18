import { useState, useEffect, useLayoutEffect, useId, useRef, useMemo, useCallback } from "react"
import { Check, ClipboardList } from "lucide-react"

import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel"
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

/** Pause after journey work ends before showing the playlist CTA button. */
const PLAYLIST_AFTER_LOADER_MS = 380

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

/** After playlist carousel finishes revealing, wait then scroll so the check-in CTA is in view. */
const PLAYLIST_READY_CTA_SCROLL_AFTER_MS = 2500

/** Second scroll: slightly shorter than initial playlist scroll. */
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
  } catch (e) {
    console.warn("Could not persist journey rows cache:", e)
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
  } catch (e) {
    console.warn("Could not persist Claude response cache:", e)
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
  } catch (e) {
    console.warn("writeResultsCacheWithCurrentStorage failed:", e)
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
    if (shouldUseViviBakedResults(baseline, currEmotContext)) {
      const bakedJourney = viviBakedResults.journeySongsResolved
      return {
        claude: viviBakedResults.parsed,
        journeySongs: bakedJourney,
        journeySongsLoading: bakedJourney.length === 0,
        resumeFullSnapshot: bakedJourney.length > 0,
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
    "m-0 text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground transition-opacity ease-out motion-reduce:transition-none sm:text-base",
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
}: {
  lines: readonly string[]
  active: boolean
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
    <div aria-live="polite" className="mx-auto max-w-lg motion-safe:animate-pulse">
      <p
        className={cn(
          "text-center text-sm text-muted-foreground",
          !reducedMotion && "transition-opacity duration-300 ease-in-out",
          !reducedMotion && (fadedIn ? "opacity-100" : "opacity-0"),
        )}
      >
        {line}
      </p>
    </div>
  )
}

/** Preview bar pinned to bottom of artwork (inside card). Omitted when there is no preview URL. */
function CardPreviewBar({
  previewUrl,
  variant,
}: {
  previewUrl: string | null | undefined
  variant: "on-artwork" | "on-placeholder"
}) {
  if (!previewUrl) return null

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 border-t px-3 py-3 sm:py-3.5",
        "border-white/15 bg-black/55 backdrop-blur-md supports-backdrop-filter:bg-black/45",
        variant === "on-placeholder" &&
          "border-white/10 bg-black/70 supports-backdrop-filter:bg-black/55",
      )}
    >
      <audio controls src={previewUrl} className="block h-10 w-full sm:h-11" preload="none" />
    </div>
  )
}

const CAPTION_FADE_DELAY_MS = 420
const CAPTION_FADE_DURATION_MS = 900

function formatJourneySongsForClipboard(songs: any[]): string {
  return songs
    .map((song, i) => {
      const title =
        typeof song?.title === "string" && song.title.trim() ? song.title.trim() : "Unknown track"
      const artist =
        typeof song?.artist === "string" && song.artist.trim() ? song.artist.trim() : "Unknown artist"
      return `${i + 1}. ${title} — ${artist}`
    })
    .join("\n")
}

function JourneySlide({
  song,
  isSelected,
}: {
  song: any
  isSelected: boolean
}) {
  const [captionVisible, setCaptionVisible] = useState(false)

  useEffect(() => {
    if (!isSelected) {
      setCaptionVisible(false)
      return
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reducedMotion) {
      setCaptionVisible(true)
      return
    }

    setCaptionVisible(false)
    const show = window.setTimeout(() => setCaptionVisible(true), CAPTION_FADE_DELAY_MS)
    return () => window.clearTimeout(show)
  }, [isSelected])

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        className={cn(
          "relative w-full max-w-[min(100%,28rem)] shrink-0 overflow-hidden rounded-2xl border-2 shadow-md animate-in fade-in duration-300",
          song.imageUrl ? "border-border bg-card" : "border-border/60 bg-zinc-900 dark:bg-zinc-950",
        )}
      >
        {song.imageUrl ? (
          <img
            src={song.imageUrl}
            alt=""
            className="block max-h-[min(60svh,36rem)] w-full bg-muted object-contain dark:bg-zinc-900"
          />
        ) : (
          <div
            aria-hidden
            className="flex min-h-[12rem] w-full flex-col justify-end bg-gradient-to-b from-zinc-800 to-zinc-950 sm:min-h-[13rem]"
          />
        )}
        <CardPreviewBar
          previewUrl={song.previewUrl}
          variant={song.imageUrl ? "on-artwork" : "on-placeholder"}
        />
      </div>
      <div
        aria-hidden={!captionVisible}
        className={cn(
          "mx-auto w-full max-w-[min(100%,28rem)] space-y-2 px-1 text-center",
          "motion-reduce:transition-none motion-reduce:opacity-100",
          "transition-opacity ease-out",
          captionVisible ? "opacity-100" : "opacity-0",
        )}
        style={{
          transitionDuration: captionVisible ? `${CAPTION_FADE_DURATION_MS}ms` : `${Math.min(220, CAPTION_FADE_DURATION_MS)}ms`,
        }}
      >
        <p className="text-lg font-semibold tracking-tight text-foreground">{song.title}</p>
        <p className="text-foreground text-sm sm:text-base">by {song.artist}</p>
        {song.explanation ? (
          <p className="text-foreground pt-1 text-sm leading-snug sm:text-base">{song.explanation}</p>
        ) : null}
      </div>
    </div>
  )
}

interface ResultsProps {
  onRebuildMusicProfile: () => void
  onStartCheckInFresh: () => void
  onExitFollowAlongToWelcome: () => void
}

function Results({
  onRebuildMusicProfile,
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

  const [playlistWhyExpanded, setPlaylistWhyExpanded] = useState(false)
  const playlistWhyTriggerId = useId()
  const playlistWhyPanelId = useId()

  const [journeyCarouselApi, setJourneyCarouselApi] = useState<CarouselApi | null>(null)
  const [journeySnapIndex, setJourneySnapIndex] = useState(0)
  const [playlistListCopied, setPlaylistListCopied] = useState(false)
  const [playlistCopyFailed, setPlaylistCopyFailed] = useState(false)
  const playlistCopyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playlistClipboardText = useMemo(
    () => formatJourneySongsForClipboard(journeySongs),
    [journeySongs],
  )

  useEffect(() => {
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
    }, 2500)
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
  }

  useLayoutEffect(() => {
    if (!resumeFullSnapshotRef.current || !claudeRes) return
    playlistRevealHandledRef.current = true
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

  /** After insight fade completes, allow journey rotating lines (still requires `journeySongsLoading`). */
  useEffect(() => {
    if (!claudeRes || !journeySongsLoading) {
      setJourneyLinesAllowed(false)
      return
    }
    if (!revealMirrorInsight) {
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
    }, INSIGHT_BODY_FADE_MS)

    return () => window.clearTimeout(id)
  }, [claudeRes, journeySongsLoading, revealMirrorInsight])

  /** After journey lines are allowed, fade the container in slowly (not an instant pop-in). */
  useLayoutEffect(() => {
    if (!journeySongsLoading || !journeyLinesAllowed) {
      setJourneyLinesEntered(false)
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
  }, [journeySongsLoading, journeyLinesAllowed])

  /** Journey work finished → brief beat → show “Show me my playlist” (user taps to scroll + reveal). */
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
    if (journeySongsLoading) {
      setPlaylistRevealButtonReady(false)
      return
    }

    const id = window.setTimeout(() => {
      setPlaylistRevealButtonReady(true)
    }, PLAYLIST_AFTER_LOADER_MS)

    return () => window.clearTimeout(id)
  }, [claudeRes, journeySongsLoading])

  /** Gentle fade-in for the playlist CTA (same pacing idea as journey lines). */
  useLayoutEffect(() => {
    if (resumeFullSnapshotRef.current) return
    if (!claudeRes || journeySongsLoading || !playlistRevealButtonReady || playlistRevealAllowed) {
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
  }, [claudeRes, journeySongsLoading, playlistRevealButtonReady, playlistRevealAllowed])

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
    playlistRevealHandledRef.current = true

    const el = playlistSectionRef.current
    if (!el) return

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

  /** Once the carousel is visible, pause then scroll so the italic line and “I’m Ready” land in view. */
  useEffect(() => {
    if (resumeFullSnapshotRef.current) return
    if (!revealPlaylistCarousel || !playlistRevealAllowed || !claudeRes) return

    const rafRef = { current: 0 }
    const timeoutId = window.setTimeout(() => {
      const el = playlistReadyCtaRef.current
      if (!el) return

      const reduced =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

      const rect = el.getBoundingClientRect()
      const startY = window.scrollY
      const targetY = Math.max(0, rect.top + startY - PLAYLIST_SCROLL_MARGIN_PX)
      const distance = targetY - startY

      if (reduced || Math.abs(distance) < 2) {
        window.scrollTo({ top: targetY, behavior: "auto" })
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
    }, PLAYLIST_READY_CTA_SCROLL_AFTER_MS)

    return () => {
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(rafRef.current)
    }
  }, [revealPlaylistCarousel, playlistRevealAllowed, claudeRes])

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
        const url = `/api/claude?baseline=${encodeURIComponent(JSON.stringify(baseline))}&currEmotContext=${encodeURIComponent(JSON.stringify(currEmotContext))}`
        console.log("fetch url", url)
        const response = await fetch(url)
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
            console.warn(`Claude request ${response.status}; retrying in ${wait}ms (${attempt + 1}/${maxAttempts})`)
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
        console.log("raw response", cleaned)
        const parsed = JSON.parse(cleaned)
        if (cancelled) return
        console.log("claude response", parsed)
        setClaudeRes(parsed)
        setClaudeInsightError(null)
        if (fingerprint) writeClaudeCache(fingerprint, parsed)
      } catch (error) {
        if (attempt < maxAttempts - 1) {
          const wait = claudeBackoffMs(attempt)
          console.warn(`Claude fetch failed; retrying in ${wait}ms (${attempt + 1}/${maxAttempts})`, error)
          await new Promise((r) => setTimeout(r, wait))
          if (cancelled) return
          return fetchClaudeResponse(attempt + 1, maxAttempts)
        }
        console.error("Failed after multiple attempts:", error)
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

      console.log("number of songs", songs.length)
      const token = await getSpotifyAccessToken()
      if (!token) return verifiedSongs
      for (const song of songs) {
        await new Promise(resolve => setTimeout(resolve, 200))

        const title = song.title
        const artist = song.artist
        const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()

        const response = await fetch(`/api/spotify-search?q=${title}&type=track&artist=${cleanArtist}&token=${token}`)

        if (response.status === 429){
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }

        const result = await response.json()
        const items = result.tracks?.items

        console.log(`Verifying: ${title} by ${artist}`)
        console.log("items returned:", items)

        if (!items || items.length === 0) {
          console.log(`DROPPED at Spotify - no items returned for: ${title}`)
          continue
        }

        const returnedTrack = items[0]
        const trackMatches = returnedTrack.name && normalize(returnedTrack.name).includes(normalize(title))
        const artistMatches = returnedTrack.artists.some((a: { name: string }) =>
          normalize(a.name).includes(normalize(cleanArtist))
        )

        console.log(`trackMatches: ${trackMatches}, artistMatches: ${artistMatches}`)

        if (trackMatches && artistMatches) {
          const imageUrl = returnedTrack.album?.images?.[0]?.url ?? null
          verifiedSongs.push({ ...song, imageUrl })
        } else {
          console.log(`DROPPED at matching - ${title} by ${artist}`)
          console.log(
            `Spotify returned: ${returnedTrack.name} by ${returnedTrack.artists.map((a: any) => a.name).join(", ")}`
          )
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
    if (!journeyCarouselApi) return
    const sync = () => setJourneySnapIndex(journeyCarouselApi.selectedScrollSnap())
    sync()
    journeyCarouselApi.on("select", sync)
    journeyCarouselApi.on("reInit", sync)
    return () => {
      journeyCarouselApi.off("select", sync)
      journeyCarouselApi.off("reInit", sync)
    }
  }, [journeyCarouselApi])

  const handleSongPreview = async (songs: any[]) => {
    const songsWithPreviews: any[] = []
    for (const song of songs){
      const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()
      const response = await fetch(
        `/itunes/search?term=${song.title}+${cleanArtist}&media=music&entity=song&limit=1`
      )
      const data = await response.json()
      const result = data.results[0]

      console.log(`iTunes lookup: ${song.title} by ${song.artist}`)
      console.log("iTunes result:", result)

      if (!result) {
        console.log(`DROPPED at iTunes - no result for: ${song.title}`)
        songsWithPreviews.push({ ...song, previewUrl: null })
      }
      else{
        const normalize = (str: string) =>
          str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        
        // const trackMatches = result.trackName.toLowerCase().includes(song.title.toLowerCase())
        // const artistMatches = result.artistName.toLowerCase().includes(song.artist.toLowerCase())
        const trackMatches = normalize(result.trackName).includes(normalize(song.title))
        const artistMatches = normalize(result.artistName).includes(normalize(cleanArtist))

        console.log(`iTunes trackMatches: ${trackMatches}, artistMatches: ${artistMatches}`)
        console.log(`iTunes returned: ${result.trackName} by ${result.artistName}`)

        const matched = trackMatches && artistMatches
        const previewUrl = matched ? result.previewUrl : null

        songsWithPreviews.push({ ...song, previewUrl })
      }

    }
    return songsWithPreviews
  }


  console.log("Baseline:", profile?.baseline)
  console.log("Emotional Context", profile?.currEmotContext)

  return (
    <div className="flex min-h-svh flex-col px-6 py-10">
      {!claudeRes ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 text-center">
          {claudeInsightError ? (
            <div aria-live="assertive" className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
              <p className="text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
                {claudeInsightError}
              </p>
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
              <div aria-live="polite" className="mx-auto w-full max-w-prose space-y-2">
                <p className={insightLoadingLineFadeClass(insightLoadingL1)}>Thanks for sharing.</p>
                <p className={insightLoadingLineFadeClass(insightLoadingL2)}>
                  Hang tight while we put together something for you.
                </p>
              </div>
              <div
                className={cn(
                  "mx-auto w-full max-w-lg transition-opacity ease-out motion-reduce:transition-none",
                  "motion-safe:duration-[900ms]",
                  insightLoadingRotator
                    ? "opacity-100"
                    : "pointer-events-none opacity-0 motion-reduce:opacity-100",
                )}
              >
                <RotatingLoadingLines lines={INSIGHT_LOADING_LINES} active={insightLoadingRotator && !claudeRes} />
              </div>
            </>
          )}
        </div>
      ) : null}
      {claudeRes ? (
        <>
          <div
            className={cn(
              "relative flex flex-col items-center px-4 text-center",
              // Journey lines are position:absolute, so they don’t participate in flex layout — safe to center the insight.
              (journeySongsLoading || !playlistRevealAllowed)
                ? "min-h-svh justify-center"
                : "justify-start pt-2",
              playlistRevealAllowed ? "pb-8 sm:pb-10" : "pb-10 sm:pb-12",
            )}
          >
            <div
              className={cn(
                "mx-auto max-w-lg space-y-5",
                // Breathing room above absolute-positioned journey lines / playlist CTA on tight viewports.
                ((journeySongsLoading && journeyLinesAllowed) ||
                  (playlistRevealButtonReady && !playlistRevealAllowed)) &&
                  "pb-8 sm:pb-10",
              )}
            >
              <h2
                className={cn(
                  "text-foreground text-xl font-semibold tracking-tight sm:text-2xl",
                  "transition-opacity ease-out motion-reduce:transition-none",
                  revealMirrorTitle
                    ? "opacity-100 motion-safe:duration-[1400ms]"
                    : "opacity-0 motion-safe:duration-0",
                )}
              >
                Where the music meets you now
              </h2>
              <p
                className={cn(
                  "text-foreground text-[0.9375rem] leading-relaxed sm:text-base",
                  "transition-opacity ease-out motion-reduce:transition-none",
                  revealMirrorInsight
                    ? "opacity-100 motion-safe:duration-[1400ms]"
                    : "opacity-0 motion-safe:duration-0",
                )}
              >
                {claudeRes.insight}
              </p>
            </div>
            {journeySongsLoading && journeyLinesAllowed ? (
              <div
                className={cn(
                  "absolute inset-x-0 bottom-12 z-10 flex justify-center px-2 sm:bottom-16 sm:px-4",
                  "transition-opacity ease-out motion-reduce:transition-none",
                  "motion-safe:duration-[1200ms]",
                  journeyLinesEntered ? "opacity-100" : "opacity-0",
                )}
              >
                <div className="mx-auto w-full max-w-lg">
                  <RotatingLoadingLines lines={JOURNEY_LOADING_LINES} active />
                </div>
              </div>
            ) : playlistRevealButtonReady && !playlistRevealAllowed ? (
              <div
                className={cn(
                  "absolute inset-x-0 bottom-12 z-10 flex justify-center px-2 sm:bottom-16 sm:px-4",
                  "transition-opacity ease-out motion-reduce:transition-none",
                  "motion-safe:duration-[1200ms]",
                  playlistCtaEntered ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <Button
                  type="button"
                  size="lg"
                  className="min-w-[12rem]"
                  onClick={() => setPlaylistRevealAllowed(true)}
                >
                  Show me my playlist
                </Button>
              </div>
            ) : null}
          </div>
          {playlistRevealAllowed ? (
            <section
              ref={playlistSectionRef}
              className="mx-auto mt-6 w-full max-w-3xl scroll-mt-8 sm:mt-10"
              aria-label="Your curated playlist"
            >
              <div className="space-y-6">
                <h2
                  className={cn(
                    "text-xl font-semibold tracking-tight transition-opacity ease-out motion-reduce:transition-none",
                    revealPlaylistHeading
                      ? "opacity-100 motion-safe:duration-[900ms]"
                      : "opacity-0 motion-safe:duration-0",
                  )}
                >
                  Musical nutrients for the journey forward
                </h2>
                <div
                  className={cn(
                    "mx-auto w-full max-w-xl text-center transition-opacity ease-out motion-reduce:transition-none",
                    revealPlaylistWhy
                      ? "opacity-100 motion-safe:duration-[900ms]"
                      : "opacity-0 motion-safe:duration-0",
                  )}
                >
                  <button
                    type="button"
                    id={playlistWhyTriggerId}
                    aria-expanded={playlistWhyExpanded}
                    aria-controls={playlistWhyPanelId}
                    className={cn(
                      "inline cursor-pointer border-0 bg-transparent p-0 text-center text-base font-medium text-foreground",
                      "underline decoration-foreground/40 underline-offset-4",
                      "hover:decoration-foreground hover:opacity-90 motion-reduce:transition-none transition-opacity",
                      "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
                    )}
                    onClick={() => setPlaylistWhyExpanded((o) => !o)}
                  >
                    Why these songs?
                  </button>
                  <div
                    id={playlistWhyPanelId}
                    role="region"
                    aria-labelledby={playlistWhyTriggerId}
                    className={cn(
                      "grid overflow-hidden motion-reduce:transition-none",
                      "transition-[grid-template-rows] duration-500 ease-in-out motion-reduce:duration-0",
                      playlistWhyExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className={cn(
                          "pt-3 text-left motion-reduce:transition-none",
                          "transition-opacity duration-500 ease-in-out motion-reduce:duration-0",
                          playlistWhyExpanded ? "opacity-100" : "pointer-events-none opacity-0",
                        )}
                      >
                        <p className="text-foreground text-[0.9375rem] leading-relaxed sm:text-base">
                          {claudeRes.isoExplanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "transition-opacity ease-out motion-reduce:transition-none",
                    revealPlaylistCarousel
                      ? "opacity-100 motion-safe:duration-[900ms]"
                      : "opacity-0 motion-safe:duration-0",
                  )}
                >
                  {journeySongs.length > 0 ? (
                    <>
                      <Carousel
                        opts={{ align: "center", loop: false }}
                        className="w-full max-w-full"
                        setApi={setJourneyCarouselApi}
                      >
                        <CarouselContent>
                          {journeySongs.map((song: any, i: number) => (
                            <CarouselItem key={`journey-${i}-${song.title}-${song.artist}`}>
                              <div className="flex justify-center py-3">
                                <JourneySlide song={song} isSelected={i === journeySnapIndex} />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-0 border-border bg-background/90 shadow-sm sm:left-1" />
                        <CarouselNext className="right-0 border-border bg-background/90 shadow-sm sm:right-1" />
                      </Carousel>
                      <div className="mt-4 flex flex-col items-center gap-1.5 sm:mt-5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => void handleCopyPlaylistList()}
                          aria-label="Copy playlist as a plain text list of songs"
                        >
                          {playlistListCopied ? (
                            <Check className="size-4 shrink-0" aria-hidden />
                          ) : (
                            <ClipboardList className="size-4 shrink-0" aria-hidden />
                          )}
                          {playlistListCopied
                            ? "Copied!"
                            : playlistCopyFailed
                              ? "Copy failed — try again"
                              : "Copy song list"}
                        </Button>
                        <p
                          className="min-h-[1.25rem] text-center text-xs text-muted-foreground"
                          aria-live="polite"
                          role="status"
                        >
                          {playlistListCopied
                            ? "Song list copied to your clipboard."
                            : playlistCopyFailed
                              ? "Clipboard access was blocked. You can try again or copy manually."
                              : "\u00a0"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No songs matched for this journey.</p>
                  )}
                </div>
              </div>
              {revealPlaylistCarousel ? (
                viviWalkthroughActive ? (
                  <div
                    ref={playlistReadyCtaRef}
                    className="mt-12 flex flex-col items-center gap-6 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[900ms] sm:mt-14"
                  >
                    <p className="max-w-md text-[0.9375rem] text-muted-foreground italic leading-relaxed sm:text-base">
                      Ready to try MuNu for yourself?
                    </p>
                    <Button type="button" size="lg" onClick={() => onExitFollowAlongToWelcome()}>
                      Start your own journey
                    </Button>
                  </div>
                ) : (
                  <>
                    <div
                      ref={playlistReadyCtaRef}
                      className="mt-12 flex flex-col items-center gap-6 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[900ms] sm:mt-14"
                    >
                      <p className="max-w-md text-[0.9375rem] text-muted-foreground italic leading-relaxed sm:text-base">
                        Ready for a new playlist? Start with another quick check-in.
                      </p>
                      <Button type="button" size="lg" onClick={() => setPlaylistReadyModalOpen(true)}>
                        I&apos;m Ready
                      </Button>
                    </div>
                    <Dialog open={playlistReadyModalOpen} onOpenChange={setPlaylistReadyModalOpen}>
                      <DialogContent className="flex min-h-[22rem] flex-col items-center justify-center gap-8 py-8 text-center sm:max-w-lg sm:min-h-[26rem]">
                        <DialogHeader className="flex w-full max-w-full flex-col items-center gap-4 text-center">
                          <DialogTitle className="sr-only">Check-in options</DialogTitle>
                          <p className="max-w-[17.5rem] shrink-0 self-center text-center text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground italic sm:max-w-xs sm:text-base">
                            Your next playlist starts with how you&apos;re feeling now. Want to update your
                            music profile first, or jump straight into your check-in?
                          </p>
                        </DialogHeader>
                        <div className="flex shrink-0 flex-row flex-wrap justify-center gap-3 self-center">
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            onClick={() => {
                              setPlaylistReadyModalOpen(false)
                              onRebuildMusicProfile()
                            }}
                          >
                            Update My Profile
                          </Button>
                          <Button
                            type="button"
                            className="min-h-11"
                            onClick={() => {
                              setPlaylistReadyModalOpen(false)
                              onStartCheckInFresh()
                            }}
                          >
                            Start Check-In
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default Results