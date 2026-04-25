import QuestionBlock from "../components/QuestionBlock"
import QuestionStageLayout from "../components/QuestionStageLayout"
import { spotifyTrackSearchDedupKey } from "../lib/trackSearchDedupe"

import { useState, useEffect } from "react"

interface CheckInProps {
    setView: (view: string) => void;
}

function CheckIn({setView}: CheckInProps) {
    const [rantSesh, setRantSesh] = useState<string>("")
    const [listEmotions, setListEmotions] = useState<string[]>([])
    const [currentQuestion, setCurrentQuestion] = useState(0)

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

    const [listOfTracks, setListOfTracks] = useState<CheckInTrack[]>([])

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
        setView("results")
    }

    const totalQuestions = 3
    const isLastQuestion = currentQuestion === totalQuestions - 1

    const handleNext = () => {
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
        if (currentQuestion === 0) {
            return (
                <QuestionBlock
                    kind="textarea"
                    prompt="What's been on your mind lately?"
                    value={rantSesh}
                    onChange={handleRantSession}
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
        questionKey={`checkin-question-${currentQuestion}`}
      >
        {renderCurrentQuestion()}
      </QuestionStageLayout>
    )
  }

  export default CheckIn