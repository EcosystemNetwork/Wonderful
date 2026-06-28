---
name: event-recap-report
description: Produce the post-event recap deliverable that goes to sponsors, stakeholders, and the community after a hackathon, builder event, or developer summit. Covers attendance numbers, demographic mix, demo highlights, sponsor-specific outcomes (signups, integrations shipped, qualified leads), social and press footprint, photos and videos, and a renewal ask. Use whenever a user has just run an event and needs to report results, says 'write our event recap', 'sponsor report from the hackathon', 'post-event summary for our team', 'recap email to the community', or needs the after-action document that turns one event into the next sponsor's contract. Trigger from event end through T+14 days.
---

# Event Recap Report

The post-event deliverable that turns one event into the next sponsor's contract.

## Workflow

1. Gather inputs:
   - Event name, date, format, location
   - Registered / attended / no-show counts
   - Demographic mix (titles, companies, seniority)
   - Sponsor list with tier and primary success metric per sponsor
   - Demo / project list with team names and links (repos, demo videos)
   - Judging results
   - Social posts and press mentions (URLs)
   - Photos and videos (file paths or hosted URLs)
   - Lead-capture results per sponsor (with consent status)
   - NPS or feedback survey results if available
2. Compute and verify the headline numbers. Never publish numbers you haven't sanity-checked twice — one attendee miscount damages the next sponsor pitch.
3. Build two deliverables:
   - A **sponsor-specific recap** per top-tier sponsor (tier ≥ presenting). Frame metrics against *that sponsor's* success metric (signups, integrations, leads, etc.), not generic vanity stats.
   - A **community recap** (the public version) celebrating teams, sharing demo videos, thanking sponsors by tier order.
4. For each sponsor recap, include the renewal ask. Don't bury it. Frame as "next event is on <date>, here's what you'd get this time."
5. Send within 7 days of event end. Past 14 days, recaps stop converting.

## Output Format

### Sponsor Recap (one per top-tier sponsor)

Produce `sponsor-recap-<sponsor>-<event>.md`:

```markdown
# <Event Name> — Recap for <Sponsor>
**Date:** <date> · **Attendees:** <n> · **Your tier:** <tier>

## Headline (your success metric)
<Single most important number for this sponsor, tied to their stated success metric.>

## What you got
- <Workshop slot? booth time? brand impressions? leads? integrations? — pick the 3–5 things that matter to this sponsor and quantify each>

## Leads (with consent)
| Name | Company | Title | Project / interest | Consent timestamp |
|---|---|---|---|---|

## Integrations shipped using your product
| Team | Project | Link | Sponsor-API use |
|---|---|---|---|

## Quotes
<2–3 verbatim attendee quotes mentioning the sponsor's product, with consent>

## Photos + videos
<3–5 best shots + 1 highlight reel link>

## Social footprint
- <n> posts mentioning your brand · combined reach <m>
- Top post: <link>

## Renewal ask
Next event: <date>. At <recommended tier> ($<n>), you would get: <2–3 specific upgrades over what they had this time>. Reply by <date> to lock the slot.
```

### Community Recap

Produce `community-recap-<event>.md`:

```markdown
# <Event Name> — What Happened

## By the Numbers
- <n> builders · <m> projects shipped · <k> demos
- <demographic highlights>

## The Winners
| Place | Team | Project | Demo |
|---|---|---|---|

## The Sponsors (in tier order)
- <Sponsor> — <one-line thanks tied to what they enabled>

## Highlight Reel
<embedded or linked video>

## Photos
<grid of best 12 photos>

## What's Next
<date of next event + RSVP link>
```

## Quality Bar

- Numbers are double-checked. Never publish a count you can't defend with raw data.
- Every lead in the table has explicit consent. No consent → not in the table.
- Sponsor recaps are sponsor-specific. Sending the same recap to all sponsors signals you didn't care which one paid more.
- Photos and videos are attached, not promised "to follow." A recap without visuals does not convert renewals.
- Renewal ask is present and specific. "Hope we work together again" is not a renewal ask. "Reply by <date> to lock <tier> for <next event>" is.
- Quotes are verbatim and consented. Made-up testimonials destroy trust.
- Community recap is a separate file from the sponsor recaps. Never accidentally send the sponsor financial pitch to the community list.
- Sent within 7 days. After 14 days, the recap stops earning renewals — escalate "we missed the window" to the next event's pitch instead.
