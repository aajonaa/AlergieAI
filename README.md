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

## QLoRA Fine-Tuning

The model is fine-tuned using **QLoRA (Quantized Low-Rank Adaptation)**, enabling efficient training on consumer GPUs with minimal VRAM requirements.

### How QLoRA Works

QLoRA combines two techniques to enable efficient fine-tuning:

1. **4-bit Quantization**: The base model weights are quantized to 4-bit precision using NF4 (Normalized Float 4), reducing memory from ~3GB to ~800MB
2. **Low-Rank Adaptation (LoRA)**: Instead of updating all 1.5B parameters, we inject small trainable matrices into specific layers

#### LoRA Mathematics

For a pre-trained weight matrix `W₀ ∈ ℝᵈˣᵏ`, LoRA adds a low-rank decomposition:

```
W = W₀ + ΔW = W₀ + BA
```

Where:
- `B ∈ ℝᵈˣʳ` and `A ∈ ℝʳˣᵏ` are the trainable low-rank matrices
- `r` (rank) << min(d, k), making the update efficient
- `W₀` remains **frozen** (not updated)
- Only `A` and `B` are trained

The output is scaled by `α/r` (alpha/rank ratio), so the effective update is:

```
h = W₀x + (α/r) · BAx
```

### Which Parameters Are Updated?

During QLoRA training, **only the LoRA adapter matrices (A and B) are updated**. The original model weights remain frozen in 4-bit quantized form.

#### Target Modules (Where LoRA is Applied)

LoRA adapters are injected into 7 linear layers per transformer block:

| Module | Layer Type | Function | Dimensions (per layer) |
|--------|-----------|----------|----------------------|
| `q_proj` | Attention | Query projection | hidden_size → hidden_size |
| `k_proj` | Attention | Key projection | hidden_size → kv_hidden_size |
| `v_proj` | Attention | Value projection | hidden_size → kv_hidden_size |
| `o_proj` | Attention | Output projection | hidden_size → hidden_size |
| `gate_proj` | MLP | Gating mechanism (SwiGLU) | hidden_size → intermediate_size |
| `up_proj` | MLP | Up projection (SwiGLU) | hidden_size → intermediate_size |
| `down_proj` | MLP | Down projection | intermediate_size → hidden_size |

For Qwen2.5-1.5B with `hidden_size=1536`, `intermediate_size=8960`, and 28 transformer layers:

| Trainable Component | Shape per Module | Parameters per Layer | Total (28 layers) |
|--------------------|------------------|---------------------|------------------|
| `q_proj` A matrix | (64, 1536) | 98,304 | 2,752,512 |
| `q_proj` B matrix | (1536, 64) | 98,304 | 2,752,512 |
| `k_proj` A matrix | (64, 1536) | 98,304 | 2,752,512 |
| `k_proj` B matrix | (256, 64) | 16,384 | 458,752 |
| `v_proj` A matrix | (64, 1536) | 98,304 | 2,752,512 |
| `v_proj` B matrix | (256, 64) | 16,384 | 458,752 |
| `o_proj` A matrix | (64, 1536) | 98,304 | 2,752,512 |
| `o_proj` B matrix | (1536, 64) | 98,304 | 2,752,512 |
| `gate_proj` A matrix | (64, 1536) | 98,304 | 2,752,512 |
| `gate_proj` B matrix | (8960, 64) | 573,440 | 16,056,320 |
| `up_proj` A matrix | (64, 1536) | 98,304 | 2,752,512 |
| `up_proj` B matrix | (8960, 64) | 573,440 | 16,056,320 |
| `down_proj` A matrix | (64, 8960) | 573,440 | 16,056,320 |
| `down_proj` B matrix | (1536, 64) | 98,304 | 2,752,512 |

**Total Trainable Parameters**: ~26M (1.7% of 1.5B base model)

#### What Remains Frozen (Not Updated)

- All embedding layers (`embed_tokens`)
- All LayerNorm parameters
- The original weight matrices `W₀` in all linear layers
- The language model head (`lm_head`)
- All bias terms (LoRA is configured with `bias="none"`)

### Merging: How Adapters Integrate with Original Model

After training, the LoRA adapters are **merged** back into the base model to create a standalone model for deployment.

#### Merge Process (`merge_lora.py`)

```python
# 1. Load base model in FP16 (full precision)
base_model = AutoModelForCausalLM.from_pretrained(base_model_path, torch_dtype=torch.float16)

# 2. Load trained LoRA adapters
model = PeftModel.from_pretrained(base_model, adapter_path)

# 3. Merge: W_new = W₀ + (α/r) · BA
model = model.merge_and_unload()

# 4. Convert to bfloat16 for vLLM deployment
model = model.to(torch.bfloat16)
```

#### What Happens During Merge

For each target module, the merge operation computes:

```
W_merged = W_original + (lora_alpha / lora_r) × B @ A
         = W_original + (128 / 64) × B @ A
         = W_original + 2 × B @ A
```

The resulting `W_merged` has the **same shape** as the original weight matrix, so:
- No architectural changes to the model
- No additional inference overhead
- Compatible with standard vLLM deployment

### Training Configuration

| Parameter | Value |
|-----------|-------|
| **LoRA Rank (r)** | 64 |
| **LoRA Alpha (α)** | 128 |
| **Scaling Factor (α/r)** | 2.0 |
| **LoRA Dropout** | 0.05 |
| **Epochs** | 3 |
| **Batch Size** | 4 per GPU |
| **Gradient Accumulation** | 4 steps (effective batch = 16) |
| **Learning Rate** | 2e-4 |
| **LR Scheduler** | Cosine with 10% warmup |
| **Optimizer** | Paged AdamW 32-bit |
| **Precision** | BFloat16 |
| **Max Sequence Length** | 2048 tokens |

### 4-bit Quantization Configuration

```python
BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",           # Normalized Float 4-bit
    bnb_4bit_compute_dtype=torch.bfloat16,  # Compute in bf16
    bnb_4bit_use_double_quant=True,      # Nested quantization
)
```

| Setting | Value | Purpose |
|---------|-------|---------|
| `load_in_4bit` | True | Load base model in 4-bit |
| `bnb_4bit_quant_type` | "nf4" | Use NF4 quantization (optimal for normally distributed weights) |
| `bnb_4bit_compute_dtype` | bfloat16 | Compute dtype for 4-bit matmuls |
| `bnb_4bit_use_double_quant` | True | Quantize the quantization constants (saves ~0.4 bits/param) |

### Dataset Format

The training supports multiple input formats:

**Option 1: Instruction Format (Recommended)**
```json
{
    "instruction": "What are the symptoms of a peanut allergy?",
    "input": "",
    "output": "Common symptoms include hives, swelling, difficulty breathing..."
}
```

**Option 2: OpenAI Chat Format**
```json
{
    "messages": [
        {"role": "user", "content": "What causes allergies?"},
        {"role": "assistant", "content": "Allergies are caused by..."}
    ]
}
```

### Quick Start Training

```bash
# 1. Install training dependencies
uv sync --extra train

# 2. Start training with default configuration
./training/start_training.sh

# 3. (Optional) Generate custom dataset using Gemini API
export GEMINI_API_KEY="your-api-key"
./training/generate_dataset.sh
```

### Training Commands

**Full training with custom parameters:**
```bash
python training/train_qlora.py \
    --model_name "Qwen/Qwen2.5-1.5B-Instruct" \
    --dataset_path training/data/allergy_dataset_gemini.jsonl \
    --output_dir ./outputs/allergy-ai-qlora \
    --max_seq_length 2048 \
    --lora_r 64 \
    --lora_alpha 128 \
    --num_train_epochs 3 \
    --per_device_train_batch_size 4 \
    --gradient_accumulation_steps 4 \
    --learning_rate 2e-4
```

**Merge LoRA adapters with base model:**
```bash
python training/merge_lora.py \
    --adapter_path ./outputs/allergy-ai-qlora \
    --output_path ./outputs/allergy-ai-merged
```

**Validate training data:**
```bash
python training/prepare_data.py validate --input training/data/your_data.jsonl
```

### Hardware Requirements

| GPU | VRAM | Batch Size | Notes |
|-----|------|------------|-------|
| RTX 4090 | 24GB | 4-8 | Recommended |
| RTX 4070 Ti | 16GB | 2-4 | Default config |
| RTX 3080 | 10GB | 1-2 | May need smaller LoRA rank |

### Training Output Structure

```
outputs/allergy-ai-qlora/
├── adapter_config.json       # LoRA configuration
├── adapter_model.bin         # Trained LoRA weights
├── tokenizer.json            # Tokenizer files
├── checkpoint-*/             # Intermediate checkpoints
└── training_args.bin         # Training arguments
```

### Monitoring

Training metrics are logged to **Weights & Biases** (wandb) by default:
- Training/validation loss curves
- Learning rate schedule
- GPU memory utilization

To disable W&B logging, add `--report_to none` to the training command.

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
