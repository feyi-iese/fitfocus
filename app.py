from flask import Flask, request, jsonify
from flask_cors import CORS
from huggingface_hub import InferenceClient
import os
import gc
import traceback


app = Flask(__name__)
CORS(app)

# Set your Hugging Face API token as an environment variable (recommended)
HF_API_TOKEN = os.environ.get("HUGGINGFACE_HUB_TOKEN")

# Initialize the InferenceClient with your API token.
client = InferenceClient(provider="hf-inference", api_key=HF_API_TOKEN)

def build_prompt(details):
    """
    Builds the prompt string in the instruction format required by Mistral-7B-Instruct.
    """
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
    # Build the prompt from the input details
    prompt = build_prompt(details)
    print("Prompt:", prompt)
    
    # Wrap the prompt in a single message (chat format)
    messages = [{"role": "user", "content": prompt}]
    
    # Call the HF Inference API using the chat endpoint
    completion = client.chat.completions.create(
        model="mistralai/Mistral-7B-Instruct-v0.2",
        messages=messages,
        max_tokens=500
    )
    
    # Extract the generated text from the response (strip extra whitespace)
    generated_text = completion.choices[0].message
    
    # Force garbage collection to free memory
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
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
