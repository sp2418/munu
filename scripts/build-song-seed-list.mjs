/**
 * Fills the nightly job's to-do list with songs Claude is likely to pick.
 *
 * Makes one Claude call per genre (20 calls, roughly $2), checks each song on Spotify,
 * and adds the real ones to `song_seed_queue`. Uses no YouTube searches.
 *
 *   node --env-file=.env scripts/build-song-seed-list.mjs
 *   node --env-file=.env scripts/build-song-seed-list.mjs --genres=Rock,Folk --dry-run
 */
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import ws from "ws"

const GENRES = [
  "Hip Hop", "R&B", "Pop", "Rock", "Indie", "Jazz", "Classical", "Electronic", "Latin",
  "Afrobeats", "Country", "Metal", "Folk", "Gospel", "Reggae", "Blues", "Soul", "Punk",
  "Alternative", "Dance",
]

const FEELINGS = [
  "Calm", "Comforted", "Ready to rest", "Reflective", "Lighthearted", "Happy", "Energized",
  "Confident",
]

const SONGS_PER_FEELING = 8
const SPOTIFY_DELAY_MS = 200

const dryRun = process.argv.includes("--dry-run")
const genresArg = process.argv.find((arg) => arg.startsWith("--genres="))
const genres = genresArg ? genresArg.slice("--genres=".length).split(",") : GENRES

/** Matches cacheKey() in api/_youtube.ts, so queued songs line up with saved ones. */
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

function matches(found, wanted) {
  const clean = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  return clean(found).includes(clean(wanted))
}

async function getSpotifyToken() {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64")
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error("Couldn't get a Spotify token")
  return data.access_token
}

async function isRealSong(token, song) {
  const q = `track:"${song.title}" artist:"${song.artist}"`
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") ?? 2)
      await new Promise((resolve) => setTimeout(resolve, (wait + 1) * 1000))
      continue
    }
    if (!res.ok) return false
    const data = await res.json()
    return (data.tracks?.items ?? []).some(
      (track) =>
        matches(track.name, song.title) &&
        track.artists.some((artist) => matches(artist.name, song.artist)),
    )
  }
  return false
}

async function askClaude(client, genre) {
  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You build music-therapy playlists that move someone gradually toward a feeling.

For a listener whose favorite genre is ${genre}, list ${SONGS_PER_FEELING} songs you would most likely choose for each of these destination feelings: ${FEELINGS.join(", ")}.

Stay within ${genre}. Only list songs you are confident exist. Use only the song title and the primary artist, with no featured artists or notes in those fields.

Return ONLY a JSON object with each feeling as a key, like {"Calm": [{"title": "...", "artist": "..."}]}.`,
      },
    ],
  })

  const block = msg.content.find((item) => item.type === "text")
  if (!block) throw new Error(`No text returned for ${genre}`)
  return JSON.parse(block.text.replace(/```json|```/g, "").trim())
}

/** Most-suggested songs first, taking feelings in turn so a genre stays balanced. */
function rankForGenre(byFeeling) {
  const songs = new Map()
  const lists = FEELINGS.map((feeling) => byFeeling[feeling] ?? [])

  for (const list of lists) {
    for (const song of list) {
      if (!song?.title || !song?.artist) continue
      const key = `${normalize(song.artist)}|${normalize(song.title)}`
      if (key.startsWith("|") || key.endsWith("|")) continue
      const existing = songs.get(key)
      if (existing) existing.timesSuggested += 1
      else songs.set(key, { ...song, key, timesSuggested: 1 })
    }
  }

  const ordered = []
  const seen = new Set()
  const longest = Math.max(0, ...lists.map((list) => list.length))
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const song = list[i]
      if (!song?.title || !song?.artist) continue
      const key = `${normalize(song.artist)}|${normalize(song.title)}`
      const entry = songs.get(key)
      if (entry && !seen.has(key)) {
        seen.add(key)
        ordered.push(entry)
      }
    }
  }
  return ordered.sort((a, b) => b.timesSuggested - a.timesSuggested)
}

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws },
})
const spotifyToken = await getSpotifyToken()

const queued = new Map()
const summary = []

for (const genre of genres) {
  const ranked = rankForGenre(await askClaude(anthropic, genre))
  let rotation = 0
  let real = 0

  for (const song of ranked) {
    await new Promise((resolve) => setTimeout(resolve, SPOTIFY_DELAY_MS))
    if (queued.has(song.key) || !(await isRealSong(spotifyToken, song))) continue
    queued.set(song.key, {
      cache_key: song.key,
      title: song.title,
      artist: song.artist,
      genre,
      source_rank: 1,
      rotation,
      times_suggested: song.timesSuggested,
      status: "pending",
    })
    rotation += 1
    real += 1
  }

  summary.push({ genre, suggested: ranked.length, real })
  console.log(`${genre}: ${real} of ${ranked.length} confirmed on Spotify`)
}

const rows = [...queued.values()]
const { data: saved, error: savedError } = await supabase
  .from("youtube_video_cache")
  .select("cache_key")
  .in("cache_key", rows.map((row) => row.cache_key))
if (savedError) throw new Error(savedError.message)

const savedKeys = new Set((saved ?? []).map((row) => row.cache_key))
const toAdd = rows.filter((row) => !savedKeys.has(row.cache_key))

console.table(summary)
console.log(`${toAdd.length} new songs to add (${savedKeys.size} already saved).`)
console.log(toAdd.slice(0, 10).map((row) => `${row.genre}: ${row.title} by ${row.artist}`).join("\n"))

if (dryRun) {
  console.log("Dry run: nothing was added.")
} else {
  // ignoreDuplicates keeps any song already marked as needed by a real playlist.
  const { error } = await supabase
    .from("song_seed_queue")
    .upsert(toAdd, { onConflict: "cache_key", ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  console.log("Added to the to-do list.")
}
