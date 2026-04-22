import { useState,useEffect } from "react"

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
  const baseline = storedBaseline ? JSON.parse(storedBaseline) : null

  const storedEmotContext = localStorage.getItem('currEmotContext')
  const currEmotContext = storedEmotContext ?  JSON.parse(storedEmotContext) : null

  // const [loading, setLoading] = useState<boolean>(true)
  // const [error, setError] = useState<string | null>(null)

  const [claudeRes, setClaudeRes] = useState<any>(null)
  const [previews, setPreviews] = useState<any>([])

  const [desiredSongs, setDesiredSongs] = useState<any[]>([])
  const [gradualSongs, setGradualSongs] = useState<any[]>([])



  useEffect(() => {

    const fetchClaudeResponse = async () => {
      const response = await fetch(`/api/claude`)
      const data = await response.json()
      const cleaned = data.response.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setClaudeRes(parsed)
      console.log("claude response", parsed)
      // const data = await response.json()
      // return data
    }

    fetchClaudeResponse();
  }, [])


  useEffect(() => {

    const verifySongs = async (songs: any[]) => {
      const verifiedSongs = []
      for (const song of songs) {
        let isVerified: boolean = true
        const title = song.title
        const artist = song.artist

        const response = await fetch(`/api/spotify-search?q=${title}&type=track&artist=${artist}`)
        const result = await response.json()

        const items = result.tracks?.items

        if (!items || items.length === 0) {
          isVerified = false
        }
        else{
          const returnedTrack = items[0]

          const trackMatches = returnedTrack.name.toLowerCase().includes(title.toLowerCase())
          const artistMatches = returnedTrack.artists.some((a: {name: string}) => 
            a.name.toLowerCase().includes(artist.toLowerCase())
          )

          isVerified = trackMatches && artistMatches

        }

        if (isVerified === true){
          verifiedSongs.push(song)
        }
      }
      return verifiedSongs
    }

    const checkSongs = async () => {
      const verifyDesiredSongs = await verifySongs(claudeRes.desiredStateSongs)
      setDesiredSongs(verifyDesiredSongs)

      const verifyGradualShiftSongs = await verifySongs(claudeRes.gradualShiftSongs)
      setGradualSongs(verifyGradualShiftSongs)

      handleSongPreview(desiredSongs)

    }

    if (!claudeRes) return
    checkSongs()


  }, [claudeRes])

  const handleSongPreview = async (songs: any[]) => {
    if (claudeRes) {
      const urls: any[] = []
      for (const song of songs){
        const response = await fetch(
          `https://itunes.apple.com/search?term=${song.title}+${song.artist}&media=music&entity=song&limit=1`
        )
        const data = await response.json()
        const previewUrl = data.results[0]?.previewUrl
        urls.push(previewUrl)
      }
      setPreviews(urls)
    }
  }


  console.log("Baseline:", baseline)
  console.log("Emotional Context", currEmotContext)

    return (
      <>
        <p>Hoiiii! This is the results stage.</p>
        {claudeRes && (
          <div>
            <p>{claudeRes.insight}</p>
            {
              previews.map((previewUrl: any) => (
                <audio controls src={previewUrl} />
              ))
            }
          </div>)
        }
      </>
    )
  }

  export default Results