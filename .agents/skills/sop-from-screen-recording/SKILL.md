---
name: sop-from-screen-recording
description: Convert screen recordings, Loom transcripts, walkthrough notes, voice notes, rough demos, or process explanations into polished standard operating procedures. Use when a user provides a transcript, raw notes, or a description of someone doing work and wants an SOP, checklist, training doc, or delegation guide.
---

# SOP From Screen Recording

Turn a rough walkthrough into an SOP a contractor, employee, or AI agent can follow without guessing.

## Workflow

1. Infer the task title, business goal, audience, tools, and expected final output.
2. Remove filler, repeated narration, apologies, and irrelevant side comments.
3. Preserve important screen-specific details: button labels, menu paths, field names, URLs, filters, naming conventions, and required files.
4. Reconstruct the actual sequence of actions. If the transcript jumps around, reorder into the work's natural order.
5. Add decision points, quality checks, and escalation rules.
6. Call out missing information as assumptions or questions.
7. Add an AI-agent adaptation when useful: what can be automated, what requires human approval, and what data is needed.

## Output Format

```markdown
# SOP: <task name>

## Purpose
<why this task matters>

## When To Run This
- <trigger>

## Required Access And Inputs
- <tool/account/file>

## Procedure
1. <step>
2. <step>

## Decision Points
| Situation | What To Do |
|---|---|

## Quality Check
- <check>

## Escalate When
- <condition>

## Common Mistakes
- <mistake> -> <prevention>

## Agent Adaptation
<how an AI assistant or agent could execute or support this SOP>

## Open Questions
- <question>
```

## Quality Bar

- Write in direct imperative language.
- Include enough detail that someone can perform the task on their first try.
- Do not invent credentials, private URLs, or policies. Mark unknowns.
- Keep the SOP boringly clear. This is operations, not content marketing.
