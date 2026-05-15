import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from "@anthropic-ai/sdk"

type CurrTrack =
    | [string, string[]]
    | [string, string[], string, { audioFeatures?: unknown }]
    | {
          name: string
          artists: string[]
          imageUrl?: string
          id?: string
          reccobeatsId?: string
          audioFeatures?: unknown
      }

/** Compact human-readable line for model context (ReccoBeats-style fields). */
function formatAudioFeaturesHuman(af: Record<string, unknown>): string | null {
    const parts: string[] = []
    if (typeof af.tempo === "number" && Number.isFinite(af.tempo)) {
        parts.push(`tempo ${af.tempo.toFixed(1)} BPM`)
    }
    if (typeof af.energy === "number" && Number.isFinite(af.energy)) {
        parts.push(`energy ${af.energy.toFixed(2)}`)
    }
    if (typeof af.danceability === "number" && Number.isFinite(af.danceability)) {
        parts.push(`danceability ${af.danceability.toFixed(2)}`)
    }
    if (typeof af.valence === "number" && Number.isFinite(af.valence)) {
        parts.push(`valence ${af.valence.toFixed(2)}`)
    }
    if (typeof af.acousticness === "number" && Number.isFinite(af.acousticness)) {
        parts.push(`acousticness ${af.acousticness.toFixed(2)}`)
    }
    if (typeof af.instrumentalness === "number" && Number.isFinite(af.instrumentalness)) {
        parts.push(`instrumentalness ${af.instrumentalness.toFixed(2)}`)
    }
    if (typeof af.speechiness === "number" && Number.isFinite(af.speechiness)) {
        parts.push(`speechiness ${af.speechiness.toFixed(2)}`)
    }
    if (typeof af.liveness === "number" && Number.isFinite(af.liveness)) {
        parts.push(`liveness ${af.liveness.toFixed(2)}`)
    }
    if (typeof af.loudness === "number" && Number.isFinite(af.loudness)) {
        parts.push(`loudness ${af.loudness.toFixed(2)} dB`)
    }
    if (typeof af.key === "number" && Number.isFinite(af.key)) {
        parts.push(`key ${af.key}`)
    }
    if (typeof af.mode === "number" && Number.isFinite(af.mode)) {
        parts.push(`mode ${af.mode === 1 ? "major" : "minor"}`)
    }
    if (parts.length === 0) return null
    return parts.join("; ")
}

function formatBaselineFavTrack(row: unknown): string {
    if (!Array.isArray(row) || row.length < 2) return ""
    const title = String(row[0])
    const artists = Array.isArray(row[1]) ? (row[1] as string[]).join(", ") : ""
    let line = `${title} by ${artists}`
    if (row.length >= 4 && row[3] != null && typeof row[3] === "object") {
        const bag = row[3] as { audioFeatures?: unknown }
        const af = bag.audioFeatures
        if (af != null && typeof af === "object") {
            const human = formatAudioFeaturesHuman(af as Record<string, unknown>)
            if (human) line += ` — ${human}`
        }
    }
    return line
}

function formatFavoriteArtists(names: unknown): string {
    if (!Array.isArray(names)) return ""
    return names
        .map((a) => {
            if (typeof a === "string") return a
            if (a && typeof a === "object" && "name" in a) {
                return String((a as { name: string }).name ?? "")
            }
            return ""
        })
        .filter(Boolean)
        .join(", ")
}

function formatCurrTrackLine(t: CurrTrack): string {
    let base: string
    let af: unknown
    if (Array.isArray(t)) {
        base = `${t[0]} by ${t[1].join(", ")}`
        if (t.length >= 4 && t[3] != null && typeof t[3] === "object") {
            af = (t[3] as { audioFeatures?: unknown }).audioFeatures
        }
    } else {
        base = `${t.name} by ${t.artists.join(", ")}`
        af = t.audioFeatures
    }
    if (af != null && typeof af === "object") {
        const human = formatAudioFeaturesHuman(af as Record<string, unknown>)
        if (human) base += ` — ${human}`
    }
    return base
}

interface handleClaude {
    baseline: {
        favGenres: string[],
        favArtists: unknown[],
        favTracks: unknown[],
        personalContexts: string[],
        addContext: string
    };
    
    currEmotContext: {
        currRant: string,
        currTracks: CurrTrack[],
        emotions: string[]
    };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function httpStatusFromError(err: unknown): number | undefined {
    if (typeof err !== "object" || err === null) return undefined
    const status = (err as { status?: unknown }).status
    return typeof status === "number" ? status : undefined
}

/** Anthropic / edge: overload, rate limit, transient server errors */
function isRetryableAnthropicHttpStatus(status: number): boolean {
    return status === 429 || status === 500 || status === 503 || status === 529
}

/**
 * Retries on retryable HTTP statuses with exponential backoff + jitter
 * (matches Anthropic console guidance for 529 Overloaded).
 */
async function withAnthropicBackoff<T>(
    fn: () => Promise<T>,
    options: { maxRetries: number; baseDelayMs: number; maxDelayMs: number },
): Promise<T> {
    const { maxRetries, baseDelayMs, maxDelayMs } = options
    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err
            const status = httpStatusFromError(err)
            const retryable = status !== undefined && isRetryableAnthropicHttpStatus(status)
            if (!retryable || attempt >= maxRetries) {
                throw err
            }
            const capped = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)
            const jitter = Math.floor(Math.random() * 400)
            console.warn(
                `[claude] retryable error status=${status} attempt=${attempt + 1}/${maxRetries + 1} sleeping_ms=${capped + jitter}`,
            )
            await delay(capped + jitter)
        }
    }
    throw lastError
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

        You are experienced with applying the iso-principle. You meet people where they are emotionally based on the current music they're listening to. Then, you gradually help them shift toward an emotional state that would genuinely serve them given what they're processing — which might be calm acceptance, quiet groundedness, hopeful momentum, or empowered energy depending on what they need.

        Here is some information about the user's music taste:

        Favorite Genres: ${baseline.favGenres.join(", ")}

        Favorite Artists: ${formatFavoriteArtists(baseline.favArtists)}

        Favorite Tracks (each followed by audio features after an em dash where available):
        ${baseline.favTracks.map((row) => formatBaselineFavTrack(row)).filter(Boolean).join("; ")}

        Life Contexts when they listen to music: ${baseline.personalContexts.join(", ")}

        What they think about their relationship with music: ${baseline.addContext}


        Here is information about how the user is actually currently feeling:

        What they are feeling recently: ${currEmotContext.currRant}

        Their current emotions: ${currEmotContext.emotions.join(", ")}

        Songs they're listening to recently (each followed by audio features after an em dash where available):
        ${currEmotContext.currTracks.map((t) => formatCurrTrackLine(t)).filter(Boolean).join("; ")}


        How to use the audio features:

        The audio features describe the actual sonic characteristics of each track:
        - valence (0.0-1.0): musical positivity. Low values sound sad, melancholic, or somber; high values sound cheerful, euphoric, or joyful.
        - energy (0.0-1.0): perceptual intensity and activity. Low values feel calm, slow, or restrained; high values feel fast, loud, or driving.
        - danceability (0.0-1.0): how rhythmically suitable for movement.
        - tempo: beats per minute.
        - acousticness (0.0-1.0): confidence the track is acoustic.

        Use these features as your primary signal for the energy arc — they tell you what the user's tracks actually sound like, not just what genre they belong to.

        Look at the full distribution of audio features across the user's favorite tracks and recent tracks. Their taste likely spans multiple emotional zones. Identify:
        - The zone (range of valence and energy) that matches their current emotional state — songs they're reaching for right now.
        - The zone that would represent the emotional state that would serve them at the end of the journey, given what they're processing.

        Recommend songs whose audio characteristics trace a gradient between those two zones.


        Specific Task Instructions:

        1. Suggest how the current music they're listening to may be affecting their emotional state. Reference the audio characteristics of their current tracks (e.g., low valence and low energy can deepen reflective or somber feelings). Be warm and supportive. Use phrases like "may be affecting" instead of "is causing".

        2. Briefly explain the iso-principle and how you're applying it for this user. Specifically name where they are emotionally and where the journey is moving toward, and why that destination makes sense given what they're processing. Keep it warm, accessible, and short.

        3. Suggest 20 songs that represent the user's complete emotional journey using the iso-principle.



        First, decide what emotional destination would serve this user given what they shared. Some examples:
        - Someone overwhelmed and stressed might benefit from arriving at calm groundedness (low energy, moderate valence).
        - Someone processing grief might benefit from arriving at quiet strength or acceptance (moderate energy, moderate valence).
        - Someone feeling stuck or numb might benefit from arriving at re-energized momentum (higher energy, higher valence).
        - Someone needing to release frustration might benefit from arriving at cathartic empowerment (high energy, varied valence).
        The destination should feel like genuine emotional movement, not forced positivity.

        Then structure the 20 songs as a gradient:
        - Songs 1-4: Match the user's current emotional state. The audio features of these songs should be similar to what they're listening to right now.
        - Songs 5-12: Gradually shift the audio features toward the destination zone. Each song should feel like a small step.
        - Songs 13-16: Closer to the destination. The shift should be clearly perceptible.
        - Songs 17-20: At the destination. Authentic to the user's taste, but at the audio-feature zone that represents emotional arrival.

        The energy arc must trace a clear gradient in audio-feature space. Do not let the playlist stagnate in one zone — even if the destination is also low-energy, the texture should evolve.


        Important guidelines that apply to all song suggestions:

        The song suggestions must feel stylistically consistent with the user's favorite artists and tracks. Stay within the genre territory shown in their taste profile.

        Do not include any songs that already appear in the user's favorite tracks or recent tracks lists. The playlist should be entirely new recommendations — songs they haven't told you they're already listening to. This is a strict requirement.

        Prioritize artists from or similar to their favorite artists list. Mix recognizable songs with lesser-known tracks from artists in their taste profile, but only suggest songs you are confident exist. Accuracy over obscurity.

        Do not introduce genres or styles disconnected from the user's taste, even at the destination. The destination is a different emotional zone within their taste, not a different musical world.


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
        apiKey: claudeAPIKey,
    })

    try {
        const msg = await withAnthropicBackoff(
            () =>
                client.messages.create({
                    model: "claude-opus-4-7",
                    max_tokens: 4096,
                    messages: [
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                }),
            { maxRetries: 4, baseDelayMs: 1000, maxDelayMs: 20_000 },
        )

        const block = msg.content[0]
        if (block?.type === "text") {
            return res.status(200).json({ response: block.text })
        }
        console.error("[claude] unexpected content block:", block?.type)
        return res.status(500).json({ error: "Unexpected response shape from model" })
    } catch (err) {
        const status = httpStatusFromError(err)
        console.error("[claude] messages.create failed:", err)
        if (status !== undefined && isRetryableAnthropicHttpStatus(status)) {
            return res.status(503).json({
                error: "Model temporarily unavailable. Please try again in a moment.",
                code: status,
            })
        }
        return res.status(502).json({
            error: "Failed to generate response.",
            ...(status !== undefined ? { code: status } : {}),
        })
    }
}