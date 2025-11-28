#!/bin/bash

# Set up mirrors for faster download
export UV_PYPI_MIRROR="https://pypi.tuna.tsinghua.edu.cn/simple"
export HF_ENDPOINT="https://hf-mirror.com"

# Set GPU to use (0, 1, 2, or 3). 
# User requested to use 1 GPU. We select the first one (index 0).
export CUDA_VISIBLE_DEVICES=0

# Model to use. You can change this to any HuggingFace model ID.
# Using a small model for demonstration/testing purposes.
MODEL_NAME="Qwen/Qwen2.5-1.5B-Instruct"

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
# --gpu-memory-utilization 0.85 to leave some memory for other processes
$PYTHON_EXEC -m vllm.entrypoints.openai.api_server \
    --model $MODEL_NAME \
    --trust-remote-code \
    --port 8000 \
    --gpu-memory-utilization 0.85
