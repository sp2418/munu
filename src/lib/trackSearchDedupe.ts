/**
 * Collapse near-duplicate Spotify search rows (clean/explicit, title "feat" variants, remaster suffixes).
 * ISRC is intentionally not used here: those variants usually have different ISRCs but feel like duplicates in UI.
 */
export function normalizeTrackTitleForDedup(raw: string): string {
  let s = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")

  s = s.replace(/\s*\(\s*(feat\.?|ft\.?|featuring)\s[^)]+\)/gi, "")
  s = s.replace(/\s*\[\s*(feat\.?|ft\.?|featuring)\s[^\]]+\]/gi, "")
  s = s.replace(/\s+-\s+(feat\.?|ft\.?)\s+.+/i, "")
  s = s.replace(/\s*-\s*remaster(ed)?(\s+\d{4})?\s*$/i, "")
  s = s.replace(/\s*-\s*radio edit\s*$/i, "")
  s = s.replace(/\s*-\s*single version\s*$/i, "")
  return s.trim().replace(/\s+/g, " ")
}

export function spotifyTrackSearchDedupKey(track: {
  name: string
  duration_ms: number
  artists: { id: string }[]
}): string {
  const title = normalizeTrackTitleForDedup(track.name)
  const durationSec = Math.round(track.duration_ms / 1000)
  const primaryId = track.artists[0]?.id ?? ""
  return `${title}|${primaryId}|${durationSec}`
}
