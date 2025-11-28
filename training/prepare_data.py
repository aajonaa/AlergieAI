#!/usr/bin/env python3
"""
Data Preparation Utilities for AlergieAI Training

This module provides utilities for:
1. Converting various data formats to the training format
2. Validating training data
3. Creating synthetic data examples
4. Splitting data into train/validation sets

Supported input formats:
- JSONL with instruction/input/output
- JSONL with messages (OpenAI chat format)
- CSV with question/answer columns
- HuggingFace datasets

Output format (JSONL):
{
    "instruction": "User question or instruction",
    "input": "Optional context or additional input",
    "output": "Assistant response",
    "system": "Optional system prompt"
}
"""

import argparse
import csv
import json
import os
import random
from pathlib import Path
from typing import Optional


def load_jsonl(path: str) -> list[dict]:
    """Load data from a JSONL file."""
    data = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                data.append(json.loads(line))
    return data


def save_jsonl(data: list[dict], path: str):
    """Save data to a JSONL file."""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"Saved {len(data)} examples to {path}")


def convert_openai_format(data: list[dict]) -> list[dict]:
    """
    Convert OpenAI chat format to instruction format.
    
    Input format:
    {
        "messages": [
            {"role": "system", "content": "..."},
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ]
    }
    """
    converted = []
    for item in data:
        messages = item.get("messages", [])
        
        system = None
        instruction = None
        output = None
        
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")
            
            if role == "system":
                system = content
            elif role == "user":
                instruction = content
            elif role == "assistant":
                output = content
        
        if instruction and output:
            converted.append({
                "instruction": instruction,
                "input": "",
                "output": output,
                "system": system or ""
            })
    
    return converted


def convert_csv_format(path: str, question_col: str, answer_col: str) -> list[dict]:
    """
    Convert CSV format to instruction format.
    
    Args:
        path: Path to CSV file
        question_col: Column name for questions
        answer_col: Column name for answers
    """
    data = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get(question_col) and row.get(answer_col):
                data.append({
                    "instruction": row[question_col],
                    "input": "",
                    "output": row[answer_col],
                    "system": ""
                })
    return data


def validate_data(data: list[dict]) -> tuple[list[dict], list[str]]:
    """
    Validate training data and return valid examples + errors.
    
    Checks:
    - Required fields present (instruction, output)
    - Non-empty instruction and output
    - Reasonable length
    """
    valid = []
    errors = []
    
    for i, item in enumerate(data):
        # Check required fields
        if "instruction" not in item:
            errors.append(f"Example {i}: Missing 'instruction' field")
            continue
        
        if "output" not in item:
            errors.append(f"Example {i}: Missing 'output' field")
            continue
        
        # Check non-empty
        if not item["instruction"].strip():
            errors.append(f"Example {i}: Empty instruction")
            continue
        
        if not item["output"].strip():
            errors.append(f"Example {i}: Empty output")
            continue
        
        # Check reasonable length
        total_len = len(item["instruction"]) + len(item["output"]) + len(item.get("input", ""))
        if total_len > 50000:  # ~12k tokens roughly
            errors.append(f"Example {i}: Too long ({total_len} chars)")
            continue
        
        # Normalize fields
        valid.append({
            "instruction": item["instruction"].strip(),
            "input": item.get("input", "").strip(),
            "output": item["output"].strip(),
            "system": item.get("system", "").strip()
        })
    
    return valid, errors


def split_data(
    data: list[dict],
    val_ratio: float = 0.1,
    seed: int = 42
) -> tuple[list[dict], list[dict]]:
    """Split data into training and validation sets."""
    random.seed(seed)
    data = data.copy()
    random.shuffle(data)
    
    val_size = int(len(data) * val_ratio)
    val_data = data[:val_size]
    train_data = data[val_size:]
    
    return train_data, val_data


def print_data_stats(data: list[dict], name: str = "Data"):
    """Print statistics about the dataset."""
    print(f"\n{name} Statistics:")
    print(f"  Total examples: {len(data)}")
    
    if not data:
        return
    
    # Length statistics
    inst_lens = [len(d["instruction"]) for d in data]
    out_lens = [len(d["output"]) for d in data]
    
    print(f"  Instruction length: min={min(inst_lens)}, max={max(inst_lens)}, avg={sum(inst_lens)/len(inst_lens):.0f}")
    print(f"  Output length: min={min(out_lens)}, max={max(out_lens)}, avg={sum(out_lens)/len(out_lens):.0f}")
    
    # System prompt usage
    with_system = sum(1 for d in data if d.get("system"))
    print(f"  With system prompt: {with_system} ({100*with_system/len(data):.1f}%)")
    
    # Input field usage
    with_input = sum(1 for d in data if d.get("input"))
    print(f"  With input context: {with_input} ({100*with_input/len(data):.1f}%)")


def create_sample_data():
    """Create sample training data for testing."""
    samples = [
        {
            "instruction": "What are the symptoms of lactose intolerance?",
            "input": "",
            "output": "Lactose intolerance symptoms typically occur 30 minutes to 2 hours after consuming dairy products and include:\n\n1. **Digestive symptoms:**\n- Bloating and gas\n- Abdominal cramps and pain\n- Diarrhea\n- Nausea (sometimes vomiting)\n- Stomach rumbling (borborygmi)\n\n2. **Severity factors:**\n- Amount of lactose consumed\n- Individual's level of lactase deficiency\n- Type of dairy product (some are better tolerated)\n\n**Important:** Lactose intolerance is NOT a milk allergy. It's a digestive issue caused by insufficient lactase enzyme, not an immune response. Milk allergies involve the immune system and can cause more severe symptoms including anaphylaxis.",
            "system": ""
        },
        {
            "instruction": "How do I use an EpiPen?",
            "input": "The person is showing signs of anaphylaxis",
            "output": "Here's how to use an EpiPen in an emergency:\n\n**Step-by-Step Instructions:**\n\n1. **Remove the EpiPen** from its carrier tube\n2. **Grip firmly** with the orange tip pointing down\n3. **Remove the blue safety cap** by pulling straight up\n4. **Position at outer thigh** - can be given through clothing\n5. **Swing and push firmly** until you hear a click\n6. **Hold in place for 10 seconds**\n7. **Remove and massage** the injection site for 10 seconds\n\n**After injection:**\n- Call 911 immediately (even if symptoms improve)\n- Note the time of injection\n- Stay with the person\n- Be prepared to give a second dose after 5-15 minutes if needed\n- Lay person flat, elevate legs (unless breathing is difficult)\n\n**Important:** The EpiPen delivers epinephrine to counteract anaphylaxis. It's the first-line treatment - antihistamines alone are NOT sufficient for anaphylaxis.",
            "system": "You are AlergieAI, a specialized medical assistant focused on allergies. Provide accurate, helpful, and empathetic responses."
        },
        {
            "instruction": "Is there a cure for food allergies?",
            "input": "",
            "output": "Currently, there is **no cure** for food allergies, but there are promising treatments:\n\n**Current Management (Avoidance):**\n- Strict avoidance of allergens\n- Reading food labels carefully\n- Emergency epinephrine for accidental exposure\n\n**Emerging Treatments:**\n\n1. **Oral Immunotherapy (OIT):**\n- Gradually increasing doses of allergen\n- FDA-approved for peanut (Palforzia)\n- Can raise reaction threshold\n- Requires maintenance dosing\n\n2. **Sublingual Immunotherapy (SLIT):**\n- Allergen placed under tongue\n- Less severe reactions than OIT\n- Currently in clinical trials\n\n3. **Epicutaneous Immunotherapy (EPIT):**\n- Skin patches with allergen\n- Viaskin Peanut in development\n\n4. **Biologics:**\n- Omalizumab (Xolair) combined with OIT\n- May reduce reaction severity\n\n**Research Areas:**\n- Gene therapy\n- Microbiome modification\n- Vaccine development\n\n**Note:** Some children naturally outgrow certain food allergies (milk, egg, wheat, soy), but this isn't a \"cure\" and must be confirmed by an allergist through controlled testing.",
            "system": ""
        }
    ]
    return samples


def main():
    parser = argparse.ArgumentParser(description="Prepare training data for AlergieAI")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Convert command
    convert_parser = subparsers.add_parser("convert", help="Convert data format")
    convert_parser.add_argument("--input", required=True, help="Input file path")
    convert_parser.add_argument("--output", required=True, help="Output file path")
    convert_parser.add_argument(
        "--format",
        choices=["openai", "csv", "jsonl"],
        default="jsonl",
        help="Input format"
    )
    convert_parser.add_argument("--question_col", default="question", help="CSV question column")
    convert_parser.add_argument("--answer_col", default="answer", help="CSV answer column")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate training data")
    validate_parser.add_argument("--input", required=True, help="Input file path")
    
    # Split command
    split_parser = subparsers.add_parser("split", help="Split data into train/val")
    split_parser.add_argument("--input", required=True, help="Input file path")
    split_parser.add_argument("--output_dir", required=True, help="Output directory")
    split_parser.add_argument("--val_ratio", type=float, default=0.1, help="Validation ratio")
    
    # Sample command
    sample_parser = subparsers.add_parser("sample", help="Create sample data")
    sample_parser.add_argument("--output", default="training/data/sample.jsonl", help="Output path")
    
    args = parser.parse_args()
    
    if args.command == "convert":
        if args.format == "openai":
            data = load_jsonl(args.input)
            converted = convert_openai_format(data)
        elif args.format == "csv":
            converted = convert_csv_format(args.input, args.question_col, args.answer_col)
        else:
            converted = load_jsonl(args.input)
        
        valid, errors = validate_data(converted)
        if errors:
            print(f"Found {len(errors)} errors:")
            for err in errors[:10]:
                print(f"  - {err}")
        
        save_jsonl(valid, args.output)
        print_data_stats(valid)
    
    elif args.command == "validate":
        data = load_jsonl(args.input)
        valid, errors = validate_data(data)
        
        print(f"\nValidation Results:")
        print(f"  Valid: {len(valid)}")
        print(f"  Errors: {len(errors)}")
        
        if errors:
            print("\nErrors:")
            for err in errors:
                print(f"  - {err}")
        
        print_data_stats(valid)
    
    elif args.command == "split":
        data = load_jsonl(args.input)
        train_data, val_data = split_data(data, args.val_ratio)
        
        os.makedirs(args.output_dir, exist_ok=True)
        save_jsonl(train_data, os.path.join(args.output_dir, "train.jsonl"))
        save_jsonl(val_data, os.path.join(args.output_dir, "val.jsonl"))
        
        print_data_stats(train_data, "Training")
        print_data_stats(val_data, "Validation")
    
    elif args.command == "sample":
        samples = create_sample_data()
        save_jsonl(samples, args.output)
        print_data_stats(samples, "Sample")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

