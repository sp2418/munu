/**
 * ReccoBeats audio-features row (subset; API may add fields).
 * @see https://reccobeats.com/docs/apis/get-track-audio-features
 */
export type ReccoBeatsAudioFeatureRow = {
  id: string
  href: string
  isrc?: string | null
  acousticness: number
  danceability: number
  energy: number
  instrumentalness: number
  key: number
  liveness: number
  loudness: number
  mode: number
  speechiness: number
  tempo: number
  valence: number
}

export type ReccoTrackEnrichment = {
  reccobeatsId: string
  audioFeatures: ReccoBeatsAudioFeatureRow | null
}

export type MusicBaseline = {
  favGenres: string[]
}

export type CurrEmotTrackObject = {
  id: string
  name: string
  artists: string[]
  imageUrl?: string
  reccobeatsId?: string
  audioFeatures?: ReccoBeatsAudioFeatureRow | null
}

export type DesiredFeelingId =
  | "calm"
  | "comforted"
  | "ready-to-rest"
  | "reflective"
  | "lighthearted"
  | "happy"
  | "energized"
  | "confident"

export type CurrEmotContext = {
  currRant: string
  currTracks: ([string, string[]] | CurrEmotTrackObject)[]
  /** How the user wants to feel by the end of the journey; empty while unanswered. */
  desiredFeeling: DesiredFeelingId | ""
}

type EnrichMap = Record<string, ReccoTrackEnrichment | null>

/** Spotify IDs that still need a ReccoBeats lookup (skip already-enriched rows). */
function collectSpotifyIdsForEnrichment(curr: CurrEmotContext | null): string[] {
  const ids: string[] = []
  if (curr?.currTracks) {
    for (const t of curr.currTracks) {
      if (Array.isArray(t)) continue
      if ("reccobeatsId" in t) continue
      if (typeof t.id === "string" && t.id.length > 0) ids.push(t.id)
    }
  }
  return [...new Set(ids)]
}

function applyEnrichmentToCurr(curr: CurrEmotContext, bySpotifyId: EnrichMap): CurrEmotContext {
  return {
    ...curr,
    currTracks: curr.currTracks.map((t) => {
      if (Array.isArray(t)) return t
      if (typeof t.id !== "string") return t
      if ("reccobeatsId" in t) return t
      const data = bySpotifyId[t.id]
      if (!data) return t
      return {
        ...t,
        reccobeatsId: data.reccobeatsId,
        audioFeatures: data.audioFeatures,
      }
    }),
  }
}

/**
 * Resolves Spotify track IDs via ReccoBeats, fetches audio features, merges into
 * `currEmotContext` in localStorage, and returns the updated objects.
 * Skips check-in track objects that already have `reccobeatsId` set.
 */
export async function enrichStoredMusicProfilesWithReccoBeats(): Promise<{
  baseline: MusicBaseline | null
  currEmotContext: CurrEmotContext | null
}> {
  const rawB = localStorage.getItem("musicBaseline")
  const rawC = localStorage.getItem("currEmotContext")
  const baseline: MusicBaseline | null = rawB ? (JSON.parse(rawB) as MusicBaseline) : null
  let currEmotContext: CurrEmotContext | null = rawC
    ? (JSON.parse(rawC) as CurrEmotContext)
    : null

  if (!baseline && !currEmotContext) {
    return { baseline: null, currEmotContext: null }
  }

  const spotifyIds = collectSpotifyIdsForEnrichment(currEmotContext)
  if (spotifyIds.length === 0) {
    return { baseline, currEmotContext }
  }

  const response = await fetch("/api/reccobeats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spotifyIds }),
  })

  if (!response.ok) {
    return { baseline, currEmotContext }
  }

  const payload = (await response.json()) as { bySpotifyId?: EnrichMap }
  const bySpotifyId = payload.bySpotifyId
  if (!bySpotifyId || typeof bySpotifyId !== "object") {
    return { baseline, currEmotContext }
  }

  if (currEmotContext) {
    currEmotContext = applyEnrichmentToCurr(currEmotContext, bySpotifyId)
    localStorage.setItem("currEmotContext", JSON.stringify(currEmotContext))
  }

  return { baseline, currEmotContext }
}
