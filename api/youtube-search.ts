import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import ws from "ws"

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
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

type SongRef = {
  title: string
  artist: string
}

type YtSearchItem = {
  id?: { videoId?: string }
  snippet?: { title?: string; channelTitle?: string }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")   // strip (feat. X), [Remastered], etc.
    .replace(/[^a-z0-9\s]/g, "")        // strip punctuation
    .trim()
}

function cacheKey(song: SongRef): string {
  return `${normalize(song.artist)}|${normalize(song.title)}`
}

async function getCachedVideoId(key: string): Promise<string | null> {
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

async function cacheVideoId(key: string, videoId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("youtube_video_cache")
    .upsert(
      { cache_key: key, video_id: videoId },
      { onConflict: "cache_key" },
    )

  if (error) {
    console.error("[supabase-cache] Write/Upsert error:", error.message)
  }
}

/** One search.list call per song (100 quota units). */
async function searchYoutube(song: SongRef): Promise<string | null> {
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
    console.warn("[youtube-search] search failed:", data?.error?.message ?? ytRes.status)
    return null
  }
  return (data.items?.[0] as YtSearchItem | undefined)?.id?.videoId ?? null
}

/** Use cached id when present; only search (and upsert) on a miss. */
async function resolveVideoId(song: SongRef): Promise<string | null> {
  const key = cacheKey(song)
  const cached = await getCachedVideoId(key)
  if (cached) return cached

  const videoId = await searchYoutube(song)
  if (videoId) await cacheVideoId(key, videoId)
  return videoId
}

function buildPlaylistUrl(videoIds: string[]): string {
  return `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(",")}`
}

export default async function handleYoutubeSearch(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST with { journeySongs }." })
    }

    const raw = req.body?.journeySongs
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ error: "Expected body.journeySongs to be a non-empty array" })
    }

    const journeySongs: SongRef[] = raw.map((song: { title?: unknown; artist?: unknown }) => ({
      title: String(song?.title ?? "").trim(),
      artist: String(song?.artist ?? "").trim(),
    }))

    const tracks: { videoId: string; title: string; artist: string }[] = []

    for (const song of journeySongs.slice(0, 10)) {
      const videoId = await resolveVideoId(song)
      if (videoId) {
        tracks.push({ videoId, title: song.title, artist: song.artist })
      }
    }

    const videoIds = tracks.map((t) => t.videoId)

    if (videoIds.length === 0) {
      return res.status(422).json({ error: "Couldn't resolve any tracks to YouTube videos" })
    }

    return res.status(200).json({
      videoIds,
      tracks,
      playlistUrl: buildPlaylistUrl(videoIds),
      resolvedCount: videoIds.length,
      totalCount: journeySongs.length,
    })
  } catch (err) {
    console.error("[youtube-search]", err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    })
  }
}
