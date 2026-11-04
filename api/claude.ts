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
        favGenres: string[]
    };

    currEmotContext: {
        currRant: string
        currTracks: CurrTrack[]
        desiredFeeling: string
    };
}

const DESIRED_FEELING_PROMPT_LINES: Record<string, string> = {
    calm: "Calm — settle down, quiet the noise",
    comforted: "Comforted — feel less alone in it",
    "ready-to-rest": "Ready to rest — wind down toward sleep",
    reflective: "Reflective — sit with it and think",
    lighthearted: "Lighthearted — stop taking it so seriously",
    happy: "Happy — lift the mood",
    energized: "Energized — wake up, get moving",
    confident: "Confident — feel bolder",
}

function formatDesiredFeeling(id: string): string {
    return DESIRED_FEELING_PROMPT_LINES[id] ?? id
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
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST")
        return res.status(405).json({ error: "Method not allowed" })
    }

    // Check-in text is sensitive: keep it in the POST body and out of URLs and logs.
    let body: Partial<handleClaude> | null
    try {
        body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as Partial<handleClaude> | null
    } catch {
        return res.status(400).json({ error: "Invalid JSON body" })
    }

    const baseline = body?.baseline
    const currEmotContext = body?.currEmotContext
    if (!Array.isArray(baseline?.favGenres) || !Array.isArray(currEmotContext?.currTracks)) {
        return res.status(400).json({ error: "Expected JSON body: { baseline, currEmotContext }" })
    }

    const claudeAPIKey = process.env.CLAUDE_API_KEY
    if (!claudeAPIKey) {
        return res.status(500).json({ error: 'Missing Anthropic API key' })
    }

    const recentTracksFormatted = currEmotContext.currTracks
        .map((t) => formatCurrTrackLine(t))
        .filter(Boolean)
        .join("; ")

    const desiredFeelingLine = formatDesiredFeeling(currEmotContext.desiredFeeling)

    const prompt = `

        You are a music therapist and emotional wellness guide.

        You are experienced with applying the iso-principle. You meet people where they are emotionally based on the current music they're listening to. Then, you gradually help them shift toward the emotional state they asked for.

        Primary success criterion (strict): by the end of the playlist, a careful listener should clearly feel the user's chosen destination — "${desiredFeelingLine}" — expressed inside their own genre taste. Genre fit matters, but it must never override arriving at that feeling. Different users with different tastes should land in different-sounding music; the shared requirement is that song 10 embodies THEIR version of this feeling, not a generic template.


        Here is some information about the user's music taste:

        Favorite Genres: ${baseline.favGenres.join(", ")}


        Here is information about how the user is actually currently feeling:

        What they are feeling recently: ${currEmotContext.currRant}

        Songs they're listening to recently (each followed by audio features after an em dash where available):
        ${recentTracksFormatted || "(none provided)"}

        How they want to feel by the end: ${desiredFeelingLine}


        How to use the audio features:

        The audio features describe the actual sonic characteristics of each track:
        - valence (0.0-1.0): musical positivity. Low values sound sad, melancholic, or somber; high values sound cheerful, euphoric, or joyful.
        - energy (0.0-1.0): perceptual intensity and activity. Low values feel calm, slow, or restrained; high values feel fast, loud, or driving.
        - danceability (0.0-1.0): how rhythmically suitable for movement.
        - tempo: beats per minute.
        - acousticness (0.0-1.0): confidence the track is acoustic.

        Use these features as your primary signal for the emotional arc — they tell you what the user's tracks actually sound like, not just what genre they belong to. Infer the START zone from their recent listening (or from what they wrote). Infer the END zone as how "${desiredFeelingLine}" would sound within their favorite genres — relative to their start, not as universal numeric targets. For example, "calm" within high-energy taste still means a clear settle from their start; "energized" within mellow taste still means a clear lift. Do not force every playlist toward the same absolute numbers.


        ISO trajectory (strict):

        START: the ReccoBeats audio-feature zone of the user's recent-listening songs (when provided). If no recent tracks were provided, infer a starting zone from what they wrote, still staying inside their genre taste.
        END: a sonic place that unmistakably embodies their selected desired state ("${desiredFeelingLine}") while remaining authentic to their genre taste.

        The first tracks should sit close to the starting features. Each subsequent track must shift incrementally toward the target. No abrupt jumps in valence, energy, or related features from one song to the next.

        If the gap between the starting features and the desired state is large, spend more of the 10 tracks on the matching / near-start phase before beginning the shift, so the gradient stays gradual.


        Specific Task Instructions:

        1. Suggest how the current music they're listening to may be affecting their emotional state. When recent tracks with audio features are available, reference those characteristics (e.g., low valence and low energy can deepen reflective or somber feelings). If no recent tracks were provided, ground this in what they wrote and their genre taste. Be warm and supportive. Use phrases like "may be affecting" instead of "is causing".

        2. Briefly explain the iso-principle and how you're applying it for this user. Specifically name where they are emotionally (the start) and that the journey is moving toward their chosen desired state (${desiredFeelingLine}), and why that destination makes sense given what they're processing. Keep it warm, accessible, and short.

        3. Suggest exactly 10 songs that represent the user's complete emotional journey using the iso-principle, following the ISO trajectory rules above.



        Structure the 10 songs as a continuous gradient from start to the selected desired state:
        - Songs 1-3: Match the starting audio-feature zone (recent listening when available). Still name, in each explanation, that this is meeting them where they are before the shift toward "${desiredFeelingLine}".
        - Songs 4-7: Small incremental steps toward the destination. Each step should be perceptible but gentle. Each explanation must say what moved closer to "${desiredFeelingLine}" versus the previous song.
        - Songs 8-10: Landing phase. Each song must sit more clearly in the destination feeling than the one before it. Song 10 must be the strongest, clearest embodiment of "${desiredFeelingLine}" in the whole playlist — the peak arrival, not a soft epilogue that drifts away. Authentic to the user's genre taste.

        Landing rules for songs 8-10 (strict):
        - Do not pick a late-playlist song that pulls valence, energy, tempo, or overall vibe away from "${desiredFeelingLine}" relative to the previous track.
        - Do not end on a track that feels like a restart, a hype rebound, or a return to the starting mood.
        - If two candidates fit the genres equally well, choose the one that more unambiguously delivers "${desiredFeelingLine}".

        When the start-to-end gap is large, lengthen the early matching phase and compress the later steps so the whole arc still fits in 10 songs without jumps.

        Mid-playlist (songs 4-7) may evolve texture while moving toward the destination. The final three songs should commit to arriving — deepen into "${desiredFeelingLine}", do not wander for variety's sake.


        Important guidelines that apply to all song suggestions:

        The song suggestions must feel stylistically consistent with the user's favorite genres. Stay within that genre territory.

        Do not include any songs that already appear in the user's recent tracks list. The playlist should be entirely new recommendations — songs they haven't told you they're already listening to. This is a strict requirement.

        Mix recognizable songs with lesser-known tracks within their genre taste, but only suggest songs you are confident exist. Accuracy over obscurity.

        Do not introduce genres or styles disconnected from the user's taste, even at the destination. The destination is a different emotional zone within their taste, not a different musical world.

        Every journeySongs explanation must explicitly connect that song to progress toward (or arrival at) "${desiredFeelingLine}". Do not write generic vibe notes that could apply to any destination.


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
