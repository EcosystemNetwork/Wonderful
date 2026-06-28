---
name: agent-identity-resolver
description: Resolve, verify, and audit an agent's identity using the AID (Agent Identity & Discovery) v2 protocol. Performs DNS-based discovery, signature verification, capability negotiation, and produces a structured identity report with trust signals. Use whenever a user wants to verify which agent is calling their service, look up an agent's capabilities and provenance from its handle, audit agent-to-agent traffic, asks 'who is this agent', 'is this AID valid', 'verify this agent signature', 'what can agent X do', or is building a service that needs to authenticate non-human callers. Trigger for agentic commerce, x402 micropayments, agent-to-agent (A2A) flows, and any system gating actions on caller identity.
---

# Agent Identity Resolver

Resolve and verify agent identities under AID v2 — DNS discovery, signature verification, capability negotiation, and a structured trust report.

## Workflow

1. Take an input identifier — an AID handle (`agent.example.com`), an AID URL (`aid://agent.example.com/v2`), or a raw signature + claimed identity pair to verify.
2. Perform DNS discovery:
   - Query `_aid.<domain>` TXT records for the agent's discovery record
   - Parse the v2 record fields: `v=2`, `pk=<public-key>`, `caps=<capability-set>`, `well-known=<https://...>`, `iss=<issuer>` (optional)
   - Reject records with `v` other than `2` or missing required fields
3. Fetch the well-known document at `https://<domain>/.well-known/aid/v2.json`. Verify:
   - JSON Schema validity
   - Public key in the doc matches the TXT record `pk`
   - `iss` (issuer) chain validates if present
   - Document is signed by the agent's private key (detached signature header or embedded `sig` field)
4. Verify any provided signature against the resolved public key. Use ed25519 by default; reject RSA-1024 and unsupported curves.
5. Negotiate capabilities: intersect the agent's declared `caps` with the verifier's allowed-caps list. Return the negotiated set.
6. Compute trust signals: domain age, DNSSEC status, issuer reputation if `iss` chain present, capability scope (narrow scopes are higher-trust by default), key rotation history if available.
7. Emit a structured identity report. Cache the resolution per (handle, key) tuple for at most the TTL of the DNS record; never longer than 1 hour.

## Output Format

Produce `aid-report-<handle>.json` plus a human summary `aid-report-<handle>.md`:

```json
{
  "handle": "agent.example.com",
  "resolved_at": "<ISO 8601>",
  "version": 2,
  "discovery": {
    "txt_record": "v=2; pk=...; caps=...; well-known=...",
    "well_known_url": "https://.../.well-known/aid/v2.json",
    "dnssec": true
  },
  "identity": {
    "public_key": "<ed25519 pk>",
    "algorithm": "ed25519",
    "signature_verified": true,
    "issuer": "<issuer handle or null>",
    "issuer_chain_valid": true
  },
  "capabilities": {
    "declared": ["..."],
    "negotiated": ["..."]
  },
  "trust": {
    "domain_age_days": 412,
    "dnssec": true,
    "key_rotation_history_known": false,
    "score": 0.78,
    "score_basis": ["dnssec=true (+0.2)", "issuer_chain_valid=true (+0.3)", "..."]
  },
  "verdict": "verified | partial | rejected",
  "warnings": ["..."]
}
```

## Verdict Rules

- **verified** — all required fields present, signature verifies, capabilities negotiable, trust score ≥ 0.7
- **partial** — identity resolves but at least one of: trust score 0.4–0.7, DNSSEC absent, issuer chain unverified, key fresh (< 24h)
- **rejected** — signature fails, public-key mismatch, version != 2, well-known fetch fails, or trust score < 0.4

## Quality Bar

- Never declare verified without a signature check. Resolution alone is not verification.
- Cache TTLs are honored. Stale identity decisions are a security bug.
- Reject deprecated crypto: no RSA-1024, no MD5, no SHA-1.
- Capabilities are always intersected with the verifier's allowed set. Never trust the agent's declared caps verbatim.
- Trust scoring is transparent: every contribution to the score is listed in `score_basis`.
- Errors are explicit: never silently downgrade verified → partial without a warning in the output.
- This skill is for verification only. It does not issue identities — that belongs to an AID registry.
