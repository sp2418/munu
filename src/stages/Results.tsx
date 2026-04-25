import { useState, useEffect } from "react"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel"

// interface ResultsProps {
//   baseline: {
//     faveArtists: string[],
//     faveTracks: [string, string[]][],
//     favGenres: string[],
//     personalContexts: string[],
//     addContext: string
//   } | null;
//   currEmotContext: {
//     emotions: string[],
//     currTracks: [string, string[]][],
//     currRant: string
//   } | null;
// }

function Results() {

  const storedBaseline = localStorage.getItem('musicBaseline')
  const baseline = storedBaseline ? JSON.parse(storedBaseline) as {
    favGenres: string[],
    favArtists: string[],
    favTracks: [string,string[]][],
    personalContexts: string[],
    addContext: string
  } : null

  const storedEmotContext = localStorage.getItem('currEmotContext')
  const currEmotContext = storedEmotContext ?  JSON.parse(storedEmotContext) as {
    currRant: string,
    currTracks: ([string, string[]] | { name: string; artists: string[]; imageUrl?: string })[],
    emotions: string[]
  } : null

  // const [loading, setLoading] = useState<boolean>(true)
  // const [error, setError] = useState<string | null>(null)

  const [claudeRes, setClaudeRes] = useState<any>(null)
  // const [previews, setPreviews] = useState<any[]>([])

  const [journeySongs, setJourneySongs] = useState<any[]>([])
  const [journeySongsLoading, setJourneySongsLoading] = useState(false)

  useEffect(() => {

    const fetchClaudeResponse = async (retries = 3) => {
      try {
        const url = `/api/claude?baseline=${encodeURIComponent(JSON.stringify(baseline))}&currEmotContext=${encodeURIComponent(JSON.stringify(currEmotContext))}`
        console.log("fetch url", url)
        const response = await fetch(url)
        const data = await response.json()
        const cleaned = data.response.replace(/```json|```/g, '').trim()
        console.log("raw response", cleaned)
        const parsed = JSON.parse(cleaned)
        setClaudeRes(parsed)
        console.log("claude response", parsed)
      }
      catch (error) {
        if (retries > 0){
          console.log('Retrying... ${retries} attempts left')
          await fetchClaudeResponse(retries - 1)
        }
        else{
          console.error("Failed after multiple attempts:", error)
        }
      }
      // const data = await response.json()
      // return data
    }

    fetchClaudeResponse();
  }, [])


  useEffect(() => {
    if (!claudeRes) return

    let cancelled = false
    setJourneySongsLoading(true)
    setJourneySongs([])

    const verifySongs = async (songs: any[]) => {
      const verifiedSongs: any[] = []
      const normalize = (str: string) =>
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

      console.log("number of songs", songs.length)
      const token = localStorage.getItem('spotifyToken')
      for (const song of songs) {
        await new Promise(resolve => setTimeout(resolve, 200))

        const title = song.title
        const artist = song.artist
        const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()

        const response = await fetch(`/api/spotify-search?q=${title}&type=track&artist=${cleanArtist}&token=${token}`)

        if (response.status === 429){
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }

        const result = await response.json()
        const items = result.tracks?.items

        console.log(`Verifying: ${title} by ${artist}`)
        console.log("items returned:", items)

        if (!items || items.length === 0) {
          console.log(`DROPPED at Spotify - no items returned for: ${title}`)
          continue
        }

        const returnedTrack = items[0]
        const trackMatches = returnedTrack.name && normalize(returnedTrack.name).includes(normalize(title))
        const artistMatches = returnedTrack.artists.some((a: { name: string }) =>
          normalize(a.name).includes(normalize(cleanArtist))
        )

        console.log(`trackMatches: ${trackMatches}, artistMatches: ${artistMatches}`)

        if (trackMatches && artistMatches) {
          const imageUrl = returnedTrack.album?.images?.[0]?.url ?? null
          verifiedSongs.push({ ...song, imageUrl })
        } else {
          console.log(`DROPPED at matching - ${title} by ${artist}`)
          console.log(
            `Spotify returned: ${returnedTrack.name} by ${returnedTrack.artists.map((a: any) => a.name).join(", ")}`
          )
        }
      }
      return verifiedSongs
    }

    const run = async () => {
      try {
        const verifyJourneySongs = await verifySongs(claudeRes.journeySongs ?? [])
        if (cancelled) return
        const journeyWithPreviews = await handleSongPreview(verifyJourneySongs)
        if (cancelled) return
        setJourneySongs(journeyWithPreviews)
      } finally {
        if (!cancelled) setJourneySongsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [claudeRes])


  const handleSongPreview = async (songs: any[]) => {
    const songsWithPreviews: any[] = []
    for (const song of songs){
      const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()
      const response = await fetch(
        `https://itunes.apple.com/search?term=${song.title}+${cleanArtist}&media=music&entity=song&limit=1`
      )
      const data = await response.json()
      const result = data.results[0]

      console.log(`iTunes lookup: ${song.title} by ${song.artist}`)
      console.log("iTunes result:", result)

      if (!result) {
        console.log(`DROPPED at iTunes - no result for: ${song.title}`)
        songsWithPreviews.push({ ...song, previewUrl: null })
      }
      else{
        const normalize = (str: string) =>
          str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        
        // const trackMatches = result.trackName.toLowerCase().includes(song.title.toLowerCase())
        // const artistMatches = result.artistName.toLowerCase().includes(song.artist.toLowerCase())
        const trackMatches = normalize(result.trackName).includes(normalize(song.title))
        const artistMatches = normalize(result.artistName).includes(normalize(cleanArtist))

        console.log(`iTunes trackMatches: ${trackMatches}, artistMatches: ${artistMatches}`)
        console.log(`iTunes returned: ${result.trackName} by ${result.artistName}`)

        const matched = trackMatches && artistMatches
        const previewUrl = matched ? result.previewUrl : null

        songsWithPreviews.push({ ...song, previewUrl })
      }

    }
    return songsWithPreviews
  }


  console.log("Baseline:", baseline)
  console.log("Emotional Context", currEmotContext)

  const resultSongCard = (song: any) => {
    const hoverOverlay = (withLightScrim: boolean) => (
      <div
        className={`absolute inset-0 flex h-full flex-col items-center overflow-hidden px-4 py-4 text-center opacity-0 pointer-events-none transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 ${withLightScrim ? "bg-white/95" : ""}`}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 overflow-y-auto py-2 [scrollbar-width:thin]">
          <p className="line-clamp-2 w-full shrink-0 text-center text-base font-semibold text-black drop-shadow-sm sm:text-lg">
            {song.title}
          </p>
          <p className="line-clamp-2 w-full shrink-0 text-center text-sm text-black/90 drop-shadow-sm">by {song.artist}</p>
          {song.explanation ? (
            <p className="w-full text-center text-sm leading-snug text-black/85 drop-shadow-sm sm:text-base">
              {song.explanation}
            </p>
          ) : null}
        </div>
        <div className="mt-auto w-full shrink-0 pt-3">
          {song.previewUrl ? (
            <audio controls src={song.previewUrl} className="block h-10 w-full sm:h-11" preload="none" />
          ) : (
            <p className="py-1 text-center text-xs text-black/70">No preview</p>
          )}
        </div>
      </div>
    )

    if (song.imageUrl) {
      return (
        <div
          className="group relative inline-block w-fit max-w-full shrink-0 animate-in fade-in duration-300 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-md"
        >
          <img
            src={song.imageUrl}
            alt=""
            className="block h-auto max-h-[min(70svh,44rem)] w-auto max-w-full bg-muted object-contain transition-opacity duration-300 group-hover:opacity-40 dark:bg-zinc-900"
          />
          {hoverOverlay(false)}
        </div>
      )
    }

    return (
      <div
        className="group relative inline-flex h-52 w-72 max-w-full shrink-0 animate-in fade-in duration-300 overflow-hidden rounded-2xl border-2 border-border/60 bg-zinc-900 shadow-md dark:bg-zinc-950 sm:h-56 sm:w-80"
      >
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 py-4 text-center transition-opacity duration-300 group-hover:opacity-0">
          <p className="line-clamp-3 w-full text-center text-base font-medium text-zinc-50 sm:text-lg">{song.title}</p>
          <p className="line-clamp-2 w-full text-center text-sm text-zinc-300 sm:text-base">by {song.artist}</p>
        </div>
        {hoverOverlay(true)}
      </div>
    )
  }

    return (
      <div className="min-h-svh px-6 py-10">
        <div className="mx-auto w-full max-w-3xl space-y-6">
        <p>Hoiiii! This is the results stage.</p>
        {claudeRes && (
          <div className="space-y-6">
            <h2>The Mirror</h2>
            <p>{claudeRes.insight}</p>
            <h2>The Bridge</h2>
            <p>{claudeRes.isoExplanation}</p>
            <h2>The Journey</h2>
            {journeySongsLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Preparing songs…</p>
            ) : journeySongs.length > 0 ? (
              <Carousel opts={{ align: "center", loop: false }} className="w-full max-w-full">
                <CarouselContent>
                  {journeySongs.map((song: any, i: number) => (
                    <CarouselItem key={`journey-${i}-${song.title}-${song.artist}`}>
                      <div className="flex justify-center py-3">{resultSongCard(song)}</div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 border-border bg-background/90 shadow-sm sm:left-1" />
                <CarouselNext className="right-0 border-border bg-background/90 shadow-sm sm:right-1" />
              </Carousel>
            ) : (
              <p className="text-sm text-muted-foreground">No songs matched for this journey.</p>
            )}
          </div>
        )}
        </div>
      </div>
    )
  }

  export default Results