#!/usr/bin/env python3
"""
Merge LoRA Adapters with Base Model

This script merges trained LoRA adapters back into the base model,
creating a standalone model that can be deployed with vLLM without
needing to load adapters separately.

Usage:
    python training/merge_lora.py \
        --adapter_path ./outputs/allergy-ai-qlora \
        --output_path ./outputs/allergy-ai-merged \
        --base_model Qwen/Qwen3-30B-A3B-Instruct-2507
"""

import argparse
import os

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


def merge_lora_to_base(
    base_model_path: str,
    adapter_path: str,
    output_path: str,
    push_to_hub: bool = False,
    hub_model_id: str = None,
    save_bf16: bool = True,
):
    """
    Merge LoRA adapters with the base model and save.
    
    Args:
        base_model_path: Path or HuggingFace ID of the base model
        adapter_path: Path to the trained LoRA adapters
        output_path: Where to save the merged model
        push_to_hub: Whether to push to HuggingFace Hub
        hub_model_id: Model ID for HuggingFace Hub
        save_bf16: Save in bfloat16 format (recommended for vLLM)
    """
    print("=" * 60)
    print("LoRA Adapter Merging")
    print("=" * 60)
    print(f"Base Model: {base_model_path}")
    print(f"Adapter Path: {adapter_path}")
    print(f"Output Path: {output_path}")
    print("=" * 60)
    
    # Load base model in full precision for merging
    print("\n1. Loading base model...")
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_path,
        torch_dtype=torch.float16,  # Load in fp16 for merging
        device_map="auto",
        trust_remote_code=True,
    )
    
    # Load tokenizer
    print("2. Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        base_model_path,
        trust_remote_code=True,
    )
    
    # Load LoRA adapters
    print("3. Loading LoRA adapters...")
    model = PeftModel.from_pretrained(
        base_model,
        adapter_path,
        device_map="auto",
    )
    
    # Merge adapters with base model
    print("4. Merging adapters with base model...")
    model = model.merge_and_unload()
    
    # Convert to bfloat16 if requested (better for vLLM deployment)
    if save_bf16:
        print("5. Converting to bfloat16...")
        model = model.to(torch.bfloat16)
    
    # Save merged model
    print(f"6. Saving merged model to {output_path}...")
    os.makedirs(output_path, exist_ok=True)
    model.save_pretrained(output_path, safe_serialization=True)
    tokenizer.save_pretrained(output_path)
    
    # Optionally push to HuggingFace Hub
    if push_to_hub and hub_model_id:
        print(f"7. Pushing to HuggingFace Hub: {hub_model_id}")
        model.push_to_hub(hub_model_id)
        tokenizer.push_to_hub(hub_model_id)
    
    print("\n" + "=" * 60)
    print("✅ Merge complete!")
    print("=" * 60)
    print(f"\nMerged model saved to: {output_path}")
    print("\nTo use with vLLM, update start_vllm.sh:")
    print(f'  MODEL_NAME="{output_path}"')
    print("\nOr run directly:")
    print(f'  python -m vllm.entrypoints.openai.api_server --model {output_path}')
    

def main():
    parser = argparse.ArgumentParser(description="Merge LoRA adapters with base model")
    
    parser.add_argument(
        "--base_model",
        type=str,
        default="Qwen/Qwen3-30B-A3B-Instruct-2507",
        help="Base model path or HuggingFace ID"
    )
    parser.add_argument(
        "--adapter_path",
        type=str,
        required=True,
        help="Path to trained LoRA adapters"
    )
    parser.add_argument(
        "--output_path",
        type=str,
        required=True,
        help="Path to save merged model"
    )
    parser.add_argument(
        "--push_to_hub",
        action="store_true",
        help="Push merged model to HuggingFace Hub"
    )
    parser.add_argument(
        "--hub_model_id",
        type=str,
        default=None,
        help="HuggingFace Hub model ID (required if push_to_hub)"
    )
    parser.add_argument(
        "--no_bf16",
        action="store_true",
        help="Don't convert to bfloat16 (keep fp16)"
    )
    
    args = parser.parse_args()
    
    if args.push_to_hub and not args.hub_model_id:
        parser.error("--hub_model_id is required when using --push_to_hub")
    
    merge_lora_to_base(
        base_model_path=args.base_model,
        adapter_path=args.adapter_path,
        output_path=args.output_path,
        push_to_hub=args.push_to_hub,
        hub_model_id=args.hub_model_id,
        save_bf16=not args.no_bf16,
    )


if __name__ == "__main__":
    main()

