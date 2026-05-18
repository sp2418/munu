import type { CurrEmotContext } from "./reccobeatsEnrich"

const CHECKIN_DRAFT_KEY = "munu.checkInDraft.v1"

export type CheckInDraft = {
  currRant: string
  emotions: string[]
  currTracks: Array<{ id: string; name: string; artists: string[]; imageUrl: string }>
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function readCheckInDraft(): CheckInDraft | null {
  if (typeof sessionStorage === "undefined") return null
  const data = parseJson<CheckInDraft>(sessionStorage.getItem(CHECKIN_DRAFT_KEY))
  if (!data || !Array.isArray(data.emotions) || !Array.isArray(data.currTracks)) return null
  return data
}

export function writeCheckInDraft(draft: CheckInDraft): void {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(CHECKIN_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* quota */
  }
}

export function clearCheckInDraft(): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.removeItem(CHECKIN_DRAFT_KEY)
}

export function currEmotContextToDraft(ctx: CurrEmotContext): CheckInDraft {
  const currTracks: CheckInDraft["currTracks"] = []
  for (const t of ctx.currTracks ?? []) {
    if (Array.isArray(t)) {
      const row = t as unknown[]
      const name = row[0]
      const artists = row[1]
      if (typeof name !== "string" || !Array.isArray(artists)) continue
      const id = typeof row[2] === "string" && row[2] ? row[2] : `anon:${name}`
      const maybeMeta = row[3]
      const imageUrl =
        typeof maybeMeta === "object" &&
        maybeMeta !== null &&
        "imageUrl" in maybeMeta &&
        typeof (maybeMeta as { imageUrl?: string }).imageUrl === "string"
          ? (maybeMeta as { imageUrl: string }).imageUrl
          : ""
      currTracks.push({ id, name, artists: artists as string[], imageUrl })
    } else if (t && typeof t === "object" && "id" in t && typeof t.id === "string") {
      currTracks.push({
        id: t.id,
        name: typeof t.name === "string" ? t.name : "",
        artists: Array.isArray(t.artists) ? t.artists.map(String) : [],
        imageUrl: typeof t.imageUrl === "string" ? t.imageUrl : "",
      })
    }
  }
  return {
    currRant: typeof ctx.currRant === "string" ? ctx.currRant : "",
    emotions: Array.isArray(ctx.emotions) ? [...ctx.emotions] : [],
    currTracks,
  }
}

/** Session draft while in progress; otherwise fall back to saved check-in in localStorage. */
export function readCheckInDraftOrStorage(): CheckInDraft | null {
  const draft = readCheckInDraft()
  if (draft) return draft

  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem("currEmotContext")
  if (!raw) return null
  try {
    return currEmotContextToDraft(JSON.parse(raw) as CurrEmotContext)
  } catch {
    return null
  }
}
