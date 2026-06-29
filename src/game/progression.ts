import type { Agent } from './types'

/**
 * Security-clearance progression.
 *
 * Characters start UNCLEARED (clearance 0) and "learn" by solving challenges,
 * which earns Knowledge. Crossing a Knowledge threshold grants the next
 * clearance tier, which opens the gate to the next sector of the arena.
 */

/** Knowledge needed to reach each clearance tier (index = tier). */
export const CLEARANCE_THRESHOLDS = [0, 100, 250, 450]
export const MAX_CLEARANCE = CLEARANCE_THRESHOLDS.length - 1

/** Human-facing label for a clearance tier. */
export function clearanceLabel(tier: number): string {
  return tier <= 0 ? 'UNCLEARED' : `LEVEL ${tier}`
}

/** Highest clearance tier unlocked for a given knowledge total. */
export function clearanceForKnowledge(knowledge: number): number {
  let tier = 0
  for (let i = 0; i < CLEARANCE_THRESHOLDS.length; i++) {
    if (knowledge >= CLEARANCE_THRESHOLDS[i]) tier = i
  }
  return tier
}

/** Progress info toward the next clearance tier. */
export function clearanceProgress(knowledge: number): {
  next: number | null
  toNext: number
  ratio: number
} {
  const tier = clearanceForKnowledge(knowledge)
  if (tier >= MAX_CLEARANCE) return { next: null, toNext: 0, ratio: 1 }
  const base = CLEARANCE_THRESHOLDS[tier]
  const target = CLEARANCE_THRESHOLDS[tier + 1]
  const ratio = (knowledge - base) / (target - base)
  return { next: tier + 1, toNext: Math.max(0, target - knowledge), ratio: Math.min(1, Math.max(0, ratio)) }
}

/** Apply Knowledge gained from a solved challenge. */
export function applyLearning(
  agent: Agent,
  gained: number,
): { knowledge: number; clearance: number; promoted: boolean } {
  const knowledge = agent.knowledge + gained
  const clearance = clearanceForKnowledge(knowledge)
  return { knowledge, clearance, promoted: clearance > agent.clearance }
}

/**
 * Knowledge earned for an attempted challenge, scaled by how confident/correct
 * the agent's reasoning was and how hard the challenge is.
 */
export function knowledgeGain(confidence: number, difficulty: number): number {
  return Math.round(15 + confidence * (10 + difficulty * 4))
}

// ---------------------------------------------------------------------------
// Arena layout — gated sectors laid out along the Z axis (sector 0 nearest the
// camera; clearance rises as you move away). Shared by the 3D arena renderer.
// ---------------------------------------------------------------------------

export const SECTOR_COUNT = MAX_CLEARANCE + 1 // one sector per clearance tier (0..MAX)
const FLOOR_NEAR = 9 // z of sector 0's near edge
const FLOOR_FAR = -9 // z of the last sector's far edge
export const SECTOR_SPAN = (FLOOR_NEAR - FLOOR_FAR) / SECTOR_COUNT

/** Z of the gate you pass to ENTER the given sector (sector >= 1). */
export function gateZ(sector: number): number {
  return FLOOR_NEAR - SECTOR_SPAN * sector
}

/** Z of the center of a sector. */
export function sectorCenterZ(sector: number): number {
  return FLOOR_NEAR - SECTOR_SPAN * (sector + 0.5)
}

/** Walkable bounds of a sector (with a small margin off the gates/edges). */
export function sectorBounds(sector: number): {
  xMin: number
  xMax: number
  zMin: number
  zMax: number
} {
  const zNear = gateZ(sector) // larger z, closer to camera
  const zFar = gateZ(sector + 1) // smaller z, further away
  return { xMin: -8, xMax: 8, zMin: zFar + 0.8, zMax: zNear - 0.8 }
}
