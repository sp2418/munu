import { createHmac, randomUUID } from "node:crypto"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getSupabase } from "./_youtube.js"

/** Files starting with `_` are shared code, not routes. */

const PLAYLISTS_PER_DEVICE = 2
const PLAYLISTS_PER_CONNECTION = 10
const PLAYLISTS_PER_DAY = 50
/** A full playlist of new songs is 10 searches. */
const SEARCHES_PER_DEVICE = PLAYLISTS_PER_DEVICE * 10
const SEARCHES_PER_CONNECTION = 40
/** YouTube's daily allowance of searches. */
const SEARCHES_PER_DAY = 100
/** Two full playlists of new songs, which the nightly job must always leave for people. */
const SEARCHES_KEPT_FOR_PEOPLE = 20
const APP_SEARCHES = "search-app"
/** People are only stopped by YouTube itself, so this bucket just keeps count for them. */
const NEVER_FULL = 1_000_000

const DEVICE_COOKIE = "munu_device"
const OWNER_COOKIE = "munu_owner"
const ONE_YEAR_SECONDS = 31_536_000

export type LimitScope = "device" | "connection" | "app"

export type PlaylistAllowance = {
  /** Which limit was reached, or null if this playlist can go ahead. */
  blockedBy: LimitScope | null
  /** Hands the allowance back, for a playlist that failed. */
  release: () => Promise<void>
}

/** Matches YouTube's reset at midnight Pacific, so everything renews together. */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function deviceIdFromCookie(req: VercelRequest): string | null {
  const match = req.headers.cookie?.match(/(?:^|;\s*)munu_device=([a-f0-9-]{36})(?:;|$)/)
  return match?.[1] ?? null
}

/** A new visitor keeps one ID for the whole request, however many checks it makes. */
const newDeviceIds = new WeakMap<VercelRequest, string>()

function getDeviceId(req: VercelRequest, res: VercelResponse): string {
  const existing = deviceIdFromCookie(req) ?? newDeviceIds.get(req)
  if (existing) return existing

  const id = randomUUID()
  newDeviceIds.set(req, id)
  const secure = process.env.VERCEL_ENV ? "; Secure" : ""
  res.setHeader(
    "Set-Cookie",
    `${DEVICE_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; HttpOnly; SameSite=Lax${secure}`,
  )
  return id
}

function ownerToken(): string | null {
  const key = process.env.OWNER_KEY
  return key ? createHmac("sha256", key).update("munu-owner").digest("hex") : null
}

export function ownerCookie(): string {
  const secure = process.env.VERCEL_ENV ? "; Secure" : ""
  return `${OWNER_COOKIE}=${ownerToken()}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; HttpOnly; SameSite=Lax${secure}`
}

function isOwner(req: VercelRequest): boolean {
  const token = ownerToken()
  const found = req.headers.cookie?.match(/(?:^|;\s*)munu_owner=([a-f0-9]{64})(?:;|$)/)?.[1]
  return Boolean(token && found === token)
}

function getConnection(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"]
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]
  return first?.trim() || "unknown"
}

/**
 * Scrambled and changes every day, so stored counts can't be traced back to a person's
 * connection or linked between days.
 */
function scramble(value: string, day: string): string {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    .update(`${day}:${value}`)
    .digest("hex")
}

function buckets(req: VercelRequest, res: VercelResponse, day: string) {
  return {
    device: scramble(getDeviceId(req, res), day),
    connection: scramble(getConnection(req), day),
  }
}

/** Counts against every limit at once. Returns the bucket that was full, if any. */
async function consume(day: string, names: string[], limits: number[]): Promise<string | null> {
  const { data, error } = await getSupabase().rpc("consume_allowance", {
    p_day: day,
    p_buckets: names,
    p_limits: limits,
  })

  // A counting problem shouldn't take the app down for real people.
  if (error) {
    console.error("[limits] consume failed:", error.message)
    return null
  }
  return (data as string | null) ?? null
}

export async function consumePlaylist(
  req: VercelRequest,
  res: VercelResponse,
): Promise<PlaylistAllowance> {
  const day = today()
  let names = ["app"]
  let limits = [PLAYLISTS_PER_DAY]

  // The owner skips the per-person limits, but still counts towards the app-wide cap.
  if (!isOwner(req)) {
    const { device, connection } = buckets(req, res, day)
    names = [`device:${device}`, `connection:${connection}`, "app"]
    limits = [PLAYLISTS_PER_DEVICE, PLAYLISTS_PER_CONNECTION, PLAYLISTS_PER_DAY]
  }

  const full = await consume(day, names, limits)

  return {
    blockedBy: full ? (full.split(":")[0] as LimitScope) : null,
    release: async () => {
      const { error } = await getSupabase().rpc("release_allowance", {
        p_day: day,
        p_buckets: names,
      })
      if (error) console.error("[limits] release failed:", error.message)
    },
  }
}

/** Whether this person may spend one of today's YouTube searches. */
export async function consumeSearch(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const day = today()

  if (isOwner(req)) {
    await consume(day, [APP_SEARCHES], [NEVER_FULL])
    return true
  }

  const { device, connection } = buckets(req, res, day)
  const full = await consume(
    day,
    [`search-device:${device}`, `search-connection:${connection}`, APP_SEARCHES],
    [SEARCHES_PER_DEVICE, SEARCHES_PER_CONNECTION, NEVER_FULL],
  )
  return full === null
}

/**
 * Whether the nightly job may spend a search, leaving enough for people. Unlike the
 * checks above, this says no if counting breaks, because people come first.
 */
export async function consumeNightlySearch(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("consume_allowance", {
    p_day: today(),
    p_buckets: [APP_SEARCHES],
    p_limits: [SEARCHES_PER_DAY - SEARCHES_KEPT_FOR_PEOPLE],
  })

  if (error) {
    console.error("[limits] nightly count failed:", error.message)
    return false
  }
  return data === null
}

/** Counts are only needed for the current day. */
export async function deleteOldUsageCounts(): Promise<void> {
  const { error } = await getSupabase().from("usage_counters").delete().lt("day", today())
  if (error) console.error("[limits] cleanup failed:", error.message)
}
