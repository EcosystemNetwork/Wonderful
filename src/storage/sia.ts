import { Memory } from '../game/types'

/**
 * SiaStorage - Decentralized memory storage using Sia
 * Agents store their memories on Sia for persistence and retrieval
 */
export class SiaStorage {
  private gatewayUrl: string
  private bucket: string

  constructor(gatewayUrl: string = 'http://localhost:9980', bucket: string = 'wonderful-memories') {
    this.gatewayUrl = gatewayUrl
    this.bucket = bucket
  }

  /**
   * Store a memory on Sia decentralized storage
   */
  async storeMemory(memory: Memory): Promise<{ hash: string; url: string }> {
    const data = JSON.stringify({
      content: memory.content,
      agentId: memory.agentId,
      timestamp: memory.timestamp,
      importance: memory.importance,
    })

    // Upload to Sia via renterd worker
    const response = await fetch(`${this.gatewayUrl}/api/worker/objects/${memory.id}?bucket=${this.bucket}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: data,
    })

    if (!response.ok) {
      throw new Error(`Sia upload failed: ${response.statusText}`)
    }

    // Get the object's hash/ETag
    const hash = response.headers.get('ETag') || memory.id
    
    return {
      hash,
      url: `${this.gatewayUrl}/api/worker/objects/${memory.id}?bucket=${this.bucket}`,
    }
  }

  /**
   * Retrieve a memory from Sia
   */
  async retrieveMemory(memoryId: string): Promise<Memory | null> {
    try {
      const response = await fetch(
        `${this.gatewayUrl}/api/worker/objects/${memoryId}?bucket=${this.bucket}`,
        { method: 'GET' }
      )

      if (!response.ok) return null

      const data = await response.json()
      return {
        id: memoryId,
        ...data,
      }
    } catch (e) {
      console.error('Failed to retrieve memory:', e)
      return null
    }
  }

  /**
   * List all memories for an agent
   */
  async listAgentMemories(agentId: string): Promise<Memory[]> {
    try {
      const response = await fetch(
        `${this.gatewayUrl}/api/worker/objects?bucket=${this.bucket}&prefix=${agentId}/`,
        { method: 'GET' }
      )

      if (!response.ok) return []

      const objects = await response.json()
      return objects.map((obj: any) => ({
        id: obj.key,
        agentId,
        content: '', // Would need individual fetches
        timestamp: Date.now(),
        importance: 0.5,
        siaHash: obj.etag,
      }))
    } catch (e) {
      console.error('Failed to list memories:', e)
      return []
    }
  }

  /**
   * Store memory locally as fallback (for hackathon demo)
   */
  storeLocal(memory: Memory): void {
    const memories = JSON.parse(localStorage.getItem('wonderful-memories') || '[]')
    memories.push(memory)
    localStorage.setItem('wonderful-memories', JSON.stringify(memories))
  }

  /**
   * Retrieve local memories
   */
  getLocalMemories(agentId?: string): Memory[] {
    const memories = JSON.parse(localStorage.getItem('wonderful-memories') || '[]')
    if (agentId) {
      return memories.filter((m: Memory) => m.agentId === agentId)
    }
    return memories
  }
}
