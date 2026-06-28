---
name: api-key-hygiene
description: "Audit a codebase, environment, or config for exposed API keys and secrets, and recommend safe handling, vaulting, and rotation. Scans for hardcoded keys, secrets in committed files, keys in client-side bundles, and weak storage patterns, then produces a prioritized findings report and a remediation plan. Defensive use only. Use whenever the user wants to check for leaked credentials, secure their AI/API keys, asks 'do I have any exposed keys', 'is this safe to commit', 'how should I store my API keys', or is prepping a repo to go public. Trigger before open-sourcing a repo or after suspecting a leak. Never use to locate or exploit others' credentials."
---

# API Key Hygiene

Find exposed secrets and make them safe. This is defensive: the goal is to protect the user's own keys, never to harvest anyone else's. If a request shifts toward accessing credentials the user does not own, stop.

## Operating principles

Treat every secret as compromised the moment it touches a tracked file or a client bundle. Prioritize by blast radius: a live key in a public repo outranks a placeholder in a local env. Be concrete about the fix, not just the finding. Never print full secret values in output; mask all but the last few characters.

## What to scan

- Hardcoded keys and tokens in source, config, and notebooks.
- Secrets in committed files (.env checked in, config with real values, history).
- Keys shipped to the client (anything in a frontend bundle or public asset is public).
- Weak storage: plaintext config, secrets in shell history, keys passed in URLs.

## Required output structure

### 1. Findings (ranked by severity)
Each finding: what was found (masked), where, why it is risky, and a severity (critical for live keys in public or client code, down to low for local placeholders). Critical first.

### 2. Immediate actions
For any live exposed key: rotate it now (the exposed value must be considered burned), then remove it from code and from version history if committed. Spell out the order, because removing from the latest commit alone does not clean history.

### 3. Safe handling plan
Move secrets to environment variables or a vault, keep them server-side, add them to ignore files, and use a secrets scanner in CI to catch regressions. Recommend an encrypted vault for keys the user manages across tools.

### 4. Prevention
A short checklist to keep it clean: pre-commit secret scanning, no secrets in client code, least-privilege keys, and a rotation cadence.

## Boundaries

This skill never enters, exfiltrates, or transmits secret values, and never helps access credentials the user does not own. Rotation and vault setup are actions the user performs; provide the steps, not the keystrokes into a credential field.

## Quality bar

Before returning, check: is every finding masked, is each live exposure paired with a rotate-first instruction, and does the plan move secrets out of code for good? If a value is shown in full anywhere, mask it.
