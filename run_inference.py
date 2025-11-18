from vllm import LLM, SamplingParams

# 1. Define the prompt list
prompts = [
    "Hello, my name is",
    "The capital of France is",
    "The future of AI is",
]

# 2. Define sampling parameters (temperature, etc.)
sampling_params = SamplingParams(temperature=0.8, top_p=0.95)

# 3. Initialize the Engine
# We use a tiny model 'opt-125m' to test quickly.
llm = LLM(model="facebook/opt-125m")

# 4. Generate outputs
outputs = llm.generate(prompts, sampling_params)

# 5. Print the results
for output in outputs:
    prompt = output.prompt
    generated_text = output.outputs[0].text
    print(f"Prompt: {prompt!r}, Generated text: {generated_text!r}")