# Wonderful - AI-Native Hackathon Game

## Wizard Hackathon 2026 Entry

**GameCraft Arena Track** | **Best Use of InsForge Prize Target**

---

## What is Wonderful?

Wonderful is a **self-evolving AI party game** where each agent is powered by a real Large Language Model (Nebius AI), learns from every challenge, and persists its memories and run history to an **InsForge** backend. The game combines:

- **AI-native gameplay**: Every decision is made by an LLM, not scripted
- **Self-improvement**: Agents analyze their performance and evolve their strategies
- **Persistent memory**: Agent memories + completed runs live in InsForge (Postgres) with a fallback to localStorage
- **3D visualization**: Real-time Three.js arena with animated characters
- **Meshy.ai integration**: Generate custom 3D characters, stored in InsForge Storage

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React + Three.js (React Three Fiber)                        │
│  ├─ 3D Game Arena (real-time rendering)                     │
│  ├─ Agent Control Panel (summon, manage, observe)           │
│  └─ Game Log (timestamped events)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI AGENT CORE                           │
│  SelfImprovingAgent class                                    │
│  ├─ decideAction() → LLM call via Nebius                   │
│  ├─ learnFromExperience() → strategy evolution            │
│  ├─ improveStrategy() → meta-learning loop                │
│  └─ Memory management (short-term + long-term)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                        │
│  ├─ Nebius AI Cloud → LLM inference                         │
│  ├─ InsForge → auth · DB (memories, runs) · model storage   │
│  ├─ Meshy.ai → 3D character generation                    │
│  └─ InsForge → deployment & hosting                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. Self-Improving AI Agents
Each agent has:
- **Personality & Strategy**: LLM-generated based on role
- **Memory System**: Stores every challenge outcome
- **Improvement Loop**: After each turn, analyzes what worked and updates strategy
- **Skill Evolution**: Unlocks new abilities as they level up

### 2. Real-Time 3D Arena
- Three.js-powered game world
- Animated floating agents with role-based colors
- Dynamic lighting and particle effects
- XP bars and status overlays

### 3. InsForge-Backed Persistence
- Agent memories + completed runs stored in InsForge Postgres (`agent_memories`, `agent_runs`)
- Meshy `.glb` models persisted to InsForge Storage (`characters` bucket)
- Optional email auth ties runs to a player; graceful localStorage fallback when offline
- Memories survive browser refreshes; cross-session learning enabled

### 4. Meshy.ai 3D Pipeline
- Text-to-3D character generation
- Auto-rigging for animation
- Direct import into game

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| 3D Engine | Three.js, React Three Fiber, Drei |
| State Management | Zustand |
| AI/LLM | Nebius AI Cloud (OpenAI-compatible API) |
| Backend | InsForge (auth · Postgres · Storage) |
| 3D Assets | Meshy.ai API |
| Deployment | InsForge |

---

## How to Run

```bash
# Clone and install
git clone https://github.com/EcosystemNetwork/Wonderful.git
cd wonderful-game
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your Nebius API key

# Dev server
npm run dev

# Production build
npm run build
```

---

## InsForge Deployment

The `insforge.yaml` defines:
- Web service (frontend)
- Worker service (API/backend)
- Agent orchestrator (auto-scaling)
- PostgreSQL database (memories)
- S3-compatible storage (assets)
- AI model gateway (Nebius integration)

Deploy with:
```bash
insforge deploy
```

---

## Prize Eligibility

- **GameCraft Arena**: AI-native game with real-world use case (AI training via gameplay)
- **Best Use of InsForge**: Full insforge.yaml with AI gateway, auto-scaling, multi-service
- **Best Use of Nebius**: Core gameplay depends on Nebius LLM inference

---

## Team

Built for Wizard Hackathon 2026

**Repo**: https://github.com/EcosystemNetwork/Wonderful
