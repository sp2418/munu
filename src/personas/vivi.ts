import type { FollowAlongPersonaDefinition } from "./types"

export const viviFollowAlongPersona: FollowAlongPersonaDefinition = {
  id: "vivi",
  onboarding: {
    favGenres: ["Indie", "R&B", "Pop"],
  },
  checkIn: {
    currRant:
      "I told myself I was going to actually relax tonight after a long shift, and instead I spent two hours on my phone and somehow feel worse than when I started. I'm tired but also wired, which is a combination I don't really know what to do with. Part of me wants to do something and part of me wants to do nothing, and I can't tell which one would actually help.",
    desiredFeeling: "calm",
    recentSongQueries: [
      { name: "Kingston", artist: "Faye Webster" },
      { name: "Sailor Song", artist: "Gigi Perez" },
      { name: "Espresso", artist: "Sabrina Carpenter" },
      { name: "Glow Like Dat", artist: "Rich Brian" },
    ],
  },
}
