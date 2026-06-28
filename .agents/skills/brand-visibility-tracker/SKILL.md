---
name: brand-visibility-tracker
description: Track how often a brand, product, or person shows up in answers from major LLM assistants (ChatGPT, Gemini, Claude, Perplexity, Copilot) for a defined set of queries, then produce a daily or weekly visibility report card with rank, share-of-voice, sentiment, and competitor comparison. Use whenever a user wants to monitor LLM brand visibility, measure AI search presence, track AEO (AI Engine Optimization), compare their share-of-voice vs competitors in LLM answers, asks 'how often does ChatGPT mention us', 'are we showing up in AI search', 'track our brand across LLMs', or wants the AI-era equivalent of SEO rank tracking.
---

# Brand Visibility Tracker

Measure and report a brand's presence across LLM assistant answers — the AI-era equivalent of SEO rank tracking.

## Workflow

1. Define the tracking inputs: brand name plus 1–3 alternate spellings/aliases, 3–5 named competitors, 20–50 tracking queries (the questions a target buyer would actually ask an LLM), models to track (default: GPT-4o via ChatGPT, Gemini 2.0 Pro, Claude Sonnet, Perplexity, Copilot), cadence (daily or weekly), region/locale if relevant.
2. For each model × query combination, capture the model's answer text. Use a multi-LLM API gateway when available; otherwise capture via direct provider APIs and standardize the response format.
3. Score each answer for the brand and each competitor:
   - **Mention rank** — first mention position (1 = first sentence, 0 = not mentioned)
   - **Mention count** — total mentions in the answer
   - **Citation rank** — first inline citation/link position (if model supports citations)
   - **Sentiment** — positive / neutral / negative / mixed, on the brand's mentions specifically
   - **Context tag** — what role the brand plays in the answer (recommended primary, listed-among-many, mentioned-as-alternative, mentioned-negatively, not-mentioned)
4. Aggregate per query across models, per model across queries, and overall.
5. Compute share-of-voice: brand mentions / (brand mentions + competitor mentions) across all answers.
6. Diff against the previous run. Flag any movements > 10% absolute change in share-of-voice or any model where the brand dropped out of the top-3 mentions.
7. Produce a report card with the structure below and an underlying CSV of raw scores.

## Output Format

Produce `brand-visibility-<brand>-<date>.md` and `brand-visibility-<brand>-<date>.csv`:

```markdown
# Brand Visibility Report — <Brand>
**Period:** <date> (vs <previous date>)
**Queries tracked:** <n>
**Models:** ChatGPT, Gemini, Claude, Perplexity, Copilot

## Headline
- Share-of-voice: <X>% (Δ <±Y>%)
- Mentioned in: <n>/<N> queries (Δ <±n>)
- Sentiment skew: <positive/neutral/negative %>

## Per-Model Breakdown
| Model | Mentioned (n/N) | Avg rank | Share-of-voice | Sentiment |
|---|---:|---:|---:|---|

## Per-Query Heatmap
<table — rows: queries, cols: models, cells: rank or "—">

## Competitor Comparison
| Competitor | Mentions | Share-of-voice | Δ |
|---|---:|---:|---:|

## Movers
- Queries where brand newly appeared: ...
- Queries where brand dropped out: ...
- Sentiment shifts: ...

## Notable Quotes
<3–5 verbatim snippets showing how the brand is being described>

## Recommended Actions
1. <action tied to a specific observation>
2. <action tied to a specific observation>
3. <action tied to a specific observation>
```

## Quality Bar

- Use the exact same queries across runs. Changing the query set breaks longitudinal comparison.
- Stamp the report with the precise timestamp and the model versions used. LLM behavior shifts week to week.
- Sentiment is scored on brand mentions only — not the whole answer. A glowing answer that mentions the brand negatively is a negative signal.
- Never claim a competitor lost ground without verifying the model versions are consistent across the two runs.
- Show actual quotes in the report. Numbers without quotes are not actionable.
- Recommended actions are tied to specific observations, not generic ("invest in SEO" is not allowed; "publish a comparison post on <topic Y> where we are not mentioned" is).
- Cache raw answers for at least the comparison window so re-scoring is possible if the scoring rubric changes.
