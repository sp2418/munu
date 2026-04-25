import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from "@anthropic-ai/sdk";

type CurrTrack =
    | [string, string[]]
    | { name: string; artists: string[]; imageUrl?: string }

function formatCurrTrack(t: CurrTrack): string {
    if (Array.isArray(t)) {
        return `${t[0]} by ${t[1].join(", ")}`
    }
    return `${t.name} by ${t.artists.join(", ")}`
}

interface handleClaude {
    baseline: {
        favGenres: string[],
        favArtists: string[],
        favTracks: [string,string[]][],
        personalContexts: string[],
        addContext: string
    };
    
    currEmotContext: {
        currRant: string,
        currTracks: CurrTrack[],
        emotions: string[]
    };
}

export default async function handleClaude(req: VercelRequest, res: VercelResponse) {
    const { baseline: baselineRaw, currEmotContext: currEmotContextRaw } = req.query
    console.log("req.query:", req.query)

    console.log("baselineRaw:", baselineRaw)
    console.log("currEmotContextRaw:", currEmotContextRaw)

    const baseline = JSON.parse(baselineRaw as string) as handleClaude['baseline']
    const currEmotContext = JSON.parse(currEmotContextRaw as string) as handleClaude['currEmotContext']

    const claudeAPIKey = process.env.CLAUDE_API_KEY
    if (!claudeAPIKey) {
        return res.status(500).json({ error: 'Missing Anthropic API key' })
    }

    const prompt = `
            
        You are a music therapist and emotional wellness guide. 

        You are experienced with applying the iso-principle. You meet people where they are emotionally based on the current music they’re listening to. Then, you gradually help them shift to a desired state that helps them emotionally process what they are going through by suggesting songs that gradually shift in energy and tempo.


        Here is some information about the user’s music taste:

        Favorite Genres: ${baseline.favGenres.join(", ")}

        Favorite Artists: ${baseline.favArtists.join(", ")}

        Favorite Tracks: ${baseline.favTracks.map(([title, artists]) => `${title} by ${artists.join(", ")}`).join(", ")}

        Life Contexts when they listen to music: ${baseline.personalContexts.join(", ")}

        What they think about their relationship with music: ${baseline.addContext}


        Here is information about how the user is actually currently feeling:

        What they are feeling recently: ${currEmotContext.currRant}

        Their current emotions: ${currEmotContext.emotions.join(", ")}

        Songs they’re listening to recently: ${currEmotContext.currTracks.map((t) => formatCurrTrack(t)).join(", ")}


        Specific Task Instructions:

        1. Suggest how the current music they’re listening to may be affecting their emotional state. Remember to be warm and supportive. Use phrases like “may be affecting” instead of “is causing”.
        2. Have an explanation on what the iso principle is and how you are using the principle to offer song suggestions to help them emotionally process what they are going through. Explain it in warm, accessible language as if you’re speaking directly to the user. But also keep it short and sweet.
        3. Suggest 20 songs that represent the user's complete emotional journey using the ISO principle. Think of it as climbing a mountain:

            - Songs 1-4 (Base of the mountain): Match the user's current emotional state exactly. These should feel heavy, reflective, or melancholic if that's where they are.

            - Songs 5-12 (Climbing): Gradually increase in energy, tempo, and emotional brightness. Each song should feel slightly more hopeful and alive than the last. The shift should be subtle but consistent.

            - Songs 13-16 (Near the peak): Noticeably more energized and uplifting. The user should feel momentum and forward movement.

            - Songs 17-20 (The peak): Celebratory, empowered, and vibrant. These songs should feel like arrival — still authentic to their taste but clearly representing a brighter emotional state.

            The energy arc must be clear and intentional. Do not let the playlist stay in a low energy space. The whole point is movement.

        Important guidelines that apply to all song suggestions:
        When suggesting songs, prioritize deeper cuts and lesser known tracks over the biggest hits, but ONLY if you are completely certain the song exists. 
        If you are not 100% confident a specific deep cut exists, choose a more well known song from that artist instead. Accuracy is more important than obscurity.
        Do not suggest songs you are uncertain about. It is better to suggest a well known song that definitely exists than a niche song that may not.
        The song suggestions must feel stylistically consistent with the user's favorite artists and tracks listed above. Do not suggest songs from genres or artists that feel disconnected from their taste profile.
        Prioritize artists from or similar to their favorite artists list.
        The peak songs should still feel like the user's authentic taste — just at a higher energy level. 
        Do not introduce completely new genres at the peak.
       
        Return a JSON with these specific fields:
        - insight: contains output for Step 1
        - isoExplanation: contains output for Step 2
        - journeySongs: contains output for Step 3
            - Example of format: "journeySongs": [{"title": "...", "artist": "...", "explanation": "..."}]
        
        Important: the title and artist fields must contain ONLY the song title and artist name respectively. 
        No explanations, alternatives, parentheses, special characters, bullet points, or additional text in these fields.
        All reasoning and explanations belong only in the explanation field.
        The artist field should contain only the primary artist name, no featured artists.

        Return ONLY a JSON object. No additional text before or after, no trailing commas, and no unescaped special characters.


        `

    console.log("prompt", prompt)

    const client = new Anthropic({
        apiKey: claudeAPIKey // This is the default and can be omitted
      });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: prompt
        }],
      });
      const response = msg.content[0]
      if (response.type === "text"){
        res.status(200).json({response: response.text})
      }
}