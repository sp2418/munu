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

interface CheckInProps {
    setView: (view: string) => void;
}

function CheckIn({setView}: CheckInProps) {
    const [rantSesh, setRantSesh] = useState<string>("")
    const [listEmotions, setListEmotions] = useState<string[]>([])

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
            setListEmotions(listEmotions.filter((currEmot: string) => {
                currEmot != emotion
            }))
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
    }, [searchTermTrack])

    const [listOfTracks, setListOfTracks] = useState<[string, string[]][]>([])

    const handleAddTrack = (track: [string, string[]]) => {
        if (!listOfTracks.includes(track)){
            setListOfTracks([...listOfTracks, track])
        }
    }

    const handleRemoveTrack = (track: [string, string[]]) => {
        setListOfTracks(listOfTracks.filter(currTrack => currTrack != track))
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

    // useEffect(() => {
    //     const currEmotContext = {
    //         emotions: listEmotions,
    //         currTracks: listOfTracks,
    //         currRant: rantSesh
    //     }
    //     localStorage.setItem('currEmotContext', JSON.stringify(currEmotContext))
    // }, [listEmotions, listOfTracks, rantSesh])

  
    return (
      <>
        <p>What's been on your mind lately?</p>
        <Textarea value={rantSesh} onChange={handleRantSession} />
        <p>What emotions are you feeling at the moment?</p>
        <div className="flex flex-wrap gap-2">
            {
                emotions.map(emotion => (
                    <Badge variant={listEmotions.includes(emotion) ? "default" : "outline"} onClick={() => handleAddEmotion(emotion)}>
                        {emotion}
                    </Badge>
                ))
            }
        </div>

        <p>Are they any songs that you've been listening to recently?</p>
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
        <button onClick={handleSesh}>Done</button>
      </>
    )
  }

  export default CheckIn