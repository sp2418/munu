import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from "@anthropic-ai/sdk";

export default async function handleClaude(req: VercelRequest, res: VercelResponse) {
    const claudeAPIKey = process.env.CLAUDE_API_KEY
    if (!claudeAPIKey) {
        return res.status(500).json({ error: 'Missing Anthropic API key' })
    }

    const prompt = `
            
        You are a music therapist and emotional wellness guide. 

        You are experienced with applying the iso-principle. You meet people where they are emotionally based on the current music they’re listening to. Then, you gradually help them shift to a desired state that helps them emotionally process what they are going through by suggesting songs that gradually shift in energy and tempo.


        Here is some information about the user’s music taste:

        Favorite Genres: Hip Hop, R&B, Pop, Afrobeats

        Favorite Artists: KAYTRANADA, Megan Thee Stallion, PinkPantheress, Doja Cat, Doechii, Jhene Aiko, Ariana Grande, Bad Bunny, Tamae, Sabrina Carpenter

        Favorite Tracks: Hmmm by Chris Brown and Davido, Jealous Type by Doja Cat, Sugar Talking by Sabrina Carpenter, Wait on Us by Tamae and Bastian Beli, TARGET JOINT by KAYTRANADA

        Life Contexts when they listen to music: Working out, socializing, getting ready, driving, processing emotions

        What they think about their relationship with music: Music has been a huge part of my life. I’ve listened to it to help me process what I’ve been through. Sometimes I listen to it just for fun to, especially since I am a dancer. It just makes life a lot more vibrant for me, and I get really excited when I come across new music that I can vibe with. 


        Here is information about how the user is actually currently feeling:

        What they are feeling recently: I’ve been pretty anxious or restless or even just frustrated over the job search recently. I feel like it’s consuming most of my life, and I don’t know how to enjoy life when the goal of finding a job is looming over my head. Getting a job in tech has been surprisingly emotionally taxing. I’m doing my best, but I’ve been at this for months. I really hope I get a job soon. 

        Their current emotions: Anxious, Overwhelmed, Stressed, Hopeful, Restless, Drained

        Songs they’re listening to recently: Girl Like Me + Kaytranada by PinkPantheress and KAYTRANADA, What’s the Use? By Mac Miller, Dang! (feat. Anderson.Paak) by Mac Miller and Anderson.Paak, borderline by Ariana Grande and Missy Elliott


        Specific Task Instructions:

        1. Suggest how the current music they’re listening to may be affecting their emotional state. Remember to be warm and supportive. Use phrases like “may be affecting” instead of “is causing”.
        2. Have an explanation on what the iso principle is and how you are using the principle to offer song suggestions to help them emotionally process what they are going through. Explain it in warm, accessible language as if you’re speaking directly to the user.
        3. Then, suggest 6 songs that can help them gradually shift to a desired state that helps them emotionally process what they are going through with the use of the iso-principle. Make sure the song suggestions align with their music taste. When suggesting songs, prioritize songs that are real and verifiable on Spotify. Suggest songs that are moderately well known — not necessarily chart hits, but recognizable within the artist's discography or genre. Avoid very obscure deep cuts or rare tracks that may be hard to verify. The goal is a balance between music discovery and reliability.
        4. Offer explanations on how those 6 suggested songs can help them process. 
        5. Lastly, suggest 6 other songs that can represent them once they’re fully in their desired state after emotionally processing what they’re going through. The desired state represents a future state where the user has completed emotionally processing what they are going through and hopefully feels more positively about their circumstances in general. Make sure the song suggestions align with their music taste. Also, offer explanations on how each of these songs represents the users desired state. When suggesting songs, prioritize songs that are real and verifiable on Spotify. Suggest songs that are moderately well known — not necessarily chart hits, but recognizable within the artist's discography or genre. Avoid very obscure deep cuts or rare tracks that may be hard to verify. The goal is a balance between music discovery and reliability.

        Return a JSON with these specific fields:
        - insight: contains output for Step 1
        - isoExplanation: contains output for Step 2
        - gradualShiftSongs: contains output for Steps 3 and 4
            - Example of format: "gradualShiftSongs”: [{"title": "...", "artist": "...", "explanation": "..."}]
        - desiredStateSongs: contains output for Step 5
            - Example of format: "desiredStateSongs": [{"title": "...", "artist": "...", "explanation": "..."}]

        Return ONLY a JSON object. No additional text before or after.

        Important: the title and artist fields must contain ONLY the song title and artist name respectively. 
        No explanations, alternatives, parentheses, special characters, bullet points, or additional text in these fields.
        All reasoning and explanations belong only in the explanation field.
        The artist field should contain only the primary artist name, no featured artists.


        `



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