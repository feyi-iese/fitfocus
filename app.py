from flask import Flask, request, jsonify
from flask_cors import CORS
from mlx_lm import load, generate
import mlx.core as mx
import os
import torch
import gc

app = Flask(__name__)
CORS(app)

# Configure MLX for M3 optimization
os.environ["MLX_ENABLE_LOW_PRECISION"] = "1"  # Enable Metal low-precision
os.environ["MLX_GPU_MEMORY_LIMIT"] = "32768"  # 32GB for M3 Max

# Load model - update path to your model location
model_path = "models/Mistral-7B-Instruct-v0.1-4bit-mlx"
model, tokenizer = load(model_path)

def build_prompt(details):
    return f"""<s>[INST] You are a professional nutritionist. Generate a one-day meal plan with these criteria. You must not exceed the calorie target:
- {details['calorie_target']} kcal
- Dietary: {', '.join(details['dietary_restrictions'])}
- Allergies: {', '.join(details['allergies'])}
- Cuisines: {', '.join(details['favorite_cuisines'])}
- Favorite foods: {', '.join(details['favorite_foods'])}
- Avoid: {', '.join(details['avoid_foods'])}

Format exactly:
Breakfast: [Food] | ~kcal
Snack 1: [Food] | ~kcal
Lunch: [Food] | ~kcal
Snack 2: [Food] | ~kcal
Dinner: [Food] | ~kcal
Summary: [Explanation] [/INST]"""

def generate_meal_plan_from_llm(details):
    prompt = build_prompt(details)
    print("Prompt:", prompt)
    
    # Generate response using MLX generate function without sampling parameters
    response = generate(
        model=model,
        tokenizer=tokenizer,
        prompt=prompt,
        max_tokens=512  # Use max_tokens instead of max_new_tokens if that's what MLX expects
    )
    
    # Split off the prompt if needed; here we assume the generated text comes after [/INST]
    generated_text = response.split("[/INST]")[-1].strip()
    
    # Clean up to free memory
    torch.cuda.empty_cache() if torch.cuda.is_available() else None
    gc.collect()
    
    return generated_text

@app.route('/generate_meal_plan', methods=['POST'])
def generate_meal_plan_endpoint():
    try:
        data = request.get_json()
        required_fields = [
            'calorie_target', 'dietary_restrictions', 'allergies',
            'favorite_cuisines', 'favorite_foods', 'avoid_foods'
        ]
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        meal_plan = generate_meal_plan_from_llm(data)
        return jsonify({"meal_plan": meal_plan})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
