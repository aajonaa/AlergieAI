#!/bin/bash
# =============================================================================
# Gemini Dataset Generator for AlergieAI
# =============================================================================
#
# Usage:
#   1. Edit training/config.env and add your GEMINI_API_KEY
#   2. ./training/generate_dataset.sh
#
# =============================================================================

set -e

# Configuration
NUM_SAMPLES=1000
OUTPUT_FILE="training/data/allergy_dataset_gemini.jsonl"
CHECKPOINT_EVERY=50

# Load environment variables from config.env file
if [ -f "training/config.env" ]; then
    echo "Loading environment from training/config.env..."
    # Remove Windows carriage returns and export
    export $(grep -v '^#' training/config.env | tr -d '\r' | xargs)
fi

# Check for API key
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-gemini-api-key-here" ]; then
    echo "❌ Error: GEMINI_API_KEY not set"
    echo ""
    echo "Please edit training/config.env and add your API key:"
    echo "  Get your key from: https://aistudio.google.com/app/apikey"
    echo ""
    exit 1
fi

echo "=================================================================="
echo "  AlergieAI Dataset Generator"
echo "=================================================================="
echo ""
echo "  Samples to generate: $NUM_SAMPLES"
echo "  Output: $OUTPUT_FILE"
echo "  API: Google AI Studio (gemini-2.0-flash-exp)"
echo ""
echo "=================================================================="
echo ""

# Check if openai is installed
if ! python -c "import openai" 2>/dev/null; then
    echo "Installing openai..."
    pip install openai
fi

# Run generator
python training/generate_dataset_gemini.py \
    --num_samples $NUM_SAMPLES \
    --output "$OUTPUT_FILE" \
    --checkpoint_every $CHECKPOINT_EVERY

echo ""
echo "=================================================================="
echo "  Dataset Generation Complete!"
echo "=================================================================="
echo ""
echo "Next steps:"
echo "  1. Review: python training/generate_dataset_gemini.py --analyze"
echo "  2. Train:  ./training/start_training.sh"
echo "     (Update DATASET_PATH to: $OUTPUT_FILE)"
echo ""

