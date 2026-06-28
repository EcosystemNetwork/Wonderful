# Wonderful - AI-Native Hackathon Game

**Wizard Hackathon 2026 Entry**

A self-improving AI agent game powered by:
- **Nebius AI** — LLM inference for agent reasoning & self-improvement
- **InsForge** — auth, database, and storage backend (agent-native cloud infra)
- **Meshy.ai** — 3D character generation, rigging & animation
- **Claude Code Proxy** — agent orchestration

## Concept

Players summon AI agents (warrior / mage / rogue / healer) that face procedurally
generated challenges. Each agent reasons with a Nebius LLM, then periodically
**analyzes its own performance and rewrites its strategy** — a self-improving loop.
Every decision is persisted to **InsForge** as a memory, and completed runs land on
an InsForge-backed leaderboard. 3D characters are generated with Meshy and their
`.glb` models stored in InsForge Storage.

## Architecture

```
Game Client (React + Three.js / WebGL)
    │
    ├── Nebius AI ............ LLM inference + self-improvement reasoning
    ├── InsForge ............. auth · database (agent_runs, agent_memories) · storage (characters)
    └── Meshy.ai ............. text-to-3D character pipeline → InsForge Storage
```

## Tracks

Target: **Best Use of InsForge** + **Nebius AI Integration**

## Backend setup (InsForge)

```bash
# 1. Link or create an InsForge project
npx @insforge/cli link        # or: npx @insforge/cli create

# 2. Apply the schema (agent_runs, agent_memories + RLS)
npx @insforge/cli db query --file docs/insforge-schema.sql

# 3. Create the storage bucket for Meshy models
npx @insforge/cli storage create-bucket characters --public

# 4. Grab credentials for .env
npx @insforge/cli secrets get ANON_KEY     # → VITE_INSFORGE_ANON_KEY
# URL = oss_host in .insforge/project.json  → VITE_INSFORGE_URL
```

> The game runs **without** InsForge configured — it falls back to `localStorage`
> and shows "local mode" in the HUD. Add the env vars to light up the live backend.

## Quick Start

```bash
cp .env.example .env     # fill in your keys
npm install
npm run dev              # http://localhost:3000

npm run build            # production build
```
