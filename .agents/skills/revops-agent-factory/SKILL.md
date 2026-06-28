---
name: revops-agent-factory
description: "A council-governed factory of RevOps, sales, and marketing agents built around one enforced write-safety gateway, read-only-first. Use whenever the user wants to analyze a sales pipeline, score deal risk (MEDDPICC), prep a sales call, inspect forecast accuracy, audit CRM/pipeline hygiene, score or enrich leads, compute marketing attribution, find dev-content/SEO gaps, or assemble a RevOps dashboard across Salesforce, HubSpot, Gong, Reo.dev, and Chili Piper. Trigger on 'review our pipeline', 'which deals are at risk', 'prep me for this call', 'is our forecast accurate', 'clean up the CRM', 'score these leads', 'what's our attribution', or any revenue-operations analysis task. All analysis is read-only by default; any write is routed through an approval gateway."
---

# RevOps Agent Factory

A supervisor that routes a revenue-operations request to the right specialist agent. The defining principle is safety: every agent is read-only first, and any write to a system of record is routed through a single approval gateway, never fired directly.

## Routing

Match the request to the specialist:
- Pipeline hygiene: sweep open opportunities for stale dates, missing amounts, blank next-steps, orphaned accounts; emit a ranked findings brief.
- Funnel leak: normalize the funnel across marketing (HubSpot) and sales (Salesforce) by domain; surface the single biggest stage-to-stage leak.
- Forecast inspection: cross-reference open opps with conversation signals (single-threaded, sentiment, competitor, staleness) to flag at-risk deals.
- Call prep: assemble account/opp context, last-call summary and open questions, and intent signals into a pre-call brief.
- Deal risk (MEDDPICC): score a deal across the eight elements from call signals, surface gaps with suggested discovery questions, framed as coaching.
- Lead scoring: a read-only dev-first fit and engagement score per lead; any CRM score-write is default-denied by the gateway.
- Attribution: speed-to-lead/SLA breaches and weighted multi-touch attribution; surfaces a scheduling link for a human, never books.
- SEO/content gap: topics competitors rank for that the user does not, weighted by developer intent.
- Dashboard: aggregate the read-only outputs into one report a CRO acts on.

## Safety model (non-negotiable)

Read-only agents run directly. Write agents are routed through the Write-Action Gateway, which requires per-owner approval and default-denies anything irreversible or anything that could trigger a customer-facing side effect (e.g. a CRM write that fires an email workflow). Event-driven and non-interactive runs are draft-only. A global kill switch trips the gateway. Never let an agent hold a system-of-record write client directly.

## Operating principles

Cite the source signal for every claim (which transcript, which CRM field). Frame deal and rep output as coaching, to the rep first. Surface gaps and risks ranked by dollar impact. When a write would help, propose it as a drafted action for human approval, not an executed one.

## Quality bar

Before returning, check: is every finding traceable to a source, is the output ranked by impact, and did nothing get written without going through the gateway? If any write bypassed approval, stop and reroute it.
