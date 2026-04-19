import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handleSpotifyTokenRequest(req: VercelRequest, res: VercelResponse) {
    // your fetch logic here
    // then send the result back with res.json()

    const spotifyClientId = process.env.SPOTIFY_CLIENT_ID
    const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!spotifyClientId || !spotifyClientSecret) {
        return res.status(500).json({ error: 'Missing Spotify credentials' })
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            'Authorization': 'Basic ' + (btoa(spotifyClientId + ':' + spotifyClientSecret)),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({grant_type: 'client_credentials'})     
    })
    const data = await response.json()
    res.status(200).json({ access_token: data.access_token })
}