---
name: agentic-engineering-audit
description: Audit an AI agent or LLM-powered system against the agentic-engineering discipline. Scores Harness, Context, Tool Design, Skills, Memory, Evals, Model Selection, Failure Modes, and Adversarial Collaborator patterns, then prescribes three highest-ROI fixes. Use when a user wants to review an agent architecture, diagnose why an agent is unreliable or expensive, prepare a production launch, critique an LLM system design doc, or ask whether an agent is production-ready.
---

# Agentic Engineering Audit

Score an AI agent across nine pillars, then prescribe three fixes with concrete impact and effort estimates.

## Workflow

1. Ingest the target:
   - GitHub repo URL: clone, then read entry points, agent loop, tool definitions, prompts, and any eval files.
   - Pasted code: read into a working directory.
   - Live URL: interact in 3–5 turns covering happy path plus one edge case.
   - Design doc: read and quote it directly in the scorecard.
2. Confirm the agent's one-sentence job and (if known) volume, latency target, monthly cost budget, known failure modes, team size.
3. Score each of the nine pillars 0–5 with concrete evidence (file paths, line numbers, transcript quotes).
4. Compute a weighted average — Harness, Context, Tool Design, and Evals weighted ×1.5 — and map to a letter grade.
5. Pick exactly three fixes maximizing (impact × feasibility) / cost. Never list more.
6. Produce the audit document below and share it.

## Pillar Rubric

| # | Pillar | "5" looks like | Common 0–2 failure |
|---|---|---|---|
| 1 | Harness | Explicit step caps, budget caps, retry policy, structured logging, replay capability | Naked `while True` with no cap |
| 2 | Context | Deliberate per-turn assembly from named sources with token budgets | Whole conversation history every call |
| 3 | Tool Design | Crisp names, typed args, idempotent semantics, clear error returns, docstrings the model can use | Free-form string returns, silent failures |
| 4 | Skills | Reusable capabilities packaged as discoverable, composable units with their own prompts and tests | Logic inlined in one mega-prompt |
| 5 | Memory | Explicit memory layers (session / project / user / org) with read/write rules and eviction | "Memory" = stuffing prior turns into context |
| 6 | Evals | Versioned eval set covering happy path, edges, regressions; runs in CI | Vibes-based testing in a notebook |
| 7 | Model Selection | Right model per step with explicit fallbacks | One frontier model for every call |
| 8 | Failure Modes | Handles tool timeout, model refusal, hallucinated args, infinite loops, partial completion | Single try/except that swallows everything |
| 9 | Adversarial Collaborator | A critic/judge step pushes back on the primary model | Model marks its own homework |

## Grade Mapping

- 4.5+ → A — production-ready
- 3.5–4.4 → B — ship-with-caveats
- 2.5–3.4 → C — beta, expect incidents
- 1.5–2.4 → D — prototype only
- <1.5 → F — pre-prototype

## Output Format

Produce `audit-<target>-<date>.md`:

```markdown
# Agentic Engineering Audit — <Target>

## Summary
<One paragraph + letter grade + headline weakness.>

## Scorecard
| # | Pillar | Score | Evidence |
|---|---|---:|---|

## Three Prescribed Fixes
1. **What:** <action sentence>
   **Why:** lifts <pillar> from X to Y (~+Z points)
   **How:** <concrete steps, code snippet if useful>
   **Effort:** <hours>

2. ...
3. ...

## Evidence Appendix
<File paths, line numbers, transcript quotes that support each score.>
```

## Quality Bar

- Specificity over diplomacy: cite file:line, not "context management could be improved."
- Recommendations are imperative: "Add a step cap of 25," not "consider limits."
- One example per pattern, not five.
- Exactly three fixes. The constraint is the point.
- Never grade above C without a passing eval suite in evidence.
