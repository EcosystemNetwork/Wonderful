---
name: multi-event-radar
description: Survey upcoming events across a city or region within a date window and rank them by ICP density — which events are worth attending or sponsoring for a given target audience. Produces a ranked event calendar with attendance estimates, audience-fit scores, sponsor presence, cost-to-attend, and ROI projections. Distinct from event-radar (which extracts attendees from one event) and event-leads (which scores attendees of a single event). Use whenever a user wants to plan which events to attend or sponsor over the next weeks, asks 'what AI events should I go to next month', 'rank Devcon side events for us', 'which SF builder events are worth sponsoring', 'plan my event calendar for Q3', or wants to triage many candidate events down to a focused list.
---

# Multi-Event Radar

Decide which events to attend or sponsor by surveying many at once and ranking them against a defined ICP.

## Workflow

1. Gather inputs: target audience (e.g. "AI agent founders", "DevRel at infra companies", "voice-AI engineers"), geography (city, multi-city, or virtual-ok), date window (default next 30 days), purpose (attend, speak, sponsor, scout-talent), budget per event if sponsoring, max events selectable (default top 5).
2. Build the candidate set by surveying:
   - Luma / Lu.ma city pages and the discover feed
   - Eventbrite tech listings for the region
   - Partiful and other invite-style platforms for known builder events
   - Specific known venues (Frontier Tower, Shack15, Solaris, AGI House for SF; equivalents per city)
   - Conference side-event aggregators when the date window overlaps a major conference (Devcon, NeurIPS, KubeCon, AI Engineer)
3. For each candidate event, capture: date, venue, host org, declared theme, capacity, registration URL, free/paid status, sponsor list if visible, expected speaker tier.
4. Score each event 0–1 against the ICP across these dimensions:
   - **Audience fit (0.40)** — declared theme + venue history + host org's typical attendee profile
   - **Density (0.25)** — expected ICP attendees / total attendees; small high-density events beat large low-density ones
   - **Access (0.15)** — can the user actually meet attendees, or is it stadium-format
   - **Reputation lift (0.10)** — speaking or sponsoring at this event signals what
   - **Cost efficiency (0.10)** — for sponsors: $/expected-ICP-touch; for attendees: hours-cost + ticket price
5. Apply hard filters: events the user has already attended this quarter, conflicting dates with higher-scored events, events failing any explicit user constraints (no-paid, no-virtual, etc.).
6. Produce the calendar with the top N events plus an explicit "skip list" of events that look attractive but failed scoring.

## Output Format

Produce `event-calendar-<purpose>-<date-window>.md`:

```markdown
# Multi-Event Radar — <Purpose> · <Date Window>
**ICP:** <one-line target audience>
**Geography:** <city/region>
**Surveyed:** <n> events · **Selected:** <top N>

## Recommended (in priority order)
| Rank | Date | Event | Venue | Score | Why |
|---:|---|---|---|---:|---|

## Skip List (looked attractive, didn't make the cut)
| Event | Score | Why skipped |
|---|---:|---|

## Conflict Log
<dates where two top-scored events overlap; who you'd choose>

## Budget Roll-up (if sponsoring)
| Event | Sponsor tier | Cost | Expected ICP touches | $/touch |
|---|---|---:|---:|---:|

## Next Actions
1. RSVP to <event> by <deadline>
2. Request sponsor deck from <event> by <deadline>
3. Block calendar for <date range>
```

Save the underlying scoring data as `event-calendar-<purpose>-<date-window>.csv` and share both.

## Quality Bar

- Survey breadth: at least 3 different sources unless the user explicitly limits scope. Never produce a ranking from only one platform's listings.
- Every score has a one-line justification tied to a concrete signal, not a vibe.
- The skip list is required, not optional. Showing what you rejected proves the ranking is real.
- Conflicts are surfaced explicitly. Never quietly omit a conflict to make the calendar look clean.
- Sponsor recommendations require sponsor-tier and cost data. Without a published sponsor deck, output "request deck" as the next action rather than guessing tiers.
- Hot dates (week-of major conferences) get re-ranked by side-event density, not by isolated event score.
- Never recommend more events than the user can realistically attend. If the user said max 5 and you have 12 strong candidates, the answer is still 5.
