# Nebius Token Factory Integration — Wonderful (game agent loop)

OpenAI-compatible inference for agent reasoning + self-improvement.

## Connection
- **Base URL:** `https://api.studio.nebius.com/v1`
- **Auth:** `Authorization: Bearer ${NEBIUS_API_KEY}` (the OpenAI SDK sets this from `apiKey`)
- **Centralized in:** [`src/api/nebius.ts`](../src/api/nebius.ts) → `NEBIUS_CONFIG`
- **Account identifiers** (reference only — NOT sent to the inference API):
  - project `project-e00a898kpr00dr28vrewyf`
  - tenant-user `tenantuseraccount-e00cr4vga00dbmmszb`
  - ai-tenant `aitenant-e00pjzpecsqg8m9mfb`

## Model Selection (live-verified 2026-06-28 on this account)
- **Pinned default:** `Qwen/Qwen3-235B-A22B-Instruct-2507`
- **Why:** Frontier-class instruct quality with clean `json_object` output at **~0.85s/call** (smoke-tested at 736ms) — the best fit for a loop that calls the LLM once per agent per turn.
- **Max-capability alt:** `deepseek-ai/DeepSeek-V4-Pro` — verified clean JSON but ~2.1s/call (4 agents ≈ 8.5s/turn).
- **Verified-bad here:** `openai/gpt-oss-120b` and `zai-org/GLM-5.2` return **empty content** under `json_object` — do not use. Avoid thinking/reasoning models (their `<think>` output breaks JSON parsing). No Meta/Llama (project preference).
- Model availability is **account/region gated** — `deepseek-ai/DeepSeek-V3` is NOT on this account. Always confirm with `npm run nebius:models`.

## Reliability (fallback / circuit-breaker)
- Client configured with `timeout: 60s` + `maxRetries: 2` (exponential backoff) — see [`src/api/nebius.ts`](../src/api/nebius.ts).
- JSON parsing tolerant of fences/prose via `parseJSON` in [`src/game/agent.ts`](../src/game/agent.ts).
- Loop-level graceful degradation: a failed agent call is caught per-agent in [`src/game/loop.ts`](../src/game/loop.ts) and the agent falls back to an `observe` action — one bad call never halts the turn.

## Verify (run before trusting it)
```bash
# 1. List models actually available to your account/project
npm run nebius:models

# 2. Live round-trip smoke test (JSON mode, same as the game uses)
npm run nebius:smoke
```
Both read `NEBIUS_API_KEY` or `VITE_NEBIUS_API_KEY` (auto-loaded from `.env`).
Expected smoke output: `✓ Round-trip OK in <ms>ms` with `{"ok":true,"ping":"pong"}`.

## In-app path
1. Paste API key in the **Nebius AI** panel → **Connect** (runs `testConnection`).
2. On success the key is stored ([`src/game/store.ts`](../src/game/store.ts)) and the game loop builds its client from the same key.
3. **Run Turn** → each agent calls `decideAction` (JSON mode) → memory persisted to InsForge.

## Rollback
- Revert model: set `VITE_NEBIUS_MODEL` back to the previous value (or unset for the pinned default).
- Disable Nebius entirely: leave the key blank — `Connect` will fail and the UI gates turns behind connection.
