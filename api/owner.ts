import { timingSafeEqual } from "node:crypto"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { ownerCookie } from "./_limits.js"

function sameKey(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Visit /api/owner?key=... once per browser to skip the per-person limits there. */
export default function handleOwner(req: VercelRequest, res: VercelResponse) {
  const expected = process.env.OWNER_KEY
  const given = req.query.key

  if (!expected || typeof given !== "string" || !sameKey(given, expected)) {
    return res.status(404).json({ error: "Not found" })
  }

  res.setHeader("Set-Cookie", ownerCookie())
  res.setHeader("Referrer-Policy", "no-referrer")
  return res.status(200).send("This browser now skips MuNu's per-person limits.")
}
