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

/** Persisted favourite artist (preferred); legacy onboarding used plain strings */
export type BaselineArtistPersisted = { id: string; name: string; imageUrl: string }

export type MusicBaseline = {
  favGenres: string[]
  favArtists: (string | BaselineArtistPersisted)[]
  favTracks: unknown[]
  personalContexts: string[]
  addContext: string
}

export type CurrEmotTrackObject = {
  id: string
  name: string
  artists: string[]
  imageUrl?: string
  reccobeatsId?: string
  audioFeatures?: ReccoBeatsAudioFeatureRow | null
}

export type CurrEmotContext = {
  currRant: string
  currTracks: ([string, string[]] | CurrEmotTrackObject)[]
  emotions: string[]
}

type EnrichMap = Record<string, ReccoTrackEnrichment | null>

/**
 * Baseline `favTracks` rows are arrays:
 * - Legacy enriched: `[name, artists, id, ReccoTrackEnrichment]`
 * - With album art (before enrich): `[name, artists, id, albumImageUrl]`
 * - With album art (after enrich): `[name, artists, id, albumImageUrl, ReccoTrackEnrichment]`
 */
function isBaselineTupleEnriched(row: unknown[]): boolean {
  if (!Array.isArray(row) || row.length < 4) return false
  const fourth = row[3]
  if (
    fourth != null &&
    typeof fourth === "object" &&
    "reccobeatsId" in (fourth as object)
  ) {
    return true
  }
  const fifth = row[4]
  return (
    row.length >= 5 &&
    fifth != null &&
    typeof fifth === "object" &&
    "reccobeatsId" in (fifth as object)
  )
}

function baselineTupleAlbumImageUrl(row: unknown[]): string | undefined {
  if (!Array.isArray(row) || row.length < 4) return undefined
  const fourth = row[3]
  if (typeof fourth === "string" && fourth.length > 0) return fourth
  return undefined
}

/** Spotify IDs that still need a ReccoBeats lookup (skip already-enriched rows). */
function collectSpotifyIdsForEnrichment(
  baseline: MusicBaseline | null,
  curr: CurrEmotContext | null
): string[] {
  const ids: string[] = []
  if (baseline?.favTracks) {
    for (const row of baseline.favTracks) {
      if (!Array.isArray(row) || row.length < 3) continue
      if (isBaselineTupleEnriched(row)) continue
      const sid = row[2]
      if (typeof sid === "string" && sid.length > 0) ids.push(sid)
    }
  }
  if (curr?.currTracks) {
    for (const t of curr.currTracks) {
      if (Array.isArray(t)) continue
      if ("reccobeatsId" in t) continue
      if (typeof t.id === "string" && t.id.length > 0) ids.push(t.id)
    }
  }
  return [...new Set(ids)]
}

function applyEnrichmentToBaseline(
  baseline: MusicBaseline,
  bySpotifyId: EnrichMap
): MusicBaseline {
  return {
    ...baseline,
    favTracks: baseline.favTracks.map((row) => {
      if (!Array.isArray(row) || row.length < 3 || typeof row[2] !== "string") return row
      if (isBaselineTupleEnriched(row)) return row
      const data = bySpotifyId[row[2]]
      if (!data) return row
      const albumUrl = baselineTupleAlbumImageUrl(row)
      return albumUrl !== undefined
        ? [...row.slice(0, 3), albumUrl, data]
        : [...row.slice(0, 3), data]
    }),
  }
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
 * `musicBaseline` / `currEmotContext` in localStorage, and returns the updated objects.
 * Skips baseline tuples already enriched (`reccobeatsId` in slot 4, or slot 5 when slot 4 holds an album image URL).
 * Skips check-in track objects that already have `reccobeatsId` set.
 */
export async function enrichStoredMusicProfilesWithReccoBeats(): Promise<{
  baseline: MusicBaseline | null
  currEmotContext: CurrEmotContext | null
}> {
  const rawB = localStorage.getItem("musicBaseline")
  const rawC = localStorage.getItem("currEmotContext")
  let baseline: MusicBaseline | null = rawB ? (JSON.parse(rawB) as MusicBaseline) : null
  let currEmotContext: CurrEmotContext | null = rawC
    ? (JSON.parse(rawC) as CurrEmotContext)
    : null

  if (!baseline && !currEmotContext) {
    return { baseline: null, currEmotContext: null }
  }

  const spotifyIds = collectSpotifyIdsForEnrichment(baseline, currEmotContext)
  if (spotifyIds.length === 0) {
    return { baseline, currEmotContext }
  }

  const response = await fetch("/api/reccobeats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spotifyIds }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.warn("ReccoBeats enrich failed:", response.status, err)
    return { baseline, currEmotContext }
  }

  const payload = (await response.json()) as { bySpotifyId?: EnrichMap }
  const bySpotifyId = payload.bySpotifyId
  if (!bySpotifyId || typeof bySpotifyId !== "object") {
    return { baseline, currEmotContext }
  }

  if (baseline) {
    baseline = applyEnrichmentToBaseline(baseline, bySpotifyId)
    localStorage.setItem("musicBaseline", JSON.stringify(baseline))
  }
  if (currEmotContext) {
    currEmotContext = applyEnrichmentToCurr(currEmotContext, bySpotifyId)
    localStorage.setItem("currEmotContext", JSON.stringify(currEmotContext))
  }

  return { baseline, currEmotContext }
}
