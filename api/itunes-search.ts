import type { VercelRequest, VercelResponse } from "@vercel/node"

const MAX_TERM_LENGTH = 300
const TIMEOUT_MS = 8_000

/**
 * Asks iTunes from the server. Apple redirects requests from iPhone browsers to the
 * Music app, which a web page can't follow, so this can't be a simple pass-through.
 */
export default async function handleItunesSearch(req: VercelRequest, res: VercelResponse) {
    const term = typeof req.query.term === "string" ? req.query.term.trim() : ""
    if (!term || term.length > MAX_TERM_LENGTH) {
        return res.status(400).json({ error: "Expected a search term" })
    }

    const params = new URLSearchParams({ term, media: "music", entity: "song", limit: "1" })

    try {
        const response = await fetch(`https://itunes.apple.com/search?${params}`, {
            headers: { "User-Agent": "MuNu/1.0" },
            redirect: "error",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!response.ok) {
            console.error("[itunes] search failed:", response.status)
            return res.status(502).json({ error: "iTunes search failed" })
        }
        return res.status(200).json(await response.json())
    } catch (error) {
        console.error("[itunes] search failed:", error instanceof Error ? error.message : error)
        return res.status(502).json({ error: "iTunes search failed" })
    }
}
