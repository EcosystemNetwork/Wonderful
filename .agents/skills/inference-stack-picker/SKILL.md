---
name: inference-stack-picker
description: Pick an LLM inference stack — provider, model, and hardware — given throughput, latency, cost, sovereignty, and compliance constraints. Compares hyperscaler APIs (OpenAI, Anthropic, Google), dedicated inference clouds (Nebius, Together, Fireworks, Groq, Cerebras), and self-hosted options (vLLM, SGLang, tinygrad). Use when a user asks where to run a model, how to reduce LLM cost, whether to self-host versus use an API, how to plan GPU sovereignty, or to compare inference providers.
---

# Inference Stack Picker

Match an LLM workload to the right inference stack with cost-per-million-tokens math and a migration ladder.

## Workflow

1. Gather inputs: target model(s), sustained throughput (tokens/sec or req/sec with avg in/out), latency target (TTFT p50 and tok/s/stream), workload shape (interactive / batch / mixed), budget ($/month or $/M tokens ceiling), sovereignty (none / EU-only / specific cloud / on-prem / air-gapped), compliance.
2. Drop any provider that fails a hard constraint. Do not include "honorable mentions."
3. Build a shortlist of 3–5 candidates with price-stamped rates and the lookup date.
4. Pick one primary and one fallback. Map the choice to the user's top two constraints.
5. Show $/month math at the user's stated volume with ±30% sensitivity.
6. Place the user on the migration ladder and name the next transition.
7. If self-host is on the shortlist, run the viability check.
8. Flag the top three risks with mitigations.

## Migration Ladder

| Phase | Volume | Stack | Why |
|---|---|---|---|
| 0 Prototype | <50M tok/mo | Hyperscaler API | Speed of iteration > cost |
| 1 Early production | 50M–500M tok/mo | Dedicated inference cloud on open weights | 2–5× cheaper, same SLA |
| 2 Scale | 500M–5B tok/mo | Reserved capacity (Groq/Cerebras for speed; Nebius for $/tok) | Predictable cost and latency |
| 3 Strategic | >5B tok/mo or sovereignty | Self-host (vLLM/SGLang) on rented or owned GPUs | Margin + sovereignty |

## Sovereignty Options

- EU: Nebius EU regions, Mistral La Plateforme, Aleph Alpha, OVHcloud
- Air-gapped: vLLM/SGLang on owned GPUs (DGX, tinybox, MI300X)
- Specific cloud: Bedrock (AWS), Vertex (GCP), Foundry (Azure), or marketplace partners
- US-only: most providers; verify in terms

## Output Format

Produce `inference-recommendation-<workload>.md`:

```markdown
# Inference Recommendation — <Workload>

## Workload Profile
<one paragraph restating constraints; call out conflicts.>

## Shortlist (prices as of <date>)
| Provider | Model | $/1M in | $/1M out | TTFT p50 | tok/s/stream | Sovereignty | Notes |
|---|---|---:|---:|---:|---:|---|---|

## Recommendation
**Primary:** <provider/model> — <3–5 sentence rationale tied to top 2 constraints>
**Fallback:** <provider/model> — <rationale>

## Cost Math
monthly_cost = (in_tokens × $/M_in + out_tokens × $/M_out) × calls/month
<computed for primary and fallback, ±30% sensitivity>

## Migration Ladder Placement
Currently at Phase <n>. Next transition trigger: <volume or sovereignty event>.

## Self-Host Viability (if applicable)
- GPU memory needed: <model_size × precision × batch>
- Throughput per GPU at <quantization>
- Break-even vs API at <volume>
- Ops cost: <DevOps headcount / on-call burden>

## Risks
1. <risk> — <mitigation>
2. <risk> — <mitigation>
3. <risk> — <mitigation>
```

## Quality Bar

- Date-stamp every price with a source link.
- Pick one primary. Do not punt with "depends."
- Open-weights bias for non-frontier tasks. Most workloads are over-served by GPT-4-class models.
- Self-host below ~500M tok/mo is almost never worth it. Say so.
- Math, not vibes. If $/1M can't be computed, the recommendation isn't ready.
