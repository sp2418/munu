import type { CurrEmotContext, DesiredFeelingId, MusicBaseline } from "./reccobeatsEnrich"

const ONBOARDING_DRAFT_KEY = "munu.onboardingDraft.v1"

export type OnboardingDraft = {
  listGenres: string[]
  currRant: string
  currTracks: Array<{ id: string; name: string; artists: string[]; imageUrl: string }>
  desiredFeeling: DesiredFeelingId | ""
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function readOnboardingDraft(): OnboardingDraft | null {
  if (typeof sessionStorage === "undefined") return null
  const data = parseJson<OnboardingDraft>(sessionStorage.getItem(ONBOARDING_DRAFT_KEY))
  if (!data || !Array.isArray(data.listGenres) || !Array.isArray(data.currTracks)) return null
  return {
    listGenres: data.listGenres,
    currRant: typeof data.currRant === "string" ? data.currRant : "",
    currTracks: data.currTracks,
    desiredFeeling: typeof data.desiredFeeling === "string" ? data.desiredFeeling : "",
  }
}

export function writeOnboardingDraft(draft: OnboardingDraft): void {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* quota */
  }
}

export function clearOnboardingDraft(): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.removeItem(ONBOARDING_DRAFT_KEY)
}

function currTracksFromPersisted(
  rows: CurrEmotContext["currTracks"] | undefined,
): OnboardingDraft["currTracks"] {
  const currTracks: OnboardingDraft["currTracks"] = []
  for (const t of rows ?? []) {
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
  return currTracks
}

/** Prefer saved localStorage profile over the in-progress session draft. */
export function readOnboardingDraftOrStorage(): OnboardingDraft | null {
  if (typeof localStorage !== "undefined") {
    const rawB = localStorage.getItem("musicBaseline")
    const rawC = localStorage.getItem("currEmotContext")
    if (rawB || rawC) {
      try {
        const baseline = rawB ? (JSON.parse(rawB) as MusicBaseline) : null
        const checkIn = rawC ? (JSON.parse(rawC) as CurrEmotContext) : null
        return {
          listGenres: [...(baseline?.favGenres ?? [])],
          currRant: typeof checkIn?.currRant === "string" ? checkIn.currRant : "",
          currTracks: currTracksFromPersisted(checkIn?.currTracks),
          desiredFeeling:
            typeof checkIn?.desiredFeeling === "string" ? checkIn.desiredFeeling : "",
        }
      } catch {
        /* fall through */
      }
    }
  }
  return readOnboardingDraft()
}
