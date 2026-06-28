---
name: agent-opportunity-audit
description: Audit a business, team, role, workflow, or tool stack to identify practical AI assistant and AI agent opportunities. Use when a user wants to know what to automate, where agents could save time or increase revenue, how to prioritize AI implementation, or what first agent/skill to build.
---

# Agent Opportunity Audit

Find AI opportunities that are specific, buildable, and tied to business value.

## Workflow

1. Map the business model: audience, offer, delivery model, team, tools, and bottlenecks.
2. List recurring work across acquisition, sales, onboarding, delivery, operations, finance, support, and content.
3. Score each opportunity from 1-5 on:
   - frequency
   - time cost
   - revenue impact
   - error risk
   - data availability
   - workflow clarity
   - human-approval need
4. Classify each opportunity:
   - `assistant`: drafts, summarizes, analyzes, or prepares work for a human
   - `skill`: repeatable workflow Codex can follow
   - `agent`: can take multi-step action across tools with guardrails
   - `not yet`: requires process cleanup first
5. Recommend the first build by balancing value, speed, trust, and data readiness.
6. Explain the implementation wedge: the smallest useful version that proves the value.

## Output Format

```markdown
# AI Agent Opportunity Audit

## Business Snapshot
<concise summary>

## Opportunity Map
| Rank | Opportunity | Area | Type | Value | Readiness | Risk | First Version |
|---|---|---|---|---:|---:|---:|---|

## Top 3 Builds
1. <name>
   - Why now:
   - What it would do:
   - Required inputs:
   - Human approval:
   - Success metric:

## Do Not Automate Yet
- <workflow>: <reason>

## First 7-Day Implementation Plan
Day 1: <step>
Day 2-3: <step>
Day 4-5: <step>
Day 6-7: <step>

## Questions Before Build
- <question>
```

## Scoring Guidance

- High readiness means the process is already done the same way most of the time.
- High value without clear data is a consulting opportunity, not an immediate agent build.
- Customer-facing actions need approval gates unless the user explicitly says otherwise.
- Prefer the first build that creates a visible win quickly.
