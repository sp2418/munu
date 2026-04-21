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

  const [claudeRes, setClaudeRes] = useState<string>("")



  useEffect(() => {

    const fetchClaudeResponse = async () => {
      const response = await fetch(`/api/claude`)
      const data = await response.json()
      const cleaned = data.response.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setClaudeRes(parsed)
      console.log("claude response", data.response)
      // const data = await response.json()
      // return data
    }

    fetchClaudeResponse();

  }, [])


  console.log("Baseline:", baseline)
  console.log("Emotional Context", currEmotContext)

    return (
      <>
        <p>Hoiiii! This is the results stage.</p>
        <p>{claudeRes}</p>
      </>
    )
  }

  export default Results