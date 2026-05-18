/**
 * One-off: resolve ViVi Spotify IDs into static persona storage modules.
 * Run with API up: npm run dev:api (port 3001), then: node scripts/bake-vivi-storage.mjs
 */
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const { viviFollowAlongPersona } = await import("../src/personas/vivi.ts")

const API = "http://127.0.0.1:3001"

async function spotifyToken() {
  const res = await fetch(`${API}/api/spotify-token`)
  if (!res.ok) throw new Error(`token ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function searchArtist(token, q) {
  const res = await fetch(
    `${API}/api/spotify-search?q=${encodeURIComponent(q)}&type=artist&token=${encodeURIComponent(token)}`,
  )
  return res.json()
}

async function searchTrack(token, name, artist) {
  const res = await fetch(
    `${API}/api/spotify-search?q=${encodeURIComponent(name)}&type=track&artist=${encodeURIComponent(artist)}&token=${encodeURIComponent(token)}`,
  )
  return res.json()
}

const token = await spotifyToken()
const def = viviFollowAlongPersona

const favArtists = []
for (const q of def.onboarding.favArtistSearchQueries) {
  const r = await searchArtist(token, q)
  const a = r.artists?.items?.[0]
  if (a) favArtists.push({ id: a.id, name: a.name, imageUrl: a.images?.[0]?.url ?? "" })
}

const favTracks = []
for (const { name, artist } of def.onboarding.favSongQueries) {
  const r = await searchTrack(token, name, artist)
  const t = r.tracks?.items?.[0]
  if (t) {
    const row = [t.name, t.artists.map((x) => x.name), t.id]
    if (t.album?.images?.[0]?.url) row.push(t.album.images[0].url)
    favTracks.push(row)
  }
}

const currTracks = []
for (const { name, artist } of def.checkIn.recentSongQueries) {
  const r = await searchTrack(token, name, artist)
  const t = r.tracks?.items?.[0]
  if (t) {
    currTracks.push({
      id: t.id,
      name: t.name,
      artists: t.artists.map((x) => x.name),
      imageUrl: t.album?.images?.[0]?.url ?? "",
    })
  }
}

const musicBaseline = {
  favGenres: def.onboarding.favGenres,
  favArtists,
  favTracks,
  personalContexts: def.onboarding.personalContexts,
  addContext: def.onboarding.addContext,
}

const currEmotContext = {
  currRant: def.checkIn.currRant,
  emotions: def.checkIn.emotions,
  currTracks,
}

const baselineOut = `import type { MusicBaseline } from "../lib/reccobeatsEnrich"

/** ViVi walkthrough — pre-baked \`musicBaseline\` for localStorage / session drafts. */
export const viviMusicBaseline: MusicBaseline = ${JSON.stringify(musicBaseline, null, 2)}
`

const checkInOut = `import type { CurrEmotContext } from "../lib/reccobeatsEnrich"

/** ViVi walkthrough — pre-baked \`currEmotContext\` for localStorage / session drafts. */
export const viviCurrEmotContext: CurrEmotContext = ${JSON.stringify(currEmotContext, null, 2)}
`

writeFileSync(join(root, "src/personas/vivi-music-baseline.ts"), baselineOut)
writeFileSync(join(root, "src/personas/vivi-curr-emot-context.ts"), checkInOut)
console.log("Wrote vivi-music-baseline.ts and vivi-curr-emot-context.ts")
