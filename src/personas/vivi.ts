import type { FollowAlongPersonaDefinition } from "./types"

export const viviFollowAlongPersona: FollowAlongPersonaDefinition = {
  id: "vivi",
  onboarding: {
    favGenres: ["Indie", "R&B", "Pop"],
    favArtistSearchQueries: ["Clairo", "Steve Lacy", "Snoh Aalegra", "H.E.R.", "Daniel Caesar"],
    favSongQueries: [
      { name: "Bags", artist: "Clairo" },
      { name: "Dark Red", artist: "Steve Lacy" },
      { name: "I Want You Around", artist: "Snoh Aalegra" },
      { name: "Focus", artist: "H.E.R." },
      { name: "Best Part", artist: "Daniel Caesar" },
    ],
    personalContexts: ["Commuting", "Winding down", "Processing emotions", "Taking a walk"],
    addContext:
      "Music is honestly how I figure out what I'm feeling. I can be in a weird mood all day and not really know why, and then a song will come on and I'll go 'oh, that's what's going on.' I make a lot of playlists, but I never name them anything that would actually help me find them later — most of them are just feelings or random words like 'october' or 'for the drive.'",
  },
  checkIn: {
    emotions: ["Restless", "Drained", "Disconnected", "Overwhelmed"],
    currRant:
      "I told myself I was going to actually relax tonight after a long shift, and instead I spent two hours on my phone and somehow feel worse than when I started. I'm tired but also wired, which is a combination I don't really know what to do with. Part of me wants to do something and part of me wants to do nothing, and I can't tell which one would actually help.",
    recentSongQueries: [
      { name: "Kingston", artist: "Faye Webster" },
      { name: "Sailor Song", artist: "Gigi Perez" },
      { name: "Espresso", artist: "Sabrina Carpenter" },
      { name: "Glow Like Dat", artist: "Rich Brian" },
    ],
  },
}
