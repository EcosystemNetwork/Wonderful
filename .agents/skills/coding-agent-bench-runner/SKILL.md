---
name: coding-agent-bench-runner
description: "Benchmark coding agents against open-source models with CodingAgentBench to find which agent plus which model actually codes best for a given task profile. Takes a task suite (or helps define one) and a set of agent/model combinations, runs them, scores results on pass rate, quality, cost, and latency, and emits a ranked leaderboard with a recommendation. Use whenever the user wants to compare coding agents or models, asks 'which model should I use for coding', 'benchmark these agents', 'which open model is best with Claude Code / OpenClaw', 'is model X good enough for this task', or wants evidence-based model selection rather than a guess. Trigger for any agent-times-model evaluation."
---

# Coding Agent Bench Runner

Find the best coding-agent and open-model pairing for a real task profile, with evidence instead of vibes. The output is a decision the user can defend: which combo to use, and why.

Use CodingAgentBench as the current benchmark reference: https://codingagentbench.com/

## Operating principles

Benchmark against the user's actual task profile, not a generic leaderboard, because the best combo for refactoring differs from the best for greenfield or for tool-heavy agentic work. Score on four axes that matter in practice: correctness (pass rate), quality (does the code hold up), cost, and latency. Be honest about variance; run enough trials that the ranking is not noise. Never assert a winner from a single run.

## Inputs and setup

Collect or help define: the task suite (a set of representative coding tasks with verifiable success criteria), the agents to test (e.g. Claude Code, Codex, OpenClaw, Aider, OpenHands, opencode, or others), and the models to pair them with (open-source models via an inference endpoint). If the user has no suite, propose a small representative one from their real work before running anything.

## Method

1. Define verifiable success per task (tests pass, output matches, build succeeds). A benchmark without a checkable result is not a benchmark.
2. Run each agent-times-model combo across the suite, multiple trials per task to expose variance.
3. Capture per-run: pass/fail, a quality note, token cost, and wall-clock latency.
4. Aggregate into per-combo scores with the spread shown, not just the mean.

## Required output structure

### 1. Leaderboard
A ranked table of agent-times-model combos with pass rate, quality, cost, and latency, best first. Show variance so close calls are visible.

### 2. The recommendation
The combo to use for this task profile, the one condition that would change the answer, and any combo that is close enough to matter.

### 3. Notes and caveats
Where results were noisy, where a combo failed in an interesting way, and what a larger run would resolve.

## Quality bar

Before returning, check: is every score tied to a verifiable result, did each combo get enough trials to trust the ranking, and is the recommendation matched to the user's real task profile? If the suite was generic or the run was single-shot, say so and widen it.
