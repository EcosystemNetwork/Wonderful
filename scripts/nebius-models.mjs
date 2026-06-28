#!/usr/bin/env node
/**
 * List the chat models available to YOUR Nebius account/project.
 * The authoritative source — model availability is account/region gated.
 *
 *   NEBIUS_API_KEY=... node scripts/nebius-models.mjs
 *   # or falls back to VITE_NEBIUS_API_KEY from your env
 */
const apiKey = process.env.NEBIUS_API_KEY || process.env.VITE_NEBIUS_API_KEY
const baseURL = 'https://api.studio.nebius.com/v1'

if (!apiKey) {
  console.error('✗ No API key. Set NEBIUS_API_KEY (or VITE_NEBIUS_API_KEY) and retry.')
  process.exit(1)
}

try {
  const res = await fetch(`${baseURL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    console.error(`✗ HTTP ${res.status} ${res.statusText}`)
    process.exit(1)
  }
  const json = await res.json()
  const ids = (json.data || []).map((m) => m.id).sort()
  console.log(`✓ ${ids.length} models available to your account:\n`)
  for (const id of ids) console.log(`  ${id}`)
} catch (e) {
  console.error(`✗ Failed to list models: ${e?.message || e}`)
  process.exit(1)
}
