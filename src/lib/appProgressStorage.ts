import { clearOnboardingDraft } from "./onboardingDraftStorage"
import { isViviWalkthroughActive } from "./viviWalkthroughStorage"

const APP_PROGRESS_KEY = "munu.appProgress.v1"

export type AppView = "onboarding" | "results"

export type OnboardingScreenProgress = {
  showWelcomeScreen: boolean
  showDemoScreen: boolean
  showPrepScreen: boolean
  currentQuestion: number
}

export type ResultsScreenProgress = {
  scrollY: number
  playlistRevealAllowed: boolean
}

export type AppProgress = {
  view: AppView
  onboarding?: OnboardingScreenProgress
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
  if (!localStorage.getItem("currEmotContext")) return "onboarding"
  return "results"
}

function viewAllowedByStorage(view: AppView): boolean {
  if (typeof localStorage === "undefined") return view === "onboarding"
  const hasBaseline = !!localStorage.getItem("musicBaseline")
  const hasCheckIn = !!localStorage.getItem("currEmotContext")
  if (view === "results") return hasBaseline && hasCheckIn
  return true
}

/** Wipe in-tab UI progress/drafts — use when local profile is gone (not during ViVi walkthrough). */
export function resetSessionForFreshStart(): void {
  clearAppProgress()
  clearOnboardingDraft()
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

  // Legacy payloads may still store view: "checkin" — keep view untyped until normalized.
  const saved = parseJson<Omit<AppProgress, "view"> & { view?: string }>(
    sessionStorage.getItem(APP_PROGRESS_KEY),
  )
  // Legacy "checkin" view collapses into the merged onboarding flow.
  const view: AppView | undefined =
    saved?.view === "checkin" ? "onboarding" : (saved?.view as AppView | undefined)
  if (!view || !viewAllowedByStorage(view)) return fallback
  return view
}

export function readAppProgress(): AppProgress | null {
  if (typeof sessionStorage === "undefined") return null
  const saved = parseJson<Omit<AppProgress, "view"> & { view?: string }>(
    sessionStorage.getItem(APP_PROGRESS_KEY),
  )
  if (!saved) return null
  if (saved.view === "checkin") {
    return { ...saved, view: "onboarding" }
  }
  return saved as AppProgress
}

export function writeAppProgress(patch: Partial<AppProgress> & { view: AppView }): void {
  if (typeof sessionStorage === "undefined") return
  const prev = readAppProgress()
  const next: AppProgress = {
    view: patch.view,
    onboarding: patch.onboarding ?? prev?.onboarding,
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

export function readResultsScreenProgress(): ResultsScreenProgress | null {
  return readAppProgress()?.results ?? null
}

export function writeResultsScreenProgress(results: ResultsScreenProgress): void {
  writeAppProgress({ view: "results", results })
}
