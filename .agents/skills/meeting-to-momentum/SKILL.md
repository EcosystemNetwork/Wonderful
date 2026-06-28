---
name: meeting-to-momentum
description: Convert meeting notes, transcripts, call recordings, sales calls, client calls, team syncs, or rough discussion notes into decisions, action items, owners, deadlines, risks, follow-up messages, and project momentum. Use when a user wants useful next steps from a meeting.
---

# Meeting To Momentum

Turn a meeting record into decisions, tasks, follow-ups, and forward motion.

## Workflow

1. Identify meeting type, participants, purpose, and desired outcome.
2. Separate discussion from decisions. Do not label an idea as a decision unless the notes support it.
3. Extract:
   - decisions made
   - action items
   - owners
   - deadlines
   - blockers
   - risks
   - open questions
4. Draft follow-up messages for the right audience: internal team, client, prospect, or partner.
5. If notes are ambiguous, mark ownership or deadlines as `unassigned` instead of inventing.
6. Suggest the next meeting only if it is necessary.

## Output Format

```markdown
# Meeting Momentum Brief

## Summary
<5 bullets max>

## Decisions
- <decision>

## Action Items
| Task | Owner | Due | Source/Reason |
|---|---|---|---|

## Risks And Blockers
- <risk/blocker> -> <next step>

## Open Questions
- <question>

## Follow-Up Message
<ready-to-send message>

## Suggested Project Update
<optional status update for a project tracker>
```

## Quality Bar

- Prefer fewer, clearer tasks.
- Preserve accountability. A task without an owner is an open question.
- Keep follow-up messages concise and human.
- Avoid re-summarizing every topic. Optimize for action.
