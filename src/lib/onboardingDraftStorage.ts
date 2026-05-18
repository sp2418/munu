import type { MusicBaseline } from "./reccobeatsEnrich"

const ONBOARDING_DRAFT_KEY = "munu.onboardingDraft.v1"

export type OnboardingDraft = {
  listGenres: string[]
  listContexts: string[]
  additionalContext: string
  listOfArtists: Array<{ id: string; name: string; imageUrl: string }>
  listOfTracks: Array<{ id: string; name: string; artists: string[]; imageUrl: string }>
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
  if (!data || !Array.isArray(data.listGenres)) return null
  return data
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

/** When a full baseline was saved to localStorage, prefer that over the session draft. */
export function readOnboardingDraftOrBaseline(): OnboardingDraft | null {
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem("musicBaseline")
    if (raw) {
      try {
        const baseline = JSON.parse(raw) as MusicBaseline
        return baselineToDraft(baseline)
      } catch {
        /* fall through */
      }
    }
  }
  return readOnboardingDraft()
}

function baselineToDraft(baseline: MusicBaseline): OnboardingDraft {
  const listOfArtists: OnboardingDraft["listOfArtists"] = []
  for (const a of baseline.favArtists ?? []) {
    if (typeof a === "string" && a.trim()) {
      listOfArtists.push({ id: a, name: a, imageUrl: "" })
    } else if (a && typeof a === "object" && "id" in a && "name" in a) {
      listOfArtists.push({
        id: String(a.id),
        name: String(a.name),
        imageUrl: typeof a.imageUrl === "string" ? a.imageUrl : "",
      })
    }
  }

  const listOfTracks: OnboardingDraft["listOfTracks"] = []
  for (const row of baseline.favTracks ?? []) {
    if (!Array.isArray(row) || row.length < 2) continue
    const name = row[0]
    const artists = row[1]
    if (typeof name !== "string" || !Array.isArray(artists)) continue
    const id = typeof row[2] === "string" && row[2] ? row[2] : `anon:${name}`
    const imageUrl =
      typeof row[3] === "string"
        ? row[3]
        : row[3] && typeof row[3] === "object" && "imageUrl" in row[3]
          ? String((row[3] as { imageUrl?: string }).imageUrl ?? "")
          : ""
    listOfTracks.push({ id, name, artists: artists as string[], imageUrl })
  }

  return {
    listGenres: [...(baseline.favGenres ?? [])],
    listContexts: [...(baseline.personalContexts ?? [])],
    additionalContext: typeof baseline.addContext === "string" ? baseline.addContext : "",
    listOfArtists,
    listOfTracks,
  }
}
