import OpenAI from 'openai'

/**
 * Nebius configuration.
 *
 * The OpenAI-compatible inference API (Nebius AI Studio) authenticates with a
 * Bearer API key only — it does NOT take any of the console/Cloud identifiers
 * below in the request body. The project / tenant IDs are kept here purely for
 * reference and for any future Nebius AI Cloud (IAM) calls.
 */
export const NEBIUS_CONFIG = {
  baseURL: 'https://api.studio.nebius.com/v1',
  /**
   * Default chat model. Override with VITE_NEBIUS_MODEL.
   * Qwen3-235B-Instruct = frontier-class quality + clean JSON mode at ~0.85s/call,
   * the best fit for the per-agent game loop (verified live on this account).
   * Max-capability alt: 'deepseek-ai/DeepSeek-V4-Pro' (~2.1s/call).
   * Avoid: gpt-oss-120b / GLM-5.2 (return empty content under json_object here);
   * reasoning/thinking models (their <think> output breaks json_object parsing).
   */
  model: import.meta.env.VITE_NEBIUS_MODEL || 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  /** Nebius AI Cloud console identifiers (reference only). */
  projectId: import.meta.env.VITE_NEBIUS_PROJECT_ID || 'project-e00a898kpr00dr28vrewyf',
  tenantUserAccountId:
    import.meta.env.VITE_NEBIUS_TENANT_USER_ID || 'tenantuseraccount-e00cr4vga00dbmmszb',
  aiTenantId: import.meta.env.VITE_NEBIUS_AI_TENANT_ID || 'aitenant-e00pjzpecsqg8m9mfb',
} as const

/**
 * NebiusClient - Wrapper for Nebius AI Cloud API
 * Provides LLM inference for agent reasoning and strategy
 */
export class NebiusClient {
  private client: OpenAI

  constructor(apiKey: string) {
    // Nebius uses OpenAI-compatible API.
    // timeout + maxRetries give us the fallback/circuit-breaker the integration
    // skill requires: a hung or 5xx call fails fast and retries with backoff
    // instead of stalling the game loop.
    this.client = new OpenAI({
      apiKey,
      baseURL: NEBIUS_CONFIG.baseURL,
      dangerouslyAllowBrowser: true,
      timeout: 60_000,
      maxRetries: 2,
    })
  }

  getClient(): OpenAI {
    return this.client
  }

  get model(): string {
    return NEBIUS_CONFIG.model
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: NEBIUS_CONFIG.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      })
      return response.choices.length > 0
    } catch (e) {
      console.error('Nebius connection failed:', e)
      return false
    }
  }
}
