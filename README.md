# AlergieAI

AlergieAI is a specialized Question Answering (QA) system designed to bridge the knowledge gap between general-purpose LLMs and the nuanced medical domain of allergies. It leverages **vLLM** for low-latency, high-throughput inference, making it ideal for deployment on consumer-grade NVIDIA GPUs.

## System Architecture

The system consists of two main components:

1.  **Backend (vLLM Server)**:
    *   **Endpoint**: `http://localhost:8000`
    *   **Function**: Serves the Large Language Model (LLM) using an OpenAI-compatible API.
    *   **Model**: Currently configured to use `Qwen/Qwen2.5-1.5B-Instruct`.
    *   **Hardware**: Runs on a single NVIDIA RTX 4090 D (configurable).

2.  **Frontend (Streamlit App)**:
    *   **File**: `app.py`
    *   **Function**: Provides a user-friendly chat interface that communicates with the backend API.

## Setup & Installation

This project uses `uv` for fast dependency management.

1.  **Install Dependencies**:
    ```bash
    # Set mirrors for faster download (optional but recommended in CN)
    export UV_PYPI_MIRROR="https://pypi.tuna.tsinghua.edu.cn/simple"
    export HF_ENDPOINT="https://hf-mirror.com"
    
    # Sync dependencies
    uv sync
    ```

## Running the Application

You need two terminal windows to run the full application.

### Step 1: Start the Backend (vLLM)

This script sets up the environment (mirrors, GPU selection) and launches the vLLM server.

```bash
./start_vllm.sh
```

*   **What this does**: It downloads the model (if not present) and starts an OpenAI-compatible API server on port `8000`.
*   **Wait for it**: Wait until you see `Uvicorn running on http://0.0.0.0:8000` in the logs before starting the frontend.

### Step 2: Start the Frontend (Streamlit)

Open a new terminal and run:

```bash
source .venv/bin/activate
streamlit run app.py
```

*   **Access**: Open your browser at the URL shown (usually `http://localhost:8501`).

## Monitoring & Performance

### Checking Deployment Status

1.  **Server Logs (vLLM Terminal)**:
    *   **Token Output Rate & Speed**: The vLLM server prints statistics to the terminal every few seconds (e.g., `Avg prompt throughput: ... tokens/s`, `Avg generation throughput: ... tokens/s`).
    *   **Requests**: You can see incoming HTTP requests (POST /v1/chat/completions) and their status codes (200 OK).

2.  **GPU Utilization**:
    *   Run `nvidia-smi` in a separate terminal to check:
        *   **Memory Usage**: How much VRAM the model is consuming.
        *   **GPU Utilization**: Percentage of GPU compute being used during generation.

3.  **Model Information**:
    *   **Model Size**: The current model `Qwen/Qwen2.5-1.5B-Instruct` is approximately ~3GB in FP16/BF16.
    *   **Context Window**: The server is configured to use the model's maximum context length (up to 32k for Qwen2.5).

### Troubleshooting

*   **Port Conflicts**: If port 8000 is busy, check for lingering processes:
    ```bash
    lsof -i :8000
    # or
    fuser -k 8000/tcp
    ```
*   **GPU Memory**: If you see OOM (Out of Memory) errors, try reducing `--gpu-memory-utilization` in `start_vllm.sh` (currently set to 0.85).
