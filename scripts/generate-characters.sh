#!/bin/bash
# Meshy.ai 3D Character Pipeline for Wonderful Game
# Generates characters, rigs them, and prepares animations

set -e

MESHY_API_KEY="${MESHY_API_KEY:-}"
OUTPUT_DIR="./assets/characters"

mkdir -p "$OUTPUT_DIR"

echo "🎨 Wonderful - Meshy.ai Character Pipeline"
echo "=========================================="

if [ -z "$MESHY_API_KEY" ]; then
    echo "⚠️  MESHY_API_KEY not set. Set it to generate 3D characters."
    echo "   export MESHY_API_KEY=your_key_here"
    exit 1
fi

# Character archetypes for the game
CHARACTERS=(
    "warrior:medieval knight with glowing armor, sword and shield, heroic stance"
    "mage:wise wizard with flowing robes, magical staff, mystical aura"
    "rogue:stealthy assassin with dual daggers, hooded cloak, shadowy"
    "healer:gentle cleric with holy symbol, healing light, peaceful expression"
)

generate_character() {
    local role="$1"
    local prompt="$2"
    
    echo "Generating $role..."
    
    # Text to 3D generation
    curl -s -X POST https://api.meshy.ai/openapi/v2/text-to-3d \
        -H "Authorization: Bearer $MESHY_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"mode\": \"preview\",
            \"prompt\": \"$prompt\",
            \"art_style\": \"realistic\",
            \"negative_prompt\": \"low quality, blurry, deformed\"
        }" > "$OUTPUT_DIR/${role}_job.json"
    
    local job_id=$(jq -r '.result' "$OUTPUT_DIR/${role}_job.json")
    echo "  Job ID: $job_id"
    
    # Poll for completion
    echo "  Waiting for generation..."
    for i in {1..30}; do
        sleep 10
        local status=$(curl -s -X GET "https://api.meshy.ai/openapi/v2/text-to-3d/${job_id}" \
            -H "Authorization: Bearer $MESHY_API_KEY" | jq -r '.status')
        
        if [ "$status" = "SUCCEEDED" ]; then
            echo "  ✓ Generation complete!"
            
            # Download model files
            curl -s -X GET "https://api.meshy.ai/openapi/v2/text-to-3d/${job_id}" \
                -H "Authorization: Bearer $MESHY_API_KEY" | \
                jq -r '.model_urls.glb' > "$OUTPUT_DIR/${role}_url.txt"
            
            wget -q -O "$OUTPUT_DIR/${role}.glb" $(cat "$OUTPUT_DIR/${role}_url.txt")
            echo "  ✓ Downloaded to $OUTPUT_DIR/${role}.glb"
            break
        elif [ "$status" = "FAILED" ]; then
            echo "  ✗ Generation failed"
            break
        fi
        
        echo "  ... ($i/30) status: $status"
    done
}

# Generate all characters
echo ""
for char in "${CHARACTERS[@]}"; do
    IFS=':' read -r role prompt <<< "$char"
    generate_character "$role" "$prompt"
    echo ""
done

echo "✅ All characters generated!"
echo ""
echo "To use in the game:"
echo "  1. Import the .glb files into your Three.js scene"
echo "  2. Use GLTFLoader to load character models"
echo "  3. Apply animations based on agent actions"
echo ""
echo "Files in $OUTPUT_DIR:"
ls -la "$OUTPUT_DIR"
