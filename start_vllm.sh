#!/bin/bash

# Set up mirrors for faster download
export UV_PYPI_MIRROR="https://pypi.tuna.tsinghua.edu.cn/simple"
export HF_ENDPOINT="https://hf-mirror.com"

# Set GPU to use (0, 1, 2, or 3). 
# User requested to use 1 GPU. We select the first one (index 0).
export CUDA_VISIBLE_DEVICES=0

# Model options:
# MODEL_NAME="nlpie/Llama2-MedTuned-7b"        # Bad chat format, produces garbage
# MODEL_NAME="BioMistral/BioMistral-7B"        # Base model, needs fine-tuning
MODEL_NAME="./outputs/allergy-ai-merged"       # Your fine-tuned allergy model (1.5B, works well!)

# Path to python in the virtual environment
PYTHON_EXEC=".venv/bin/python"

echo "----------------------------------------------------------------"
echo "Starting vLLM Deployment"
echo "----------------------------------------------------------------"
echo "Model: $MODEL_NAME"
echo "GPU: $CUDA_VISIBLE_DEVICES"
echo "HF Mirror: $HF_ENDPOINT"
echo "----------------------------------------------------------------"

# Run vLLM server
# --trust-remote-code is often needed for newer models
# --port 8000 is the default
# --gpu-memory-utilization 0.90 to leave some memory for other processes
# --max-model-len 1024 to fit KV cache in available GPU memory
$PYTHON_EXEC -m vllm.entrypoints.openai.api_server \
    --model $MODEL_NAME \
    --trust-remote-code \
    --port 8000 \
    --gpu-memory-utilization 0.90 \
    --max-model-len 4096