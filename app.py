# app.py

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Use the new OpenAI v1 client
from openai import OpenAI  

load_dotenv()

# Initialize Flask
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

@app.route('/generate_meal_plan', methods=['POST'])
def generate_meal_plan():
    data = request.get_json() or {}

    # Extract inputs
    calorie_target = data.get('calorie_target', 2000)
    restrictions   = ', '.join(data.get('dietary_restrictions', [])) or 'none'
    allergies      = ', '.join(data.get('allergies', [])) or 'none'
    cuisines       = ', '.join(data.get('favorite_cuisines', [])) or 'any'
    favorites      = ', '.join(data.get('favorite_foods', [])) or 'none'
    avoid          = ', '.join(data.get('avoid_foods', [])) or 'none'

    prompt = (
        f"You are a professional nutritionist. Generate a one-day meal plan with these criteria:\n"
        f"- Calorie target: {calorie_target} kcal/day\n"
        f"- Dietary restrictions: {restrictions}\n"
        f"- Allergies: {allergies}\n"
        f"- Favorite cuisines: {cuisines}\n"
        f"- Favorite foods: {favorites}\n"
        f"- Foods to avoid: {avoid}\n\n"
        "Format the output as follows:\n"
        "Meal Plan:\n"
        "Breakfast: [description + calories]\n"
        "Recipe: [ingredients + instructions]\n"
        "Morning Snack: …\n"
        "Recipe: …\n"
        "Lunch: …\n"
        "Recipe: …\n"
        "Afternoon Snack: …\n"
        "Recipe: …\n"
        "Dinner: …\n"
        "Recipe: …\n\n"
        "Summary: [how this meets the calorie target]\n\n"
        "Output only the plan in this format."
    )

    try:
        # NEW v1.0 call
        resp = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system",  "content": "You are a helpful meal-planning assistant."},
                {"role": "user",    "content": prompt}
            ],
            max_tokens=1200,
            temperature=0.7
        )
        meal_plan = resp.choices[0].message.content
        return jsonify({"meal_plan": meal_plan})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Serve static files (index.html, JS, CSS, images)
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
