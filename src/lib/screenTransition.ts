/** Central screen-to-screen transition timing — tune all fades here. */

export const SCREEN_ENTER_MS = 520
export const SCREEN_EXIT_MS = 320
export const SCREEN_REDUCED_MOTION_MS = 120

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function screenTransitionDurations() {
  const reduced = prefersReducedMotion()
  return {
    enterMs: reduced ? SCREEN_REDUCED_MOTION_MS : SCREEN_ENTER_MS,
    exitMs: reduced ? SCREEN_REDUCED_MOTION_MS : SCREEN_EXIT_MS,
  }
}
