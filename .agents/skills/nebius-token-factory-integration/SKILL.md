---
name: nebius-token-factory-integration
description: Wire any LLM-using tool, IDE plugin, agent harness, or framework to use Nebius Token Factory as its inference provider. Produces a provider config (env vars, base URL, model IDs), a minimal working code patch in the tool's native language, a smoke test that exercises a real round-trip, and a fallback strategy for when Token Factory is unreachable. Use whenever a user wants to add Nebius as an OpenAI-compatible provider, switch a tool from OpenAI/Anthropic to Nebius for cost or sovereignty, integrate an open-weights model hosted on Nebius, asks how to point Codex or LangSmith or VS Code Chat at Nebius, or wants to compare Nebius pricing vs hyperscaler APIs for a specific workload.
---

# Nebius Token Factory Integration

Wire any LLM-using tool to Nebius Token Factory and verify it works end-to-end.

## Workflow

1. Identify the integration target by asking the user three things if not stated: which tool/framework (Codex, VS Code Chat, LangSmith, LangChain, LiteLLM, OpenAI SDK app, custom), which model(s) they want (default to Llama-3.3-70B-Instruct or DeepSeek-V3 for general; Qwen2.5-Coder-32B for coding), and what their existing provider config looks like (or a link to the repo).
2. Resolve the Token Factory connection parameters:
   - Base URL: `https://api.studio.nebius.com/v1/`
   - Auth: `Authorization: Bearer $NEBIUS_API_KEY`
   - OpenAI-compatible: yes — Chat Completions and Embeddings endpoints are supported
3. Look up the exact model ID at [studio.nebius.com/models](https://studio.nebius.com/models). Common picks:
   - `meta-llama/Meta-Llama-3.3-70B-Instruct`
   - `deepseek-ai/DeepSeek-V3`
   - `Qwen/Qwen2.5-Coder-32B-Instruct`
   - `meta-llama/Llama-3.3-70B-Instruct-fast` (lower-latency variant when available)
4. Produce the minimum integration patch in the tool's native idiom. See the per-tool patterns below.
5. Generate a smoke test: a 10-line script that sends one chat completion and asserts a non-empty response. The smoke test is non-negotiable — never declare integration done without running it.
6. Add a fallback strategy: which provider to fall back to on 5xx or connection failures, and how to detect (usually a 60s timeout + 3-strike circuit breaker).
7. Emit a one-page integration brief covering: model ID, $/1M tokens at current rates, latency expectations, and the rollback command if the user needs to revert.

## Per-Tool Patterns

### OpenAI SDK (Python / TypeScript)
Point `base_url` at Token Factory and use the OpenAI client unchanged:
```python
from openai import OpenAI
client = OpenAI(base_url="https://api.studio.nebius.com/v1/", api_key=os.environ["NEBIUS_API_KEY"])
```

### LangChain / LangSmith
Use `ChatOpenAI` with `openai_api_base` set, or configure Nebius as a Model provider in the LangSmith UI under Settings → Models.

### LiteLLM
Add to `litellm` config:
```yaml
model_list:
  - model_name: nebius-llama-70b
    litellm_params:
      model: openai/meta-llama/Meta-Llama-3.3-70B-Instruct
      api_base: https://api.studio.nebius.com/v1/
      api_key: os.environ/NEBIUS_API_KEY
```

### Codex / OpenAI Codex CLI
Set `OPENAI_BASE_URL=https://api.studio.nebius.com/v1/` and `OPENAI_API_KEY=$NEBIUS_API_KEY` in the shell environment before running.

### VS Code Chat (via huggingface-vscode-chat fork pattern)
Provider plugin TypeScript class — match the structure of [opencolin/nebius-vscode-chat](https://github.com/opencolin/nebius-vscode-chat).

### MCP server
Wire Nebius in the MCP server's inference layer; expose model selection via tool args, not server config, so callers can pick.

## Output Format

Produce `nebius-integration-<tool>.md`:

```markdown
# Nebius Token Factory Integration — <Tool>

## Model Selection
- Model ID: <id>
- Why: <2 sentences>
- $/1M in / out (as of <date>): <values>

## Patch
<minimal code diff or config snippet>

## Smoke Test
<runnable script + expected output>

## Fallback Strategy
- Fall-back provider: <openai / anthropic / together>
- Trigger: <5xx, timeout, circuit breaker>
- Detection: <how to log + alert>

## Rollback
<one command to revert the patch>
```

## Quality Bar

- Smoke test must run before claiming the integration works. Show the actual successful output, not "should work."
- Pin a specific model ID, not a family name.
- Price-stamp the $/1M tokens with the lookup date.
- Patch must be the minimum viable diff. Don't refactor the host project.
- Fallback is mandatory. Single-provider integrations are not production-ready.
- Never log or echo the API key value. Use `${NEBIUS_API_KEY}` references only.
