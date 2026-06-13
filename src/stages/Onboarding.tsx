import IntroScreen from "../components/IntroScreen"
import StoryScreen from "../components/StoryScreen"
import Welcome from "./Welcome"
import QuestionBlock from "../components/QuestionBlock"
import QuestionStageLayout, {
    QUESTION_HINT_AUTO_HIDE_MS,
    QUESTION_REQUIRED_FOOTER_HINT,
} from "../components/QuestionStageLayout"
import { cn } from "../lib/utils"
import { spotifyTrackSearchDedupKey } from "../lib/trackSearchDedupe"
import { getSpotifyAccessToken } from "../lib/spotifyToken"

import type { MusicBaseline } from "../lib/reccobeatsEnrich"

import viviImage from "../assets/vivi.jpg"
import { useFollowAlongPersona } from "../context/FollowAlongPersonaContext"
import {
    readOnboardingScreenProgress,
    writeAppProgress,
    writeOnboardingScreenProgress,
} from "../lib/appProgressStorage"
import {
    clearOnboardingDraft,
    readOnboardingDraftOrBaseline,
    writeOnboardingDraft,
} from "../lib/onboardingDraftStorage"
import { getViviDraftBaseline, isViviWalkthroughActive } from "../lib/viviWalkthroughStorage"

import { useState, useEffect, useLayoutEffect, useMemo } from "react"

import ScreenTransitionHost from "../components/ScreenTransitionHost"
import type { SoundWaveProps } from "../components/SoundWave"

function initialOnboardingScreens(startAtMusicProfileQuestions: boolean) {
    const noSavedProfile =
        typeof localStorage !== "undefined" && !localStorage.getItem("musicBaseline")
    if (noSavedProfile && !isViviWalkthroughActive() && !startAtMusicProfileQuestions) {
        return {
            showWelcomeScreen: true,
            showDemoScreen: false,
            showPrepScreen: false,
            showMusicToMoodBridgeScreen: false,
            currentQuestion: 0,
        }
    }

    const saved = readOnboardingScreenProgress()
    if (startAtMusicProfileQuestions) {
        return {
            showWelcomeScreen: false,
            showDemoScreen: false,
            showPrepScreen: false,
            showMusicToMoodBridgeScreen: false,
            currentQuestion: saved?.currentQuestion ?? 0,
        }
    }
    if (saved) {
        return {
            showWelcomeScreen: saved.showWelcomeScreen,
            showDemoScreen: saved.showDemoScreen,
            showPrepScreen: saved.showPrepScreen,
            showMusicToMoodBridgeScreen: saved.showMusicToMoodBridgeScreen,
            currentQuestion: saved.currentQuestion,
        }
    }
    return {
        showWelcomeScreen: true,
        showDemoScreen: false,
        showPrepScreen: false,
        showMusicToMoodBridgeScreen: false,
        currentQuestion: 0,
    }
}

type StoredArtistHydration = { id: string; name: string; imageUrl: string }
type StoredTrackHydration = { id: string; name: string; artists: string[]; imageUrl: string }

function artistsFromBaselineStored(favArtists: MusicBaseline["favArtists"]): StoredArtistHydration[] {
    const out: StoredArtistHydration[] = []
    for (let i = 0; i < favArtists.length; i++) {
        const a = favArtists[i]
        if (typeof a === "string") {
            const name = a.trim()
            if (!name) continue
            out.push({ id: `legacy-artist:${i}:${name}`, name, imageUrl: "" })
        } else if (a && typeof a === "object" && "name" in a && typeof a.name === "string") {
            const id =
                "id" in a && typeof (a as { id?: string }).id === "string" && (a as { id: string }).id
                    ? (a as { id: string }).id
                    : `legacy-artist:${i}:${a.name}`
            const imageUrl =
                "imageUrl" in a && typeof (a as { imageUrl?: string }).imageUrl === "string"
                    ? (a as { imageUrl: string }).imageUrl
                    : ""
            out.push({ id, name: a.name, imageUrl })
        }
    }
    return out
}

function tracksFromBaselineStored(favTracks: MusicBaseline["favTracks"]): StoredTrackHydration[] {
    const out: StoredTrackHydration[] = []
    const rows = Array.isArray(favTracks) ? favTracks : []
    for (const row of rows) {
        if (!Array.isArray(row) || row.length < 3) continue
        const name = row[0]
        const artists = row[1]
        const id = row[2]
        if (typeof name !== "string" || !Array.isArray(artists) || typeof id !== "string") continue
        let imageUrl = ""
        if (row.length >= 4 && typeof row[3] === "string" && row[3].length > 0) {
            imageUrl = row[3]
        }
        out.push({
            id,
            name,
            artists: artists as string[],
            imageUrl,
        })
    }
    return out
}

/** Pause before the first sentence begins to fade in. */
const WELCOME_INTRO_STILLNESS_MS = 500
/** Quiet beat after a sentence has finished fading, before the next block animates. */
const WELCOME_PAUSE_BETWEEN_MS = 700
/** After the prep headline line finishes fading, pause before the second line fades in. */
const PREP_STAGGER_LINE_PAUSE_MS = 550
/** Opacity transition length for each sentence (keep in sync with `motion-safe:duration-[900ms]` below). */
const WELCOME_LINE_FADE_MS = 900

interface OnboardingProps {
    setView: (view: string) => void
    /** Opens the questionnaire at question 1 (favorite genres); skips welcome and prep screens. */
    startAtMusicProfileQuestions?: boolean
}

function Onboarding({ setView, startAtMusicProfileQuestions = false }: OnboardingProps) {
    const followAlong = useFollowAlongPersona()
    const initialScreens = initialOnboardingScreens(startAtMusicProfileQuestions)
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
        const token = await getSpotifyAccessToken()
        if (!token) return {}
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
                const artists: ArtistOption[] = (results.artists?.items ?? []).map((artist : SpotifyArtist) => ({
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
                const uniqueTracks = (results.tracks?.items ?? []).filter(
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
    const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => initialScreens.showWelcomeScreen)
    const [showDemoScreen, setShowDemoScreen] = useState(() => initialScreens.showDemoScreen)
    const [showPrepScreen, setShowPrepScreen] = useState(() => initialScreens.showPrepScreen)
    /** After the last taste question, before saving baseline and opening check-in. */
    const [showMusicToMoodBridgeScreen, setShowMusicToMoodBridgeScreen] = useState(
        () => initialScreens.showMusicToMoodBridgeScreen,
    )
    const [currentQuestion, setCurrentQuestion] = useState(() => initialScreens.currentQuestion)
    const [nextBlockedHint, setNextBlockedHint] = useState<string | null>(null)

    useLayoutEffect(() => {
        if (followAlong.walkthroughActive) {
            const baseline = getViviDraftBaseline()
            setListGenres([...baseline.favGenres])
            setListContexts([...baseline.personalContexts])
            setAdditionalContext(baseline.addContext)
            setListOfArtists(artistsFromBaselineStored(baseline.favArtists ?? []) as ArtistOption[])
            setListOfTracks(tracksFromBaselineStored(baseline.favTracks ?? []) as TrackOption[])
            return
        }

        const draft = readOnboardingDraftOrBaseline()
        if (!draft) return
        setListGenres([...draft.listGenres])
        setListContexts([...draft.listContexts])
        setAdditionalContext(draft.additionalContext)
        setListOfArtists(draft.listOfArtists as ArtistOption[])
        setListOfTracks(draft.listOfTracks as TrackOption[])
    }, [followAlong.walkthroughActive])

    useEffect(() => {
        writeAppProgress({ view: "onboarding" })
    }, [])

    useEffect(() => {
        if (followAlong.walkthroughActive) return
        writeOnboardingScreenProgress({
            showWelcomeScreen,
            showDemoScreen,
            showPrepScreen,
            showMusicToMoodBridgeScreen,
            currentQuestion,
        })
    }, [
        followAlong.walkthroughActive,
        showWelcomeScreen,
        showDemoScreen,
        showPrepScreen,
        showMusicToMoodBridgeScreen,
        currentQuestion,
    ])

    useEffect(() => {
        if (followAlong.walkthroughActive) return
        const timer = window.setTimeout(() => {
            writeOnboardingDraft({
                listGenres,
                listContexts,
                additionalContext,
                listOfArtists,
                listOfTracks,
            })
        }, 400)
        return () => window.clearTimeout(timer)
    }, [
        followAlong.walkthroughActive,
        listGenres,
        listContexts,
        additionalContext,
        listOfArtists,
        listOfTracks,
    ])

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

    const welcomeRevealClass = (revealed: boolean) =>
        cn(
            "transition-opacity ease-out motion-reduce:transition-none",
            revealed
                ? "opacity-100 motion-safe:duration-[900ms]"
                : "pointer-events-none opacity-0 motion-safe:duration-0",
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
            favTracks: listOfTracks.map((track) => {
                const row: unknown[] = [track.name, track.artists, track.id]
                if (track.imageUrl) row.push(track.imageUrl)
                return row
            }),
            favGenres: listGenres,
            personalContexts: listContexts,
            addContext: additionalContext
        }
        localStorage.setItem('musicBaseline', JSON.stringify(baseline))
        clearOnboardingDraft()
        setView("checkin")
    }

    const totalQuestions = 5
    const isLastQuestion = currentQuestion === totalQuestions - 1

    /** Question index 4 is optional ("anything else"); others require at least one answer. */
    const isMusicProfileQuestionAnswered = (q: number): boolean => {
        switch (q) {
            case 0:
                return listGenres.length > 0
            case 1:
                return listOfArtists.length > 0
            case 2:
                return listOfTracks.length > 0
            case 3:
                return listContexts.length > 0
            case 4:
                return true
            default:
                return true
        }
    }

    const handleSeeItInAction = () => {
        setShowWelcomeScreen(false)
        setShowDemoScreen(true)
    }

    const resetMusicalProfileDraft = () => {
        setListGenres([])
        setListContexts([])
        setAdditionalContext("")
        setListOfArtists([])
        setListOfTracks([])
        setSearchTermArtist("")
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
            setShowWelcomeScreen(false)
            setShowPrepScreen(true)
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

        if (!isMusicProfileQuestionAnswered(currentQuestion)) {
            setNextBlockedHint(QUESTION_REQUIRED_FOOTER_HINT)
            return
        }
        setNextBlockedHint(null)

        if (isLastQuestion) {
            setShowMusicToMoodBridgeScreen(true)
            return
        }
        setCurrentQuestion(prev => prev + 1)
    }

    const handleBack = () => {
        if (showWelcomeScreen) return
        if (showDemoScreen) {
            setShowDemoScreen(false)
            setShowWelcomeScreen(true)
            return
        }
        if (showPrepScreen) {
            setShowPrepScreen(false)
            resetMusicalProfileDraft()
            followAlong.endViviWalkthrough()
            setShowWelcomeScreen(true)
            return
        }
        if (showMusicToMoodBridgeScreen) {
            setShowMusicToMoodBridgeScreen(false)
            return
        }
        if (currentQuestion === 0) {
            setShowPrepScreen(true)
            return
        }
        setCurrentQuestion(prev => Math.max(prev - 1, 0))
    }

    const renderCurrentQuestion = () => {
        const followAlongLocked = followAlong.walkthroughActive

        if (currentQuestion === 0) {
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
                    interactionLocked={followAlongLocked}
                />
            )
        }

        if (currentQuestion === 2) {
            return (
                <QuestionBlock
                    kind="search"
                    prompt="What are your most favorite songs of all time?"
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
                    interactionLocked={followAlongLocked}
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
                    interactionLocked={followAlongLocked}
                />
            )
        }

        return (
            <QuestionBlock
                kind="textarea"
                prompt="Is there anything else about your relationship with music you'd want us to know?"
                value={additionalContext}
                onChange={handleAdditionalContext}
                interactionLocked={followAlongLocked}
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

    const onboardingScreenKey = useMemo(() => {
        if (showWelcomeScreen) return "welcome"
        if (showDemoScreen) return "demo"
        if (showPrepScreen) return "prep"
        if (showMusicToMoodBridgeScreen) return "bridge"
        return `question-${currentQuestion}`
    }, [
        showWelcomeScreen,
        showDemoScreen,
        showPrepScreen,
        showMusicToMoodBridgeScreen,
        currentQuestion,
    ])

    const onboardingWave = useMemo((): SoundWaveProps => {
        const isWelcome = onboardingScreenKey === "welcome"
        return {
            mode: isWelcome ? "center" : "floor",
            color: "var(--fill)",
            swell: 0.4,
            className: isWelcome ? "welcome-sound-wave" : undefined,
        }
    }, [onboardingScreenKey])

    let onboardingContent

    if (showWelcomeScreen) {
        onboardingContent = (
            <Welcome onGetStarted={handleNext} onSeeDemo={handleSeeItInAction} />
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
                title="First, the music."
                subtitle="Tell us a bit about what you listen to, so we can curate something that feels like yours."
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
    } else if (showMusicToMoodBridgeScreen) {
        onboardingContent = (
            <IntroScreen
                title="Now, let's check in with you."
                subtitle="A few questions about how you're feeling right now, so we can meet you there."
                showDot={false}
                onBack={handleBack}
                onContinue={handleBaseline}
                titleClassName={cn(
                    welcomeRevealClass(revealBridgeHeadline),
                    "intro-screen__title--soft",
                )}
                subtitleClassName={welcomeRevealClass(revealBridgeBody)}
                footerClassName={welcomeRevealClass(revealBridgeCta)}
            />
        )
    } else {
        onboardingContent = (
            <QuestionStageLayout
                currentQuestion={currentQuestion + 1}
                totalQuestions={totalQuestions}
                onBack={handleBack}
                onNext={handleNext}
                isBackDisabled={false}
                nextLabel={isLastQuestion ? "Done" : "Next"}
                nextFooterHint={nextBlockedHint}
                questionKey={`onboarding-question-${currentQuestion}`}
                contentVariant={
                    currentQuestion === 1 || currentQuestion === 2
                        ? "search-picker"
                        : "centered"
                }
            >
                {renderCurrentQuestion()}
            </QuestionStageLayout>
        )
    }

    return (
        <ScreenTransitionHost screenKey={onboardingScreenKey} wave={onboardingWave}>
            {onboardingContent}
        </ScreenTransitionHost>
    )
}

export default Onboarding