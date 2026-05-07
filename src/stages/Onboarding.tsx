import QuestionBlock from "../components/QuestionBlock"
import QuestionStageLayout from "../components/QuestionStageLayout"
import { Button } from "../components/ui/button"
import { cn } from "../lib/utils"
import { spotifyTrackSearchDedupKey } from "../lib/trackSearchDedupe"

import { useState, useEffect, useLayoutEffect, useRef } from "react"

/** Pause before the first sentence begins to fade in. */
const WELCOME_INTRO_STILLNESS_MS = 500
/** Quiet beat after a sentence has finished fading, before the next block animates. */
const WELCOME_PAUSE_BETWEEN_MS = 700
/** After the prep headline line finishes fading, pause before the second line fades in. */
const PREP_STAGGER_LINE_PAUSE_MS = 550
/** Prep screen fades out before the questionnaire mounts (motion only). */
const PREP_SCREEN_EXIT_FADE_MS = 500
/** Opacity transition length for each sentence (keep in sync with `motion-safe:duration-[900ms]` below). */
const WELCOME_LINE_FADE_MS = 900

interface OnboardingProps {
    setView: (view: string) => void;
}

function Onboarding({setView}: OnboardingProps) {
    type ArtistOption = {
        id: string
        name: string
        imageUrl: string
    }

    type TrackOption = {
        id: string
        name: string
        artists: string[]
        imageUrl: string
    }

    // const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
    // const spotifyClientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET

    // const getSpotifyTokenRequest = async () => {
    //     const response = await fetch("/accounts/api/token", {
    //         method: "POST",
    //         headers: {
    //             'Authorization': 'Basic ' + (btoa(spotifyClientId + ':' + spotifyClientSecret)),
    //             'Content-Type': 'application/x-www-form-urlencoded'
    //         },
    //         body: new URLSearchParams({grant_type: 'client_credentials'})     
    //     })
    //     const data = await response.json()
    //     return data.access_token
    // }

    // const [spotifyToken, setSpotifyToken] = useState<string>("")

    // useEffect(() => {
    //     const fetchToken = async () => {
    //         const tokenResult = await getSpotifyTokenRequest()
    //         setSpotifyToken(tokenResult)
    //     }
    //     fetchToken()
    // }, [])

    const searchArtists = async (searchTermArtist: string) => {
        // console.log(`/spotify/v1/search?q=${searchTermArtist}&type=artist`)
        const token = localStorage.getItem('spotifyToken')
        const response = await fetch(`/api/spotify-search?q=${searchTermArtist}&type=artist&token=${token}`)
        const data = await response.json()
        return data
    }

    const [searchTermArtist, setSearchTermArtist] = useState<string>("")

    type SpotifyArtist = {
        id: string
        images: {height: number, url: string, width: number}[]
        name: string
    }

    const [spotifyArtists, setSpotifyArtists] = useState<ArtistOption[]>([])

    useEffect(() => {
        let isActive = true
        // if(!spotifyToken) return
        if(!searchTermArtist.trim()) {
            setSpotifyArtists([])
            return
        }

        const timer = setTimeout(() => {
            const fetchArtists = async () => {
                const results = await searchArtists(searchTermArtist)
                const artists: ArtistOption[] = results.artists.items.map((artist : SpotifyArtist) => ({
                    id: artist.id,
                    name: artist.name,
                    imageUrl: artist.images?.[0]?.url ?? ""
                }))
                if (isActive) {
                    setSpotifyArtists(artists)
                }
            }
            fetchArtists()
        }, 500) 

        return () => {
            isActive = false
            clearTimeout(timer)
        }
    }, [searchTermArtist])

    // console.log(spotifyArtists)


    const searchTracks = async (searchTermTrack: string) => {
        // console.log(`/spotify/v1/search?q=${searchTermTrack}&type=track&limit=10`)
        // console.log("sup")
        // const response = await fetch(`/spotify/v1/search?q=${searchTermTrack}&type=track`, {
        //     method: "GET",
        //     headers: {
        //         'Authorization': 'Bearer ' + spotifyToken
        //     }
        // })
        // // console.log(response.status)
        // const data = await response.json()
        const token = localStorage.getItem('spotifyToken')
        const response = await fetch(`/api/spotify-search?q=${searchTermTrack}&type=track&token=${token}`)
        const data = await response.json()
        return data
    }

    const [searchTermTrack, setSearchTermTrack] = useState<string>("")
    const [spotifyTracks, setSpotifyTracks] = useState<TrackOption[]>([])

    type SpotifyTrack = {
        album: {
          album_type: string
          artists: { id: string, name: string }[]
          external_urls: { spotify: string }
          href: string
          id: string
          images: {height: number, url: string, width: number}[]
        }
        artists: { id: string, name: string }[]
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
        // let isActive = true
        // if(!spotifyToken) return
        if(!searchTermTrack.trim()) {
            setSpotifyTracks([])
            return
        }

        const timer = setTimeout(() => {
            const fetchTracks = async () => {
                const results = await searchTracks(searchTermTrack)
                const uniqueTracks = results.tracks.items.filter(
                    (track: SpotifyTrack, index: number, self: SpotifyTrack[]) =>
                        index === self.findIndex((t) => spotifyTrackSearchDedupKey(t) === spotifyTrackSearchDedupKey(track))
                )
                const tracks: TrackOption[] = []
                uniqueTracks.forEach((track : SpotifyTrack) => {
                    console.log(track)
                    tracks.push({
                        id: track.id,
                        name: track.name,
                        artists: track.artists.map(artist => artist.name),
                        imageUrl: track.album.images?.[0]?.url ?? ""
                    })
                })
                setSpotifyTracks(tracks)
            }
            fetchTracks()
        }, 500)

        return () => clearTimeout(timer)
        

        // return () => {
        //     isActive = false
        // }
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
        "Dance"
    ]

    const musicContexts = [
        "Working out",
        "Commuting",
        "Working or studying",
        "Winding down",
        "Falling asleep",
        "Cooking",
        "Cleaning",
        "Socializing",
        "Processing emotions",
        "Getting ready",
        "Meditating or relaxing",
        "Driving",
        "Taking a walk"
    ]

    const [listOfArtists, setListOfArtists] = useState<ArtistOption[]>([])
    const [listOfTracks, setListOfTracks] = useState<TrackOption[]>([])
    const [listGenres, setListGenres] = useState<string[]>([])
    const [listContexts, setListContexts] = useState<string[]>([])
    const [additionalContext, setAdditionalContext] = useState<string>("")
    const [showWelcomeScreen, setShowWelcomeScreen] = useState(true)
    const [showPrepScreen, setShowPrepScreen] = useState(false)
    /** After the last taste question, before saving baseline and opening check-in. */
    const [showMusicToMoodBridgeScreen, setShowMusicToMoodBridgeScreen] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState(0)

    /** True while prep is fading out toward the questionnaire. */
    const [prepIsExitingToQuestions, setPrepIsExitingToQuestions] = useState(false)
    /** Controls opacity fade-in when entering QuestionStageLayout after prep (stays true while moving between questions). */
    const [questionStageOpacityVisible, setQuestionStageOpacityVisible] = useState(true)
    const prepExitToQuestionsTimeoutRef = useRef<number>(0)

    const [revealWelcomeFirst, setRevealWelcomeFirst] = useState(false)
    const [revealWelcomeSecond, setRevealWelcomeSecond] = useState(false)
    const [revealWelcomeCta, setRevealWelcomeCta] = useState(false)

    useEffect(() => {
        if (!showWelcomeScreen) {
            setRevealWelcomeFirst(false)
            setRevealWelcomeSecond(false)
            setRevealWelcomeCta(false)
            return
        }

        const reduced =
            typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (reduced) {
            queueMicrotask(() => {
                setRevealWelcomeFirst(true)
                setRevealWelcomeSecond(true)
                setRevealWelcomeCta(true)
            })
            return undefined
        }

        const intro = WELCOME_INTRO_STILLNESS_MS
        const fade = WELCOME_LINE_FADE_MS
        const pause = WELCOME_PAUSE_BETWEEN_MS

        const afterFirst = intro + fade + pause
        const afterSecond = afterFirst + fade + pause

        const ids: ReturnType<typeof setTimeout>[] = [
            window.setTimeout(() => setRevealWelcomeFirst(true), intro),
            window.setTimeout(() => setRevealWelcomeSecond(true), afterFirst),
            window.setTimeout(() => setRevealWelcomeCta(true), afterSecond),
        ]

        return () => {
            for (const id of ids) {
                window.clearTimeout(id)
            }
        }
    }, [showWelcomeScreen])

    const [revealPrepHeadline, setRevealPrepHeadline] = useState(false)
    const [revealPrepBody, setRevealPrepBody] = useState(false)
    const [revealPrepCta, setRevealPrepCta] = useState(false)

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

    const [revealBridgeHeadline, setRevealBridgeHeadline] = useState(false)
    const [revealBridgeBody, setRevealBridgeBody] = useState(false)
    const [revealBridgeCta, setRevealBridgeCta] = useState(false)

    useEffect(() => {
        if (!showMusicToMoodBridgeScreen) {
            setRevealBridgeHeadline(false)
            setRevealBridgeBody(false)
            setRevealBridgeCta(false)
            return
        }

        const reduced =
            typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (reduced) {
            queueMicrotask(() => {
                setRevealBridgeHeadline(true)
                setRevealBridgeBody(true)
                setRevealBridgeCta(true)
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
            window.setTimeout(() => setRevealBridgeHeadline(true), headlineAt),
            window.setTimeout(() => setRevealBridgeBody(true), bodyAt),
            window.setTimeout(() => setRevealBridgeCta(true), ctaAt),
        ]

        return () => {
            for (const id of ids) {
                window.clearTimeout(id)
            }
        }
    }, [showMusicToMoodBridgeScreen])

    useEffect(() => {
        return () => {
            if (prepExitToQuestionsTimeoutRef.current !== 0) {
                window.clearTimeout(prepExitToQuestionsTimeoutRef.current)
            }
        }
    }, [])

    useLayoutEffect(() => {
        if (showWelcomeScreen || showPrepScreen) return
        if (questionStageOpacityVisible) return

        const reduced =
            typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (reduced) {
            queueMicrotask(() => setQuestionStageOpacityVisible(true))
            return undefined
        }

        let outerRaf = 0
        let innerRaf = 0
        outerRaf = requestAnimationFrame(() => {
            innerRaf = requestAnimationFrame(() => setQuestionStageOpacityVisible(true))
        })

        return () => {
            cancelAnimationFrame(outerRaf)
            cancelAnimationFrame(innerRaf)
        }
    }, [showWelcomeScreen, showPrepScreen, questionStageOpacityVisible])

    const welcomeFadeClass = (revealed: boolean) =>
        cn(
            "text-pretty text-[0.9375rem] leading-relaxed transition-opacity ease-out motion-reduce:transition-none sm:text-base",
            revealed ? "opacity-100 motion-safe:duration-[900ms]" : "opacity-0 motion-safe:duration-0",
        )

    const handleAddArtist = (artist: ArtistOption) => {
        if (!listOfArtists.some(currArtist => currArtist.id === artist.id)){
            setListOfArtists([...listOfArtists, artist])
        }
    }

    const handleRemoveArtist = (artistId: string) => {
        setListOfArtists(listOfArtists.filter(currArtist => currArtist.id !== artistId))
    }

    const handleAddGenre = (genre: string) => {
        if (listGenres.includes(genre)){
            setListGenres(listGenres.filter(currGenre => currGenre != genre))
        }
        else{
            setListGenres([...listGenres, genre])
        }
    }

    const handleAddTrack = (track: TrackOption) => {
        if (!listOfTracks.some(currTrack => currTrack.id === track.id)){
            setListOfTracks([...listOfTracks, track])
        }
    }

    const handleRemoveTrack = (trackId: string) => {
        setListOfTracks(listOfTracks.filter(currTrack => currTrack.id !== trackId))
    }

    const handleAddContext = (context: string) => {
        if (listContexts.includes(context)){
            setListContexts(listContexts.filter(currContext => currContext != context))
        }
        else{
            setListContexts([...listContexts, context])
        }
    }

    const handleAdditionalContext = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setAdditionalContext(e.target.value)       
    }

    const formatArtists = (artists: string[]) => {
        if (artists.length === 1) return artists[0]
        return artists.slice(0, -1).join(', ') + ' and ' + artists[artists.length - 1]
    }

    // console.log(listGenres)
    // console.log(listOfArtists)
    // console.log(additionalContext)

    const handleBaseline = () => {
        const baseline = {
            favArtists: listOfArtists.map((artist) => ({
                id: artist.id,
                name: artist.name,
                imageUrl: artist.imageUrl,
            })),
            favTracks: listOfTracks.map(track => [track.name, track.artists, track.id] as [string, string[], string]),
            favGenres: listGenres,
            personalContexts: listContexts,
            addContext: additionalContext
        }
        localStorage.setItem('musicBaseline', JSON.stringify(baseline))
        setView("checkin")
    }

    const totalQuestions = 5
    const isLastQuestion = currentQuestion === totalQuestions - 1

    const handleNext = () => {
        if (showWelcomeScreen) {
            setShowWelcomeScreen(false)
            setShowPrepScreen(true)
            return
        }

        if (showPrepScreen) {
            const reduced =
                typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
            if (reduced) {
                setQuestionStageOpacityVisible(true)
                setShowPrepScreen(false)
                return
            }

            setPrepIsExitingToQuestions(true)
            prepExitToQuestionsTimeoutRef.current = window.setTimeout(() => {
                prepExitToQuestionsTimeoutRef.current = 0
                setShowPrepScreen(false)
                setPrepIsExitingToQuestions(false)
                setQuestionStageOpacityVisible(false)
            }, PREP_SCREEN_EXIT_FADE_MS)
            return
        }

        if (isLastQuestion) {
            setShowMusicToMoodBridgeScreen(true)
            return
        }
        setCurrentQuestion(prev => prev + 1)
    }

    const handleBack = () => {
        if (showWelcomeScreen) return
        if (showPrepScreen) {
            if (prepExitToQuestionsTimeoutRef.current !== 0) {
                window.clearTimeout(prepExitToQuestionsTimeoutRef.current)
                prepExitToQuestionsTimeoutRef.current = 0
            }
            setPrepIsExitingToQuestions(false)
            setShowPrepScreen(false)
            setShowWelcomeScreen(true)
            return
        }
        if (showMusicToMoodBridgeScreen) {
            setShowMusicToMoodBridgeScreen(false)
            return
        }
        if (currentQuestion === 0) {
            setQuestionStageOpacityVisible(true)
            setShowPrepScreen(true)
            return
        }
        setCurrentQuestion(prev => Math.max(prev - 1, 0))
    }

    const renderCurrentQuestion = () => {
        if (currentQuestion === 0) {
            return (
                <QuestionBlock
                    kind="multiple-choice"
                    prompt="What are your favorite genres of music?"
                    options={genres}
                    selectedValues={listGenres}
                    onToggle={handleAddGenre}
                />
            )
        }

        if (currentQuestion === 1) {
            return (
                <QuestionBlock
                    kind="search"
                    prompt="Who are your favorite artists?"
                    searchTerm={searchTermArtist}
                    onSearchTermChange={setSearchTermArtist}
                    placeholder="Search for an artist..."
                    results={spotifyArtists.map((artist) => ({
                        id: artist.id,
                        label: artist.name,
                        onSelect: () => handleAddArtist(artist)
                    }))}
                    selectedItems={listOfArtists.map((artist) => ({
                        id: artist.id,
                        label: artist.name,
                        imageUrl: artist.imageUrl
                    }))}
                    onRemoveSelectedItem={handleRemoveArtist}
                />
            )
        }

        if (currentQuestion === 2) {
            return (
                <QuestionBlock
                    kind="search"
                    prompt="Can you give us a few examples of your favorite songs?"
                    searchTerm={searchTermTrack}
                    onSearchTermChange={setSearchTermTrack}
                    placeholder="Search for a track..."
                    results={spotifyTracks
                        .filter((track) => !listOfTracks.some((picked) => picked.id === track.id))
                        .map((track) => ({
                        id: track.id,
                        label: `${track.name} by ${formatArtists(track.artists)}`,
                        onSelect: () => handleAddTrack(track)
                    }))}
                    selectedItems={listOfTracks.map((track) => ({
                        id: track.id,
                        label: track.name,
                        subtitle: formatArtists(track.artists),
                        imageUrl: track.imageUrl
                    }))}
                    onRemoveSelectedItem={handleRemoveTrack}
                />
            )
        }

        if (currentQuestion === 3) {
            return (
                <QuestionBlock
                    kind="multiple-choice"
                    prompt="When do you listen to music the most?"
                    options={musicContexts}
                    selectedValues={listContexts}
                    onToggle={handleAddContext}
                />
            )
        }

        return (
            <QuestionBlock
                kind="textarea"
                prompt="Is there anything else about your relationship with music you'd want us to know?"
                value={additionalContext}
                onChange={handleAdditionalContext}
            />
        )
    }

    // useEffect(() => {
    //     const baseline = {
    //         favArtists: listOfArtists,
    //         favTracks: listOfTracks,
    //         favGenres: listGenres,
    //         personalContexts: listContexts,
    //         addContext: additionalContext
    //     }
    //     localStorage.setItem('musicBaseline', JSON.stringify(baseline))
    // }, [listOfArtists, listOfTracks, listGenres, listContexts, additionalContext])

    if (showWelcomeScreen) {
        return (
            <div className="flex min-h-svh items-center justify-center px-6 py-10">
                <div className="w-full max-w-3xl">
                    <div key="onboarding-welcome" className="text-center">
                        <div
                            className="mx-auto flex w-full max-w-prose flex-col gap-y-16 text-center sm:gap-y-24"
                            aria-live="polite"
                        >
                            <div className={welcomeFadeClass(revealWelcomeFirst)}>
                                <div className="flex flex-col gap-y-2">
                                    <div>Hi there! Welcome to Musical Nutrients, an app that guides you</div>
                                    <div>through your feelings with music that feels like yours.</div>
                                </div>
                            </div>
                            <div className={welcomeFadeClass(revealWelcomeSecond)}>
                                <div className="flex flex-col gap-y-2">
                                    <div>We’ll get to know your music taste, ask how you’re feeling today,</div>
                                    <div>and put together a playlist that helps you find your way through.</div>
                                </div>
                            </div>
                        </div>
                        <div
                            className={cn(
                                "mt-10 sm:mt-12",
                                "transition-opacity ease-out motion-reduce:transition-none",
                                revealWelcomeCta
                                    ? "opacity-100 motion-safe:duration-[900ms]"
                                    : "pointer-events-none opacity-0 motion-safe:duration-0",
                            )}
                        >
                            <Button type="button" onClick={handleNext}>
                                Get Started
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (showPrepScreen) {
        return (
            <div
                className={cn(
                    "flex min-h-svh items-center justify-center px-6 py-10",
                    "transition-opacity ease-out motion-reduce:transition-none",
                    // Keep in sync with PREP_SCREEN_EXIT_FADE_MS.
                    "motion-safe:duration-500",
                    prepIsExitingToQuestions &&
                        "pointer-events-none opacity-0 motion-reduce:pointer-events-auto motion-reduce:opacity-100",
                )}
            >
                <div className="w-full max-w-3xl">
                    <div key="onboarding-prep" className="min-h-[520px] space-y-4">
                        <div className="flex justify-end">
                            <p className="invisible text-sm text-muted-foreground select-none" aria-hidden>
                                Question 1 of {totalQuestions}
                            </p>
                        </div>
                        <div className="flex min-h-[420px] items-center justify-center">
                            <div
                                className="mx-auto w-full max-w-prose text-center"
                                aria-live="polite"
                            >
                                <div className="flex flex-col gap-y-16 sm:gap-y-24">
                                    <div className="flex flex-col gap-y-2">
                                        <p className={cn("m-0", welcomeFadeClass(revealPrepHeadline))}>
                                            First, the music.
                                        </p>
                                        <p className={cn("m-0", welcomeFadeClass(revealPrepBody))}>
                                            Tell us a bit about what you listen to, so we can curate something that feels like yours.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        className={cn(
                            "mt-6 flex items-center justify-between",
                            "transition-opacity ease-out motion-reduce:transition-none",
                            revealPrepCta
                                ? "opacity-100 motion-safe:duration-[900ms]"
                                : "pointer-events-none opacity-0 motion-safe:duration-0",
                        )}
                    >
                        <Button type="button" variant="outline" onClick={handleBack}>
                            Back
                        </Button>
                        <Button type="button" onClick={handleNext}>
                            Continue
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (showMusicToMoodBridgeScreen) {
        return (
            <div className="flex min-h-svh items-center justify-center px-6 py-10">
                <div className="w-full max-w-3xl">
                    <div key="onboarding-bridge" className="min-h-[520px] space-y-4">
                        <div className="flex justify-end">
                            <p className="invisible text-sm text-muted-foreground select-none" aria-hidden>
                                Question {totalQuestions} of {totalQuestions}
                            </p>
                        </div>
                        <div className="flex min-h-[420px] items-center justify-center">
                            <div
                                className="mx-auto w-full max-w-prose text-center"
                                aria-live="polite"
                            >
                                <div className="flex flex-col gap-y-16 sm:gap-y-24">
                                    <div className="flex flex-col gap-y-2">
                                        <p className={cn("m-0", welcomeFadeClass(revealBridgeHeadline))}>
                                            Now, let's check in with you.
                                        </p>
                                        <p className={cn("m-0", welcomeFadeClass(revealBridgeBody))}>
                                            A few questions about how you're feeling right now, so we can meet you there.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        className={cn(
                            "mt-6 flex items-center justify-between",
                            "transition-opacity ease-out motion-reduce:transition-none",
                            revealBridgeCta
                                ? "opacity-100 motion-safe:duration-[900ms]"
                                : "pointer-events-none opacity-0 motion-safe:duration-0",
                        )}
                    >
                        <Button type="button" variant="outline" onClick={handleBack}>
                            Back
                        </Button>
                        <Button type="button" onClick={handleBaseline}>
                            Continue
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "transition-opacity ease-out motion-reduce:transition-none",
                // Question-stage fade-in duration (milliseconds; tune both here if you change timing).
                "motion-safe:duration-[700ms]",
                questionStageOpacityVisible ? "opacity-100" : "opacity-0 motion-reduce:opacity-100",
            )}
        >
            <QuestionStageLayout
                currentQuestion={currentQuestion + 1}
                totalQuestions={totalQuestions}
                onBack={handleBack}
                onNext={handleNext}
                isBackDisabled={false}
                nextLabel={isLastQuestion ? "Done" : "Next"}
                questionKey={`onboarding-question-${currentQuestion}`}
            >
                {renderCurrentQuestion()}
            </QuestionStageLayout>
        </div>
    )
}

export default Onboarding