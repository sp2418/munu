import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from "@anthropic-ai/sdk";

export default async function handleClaude(req: VercelRequest, res: VercelResponse) {
    const claudeAPIKey = process.env.CLAUDE_API_KEY
    if (!claudeAPIKey) {
        return res.status(500).json({ error: 'Missing Anthropic API key' })
    }
    const client = new Anthropic({
        apiKey: claudeAPIKey // This is the default and can be omitted
      });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: "Hello, Claude"
        }],
      });
      const response = msg.content[0]
      if (response.type === "text"){
        res.status(200).json({response: response.text})
      }
}