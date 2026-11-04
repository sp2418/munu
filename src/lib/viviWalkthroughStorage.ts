import type { CurrEmotContext, MusicBaseline } from "./reccobeatsEnrich"
import { viviCurrEmotContext } from "../personas/vivi-curr-emot-context"
import { viviMusicBaseline } from "../personas/vivi-music-baseline"

/** Session flag: user is in ViVi’s guided walkthrough (UI + draft prefill). */
export const VIVI_WALKTHROUGH_ACTIVE_KEY = "munu.followAlong.vivi"

const DRAFT_BASELINE_KEY = "munu.vivi.draftBaseline"
const DRAFT_CHECKIN_KEY = "munu.vivi.draftCheckIn"

/** Legacy snapshot key — cleared on start/end. */
const LEGACY_SNAPSHOT_KEY = "munu.followAlongSnapshot.v1"

export function isViviWalkthroughActive(): boolean {
  if (typeof sessionStorage === "undefined") return false
  return sessionStorage.getItem(VIVI_WALKTHROUGH_ACTIVE_KEY) === "1"
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getViviDraftBaseline(): MusicBaseline {
  if (typeof sessionStorage !== "undefined") {
    const stored = parseJson<MusicBaseline>(sessionStorage.getItem(DRAFT_BASELINE_KEY))
    if (stored) return stored
  }
  return viviMusicBaseline
}

export function getViviDraftCheckIn(): CurrEmotContext {
  if (typeof sessionStorage !== "undefined") {
    const stored = parseJson<CurrEmotContext>(sessionStorage.getItem(DRAFT_CHECKIN_KEY))
    if (stored) return stored
  }
  return viviCurrEmotContext
}

/** Begin ViVi walkthrough: session drafts only (not `musicBaseline` until onboarding completes). */
export function startViviWalkthrough(): void {
  localStorage.removeItem("musicBaseline")
  localStorage.removeItem("currEmotContext")
  sessionStorage.setItem(VIVI_WALKTHROUGH_ACTIVE_KEY, "1")
  sessionStorage.setItem(DRAFT_BASELINE_KEY, JSON.stringify(viviMusicBaseline))
  sessionStorage.setItem(DRAFT_CHECKIN_KEY, JSON.stringify(viviCurrEmotContext))
  sessionStorage.removeItem(LEGACY_SNAPSHOT_KEY)
}

export function endViviWalkthrough(): void {
  sessionStorage.removeItem(VIVI_WALKTHROUGH_ACTIVE_KEY)
  sessionStorage.removeItem(DRAFT_BASELINE_KEY)
  sessionStorage.removeItem(DRAFT_CHECKIN_KEY)
  sessionStorage.removeItem(LEGACY_SNAPSHOT_KEY)
}

function sortedKey(values: string[]): string {
  return [...values].sort().join("\0")
}

function trackIdsFromCheckIn(checkIn: CurrEmotContext): string[] {
  const ids: string[] = []
  for (const t of checkIn.currTracks ?? []) {
    if (Array.isArray(t)) {
      const row = t as unknown[]
      if (typeof row[2] === "string" && row[2]) ids.push(row[2])
    } else if (t && typeof t === "object" && typeof t.id === "string") {
      ids.push(t.id)
    }
  }
  return ids.sort()
}

/** True when persisted profile matches ViVi’s baked baseline + check-in (e.g. after walkthrough save). */
export function storedProfileMatchesVivi(
  baseline: MusicBaseline,
  checkIn: CurrEmotContext,
): boolean {
  if (checkIn.currRant !== viviCurrEmotContext.currRant) return false
  if (checkIn.desiredFeeling !== viviCurrEmotContext.desiredFeeling) return false
  if (sortedKey(baseline.favGenres) !== sortedKey(viviMusicBaseline.favGenres)) return false
  if (trackIdsFromCheckIn(checkIn).join(",") !== trackIdsFromCheckIn(viviCurrEmotContext).join(",")) {
    return false
  }
  return true
}

/** Use on Results (and similar) to pick ViVi walkthrough UI vs normal “another check-in” flow. */
export function isShowingViviWalkthroughOnResults(
  walkthroughActiveFromContext: boolean,
  baseline: MusicBaseline | null | undefined,
  checkIn: CurrEmotContext | null | undefined,
): boolean {
  if (walkthroughActiveFromContext || isViviWalkthroughActive()) return true
  if (baseline && checkIn) return storedProfileMatchesVivi(baseline, checkIn)
  return false
}
