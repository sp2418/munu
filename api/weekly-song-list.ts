import type { VercelRequest, VercelResponse } from "@vercel/node"
import Anthropic from "@anthropic-ai/sdk"
import { cacheKey, getSupabase, type SongRef } from "./_youtube.js"

/**
 * Runs once a week. If the nightly job's to-do list is running low, asks Claude for
 * songs it would likely pick, for the genres with the fewest so far.
 *
 * Costs about 10 cents per genre, and nothing in a week the list doesn't need topping up.
 * Songs aren't checked here: the nightly job skips any YouTube result that doesn't match.
 *
 * `?dryRun=1` reports what would happen without calling Claude or changing anything.
 */

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
const GENRES_PER_WEEK = 5
/** Below this many songs waiting, the nightly job could run out before next week. */
const REFILL_BELOW = 200
/** Tells Claude what's already listed, so each week brings new songs. */
const SONGS_TO_AVOID = 300
/** Leave time to finish cleanly before the function's 300-second limit. */
const CLAUDE_TIMEOUT_MS = 240_000

type Suggested = Partial<SongRef>
type RankedSong = SongRef & { key: string; timesSuggested: number }

async function countWaiting(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("song_seed_queue")
    .select("cache_key", { count: "exact", head: true })
    .eq("status", "pending")
  if (error) throw new Error(`Couldn't count the to-do list: ${error.message}`)
  return count ?? 0
}

async function countGenre(genre: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("song_seed_queue")
    .select("cache_key", { count: "exact", head: true })
    .eq("genre", genre)
  if (error) throw new Error(`Couldn't count ${genre}: ${error.message}`)
  return count ?? 0
}

async function pickGenres(): Promise<string[]> {
  const counts = await Promise.all(
    GENRES.map(async (genre) => ({ genre, songs: await countGenre(genre) })),
  )
  return counts
    .sort((a, b) => a.songs - b.songs)
    .slice(0, GENRES_PER_WEEK)
    .map((entry) => entry.genre)
}

async function songsToAvoid(genre: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("song_seed_queue")
    .select("title, artist")
    .eq("genre", genre)
    .order("times_suggested", { ascending: false })
    .limit(SONGS_TO_AVOID)
  if (error) throw new Error(`Couldn't read ${genre}: ${error.message}`)
  return ((data ?? []) as SongRef[]).map((song) => `${song.title} by ${song.artist}`)
}

async function askClaude(
  client: Anthropic,
  genre: string,
  avoid: string[],
): Promise<Record<string, Suggested[]>> {
  const alreadyListed =
    avoid.length > 0
      ? `\n\nThese songs are already listed, so choose different ones:\n${avoid.join("\n")}`
      : ""

  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You build music-therapy playlists that move someone gradually toward a feeling.

For a listener whose favorite genre is ${genre}, list ${SONGS_PER_FEELING} songs you would most likely choose for each of these destination feelings: ${FEELINGS.join(", ")}.

Stay within ${genre}. Only list songs you are confident exist. Use only the song title and the primary artist, with no featured artists or notes in those fields.${alreadyListed}

Return ONLY a JSON object with each feeling as a key, like {"Calm": [{"title": "...", "artist": "..."}]}.`,
      },
    ],
  })

  const block = msg.content.find((item) => item.type === "text")
  if (!block || block.type !== "text") throw new Error(`No text returned for ${genre}`)
  return JSON.parse(block.text.replace(/```json|```/g, "").trim())
}

/** Songs suggested for several feelings come first, as they're likeliest to be picked. */
function rankSongs(byFeeling: Record<string, Suggested[]>): RankedSong[] {
  const songs = new Map<string, RankedSong>()

  for (const feeling of FEELINGS) {
    const suggested = byFeeling[feeling]
    if (!Array.isArray(suggested)) continue

    for (const { title, artist } of suggested) {
      if (!title || !artist) continue
      const key = cacheKey({ title, artist })
      // Titles in other alphabets lose their letters here, so their keys can't be trusted.
      if (key.startsWith("|") || key.endsWith("|")) continue

      const existing = songs.get(key)
      if (existing) existing.timesSuggested += 1
      else songs.set(key, { title, artist, key, timesSuggested: 1 })
    }
  }

  return [...songs.values()].sort((a, b) => b.timesSuggested - a.timesSuggested)
}

async function refillGenre(client: Anthropic, genre: string) {
  const suggested = rankSongs(await askClaude(client, genre, await songsToAvoid(genre)))
  if (suggested.length === 0) return { genre, suggested: 0, added: 0 }

  const { data: saved, error: savedError } = await getSupabase()
    .from("youtube_video_cache")
    .select("cache_key")
    .in("cache_key", suggested.map((song) => song.key))
  if (savedError) throw new Error(`Couldn't read saved videos: ${savedError.message}`)

  const savedKeys = new Set((saved ?? []).map((row: { cache_key: string }) => row.cache_key))
  const rows = suggested
    .filter((song) => !savedKeys.has(song.key))
    .map((song, rotation) => ({
      cache_key: song.key,
      title: song.title,
      artist: song.artist,
      genre,
      source_rank: 1,
      rotation,
      times_suggested: song.timesSuggested,
      status: "pending",
    }))

  // ignoreDuplicates keeps any song already marked as needed by a real playlist.
  const { error } = await getSupabase()
    .from("song_seed_queue")
    .upsert(rows, { onConflict: "cache_key", ignoreDuplicates: true })
  if (error) throw new Error(`Couldn't save ${genre}: ${error.message}`)

  return { genre, suggested: suggested.length, added: rows.length }
}

export default async function handleWeeklySongList(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const dryRun = req.query.dryRun === "1"

  try {
    const waiting = await countWaiting()
    if (waiting >= REFILL_BELOW) {
      const report = { dryRun, waiting, refilled: false }
      console.log("[weekly-song-list]", JSON.stringify(report))
      return res.status(200).json(report)
    }

    const genres = await pickGenres()
    if (dryRun) return res.status(200).json({ dryRun, waiting, refilled: false, genres })

    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
      timeout: CLAUDE_TIMEOUT_MS,
      maxRetries: 0,
    })
    const results = await Promise.allSettled(genres.map((genre) => refillGenre(client, genre)))

    const finished = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    )
    const failed = results.flatMap((result, index) =>
      result.status === "rejected" ? [genres[index]] : [],
    )
    results.forEach((result) => {
      if (result.status === "rejected") console.error("[weekly-song-list]", result.reason)
    })

    const report = { dryRun, waiting, refilled: true, finished, failed }
    console.log("[weekly-song-list]", JSON.stringify(report))
    return res.status(200).json(report)
  } catch (err) {
    console.error("[weekly-song-list]", err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    })
  }
}
