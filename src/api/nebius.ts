import OpenAI from 'openai'

/**
 * NebiusClient - Wrapper for Nebius AI Cloud API
 * Provides LLM inference for agent reasoning and strategy
 */
export class NebiusClient {
  private client: OpenAI

  constructor(apiKey: string) {
    // Nebius uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.studio.nebius.com/v1',
    })
  }

  getClient(): OpenAI {
    return this.client
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
      return response.choices.length > 0
    } catch (e) {
      console.error('Nebius connection failed:', e)
      return false
    }
  }
}
