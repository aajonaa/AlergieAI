# AlergieAI Training Guide

This directory contains everything needed to fine-tune the Qwen2.5-1.5B-Instruct model using **QLoRA** (Quantized Low-Rank Adaptation) for allergy-specific question answering.

## 🚀 Quick Start

### 1. Install Training Dependencies

```bash
# Install training extras
uv sync --extra train
```

### 2. Prepare Your Training Data

Create a JSONL file with your training examples:

```jsonl
{"instruction": "What are peanut allergy symptoms?", "input": "", "output": "Common symptoms include..."}
{"instruction": "How do I use an EpiPen?", "input": "", "output": "Step 1: Remove the blue cap..."}
```

See `data/example_allergy_qa.jsonl` for more examples.

### 3. Run Training

```bash
# Make the script executable
chmod +x training/start_training.sh

# Start training with default settings
./training/start_training.sh

# Or run directly with custom settings
python training/train_qlora.py \
    --dataset_path training/data/your_data.jsonl \
    --output_dir ./outputs/allergy-ai-qlora \
    --num_train_epochs 3 \
    --lora_r 64
```

### 4. Merge & Deploy

```bash
# Merge LoRA adapters into base model
python training/merge_lora.py \
    --adapter_path ./outputs/allergy-ai-qlora \
    --output_path ./outputs/allergy-ai-merged

# Update start_vllm.sh
sed -i 's|MODEL_NAME=.*|MODEL_NAME="./outputs/allergy-ai-merged"|' start_vllm.sh

# Restart vLLM
./start_vllm.sh
```

## 📁 Directory Structure

```
training/
├── README.md                    # This file
├── train_qlora.py              # Main training script
├── merge_lora.py               # Merge LoRA adapters with base model
├── prepare_data.py             # Data preparation utilities
├── start_training.sh           # Training launcher script
└── data/
    └── example_allergy_qa.jsonl # Example training data
```

## 📊 Training Data Format

### Option 1: Instruction Format (Recommended)

```json
{
    "instruction": "User question or task",
    "input": "Optional additional context",
    "output": "Expected assistant response",
    "system": "Optional system prompt"
}
```

### Option 2: OpenAI Chat Format

```json
{
    "messages": [
        {"role": "system", "content": "You are AlergieAI..."},
        {"role": "user", "content": "What causes allergies?"},
        {"role": "assistant", "content": "Allergies are caused by..."}
    ]
}
```

### Data Preparation Utilities

```bash
# Convert OpenAI format to instruction format
python training/prepare_data.py convert \
    --input data/openai_format.jsonl \
    --output data/training.jsonl \
    --format openai

# Convert CSV to JSONL
python training/prepare_data.py convert \
    --input data/qa.csv \
    --output data/training.jsonl \
    --format csv \
    --question_col "question" \
    --answer_col "answer"

# Validate training data
python training/prepare_data.py validate --input data/training.jsonl

# Split into train/validation
python training/prepare_data.py split \
    --input data/training.jsonl \
    --output_dir data/split \
    --val_ratio 0.1
```

## ⚙️ Training Configuration

### LoRA Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--lora_r` | 64 | LoRA rank (higher = more capacity, more memory) |
| `--lora_alpha` | 128 | LoRA alpha (scaling factor, usually 2x rank) |
| `--lora_dropout` | 0.05 | Dropout for regularization |

### Training Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--num_train_epochs` | 3 | Number of training epochs |
| `--per_device_train_batch_size` | 4 | Batch size per GPU |
| `--gradient_accumulation_steps` | 4 | Effective batch = batch_size × grad_accum |
| `--learning_rate` | 2e-4 | Peak learning rate |
| `--max_seq_length` | 2048 | Maximum sequence length |
| `--warmup_ratio` | 0.1 | Warmup proportion of total steps |

### Memory Requirements (RTX 4090 24GB)

| Configuration | VRAM Usage | Effective Batch |
|---------------|------------|-----------------|
| Default (r=64, bs=4) | ~18GB | 16 |
| Larger (r=128, bs=2) | ~20GB | 8 |
| Smaller (r=32, bs=8) | ~16GB | 32 |

## 📈 Monitoring Training

### Weights & Biases Integration

```bash
# Login to wandb (first time)
wandb login

# Train with wandb logging
./training/start_training.sh --use_wandb --wandb_project allergy-ai
```

### TensorBoard (Alternative)

```bash
# Run tensorboard
tensorboard --logdir ./outputs/allergy-ai-qlora
```

## 🔧 Advanced Usage

### Custom Target Modules

Edit `train_qlora.py` to modify which layers get LoRA adapters:

```python
target_modules = [
    "q_proj", "k_proj", "v_proj", "o_proj",  # Attention
    "gate_proj", "up_proj", "down_proj"       # MLP
]
```

### Multi-GPU Training

```bash
# Use accelerate for multi-GPU
accelerate launch --num_processes 2 training/train_qlora.py \
    --dataset_path training/data/allergy_qa.jsonl \
    --output_dir ./outputs/allergy-ai-qlora
```

### Resume Training

```bash
python training/train_qlora.py \
    --dataset_path training/data/allergy_qa.jsonl \
    --output_dir ./outputs/allergy-ai-qlora \
    --resume_from_checkpoint ./outputs/allergy-ai-qlora/checkpoint-500
```

## 📝 Tips for Better Results

### Data Quality

1. **Diverse examples**: Include various question types and formats
2. **High-quality outputs**: Ensure responses are accurate and well-formatted
3. **Consistent style**: Use a consistent response format throughout
4. **Balanced coverage**: Cover all allergy topics you want the model to handle

### Training Tips

1. **Start small**: Test with a small dataset first
2. **Monitor loss**: Validation loss should decrease, watch for overfitting
3. **Adjust learning rate**: If loss is unstable, try lower learning rate
4. **Increase data**: If overfitting, add more diverse training examples

### Recommended Dataset Size

| Use Case | Minimum Examples | Recommended |
|----------|------------------|-------------|
| Quick test | 50-100 | 100-500 |
| Basic fine-tune | 500-1,000 | 1,000-5,000 |
| Production | 5,000+ | 10,000+ |

## 🐛 Troubleshooting

### Out of Memory (OOM)

1. Reduce `--per_device_train_batch_size`
2. Reduce `--max_seq_length`
3. Reduce `--lora_r`
4. Enable `--gradient_checkpointing` (default)

### Training Loss Not Decreasing

1. Increase `--learning_rate`
2. Check data quality
3. Increase `--num_train_epochs`
4. Verify data format is correct

### Flash Attention Errors

```bash
# Disable flash attention if having issues
python training/train_qlora.py ... --no_flash_attention
```

## 📚 Resources

- [PEFT Documentation](https://huggingface.co/docs/peft)
- [QLoRA Paper](https://arxiv.org/abs/2305.14314)
- [TRL Documentation](https://huggingface.co/docs/trl)
- [Qwen2.5 Model Card](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)

