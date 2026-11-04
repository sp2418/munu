import type { DesiredFeelingId } from "../lib/reccobeatsEnrich"

export type PersonaId = "vivi"

export type FollowAlongPersonaDefinition = {
  id: PersonaId
  onboarding: {
    favGenres: string[]
  }
  checkIn: {
    currRant: string
    desiredFeeling: DesiredFeelingId
    recentSongQueries: Array<{ name: string; artist: string }>
  }
}
