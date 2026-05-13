import type { CurrEmotContext } from "./reccobeatsEnrich"

export function parseCurrEmotContextFromStorage(): CurrEmotContext | null {
  const raw = localStorage.getItem("currEmotContext")
  if (!raw) return null
  try {
    return JSON.parse(raw) as CurrEmotContext
  } catch {
    return null
  }
}

/** Keeps songs from the prior check-in; clears mind + emotions fields for fresh Q0 / Q1. */
export function clearCheckInRantAndEmotionsKeepTracksInStorage(): void {
  const prev = parseCurrEmotContextFromStorage()
  const next: CurrEmotContext = {
    currRant: "",
    emotions: [],
    currTracks: Array.isArray(prev?.currTracks) ? prev.currTracks : [],
  }
  localStorage.setItem("currEmotContext", JSON.stringify(next))
}
