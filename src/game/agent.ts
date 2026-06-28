import { Agent, AgentAction, Challenge, ImprovementEntry } from './types'
import { NEBIUS_CONFIG } from '../api/nebius'

/**
 * Parse a JSON object from an LLM response, tolerating markdown code fences or
 * surrounding prose that some models emit even when JSON mode is requested.
 */
function parseJSON<T>(content: string | null | undefined): T {
  if (!content) throw new Error('Empty LLM response')
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : content
  try {
    return JSON.parse(candidate) as T
  } catch {
    const span = candidate.match(/\{[\s\S]*\}/)
    if (span) return JSON.parse(span[0]) as T
    throw new Error('No JSON object found in LLM response')
  }
}

/**
 * SelfImprovingAgent - Core AI agent that learns from experience
 * Uses Nebius LLM for reasoning and strategy generation
 */
export class SelfImprovingAgent {
  private agent: Agent
  private llmClient: any // Nebius/OpenAI compatible client

  constructor(agent: Agent, llmClient: any) {
    this.agent = agent
    this.llmClient = llmClient
  }

  /**
   * Main decision loop - agent chooses action based on current state
   */
  async decideAction(challenge: Challenge, context: string): Promise<AgentAction> {
    const prompt = this.buildDecisionPrompt(challenge, context)
    
    const response = await this.llmClient.chat.completions.create({
      model: NEBIUS_CONFIG.model,
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const decision = this.parseDecision(response.choices[0].message.content)
    
    // Log the reasoning for future improvement analysis
    this.agent.memories.push(`Turn decision: ${decision.reasoning}`)
    
    return decision
  }

  /**
   * Self-improvement loop - analyze performance and update strategy
   */
  async improveStrategy(performance: number, events: string[]): Promise<void> {
    const oldStrategy = this.agent.strategy
    
    const prompt = `
You are an AI agent analyzing your own performance to improve.

Current Strategy: ${oldStrategy}
Recent Performance Score: ${performance}/100
Recent Events:
${events.map(e => `- ${e}`).join('\n')}

Your role: ${this.agent.role}
Your stats: ${JSON.stringify(this.agent.stats)}
Your skills: ${this.agent.skills.join(', ')}

Analyze what worked and what didn't. Propose a new improved strategy.
Return ONLY a JSON object:
{
  "analysis": "brief analysis of performance",
  "newStrategy": "the improved strategy description",
  "skillToLearn": "suggested new skill or existing skill to improve"
}
`

    const response = await this.llmClient.chat.completions.create({
      model: NEBIUS_CONFIG.model,
      messages: [
        { role: 'system', content: 'You are a self-improving AI agent. Be concise and strategic.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 400,
      response_format: { type: 'json_object' }
    })

    try {
      const improvement = parseJSON<{ newStrategy: string; skillToLearn?: string }>(
        response.choices[0].message.content
      )
      
      const entry: ImprovementEntry = {
        timestamp: Date.now(),
        trigger: `Performance score: ${performance}`,
        oldStrategy,
        newStrategy: improvement.newStrategy,
        performanceDelta: performance - this.getAveragePerformance()
      }

      this.agent.improvementLog.push(entry)
      this.agent.strategy = improvement.newStrategy
      
      if (improvement.skillToLearn && !this.agent.skills.includes(improvement.skillToLearn)) {
        this.agent.skills.push(improvement.skillToLearn)
      }
    } catch (e) {
      console.error('Failed to parse improvement:', e)
    }
  }

  /**
   * Compress memories using LLM to prevent context overflow
   */
  async compressMemories(): Promise<void> {
    if (this.agent.memories.length < 10) return

    const prompt = `
Summarize the following agent memories into 3 key insights:
${this.agent.memories.slice(-20).join('\n')}

Return as JSON: {"insights": ["insight1", "insight2", "insight3"]}
`

    const response = await this.llmClient.chat.completions.create({
      model: NEBIUS_CONFIG.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    })

    try {
      const result = parseJSON<{ insights: string[] }>(response.choices[0].message.content)
      this.agent.memories = [
        ...this.agent.memories.slice(0, -20),
        `Compressed insights: ${result.insights.join(' | ')}`
      ]
    } catch (e) {
      console.error('Memory compression failed:', e)
    }
  }

  private buildDecisionPrompt(challenge: Challenge, context: string): string {
    return `
Current Challenge: ${challenge.type} (Difficulty: ${challenge.difficulty}/10)
Description: ${challenge.description}

Context: ${context}

Your Agent:
- Name: ${this.agent.name}
- Role: ${this.agent.role}
- Level: ${this.agent.level}
- Stats: ${JSON.stringify(this.agent.stats)}
- Skills: ${this.agent.skills.join(', ')}
- Strategy: ${this.agent.strategy}

Recent Memories: ${this.agent.memories.slice(-5).join('; ')}

Choose your action. Return JSON:
{
  "action": "specific action description",
  "target": "target if applicable",
  "reasoning": "why you chose this",
  "confidence": 0.0-1.0
}
`
  }

  private getSystemPrompt(): string {
    return `You are ${this.agent.name}, a ${this.agent.role} in a tactical AI game. 
You make decisions based on your role, stats, and learned experiences.
You improve over time by analyzing your successes and failures.
Always respond with valid JSON.`
  }

  private parseDecision(content: string | null): AgentAction {
    try {
      const parsed = parseJSON<Partial<AgentAction>>(content)
      return {
        agentId: this.agent.id,
        action: parsed.action ?? 'observe',
        target: parsed.target,
        reasoning: parsed.reasoning ?? 'No reasoning provided',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      }
    } catch {
      return {
        agentId: this.agent.id,
        action: 'observe',
        reasoning: 'Failed to parse decision, defaulting to observation',
        confidence: 0.1
      }
    }
  }

  private getAveragePerformance(): number {
    if (this.agent.improvementLog.length === 0) return 50
    const sum = this.agent.improvementLog.reduce((acc, entry) => acc + entry.performanceDelta, 0)
    return 50 + (sum / this.agent.improvementLog.length)
  }

  getAgent(): Agent {
    return this.agent
  }
}
