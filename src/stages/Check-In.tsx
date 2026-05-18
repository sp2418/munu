import QuestionBlock from "../components/QuestionBlock"
import QuestionStageLayout, {
  QUESTION_HINT_AUTO_HIDE_MS,
  QUESTION_REQUIRED_FOOTER_HINT,
} from "../components/QuestionStageLayout"
import { spotifyTrackSearchDedupKey } from "../lib/trackSearchDedupe"
import type { CurrEmotContext } from "../lib/reccobeatsEnrich"

import { useFollowAlongPersona } from "../context/FollowAlongPersonaContext"
import {
    readCheckInScreenProgress,
    writeAppProgress,
    writeCheckInScreenProgress,
} from "../lib/appProgressStorage"
import {
    clearCheckInDraft,
    readCheckInDraftOrStorage,
    writeCheckInDraft,
} from "../lib/checkInDraftStorage"
import { writeViviBakedResultsCache } from "../lib/resultsCache"
import { getViviDraftCheckIn } from "../lib/viviWalkthroughStorage"

import { useState, useEffect } from "react"

type CheckInTrackHydration = { id: string; name: string; artists: string[]; imageUrl: string }

function checkInTracksFromPersisted(rows: CurrEmotContext["currTracks"] | undefined): CheckInTrackHydration[] {
    const out: CheckInTrackHydration[] = []
    const list = Array.isArray(rows) ? rows : []
    for (const t of list) {
        if (Array.isArray(t)) {
            const row = t as unknown[]
            const name = row[0]
            const artists = row[1]
            if (typeof name !== "string" || !Array.isArray(artists)) continue
            const id = typeof row[2] === "string" && row[2] ? row[2] : `anon:${name}`
            const maybeMeta = row[3]
            const imageUrl =
                typeof maybeMeta === "object" &&
                maybeMeta !== null &&
                "imageUrl" in maybeMeta &&
                typeof (maybeMeta as { imageUrl?: string }).imageUrl === "string"
                    ? (maybeMeta as { imageUrl: string }).imageUrl
                    : ""
            out.push({ id, name, artists: artists as string[], imageUrl })
        } else if (t && typeof t === "object" && "id" in t && typeof t.id === "string") {
            out.push({
                id: t.id,
                name: typeof t.name === "string" ? t.name : "",
                artists: Array.isArray(t.artists) ? t.artists.map(String) : [],
                imageUrl: typeof t.imageUrl === "string" ? t.imageUrl : "",
            })
        }
    }
    return out
}

interface CheckInProps {
    setView: (view: string) => void;
}

function CheckIn({setView}: CheckInProps) {
    const followAlong = useFollowAlongPersona()
    const [rantSesh, setRantSesh] = useState<string>("")
    const [listEmotions, setListEmotions] = useState<string[]>([])
    const [currentQuestion, setCurrentQuestion] = useState(
        () => readCheckInScreenProgress()?.currentQuestion ?? 0,
    )
    const [nextBlockedHint, setNextBlockedHint] = useState<string | null>(null)

    const handleRantSession = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRantSesh(e.target.value)
    }

    const emotions = [
        "Anxious",
        "Sad",
        "Overwhelmed",
        "Numb",
        "Angry",
        "Lonely",
        "Stressed",
        "Hopeful",
        "Grateful",
        "Content",
        "Energized",
        "Excited",
        "Calm",
        "Confused",
        "Frustrated",
        "Melancholic",
        "Restless",
        "Disconnected",
        "Motivated",
        "Drained"
    ]

    const handleAddEmotion = (emotion: string) => {
        if (!listEmotions.includes(emotion)) {
            setListEmotions([...listEmotions, emotion])
        }
        else{
            setListEmotions(listEmotions.filter((currEmot: string) => currEmot !== emotion))
        }
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

    type CheckInTrack = {
        id: string
        name: string
        artists: string[]
        imageUrl: string
    }

    const [searchTermTrack, setSearchTermTrack] = useState<string>("")
    const [spotifyTracks, setSpotifyTracks] = useState<CheckInTrack[]>([])
    const [listOfTracks, setListOfTracks] = useState<CheckInTrack[]>([])

    type SpotifyTrack = {
        album: {
          album_type: string
          artists: { id: string, name: string }[]
          external_urls: { spotify: string }
          href: string
          id: string
          images: { height: number; url: string; width: number }[]
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
        if(!searchTermTrack.trim()) {
            setSpotifyTracks([])
            return
        }
        const fetchTracks = async () => {
            const results = await searchTracks(searchTermTrack)
            const uniqueTracks = results.tracks.items.filter(
                (track: SpotifyTrack, index: number, self: SpotifyTrack[]) =>
                    index === self.findIndex((t) => spotifyTrackSearchDedupKey(t) === spotifyTrackSearchDedupKey(track))
            )
            const tracks: CheckInTrack[] = uniqueTracks.map((track: SpotifyTrack) => ({
                id: track.id,
                name: track.name,
                artists: track.artists.map((artist) => artist.name),
                imageUrl: track.album.images?.[0]?.url ?? "",
            }))
            // console.log('list of tracks', tracks)
            setSpotifyTracks(tracks)
            // // console.log("hi", artistNames)
            // // artistObj.map((artist<SpotifyArtist>) => currArr.append(artist.name))
            // // console.log("hi", results.artists.items)
            // if (isActive) {
            //     setSpotifyArtists(tracks)
            // }
        }
        fetchTracks()

        // return () => {
        //     isActive = false
        // }
    }, [searchTermTrack])

    useEffect(() => {
        setNextBlockedHint(null)
    }, [currentQuestion])

    useEffect(() => {
        writeAppProgress({ view: "checkin" })
    }, [])

    useEffect(() => {
        writeCheckInScreenProgress({ currentQuestion })
    }, [currentQuestion])

    useEffect(() => {
        if (!nextBlockedHint) return
        const id = window.setTimeout(() => setNextBlockedHint(null), QUESTION_HINT_AUTO_HIDE_MS)
        return () => window.clearTimeout(id)
    }, [nextBlockedHint])

    useEffect(() => {
        if (followAlong.walkthroughActive) {
            const ci = getViviDraftCheckIn()
            setRantSesh(ci.currRant)
            setListEmotions([...ci.emotions])
            setListOfTracks(checkInTracksFromPersisted(ci.currTracks))
            return
        }

        const draft = readCheckInDraftOrStorage()
        if (!draft) return
        setRantSesh(draft.currRant)
        setListEmotions([...draft.emotions])
        setListOfTracks(draft.currTracks)
    }, [followAlong.walkthroughActive])

    useEffect(() => {
        if (followAlong.walkthroughActive) return
        const timer = window.setTimeout(() => {
            writeCheckInDraft({
                currRant: rantSesh,
                emotions: listEmotions,
                currTracks: listOfTracks,
            })
        }, 400)
        return () => window.clearTimeout(timer)
    }, [followAlong.walkthroughActive, rantSesh, listEmotions, listOfTracks])

    const handleAddTrack = (track: CheckInTrack) => {
        if (!listOfTracks.some((t) => t.id === track.id)) {
            setListOfTracks([...listOfTracks, track])
        }
    }

    const handleRemoveTrack = (trackId: string) => {
        setListOfTracks((prev) => prev.filter((t) => t.id !== trackId))
    }

    const formatArtists = (artists: string[]) => {
        if (artists.length === 1) return artists[0]
        return artists.slice(0, -1).join(', ') + ' and ' + artists[artists.length - 1]
    }

    const handleSesh = () => {
        const currEmotContext = {
            emotions: listEmotions,
            currTracks: listOfTracks,
            currRant: rantSesh
        }
        localStorage.setItem('currEmotContext', JSON.stringify(currEmotContext))
        clearCheckInDraft()
        if (followAlong.walkthroughActive) {
            writeViviBakedResultsCache()
        }
        setView("results")
    }

    const totalQuestions = 3
    const isLastQuestion = currentQuestion === totalQuestions - 1

    /** Songs question may be left empty; rant and emotions are required. */
    const isCheckInQuestionAnswered = (q: number): boolean => {
        switch (q) {
            case 0:
                return rantSesh.trim().length > 0
            case 1:
                return listEmotions.length > 0
            case 2:
                return true
            default:
                return true
        }
    }

    const handleNext = () => {
        if (!isCheckInQuestionAnswered(currentQuestion)) {
            setNextBlockedHint(QUESTION_REQUIRED_FOOTER_HINT)
            return
        }
        setNextBlockedHint(null)
        if (isLastQuestion) {
            handleSesh()
            return
        }
        setCurrentQuestion(prev => prev + 1)
    }

    const handleBack = () => {
        setCurrentQuestion(prev => Math.max(prev - 1, 0))
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
                    kind="multiple-choice"
                    prompt="What emotions are you feeling at the moment?"
                    options={emotions}
                    selectedValues={listEmotions}
                    onToggle={handleAddEmotion}
                    interactionLocked={followAlongLocked}
                />
            )
        }

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
                    onSelect: () => handleAddTrack(track)
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

    // useEffect(() => {
    //     const currEmotContext = {
    //         emotions: listEmotions,
    //         currTracks: listOfTracks,
    //         currRant: rantSesh
    //     }
    //     localStorage.setItem('currEmotContext', JSON.stringify(currEmotContext))
    // }, [listEmotions, listOfTracks, rantSesh])

  
    return (
      <QuestionStageLayout
        currentQuestion={currentQuestion + 1}
        totalQuestions={totalQuestions}
        onBack={handleBack}
        onNext={handleNext}
        isBackDisabled={currentQuestion === 0}
        nextLabel={isLastQuestion ? "Done" : "Next"}
        nextFooterHint={nextBlockedHint}
        questionKey={`checkin-question-${currentQuestion}`}
      >
        {renderCurrentQuestion()}
      </QuestionStageLayout>
    )
  }

  export default CheckIn