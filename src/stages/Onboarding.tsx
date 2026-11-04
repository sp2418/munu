import IntroScreen from "../components/IntroScreen"
import StoryScreen from "../components/StoryScreen"
import Welcome from "./Welcome"
import FlowBrandHeader from "../components/FlowBrandHeader"
import QuestionBlock from "../components/QuestionBlock"
import QuestionStageLayout, {
    QUESTION_HINT_AUTO_HIDE_MS,
    QUESTION_REQUIRED_FOOTER_HINT,
} from "../components/QuestionStageLayout"
import { cn } from "../lib/utils"
import { spotifyTrackSearchDedupKey } from "../lib/trackSearchDedupe"
import { getSpotifyAccessToken } from "../lib/spotifyToken"

import viviImage from "../assets/vivi.jpg"
import { useFollowAlongPersona } from "../context/FollowAlongPersonaContext"
import {
    readOnboardingScreenProgress,
    writeAppProgress,
    writeOnboardingScreenProgress,
} from "../lib/appProgressStorage"
import {
    clearOnboardingDraft,
    readOnboardingDraftOrStorage,
    writeOnboardingDraft,
} from "../lib/onboardingDraftStorage"
import { writeViviBakedResultsCache } from "../lib/resultsCache"
import {
    DESIRED_FEELING_OPTIONS,
    DESIRED_FEELING_PROMPT,
} from "../lib/desiredFeeling"
import type { DesiredFeelingId } from "../lib/reccobeatsEnrich"
import {
    getViviDraftBaseline,
    getViviDraftCheckIn,
    isViviWalkthroughActive,
} from "../lib/viviWalkthroughStorage"

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react"

import ScreenTransitionHost from "../components/ScreenTransitionHost"
import type { SoundWaveProps } from "../components/SoundWave"
import { prefersReducedMotion } from "../lib/screenTransition"

/** Floor horizon for the sticky wave (viewBox cy). */
const WAVE_FLOOR_CY = 648
/** Fade out welcome copy/CTAs before revealing the next screen. */
const WELCOME_EXIT_FADE_MS = 900
/** Stillness after copy is gone before the next screen arrives. */
const WELCOME_EXIT_BEAT_MS = 700

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms)
    })
}

function initialOnboardingScreens(
    startAtMusicProfileQuestions: boolean,
    startAtCheckInQuestions: boolean,
) {
    const noSavedProfile =
        typeof localStorage !== "undefined" && !localStorage.getItem("musicBaseline")
    if (
        noSavedProfile &&
        !isViviWalkthroughActive() &&
        !startAtMusicProfileQuestions &&
        !startAtCheckInQuestions
    ) {
        return {
            showWelcomeScreen: true,
            showDemoScreen: false,
            showPrepScreen: false,
            currentQuestion: 0,
        }
    }

    const saved = readOnboardingScreenProgress()
    if (startAtCheckInQuestions) {
        return {
            showWelcomeScreen: false,
            showDemoScreen: false,
            showPrepScreen: false,
            // Always restart at the mind question; middle answers are prefilled separately.
            currentQuestion: 0,
        }
    }
    if (startAtMusicProfileQuestions) {
        return {
            showWelcomeScreen: false,
            showDemoScreen: false,
            showPrepScreen: false,
            // Genres is Q2 in the merged flow.
            currentQuestion: saved?.currentQuestion ?? 2,
        }
    }
    if (saved) {
        return {
            showWelcomeScreen: saved.showWelcomeScreen,
            showDemoScreen: saved.showDemoScreen,
            showPrepScreen: saved.showPrepScreen,
            currentQuestion: saved.currentQuestion,
        }
    }
    return {
        showWelcomeScreen: true,
        showDemoScreen: false,
        showPrepScreen: false,
        currentQuestion: 0,
    }
}

/** Pause before the first sentence begins to fade in. */
const WELCOME_INTRO_STILLNESS_MS = 500
/** Quiet beat after a sentence has finished fading, before the next block animates. */
const WELCOME_PAUSE_BETWEEN_MS = 700
/** After the prep headline line finishes fading, pause before the second line fades in. */
const PREP_STAGGER_LINE_PAUSE_MS = 550
/** Opacity transition length for each sentence (keep in sync with `motion-safe:duration-[900ms]` below). */
const WELCOME_LINE_FADE_MS = 900

const TOTAL_QUESTIONS = 4

interface OnboardingProps {
    setView: (view: string) => void
    /** Opens at genres (Q2); skips welcome and prep screens. */
    startAtMusicProfileQuestions?: boolean
    /** Opens at the mind question (Q0); skips welcome and prep. */
    startAtCheckInQuestions?: boolean
}

type TrackOption = {
    id: string
    name: string
    artists: string[]
    imageUrl: string
}

function Onboarding({
    setView,
    startAtMusicProfileQuestions = false,
    startAtCheckInQuestions = false,
}: OnboardingProps) {
    const followAlong = useFollowAlongPersona()
    const initialScreens = initialOnboardingScreens(
        startAtMusicProfileQuestions,
        startAtCheckInQuestions,
    )

    const searchTracks = async (searchTermTrack: string) => {
        const token = await getSpotifyAccessToken()
        if (!token) return {}
        const response = await fetch(`/api/spotify-search?q=${searchTermTrack}&type=track&token=${token}`)
        const data = await response.json()
        return data
    }

    const [searchTermTrack, setSearchTermTrack] = useState<string>("")
    const [spotifyTracks, setSpotifyTracks] = useState<TrackOption[]>([])

    type SpotifyTrack = {
        album: {
            album_type: string
            artists: { id: string; name: string }[]
            external_urls: { spotify: string }
            href: string
            id: string
            images: { height: number; url: string; width: number }[]
        }
        artists: { id: string; name: string }[]
        disc_number: number
        duration_ms: number
        explicit: boolean
        external_ids?: { isrc?: string }
        external_urls: { spotify: string }
        href: string
        id: string
        is_local: boolean
        is_playable: boolean
        name: string
        track_number: number
        type: string
        uri: string
    }

    useEffect(() => {
        if (!searchTermTrack.trim()) {
            setSpotifyTracks([])
            return
        }

        const timer = setTimeout(() => {
            const fetchTracks = async () => {
                const results = await searchTracks(searchTermTrack)
                const uniqueTracks = (results.tracks?.items ?? []).filter(
                    (track: SpotifyTrack, index: number, self: SpotifyTrack[]) =>
                        index ===
                        self.findIndex((t) => spotifyTrackSearchDedupKey(t) === spotifyTrackSearchDedupKey(track)),
                )
                const tracks: TrackOption[] = uniqueTracks.map((track: SpotifyTrack) => ({
                    id: track.id,
                    name: track.name,
                    artists: track.artists.map((artist) => artist.name),
                    imageUrl: track.album.images?.[0]?.url ?? "",
                }))
                setSpotifyTracks(tracks)
            }
            fetchTracks()
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTermTrack])

    const genres = [
        "Hip Hop",
        "R&B",
        "Pop",
        "Rock",
        "Indie",
        "Jazz",
        "Classical",
        "Electronic",
        "Latin",
        "Afrobeats",
        "Country",
        "Metal",
        "Folk",
        "Gospel",
        "Reggae",
        "Blues",
        "Soul",
        "Punk",
        "Alternative",
        "Dance",
    ]

    const [listGenres, setListGenres] = useState<string[]>([])
    const [rantSesh, setRantSesh] = useState<string>("")
    const [listOfTracks, setListOfTracks] = useState<TrackOption[]>([])
    const [desiredFeeling, setDesiredFeeling] = useState<DesiredFeelingId | "">("")
    const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => initialScreens.showWelcomeScreen)
    const [showDemoScreen, setShowDemoScreen] = useState(() => initialScreens.showDemoScreen)
    const [showPrepScreen, setShowPrepScreen] = useState(() => initialScreens.showPrepScreen)
    const [currentQuestion, setCurrentQuestion] = useState(() => initialScreens.currentQuestion)
    const [nextBlockedHint, setNextBlockedHint] = useState<string | null>(null)
    const [welcomeExiting, setWelcomeExiting] = useState(false)
    const [welcomeExitDestination, setWelcomeExitDestination] = useState<"prep" | "demo" | null>(
        null,
    )
    const waveCyRef = useRef(WAVE_FLOOR_CY)

    useLayoutEffect(() => {
        if (followAlong.walkthroughActive) {
            const baseline = getViviDraftBaseline()
            const checkIn = getViviDraftCheckIn()
            setListGenres([...baseline.favGenres])
            setRantSesh(checkIn.currRant)
            const tracks: TrackOption[] = []
            for (const t of checkIn.currTracks ?? []) {
                if (Array.isArray(t)) continue
                if (!t || typeof t !== "object" || typeof t.id !== "string") continue
                tracks.push({
                    id: t.id,
                    name: typeof t.name === "string" ? t.name : "",
                    artists: Array.isArray(t.artists) ? t.artists.map(String) : [],
                    imageUrl: typeof t.imageUrl === "string" ? t.imageUrl : "",
                })
            }
            setListOfTracks(tracks)
            setDesiredFeeling(checkIn.desiredFeeling || "")
            return
        }

        const draft = readOnboardingDraftOrStorage()
        if (!draft) return
        setListGenres([...draft.listGenres])
        setListOfTracks(draft.currTracks)
        // Fresh check-in: keep genres + recent songs, clear mind + desired feeling.
        if (startAtCheckInQuestions) {
            setRantSesh("")
            setDesiredFeeling("")
        } else {
            setRantSesh(draft.currRant)
            setDesiredFeeling(draft.desiredFeeling || "")
        }
    }, [followAlong.walkthroughActive, startAtCheckInQuestions])

    useEffect(() => {
        writeAppProgress({ view: "onboarding" })
    }, [])

    useEffect(() => {
        if (followAlong.walkthroughActive) return
        writeOnboardingScreenProgress({
            showWelcomeScreen,
            showDemoScreen,
            showPrepScreen,
            currentQuestion,
        })
    }, [
        followAlong.walkthroughActive,
        showWelcomeScreen,
        showDemoScreen,
        showPrepScreen,
        currentQuestion,
    ])

    useEffect(() => {
        if (followAlong.walkthroughActive) return
        const timer = window.setTimeout(() => {
            writeOnboardingDraft({
                listGenres,
                currRant: rantSesh,
                currTracks: listOfTracks,
                desiredFeeling,
            })
        }, 400)
        return () => window.clearTimeout(timer)
    }, [followAlong.walkthroughActive, listGenres, rantSesh, listOfTracks, desiredFeeling])

    useEffect(() => {
        setNextBlockedHint(null)
    }, [currentQuestion])

    useEffect(() => {
        if (!nextBlockedHint) return
        const id = window.setTimeout(() => setNextBlockedHint(null), QUESTION_HINT_AUTO_HIDE_MS)
        return () => window.clearTimeout(id)
    }, [nextBlockedHint])

    const [revealDemoImage, setRevealDemoImage] = useState(false)
    const [revealDemoCta, setRevealDemoCta] = useState(false)

    const [revealPrepHeadline, setRevealPrepHeadline] = useState(false)
    const [revealPrepBody, setRevealPrepBody] = useState(false)
    const [revealPrepCta, setRevealPrepCta] = useState(false)

    useEffect(() => {
        if (!showDemoScreen) {
            setRevealDemoImage(false)
            setRevealDemoCta(false)
            return
        }

        const reduced =
            typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (reduced) {
            queueMicrotask(() => {
                setRevealDemoImage(true)
                setRevealDemoCta(true)
            })
            return undefined
        }

        const intro = WELCOME_INTRO_STILLNESS_MS
        const fade = WELCOME_LINE_FADE_MS
        const pause = WELCOME_PAUSE_BETWEEN_MS
        const ctaAt = intro + fade + pause

        const ids: ReturnType<typeof setTimeout>[] = [
            window.setTimeout(() => setRevealDemoImage(true), intro),
            window.setTimeout(() => setRevealDemoCta(true), ctaAt),
        ]

        return () => {
            for (const id of ids) {
                window.clearTimeout(id)
            }
        }
    }, [showDemoScreen])

    useEffect(() => {
        if (!showPrepScreen) {
            setRevealPrepHeadline(false)
            setRevealPrepBody(false)
            setRevealPrepCta(false)
            return
        }

        const reduced =
            typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (reduced) {
            queueMicrotask(() => {
                setRevealPrepHeadline(true)
                setRevealPrepBody(true)
                setRevealPrepCta(true)
            })
            return undefined
        }

        const intro = WELCOME_INTRO_STILLNESS_MS
        const fade = WELCOME_LINE_FADE_MS
        const lineGap = PREP_STAGGER_LINE_PAUSE_MS
        const beforeCta = WELCOME_PAUSE_BETWEEN_MS

        const headlineAt = intro
        const bodyAt = intro + fade + lineGap
        const ctaAt = bodyAt + fade + beforeCta

        const ids: ReturnType<typeof setTimeout>[] = [
            window.setTimeout(() => setRevealPrepHeadline(true), headlineAt),
            window.setTimeout(() => setRevealPrepBody(true), bodyAt),
            window.setTimeout(() => setRevealPrepCta(true), ctaAt),
        ]

        return () => {
            for (const id of ids) {
                window.clearTimeout(id)
            }
        }
    }, [showPrepScreen])

    const welcomeRevealClass = (revealed: boolean) =>
        cn(
            "transition-opacity ease-out motion-reduce:transition-none",
            revealed
                ? "opacity-100 motion-safe:duration-[900ms]"
                : "pointer-events-none opacity-0 motion-safe:duration-0",
        )

    const handleAddGenre = (genre: string) => {
        if (listGenres.includes(genre)) {
            setListGenres(listGenres.filter((currGenre) => currGenre != genre))
        } else {
            setListGenres([...listGenres, genre])
        }
    }

    const handleRantSession = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRantSesh(e.target.value)
    }

    const handleAddTrack = (track: TrackOption) => {
        if (!listOfTracks.some((currTrack) => currTrack.id === track.id)) {
            setListOfTracks([...listOfTracks, track])
        }
    }

    const handleRemoveTrack = (trackId: string) => {
        setListOfTracks(listOfTracks.filter((currTrack) => currTrack.id !== trackId))
    }

    const handleSelectDesiredFeeling = (id: string) => {
        setDesiredFeeling((prev) => (prev === id ? "" : (id as DesiredFeelingId)))
    }

    const formatArtists = (artists: string[]) => {
        if (artists.length === 1) return artists[0]
        return artists.slice(0, -1).join(", ") + " and " + artists[artists.length - 1]
    }

    const handleSubmit = () => {
        const baseline = { favGenres: listGenres }
        const currEmotContext = {
            currRant: rantSesh,
            currTracks: listOfTracks,
            desiredFeeling,
        }
        localStorage.setItem("musicBaseline", JSON.stringify(baseline))
        localStorage.setItem("currEmotContext", JSON.stringify(currEmotContext))
        clearOnboardingDraft()
        if (followAlong.walkthroughActive) {
            writeViviBakedResultsCache()
        }
        setView("results")
    }

    const isLastQuestion = currentQuestion === TOTAL_QUESTIONS - 1

    /** Recent songs (Q1) are optional; mind rant, genres, and desired feeling are required. */
    const isQuestionAnswered = (q: number): boolean => {
        switch (q) {
            case 0:
                return rantSesh.trim().length > 0
            case 1:
                return true
            case 2:
                return listGenres.length > 0
            case 3:
                return desiredFeeling !== ""
            default:
                return true
        }
    }

    const resetWaveToWelcome = () => {
        waveCyRef.current = WAVE_FLOOR_CY
        setWelcomeExiting(false)
        setWelcomeExitDestination(null)
    }

    const goAfterWelcome = (destination: "prep" | "demo") => {
        setShowWelcomeScreen(false)
        setWelcomeExiting(false)
        setWelcomeExitDestination(null)
        waveCyRef.current = WAVE_FLOOR_CY
        if (destination === "demo") {
            setShowDemoScreen(true)
            setShowPrepScreen(false)
        } else {
            setShowPrepScreen(true)
            setShowDemoScreen(false)
        }
    }

    const beginWelcomeExit = (destination: "prep" | "demo") => {
        if (welcomeExiting) return
        if (prefersReducedMotion()) {
            goAfterWelcome(destination)
            return
        }
        setWelcomeExitDestination(destination)
        setWelcomeExiting(true)
    }

    /** Welcome exit: fade copy, then reveal the next screen (wave already on the floor). */
    useEffect(() => {
        if (!welcomeExiting || !welcomeExitDestination) return

        let cancelled = false

        const run = async () => {
            await delay(WELCOME_EXIT_FADE_MS + WELCOME_EXIT_BEAT_MS)
            if (cancelled) return
            goAfterWelcome(welcomeExitDestination)
        }

        void run()

        return () => {
            cancelled = true
        }
        // Intentionally omit goAfterWelcome — destination is captured for this exit run.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [welcomeExiting, welcomeExitDestination])

    const handleSeeItInAction = () => {
        beginWelcomeExit("demo")
    }

    const resetDraft = () => {
        setListGenres([])
        setRantSesh("")
        setListOfTracks([])
        setDesiredFeeling("")
        setSearchTermTrack("")
        setCurrentQuestion(0)
    }

    const handleFollowAlong = () => {
        followAlong.startViviWalkthrough()
        setShowDemoScreen(false)
        setShowPrepScreen(true)
    }

    const handleNext = () => {
        if (showWelcomeScreen) {
            beginWelcomeExit("prep")
            return
        }

        if (showDemoScreen) {
            setShowDemoScreen(false)
            setShowPrepScreen(true)
            return
        }

        if (showPrepScreen) {
            setShowPrepScreen(false)
            return
        }

        if (!isQuestionAnswered(currentQuestion)) {
            setNextBlockedHint(QUESTION_REQUIRED_FOOTER_HINT)
            return
        }
        setNextBlockedHint(null)

        if (isLastQuestion) {
            handleSubmit()
            return
        }
        setCurrentQuestion((prev) => prev + 1)
    }

    /** Keep existing middle answers and advance (fresh check-in only). */
    const handleSkip = () => {
        setNextBlockedHint(null)
        if (isLastQuestion) {
            handleSubmit()
            return
        }
        setCurrentQuestion((prev) => prev + 1)
    }

    const handleBack = () => {
        if (showWelcomeScreen) return
        if (showDemoScreen) {
            setShowDemoScreen(false)
            setShowWelcomeScreen(true)
            resetWaveToWelcome()
            return
        }
        if (showPrepScreen) {
            setShowPrepScreen(false)
            resetDraft()
            followAlong.endViviWalkthrough()
            setShowWelcomeScreen(true)
            resetWaveToWelcome()
            return
        }
        if (currentQuestion === 0) {
            // Fresh check-in entry starts at mind; don't walk back to prep.
            if (startAtCheckInQuestions) return
            setShowPrepScreen(true)
            return
        }
        setCurrentQuestion((prev) => Math.max(prev - 1, 0))
    }

    const renderCurrentQuestion = () => {
        const followAlongLocked = followAlong.walkthroughActive

        if (currentQuestion === 0) {
            return (
                <QuestionBlock
                    kind="textarea"
                    prompt="What's been on your mind lately?"
                    value={rantSesh}
                    onChange={handleRantSession}
                    interactionLocked={followAlongLocked}
                />
            )
        }

        if (currentQuestion === 1) {
            return (
                <QuestionBlock
                    kind="search"
                    prompt="Are there any songs that you've been listening to recently?"
                    searchTerm={searchTermTrack}
                    onSearchTermChange={setSearchTermTrack}
                    placeholder="Search for a track..."
                    results={spotifyTracks
                        .filter((track) => !listOfTracks.some((picked) => picked.id === track.id))
                        .map((track) => ({
                            id: track.id,
                            label: `${track.name} by ${formatArtists(track.artists)}`,
                            onSelect: () => handleAddTrack(track),
                        }))}
                    selectedItems={listOfTracks.map((track) => ({
                        id: track.id,
                        label: track.name,
                        subtitle: formatArtists(track.artists),
                        imageUrl: track.imageUrl,
                    }))}
                    onRemoveSelectedItem={handleRemoveTrack}
                    interactionLocked={followAlongLocked}
                />
            )
        }

        if (currentQuestion === 2) {
            return (
                <QuestionBlock
                    kind="multiple-choice"
                    prompt="What are your favorite genres of music?"
                    options={genres}
                    selectedValues={listGenres}
                    onToggle={handleAddGenre}
                    interactionLocked={followAlongLocked}
                />
            )
        }

        return (
            <QuestionBlock
                kind="multiple-choice"
                prompt={DESIRED_FEELING_PROMPT}
                options={[...DESIRED_FEELING_OPTIONS]}
                selectedValues={desiredFeeling ? [desiredFeeling] : []}
                onToggle={handleSelectDesiredFeeling}
                interactionLocked={followAlongLocked}
            />
        )
    }

    const onboardingScreenKey = useMemo(() => {
        if (showWelcomeScreen) return "welcome"
        if (showDemoScreen) return "demo"
        if (showPrepScreen) return "prep"
        return `question-${currentQuestion}`
    }, [showWelcomeScreen, showDemoScreen, showPrepScreen, currentQuestion])

    const onboardingWave = useMemo((): SoundWaveProps => {
        return {
            mode: "floor",
            color: "var(--fill)",
            swell: 0.4,
            getCy: () => waveCyRef.current,
        }
    }, [])

    const isBackDisabled =
        (startAtCheckInQuestions && currentQuestion === 0 && !showWelcomeScreen && !showDemoScreen && !showPrepScreen) ||
        false

    let onboardingContent

    if (showWelcomeScreen) {
        onboardingContent = (
            <Welcome
                onGetStarted={handleNext}
                onSeeDemo={handleSeeItInAction}
                exiting={welcomeExiting}
            />
        )
    } else if (showDemoScreen) {
        onboardingContent = (
            <StoryScreen
                image={viviImage}
                imageAlt="Illustration of a character waving hello"
                onBack={handleBack}
                onContinue={handleFollowAlong}
                contentClassName={welcomeRevealClass(revealDemoImage)}
                footerClassName={welcomeRevealClass(revealDemoCta)}
            >
                This is ViVi. She is a 28 year old barista who just got off a long day of
                work. As one commonly does, she decided to relax by scrolling through
                social media, but it ended up making her feel more agitated than at ease.
                Luckily, music has always been a way for her to calm down, so she opened
                MuNu. Let’s see how it goes.
            </StoryScreen>
        )
    } else if (showPrepScreen) {
        onboardingContent = (
            <IntroScreen
                title="A few questions."
                subtitle="Tell us what you listen to and how you're feeling, so we can curate something that feels like yours."
                showDot={false}
                onBack={handleBack}
                onContinue={handleNext}
                titleClassName={cn(
                    welcomeRevealClass(revealPrepHeadline),
                    "intro-screen__title--soft",
                )}
                subtitleClassName={welcomeRevealClass(revealPrepBody)}
                footerClassName={welcomeRevealClass(revealPrepCta)}
            />
        )
    } else {
        const showSkip =
            startAtCheckInQuestions && (currentQuestion === 1 || currentQuestion === 2)

        onboardingContent = (
            <QuestionStageLayout
                currentQuestion={currentQuestion + 1}
                totalQuestions={TOTAL_QUESTIONS}
                onBack={handleBack}
                onNext={handleNext}
                onSkip={showSkip ? handleSkip : undefined}
                skipLabel="Skip"
                isBackDisabled={isBackDisabled}
                nextLabel={isLastQuestion ? "Done" : "Next"}
                nextFooterHint={nextBlockedHint}
                questionKey={`onboarding-question-${currentQuestion}`}
                contentVariant={currentQuestion === 1 ? "search-picker" : "centered"}
            >
                {renderCurrentQuestion()}
            </QuestionStageLayout>
        )
    }

    return (
        <div className={cn("munu-flow-shell", !showWelcomeScreen && "munu-flow-shell--branded munu-flow-shell--fit")}>
            {!showWelcomeScreen ? <FlowBrandHeader /> : null}
            <div className="munu-flow-shell__body">
                <ScreenTransitionHost screenKey={onboardingScreenKey} wave={onboardingWave}>
                    {onboardingContent}
                </ScreenTransitionHost>
            </div>
        </div>
    )
}

export default Onboarding
