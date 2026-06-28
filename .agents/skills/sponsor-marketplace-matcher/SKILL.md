---
name: sponsor-marketplace-matcher
description: Match an event, community, or venue to the right sponsors based on audience overlap, vertical fit, sponsor budget cycle, and past sponsor behavior. Distinct from sponsor-outreach-kit and sponsor-pitch-deck (which produce outreach assets) — this skill answers the upstream question of which sponsors to pursue in the first place. Produces a ranked sponsor target list with fit rationale, expected tier interest, decision-maker handles, and timing notes. Use whenever a user is hunting for sponsors and asks 'who should sponsor this event', 'which companies fit our audience', 'recommend sponsors for our DevRel program', 'match us to potential sponsors', 'who else might sponsor like X did', or needs a vetted target list before writing outreach.
---

# Sponsor Marketplace Matcher

Build a ranked sponsor target list grounded in audience fit, not vibes — the upstream step before any outreach skill runs.

## Workflow

1. Gather inputs about the event/community/venue:
   - **Audience profile** — primary persona (e.g. "AI agent engineers shipping in production"), seniority distribution, geography, expected attendance, retention if a recurring program
   - **Theme + vertical** — AI infra, voice AI, web3, devtools, climate, etc.
   - **Past sponsors** — list with tier and outcome if known
   - **Format** — single event, series, community, venue
   - **Tier ceiling** — max tier $ available (filters out brands too small to take the top tier)
2. Build the candidate sponsor pool from these sources, parallelized:
   - Companies whose product targets the audience persona (LLM infra → Nebius, Together, Fireworks, Groq, etc.)
   - Companies who sponsored similar events in the past 12 months
   - Companies whose budget cycle aligns with the event date (Q4 budget flush, fiscal-year reset)
   - Companies announcing new products in the relevant vertical (sponsor budgets follow product launches)
   - Companies who would benefit from access to this specific audience for recruiting, not just sales
3. Score each candidate sponsor across:
   - **Audience overlap (0.40)** — does their target buyer match the event's attendee profile
   - **Sponsor track record (0.20)** — have they sponsored similar events; what tier; was it renewed
   - **Budget timing (0.15)** — aligned with event date based on public fiscal calendar
   - **Strategic fit (0.15)** — is this the right venue for them right now (new product launch, market push, recruiting drive)
   - **Decision-maker reachable (0.10)** — is there a known DevRel, marketing, or founder contact reachable via warm intro or public channel
4. Identify the decision maker per sponsor. Default order of who to target: DevRel lead → Head of Developer Marketing → CMO → Founder/CEO (if startup < 50). For each, find the public handle (X, GitHub, LinkedIn) and one signal that they care about this audience.
5. Apply hard filters: companies the event already approached in the last 6 months and got declined, direct competitors of an existing top-tier sponsor, companies on the user's explicit do-not-pitch list.
6. Produce a ranked target list with rationale and timing notes.

## Output Format

Produce `sponsor-targets-<event-name>.md` plus a `sponsor-targets-<event-name>.csv`:

```markdown
# Sponsor Target List — <Event/Community>
**Audience:** <persona> · **Theme:** <vertical> · **Date:** <date>
**Surveyed:** <n> candidates · **Selected:** top <N>

## Tier-1 Targets (highest fit)
| Sponsor | Score | Why fit | Likely tier | Decision maker | Timing note |
|---|---:|---|---|---|---|

## Tier-2 Targets (strong fit, smaller tiers)
| Sponsor | Score | Why fit | Likely tier | Decision maker | Timing note |
|---|---:|---|---|---|---|

## Stretch Targets (longer-shot, high upside)
| Sponsor | Score | Why fit | Likely tier | Decision maker | Timing note |
|---|---:|---|---|---|---|

## Filtered Out (with reason)
<short list — recently-declined, competitor conflict, do-not-pitch>

## Outreach Sequencing
- Week 1: top 3 Tier-1 via warm intro path
- Week 2: remaining Tier-1 + Tier-2 via direct outreach
- Week 3: Stretch list

## Hand-off
Pipe this list into `sponsor-outreach-kit` to generate outreach assets.
```

## Quality Bar

- Every match has a specific reason tied to a concrete signal (a recent product launch, a known prior sponsorship, an observed audience overlap). "Big AI company, probably fits" is not a reason.
- Decision-maker is a person with a public handle, not a generic role. If the person can't be identified, mark as "research needed" and put the company on the stretch list.
- Tier projection is grounded in their past sponsorship history if known, not aspirational.
- Hard filters are non-negotiable: never propose a sponsor on the user's do-not-pitch list even if the fit looks perfect.
- Output hands off to `sponsor-outreach-kit` — do not redo the work that skill is for.
- If the candidate pool is fewer than 20, say so. A target list of 5 from a pool of 7 is fragile.
