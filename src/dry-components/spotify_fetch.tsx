// import { useState, useEffect } from "react"

// function fetchSpotifyInfo() {

//     //get the token

//     const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID
//     const spotifyClientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET

//     const getSpotifyTokenRequest = async () => {
//         const response = await fetch("/accounts/api/token", {
//             method: "POST",
//             headers: {
//                 'Authorization': 'Basic ' + (btoa(spotifyClientId + ':' + spotifyClientSecret)),
//                 'Content-Type': 'application/x-www-form-urlencoded'
//             },
//             body: new URLSearchParams({grant_type: 'client_credentials'})     
//         })
//         const data = await response.json()
//         return data.access_token
//     }

//     const [spotifyToken, setSpotifyToken] = useState<string>("")

//     useEffect(() => {
//         const fetchToken = async () => {
//             const tokenResult = await getSpotifyTokenRequest()
//             setSpotifyToken(tokenResult)
//         }
//         fetchToken()
//     }, [])





//     // get list of artists

//     const searchArtists = async (searchTermArtist: string) => {
//         console.log(`/spotify/v1/search?q=${searchTermArtist}&type=artist`)
//         const response = await fetch(`/spotify/v1/search?q=${searchTermArtist}&type=artist`, {
//             method: "GET",
//             headers: {
//                 'Authorization': 'Bearer ' + spotifyToken
//             }
//         })
//         console.log(response.status)
//         const data = await response.json()
//         return data
//     }

//     const [searchTermArtist, setSearchTermArtist] = useState<string>("")

//     type SpotifyArtist = {
//         external_urls: { spotify : string}
//         href: string
//         id: string
//         images: {height: number, url: string, width: number}
//         name: string
//         type: string
//         uri: string
//     }

//     // const [spotifyArtists, setSpotifyArtists] = useState<String[]>([])

//     useEffect(() => {
//         let isActive = true
//         if(!spotifyToken) return
//         if(!searchTermArtist.trim()) {
//             setSpotifyArtists([])
//             return
//         }
//         const fetchArtists = async () => {
//             const results = await searchArtists(searchTermArtist)
//             const artists = results.artists.items.map((artist : SpotifyArtist) => [artist.name, artist.images])
//             // console.log("hi", artistNames)
//             // artistObj.map((artist<SpotifyArtist>) => currArr.append(artist.name))
//             // console.log("hi", results.artists.items)
//             if (isActive) {
//                 setSpotifyArtists(artists)
//             }
//         }
//         fetchArtists()

//         return () => {
//             isActive = false
//         }
//     }, [searchTermArtist, spotifyToken])

//     console.log(spotifyArtists)


//     const searchTracks = async (searchTermTrack: string) => {
//         console.log(`/spotify/v1/search?q=${searchTermTrack}&type=track&limit=10`)
//         console.log("sup")
//         const response = await fetch(`/spotify/v1/search?q=${searchTermTrack}&type=track`, {
//             method: "GET",
//             headers: {
//                 'Authorization': 'Bearer ' + spotifyToken
//             }
//         })
//         console.log(response.status)
//         const data = await response.json()
//         return data
//     }

//     const [searchTermTrack, setSearchTermTrack] = useState<string>("")
//     const [spotifyTracks, setSpotifyTracks] = useState<[string, string[]][]>([])

//     type SpotifyTrack = {
//         album: {
//           album_type: string
//           artists: { id: string, name: string }[]
//           external_urls: { spotify: string }
//           href: string
//           id: string
//         }
//         artists: { id: string, name: string }[]
//         disc_number: number
//         duration_ms: number
//         explicit: boolean
//         external_ids: { isrc: string }
//         external_urls: { spotify: string }
//         href: string
//         id: string
//         is_local: boolean
//         is_playable: boolean
//         name: string
//         track_number: number
//         type: string
//         uri: string
//       }

//     useEffect(() => {
//         // let isActive = true
//         if(!spotifyToken) return
//         if(!searchTermTrack.trim()) {
//             setSpotifyTracks([])
//             return
//         }
//         const fetchTracks = async () => {
//             const results = await searchTracks(searchTermTrack)
//             const uniqueTracks = await results.tracks.items.filter(
//                 (track: SpotifyTrack, index: number, self: SpotifyTrack[]) => 
//                     index === self.findIndex(t => t.external_ids.isrc === track.external_ids.isrc)
//             )
//             const tracks: [string, string[]][] = []
//             console.log("yo", uniqueTracks)
//             uniqueTracks.forEach((track : SpotifyTrack) => {
//                 const trackName = track.name
//                 console.log("name", trackName)
//                 const trackArtists: string[] = []
//                 track.artists.forEach(artist => trackArtists.push(artist.name))
//                 console.log('artists', trackArtists)
//                 tracks.push([trackName, trackArtists])
//             })
//             console.log('list of tracks', tracks)
//             setSpotifyTracks(tracks)
//             // // console.log("hi", artistNames)
//             // // artistObj.map((artist<SpotifyArtist>) => currArr.append(artist.name))
//             // // console.log("hi", results.artists.items)
//             // if (isActive) {
//             //     setSpotifyArtists(tracks)
//             // }
//         }
//         fetchTracks()

//         // return () => {
//         //     isActive = false
//         // }
//     }, [searchTermTrack, spotifyToken])
// }