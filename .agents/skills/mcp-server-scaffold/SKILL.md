---
name: mcp-server-scaffold
description: Scaffold a security-first Model Context Protocol (MCP) server for any backing service, with tool typing, auth, rate limiting, audit logging, and a smoke-test suite. Produces a complete Python or TypeScript MCP server project with auth middleware, per-tool rate limits, typed tool schemas, structured logs, and a Claude Desktop / Cursor / Codex client config that wires it up. Use whenever a user wants to expose a service to AI agents as an MCP server, build a tool layer for an API or database, asks how to add MCP support to their product, wants to convert an internal API into agent-callable tools, or needs the security/observability patterns for an MCP server destined for production.
---

# MCP Server Scaffold

Scaffold a production-shaped MCP server with security and observability baked in from line one — not retrofitted later.

## Workflow

1. Gather inputs: backing service (API, database, file system, internal app), language preference (Python via `mcp` SDK or TypeScript via `@modelcontextprotocol/sdk`), auth model on the backing service (API key, OAuth, mTLS), expected tool count (start ≤5; ≥10 needs categorization), and target clients (Claude Desktop, Cursor, Codex CLI, custom).
2. Define the tool surface. For each tool: name (verb_noun), one-sentence purpose, typed args (JSON Schema), typed return, idempotency status, rate limit (per-minute and per-day), and whether it requires elevated permissions.
3. Generate the project skeleton.
4. Implement security middleware in this order — never skip any:
   1. Request authentication (the caller proves identity)
   2. Per-tool permission check
   3. Per-tool rate limit
   4. Input validation against the JSON Schema
   5. Audit log (who, what, when, args fingerprint)
   6. Tool execution
   7. Output validation + redaction of sensitive fields
   8. Structured response
5. Generate a smoke-test suite that exercises every tool with at least one happy-path and one auth-failure case.
6. Generate the client config snippet for each target client.
7. Emit a deployment note: containerize, deploy via agent-deploy-kubeclaw if K8s, or stdio for local-only.

## Standard Project Structure (Python)

```
my-mcp-server/
├── pyproject.toml
├── src/
│   └── my_mcp_server/
│       ├── __init__.py
│       ├── server.py          # MCP server bootstrap
│       ├── auth.py            # caller authentication
│       ├── rate_limit.py      # per-tool RL
│       ├── audit.py           # structured logging
│       ├── schemas.py         # all tool arg/return schemas
│       └── tools/
│           ├── __init__.py
│           └── <tool>.py      # one file per tool
├── tests/
│   ├── test_auth.py
│   ├── test_rate_limit.py
│   └── test_<tool>.py
├── examples/
│   ├── claude_desktop_config.json
│   ├── cursor_mcp.json
│   └── codex_mcp.toml
└── README.md
```

TypeScript variant uses the same shape with `src/tools/<tool>.ts`.

## Tool Definition Pattern

Every tool follows this contract:

```python
@mcp.tool()
async def search_orders(
    customer_id: str,
    status: Literal["open", "shipped", "delivered"] | None = None,
    limit: int = 20,
) -> list[OrderSummary]:
    """Search orders for a customer. Read-only. Rate-limited 60/min."""
    await require_permission("orders:read")
    await rate_limit("search_orders", per_minute=60, per_day=5000)
    audit_log(tool="search_orders", args_fingerprint=fingerprint(customer_id, status, limit))
    # ... implementation
```

- Tool name: `verb_noun`. Verbs are read / search / create / update / delete / run.
- Args have explicit types. No `**kwargs`. No untyped dicts.
- Return type is a Pydantic model (Python) or Zod-validated object (TS).
- Read tools are idempotent. Write tools log an idempotency key.

## Output Format

Produce a project directory under `workspace/<name>-mcp-server/` plus a brief:

```markdown
# MCP Server Scaffold — <Backing Service>

## Tool Surface
| Tool | Purpose | Args | Rate Limit | Permission |
|---|---|---|---|---|

## Security Posture
- Auth: <method>
- Permissions: <model>
- Rate limits: <summary>
- Audit log destination: <stdout / Loki / SIEM>
- Redaction: <list of fields stripped from responses>

## Client Configs
- Claude Desktop: examples/claude_desktop_config.json
- Cursor: examples/cursor_mcp.json
- Codex: examples/codex_mcp.toml

## Smoke Test
<command to run; expected output>

## Deployment
<stdio for local | container for shared | K8s via agent-deploy-kubeclaw>
```

## Quality Bar

- Every tool has a JSON Schema for args and a typed return. Free-form returns are not allowed.
- Auth check, rate limit, and audit log run before tool execution on every call. No bypass paths.
- Sensitive fields (API keys, full SSNs, internal user IDs) are redacted in responses by default; the redaction list is explicit in the README.
- Smoke test covers every tool with at least happy-path and auth-failure cases. Tests pass before declaring done.
- No tool calls another tool internally. Composition happens at the client (agent) layer.
- Defensive default: write tools require an explicit `confirm=true` arg unless the user opts out per-tool with documented reasoning.
