import type { FollowAlongPersonaDefinition, PersonaId } from "./types"
import { viviFollowAlongPersona } from "./vivi"

export const followAlongPersonas: Record<PersonaId, FollowAlongPersonaDefinition> = {
  vivi: viviFollowAlongPersona,
}

export function getFollowAlongPersona(id: PersonaId): FollowAlongPersonaDefinition {
  return followAlongPersonas[id]
}

export type { FollowAlongPersonaDefinition, PersonaId } from "./types"
export { viviFollowAlongPersona } from "./vivi"
export { viviMusicBaseline } from "./vivi-music-baseline"
export { viviCurrEmotContext } from "./vivi-curr-emot-context"
export { viviBakedResults, hasViviBakedResults } from "./vivi-results"
export type { ViviBakedResults, ViviClaudeResultsParsed, ViviJourneySongResolved } from "./vivi-results"
