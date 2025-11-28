#!/bin/bash
# =============================================================================
# QLoRA Training Script for AlergieAI
# =============================================================================
# This script sets up the environment and runs QLoRA fine-tuning
# 
# Usage:
#   ./training/start_training.sh                    # Use defaults
#   ./training/start_training.sh --use_wandb        # With Weights & Biases
# =============================================================================

set -e  # Exit on error

# -----------------------------------------------------------------------------
# Configuration - Modify these settings as needed
# -----------------------------------------------------------------------------

# GPU Configuration
export CUDA_VISIBLE_DEVICES=0

# Model Configuration
MODEL_NAME="Qwen/Qwen2.5-1.5B-Instruct"

# Data Configuration  
# Use Gemini-generated dataset (or example data for testing)
DATASET_PATH="training/data/allergy_dataset_gemini.jsonl"
# DATASET_PATH="training/data/example_allergy_qa.jsonl"  # For testing
MAX_SEQ_LENGTH=2048

# LoRA Configuration
LORA_R=64
LORA_ALPHA=128
LORA_DROPOUT=0.05

# Training Configuration
OUTPUT_DIR="./outputs/allergy-ai-qlora"
NUM_EPOCHS=3
BATCH_SIZE=4
GRAD_ACCUM_STEPS=4
LEARNING_RATE=2e-4

# Mirrors (for faster download in certain regions)
export UV_PYPI_MIRROR="https://pypi.tuna.tsinghua.edu.cn/simple"
export HF_ENDPOINT="https://hf-mirror.com"

# Python executable
PYTHON_EXEC=".venv/bin/python"

# -----------------------------------------------------------------------------
# Script Start
# -----------------------------------------------------------------------------

echo "=================================================================="
echo "  AlergieAI QLoRA Training"
echo "=================================================================="
echo ""
echo "Configuration:"
echo "  Model:          $MODEL_NAME"
echo "  Dataset:        $DATASET_PATH"
echo "  Output:         $OUTPUT_DIR"
echo "  GPU:            $CUDA_VISIBLE_DEVICES"
echo ""
echo "LoRA Settings:"
echo "  Rank (r):       $LORA_R"
echo "  Alpha:          $LORA_ALPHA"
echo "  Dropout:        $LORA_DROPOUT"
echo ""
echo "Training Settings:"
echo "  Epochs:         $NUM_EPOCHS"
echo "  Batch Size:     $BATCH_SIZE x $GRAD_ACCUM_STEPS = $((BATCH_SIZE * GRAD_ACCUM_STEPS)) effective"
echo "  Learning Rate:  $LEARNING_RATE"
echo "  Max Seq Length: $MAX_SEQ_LENGTH"
echo ""
echo "=================================================================="

# Check if dataset exists
if [ ! -f "$DATASET_PATH" ]; then
    echo "⚠️  Warning: Dataset not found at $DATASET_PATH"
    echo "    Please create your training data in JSONL format."
    echo "    See training/data/example_allergy_qa.jsonl for format."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for training dependencies
echo "Checking dependencies..."
if ! $PYTHON_EXEC -c "import peft" 2>/dev/null; then
    echo "Installing training dependencies..."
    uv sync --extra train
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Run training
echo ""
echo "Starting training..."
echo "=================================================================="

$PYTHON_EXEC training/train_qlora.py \
    --model_name "$MODEL_NAME" \
    --dataset_path "$DATASET_PATH" \
    --output_dir "$OUTPUT_DIR" \
    --max_seq_length $MAX_SEQ_LENGTH \
    --lora_r $LORA_R \
    --lora_alpha $LORA_ALPHA \
    --lora_dropout $LORA_DROPOUT \
    --num_train_epochs $NUM_EPOCHS \
    --per_device_train_batch_size $BATCH_SIZE \
    --gradient_accumulation_steps $GRAD_ACCUM_STEPS \
    --learning_rate $LEARNING_RATE \
    "$@"  # Pass any additional arguments

echo ""
echo "=================================================================="
echo "✅ Training complete!"
echo "=================================================================="
echo ""
echo "Next steps:"
echo "  1. Merge LoRA adapters with base model:"
echo "     $PYTHON_EXEC training/merge_lora.py \\"
echo "       --adapter_path $OUTPUT_DIR \\"
echo "       --output_path ./outputs/allergy-ai-merged"
echo ""
echo "  2. Update start_vllm.sh to use the merged model:"
echo "     MODEL_NAME=\"./outputs/allergy-ai-merged\""
echo ""
echo "  3. Restart vLLM server:"
echo "     ./start_vllm.sh"
echo ""

