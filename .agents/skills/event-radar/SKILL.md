---
name: event-radar
description: Decide which events are worth attending and who to pitch there, or turn event attendees into a scored, deduped, CRM-ready lead list. Use when a user is choosing conferences, meetups, hackathons, or summits to attend, asks whether an event is worth it, wants target people or companies to meet, provides a Luma/Lu.ma URL or attendee CSV, wants to score event leads, dedupe attendees, diff against a CRM, or plan event follow-up.
---

# Event Radar

Handle two event GTM jobs:

- **Attend Radar**: rank which events deserve time, travel, and attention.
- **Lead Intelligence**: score attendees or guests into a careful follow-up list.

## Operating Principles

- Rank by expected value to the user's real goal: pipeline, hiring, partnerships, learning, visibility, recruiting, or ecosystem adoption.
- Be concrete about why each event, attendee, or company ranks where it does.
- When data is thin, search for agenda, speaker list, sponsors, attendee profile, or past-year signals; mark assumptions as `[assumption: ...]`.
- Use consent-based follow-up. Do not enrich private emails or phone numbers.
- Never auto-import low-confidence rows. Quarantine them.

## Workflow

1. Identify the mode:
   - Use Attend Radar when the user asks which events to attend, where to go, whether an event is worth it, or who to meet there.
   - Use Lead Intelligence when the user provides an event URL, attendee list, guest list, CRM/list, or asks to score/dedupe/import leads.
2. Confirm the user's goal segment and success metric.
3. Gather source data:
   - Event list, city + date range, or rough event names for Attend Radar.
   - Luma URL, attendee CSV, pasted guest list, or CRM/list diff for Lead Intelligence.
4. Rank or score using visible, explainable signals.
5. Produce a clear action plan, not just a summary.

## Attend Radar Output

```markdown
# Event Radar

## Goal Frame
<one line restating what the user is optimizing for>

## Ranked Events
| Rank | Event | Date | Location | Cost | Call | Reason |
|---:|---|---|---|---:|---|---|

## Per-Event Target List
| Event | Person/Company | Why They Matter | Where To Find Them | Risk/Note |
|---|---|---|---|---|

## Schedule
<what to commit to, delegate, do remotely, or skip>

## Outreach Starters
- <target>: <one-line opener>
```

## Lead Intelligence Output

Produce three artifacts when files are appropriate:

- `<event>-import.csv`: top-scored, ready for CRM import
- `<event>-quarantine.csv`: needs human review, with `reason`
- `<event>-summary.md`:

```markdown
# <Event Name> Event Radar Summary

## Snapshot
- Source:
- Pulled:
- Goal segment:
- Threshold:

## Score Histogram
- High:
- Quarantined:
- Filtered out:

## Top 10
| Name | Title | Company | Score | Why |
|---|---|---|---:|---|

## Diff vs CRM
- Net new:
- Existing stale:
- Existing fresh:

## Recommended Follow-Up Window
<48-72h with channel suggestion>
```

## Quality Bar

- A user should be able to book travel, walk into the room, and know who to find.
- A CRM import should include only high-confidence, consent-safe, explainably scored rows.
- Every enriched field in summaries should point to the public source used.
- If a guest list is gated, ask for an export instead of trying to bypass access controls.
- Keep the recommendation specific enough to act on immediately.
