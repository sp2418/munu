import type { VercelRequest, VercelResponse } from '@vercel/node'


export default async function handleSpotifySearch(req: VercelRequest, res: VercelResponse) {
    try {
        const {q , type, artist} = req.query
        const query = artist ? `track:"${q}" artist:"${artist}"` : q as string
        const spotifyClientId = process.env.SPOTIFY_CLIENT_ID
        const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET

        if (!spotifyClientId || !spotifyClientSecret) {
            return res.status(500).json({ error: 'Missing Spotify credentials' })
        }

        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                'Authorization': 'Basic ' + (btoa(spotifyClientId + ':' + spotifyClientSecret)),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({grant_type: 'client_credentials'})     
        })
        const token_data = await tokenResponse.json()
        const spotifyToken = token_data.access_token



        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=10`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + spotifyToken
            }
        
        })
        // console.log(response.status)
        const data = await searchResponse.json()
        res.status(200).json(data)
        return data
    }
    catch (error: any) {
        console.error("Spotify search error:", error)
        return res.status(500).json({error: error.message})

    }

}

