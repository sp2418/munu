import type { CurrEmotContext, MusicBaseline } from "./reccobeatsEnrich"
import { viviBakedResults, hasViviBakedResults } from "../personas/vivi-results"
import { viviCurrEmotContext } from "../personas/vivi-curr-emot-context"
import { viviMusicBaseline } from "../personas/vivi-music-baseline"
import { storedProfileMatchesVivi } from "./viviWalkthroughStorage"

export const CLAUDE_RESPONSE_CACHE_KEY = "munu.claudeResponseCache.v1"
export const RESULTS_JOURNEY_CACHE_KEY = "munu.resultsJourneyRows.v1"

export type ClaudeResponseCachePayload = {
  fingerprint: string
  parsed: unknown
  journeySongsResolved?: unknown[]
}

type JourneyOnlyRowsPayload = {
  fingerprint: string
  songs: unknown[]
}

function djb2Hex(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

export function fingerprintForResultsInputs(
  baseline: MusicBaseline | null,
  curr: CurrEmotContext | null,
): string {
  try {
    return `${djb2Hex(JSON.stringify(baseline))}_${djb2Hex(JSON.stringify(curr))}`
  } catch {
    return `${Date.now()}`
  }
}

export function readClaudeCache(fingerprint: string): unknown | null {
  try {
    const raw = localStorage.getItem(CLAUDE_RESPONSE_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as ClaudeResponseCachePayload
    if (!data || typeof data.fingerprint !== "string" || data.fingerprint !== fingerprint) return null
    return data.parsed ?? null
  } catch {
    return null
  }
}

export function readJourneyRowsCache(fingerprint: string): unknown[] | null {
  try {
    const raw = localStorage.getItem(RESULTS_JOURNEY_CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as JourneyOnlyRowsPayload
    if (
      !data ||
      typeof data.fingerprint !== "string" ||
      data.fingerprint !== fingerprint ||
      !Array.isArray(data.songs) ||
      data.songs.length === 0
    ) {
      return null
    }
    return data.songs
  } catch {
    return null
  }
}

export function writeViviBakedResultsCache(
  baseline: MusicBaseline = viviMusicBaseline,
  checkIn: CurrEmotContext = viviCurrEmotContext,
): boolean {
  if (!hasViviBakedResults()) return false
  const fingerprint = fingerprintForResultsInputs(baseline, checkIn)
  const { parsed, journeySongsResolved } = viviBakedResults
  try {
    const main: ClaudeResponseCachePayload = {
      fingerprint,
      parsed,
      ...(journeySongsResolved.length > 0 ? { journeySongsResolved } : {}),
    }
    localStorage.setItem(CLAUDE_RESPONSE_CACHE_KEY, JSON.stringify(main))
    if (journeySongsResolved.length > 0) {
      const journeyPayload: JourneyOnlyRowsPayload = { fingerprint, songs: journeySongsResolved }
      localStorage.setItem(RESULTS_JOURNEY_CACHE_KEY, JSON.stringify(journeyPayload))
    }
    return true
  } catch (e) {
    console.warn("Could not seed ViVi baked results cache:", e)
    return false
  }
}

/** True when LS profile is ViVi’s and we should use pre-baked Results (no Claude / Spotify verify). */
export function shouldUseViviBakedResults(
  baseline: MusicBaseline | null | undefined,
  checkIn: CurrEmotContext | null | undefined,
): boolean {
  if (!hasViviBakedResults()) return false
  if (!baseline || !checkIn) return false
  return storedProfileMatchesVivi(baseline, checkIn)
}
