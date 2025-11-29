#!/usr/bin/env python3
"""
Training Dataset Generator for AlergieAI

Generates high-quality, consistent-length Q&A pairs about allergies
using OpenAI-compatible API.

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

from openai import OpenAI

# =============================================================================
# Configuration
# =============================================================================

# API Configuration (Google AI Studio)
API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
MODEL_NAME = "gemini-2.0-flash-lite"

# System prompt for the allergy expert
ALLERGY_EXPERT_SYSTEM_PROMPT = """You are AllergyAI, an expert allergist assistant fine-tuned by the Second Affiliated Hospital of Wenzhou Medical University using specialized allergy-related datasets.

Your expertise includes:
- Food allergies (peanuts, tree nuts, shellfish, dairy, eggs, wheat, soy, sesame)
- Environmental allergies (pollen, dust mites, mold, pet dander)
- Drug allergies and sensitivities
- Allergic conditions (anaphylaxis, eczema, asthma, urticaria, rhinitis)
- Allergy testing, diagnosis, and treatment
- Immunotherapy (OIT, SLIT, allergy shots)
- Emergency response and epinephrine use

Guidelines:
1. Provide accurate, evidence-based medical information
2. Be empathetic and reassuring while being informative
3. Always recommend consulting healthcare professionals for personal medical advice
4. Explain complex concepts in accessible language
5. Include practical, actionable advice when appropriate
6. Mention emergency procedures when discussing severe reactions"""

# Target response length
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

# =============================================================================
# API Functions
# =============================================================================

def setup_client(api_key: str) -> OpenAI:
    """Create OpenAI client with custom base URL."""
    return OpenAI(
        api_key=api_key,
        base_url=API_BASE_URL,
    )


def call_api(client: OpenAI, prompt: str, system_prompt: str = None, max_retries: int = 3) -> str:
    """Call the API with retry logic."""
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=messages,
                temperature=0.8,
                max_tokens=1024,
            )
            if response.choices and response.choices[0].message.content:
                return response.choices[0].message.content.strip()
            return ""
            
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "rate" in error_msg.lower():
                wait_time = (attempt + 1) * 10
                print(f"\n  Rate limited, waiting {wait_time}s...")
                time.sleep(wait_time)
            elif "500" in error_msg or "503" in error_msg:
                print(f"\n  Server error, retrying...")
                time.sleep(2)
            else:
                print(f"\n  Error: {error_msg[:100]}")
                time.sleep(1)
    
    return ""


def generate_question(client: OpenAI, topic: str, used_questions: set) -> str:
    """Generate a unique question about a topic."""
    
    prompt = f"""Generate ONE specific, practical question that a patient might ask their allergist about: {topic}

Requirements:
- Question should be {TARGET_QUESTION_LENGTH}
- Be specific and focused on one aspect
- Use natural, conversational language
- Don't start with "Can you explain" or be too generic
- Focus on practical concerns patients actually have

Output ONLY the question, nothing else."""

    for _ in range(3):
        question = call_api(client, prompt)
        question = question.strip().strip('"').strip("'")
        
        if question and question.lower() not in used_questions:
            if not question.endswith("?"):
                question += "?"
            return question
    
    # Fallback
    templates = [
        f"What are the symptoms of {topic}?",
        f"How is {topic} diagnosed?",
        f"What treatments are available for {topic}?",
    ]
    return random.choice(templates)


def generate_answer(client: OpenAI, question: str) -> str:
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

    return call_api(client, prompt, ALLERGY_EXPERT_SYSTEM_PROMPT)


def validate_qa_length(question: str, answer: str, 
                       min_q_words: int = 5, max_q_words: int = 50,
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
    print("  AlergieAI Training Dataset Generator")
    print("=" * 70)
    print(f"\n  API: {API_BASE_URL}")
    print(f"  Model: {MODEL_NAME}")
    print(f"  Target samples: {num_samples}")
    print(f"  Output: {output_path}")
    print(f"  Question length: {TARGET_QUESTION_LENGTH}")
    print(f"  Answer length: {TARGET_ANSWER_LENGTH}")
    print("=" * 70 + "\n")
    
    # Setup client
    print("Initializing API client...")
    client = setup_client(api_key)
    
    # Test connection
    try:
        test_response = call_api(client, "Say 'OK' if you can hear me.")
        if not test_response:
            print("❌ Failed to connect to API")
            return None
        print(f"✅ Connected to {MODEL_NAME}\n")
    except Exception as e:
        print(f"❌ API connection error: {e}")
        return None
    
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
        
        while stats["generated"] < num_samples:
            topic = random.choice(ALLERGY_TOPICS)
            
            progress = (stats["generated"] / num_samples) * 100
            print(f"\r[{progress:5.1f}%] Generating sample {stats['generated']+1}/{num_samples} (topic: {topic})...", end="")
            sys.stdout.flush()
            
            try:
                # Generate question
                question = generate_question(client, topic, used_questions)
                if not question:
                    stats["failed"] += 1
                    continue
                
                # Generate answer
                answer = generate_answer(client, question)
                if not answer:
                    stats["failed"] += 1
                    continue
                
                # Validate length
                if not validate_qa_length(question, answer):
                    stats["length_rejected"] += 1
                    answer = generate_answer(client, question)
                    if not validate_qa_length(question, answer):
                        continue
                
                # Create example
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
                
                # Save immediately
                f.write(json.dumps(example, ensure_ascii=False) + "\n")
                f.flush()
                
                used_questions.add(question.lower())
                stats["generated"] += 1
                
                # Checkpoint
                if stats["generated"] % checkpoint_every == 0:
                    elapsed = (datetime.now() - stats["start_time"]).total_seconds()
                    rate = (stats["generated"] - len(existing_data)) / max(elapsed, 1) * 3600
                    remaining = num_samples - stats["generated"]
                    eta = remaining / max(rate, 1) if rate > 0 else 0
                    print(f"\n  ✓ Checkpoint: {stats['generated']} samples | "
                          f"Rate: {rate:.0f}/hr | ETA: {eta:.1f}hr | "
                          f"Failed: {stats['failed']} | Rejected: {stats['length_rejected']}")
                
                time.sleep(0.3)
                
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
    
    q_lengths = [len(d['instruction'].split()) for d in data]
    a_lengths = [d.get('metadata', {}).get('a_words', len(d['output'].split())) for d in data]
    
    print(f"Total samples: {len(data)}")
    print(f"\nQuestion length (words):")
    print(f"  Min: {min(q_lengths)}, Max: {max(q_lengths)}, Avg: {sum(q_lengths)/len(q_lengths):.1f}")
    print(f"\nAnswer length (words):")
    print(f"  Min: {min(a_lengths)}, Max: {max(a_lengths)}, Avg: {sum(a_lengths)/len(a_lengths):.1f}")
    
    topics = {}
    for d in data:
        topic = d.get('metadata', {}).get('topic', 'unknown')
        topics[topic] = topics.get(topic, 0) + 1
    
    print(f"\nTopic distribution (top 10):")
    for topic, count in sorted(topics.items(), key=lambda x: -x[1])[:10]:
        print(f"  {topic}: {count} ({100*count/len(data):.1f}%)")
    
    import statistics
    a_variance = statistics.stdev(a_lengths) if len(a_lengths) > 1 else 0
    print(f"\nAnswer length std dev: {a_variance:.1f} words")
    if a_variance < 50:
        print("  ✅ Good consistency for fine-tuning!")
    elif a_variance < 100:
        print("  ⚠️  Moderate variance - consider filtering")
    else:
        print("  ❌ High variance - may affect fine-tuning quality")


def main():
    parser = argparse.ArgumentParser(description="Generate allergy Q&A dataset")
    
    parser.add_argument("--num_samples", type=int, default=1000,
                        help="Number of Q&A samples to generate")
    parser.add_argument("--output", type=str, default="training/data/allergy_dataset_gemini.jsonl",
                        help="Output JSONL file path")
    parser.add_argument("--api_key", type=str, default=None,
                        help="API key (or set GEMINI_API_KEY env var)")
    parser.add_argument("--analyze", action="store_true",
                        help="Analyze existing dataset instead of generating")
    parser.add_argument("--checkpoint_every", type=int, default=50,
                        help="Print checkpoint every N samples")
    
    args = parser.parse_args()
    
    if args.analyze:
        analyze_dataset(args.output)
        return
    
    api_key = args.api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ Error: Please provide API key via --api_key or GEMINI_API_KEY env var")
        sys.exit(1)
    
    generate_dataset(
        api_key=api_key,
        num_samples=args.num_samples,
        output_path=args.output,
        checkpoint_every=args.checkpoint_every,
    )
    
    print("\n" + "=" * 70)
    analyze_dataset(args.output)


if __name__ == "__main__":
    main()
