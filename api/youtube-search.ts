import type { VercelRequest, VercelResponse } from "@vercel/node"
import {
  cacheKey,
  cacheVideoId,
  getCachedVideoId,
  rememberMissedSong,
  searchYoutube,
  type SongRef,
} from "./_youtube.js"

/** Use cached id when present; only search (and upsert) on a miss. */
async function resolveVideoId(
  song: SongRef,
  state: { outOfSearches: boolean },
): Promise<string | null> {
  const key = cacheKey(song)
  const cached = await getCachedVideoId(key)
  if (cached) return cached

  if (!state.outOfSearches) {
    const { videoId, quotaExceeded } = await searchYoutube(song)
    if (videoId) await cacheVideoId(key, videoId)
    if (!quotaExceeded) return videoId
    state.outOfSearches = true
  }

  // Today's searches are gone, so tonight's job can find this song for next time.
  await rememberMissedSong(key, song)
  return null
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

    const searchState = { outOfSearches: false }

    for (const song of journeySongs.slice(0, 10)) {
      const videoId = await resolveVideoId(song, searchState)
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
