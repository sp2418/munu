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
  // const [previews, setPreviews] = useState<any[]>([])

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
      console.log("number of songs", songs.length)
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

          const normalize = (str: string) =>
            str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          
          const trackMatches = returnedTrack.name && normalize(returnedTrack.name).includes(normalize(title))
          const artistMatches = returnedTrack.artists.some((a: { name: string }) =>
            normalize(a.name).includes(normalize(artist))
          )

          console.log("title:", title)
          console.log("artist:", artist)
          console.log("items:", items)
          console.log("trackMatches:", trackMatches)
          console.log("artistMatches:", artistMatches)

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
      const desiredWithPreviews = await handleSongPreview(verifyDesiredSongs)
      setDesiredSongs(desiredWithPreviews)  

      const verifyGradualShiftSongs = await verifySongs(claudeRes.gradualShiftSongs)
      const gradualWithPreviews = await handleSongPreview(verifyGradualShiftSongs)
      setGradualSongs(gradualWithPreviews)

    }

    if (!claudeRes) return
    checkSongs()


  }, [claudeRes])


  const handleSongPreview = async (songs: any[]) => {
    const songsWithPreviews: any[] = []
    for (const song of songs){
      const response = await fetch(
        `https://itunes.apple.com/search?term=${song.title}+${song.artist}&media=music&entity=song&limit=1`
      )
      const data = await response.json()
      const result = data.results[0]

      if (!result) {
        songsWithPreviews.push({...song, previewUrl: null})

      }
      else{
        const trackMatches = result.trackName.toLowerCase().includes(song.title.toLowerCase())
        const artistMatches = result.artistName.toLowerCase().includes(song.artist.toLowerCase())

        console.log("result:", result)
        console.log("trackMatches:", trackMatches)
        console.log("artistMatches:", artistMatches)

        const previewUrl = trackMatches && artistMatches ? result.previewUrl : null

        songsWithPreviews.push({ ...song, previewUrl })
      }

    }
    return songsWithPreviews
  }


  console.log("Baseline:", baseline)
  console.log("Emotional Context", currEmotContext)

    return (
      <>
        <p>Hoiiii! This is the results stage.</p>
        {claudeRes && (
          <div>
            {
              gradualSongs.map((song: any) => (
                <div>
                  <p>{song.title}</p>
                  <p>{song.artist}</p>
                  <p>{song.explanation}</p>
                  {song.previewUrl && <audio controls src={song.previewUrl} />}
                </div>

              ))
            }
            {
              desiredSongs.map((song: any) => (
                <div>
                  <p>{song.title}</p>
                  <p>{song.artist}</p>
                  <p>{song.explanation}</p>
                  {song.previewUrl && <audio controls src={song.previewUrl} />}
                </div>

              ))
            }
            <p>{claudeRes.insight}</p>
            {/* {
              previews.map((previewUrl: any) => (
                <audio controls src={previewUrl} />
              ))
            } */}
          </div>)
        }
      </>
    )
  }

  export default Results