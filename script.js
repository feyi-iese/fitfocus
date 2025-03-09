// Global state variables
let workoutsCompleted = 0;
let weeklyGoal = 0;        // target workouts per week from input
let userName = "";
let userWeight = 0;        // in kg
let userFitnessGoal = "";  // "gainMuscle", "loseWeight", "maintainWeight", "upperBody", "lowerBody", "flexibility", "mobility"
let mealPlanOptIn = true;  // true if user wants a meal plan
let generatedMealPlan = ""; // Global variable to store the generated meal plan

// ------------------------------
// Calorie Calculation Functions (using Mifflin-St Jeor equation)
// ------------------------------
function calculateCalorieNeeds(gender, weight, height, age, workoutsPerWeek, goal) {
  let bmr;
  if (gender.toLowerCase() === "male") {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
  let activityFactor;
  if (workoutsPerWeek === 0) activityFactor = 1.2;
  else if (workoutsPerWeek <= 2) activityFactor = 1.375;
  else if (workoutsPerWeek <= 4) activityFactor = 1.55;
  else if (workoutsPerWeek <= 6) activityFactor = 1.725;
  else activityFactor = 1.9;
  let tdee = bmr * activityFactor;
  let adjusted;
  if (goal.toLowerCase() === "loseweight") {
    adjusted = tdee - 400;
  } else if (goal.toLowerCase() === "gainmuscle") {
    adjusted = tdee + (gender.toLowerCase() === "male" ? 500 : 350);
  } else {
    adjusted = tdee;
  }
  return Math.round(adjusted);
}

// ------------------------------
// LLM Integration via Fetch
// ------------------------------
async function generateMealPlanFromAPI(userDetails) {
  try {
    const response = await fetch('https://fitfocus-qqev.onrender.com/generate_meal_plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userDetails)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.meal_plan;
  } catch (error) {
    console.error("Error fetching meal plan from API:", error);
    return "<em>Error generating meal plan. Please try again.</em>";
  }
}

// ------------------------------
// Navigation & Data Submission Functions
// ------------------------------
function goToDashboard() {
  try {
    const gender = document.getElementById("gender") ? document.getElementById("gender").value : "male";
    userName = document.getElementById("userName").value || "Friend";
    const age = Number(document.getElementById("userAge").value);
    userWeight = Number(document.getElementById("userWeight").value) || 0;
    const height = Number(document.getElementById("userHeight").value) || 170;
    weeklyGoal = Number(document.getElementById("workoutsGoal").value) || 0;
    userFitnessGoal = document.getElementById("fitnessGoal").value;
    const mealOption = document.querySelector('input[name="mealPlanOption"]:checked');
    mealPlanOptIn = mealOption && mealOption.value === "yes";
    
    const dailyCalorieNeed = calculateCalorieNeeds(gender, userWeight, height, age, weeklyGoal, userFitnessGoal);
    console.log("Daily Calorie Need:", dailyCalorieNeed);
    console.log("User Info:", { userName, age, userWeight, weeklyGoal, userFitnessGoal, mealPlanOptIn });
    
    document.getElementById("greeting").innerText = `Hello, ${userName}! Let's work towards your goals. Your daily calorie target is ${dailyCalorieNeed} kcal.`;
    document.getElementById("weeklyGoal").innerText = weeklyGoal;
    updateWorkoutCount();
    
    if (mealPlanOptIn) {
      document.getElementById("onboarding-screen").classList.remove("active");
      document.getElementById("dietary-screen").classList.add("active");
      document.getElementById("mealPlanSection").classList.add("active");
    } else {
      document.getElementById("onboarding-screen").classList.remove("active");
      document.getElementById("dashboard-screen").classList.add("active");
      document.getElementById("mealPlanSection").classList.remove("active");
    }
  } catch (error) {
    console.error("Error in goToDashboard:", error);
  }
}

function submitDietaryDetails() {
  // Show the loading screen
  document.getElementById("loading-screen").classList.remove("hidden");

  let dietaryRestrictions = Array.from(document.querySelectorAll("input[name='dietary_restriction']:checked")).map(el => el.value);
  let allergies = Array.from(document.querySelectorAll("input[name='allergy']:checked")).map(el => el.value);
  let favoriteCuisines = Array.from(document.querySelectorAll("input[name='cuisine']:checked")).map(el => el.value);
  let favoriteFoods = Array.from(document.querySelectorAll("input[name='favorite_food']:checked")).map(el => el.value);
  let avoidFoods = Array.from(document.querySelectorAll("input[name='avoid_food']:checked")).map(el => el.value);
  
  const dietaryPreferences = {
    calorie_target: calculateCalorieNeeds(
      document.getElementById("gender") ? document.getElementById("gender").value : "male",
      Number(document.getElementById("userWeight").value) || 0,
      Number(document.getElementById("userHeight").value) || 170,
      Number(document.getElementById("userAge").value),
      Number(document.getElementById("workoutsGoal").value) || 0,
      document.getElementById("fitnessGoal").value
    ),
    dietary_restrictions: dietaryRestrictions,
    allergies: allergies,
    favorite_cuisines: favoriteCuisines,
    favorite_foods: favoriteFoods,
    avoid_foods: avoidFoods
  };
  console.log("Dietary Preferences:", dietaryPreferences);
  
  generateMealPlanFromAPI(dietaryPreferences).then(rawMealPlan => {
    generatedMealPlan = rawMealPlan;
    localStorage.setItem("generatedMealPlan", rawMealPlan);
    // Style the raw meal plan by parsing it and wrapping sections in HTML.
    const styledPlan = styleMealPlan(rawMealPlan);
    document.getElementById("mealPlanContent").innerHTML = styledPlan;

    // Hide the loading screen once the API call is complete
    document.getElementById("loading-screen").classList.add("hidden");
    // Navigate to the meal plan screen
    document.getElementById("dietary-screen").classList.remove("active");
    document.getElementById("mealplan-screen").classList.add("active");
  }).catch(error => {
    console.error("Error fetching meal plan from API:", error);
    // Hide the loading screen if there's an error
    document.getElementById("loading-screen").classList.add("hidden");
  });
}

// ------------------------------
// Helper Functions to Style and Parse Meal Plan Output
// ------------------------------
function parseMealPlan(rawText) {
  // Define the sections you expect
  const sections = ["Breakfast:", "Snack 1:", "Lunch:", "Snack 2:", "Dinner:", "Summary:"];
  // Create a regex pattern to capture any of those headers
  const pattern = new RegExp(`(${sections.join("|")})`, "gi");
  
  // Split the text by the section headers, keeping the headers in the array
  let parts = rawText.split(pattern).filter(part => part.trim() !== "");
  
  let mealPlan = {};
  for (let i = 0; i < parts.length; i += 2) {
    let header = parts[i].trim();
    let content = parts[i + 1] ? parts[i + 1].trim() : "";
    mealPlan[header] = content;
  }
  return mealPlan;
}

function styleMealPlan(rawText) {
  const parsedPlan = parseMealPlan(rawText);  // your existing parse function
  let styledHTML = "";

  let totalCalories = 0;
  let summaryContent = "";

  // The order in which we want to display the sections
  const preferredOrder = ["Breakfast:", "Snack 1:", "Lunch:", "Snack 2:", "Dinner:", "Summary:"];

  preferredOrder.forEach(header => {
    if (parsedPlan[header]) {
      let content = parsedPlan[header];
      
      // Only parse and sum calories if NOT the summary section
      if (header.toLowerCase() !== "summary:") {
        // Use regex to find occurrences like "123 kcal"
        const calorieMatches = content.match(/(\d+)\s*kcal/g);
        if (calorieMatches) {
          calorieMatches.forEach(match => {
            // Extract digits and convert to integer
            const kcalValue = parseInt(match.replace(/[^\d]/g, ""), 10);
            totalCalories += kcalValue;
          });
        }
        console.log(totalCalories)
      }

      if (header.toLowerCase() === "summary:") {
        // We'll append summary at the end
        summaryContent = `<div class="meal-summary"><strong>${header}</strong> ${content}</div>`;
      } else {
        styledHTML += `<div class="meal-line"><strong>${header}</strong> ${content}</div>`;
      }
    }
  });

  // Append the summary section after everything else
  if (summaryContent) {
    styledHTML += summaryContent;
  }

  // Finally, append our computed total
  styledHTML += `<div class="meal-total"><strong>Calculated Total:</strong> ${totalCalories} kcal</div>`;

  return styledHTML;
}


// ------------------------------
// Other Utility Functions
// ------------------------------
function updateWorkoutCount() {
  document.getElementById("workoutsCompleted").innerText = workoutsCompleted;
}

function showMealPlan() {
  document.getElementById("dashboard-screen").classList.remove("active");
  document.getElementById("mealplan-screen").classList.add("active");
  if (generatedMealPlan) {
    document.getElementById("mealPlanContent").innerHTML = styleMealPlan(generatedMealPlan);
  } else {
    const savedPlan = localStorage.getItem("generatedMealPlan");
    if (savedPlan) {
      document.getElementById("mealPlanContent").innerHTML = styleMealPlan(savedPlan);
    } else {
      document.getElementById("mealPlanContent").innerHTML = "<em>No meal plan generated yet. Please submit your dietary preferences first.</em>";
    }
  }
}

function refreshMealPlan() {
  updateMealPlan();
}

function showFindClass() {
  document.getElementById("dashboard-screen").classList.remove("active");
  document.getElementById("find-class-screen").classList.add("active");
}

function showAccountability() {
  document.getElementById("dashboard-screen").classList.remove("active");
  document.getElementById("accountability-screen").classList.add("active");
  document.getElementById("myWorkouts").innerText = workoutsCompleted;
  if (workoutsCompleted < 1) {
    document.getElementById("slackingAlert").classList.remove("hidden");
  } else {
    document.getElementById("slackingAlert").classList.add("hidden");
  }
}

function logWorkout() {
  document.getElementById("log-workout-screen").classList.remove("hidden");
}

function saveWorkout() {
  const workoutType = document.getElementById("workoutType").value;
  const workoutDuration = document.getElementById("workoutDuration").value;
  workoutsCompleted++;
  updateWorkoutCount();
  updateMealPlan();
  document.getElementById("log-workout-screen").classList.add("hidden");
  document.getElementById("workoutType").value = "";
  document.getElementById("workoutDuration").value = "";
}

function cancelLog() {
  document.getElementById("log-workout-screen").classList.add("hidden");
}

function goBackToDashboard() {
  document.getElementById("find-class-screen").classList.remove("active");
  document.getElementById("accountability-screen").classList.remove("active");
  document.getElementById("mealplan-screen").classList.remove("active");
  document.getElementById("dashboard-screen").classList.add("active");
}

function resetApp() {
  workoutsCompleted = 0;
  userName = "";
  userWeight = 0;
  userFitnessGoal = "";
  weeklyGoal = 0;
  mealPlanOptIn = true;
  document.getElementById("workoutsCompleted").innerText = "0";
  document.getElementById("greeting").innerText = "";
  document.getElementById("slackingAlert").classList.add("hidden");
  
  document.getElementById("dashboard-screen").classList.remove("active");
  document.getElementById("onboarding-screen").classList.add("active");
}
