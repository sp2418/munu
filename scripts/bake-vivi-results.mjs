/**
 * Bake ViVi Results into src/personas/vivi-results.ts
 *
 * Preferred: export from a walkthrough run you like (on Results, DevTools console):
 *
 *   copy(JSON.stringify({
 *     parsed: JSON.parse(localStorage.getItem("munu.claudeResponseCache.v1")).parsed,
 *     journeySongsResolved: JSON.parse(localStorage.getItem("munu.resultsJourneyRows.v1")).songs,
 *   }, null, 2))
 *
 * Save clipboard to scripts/vivi-results-export.json, then:
 *   npm run bake:vivi-results
 *
 * Fallback (needs API + Anthropic): fetches Claude and resolves carousel via Spotify + iTunes.
 *   npm run dev:api   # port 3001
 *   npm run bake:vivi-results
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const exportCandidates = [
  join(root, "scripts/vivi-results-export.json"),
  join(root, "scripts/bake-vivi-results-export.json"),
]
const exportPath = exportCandidates.find((p) => existsSync(p))
const outPath = join(root, "src/personas/vivi-results.ts")

const API = "http://127.0.0.1:3001"

async function spotifyToken() {
  const res = await fetch(`${API}/api/spotify-token`)
  if (!res.ok) throw new Error(`token ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function verifySongs(token, songs) {
  const verified = []
  const normalize = (str) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  for (const song of songs) {
    await new Promise((r) => setTimeout(r, 200))
    const title = song.title
    const artist = song.artist
    const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()
    const res = await fetch(
      `${API}/api/spotify-search?q=${encodeURIComponent(title)}&type=track&artist=${encodeURIComponent(cleanArtist)}&token=${encodeURIComponent(token)}`,
    )
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000))
      continue
    }
    const result = await res.json()
    const items = result.tracks?.items
    if (!items?.length) continue
    const returnedTrack = items[0]
    const trackMatches =
      returnedTrack.name && normalize(returnedTrack.name).includes(normalize(title))
    const artistMatches = returnedTrack.artists.some((a) =>
      normalize(a.name).includes(normalize(cleanArtist)),
    )
    if (trackMatches && artistMatches) {
      verified.push({
        ...song,
        imageUrl: returnedTrack.album?.images?.[0]?.url ?? null,
      })
    }
  }
  return verified
}

async function addPreviews(songs) {
  const out = []
  const normalize = (str) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  for (const song of songs) {
    const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${song.title} ${cleanArtist}`)}&media=music&entity=song&limit=1`,
    )
    const data = await res.json()
    const result = data.results?.[0]
    let previewUrl = null
    if (result) {
      const trackMatches = normalize(result.trackName).includes(normalize(song.title))
      const artistMatches = normalize(result.artistName).includes(normalize(cleanArtist))
      if (trackMatches && artistMatches) previewUrl = result.previewUrl ?? null
    }
    out.push({ ...song, previewUrl })
  }
  return out
}

async function fetchFromApi() {
  const { viviMusicBaseline } = await import("../src/personas/vivi-music-baseline.ts")
  const { viviCurrEmotContext } = await import("../src/personas/vivi-curr-emot-context.ts")

  const url = `${API}/api/claude?baseline=${encodeURIComponent(JSON.stringify(viviMusicBaseline))}&currEmotContext=${encodeURIComponent(JSON.stringify(viviCurrEmotContext))}`
  console.log("Fetching Claude response (may take a minute)…")
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`)
  if (typeof data.response !== "string") throw new Error("Missing model response")

  const cleaned = data.response.replace(/```json|```/g, "").trim()
  const parsed = JSON.parse(cleaned)
  const token = await spotifyToken()
  const verified = await verifySongs(token, parsed.journeySongs ?? [])
  const journeySongsResolved = await addPreviews(verified)
  return { parsed, journeySongsResolved }
}

let payload
if (exportPath) {
  console.log("Reading", exportPath)
  payload = JSON.parse(readFileSync(exportPath, "utf8"))
} else {
  console.log("No export file — calling API at", API)
  payload = await fetchFromApi()
}

if (!payload?.parsed?.insight || !Array.isArray(payload.journeySongsResolved)) {
  throw new Error("Invalid payload: need parsed.insight and journeySongsResolved[]")
}
if (payload.journeySongsResolved.length === 0) {
  throw new Error("journeySongsResolved is empty")
}

const out = `/** Resolved carousel row after Spotify verify + optional iTunes preview. */
export type ViviJourneySongResolved = {
  title: string
  artist: string
  explanation?: string
  imageUrl?: string | null
  previewUrl?: string | null
}

/** Claude JSON payload for Results (\`insight\`, \`isoExplanation\`, \`journeySongs\`, …). */
export type ViviClaudeResultsParsed = {
  insight: string
  isoExplanation: string
  journeySongs: Array<{ title: string; artist: string; explanation?: string }>
  [key: string]: unknown
}

export type ViviBakedResults = {
  parsed: ViviClaudeResultsParsed
  journeySongsResolved: ViviJourneySongResolved[]
}

/**
 * ViVi walkthrough — fixed Results output for every follower.
 * Rebake: \`scripts/vivi-results-export.json\` → \`npm run bake:vivi-results\`
 */
export const viviBakedResults: ViviBakedResults = ${JSON.stringify(payload, null, 2)}

export function hasViviBakedResults(): boolean {
  const { parsed, journeySongsResolved } = viviBakedResults
  return (
    typeof parsed?.insight === "string" &&
    parsed.insight.trim().length > 0 &&
    Array.isArray(journeySongsResolved) &&
    journeySongsResolved.length > 0
  )
}
`

writeFileSync(outPath, out)
console.log(
  `Wrote ${outPath} (${payload.journeySongsResolved.length} carousel songs, insight ${payload.parsed.insight.length} chars)`,
)
