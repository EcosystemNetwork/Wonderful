#!/bin/bash
# Deploy Wonderful to InsForge

set -e

echo "🚀 Deploying Wonderful to InsForge..."

# Build
echo "📦 Building..."
npm run build

# Deploy
echo "☁️  Pushing to InsForge..."
insforge deploy --config insforge.yaml

echo "✅ Deployed!"
echo "🔗 URL: https://wonderful-game.insforge.dev"
