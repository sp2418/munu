import type { VercelRequest, VercelResponse } from "@vercel/node"

const BASE = "https://api.reccobeats.com/v1"
/** ReccoBeats validates `getTracks.ids` size 1–40 */
const TRACK_IDS_CHUNK = 40

function spotifyIdFromHref(href: string): string | null {
  const m = href.match(/spotify\.com\/track\/([^/?#]+)/)
  return m?.[1] ?? null
}

type TrackRow = { id: string; href: string }
type FeatureRow = Record<string, unknown> & { id: string; href: string }

export default async function handleReccoBeats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const body =
      typeof req.body === "string" ? (JSON.parse(req.body) as unknown) : req.body
    const spotifyIdsRaw = (body as { spotifyIds?: unknown })?.spotifyIds
    if (
      !Array.isArray(spotifyIdsRaw) ||
      !spotifyIdsRaw.every((x) => typeof x === "string" && x.length > 0)
    ) {
      return res.status(400).json({ error: "Expected JSON body: { spotifyIds: string[] }" })
    }

    const unique = [...new Set(spotifyIdsRaw as string[])]
    const bySpotifyId: Record<
      string,
      { reccobeatsId: string; audioFeatures: FeatureRow | null } | null
    > = {}

    for (let i = 0; i < unique.length; i += TRACK_IDS_CHUNK) {
      const chunk = unique.slice(i, i + TRACK_IDS_CHUNK)
      const trackUrl = `${BASE}/track?ids=${chunk.map(encodeURIComponent).join(",")}`
      const tr = await fetch(trackUrl)
      const trackText = await tr.text()
      let trackJson: { content?: TrackRow[] }
      try {
        trackJson = JSON.parse(trackText) as { content?: TrackRow[] }
      } catch {
        return res.status(502).json({ error: "Invalid ReccoBeats track response" })
      }

      const tracks = trackJson.content ?? []
      const spotifyToRecco = new Map<string, string>()
      for (const row of tracks) {
        const sid = spotifyIdFromHref(row.href)
        if (sid) spotifyToRecco.set(sid, row.id)
      }

      const reccoIds = [...new Set(spotifyToRecco.values())]
      let featByRecco = new Map<string, FeatureRow>()
      if (reccoIds.length > 0) {
        const afUrl = `${BASE}/audio-features?ids=${reccoIds.map(encodeURIComponent).join(",")}`
        const afRes = await fetch(afUrl)
        const afText = await afRes.text()
        try {
          const afJson = JSON.parse(afText) as { content?: FeatureRow[] }
          featByRecco = new Map((afJson.content ?? []).map((f) => [f.id, f]))
        } catch {
          featByRecco = new Map()
        }
      }

      for (const sid of chunk) {
        const reccoId = spotifyToRecco.get(sid)
        if (!reccoId) {
          bySpotifyId[sid] = null
          continue
        }
        const audioFeatures = featByRecco.get(reccoId) ?? null
        bySpotifyId[sid] = { reccobeatsId: reccoId, audioFeatures }
      }

      if (i + TRACK_IDS_CHUNK < unique.length) {
        await new Promise((r) => setTimeout(r, 150))
      }
    }

    return res.status(200).json({ bySpotifyId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("reccobeats proxy:", error)
    return res.status(500).json({ error: message })
  }
}
