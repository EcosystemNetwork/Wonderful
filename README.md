# Wonderful - AI-Native Hackathon Game

**Wizard Hackathon 2026 Entry**

A self-improving AI agent game powered by:
- Nebius AI (LLM inference)
- InsForge (agent-native cloud infra)
- Meshy.ai (3D character generation)
- Sia (decentralized storage)
- Claude Code Proxy (agent orchestration)

## Concept

Players command AI agents that evolve through gameplay, storing memories on Sia decentralized storage. Each agent learns, adapts, and improves its strategies using the self-improving agent framework.

## Architecture

```
Game Client (WebGL/Three.js)
    ↕
Claude Code Proxy (Agent Orchestration)
    ↕
Nebius AI (LLM Inference + Reasoning)
    ↕
Self-Improving Agent Core
    ↕
Sia Rust (Decentralized Memory Storage)
    ↕
Meshy.ai (3D Asset Pipeline)
```

## Tracks

Target: **Best Use of InsForge** + **Nebius AI Integration**

## Quick Start

```bash
# Setup
./scripts/setup.sh

# Run dev server
npm run dev

# Build for production
npm run build
```
