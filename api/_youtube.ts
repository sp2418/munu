import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import ws from "ws"

/** Files starting with `_` are shared code, not routes. */

let supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (supabase) return supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env and restart the local API server."
    )
  }
  // Node 20 has no native WebSocket; supabase-js requires one even for REST-only use.
  supabase = createClient(url, key, {
    realtime: { transport: ws as unknown as typeof WebSocket },
  })
  return supabase
}

export type SongRef = {
  title: string
  artist: string
}

type YtSearchItem = {
  id?: { videoId?: string }
  snippet?: { title?: string; channelTitle?: string }
}

type YtErrorBody = {
  error?: { message?: string; errors?: { reason?: string }[] }
}

export type SearchResult = {
  videoId: string | null
  /** The video's title and channel, for checking it's really this song. */
  videoDetails: string
  /** True when YouTube refused because today's allowance has run out. */
  quotaExceeded: boolean
  /** True when the search itself failed, so "no video" can't be trusted. */
  failed: boolean
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")   // strip (feat. X), [Remastered], etc.
    .replace(/[^a-z0-9\s]/g, "")        // strip punctuation
    .trim()
}

export function cacheKey(song: SongRef): string {
  return `${normalize(song.artist)}|${normalize(song.title)}`
}

function compact(s: string): string {
  const decoded = s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  return normalize(decoded).replace(/\s/g, "")
}

/** YouTube answers a made-up song with its closest match, so check the result names it. */
export function videoMatchesSong(videoDetails: string, song: SongRef): boolean {
  const details = compact(videoDetails)
  return details.includes(compact(song.title)) && details.includes(compact(song.artist))
}

export async function getCachedVideoId(key: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("youtube_video_cache")
    .select("video_id")
    .eq("cache_key", key)
    .maybeSingle()

  if (error) {
    console.error("[supabase-cache] Read error:", error.message)
    return null
  }
  return data?.video_id ?? null
}

export async function cacheVideoId(key: string, videoId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("youtube_video_cache")
    .upsert(
      { cache_key: key, video_id: videoId, resolved_at: new Date().toISOString() },
      { onConflict: "cache_key" },
    )

  if (error) {
    console.error("[supabase-cache] Write/Upsert error:", error.message)
  }
}

/** One search.list call per song, from the daily search allowance. */
export async function searchYoutube(song: SongRef): Promise<SearchResult> {
  const query = `${song.artist} ${song.title} official audio`
  const url = new URL("https://www.googleapis.com/youtube/v3/search")
  url.search = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoCategoryId: "10",
    maxResults: "1",
    key: process.env.YOUTUBE_API_KEY!,
  }).toString()

  const ytRes = await fetch(url)
  const data = await ytRes.json()
  if (!ytRes.ok) {
    const body = data as YtErrorBody
    const reasons = body.error?.errors?.map((e) => e.reason ?? "").join(",") ?? ""
    console.warn("[youtube-search] search failed:", body.error?.message ?? ytRes.status)
    return {
      videoId: null,
      videoDetails: "",
      quotaExceeded: ytRes.status === 403 && /quota|limit/i.test(reasons),
      failed: true,
    }
  }
  const item = data.items?.[0] as YtSearchItem | undefined
  return {
    videoId: item?.id?.videoId ?? null,
    videoDetails: `${item?.snippet?.title ?? ""} ${item?.snippet?.channelTitle ?? ""}`,
    quotaExceeded: false,
    failed: false,
  }
}

/**
 * Remembers a song a real playlist needed but couldn't find, so tonight's job looks it
 * up first. Never fails the playlist if this can't be saved.
 */
export async function rememberMissedSong(key: string, song: SongRef): Promise<void> {
  const { error } = await getSupabase()
    .from("song_seed_queue")
    .upsert(
      {
        cache_key: key,
        title: song.title,
        artist: song.artist,
        source_rank: 0,
        status: "pending",
      },
      { onConflict: "cache_key" },
    )

  if (error) {
    console.error("[song-seed-queue] Write error:", error.message)
  }
}
