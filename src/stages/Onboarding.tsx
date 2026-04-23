import QuestionBlock from "../components/QuestionBlock"
import QuestionStageLayout from "../components/QuestionStageLayout"
import { Button } from "../components/ui/button"

import { useState, useEffect } from "react"

interface OnboardingProps {
    setView: (view: string) => void;
}

function Onboarding({setView}: OnboardingProps) {
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
        const response = await fetch(`/api/spotify-search?q=${searchTermArtist}&type=artist`)
        const data = await response.json()
        return data
    }

    const [searchTermArtist, setSearchTermArtist] = useState<string>("")

    type SpotifyArtist = {
        external_urls: { spotify : string}
        href: string
        id: string
        images: {height: number, url: string, width: number}
        name: string
        type: string
        uri: string
    }

    const [spotifyArtists, setSpotifyArtists] = useState<[string, {height: number, url: string, width: number}][]>([])

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
                const artists = results.artists.items.map((artist : SpotifyArtist) => [artist.name, artist.images])
                // console.log("hi", artistNames)
                // artistObj.map((artist<SpotifyArtist>) => currArr.append(artist.name))
                // console.log("hi", results.artists.items)
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
        const response = await fetch(`/api/spotify-search?q=${searchTermTrack}&type=track`)
        const data = await response.json()
        return data
    }

    const [searchTermTrack, setSearchTermTrack] = useState<string>("")
    const [spotifyTracks, setSpotifyTracks] = useState<[string, string[]][]>([])

    type SpotifyTrack = {
        album: {
          album_type: string
          artists: { id: string, name: string }[]
          external_urls: { spotify: string }
          href: string
          id: string
        }
        artists: { id: string, name: string }[]
        disc_number: number
        duration_ms: number
        explicit: boolean
        external_ids: { isrc: string }
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
                const uniqueTracks = await results.tracks.items.filter(
                    (track: SpotifyTrack, index: number, self: SpotifyTrack[]) => 
                        index === self.findIndex(t => t.external_ids.isrc === track.external_ids.isrc)
                )
                const tracks: [string, string[]][] = []
                console.log("yo", uniqueTracks)
                uniqueTracks.forEach((track : SpotifyTrack) => {
                    const trackName = track.name
                    // console.log("name", trackName)
                    const trackArtists: string[] = []
                    track.artists.forEach(artist => trackArtists.push(artist.name))
                    // console.log('artists', trackArtists)
                    tracks.push([trackName, trackArtists])
                })
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

    const [listOfArtists, setListOfArtists] = useState<string[]>([])
    const [listOfTracks, setListOfTracks] = useState<[string, string[]][]>([])
    const [listGenres, setListGenres] = useState<string[]>([])
    const [listContexts, setListContexts] = useState<string[]>([])
    const [additionalContext, setAdditionalContext] = useState<string>("")
    const [showWelcomeScreen, setShowWelcomeScreen] = useState(true)
    const [currentQuestion, setCurrentQuestion] = useState(0)

    const handleAddArtist = (artist: string) => {
        if (!listOfArtists.includes(artist)){
            setListOfArtists([...listOfArtists, artist])
        }
    }

    const handleRemoveArtist = (artist: string) => {
        setListOfArtists(listOfArtists.filter(currArtist => currArtist != artist))
    }

    const handleAddGenre = (genre: string) => {
        if (listGenres.includes(genre)){
            setListGenres(listGenres.filter(currGenre => currGenre != genre))
        }
        else{
            setListGenres([...listGenres, genre])
        }
    }

    const handleAddTrack = (track: [string, string[]]) => {
        if (!listOfTracks.includes(track)){
            setListOfTracks([...listOfTracks, track])
        }
    }

    const handleRemoveTrack = (track: [string, string[]]) => {
        setListOfTracks(listOfTracks.filter(currTrack => currTrack != track))
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
            favArtists: listOfArtists,
            favTracks: listOfTracks,
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
            return
        }

        if (isLastQuestion) {
            handleBaseline()
            return
        }
        setCurrentQuestion(prev => prev + 1)
    }

    const handleBack = () => {
        if (showWelcomeScreen) return
        if (currentQuestion === 0) {
            setShowWelcomeScreen(true)
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
                        id: artist[0],
                        label: artist[0],
                        onSelect: () => handleAddArtist(artist[0])
                    }))}
                    selectedItems={listOfArtists.map((artist) => ({
                        id: artist,
                        label: artist
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
                    results={spotifyTracks.map((track) => ({
                        id: `${track[0]}-${track[1].join("-")}`,
                        label: `${track[0]} by ${formatArtists(track[1])}`,
                        onSelect: () => handleAddTrack(track)
                    }))}
                    selectedItems={listOfTracks.map((track) => ({
                        id: `${track[0]}-${track[1].join("-")}`,
                        label: `${track[0]} by ${formatArtists(track[1])}`
                    }))}
                    onRemoveSelectedItem={(trackId) => {
                        const track = listOfTracks.find(
                            (item) => `${item[0]}-${item[1].join("-")}` === trackId
                        )
                        if (track) handleRemoveTrack(track)
                    }}
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
                    <div key="onboarding-welcome" className="animate-in fade-in duration-500 space-y-4 text-center">
                        <p>Hey! It's great to meet you :)</p>
                        <p className="text-muted-foreground">We wanted to ask you a few questions before we get started.</p>
                        <div className="pt-2">
                            <Button type="button" onClick={handleNext}>Get Started</Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
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
    )
}

export default Onboarding