// ========== State ==========
let userName = '', 
    userEmail = '', 
    dob = '', 
    gender = '', 
    weight = 0, 
    weightUnit = 'kg';
let heightCm = 0, 
    heightFt = 0, 
    heightIn = 0, 
    heightUnit = 'ft';
let workouts = '', 
    fitnessGoal = '', 
    mealOpt = '';
let dietaryRestrictions = [], 
    allergies = [], 
    cuisines = [], 
    favoriteFoods = [], 
    avoidFoods = [];
let generatedMealPlan = '';

// ========== Navigation ==========
function goToStep(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ========== Onboarding Handlers ==========
function handleBasicInfo() {
  userName  = document.getElementById('userName').value.trim();
  userEmail = document.getElementById('userEmail').value.trim();
  const d = document.getElementById('birthDay').value,
        m = document.getElementById('birthMonth').value,
        y = document.getElementById('birthYear').value;
  dob = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  goToStep('step-2');
}

function selectOption(key, val, el) {
  // 1) Update the correct variable
  switch(key) {
    case 'gender':
      gender = val;
      break;
    case 'workouts':
      workouts = val;
      break;
    case 'fitnessGoal':
      fitnessGoal = val;
      break;
    case 'mealOpt':
      mealOpt = val;
      break;
    // add other single‑select keys here if needed
  }
  // 2) Highlight selection
  document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function handleGender() { 
  if (gender) goToStep('step-3'); 
}

function toggleUnit(u, btn) {
  weightUnit = u;
  document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function handleWeight() {
  weight = Number(document.getElementById('weightInput').value);
  goToStep('step-4');
}

function toggleHeightUnit(u, btn) {
  heightUnit = u;
  document.querySelectorAll('#step-4 .unit-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('heightCmInput').classList.toggle('hidden', u !== 'cm');
  document.getElementById('heightFtInput').classList.toggle('hidden', u !== 'ft');
}

function handleHeight() {
  if (heightUnit === 'cm') {
    heightCm = Number(document.getElementById('heightCm').value);
  } else {
    heightFt = Number(document.getElementById('heightFt').value);
    heightIn = Number(document.getElementById('heightIn').value);
  }
  goToStep('step-5');
}

function handleWorkouts() { 
  if (workouts) goToStep('step-6'); 
}

function handleFitnessGoal() { 
  if (fitnessGoal) goToStep('step-7'); 
}

function handleMealOpt() {
  if (mealOpt === 'yes') {
    return goToStep('step-8');
  }
  // Skip dietary steps
  initDashboard();
  goToStep('dashboard-screen');
}

// ========== Checkbox Helpers ==========
function toggleCheckbox(key, val, el) {
  let arr;
  switch(key) {
    case 'dietaryRestrictions':
      arr = dietaryRestrictions;
      break;
    case 'allergies':
      arr = allergies;
      break;
    case 'cuisines':
      arr = cuisines;
      break;
    case 'favoriteFoods':
      arr = favoriteFoods;
      break;
    case 'avoidFoods':
      arr = avoidFoods;
      break;
  }
  const idx = arr.indexOf(val);
  if (idx > -1) {
    arr.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    arr.push(val);
    el.classList.add('selected');
  }
}

async function submitDietary() {
    document.getElementById('loading-screen').classList.remove('hidden');
  
    const prefs = {
      calorie_target: Math.round(calculateCalorieNeeds()),
      dietary_restrictions: dietaryRestrictions,
      allergies,
      favorite_cuisines: cuisines,
      favorite_foods: favoriteFoods,
      avoid_foods: avoidFoods
    };
  
    try {
      const res  = await fetch('https://fitfocus-qqev.onrender.com/generate_meal_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs)
      });
      const data = await res.json();
      console.log("API response:", data);

      if (!res.ok || !data.meal_plan) {
        console.error('API Error:', data.error);
        alert("Error from server:\n" + (data.error || JSON.stringify(data)));
        return;
      }
  
      // only proceed if we have a meal_plan
      generatedMealPlan = data.meal_plan;
      goToStep('mealplan-screen');
      renderMealPlan();
  
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error: ' + err.message);
    } finally {
      document.getElementById('loading-screen').classList.add('hidden');
    }
  }
  
// ========== Meal‑Plan Rendering ==========
function renderMealPlan() {
    if (typeof generatedMealPlan !== 'string') {
      console.error('No meal plan to render:', generatedMealPlan);
      return;
    }
  
    const text   = generatedMealPlan.trim();
    const parsed = parseMealPlan(text);
    let html      = '';
    let totalCal  = 0;
  
    const displayOrder = [
      "Breakfast:",
      "Morning Snack:",
      "Lunch:",
      "Afternoon Snack:",
      "Dinner:"
    ];
  
    displayOrder.forEach(header => {
      const raw = parsed[header];
      if (!raw) return;
  
      // Split into description (with calories) and the recipe instructions
      const [descPart, recipePart = ''] = raw.split(/Recipe:/i).map(s => s.trim());
  
      // Extract calories from the description part only
      const match = descPart.match(/(\d+)\s?kcal/i);
      const cals  = match ? parseInt(match[1], 10) : 0;
      totalCal   += cals;
  
      html += `
        <div class="meal-card">
          <strong>${header.replace(":", "")}</strong>
          <p class="meal-desc">${descPart}</p>
          <span class="meal-cals">${cals} kcal</span>
          <details class="meal-recipe">
            <summary>Recipe</summary>
            <p>${recipePart}</p>
          </details>
        </div>
      `;
    });
  
    // Optionally show total calories
    html += `<div class="meal-total"><strong>Total:</strong> ${totalCal} kcal</div>`;
  
    document.getElementById('mealPlanContent').innerHTML = html;
  }
  
function parseMealPlan(text) {
    const sections = [
      "Breakfast:",
      "Morning Snack:",
      "Lunch:",
      "Afternoon Snack:",
      "Dinner:",
      "Summary:"
    ];
  
    const result = {};
    sections.forEach((sec, i) => {
      const start = text.indexOf(sec);
      if (start !== -1) {
        // find where the next section begins (or end of text)
        const nextStarts = sections
          .slice(i + 1)
          .map(s => text.indexOf(s, start + sec.length))
          .filter(idx => idx !== -1);
        const end = nextStarts.length ? Math.min(...nextStarts) : text.length;
        // slice out the content, trimming whitespace
        const body = text.slice(start + sec.length, end).trim();
        result[sec] = body;
      }
    });
  
    return result;
  }
  
// ========== Calorie Needs ==========
function calculateCalorieNeeds() {
  // Replace with your Mifflin‑St Jeor implementation
  return 2000;
}

// ========== Dashboard & Workouts ==========
function initDashboard() {
  document.getElementById('greeting').innerText = `Hello, ${userName}! Let's go.`;
  // initialize other dashboard elements here
}

function logWorkout() {
  document.getElementById('log-workout-screen').classList.remove('hidden');
}

function saveWorkout() {
  // increment & update UI
  document.getElementById('log-workout-screen').classList.add('hidden');
}

function cancelLog() {
  document.getElementById('log-workout-screen').classList.add('hidden');
}

function resetApp() {
  window.location.reload();
}

// ========== On‑load Setup ==========
window.addEventListener('DOMContentLoaded', () => {
  const d = document.getElementById('birthDay'),
        m = document.getElementById('birthMonth'),
        y = document.getElementById('birthYear'),
        months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for (let i = 1; i <= 31; i++) d.innerHTML += `<option>${i}</option>`;
  months.forEach((mo,i) => m.innerHTML += `<option value="${i+1}">${mo}</option>`);
  const cy = new Date().getFullYear();
  for (let i = 0; i < 80; i++) y.innerHTML += `<option>${cy - i}</option>`;
});
