import { GatewayClient } from './aiGateway'

/**
 * Back-compat shim.
 *
 * The game used to call Nebius directly from the browser with a VITE_ key and
 * `dangerouslyAllowBrowser` — i.e. it shipped a model-provider key to every
 * visitor. All inference now flows through the InsForge `ai-chat` edge function
 * (see aiGateway.ts), which holds the provider key server-side.
 *
 * `NebiusClient` is kept ONLY so existing call sites (agent.ts, crafting.ts,
 * StoryFeed, CraftPanel, Game) keep compiling. It ignores the key argument and
 * delegates to the gateway. New code should import `GatewayClient` directly.
 */

export const NEBIUS_CONFIG = {
  /**
   * Vestigial. The gateway chooses the real model server-side (its allowlist +
   * default, optionally hinted by VITE_AI_MODEL). Call sites that still pass
   * `model: NEBIUS_CONFIG.model` are harmless — the gateway overrides it.
   */
  model: (import.meta.env.VITE_AI_MODEL as string) || 'gateway-default',
} as const

export class NebiusClient extends GatewayClient {
  // The key is intentionally ignored — it must never leave the server.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_apiKey?: string) {
    super()
  }
}
