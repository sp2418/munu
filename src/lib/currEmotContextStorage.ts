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

/** Keeps songs from the prior check-in; clears mind + desired-feeling for a fresh start. */
export function clearCheckInRantKeepTracksInStorage(): void {
  const prev = parseCurrEmotContextFromStorage()
  const next: CurrEmotContext = {
    currRant: "",
    desiredFeeling: "",
    currTracks: Array.isArray(prev?.currTracks) ? prev.currTracks : [],
  }
  localStorage.setItem("currEmotContext", JSON.stringify(next))
}
