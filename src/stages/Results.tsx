import { useEffect } from "react"
import Anthropic from "@anthropic-ai/sdk";

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

  const claudeClientID = import.meta.env.CLAUDE_API_KEY



  useEffect(() => {

    const fetchClaudeResponse = async () => {
      const client = new Anthropic({
        apiKey: claudeClientID // This is the default and can be omitted
      });
      const msg = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: "Hello, Claude"
        }],
      });
      console.log(msg);
    }

    fetchClaudeResponse();

  }, [])


  console.log("Baseline:", baseline)
  console.log("Emotional Context", currEmotContext)

    return (
      <>
        <p>Hoiiii! This is the results stage.</p>
      </>
    )
  }

  export default Results