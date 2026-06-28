---
name: hackathon-orchestration
description: Run a hackathon while it is happening — the in-event operational layer covering judge scheduling, team formation, demo capture, leaderboard, incident triage, and real-time announcements. Distinct from pre-event planning (which is covered by hackathon-in-a-box and hackathon-rubric-builder) and post-event reporting (covered by event-recap-report). Use whenever a user is actively running a hackathon and needs help during the event, says 'we're at the event and X', 'schedule the judges', 'how do we handle the demo queue', 'leaderboard for the event', 'announcement to attendees mid-event', 'team needs a substitute member', or any live-event coordination request. Trigger from T-24 hours through the demo session.
---

# Hackathon Orchestration

The during-event operational layer for hackathons and AI builder events. Hackathon planning happens with `hackathon-in-a-box`; this skill is what you run from T-24 hours through demos.

## Workflow

1. Confirm event state: which day/hour of the event, attendee count, team count, current phase (registration / kickoff / building / checkpoint / demos / judging / awards), and the operating-tools stack (Discord/Slack, registration system, leaderboard tool).
2. Identify the immediate need from one of the orchestration patterns below.
3. Produce the specific artifact for that need (schedule, message, queue, incident report). Always include the timestamp, the channel to publish in, and who owns the follow-up.
4. For anything touching attendees, draft the message in the tone defined in the event brief if available; otherwise use direct, builder-respecting language.

## Orchestration Patterns

### Judge scheduling
Inputs: judge list, expected demo count, demos-per-judge target (default 8), slot length (default 6 min per demo + 2 min handoff), total judging window. Output: a matrix mapping each demo slot to ≥2 judges with no judge double-booked. Include a backup judge for each row. Account for judge dietary breaks every 60 minutes.

### Team formation
Inputs: registered solo attendees, declared skill tags, team-size target (default 3–4), event theme. Output: ranked candidate teams optimizing skill coverage (one of: ML, frontend, backend, design) and avoiding adjacent-company conflicts. Suggest 1.5× the needed teams so attendees can pick. Publish to the team-formation channel with a 2-hour acceptance window.

### Demo queue
Inputs: team list, demo slot length, AV setup constraints (one screen vs many), special-request demos (judges' favorites get prime slots). Output: a published queue with explicit on-deck and in-the-hole positions. Include a tech-check buffer slot every 4 demos. Publish 60 minutes before demos start.

### Live leaderboard
Inputs: judging rubric (already defined by hackathon-rubric-builder), partial scores. Output: a rolling leaderboard published only at defined milestones (mid-judging, post-judging, pre-awards). Never publish full rubric scores publicly — only ranks and category leaders. Reveal one category winner at a time at awards.

### Mid-event announcement
Inputs: announcement purpose (deadline reminder, schedule change, vendor outage, prize update). Output: a 60–120 word message ready to paste into Discord/Slack/PA, with a one-line escalation note for the ops lead if the announcement is about a problem.

### Incident triage
Inputs: incident type (API outage, judging dispute, missing attendee, AV failure, code-of-conduct report). Output: an incident card with severity (P1/P2/P3), the runbook step for that incident type, who owns it, the comms template if attendees need to be told, and the rollback if the incident resolves.

Incident severity defaults:
- **P1** — event cannot continue (venue lost power, judging system corrupted, code-of-conduct violation in progress) → immediate ops-lead escalation, all-attendee comms within 15 min
- **P2** — event continues but degraded (sponsor API outage, AV partial failure, key judge no-show) → swap in fallback within 30 min, no all-attendee comms unless still degraded at +60 min
- **P3** — annoyance (food late, single team's tech issue, schedule slipped by ≤15 min) → handled inline, no escalation

### Team-substitute request
Inputs: team that lost a member, available pool of solo attendees, time remaining. Output: 3 substitute candidates ranked by skill fit + availability, plus a draft DM to each.

### Sponsor live ask
Inputs: sponsor request mid-event (extra signage, surprise prize, demo slot). Output: yes/no recommendation grounded in the signed sponsor agreement, plus a draft response. Default to no on anything not in the agreement; up-charge on yes for material asks.

## Output Format

For each request, produce a focused artifact named `<phase>-<action>-<HHMM>.md` so they sort chronologically. Always include:

- Timestamp and event-day (e.g. "Day 2 — 14:32")
- The artifact (schedule / message / queue / incident card)
- Channel to publish in
- Owner of follow-up

## Quality Bar

- Every artifact is timestamped. Mid-event docs without timestamps are useless 30 minutes later.
- Judging scores stay private during the event. Only ranks and category leaders go on the public leaderboard.
- Announcements are short. 120 words max. Builders are not reading paragraphs at hour 28.
- Incident severity is assigned before deciding the response. Skipping triage leads to overreaction or underreaction.
- Never recommend a yes to a sponsor live-ask that contradicts the signed agreement, even if the sponsor is in the room.
- Substitute candidates require explicit consent before being assigned to a team. Surprise reassignments harm both sides.
