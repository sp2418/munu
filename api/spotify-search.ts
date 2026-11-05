import type { VercelRequest, VercelResponse } from '@vercel/node'


export default async function handleSpotifySearch(req: VercelRequest, res: VercelResponse) {
    try {
        const {q , type, artist, token} = req.query
        const query = artist ? `track:"${q}" artist:"${artist}"` : q as string

        
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=10`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + token
            }
        
        })
        // console.log(response.status)
        const data = await searchResponse.json()
        // Pass Spotify's real status along, so a block isn't mistaken for "song not found".
        res.status(searchResponse.status).json(data)
        return data
    }
    catch (error: any) {
        console.error("Spotify search error:", error)
        return res.status(500).json({error: error.message})

    }

}

