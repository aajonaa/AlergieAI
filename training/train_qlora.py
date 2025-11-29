#!/usr/bin/env python3
"""
QLoRA Fine-tuning Script for Qwen2.5-1.5B-Instruct

This script fine-tunes the Qwen2.5 model using QLoRA (Quantized Low-Rank Adaptation)
for memory-efficient training on consumer GPUs like the RTX 4090.

Usage:
    python training/train_qlora.py \
        --dataset_path training/data/allergy_qa.jsonl \
        --output_dir ./outputs/allergy-ai-qlora

Features:
    - 4-bit quantization (QLoRA) for memory efficiency
    - LoRA adapters for parameter-efficient fine-tuning
    - Gradient checkpointing for reduced memory usage
    - Flash Attention 2 support for faster training
    - Wandb integration for experiment tracking
"""

import argparse
import json
import os
from dataclasses import dataclass, field
from typing import Optional

import torch
from datasets import Dataset, load_dataset
from peft import (
    LoraConfig,
    TaskType,
    get_peft_model,
    prepare_model_for_kbit_training,
)
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer, SFTConfig


@dataclass
class ModelArguments:
    """Arguments for model configuration."""
    model_name_or_path: str = field(
        default="Qwen/Qwen2.5-1.5B-Instruct",
        metadata={"help": "Path to pretrained model or model identifier from HuggingFace"}
    )
    trust_remote_code: bool = field(
        default=True,
        metadata={"help": "Whether to trust remote code from HuggingFace"}
    )
    use_flash_attention: bool = field(
        default=False,
        metadata={"help": "Whether to use Flash Attention 2 for faster training"}
    )


@dataclass
class LoRAArguments:
    """Arguments for LoRA configuration."""
    lora_r: int = field(
        default=64,
        metadata={"help": "LoRA attention dimension (rank)"}
    )
    lora_alpha: int = field(
        default=128,
        metadata={"help": "LoRA alpha parameter for scaling"}
    )
    lora_dropout: float = field(
        default=0.05,
        metadata={"help": "Dropout probability for LoRA layers"}
    )
    target_modules: list = field(
        default_factory=lambda: [
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ],
        metadata={"help": "Target modules for LoRA adaptation"}
    )


@dataclass
class DataArguments:
    """Arguments for data configuration."""
    dataset_path: str = field(
        default="training/data/allergy_qa.jsonl",
        metadata={"help": "Path to training dataset (JSONL format)"}
    )
    max_seq_length: int = field(
        default=2048,
        metadata={"help": "Maximum sequence length for training"}
    )
    validation_split: float = field(
        default=0.1,
        metadata={"help": "Fraction of data to use for validation"}
    )


def create_bnb_config() -> BitsAndBytesConfig:
    """Create BitsAndBytes configuration for 4-bit quantization (QLoRA)."""
    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",  # Normalized float 4-bit
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,  # Nested quantization for more memory savings
    )


def create_lora_config(lora_args: LoRAArguments) -> LoraConfig:
    """Create LoRA configuration."""
    return LoraConfig(
        r=lora_args.lora_r,
        lora_alpha=lora_args.lora_alpha,
        lora_dropout=lora_args.lora_dropout,
        target_modules=lora_args.target_modules,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )


def load_model_and_tokenizer(
    model_args: ModelArguments,
    bnb_config: BitsAndBytesConfig
):
    """Load the base model with quantization and tokenizer."""
    print(f"Loading model: {model_args.model_name_or_path}")
    
    # Try to use Flash Attention 2 if available, otherwise fall back to eager
    attn_implementation = None
    if model_args.use_flash_attention:
        try:
            import flash_attn
            attn_implementation = "flash_attention_2"
            print("Using Flash Attention 2 for faster training")
        except ImportError:
            print("Flash Attention 2 not available, using standard attention")
            attn_implementation = "eager"
    else:
        attn_implementation = "eager"
    
    model = AutoModelForCausalLM.from_pretrained(
        model_args.model_name_or_path,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=model_args.trust_remote_code,
        attn_implementation=attn_implementation,
    )
    
    tokenizer = AutoTokenizer.from_pretrained(
        model_args.model_name_or_path,
        trust_remote_code=model_args.trust_remote_code,
        padding_side="right",
    )
    
    # Set pad token if not present
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        model.config.pad_token_id = tokenizer.eos_token_id
    
    # Set truncation
    tokenizer.truncation_side = "left"
    
    return model, tokenizer


def format_chat_message(example: dict, tokenizer) -> str:
    """
    Format a single example into chat format for Qwen2.5.
    
    Expected input format:
    {
        "instruction": "What are common symptoms of peanut allergy?",
        "input": "",  # Optional context
        "output": "Common symptoms include..."
    }
    
    OR
    
    {
        "messages": [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ]
    }
    """
    # If already in messages format
    if "messages" in example:
        return tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False
        )
    
    # Convert instruction/input/output format to messages
    messages = []
    
    # System message (optional)
    if "system" in example and example["system"]:
        messages.append({"role": "system", "content": example["system"]})
    else:
        # Default system prompt for allergy AI
        messages.append({
            "role": "system",
            "content": "You are AlergieAI, a specialized medical assistant focused on allergies. Provide accurate, helpful, and empathetic responses about allergies, their symptoms, treatments, and management strategies. Always recommend consulting healthcare professionals for medical advice."
        })
    
    # User message
    user_content = example.get("instruction", "")
    if example.get("input"):
        user_content = f"{user_content}\n\nContext: {example['input']}"
    messages.append({"role": "user", "content": user_content})
    
    # Assistant response
    messages.append({"role": "assistant", "content": example.get("output", "")})
    
    return tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False
    )


def load_and_prepare_dataset(
    data_args: DataArguments,
    tokenizer
) -> tuple[Dataset, Optional[Dataset]]:
    """Load and prepare the training dataset."""
    print(f"Loading dataset from: {data_args.dataset_path}")
    
    # Support both JSONL and JSON formats
    if data_args.dataset_path.endswith(".jsonl"):
        dataset = load_dataset("json", data_files=data_args.dataset_path, split="train")
    elif data_args.dataset_path.endswith(".json"):
        dataset = load_dataset("json", data_files=data_args.dataset_path, split="train")
    else:
        # Assume it's a HuggingFace dataset ID
        dataset = load_dataset(data_args.dataset_path, split="train")
    
    print(f"Dataset loaded with {len(dataset)} examples")
    
    # Format single example and add "text" column (required by new TRL API)
    def add_text_column(example):
        text = format_chat_message({
            "instruction": example.get("instruction", ""),
            "input": example.get("input", ""),
            "output": example.get("output", ""),
            "system": example.get("system", "")
        }, tokenizer)
        return {"text": text}
    
    # Add text column to dataset
    dataset = dataset.map(add_text_column)
    
    # Split into train and validation
    if data_args.validation_split > 0:
        split_dataset = dataset.train_test_split(
            test_size=data_args.validation_split,
            seed=42
        )
        return split_dataset["train"], split_dataset["test"]
    
    return dataset, None


def main():
    parser = argparse.ArgumentParser(description="QLoRA Fine-tuning for AlergieAI")
    
    # Model arguments
    parser.add_argument("--model_name", type=str, default="Qwen/Qwen2.5-1.5B-Instruct",
                        help="Model to fine-tune")
    parser.add_argument("--use_flash_attention", action="store_true", default=False,
                        help="Use Flash Attention 2")
    
    # Data arguments
    parser.add_argument("--dataset_path", type=str, required=True,
                        help="Path to training data (JSONL)")
    parser.add_argument("--max_seq_length", type=int, default=2048,
                        help="Maximum sequence length")
    parser.add_argument("--validation_split", type=float, default=0.1,
                        help="Validation split ratio")
    
    # LoRA arguments
    parser.add_argument("--lora_r", type=int, default=64,
                        help="LoRA rank")
    parser.add_argument("--lora_alpha", type=int, default=128,
                        help="LoRA alpha")
    parser.add_argument("--lora_dropout", type=float, default=0.05,
                        help="LoRA dropout")
    
    # Training arguments
    parser.add_argument("--output_dir", type=str, default="./outputs/allergy-ai-qlora",
                        help="Output directory")
    parser.add_argument("--num_train_epochs", type=int, default=3,
                        help="Number of training epochs")
    parser.add_argument("--per_device_train_batch_size", type=int, default=4,
                        help="Training batch size per device")
    parser.add_argument("--per_device_eval_batch_size", type=int, default=4,
                        help="Evaluation batch size per device")
    parser.add_argument("--gradient_accumulation_steps", type=int, default=4,
                        help="Gradient accumulation steps")
    parser.add_argument("--learning_rate", type=float, default=2e-4,
                        help="Learning rate")
    parser.add_argument("--warmup_ratio", type=float, default=0.1,
                        help="Warmup ratio")
    parser.add_argument("--logging_steps", type=int, default=10,
                        help="Logging steps")
    parser.add_argument("--save_steps", type=int, default=100,
                        help="Save checkpoint every N steps")
    parser.add_argument("--eval_steps", type=int, default=100,
                        help="Evaluation steps")
    
    # Misc
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed")
    parser.add_argument("--use_wandb", action="store_true",
                        help="Use Weights & Biases for logging")
    parser.add_argument("--wandb_project", type=str, default="allergy-ai",
                        help="Wandb project name")
    
    args = parser.parse_args()
    
    # Set seed
    torch.manual_seed(args.seed)
    
    # Create configurations
    model_args = ModelArguments(
        model_name_or_path=args.model_name,
        use_flash_attention=args.use_flash_attention,
    )
    
    lora_args = LoRAArguments(
        lora_r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
    )
    
    data_args = DataArguments(
        dataset_path=args.dataset_path,
        max_seq_length=args.max_seq_length,
        validation_split=args.validation_split,
    )
    
    # Initialize wandb if requested
    if args.use_wandb:
        import wandb
        wandb.init(project=args.wandb_project, config=vars(args))
    
    # Setup quantization config
    bnb_config = create_bnb_config()
    
    # Load model and tokenizer
    model, tokenizer = load_model_and_tokenizer(model_args, bnb_config)
    
    # Prepare model for k-bit training
    model = prepare_model_for_kbit_training(
        model,
        use_gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False}
    )
    
    # Create and apply LoRA config
    lora_config = create_lora_config(lora_args)
    model = get_peft_model(model, lora_config)
    
    # Print trainable parameters
    model.print_trainable_parameters()
    
    # Load dataset
    train_dataset, eval_dataset = load_and_prepare_dataset(
        data_args, tokenizer
    )
    
    # Create training arguments
    training_args = SFTConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.num_train_epochs,
        per_device_train_batch_size=args.per_device_train_batch_size,
        per_device_eval_batch_size=args.per_device_eval_batch_size,
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        learning_rate=args.learning_rate,
        warmup_ratio=args.warmup_ratio,
        logging_steps=args.logging_steps,
        save_steps=args.save_steps,
        eval_steps=args.eval_steps if eval_dataset else None,
        eval_strategy="steps" if eval_dataset else "no",
        save_total_limit=3,
        load_best_model_at_end=True if eval_dataset else False,
        metric_for_best_model="eval_loss" if eval_dataset else None,
        bf16=True,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        optim="paged_adamw_32bit",
        lr_scheduler_type="cosine",
        seed=args.seed,
        report_to="wandb" if args.use_wandb else "none",
        packing=False,  # Disable packing for chat format
        dataset_text_field="text",  # Use the "text" column we created
    )
    
    # Set max sequence length
    tokenizer.model_max_length = args.max_seq_length
    
    # Create trainer
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        processing_class=tokenizer,
    )
    
    # Train
    print("\n" + "=" * 60)
    print("Starting QLoRA Fine-tuning")
    print("=" * 60)
    print(f"Model: {args.model_name}")
    print(f"LoRA Rank: {args.lora_r}")
    print(f"LoRA Alpha: {args.lora_alpha}")
    print(f"Learning Rate: {args.learning_rate}")
    print(f"Batch Size: {args.per_device_train_batch_size} x {args.gradient_accumulation_steps} = {args.per_device_train_batch_size * args.gradient_accumulation_steps}")
    print(f"Epochs: {args.num_train_epochs}")
    print("=" * 60 + "\n")
    
    trainer.train()
    
    # Save final model
    print(f"\nSaving final model to {args.output_dir}")
    trainer.save_model()
    tokenizer.save_pretrained(args.output_dir)
    
    # Save LoRA config for later merging
    model.config.save_pretrained(args.output_dir)
    
    print("\n✅ Training complete!")
    print(f"Model saved to: {args.output_dir}")
    print("\nTo use the fine-tuned model:")
    print("  1. Merge adapters: python training/merge_lora.py")
    print("  2. Update start_vllm.sh to point to the merged model")


if __name__ == "__main__":
    main()

