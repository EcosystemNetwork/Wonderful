---
name: venue-event-calendar
description: Build a 30 / 60 / 90-day programming calendar for a physical venue — a hacker house, members' club, coworking floor, community space, or event venue — that balances anchor events, recurring rituals, partner events, and private rentals. Distinct from community-space-ops (broader operations) and hackathon-in-a-box (single-event planning). Use whenever a user runs a physical space and needs to fill it with the right mix of events over time, asks 'what should we program at our space next month', 'build a 90-day event calendar', 'mix of public and private events for our venue', 'recurring rituals for our community house', or wants to balance utilization, revenue, and brand at a venue.
---

# Venue Event Calendar

Plan what happens inside a physical space over the next 30 / 60 / 90 days, balancing community vibe with revenue and brand.

## Workflow

1. Gather inputs about the venue:
   - Space type (hacker house, members' club, coworking floor, community venue, retail+events hybrid)
   - Capacity (seated, standing, hybrid)
   - Operating hours and any hard blackouts
   - Member or core community size if applicable
   - Revenue model (memberships, ticketed events, rentals, sponsorships, F&B, mixed)
   - Brand positioning (one sentence; e.g. "where SF AI builders ship")
   - Current calendar conflicts and recurring commitments
   - Budget for honoraria, food, AV
2. Decide on the event mix targets for the calendar window. Default mix for a 30-day window at a community-focused venue:
   - **Anchor events (1–2/month)** — large, capacity-stretching events that define the brand (summit, conference side-event, hackathon finale)
   - **Recurring rituals (weekly)** — same day-of-week, same format; office hours, Tuesday demo nights, Sunday brunch, builder dinner
   - **Partner-hosted (2–4/month)** — outside org hosts at the space, paying rental or revenue-share
   - **Member-led (open slots, 4–8/month)** — members host their own things; the space provides infrastructure
   - **Private rentals (1–2/month)** — paid bookings that subsidize the community calendar
3. Lay out the calendar as a date grid with each slot tagged by event type. Highlight conflicts and double-bookings. Mark "blackout" days needed for ops/cleaning/staff rest.
4. For each event slot, capture: name, host, expected attendance, revenue impact (positive/neutral/cost), brand impact (positive/neutral/negative), AV / food / staff requirements.
5. Compute utilization: planned-event-hours / available-hours. Target 50–70% for a community venue; <40% means under-programmed, >80% leads to staff burnout.
6. Compute the revenue roll-up. Identify the calendar's break-even point against the venue's monthly fixed costs if provided.
7. Produce the calendar with recurring patterns visible and ad-hoc events placed in the gaps.

## Output Format

Produce `venue-calendar-<venue>-<window>.md`:

```markdown
# <Venue Name> — <30/60/90>-Day Calendar
**Brand:** <one-line positioning> · **Capacity:** <n> · **Generated:** <date>

## Event Mix Target
| Type | Target/month | This window |
|---|---:|---:|

## Calendar
<week-by-week grid; each day shows event name + type tag>

## Anchor Events
| Date | Event | Expected | Revenue | Brand impact |
|---|---|---:|---:|---|

## Recurring Rituals
| Day | Time | Event | Host | Status |
|---|---|---|---|---|

## Partner & Private Bookings
| Date | Host | Type | Revenue | Conflicts |
|---|---|---|---:|---|

## Utilization
- Planned event hours: <n>
- Available hours: <m>
- Utilization: <%>

## Revenue Roll-up
| Source | Amount | % of monthly fixed costs |
|---|---:|---:|

## Conflicts to Resolve
<list of overlaps or capacity stretches that need a decision>

## Decisions Required
1. <date>: pick between <event A> and <event B>
2. <date>: confirm AV upgrade for <event>
3. ...
```

## Quality Bar

- Recurring rituals are non-negotiable in the calendar — they're the heartbeat of the space and the reason members renew. Cancelling one always requires an explicit call-out.
- Utilization stays in the 50–70% band for community venues; flag any week outside it.
- Brand impact is scored explicitly per event. A profitable private rental that conflicts with the brand still gets flagged.
- Conflicts are surfaced as decisions for the operator, not silently resolved. The skill recommends a choice but never commits.
- Private rentals are placed in a way that doesn't disrupt the recurring rituals — if a Saturday wedding kills Sunday brunch ops, that's a flagged conflict.
- Revenue projections are conservative and clearly labeled. Assume 70% of expected ticketed attendance shows up.
- 90-day windows leave the final month sparsely programmed on purpose. Over-committing 90 days out makes the calendar brittle to opportunities.
