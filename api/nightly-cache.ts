import type { VercelRequest, VercelResponse } from "@vercel/node"
import {
  cacheKey,
  cacheVideoId,
  getCachedVideoId,
  getSupabase,
  searchYoutube,
} from "./_youtube.js"

/**
 * Runs once a night, just before YouTube's daily reset at midnight Pacific.
 *
 * 1. Rechecks saved videos before they reach YouTube's 30-day storage limit.
 * 2. Spends whatever searches are left today on the song to-do list.
 *
 * `?dryRun=1` reports what would happen without changing anything or using searches.
 */

/** Recheck a little early so nothing passes 30 days if a night is missed. */
const RECHECK_AFTER_DAYS = 25
const VIDEOS_PER_CHECK = 50
const MAX_RECHECKS_PER_NIGHT = 5000
const MAX_SEARCHES_PER_NIGHT = 100
/** Leave time to finish cleanly before the function's 300-second limit. */
const TIME_BUDGET_MS = 240_000

type CacheRow = { cache_key: string; video_id: string }
type QueueRow = { cache_key: string; title: string; artist: string }

async function findExistingVideoIds(ids: string[]): Promise<Set<string> | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos")
  url.search = new URLSearchParams({
    part: "id",
    id: ids.join(","),
    maxResults: String(VIDEOS_PER_CHECK),
    key: process.env.YOUTUBE_API_KEY!,
  }).toString()

  const res = await fetch(url)
  if (!res.ok) {
    console.warn("[nightly-cache] videos.list failed:", res.status)
    return null
  }
  const data = (await res.json()) as { items?: { id?: string }[] }
  return new Set((data.items ?? []).map((item) => item.id ?? ""))
}

async function recheckSavedVideos(dryRun: boolean) {
  const cutoff = new Date(Date.now() - RECHECK_AFTER_DAYS * 86_400_000).toISOString()
  const { data, error } = await getSupabase()
    .from("youtube_video_cache")
    .select("cache_key, video_id")
    .lt("resolved_at", cutoff)
    .order("resolved_at", { ascending: true })
    .limit(MAX_RECHECKS_PER_NIGHT)

  if (error) throw new Error(`Couldn't read saved videos: ${error.message}`)

  const rows = (data ?? []) as CacheRow[]
  let stillThere = 0
  let removed = 0
  let failedBatches = 0

  for (let i = 0; i < rows.length; i += VIDEOS_PER_CHECK) {
    const batch = rows.slice(i, i + VIDEOS_PER_CHECK)
    const existing = await findExistingVideoIds(batch.map((row) => row.video_id))

    // A failed check says nothing about the videos, so never delete on one.
    if (!existing) {
      failedBatches += 1
      continue
    }

    const live = batch.filter((row) => existing.has(row.video_id))
    const gone = batch.filter((row) => !existing.has(row.video_id))
    stillThere += live.length
    removed += gone.length
    if (dryRun) continue

    if (live.length > 0) {
      const { error: updateError } = await getSupabase()
        .from("youtube_video_cache")
        .update({ resolved_at: new Date().toISOString() })
        .in("cache_key", live.map((row) => row.cache_key))
      if (updateError) console.error("[nightly-cache] update failed:", updateError.message)
    }
    if (gone.length > 0) {
      const { error: deleteError } = await getSupabase()
        .from("youtube_video_cache")
        .delete()
        .in("cache_key", gone.map((row) => row.cache_key))
      if (deleteError) console.error("[nightly-cache] delete failed:", deleteError.message)
    }
  }

  return { due: rows.length, stillThere, removed, failedBatches }
}

async function markQueued(key: string, status: "done" | "not_found") {
  const { error } = await getSupabase()
    .from("song_seed_queue")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("cache_key", key)
  if (error) console.error("[nightly-cache] queue update failed:", error.message)
}

async function growSavedSongs(dryRun: boolean, startedAt: number) {
  // Missed songs first, then one song per genre in turn, most-suggested first.
  const { data, error } = await getSupabase()
    .from("song_seed_queue")
    .select("cache_key, title, artist")
    .eq("status", "pending")
    .order("source_rank", { ascending: true })
    .order("rotation", { ascending: true })
    .order("genre", { ascending: true })
    .limit(MAX_SEARCHES_PER_NIGHT * 2)

  if (error) throw new Error(`Couldn't read the song to-do list: ${error.message}`)

  const queue = (data ?? []) as QueueRow[]
  if (dryRun) return { waiting: queue.length, added: 0, alreadySaved: 0, notFound: 0, searches: 0 }

  let added = 0
  let alreadySaved = 0
  let notFound = 0
  let searches = 0
  let ranOutOfSearches = false

  for (const row of queue) {
    if (searches >= MAX_SEARCHES_PER_NIGHT || Date.now() - startedAt > TIME_BUDGET_MS) break

    const song = { title: row.title, artist: row.artist }
    const key = cacheKey(song)
    if (await getCachedVideoId(key)) {
      alreadySaved += 1
      await markQueued(row.cache_key, "done")
      continue
    }

    const { videoId, quotaExceeded, failed } = await searchYoutube(song)
    if (quotaExceeded) {
      ranOutOfSearches = true
      break
    }
    searches += 1
    // Leave the song on the list to try again another night.
    if (failed) continue
    if (videoId) {
      await cacheVideoId(key, videoId)
      await markQueued(row.cache_key, "done")
      added += 1
    } else {
      await markQueued(row.cache_key, "not_found")
      notFound += 1
    }
  }

  return { waiting: queue.length, added, alreadySaved, notFound, searches, ranOutOfSearches }
}

export default async function handleNightlyCache(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const dryRun = req.query.dryRun === "1"
  const startedAt = Date.now()

  try {
    const recheck = await recheckSavedVideos(dryRun)
    // A problem with the to-do list shouldn't hide or undo the 30-day check.
    const grow = await growSavedSongs(dryRun, startedAt).catch((err: unknown) => ({
      error: err instanceof Error ? err.message : "Couldn't grow saved songs",
    }))
    const report = { dryRun, recheck, grow, seconds: Math.round((Date.now() - startedAt) / 1000) }
    console.log("[nightly-cache]", JSON.stringify(report))
    return res.status(200).json(report)
  } catch (err) {
    console.error("[nightly-cache]", err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    })
  }
}
