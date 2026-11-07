import type { VercelRequest, VercelResponse } from "@vercel/node"

const REASONS = new Set(["no-matches", "error"])

/** Puts empty playlists in the Vercel logs. Takes a fixed reason only, never song or check-in text. */
export default function handlePlaylistIssue(req: VercelRequest, res: VercelResponse) {
    const reason = typeof req.query.reason === "string" ? req.query.reason : ""
    if (req.method !== "POST" || !REASONS.has(reason)) {
        return res.status(400).json({ error: "Invalid report" })
    }
    console.error("[playlist] came back empty:", reason)
    return res.status(204).end()
}
