import { clearCheckInDraft } from "./checkInDraftStorage"
import { clearOnboardingDraft } from "./onboardingDraftStorage"
import { isViviWalkthroughActive } from "./viviWalkthroughStorage"

const APP_PROGRESS_KEY = "munu.appProgress.v1"

export type AppView = "onboarding" | "checkin" | "results"

export type OnboardingScreenProgress = {
  showWelcomeScreen: boolean
  showDemoScreen: boolean
  showPrepScreen: boolean
  showMusicToMoodBridgeScreen: boolean
  currentQuestion: number
}

export type CheckInScreenProgress = {
  currentQuestion: number
}

export type ResultsScreenProgress = {
  scrollY: number
  playlistRevealAllowed: boolean
}

export type AppProgress = {
  view: AppView
  onboarding?: OnboardingScreenProgress
  checkIn?: CheckInScreenProgress
  results?: ResultsScreenProgress
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Infer stage from persisted profile data (legacy behavior). */
export function inferViewFromStorage(): AppView {
  if (typeof localStorage === "undefined") return "onboarding"
  if (!localStorage.getItem("musicBaseline")) return "onboarding"
  if (!localStorage.getItem("currEmotContext")) return "checkin"
  return "results"
}

function viewAllowedByStorage(view: AppView): boolean {
  if (typeof localStorage === "undefined") return view === "onboarding"
  const hasBaseline = !!localStorage.getItem("musicBaseline")
  const hasCheckIn = !!localStorage.getItem("currEmotContext")
  if (view === "results") return hasBaseline && hasCheckIn
  if (view === "checkin") return hasBaseline
  return true
}

/** Wipe in-tab UI progress/drafts — use when local profile is gone (not during ViVi walkthrough). */
export function resetSessionForFreshStart(): void {
  clearAppProgress()
  clearOnboardingDraft()
  clearCheckInDraft()
}

/** Restore last screen when valid; otherwise fall back to profile-based routing. */
export function readInitialAppView(): AppView {
  const hasBaseline =
    typeof localStorage !== "undefined" && !!localStorage.getItem("musicBaseline")

  // Cleared localStorage only leaves stale session progress (skips welcome, old drafts).
  if (!hasBaseline && !isViviWalkthroughActive()) {
    resetSessionForFreshStart()
    return "onboarding"
  }

  const fallback = inferViewFromStorage()
  if (typeof sessionStorage === "undefined") return fallback

  const saved = parseJson<AppProgress>(sessionStorage.getItem(APP_PROGRESS_KEY))
  if (!saved?.view || !viewAllowedByStorage(saved.view)) return fallback
  return saved.view
}

export function readAppProgress(): AppProgress | null {
  if (typeof sessionStorage === "undefined") return null
  return parseJson<AppProgress>(sessionStorage.getItem(APP_PROGRESS_KEY))
}

export function writeAppProgress(patch: Partial<AppProgress> & { view: AppView }): void {
  if (typeof sessionStorage === "undefined") return
  const prev = readAppProgress()
  const next: AppProgress = {
    view: patch.view,
    onboarding: patch.onboarding ?? prev?.onboarding,
    checkIn: patch.checkIn ?? prev?.checkIn,
    results: patch.results ?? prev?.results,
  }
  try {
    sessionStorage.setItem(APP_PROGRESS_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
}

export function clearAppProgress(): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.removeItem(APP_PROGRESS_KEY)
}

export function readOnboardingScreenProgress(): OnboardingScreenProgress | null {
  return readAppProgress()?.onboarding ?? null
}

export function writeOnboardingScreenProgress(onboarding: OnboardingScreenProgress): void {
  writeAppProgress({ view: "onboarding", onboarding })
}

export function readCheckInScreenProgress(): CheckInScreenProgress | null {
  return readAppProgress()?.checkIn ?? null
}

export function writeCheckInScreenProgress(checkIn: CheckInScreenProgress): void {
  writeAppProgress({ view: "checkin", checkIn })
}

export function readResultsScreenProgress(): ResultsScreenProgress | null {
  return readAppProgress()?.results ?? null
}

export function writeResultsScreenProgress(results: ResultsScreenProgress): void {
  writeAppProgress({ view: "results", results })
}
