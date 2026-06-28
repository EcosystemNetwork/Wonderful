---
name: business-workflow-decoder
description: Turn messy descriptions of business operations into clear, reusable workflows. Use when a user shares a rough process, daily task, voice note, transcript, SOP fragment, back-office routine, client delivery process, or wants to identify what an AI assistant or agent should do step by step.
---

# Business Workflow Decoder

Convert ambiguous business work into a practical operating map: triggers, inputs, decisions, tools, outputs, risks, and candidate automations.

## Workflow

1. Identify the business context: company type, role, customer, goal, volume, tools, and current pain.
2. Extract the workflow trigger: what starts the work, who starts it, and what "done" means.
3. Break the work into stages. Prefer 5-9 named stages over a huge checklist.
4. For each stage, capture:
   - actor
   - input
   - action
   - decision rule
   - output
   - tool or system used
   - failure mode
5. Separate judgment from clerical work. Mark each step as `human`, `AI-assisted`, or `agent-ready`.
6. Surface missing information as assumptions and questions. Do not pretend gaps are known.
7. Produce the operating map and a short automation brief.

## Output Format

Use this structure unless the user asks for another format:

```markdown
# Workflow Decoder: <workflow name>

## Current State
<plain-English summary of how the work appears to run today>

## Workflow Map
| Stage | Actor | Input | Action | Decision | Output | Tool | Automation Fit |
|---|---|---|---|---|---|---|---|

## Decision Rules
- <rule>

## Failure Modes
- <risk> -> <mitigation>

## Agent-Ready Opportunities
1. <opportunity>: <why it is suitable>

## Questions To Confirm
- <question>

## Next Build Brief
<one paragraph describing the first practical AI skill/agent to build>
```

## Quality Bar

- Keep the language operational, not motivational.
- Name concrete artifacts: emails, forms, CRMs, spreadsheets, proposals, invoices, call notes, tickets.
- Prefer one high-leverage workflow over broad transformation talk.
- If the process touches customers, include tone and escalation notes.
