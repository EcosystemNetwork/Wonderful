---
name: voice-agent-spec
description: Spec a production voice agent end-to-end including STT, LLM, TTS, turn-taking, latency budget, eval harness, cost model, and a runnable starter. Use when a user wants to design or critique a voice AI, phone bot, IVR replacement, or conversational agent, pick STT or TTS providers, diagnose voice-agent latency or interruption problems, or estimate per-minute cost. Covers Deepgram, ElevenLabs, OpenAI Realtime, Cartesia, LiveKit, Twilio, and Pipecat.
---

# Voice Agent Spec

Go from "we want a voice agent" to a defensible technical spec — stack, latency budget, eval harness, cost model, and a runnable starter — in one document.

## Workflow

1. Gather inputs: use case, channel (PSTN / WebRTC / mobile / smart-speaker), languages, peak concurrency, latency target (default ≤800ms p50 / ≤1500ms p95 time-to-first-audio), budget per minute, compliance (HIPAA/PCI/SOC2/GDPR), knowledge sources.
2. Pick providers per pipeline stage from the recommendation matrix, biased by user's constraints.
3. Build a latency budget that sums to the target. If it can't, propose a different stack or a relaxed target — never hand-wave.
4. Define turn-taking and interruption policy explicitly.
5. Mandate at least three eval types.
6. Compute a cost-per-minute estimate with sensitivity.
7. Produce a runnable starter (Pipecat + Deepgram + OpenAI Realtime + Cartesia + Twilio by default), saved to `voice-agent-starter/` with `.env.example` and `README`.
8. Lay out a three-phase rollout.

## Provider Recommendation Matrix

| Layer | Recommended | Alt | Why |
|---|---|---|---|
| Telephony | Twilio (PSTN) / LiveKit (WebRTC) | Telnyx, Vonage | Twilio for PSTN scale, LiveKit for low-latency WebRTC |
| VAD | Silero | WebRTC VAD | Silero is the default for a reason |
| STT | Deepgram Nova-3 | AssemblyAI, Whisper API | Streaming + word timings; great barge-in |
| Orchestration | Pipecat | LiveKit Agents, custom | Off-the-shelf beats hand-rolled in 90% of cases |
| LLM | gpt-4o-realtime / Claude Sonnet WS / Gemini Live | gpt-4.1; Llama on Cerebras/Groq | Realtime collapses two hops |
| TTS | ElevenLabs (premium) / Cartesia (fast) | OpenAI tts-1, PlayHT | ElevenLabs for quality; Cartesia for sub-100ms first audio |
| Eval | Custom + Vocode / Coval / Hamming | manual | See eval section |

## Default Latency Budget (800ms p50 target)

| Component | Budget (ms) | Tightening lever |
|---|---:|---|
| VAD endpointing | 150 | Lower silence threshold (risk: more barge-ins) |
| STT finalization | 100 | Switch to streaming partial commits |
| LLM time-to-first-token | 300 | Realtime API or faster model |
| TTS time-to-first-audio | 150 | Cartesia or pre-warmed voice cache |
| Network + jitter buffer | 100 | Region affinity; UDP |
| Total | 800 | |

## Output Format

Produce `voice-agent-spec-<usecase>.md`:

```markdown
# Voice Agent Spec — <Use Case>

## Use Case + Non-Goals
<one paragraph each>

## Reference Architecture
<ASCII or mermaid pipeline diagram>

## Stack Recommendation
<table per Provider Recommendation Matrix, adjusted to constraints>

## Latency Budget
<table summing to target with tightening levers>

## Turn-Taking & Interruption
- Endpointing strategy: <silence threshold, min/max utterance ms>
- Barge-in policy: stop TTS within <=200ms of detected speech
- Filler-word policy: allow "uh", "um" without endpointing
- Backchannels: when to inject "mhm", "okay"

## Eval Harness
1. Scripted dialogues — 20+ canonical conversations, nightly
2. Adversarial probes — interruption mid-sentence, mumbled words, code-switching, silence, dual speakers, hold music
3. Production replay — sample 1% of real calls, LLM judge + human spot-check weekly

Success metrics: task completion %, mean handle time, interruption recovery rate, last-turn sentiment.

## Cost Model
cost/min = telephony + STT + LLM(in+out tokens × tokens/min) + TTS(chars/min) + infra
<plug in current published rates, ±30% sensitivity, name the swing input>

## Rollout
1. Internal alpha (week 1–2) — team-only, scripted dialogues only
2. Closed beta (week 3–6) — ≤20 friendly users, human review of every call
3. GA (week 7+) — gradual rollout with kill-switch on eval regression
```

Save the starter to `voice-agent-starter/` and reference it from the spec.

## Quality Bar

- Latency budget must sum to the user's target. If impossible on the proposed stack, say so.
- Streaming everywhere or nowhere. A single non-streaming step destroys the budget.
- Every provider claim is date-stamped — voice provider pricing and capabilities shift monthly.
- Cost-per-minute uses current published rates with linked sources.
- Starter must run from clone + `.env` + one command.
