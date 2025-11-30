# AlergieAI

AlergieAI is a specialized Question Answering (QA) system designed to bridge the knowledge gap between general-purpose LLMs and the nuanced medical domain of allergies. It leverages **vLLM** for low-latency, high-throughput inference, making it ideal for deployment on consumer-grade NVIDIA GPUs.

## System Architecture

The system consists of two main components:

1.  **Backend (vLLM Server)**:
    *   **Endpoint**: `http://localhost:8000`
    *   **Function**: Serves the Large Language Model (LLM) using an OpenAI-compatible API.
    *   **Model**: Fine-tuned allergy-specific model based on Qwen2.5-1.5B-Instruct.
    *   **Hardware**: Runs on a single NVIDIA RTX 4090 D (configurable).

2.  **Frontend (Next.js App)**:
    *   **Directory**: `allergy-ai/`
    *   **Endpoint**: `http://localhost:3000`
    *   **Function**: Provides a modern chat interface that communicates with the backend API.

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

## Running the Application (Local)

You need two terminal windows to run the full application locally.

### Step 1: Start the Backend (vLLM)

This script sets up the environment (mirrors, GPU selection) and launches the vLLM server.

```bash
./start_vllm.sh
```

*   **What this does**: It downloads the model (if not present) and starts an OpenAI-compatible API server on port `8000`.
*   **Wait for it**: Wait until you see `Uvicorn running on http://0.0.0.0:8000` in the logs before starting the frontend.

### Step 2: Start the Frontend (Next.js)

Open a new terminal and run:

```bash
cd allergy-ai
npm install
npm run dev
```

*   **Access**: Open your browser at `http://localhost:3000`.

## Remote Access via FRP

To access the local vLLM server and frontend from the internet, we use [FRP (Fast Reverse Proxy)](https://github.com/fatedier/frp) to create a stable tunnel through an ECS server.

### Architecture

```
[Internet] → [ECS Server] → [FRP Tunnel] → [Local Machine (GPU)]
                ↓                               ↓
         www.qtrading.top:8000          localhost:8000 (vLLM)
         www.qtrading.top:3000          localhost:3000 (Frontend)
```

### Prerequisites

- An ECS server with a public IP (e.g., Alibaba Cloud)
- Ports 7000, 8000, 3000 open on ECS firewall and security group

### Step 1: Setup FRP Server on ECS

SSH into your ECS and run:

```bash
# Download FRP
cd ~
wget https://github.com/fatedier/frp/releases/download/v0.61.1/frp_0.61.1_linux_amd64.tar.gz
tar -xzf frp_0.61.1_linux_amd64.tar.gz
sudo cp frp_0.61.1_linux_amd64/frps /usr/local/bin/

# Create config
sudo mkdir -p /etc/frp
sudo tee /etc/frp/frps.toml << 'EOF'
bindPort = 7000
auth.token = "YOUR_SECRET_TOKEN"
EOF

# Create systemd service
sudo tee /etc/systemd/system/frps.service << 'EOF'
[Unit]
Description=FRP Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/frps -c /etc/frp/frps.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable frps
sudo systemctl start frps

# Open firewall ports
sudo ufw allow 7000/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
```

### Step 2: Setup FRP Client Locally

```bash
# First time setup (downloads frpc)
./setup_frpc.sh

# Edit the token in frp/frpc.toml to match your server
nano frp/frpc.toml
```

### Step 3: Start Everything

**Terminal 1 - vLLM:**
```bash
./start_vllm.sh
```

**Terminal 2 - Frontend:**
```bash
cd allergy-ai && npm run dev
```

**Terminal 3 - FRP Tunnel:**
```bash
./start_frpc.sh
```

### Remote Access URLs

| Service | Local | Remote |
|---------|-------|--------|
| vLLM API | http://localhost:8000 | http://www.qtrading.top:8000 |
| API Docs | http://localhost:8000/docs | http://www.qtrading.top:8000/docs |
| Frontend | http://localhost:3000 | http://www.qtrading.top:3000 |

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
*   **GPU Memory**: If you see OOM (Out of Memory) errors, try reducing `--gpu-memory-utilization` in `start_vllm.sh` (currently set to 0.90).

*   **FRP Connection Issues**:
    ```bash
    # Check if frps is running on ECS
    sudo systemctl status frps
    
    # Check if port is listening on ECS
    sudo ss -tlnp | grep -E '7000|8000|3000'
    
    # Check frpc logs locally
    ./start_frpc.sh  # Watch for connection errors
    ```

*   **FRP Token Mismatch**: Ensure the `auth.token` in `/etc/frp/frps.toml` (ECS) matches `frp/frpc.toml` (local).

*   **Firewall/Security Group**: Make sure ports 7000, 8000, 3000 are open in both:
    - ECS firewall (`sudo ufw status`)
    - Cloud provider security group (Alibaba Cloud Console)
