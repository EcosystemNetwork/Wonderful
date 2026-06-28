#!/usr/bin/env node
/**
 * Nebius Token Factory smoke test — live round-trip.
 *
 * Sends one chat completion (JSON mode, the same way the game does) and asserts
 * a non-empty parseable response. Per the integration skill, this is the
 * non-negotiable check before trusting the integration.
 *
 *   NEBIUS_API_KEY=... node scripts/nebius-smoke.mjs
 *   # or it falls back to VITE_NEBIUS_API_KEY / VITE_NEBIUS_MODEL from your env
 */
import OpenAI from 'openai'

const apiKey = process.env.NEBIUS_API_KEY || process.env.VITE_NEBIUS_API_KEY
const model = process.env.NEBIUS_MODEL || process.env.VITE_NEBIUS_MODEL || 'deepseek-ai/DeepSeek-V3'
const baseURL = 'https://api.studio.nebius.com/v1'

if (!apiKey) {
  console.error('✗ No API key. Set NEBIUS_API_KEY (or VITE_NEBIUS_API_KEY) and retry.')
  process.exit(1)
}

const client = new OpenAI({ apiKey, baseURL, timeout: 60_000, maxRetries: 2 })

console.log(`→ Nebius smoke test  model=${model}  baseURL=${baseURL}`)
const started = Date.now()
try {
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'Respond with valid JSON only.' },
      { role: 'user', content: 'Return {"ok": true, "ping": "pong"} as JSON.' },
    ],
    max_tokens: 50,
    temperature: 0,
    response_format: { type: 'json_object' },
  })

  const content = res.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response content')
  const parsed = JSON.parse(content)

  console.log(`✓ Round-trip OK in ${Date.now() - started}ms`)
  console.log(`  model returned: ${JSON.stringify(parsed)}`)
  console.log(`  usage: ${JSON.stringify(res.usage)}`)
  process.exit(0)
} catch (e) {
  console.error(`✗ Smoke test FAILED after ${Date.now() - started}ms`)
  console.error(`  ${e?.status ? `HTTP ${e.status} — ` : ''}${e?.message || e}`)
  if (e?.status === 401) console.error('  → Bad/expired API key.')
  if (e?.status === 404) console.error(`  → Model "${model}" not available on your account. Run: npm run nebius:models`)
  process.exit(1)
}
