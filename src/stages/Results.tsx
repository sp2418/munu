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
    currTracks: [string,string[]][],
    emotions: string[]
  } : null

  // const [loading, setLoading] = useState<boolean>(true)
  // const [error, setError] = useState<string | null>(null)

  const [claudeRes, setClaudeRes] = useState<any>(null)
  // const [previews, setPreviews] = useState<any[]>([])

  const [desiredSongs, setDesiredSongs] = useState<any[]>([])
  const [gradualSongs, setGradualSongs] = useState<any[]>([])



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

    const verifySongs = async (songs: any[]) => {
      const verifiedSongs = []
      console.log("number of songs", songs.length)
      for (const song of songs) {
        let isVerified: boolean = true
        const title = song.title
        const artist = song.artist
        const cleanArtist = song.artist.split(/\s+(ft\.|feat\.|&|and\s).*$/i)[0].trim()

        const response = await fetch(`/api/spotify-search?q=${title}&type=track&artist=${cleanArtist}`)
        const result = await response.json()

        const items = result.tracks?.items



        console.log(`Verifying: ${title} by ${artist}`)
        console.log("items returned:", items)

        if (!items || items.length === 0) {
          console.log(`DROPPED at Spotify - no items returned for: ${title}`)
          isVerified = false
        }
        else{
          const returnedTrack = items[0]

          const normalize = (str: string) =>
            str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          
          const trackMatches = returnedTrack.name && normalize(returnedTrack.name).includes(normalize(title))
          const artistMatches = returnedTrack.artists.some((a: { name: string }) =>
            normalize(a.name).includes(normalize(cleanArtist))
          )

          console.log(`trackMatches: ${trackMatches}, artistMatches: ${artistMatches}`)

          isVerified = trackMatches && artistMatches

        }

        const returnedTrack = items?.[0]
        if (isVerified === true){
          verifiedSongs.push(song)
        }
        else {
          console.log(`DROPPED at matching - ${title} by ${artist}`)
          if (returnedTrack){
            console.log(`Spotify returned: ${returnedTrack.name} by ${returnedTrack.artists.map((a: any) => a.name).join(", ")}`)

          }
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
        songsWithPreviews.push({...song, previewUrl: null})

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