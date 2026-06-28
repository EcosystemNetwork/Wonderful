---
name: agent-deploy-kubeclaw
description: Deploy an AI agent or agent harness to a Nebius Managed Kubernetes cluster using the KubeClaw production toolkit pattern (Helm chart, observability stack, secrets, autoscaling, Token Factory wiring). Produces a values.yaml, ingress config, secret-management plan, observability wiring (Prometheus + Loki + Grafana), readiness checks, autoscaling policy, and a verified rollout plan. Use whenever a user wants to deploy an agent to Kubernetes, ship an OpenClaw or NemoClaw stack to Nebius, productionize a prototype agent, asks how to host an agent in a cluster, wants a Helm chart for an LLM service, or needs autoscaling/observability for an LLM workload.
---

# Agent Deploy via KubeClaw

Deploy an agent to a Nebius Managed Kubernetes cluster with the production patterns from KubeClaw — Helm-first, observability included, Token Factory wired, autoscaling defined.

## Workflow

1. Gather inputs: agent source (Docker image or repo URL), expected req/sec at peak, GPU need (yes/no, which GPU class), Token Factory model(s), secrets list (API keys, DB URLs), domain for ingress, observability target (Grafana Cloud, self-hosted, or none).
2. Pick the Kubernetes pattern:
   - **Stateless agent (most cases)** — Deployment + HPA + Service + Ingress, no GPU on the agent pod (LLM calls go to Token Factory).
   - **GPU agent (custom model)** — StatefulSet + node selector for GPU pool, persistent volume for model weights.
   - **Multi-agent system** — Deployment per agent role, shared Redis/Postgres, NetworkPolicy between roles.
3. Generate the Helm chart files following the KubeClaw template. Always produce a complete chart, not a partial one.
4. Wire Token Factory via env vars from a Kubernetes Secret. Never bake keys into the image.
5. Wire observability: Prometheus annotations on Service, structured JSON logging to stdout, Loki picks it up, Grafana dashboard for token usage + latency + error rate.
6. Define autoscaling: HPA on CPU (default 60%) plus a custom metric on `inference_queue_depth` if the agent has one. For GPU pods, scale to zero is fine when idle.
7. Produce a rollout plan with three gates: smoke test (single request), canary (5% traffic for 10 min), full rollout.
8. Emit a rollback command for each rollout stage.

## Standard Chart Structure

```
agent-name/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── secret.yaml          # generated from external secret manager
│   ├── hpa.yaml
│   ├── servicemonitor.yaml  # Prometheus
│   └── networkpolicy.yaml
└── README.md
```

## Default `values.yaml` Conventions

- `replicas: 2` minimum for stateless agents
- `resources.requests.cpu: 250m`, `memory: 512Mi`
- `resources.limits.cpu: 2`, `memory: 4Gi`
- `livenessProbe`: HTTP GET on `/healthz` every 10s
- `readinessProbe`: HTTP GET on `/ready` every 5s, with the agent checking Token Factory connectivity before reporting ready
- `terminationGracePeriodSeconds: 30` to let in-flight requests finish
- `topologySpreadConstraints` across zones for HA

## Output Format

Produce `deploy-<agent-name>.md`:

```markdown
# Deployment Plan — <agent-name>

## Cluster Target
- Provider: Nebius Managed Kubernetes
- Region: <region>
- Node pool: <stateless-pool | gpu-h100-pool>

## Helm Chart
<file tree + key file contents inline>

## Secrets
| Key | Source | Required |
|---|---|---|

## Observability
- Metrics: Prometheus scrape on /metrics
- Logs: structured JSON to stdout (Loki)
- Dashboard: Grafana — token usage, p50/p95 latency, 5xx rate, queue depth

## Autoscaling
- HPA: 2–10 replicas at 60% CPU
- Custom metric: <metric or "none">

## Rollout Plan
1. Smoke test: <command + expected output>
2. Canary: 5% traffic for 10 min, watch <metric>
3. Full rollout: <command>

## Rollback
- From smoke: <command>
- From canary: <command>
- From full: <command>
```

Save chart files to `deploy/<agent-name>/` in the workspace and share both.

## Quality Bar

- Every chart includes liveness + readiness probes. No exceptions.
- Readiness probe must verify Token Factory connectivity if the agent depends on it. A pod that's ready but can't reach its LLM provider is a bug.
- Resources have both requests and limits. Requests without limits invites the noisy-neighbor problem.
- Every secret is sourced from External Secrets Operator, sealed-secrets, or a documented manual step. Never plaintext in values.yaml.
- Rollback commands are tested, not aspirational.
- Default to 2+ replicas. Single-replica deployments are not production.
