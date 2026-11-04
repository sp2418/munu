export const YOUTUBE_PLAYLIST_HISTORY_KEY = "munu.youtubePlaylistHistory.v1"

const MAX_HISTORY = 30

export type YoutubePlaylistHistoryEntry = {
  createdAt: string
  videoIds: string[]
  playlistUrl: string
}

function sameVideoIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((id, i) => id === b[i])
}

function isValidEntry(value: unknown): value is YoutubePlaylistHistoryEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as YoutubePlaylistHistoryEntry
  return (
    typeof entry.createdAt === "string" &&
    typeof entry.playlistUrl === "string" &&
    Array.isArray(entry.videoIds) &&
    entry.videoIds.length > 0 &&
    entry.videoIds.every((id) => typeof id === "string" && id.length > 0)
  )
}

export function readYoutubePlaylistHistory(): YoutubePlaylistHistoryEntry[] {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(YOUTUBE_PLAYLIST_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry)
  } catch {
    return []
  }
}

export function getLatestYoutubePlaylist(): YoutubePlaylistHistoryEntry | null {
  return readYoutubePlaylistHistory()[0] ?? null
}

/** Prepend a resolved playlist. Dedupes identical video-id lists at the front. */
export function saveYoutubePlaylistToHistory(
  entry: Omit<YoutubePlaylistHistoryEntry, "createdAt"> & { createdAt?: string },
): YoutubePlaylistHistoryEntry[] {
  if (typeof localStorage === "undefined") return []
  if (!entry.videoIds.length || !entry.playlistUrl) {
    return readYoutubePlaylistHistory()
  }

  const nextEntry: YoutubePlaylistHistoryEntry = {
    createdAt: entry.createdAt ?? new Date().toISOString(),
    videoIds: entry.videoIds,
    playlistUrl: entry.playlistUrl,
  }

  const prev = readYoutubePlaylistHistory()
  const withoutDup = prev.filter((item) => !sameVideoIds(item.videoIds, nextEntry.videoIds))
  const next = [nextEntry, ...withoutDup].slice(0, MAX_HISTORY)

  try {
    localStorage.setItem(YOUTUBE_PLAYLIST_HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
  return next
}
