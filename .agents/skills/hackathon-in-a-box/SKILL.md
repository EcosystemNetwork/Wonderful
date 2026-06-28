---
name: hackathon-in-a-box
description: Generate a complete operational plan for a developer hackathon, AI build day, code sprint, builder summit, or sponsor-backed competitive event. Produces event summary, run of show, judging rubric, prize and sponsor tiers, judge brief, participant comms, logistics checklist, lead capture guardrails, budget worksheet, and risk register. Use when the user is planning, organizing, pitching, or improving a hackathon or competitive builder event.
---

# Hackathon In A Box

Turn a theme, sponsor brief, or rough event concept into a complete hackathon operating plan that an organizer can run from top to bottom.

## Operating Principles

- Optimize the event around one outcome: recruiting, ecosystem adoption, signups, integrations shipped, qualified leads, content, or community growth.
- Be specific about timing, ownership, decision points, and handoffs.
- Default to a one-day format unless the user specifies a weekend, multi-day, hybrid, virtual, or async event.
- Prefer working demos over slides, sponsor workshops over sponsor logos, fewer high-value prizes over many small prizes, and consent-based lead capture only.
- Mark unknowns as `[assumption: ...]` and keep moving.

## Workflow

1. Gather inputs: theme, sponsor or host, target participant, city or format, expected headcount, budget, event length, technical stack, and primary success metric.
2. Anchor every section to the success metric. If the sponsor wants signups, weight prizes, judging, and comms toward signup-driving demos.
3. Produce the full operating plan in the output structure below.
4. Use concrete times and owners. Avoid "morning" or "afternoon" when an hour is needed.
5. Include quality gates for the two moments that most often go wrong: submission cutoff and demo logistics.
6. Keep sponsor data rights explicit and consent-based.

## Output Format

```markdown
# <Event Name> Hackathon Plan

## Event Summary
- Theme:
- Target participant:
- Optimized outcome:

## North-Star Goal
<3-5 sentences tying the event plan to the success metric.>

## Run Of Show
| Time | Activity | Owner | Notes |
|---|---|---|---|
<T-30 days through T+14 days where useful; hour-level detail on event days.>

## Judging Rubric
| Criterion | Weight | High Score Looks Like |
|---|---:|---|
<4-6 dimensions totaling exactly 100 points.>

Tie-break:
Anti-patterns to penalize:

## Prize And Sponsor Tier Structure
<Prize breakdown plus Title, Track, and Supporting sponsor tiers with concrete benefits.>

## Judge Brief
<Copy-paste brief covering the rubric, time commitment, demo flow, scoring sheet, and expectations.>

## Participant Comms Timeline
- Registration confirmation:
- T-minus 1 week:
- T-minus 1 day:
- Day-of:
- Post-event recap:

## Logistics Checklist
- Venue and access:
- Food, water, and power:
- Wifi and dev environment:
- Hardware and credentials:
- Signage:
- AV and demo flow:

## Lead Scoring Sheet
attendee_name, team, project_title, github_url, demo_video_url, technical_depth, theme_fit, contacted_consent, sponsor_priority_1_5, notes

## Budget Worksheet
| Category | Amount | Notes |
|---|---:|---|

## Risk Register
| Risk | Mitigation |
|---|---|
<Top risks: attendance miss, sponsor pullout, API outage, judging dispute, no-show keynote, demo delays.>
```

## Quality Bar

- Rubric weights add to exactly 100.
- Budget categories sum to the stated budget within 5% when a budget is provided.
- Comms templates are copy-pasteable plain text.
- Lead capture is consent-based.
- A first-time organizer could run the event without inventing the missing operating layer.
