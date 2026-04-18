import { Badge } from "../components/ui/badge"

import { X } from "lucide-react"

import {
Command,
CommandInput,
CommandItem,
CommandList,
} from "../components/ui/command"

import { Textarea } from "../components/ui/textarea"

import { useState, useEffect } from "react"

interface OnboardingProps {
    setView: (view: string) => void;
}

function Onboarding({setView}: OnboardingProps) {
    const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
    const spotifyClientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET

    const getSpotifyTokenRequest = async () => {
        const response = await fetch("/accounts/api/token", {
            method: "POST",
            headers: {
                'Authorization': 'Basic ' + (btoa(spotifyClientId + ':' + spotifyClientSecret)),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({grant_type: 'client_credentials'})     
        })
        const data = await response.json()
        return data.access_token
    }

    const [spotifyToken, setSpotifyToken] = useState<string>("")

    useEffect(() => {
        const fetchToken = async () => {
            const tokenResult = await getSpotifyTokenRequest()
            setSpotifyToken(tokenResult)
        }
        fetchToken()
    }, [])

    const searchArtists = async (searchTermArtist: string) => {
        // console.log(`/spotify/v1/search?q=${searchTermArtist}&type=artist`)
        const response = await fetch(`/spotify/v1/search?q=${searchTermArtist}&type=artist`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + spotifyToken
            }
        })
        // console.log(response.status)
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

    const [spotifyArtists, setSpotifyArtists] = useState<String[]>([])

    useEffect(() => {
        let isActive = true
        if(!spotifyToken) return
        if(!searchTermArtist.trim()) {
            setSpotifyArtists([])
            return
        }
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

        return () => {
            isActive = false
        }
    }, [searchTermArtist, spotifyToken])

    // console.log(spotifyArtists)


    const searchTracks = async (searchTermTrack: string) => {
        // console.log(`/spotify/v1/search?q=${searchTermTrack}&type=track&limit=10`)
        // console.log("sup")
        const response = await fetch(`/spotify/v1/search?q=${searchTermTrack}&type=track`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + spotifyToken
            }
        })
        // console.log(response.status)
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
        if(!spotifyToken) return
        if(!searchTermTrack.trim()) {
            setSpotifyTracks([])
            return
        }
        const fetchTracks = async () => {
            const results = await searchTracks(searchTermTrack)
            const uniqueTracks = await results.tracks.items.filter(
                (track: SpotifyTrack, index: number, self: SpotifyTrack[]) => 
                    index === self.findIndex(t => t.external_ids.isrc === track.external_ids.isrc)
            )
            const tracks: [string, string[]][] = []
            // console.log("yo", uniqueTracks)
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

        // return () => {
        //     isActive = false
        // }
    }, [searchTermTrack, spotifyToken])


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

    return (
        <>
            <p>Hey! It's great to meet you :) We wanted to ask you a few questions before we get started.</p>
            <p>What are your favorite genres of music?</p>
            <div className="flex flex-wrap gap-2">
                {
                    genres.map(genre => (
                        <Badge variant={listGenres.includes(genre) ? "default" : "outline"} onClick={() => handleAddGenre(genre)}>
                            {genre}
                        </Badge>
                    ))
                }
            </div>
            <p>Who are your favorite artists?</p>
            <Command shouldFilter={false}>
                <CommandInput value={searchTermArtist} onValueChange={(value) => setSearchTermArtist(value)} placeholder="Search for an artist..." />
                <CommandList>
                    {/* <CommandEmpty>No results found.</CommandEmpty> */}
                    {
                        spotifyArtists.map(artist => (
                            <CommandItem onSelect={() => handleAddArtist(artist[0])}>
                                <span>{artist[0]}</span>
                            </CommandItem>
                        ))
                    }
                </CommandList>
            </Command>
            <div className="flex flex-wrap gap-2">
                {
                    listOfArtists.map(artist => (
                        <Badge>
                            {artist}
                            <X className="cursor-pointer" onClick={() => handleRemoveArtist(artist)} />
                        </Badge>
                    ))
                }
            </div>
            <p>Can you give us a few examples of your favorite songs?</p>
            <Command shouldFilter={false}>
                <CommandInput value={searchTermTrack} onValueChange={(value) => setSearchTermTrack(value)} placeholder="Search for a track..." />
                <CommandList>
                    {/* <CommandEmpty>No results found.</CommandEmpty> */}
                    {
                        spotifyTracks.map(track => (
                            <CommandItem onSelect={() => handleAddTrack(track)}>
                                <span>{track[0]} by {formatArtists(track[1])}</span>
                            </CommandItem>
                        ))
                    }
                </CommandList>
            </Command>
            <div className="flex flex-wrap gap-2">
                {
                    listOfTracks.map(track => (
                        <Badge>
                            {track[0]} by {formatArtists(track[1])}
                            <X className="cursor-pointer" onClick={() => handleRemoveTrack(track)} />
                        </Badge>
                    ))
                }
            </div>
            
            <p>When do you listen to music the most?</p>
            <div className="flex flex-wrap gap-2">
                {
                    musicContexts.map(context => (
                        <Badge variant={listContexts.includes(context) ? "default" : "outline"} onClick={() => handleAddContext(context)}>
                            {context}
                        </Badge>
                    ))
                }
            </div>
            <p>Is there anything else about your relationship with music you'd want us to know?</p>
            <Textarea value={additionalContext} onChange={handleAdditionalContext} />
            <button onClick={handleBaseline}>Done</button>
        </>
    )
}

export default Onboarding