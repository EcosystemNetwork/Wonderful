# Claude Code Proxy — Agent Orchestration (Wonderful)

The **orchestration layer** used to build and operate Wonderful: it lets **Claude Code**
(Anthropic-format client) drive development and agent workflows against **Nebius**
models instead of Anthropic's. This is the dev/operator loop — it is *not* a runtime
dependency of the shipped game. The in-app agent loop talks to Nebius directly via
[`src/api/nebius.ts`](../src/api/nebius.ts); see [`nebius-integration.md`](./nebius-integration.md).

> **Honest scope:** "Claude Code Proxy — agent orchestration" means *we orchestrated
> the agents and the build with Claude Code routed through Nebius*. The browser game
> itself ships without it.

## What it is
- **Bridge:** accepts Claude Code requests (Anthropic API format), converts them to
  OpenAI-compatible requests, forwards to Nebius, converts responses back (incl. streaming SSE).
- **Upstream:** [`github.com/opencolin/claude-code-proxy`](https://github.com/opencolin/claude-code-proxy)
  — **archived**, moved to `github.com/KiranChilledOut/claude-codex-nebius-proxy`. The local
  clone runs fine; just no upstream updates.
- **Local clone (not vendored):** `/home/god/claude-code-proxy` (kept outside this repo).

## Connection
- **Proxy listens on:** `http://localhost:8083`
- **Nebius upstream:** `https://api.tokenfactory.nebius.com/v1` (Token Factory — note: this
  is a *different* endpoint than the game's AI Studio `api.studio.nebius.com/v1`, so model
  availability can differ between the two).
- **Auth:** `OPENAI_API_KEY` in the proxy `.env` = your Nebius key. Clients send a dummy
  `ANTHROPIC_AUTH_TOKEN=claude-local` (the proxy sets `IGNORE_CLIENT_API_KEY=true`).
- **Dashboard:** `http://localhost:8083/dashboard` (usage, latency, cost, model routing).

## Setup (one command — interactive TUI)
```bash
cd /home/god/claude-code-proxy && ./install.sh
```
The wizard reuses the existing `.venv`, adds `textual`, **tests your Nebius key live**,
lets you pick models from live dropdowns, writes `.env`, and runs a smoke test.

Manual alternative:
```bash
cd /home/god/claude-code-proxy
cp .env.example .env          # set OPENAI_API_KEY = your Nebius key
.venv/bin/python start_proxy.py
```

## Model selection
- **Default:** `moonshotai/Kimi-K2.6` for BIG/MIDDLE/SMALL/VISION — strong non-Meta coding model.
- **Account/region gated:** confirm IDs are live before trusting them — `GET https://api.tokenfactory.nebius.com/v1/models` (the TUI does this for you).
- ⚠️ **No Meta/Llama** (project rule). The proxy's `MODEL_PRICES_JSON` lists a `meta-llama/*`
  price row — that's a price table, not a selection. Do not set any `*_MODEL` to a `meta-llama/*` id.
- Good non-Meta alternates if Kimi isn't live on your account: `deepseek-ai/DeepSeek-V3.2`,
  `Qwen/Qwen3-235B-A22B-Instruct-2507`.

## Use it
```bash
ANTHROPIC_BASE_URL=http://localhost:8083 ANTHROPIC_AUTH_TOKEN=claude-local claude
```
(If you let the wizard add the `claude`/`claudius` shell shortcuts, just run `claudius`.)

## Verify
```bash
curl -s http://localhost:8083/dashboard >/dev/null && echo "proxy up"   # health
# then drive one Claude Code turn through it and watch the dashboard log a request
```

## Rollback
- Stop the proxy (Ctrl-C on `start_proxy.py`).
- Point Claude Code back at Anthropic: unset `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`.
- The shipped game is unaffected either way — it never calls the proxy.
