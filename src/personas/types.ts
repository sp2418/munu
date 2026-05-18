export type PersonaId = "vivi"

export type FollowAlongPersonaDefinition = {
  id: PersonaId
  onboarding: {
    favGenres: string[]
    favArtistSearchQueries: string[]
    favSongQueries: Array<{ name: string; artist: string }>
    personalContexts: string[]
    addContext: string
  }
  checkIn: {
    currRant: string
    emotions: string[]
    recentSongQueries: Array<{ name: string; artist: string }>
  }
}
