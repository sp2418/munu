import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from "@anthropic-ai/sdk";

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
        currTracks: [string,string[]][],
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

        Songs they’re listening to recently: ${currEmotContext.currTracks.map(([title, artists]) => `${title} by ${artists.join(", ")}`).join(", ")}


        Specific Task Instructions:

        1. Suggest how the current music they’re listening to may be affecting their emotional state. Remember to be warm and supportive. Use phrases like “may be affecting” instead of “is causing”.
        2. Have an explanation on what the iso principle is and how you are using the principle to offer song suggestions to help them emotionally process what they are going through. Explain it in warm, accessible language as if you’re speaking directly to the user.
        3. Then, suggest 10 songs that can help them gradually shift to a desired state that helps them emotionally process what they are going through with the use of the iso-principle. Make sure the song suggestions align with their music taste. 
        4. Offer explanations on how those suggested songs can help them process. 
        5. Lastly, suggest 10 other songs that can represent them once they’re fully in their desired state after emotionally processing what they’re going through. The desired state represents a future state where the user has completed emotionally processing what they are going through and hopefully feels more positively about their circumstances in general. Make sure the song suggestions align with their music taste. Also, offer explanations on how each of these songs represents the users desired state. 

        Important guidelines that apply to all song suggestions:
        When suggesting songs, prioritize deeper cuts, album tracks, and lesser known songs within the artist's discography over their biggest hits or most streamed songs. 
        Avoid suggesting songs that are extremely well known or overplayed. 
        The goal is music discovery — expose the user to songs they likely haven't heard before but that align closely with their taste. It is okay to suggest songs from well known artists, but choose their more obscure or underappreciated tracks rather than their chart hits. 
        Do not suggest more than 2 songs from the same artist across the entire list. 
        Prioritize a diverse range of artists that align with the user's taste profile but also introduce them to new artists they may not have heard of before. 
        If suggesting a well known artist, choose a lesser known collaborator or feature that might expose the user to a new artist.
        Make sure every suggested song is real and verifiable on Spotify.

        Return a JSON with these specific fields:
        - insight: contains output for Step 1
        - isoExplanation: contains output for Step 2
        - gradualShiftSongs: contains output for Steps 3 and 4
            - Example of format: "gradualShiftSongs”: [{"title": "...", "artist": "...", "explanation": "..."}]
        - desiredStateSongs: contains output for Step 5
            - Example of format: "desiredStateSongs": [{"title": "...", "artist": "...", "explanation": "..."}]

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