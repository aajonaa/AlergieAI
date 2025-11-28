#!/usr/bin/env python3
"""
Gemini-Powered Training Dataset Generator for AlergieAI

Generates high-quality, consistent-length Q&A pairs about allergies
using Google's Gemini 2.5 Flash Lite API.

Usage:
    export GEMINI_API_KEY="your-api-key"
    python training/generate_dataset_gemini.py --num_samples 1000
"""

import argparse
import json
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

# =============================================================================
# Configuration
# =============================================================================

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"

# System prompt for the allergy expert
ALLERGY_EXPERT_SYSTEM_PROMPT = """You are AlergieAI, a world-class allergist and immunologist with 25+ years of clinical experience. You specialize in:
- Food allergies (peanuts, tree nuts, shellfish, dairy, eggs, wheat, soy, sesame)
- Environmental allergies (pollen, dust mites, mold, pet dander)
- Drug allergies and sensitivities
- Allergic conditions (anaphylaxis, eczema, asthma, urticaria)
- Allergy testing, diagnosis, and treatment
- Immunotherapy (OIT, SLIT, SCIT)
- Emergency response and epinephrine use

Guidelines:
1. Provide accurate, evidence-based medical information
2. Be empathetic and reassuring while being informative
3. Always recommend consulting healthcare professionals for personal medical advice
4. Explain complex concepts in accessible language
5. Include practical, actionable advice when appropriate
6. Mention emergency procedures when discussing severe reactions"""

# Target response length (tokens roughly = words * 1.3)
TARGET_ANSWER_LENGTH = "200-350 words"
TARGET_QUESTION_LENGTH = "10-30 words"

# Diverse allergy topics for question generation
ALLERGY_TOPICS = [
    # Food Allergies
    "peanut allergy", "tree nut allergy", "shellfish allergy", "fish allergy",
    "milk allergy", "egg allergy", "wheat allergy", "soy allergy", "sesame allergy",
    "food allergy in children", "food allergy in adults", "food allergy testing",
    "food allergy vs intolerance", "cross-reactivity in food allergies",
    "alpha-gal syndrome", "oral allergy syndrome",
    
    # Environmental Allergies
    "pollen allergy", "hay fever", "dust mite allergy", "mold allergy",
    "pet allergy", "cat allergy", "dog allergy", "cockroach allergy",
    "seasonal allergies", "perennial allergies", "indoor allergens",
    
    # Drug Allergies
    "penicillin allergy", "antibiotic allergy", "NSAID sensitivity",
    "aspirin allergy", "drug allergy testing", "anesthesia allergy",
    
    # Allergic Conditions
    "anaphylaxis", "urticaria", "hives", "angioedema", "eczema",
    "atopic dermatitis", "allergic asthma", "allergic rhinitis",
    "allergic conjunctivitis", "contact dermatitis",
    
    # Treatment
    "epinephrine auto-injector", "EpiPen use", "antihistamines",
    "oral immunotherapy", "sublingual immunotherapy", "allergy shots",
    "biologics for allergies", "omalizumab",
    
    # Management
    "allergen avoidance", "reading food labels", "dining out with allergies",
    "school allergy management", "travel with allergies", "allergy action plan",
    "cross-contamination prevention", "allergen-free cooking",
    
    # Diagnosis
    "skin prick test", "blood test for allergies", "IgE testing",
    "food challenge test", "component testing", "allergy specialist",
    
    # Special Topics
    "FPIES", "eosinophilic esophagitis", "allergic proctocolitis",
    "latex allergy", "insect sting allergy", "exercise-induced anaphylaxis",
    "outgrowing allergies", "allergy prevention in infants"
]

# Question types for diversity
QUESTION_TYPES = [
    "What is/are {topic}?",
    "What causes {topic}?",
    "What are the symptoms of {topic}?",
    "How is {topic} diagnosed?",
    "How is {topic} treated?",
    "How can I manage {topic}?",
    "What should I avoid with {topic}?",
    "Can you outgrow {topic}?",
    "Is {topic} dangerous?",
    "What triggers {topic}?",
    "How do I know if I have {topic}?",
    "What's the difference between {topic} and food intolerance?",
    "How common is {topic}?",
    "Can {topic} be cured?",
    "What foods contain hidden {topic}?",
    "How do I explain {topic} to others?",
    "What emergency steps should I take for {topic}?",
    "Are there new treatments for {topic}?",
    "How do I prepare for a reaction from {topic}?",
    "What tests are used for {topic}?",
]

# =============================================================================
# Gemini API Functions
# =============================================================================

def call_gemini_api(prompt: str, api_key: str, system_prompt: str = None, max_retries: int = 3) -> str:
    """Call the Gemini API with retry logic."""
    
    headers = {
        "Content-Type": "application/json",
    }
    
    # Build the request
    contents = []
    
    # Add system instruction if provided
    system_instruction = None
    if system_prompt:
        system_instruction = {
            "parts": [{"text": system_prompt}]
        }
    
    contents.append({
        "role": "user",
        "parts": [{"text": prompt}]
    })
    
    data = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.8,
            "topP": 0.95,
            "maxOutputTokens": 1024,
        }
    }
    
    if system_instruction:
        data["systemInstruction"] = system_instruction
    
    url = f"{GEMINI_API_URL}?key={api_key}"
    
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=data, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                # Extract text from response
                if "candidates" in result and len(result["candidates"]) > 0:
                    candidate = result["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        return candidate["content"]["parts"][0].get("text", "")
                return ""
            
            elif response.status_code == 429:
                # Rate limited - wait and retry
                wait_time = (attempt + 1) * 10
                print(f"  Rate limited, waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
            
            else:
                print(f"  API error {response.status_code}: {response.text[:200]}")
                time.sleep(2)
                
        except requests.exceptions.Timeout:
            print(f"  Timeout, retrying...")
            time.sleep(5)
        except Exception as e:
            print(f"  Error: {e}")
            time.sleep(2)
    
    return ""


def generate_question(topic: str, api_key: str, used_questions: set) -> str:
    """Generate a unique question about a topic."""
    
    prompt = f"""Generate ONE specific, practical question that a patient might ask their allergist about: {topic}

Requirements:
- Question should be {TARGET_QUESTION_LENGTH}
- Be specific and focused on one aspect
- Use natural, conversational language
- Don't start with "Can you explain" or be too generic
- Focus on practical concerns patients actually have

Output ONLY the question, nothing else."""

    for _ in range(3):  # Try up to 3 times for uniqueness
        question = call_gemini_api(prompt, api_key)
        question = question.strip().strip('"').strip("'")
        
        # Clean up the question
        if question and question not in used_questions:
            # Ensure it ends with ?
            if not question.endswith("?"):
                question += "?"
            return question
    
    # Fallback: generate from template
    template = random.choice(QUESTION_TYPES)
    return template.format(topic=topic)


def generate_answer(question: str, api_key: str) -> str:
    """Generate a consistent-length answer to a question."""
    
    prompt = f"""Answer this patient question as an expert allergist:

Question: {question}

Requirements:
- Response MUST be exactly {TARGET_ANSWER_LENGTH} (not shorter, not longer)
- Use clear formatting with sections/bullet points where appropriate
- Be comprehensive but focused
- Include practical advice when relevant
- Mention when to seek medical care
- Use empathetic, professional tone

Provide your answer:"""

    answer = call_gemini_api(prompt, api_key, ALLERGY_EXPERT_SYSTEM_PROMPT)
    return answer.strip()


def validate_qa_length(question: str, answer: str, min_q_words: int = 5, max_q_words: int = 50,
                       min_a_words: int = 150, max_a_words: int = 450) -> bool:
    """Validate Q&A pair has appropriate length."""
    q_words = len(question.split())
    a_words = len(answer.split())
    
    return (min_q_words <= q_words <= max_q_words and 
            min_a_words <= a_words <= max_a_words)


# =============================================================================
# Dataset Generation
# =============================================================================

def generate_dataset(
    api_key: str,
    num_samples: int = 1000,
    output_path: str = "training/data/allergy_dataset_gemini.jsonl",
    checkpoint_every: int = 50,
):
    """Generate the training dataset."""
    
    print("=" * 70)
    print("  AlergieAI Training Dataset Generator (Gemini)")
    print("=" * 70)
    print(f"\n  Target samples: {num_samples}")
    print(f"  Output: {output_path}")
    print(f"  Question length: {TARGET_QUESTION_LENGTH}")
    print(f"  Answer length: {TARGET_ANSWER_LENGTH}")
    print("=" * 70 + "\n")
    
    # Create output directory
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    
    # Load existing data if resuming
    existing_data = []
    used_questions = set()
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    existing_data.append(item)
                    used_questions.add(item.get("instruction", "").lower())
        print(f"Loaded {len(existing_data)} existing samples, resuming...")
    
    # Track statistics
    stats = {
        "generated": len(existing_data),
        "failed": 0,
        "length_rejected": 0,
        "start_time": datetime.now()
    }
    
    # Open file for appending
    with open(output_path, 'a', encoding='utf-8') as f:
        
        sample_idx = len(existing_data)
        
        while stats["generated"] < num_samples:
            # Pick a random topic
            topic = random.choice(ALLERGY_TOPICS)
            
            # Progress indicator
            progress = (stats["generated"] / num_samples) * 100
            print(f"\r[{progress:5.1f}%] Generating sample {stats['generated']+1}/{num_samples} (topic: {topic})...", end="")
            sys.stdout.flush()
            
            try:
                # Generate question
                question = generate_question(topic, api_key, used_questions)
                if not question:
                    stats["failed"] += 1
                    continue
                
                # Generate answer
                answer = generate_answer(question, api_key)
                if not answer:
                    stats["failed"] += 1
                    continue
                
                # Validate length consistency
                if not validate_qa_length(question, answer):
                    stats["length_rejected"] += 1
                    # Try to regenerate with stricter prompt
                    answer = generate_answer(question, api_key)
                    if not validate_qa_length(question, answer):
                        continue
                
                # Create the example
                example = {
                    "instruction": question,
                    "input": "",
                    "output": answer,
                    "system": "",
                    "metadata": {
                        "topic": topic,
                        "q_words": len(question.split()),
                        "a_words": len(answer.split()),
                    }
                }
                
                # Save immediately (crash-resistant)
                f.write(json.dumps(example, ensure_ascii=False) + "\n")
                f.flush()
                
                # Track
                used_questions.add(question.lower())
                stats["generated"] += 1
                sample_idx += 1
                
                # Checkpoint summary
                if stats["generated"] % checkpoint_every == 0:
                    elapsed = (datetime.now() - stats["start_time"]).total_seconds()
                    rate = stats["generated"] / max(elapsed, 1) * 3600  # per hour
                    eta = (num_samples - stats["generated"]) / max(rate, 1)
                    print(f"\n  ✓ Checkpoint: {stats['generated']} samples | "
                          f"Rate: {rate:.0f}/hr | ETA: {eta:.1f}hr | "
                          f"Failed: {stats['failed']} | Length rejected: {stats['length_rejected']}")
                
                # Rate limiting - be nice to the API
                time.sleep(0.5)
                
            except KeyboardInterrupt:
                print("\n\n⚠️  Interrupted! Progress saved.")
                break
            except Exception as e:
                print(f"\n  Error: {e}")
                stats["failed"] += 1
                time.sleep(1)
    
    # Final summary
    print("\n\n" + "=" * 70)
    print("  Generation Complete!")
    print("=" * 70)
    print(f"  Total samples: {stats['generated']}")
    print(f"  Failed attempts: {stats['failed']}")
    print(f"  Length rejected: {stats['length_rejected']}")
    print(f"  Output: {output_path}")
    
    elapsed = (datetime.now() - stats["start_time"]).total_seconds() / 60
    print(f"  Time: {elapsed:.1f} minutes")
    print("=" * 70)
    
    # Print sample
    if stats["generated"] > 0:
        print("\n📝 Sample from generated data:\n")
        with open(output_path, 'r', encoding='utf-8') as f:
            last_lines = f.readlines()[-3:]
            for i, line in enumerate(last_lines, 1):
                item = json.loads(line)
                print(f"Example {i}:")
                print(f"  Q: {item['instruction']}")
                print(f"  A: {item['output'][:150]}...")
                print(f"  Length: {item['metadata']['q_words']} / {item['metadata']['a_words']} words")
                print()
    
    return stats


def analyze_dataset(path: str):
    """Analyze the generated dataset for quality."""
    
    print(f"\n📊 Dataset Analysis: {path}\n")
    
    if not os.path.exists(path):
        print("File not found!")
        return
    
    data = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    
    if not data:
        print("No data found!")
        return
    
    # Length statistics
    q_lengths = [len(d['instruction'].split()) for d in data]
    a_lengths = [d.get('metadata', {}).get('a_words', len(d['output'].split())) for d in data]
    
    print(f"Total samples: {len(data)}")
    print(f"\nQuestion length (words):")
    print(f"  Min: {min(q_lengths)}, Max: {max(q_lengths)}, Avg: {sum(q_lengths)/len(q_lengths):.1f}")
    print(f"\nAnswer length (words):")
    print(f"  Min: {min(a_lengths)}, Max: {max(a_lengths)}, Avg: {sum(a_lengths)/len(a_lengths):.1f}")
    
    # Topic distribution
    topics = {}
    for d in data:
        topic = d.get('metadata', {}).get('topic', 'unknown')
        topics[topic] = topics.get(topic, 0) + 1
    
    print(f"\nTopic distribution (top 10):")
    for topic, count in sorted(topics.items(), key=lambda x: -x[1])[:10]:
        print(f"  {topic}: {count} ({100*count/len(data):.1f}%)")
    
    # Length variance (lower is better for fine-tuning)
    import statistics
    a_variance = statistics.stdev(a_lengths) if len(a_lengths) > 1 else 0
    print(f"\nAnswer length std dev: {a_variance:.1f} words")
    if a_variance < 50:
        print("  ✅ Good consistency for fine-tuning!")
    elif a_variance < 100:
        print("  ⚠️  Moderate variance - consider filtering")
    else:
        print("  ❌ High variance - may affect fine-tuning quality")


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Generate allergy Q&A dataset using Gemini")
    
    parser.add_argument("--num_samples", type=int, default=1000,
                        help="Number of Q&A samples to generate")
    parser.add_argument("--output", type=str, default="training/data/allergy_dataset_gemini.jsonl",
                        help="Output JSONL file path")
    parser.add_argument("--api_key", type=str, default=None,
                        help="Gemini API key (or set GEMINI_API_KEY env var)")
    parser.add_argument("--analyze", action="store_true",
                        help="Analyze existing dataset instead of generating")
    parser.add_argument("--checkpoint_every", type=int, default=50,
                        help="Print checkpoint every N samples")
    
    args = parser.parse_args()
    
    if args.analyze:
        analyze_dataset(args.output)
        return
    
    # Get API key
    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ Error: Please provide Gemini API key via --api_key or GEMINI_API_KEY env var")
        print("\nUsage:")
        print("  export GEMINI_API_KEY='your-key'")
        print("  python training/generate_dataset_gemini.py --num_samples 1000")
        sys.exit(1)
    
    # Generate dataset
    generate_dataset(
        api_key=api_key,
        num_samples=args.num_samples,
        output_path=args.output,
        checkpoint_every=args.checkpoint_every,
    )
    
    # Auto-analyze after generation
    print("\n" + "=" * 70)
    analyze_dataset(args.output)


if __name__ == "__main__":
    main()

