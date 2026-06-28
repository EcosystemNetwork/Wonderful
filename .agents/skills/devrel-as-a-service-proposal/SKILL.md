---
name: devrel-as-a-service-proposal
description: Generate a scoped statement-of-work for a fractional Developer Relations engagement. Produces objectives mapped to a real activation funnel, mechanisms drawn from a fixed menu, three pricing tiers, kill-switches, and a proof section. Use when a user wants to draft a DevRel SOW, scope a fractional DevRel engagement, price a developer event or community contract, define non-vanity DevRel KPIs, or evaluate an inbound DevRel proposal.
---

# DevRel As A Service Proposal

Write a tight, defensible SOW for selling or buying fractional Developer Relations work, anchored on the activation funnel rather than vanity metrics.

## Workflow

1. Gather inputs: client company and what they sell, dominant pain (no devs know us / devs sign up but don't ship / shipping but no community / want events but won't staff them), engagement length (default 3 months; offer 1mo pilot and 6mo extended), budget signal, seller's prior wins to plug into proof, geography.
2. Pick one or two stages of the activation funnel for the engagement to own. Never commit to all five.
3. Choose 3–5 mechanisms from the fixed menu sized to the budget.
4. Price three tiers with transparent hours math.
5. Define three explicit kill-switches.
6. Produce a SOW following the Output Format below.

## Activation Funnel (KPI Framework)

| Stage | Metric | What it proves |
|---|---|---|
| Awareness | Qualified dev impressions (event attendees + repo referral stars) | Reach into the right segment |
| Signup | New accounts attributed to the DevRel motion | Top of funnel works |
| Activation | Devs who completed first integration / shipped working code | Product is usable |
| Retention | Devs who shipped a 2nd integration in 30 days | Product is lovable |
| Advocacy | Devs who publicly shipped or talked about it | Pipeline self-sustains |

## Mechanism Menu

- Builder events (hackathons, dinners, workshop nights)
- Lighthouse integrations (paid pilots with 3–5 named devs)
- Office hours (recurring 1h with eng)
- Sample app program (curated starters in 3 frameworks)
- Conference presence (talks, booths, side events)
- Community plumbing (Discord/Slack setup, role bot, leaderboard, welcome flow)
- Docs surgery (deep edit of getting-started + top 3 trafficked pages)

## Output Format

Produce `devrel-sow-<client>.md`:

```markdown
# DevRel SOW — <Client>

## Executive Summary
<Client> sells <X> to developers but <pain>. Over <duration> we will <core mechanism> to deliver <primary KPI>. Investment: <$range>. Out: <explicit non-goals>.

## Objectives & Non-Goals
- Objective 1 — Primary KPI: ...
- Objective 2 — Primary KPI: ...
- Objective 3 — Primary KPI: ...
- Not in scope: <3–5 items>

## Funnel Stages Owned
<Which 1–2 stages this engagement is accountable for, with targets.>

## Mechanisms
| Mechanism | What ships | Owner | Cadence | KPI contribution |
|---|---|---|---|---|

## Pricing Tiers
| Tier | Length | Investment | Hours/week | Mechanisms |
|---|---|---:|---:|---|
| Pilot | 1 month | $X | n | 1 |
| Standard | 3 months | $Y | n | 3 |
| Embedded | 6 months | $Z | n | all |

## Kill-Switches
1. Pilot misses agreed activation threshold → no auto-renew.
2. Client product has 30-day outage of dev-relevant surface → engagement pauses, fee prorated.
3. Either side: 30-day written notice for any reason.

## Proof
- <event/program> — <metric outcome> — <link>

## Next Steps
Reply to confirm tier. We countersign within 48h. Kickoff within 7 days of signature.
```

## Quality Bar

- Pricing must show defensible hours math. "$Y = X hours/week × 12 weeks at $Z/hr."
- State a hard activation-threshold number for the kill-switch, not a vibe.
- Non-goals list is at least as specific as the objectives list.
- Proof items link to real repos or event pages.
- Never substitute funnel stages for vanity metrics (followers, impressions, downloads alone).
