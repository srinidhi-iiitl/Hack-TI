import { GoogleGenerativeAI } from '@google/generative-ai';
import MealPlan from '../models/MealPlan.js';
import MealPlanProgress from '../models/MealPlanProgress.js';
import SmartGoal from '../models/SmartGoal.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: Get local today YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get local YYYY-MM-DD for any date
function formatDateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Calculate BMI
function calculateBmiDetails(weight, heightCm) {
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi: parseFloat(bmi.toFixed(1)), bmiCategory: category };
}

// Helper: Dynamically compute progress stats & streak for a plan
async function getMealPlanStats(plan, todayStr) {
  const progressLogs = await MealPlanProgress.find({ mealPlanId: plan._id }).lean();
  
  // Total completed tasks across history
  let totalCompletedTasks = 0;
  let perfectDaysCount = 0;
  
  progressLogs.forEach(log => {
    let completed = 0;
    if (log.breakfastCompleted) completed++;
    if (log.lunchCompleted) completed++;
    if (log.dinnerCompleted) completed++;
    if (log.waterCompleted) completed++;
    totalCompletedTasks += completed;
    if (completed === 4) perfectDaysCount++;
  });

  // Calculate elapsed days timezone-independently
  const startStr = plan.startDate instanceof Date 
    ? plan.startDate.toISOString().split('T')[0]
    : new Date(plan.startDate).toISOString().split('T')[0];
  const endStr = todayStr || getTodayString();

  const sDate = new Date(`${startStr}T00:00:00.000Z`);
  const tDate = new Date(`${endStr}T00:00:00.000Z`);
  const elapsedDays = Math.max(0, Math.floor((tDate - sDate) / (1000 * 60 * 60 * 24)));

  const activeDaysCount = Math.min(plan.duration, elapsedDays + 1);

  // Adherence: completed tasks / total tasks in active tracking days
  const adherence = activeDaysCount > 0 
    ? Math.round((totalCompletedTasks / (activeDaysCount * 4)) * 100) 
    : 0;

  // Timeline completion
  const timelineCompletion = Math.min(
    100,
    Math.round((elapsedDays / plan.duration) * 100)
  );
  const daysCompleted = elapsedDays;
  const daysRemaining = Math.max(0, plan.duration - elapsedDays);

  // Streak calculation (consecutive days with any checked tasks going back from today)
  let streak = 0;
  const logMap = new Map(progressLogs.map(log => [log.date, log]));
  
  let currentCheck = new Date(`${endStr}T00:00:00.000Z`);
  while (true) {
    const checkStr = currentCheck.toISOString().split('T')[0];
    const log = logMap.get(checkStr);
    
    // If we have progress checked for this day, increment streak
    if (log && (log.breakfastCompleted || log.lunchCompleted || log.dinnerCompleted || log.waterCompleted)) {
      streak++;
      currentCheck.setUTCDate(currentCheck.getUTCDate() - 1);
    } else {
      // If it's today and empty, check yesterday to continue streak. Otherwise break
      if (checkStr === endStr) {
        currentCheck.setUTCDate(currentCheck.getUTCDate() - 1);
        const yestStr = currentCheck.toISOString().split('T')[0];
        const yestLog = logMap.get(yestStr);
        if (yestLog && (yestLog.breakfastCompleted || yestLog.lunchCompleted || yestLog.dinnerCompleted || yestLog.waterCompleted)) {
          // Keep loop going starting from yesterday
          continue;
        }
      }
      break;
    }
  }

  return {
    adherence: Math.min(100, adherence),
    timelineCompletion: Math.min(100, timelineCompletion),
    daysCompleted,
    daysRemaining,
    streak,
    totalCompletedTasks
  };
}

// Generate fallback plan if Gemini fails
function getFallbackMealPlan(diet, category, conditionOrGoal) {
  return {
    breakfast: ['Oats Upma with mixed vegetables', '1 glass of warm lemon honey water'],
    morningSnack: ['A handful of almonds and walnuts', '1 seasonal fruit (e.g., Apple)'],
    lunch: ['2 Multigrain Rotis', '1 bowl of Tadka Dal', 'A serving of green vegetable salad', '1 cup curd'],
    eveningSnack: ['Roasted chana (chickpeas)', '1 cup of unsweetened Green Tea'],
    dinner: ['Moong Dal Khichdi (lightly oiled)', '1 bowl of steamed broccoli or stir-fry paneer'],
    waterIntake: '3L',
    dailyCalories: 1600,
    proteinTarget: '65g',
    foodsToAvoid: ['Sugar-sweetened beverages', 'Processed bakery foods', 'Deep-fried snacks', 'Excessive salt'],
    recommendations: ['Chew food slowly and practice mindful eating.', 'Maintain a consistent meal window every day.'],
    aiSummary: {
      designedFor: `${category} fallback plan (${conditionOrGoal.join(', ')})`,
      dietType: diet,
      keyFocus: ['Balanced nutrition', 'Hydration target', 'Portion control']
    }
  };
}

// ─────────────────────────────────────────────────────────────────
// @desc    Create a new AI Meal Plan
// @route   POST /api/meal-plans/create
// @access  Private
// ─────────────────────────────────────────────────────────────────
export const createMealPlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      category,
      conditionOrGoal,
      trimester,
      age,
      gender,
      heightCm,
      weight,
      activityLevel,
      dietaryPreference,
      allergies,
      duration,
      reportAnalysis,
      budget
    } = req.body;

    // Validate inputs
    if (!category || !conditionOrGoal || !age || !gender || !heightCm || !weight || !activityLevel || !dietaryPreference || !duration) {

      return res.status(400).json({ success: false, message: 'Please provide all required profile fields.' });
    }

    const todayStr = getTodayString();
    const todayDate = new Date(todayStr);

    // Active Plan Restriction Check
    const activePlan = await MealPlan.findOne({ userId, status: 'active' });
    if (activePlan) {
      const end = new Date(activePlan.endDate);
      if (todayDate > end) {
        // Automatically expire past active plan
        activePlan.status = 'expired';
        await activePlan.save();
      } else {
        return res.status(400).json({
          success: false,
          message: 'You already have an active meal plan. Please complete or delete the existing plan before creating a new one.'
        });
      }
    }

    // BMI Details
    const { bmi, bmiCategory } = calculateBmiDetails(weight, heightCm);

    // Setup dates

    const startDate = new Date(todayStr);
    const endDate = new Date(todayStr);
    endDate.setDate(endDate.getDate() + Number(duration) - 1);

    // Optional report analysis findings (structured, not raw report)
    const reportFindings = reportAnalysis || null;

    // Optional budget planning
    const budgetObj = budget || null;
    const budgetAmount = budgetObj?.amount ?? null;
    const budgetCategory = budgetObj?.category ?? null;

    // Prompt Gemini

    let mealPlanData;
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

    const prompt = `You are a health and wellness AI nutrition expert.
Generate a structured Indian meal plan based on the following user parameters:
Category: ${category}
Goal/Conditions: ${conditionOrGoal.join(', ')}
Trimester (if pregnancy): ${trimester || 'N/A'}
Age: ${age}
Gender: ${gender}
Height: ${heightCm}cm
Weight: ${weight}kg
BMI: ${bmi} (${bmiCategory})
Activity Level: ${activityLevel}
Dietary Preference: ${dietaryPreference}
Allergies: ${allergies || 'None'}

Meal Budget (INR/day):
- Amount: ${budgetAmount ?? 'Not provided'}
- Category: ${budgetCategory ?? 'Not provided'}


Optional Medical Report Insights (nutrition-only, AI-generated):
${reportFindings ? JSON.stringify(reportFindings) : 'null'}

Safety Rules (CRITICAL):
- Never recommend starvation diets, extreme calorie deficits, or unverified supplements.
- Never recommend medical treatments or medication changes.
- Ensure all meal recommendations are realistic, practical Indian dishes.
- Align daily calories and protein target to user BMI and goals.

Optional Medical Report Insights (nutrition-only, AI-generated):
${reportFindings ? `- Detected Conditions: ${reportFindings.conditions?.join(', ') || 'None'}
- HbA1c: ${reportFindings.hba1c ?? null}
- Fasting Sugar: ${reportFindings.fastingSugar ?? null}
- Cholesterol: ${JSON.stringify(reportFindings.cholesterol || {})}
- Blood Pressure: ${JSON.stringify(reportFindings.bloodPressure || {})}
- Vitamin D: ${reportFindings.vitaminD ?? null}
- Hemoglobin: ${reportFindings.hemoglobin ?? null}
- BMI Indicators: ${Array.isArray(reportFindings.bmiIndicators) ? reportFindings.bmiIndicators.join(', ') : '[]'}` : '- No report insights provided.'}

Nutrition Personalization Rules:
- Use the provided medical report metrics only to adjust food choices (e.g., low GI for glucose markers) and portioning.
- Use Meal Budget to choose ingredient quality and meal affordability:
  - Low budget: prioritize affordable staples (lentils, rice, chapati, seasonal vegetables), minimize expensive proteins, avoid costly specialty items.
  - Medium budget: balanced ingredients with some variety.
  - High budget: allow richer ingredients and more variety while still keeping portions reasonable.
- If health condition indicates specific diet needs (e.g., Diabetes, PCOS, Pregnancy), prioritize those nutrition rules in addition to budget.
- Do NOT diagnose or prescribe; only general diet guidance.


Return ONLY a valid JSON object matching this schema:
{
  "breakfast": ["e.g. 1 plate vegetable poha", "e.g. 1 glass low-fat milk"],
  "morningSnack": ["e.g. 1 apple"],
  "lunch": ["e.g. 2 rotis with dal and cucumber raita"],
  "eveningSnack": ["e.g. Roasted makhana"],
  "dinner": ["e.g. Paneer bhurji with roti"],
  "waterIntake": "e.g. 3.5L",
  "dailyCalories": 1800,
  "proteinTarget": "e.g. 85g",
  "foodsToAvoid": ["avoid high sugar", "avoid refined flour"],
  "recommendations": ["General healthy tips matching conditions"],
  "aiSummary": {
    "designedFor": "Brief description of targets e.g. Weight loss and diabetes management",
    "dietType": "${dietaryPreference}",
    "keyFocus": ["Key focus 1 e.g. Low glycemic index", "Key focus 2 e.g. Portion control"]
  }
}`;

      const response = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);

      const text = response.response.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      mealPlanData = JSON.parse(cleaned);
    } catch (geminiError) {
      console.warn('[MEAL PLAN] Gemini call failed, using fallback:', geminiError.message);
      mealPlanData = getFallbackMealPlan(dietaryPreference, category, conditionOrGoal);
    }

    const newPlan = await MealPlan.create({
      userId,
      category,

      conditionOrGoal,
      trimester,
      age,
      gender,
      heightCm,
      weight,
      bmi,
      bmiCategory,
      activityLevel,
      dietaryPreference,
      allergies,
      duration,
      startDate,
      endDate,
      mealPlan: mealPlanData,
      budget: { amount: budgetAmount, category: budgetCategory },
      status: 'active'
    });


    res.status(201).json({ success: true, data: newPlan });
  } catch (error) {
    console.error('Create Meal Plan Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// @desc    Get all meal plans for user (including dynamic progress)
// @route   GET /api/meal-plans
// @access  Private
// ─────────────────────────────────────────────────────────────────
export const getMealPlans = async (req, res) => {
  try {
    const userId = req.user.userId;
    const todayStr = getTodayString();
    const todayDate = new Date(todayStr);

    const plans = await MealPlan.find({ userId }).sort({ createdAt: -1 });

    const enrichedPlans = [];
    for (let plan of plans) {
      const stats = await getMealPlanStats(plan, todayStr);
      let planObj = plan.toObject();

      // Dynamic Auto-Expire check
      if (plan.status === 'active') {
        const end = new Date(plan.endDate);
        if (todayDate > end) {
          if (stats.totalCompletedTasks === plan.duration * 4) {
            plan.status = 'completed';
          } else {
            plan.status = 'expired';
          }
          await plan.save();
          planObj.status = plan.status;
        }
      }

      planObj.progress = stats.adherence; // Store calculated adherence as progress
      planObj.stats = stats;
      enrichedPlans.push(planObj);
    }

    res.status(200).json({ success: true, data: enrichedPlans });
  } catch (error) {
    console.error('Fetch Meal Plans Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// @desc    Get details of a single meal plan
// @route   GET /api/meal-plans/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────
export const getMealPlanById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const plan = await MealPlan.findOne({ _id: req.params.id, userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Meal plan not found.' });
    }

    const todayStr = getTodayString();
    const stats = await getMealPlanStats(plan, todayStr);
    const progressLogs = await MealPlanProgress.find({ mealPlanId: plan._id }).sort({ date: 1 });

    const planObj = plan.toObject();
    planObj.progress = stats.adherence;
    planObj.stats = stats;

    res.status(200).json({ success: true, data: planObj, progressLogs });
  } catch (error) {
    console.error('Fetch Meal Plan Details Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// @desc    Regenerate plan recipes (preserve logs, avoid current meals)
// @route   PUT /api/meal-plans/:id/regenerate
// @access  Private
// ─────────────────────────────────────────────────────────────────
export const regenerateMealPlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const plan = await MealPlan.findOne({ _id: req.params.id, userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Meal plan not found.' });
    }

    let mealPlanData;
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `You are a health and wellness AI nutrition expert.
Provide an alternative Indian meal plan based on the following parameters:
Category: ${plan.category}
Goal/Conditions: ${plan.conditionOrGoal.join(', ')}
Trimester: ${plan.trimester || 'N/A'}
Age: ${plan.age}
Gender: ${plan.gender}
Height: ${plan.heightCm}cm
Weight: ${plan.weight}kg
BMI: ${plan.bmi}
Activity Level: ${plan.activityLevel}
Dietary Preference: ${plan.dietaryPreference}
Allergies: ${plan.allergies || 'None'}

Current meals to avoid repeating (generate entirely alternative meals):
Breakfast: ${plan.mealPlan.breakfast.join(', ')}
Morning Snack: ${plan.mealPlan.morningSnack.join(', ')}
Lunch: ${plan.mealPlan.lunch.join(', ')}
Evening Snack: ${plan.mealPlan.eveningSnack.join(', ')}
Dinner: ${plan.mealPlan.dinner.join(', ')}

Safety Rules (CRITICAL):
- Never recommend starvation diets, extreme calorie deficits, or unverified supplements.
- Ensure all meal recommendations are realistic, practical Indian dishes.
- Align daily calories and protein target.

Return ONLY a valid JSON object matching this schema:
{
  "breakfast": ["alternative options"],
  "morningSnack": ["alternative options"],
  "lunch": ["alternative options"],
  "eveningSnack": ["alternative options"],
  "dinner": ["alternative options"],
  "waterIntake": "e.g. 3.5L",
  "dailyCalories": 1800,
  "proteinTarget": "e.g. 85g",
  "foodsToAvoid": ["avoid list"],
  "recommendations": ["tips list"],
  "aiSummary": {
    "designedFor": "targets description",
    "dietType": "${plan.dietaryPreference}",
    "keyFocus": ["focus list"]
  }
}`;

      const response = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);

      const text = response.response.text();
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      mealPlanData = JSON.parse(cleaned);
    } catch (geminiError) {
      console.warn('[MEAL PLAN] Regeneration failed, serving fallback:', geminiError.message);
      mealPlanData = getFallbackMealPlan(plan.dietaryPreference, plan.category, plan.conditionOrGoal);
    }

    plan.mealPlan = mealPlanData;
    await plan.save();

    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    console.error('Regenerate Meal Plan Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// @desc    Update progress log checklist for a plan
// @route   POST /api/meal-plans/:id/update-progress
// @access  Private
// ─────────────────────────────────────────────────────────────────
export const updateMealPlanProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, breakfastCompleted, lunchCompleted, dinnerCompleted, waterCompleted } = req.body;
    const planId = req.params.id;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    const plan = await MealPlan.findOne({ _id: planId, userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Meal plan not found.' });
    }

    // Today validation check (timezone-safe comparison)
    const startStr = plan.startDate instanceof Date 
      ? plan.startDate.toISOString().split('T')[0]
      : new Date(plan.startDate).toISOString().split('T')[0];
    
    // Allow up to today + 1 day in UTC to handle timezone differences robustly
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const maxDateStr = tomorrow.toISOString().split('T')[0];

    if (date < startStr || date > maxDateStr) {
      return res.status(400).json({ 
        success: false, 
        message: `Check-in date must be between plan start date (${startStr}) and today.` 
      });
    }

    // Calculate completion percentage for this single day
    let completed = 0;
    if (breakfastCompleted) completed++;
    if (lunchCompleted) completed++;
    if (dinnerCompleted) completed++;
    if (waterCompleted) completed++;
    const completionPercentage = Math.round((completed / 4) * 100);

    // Save/Update log
    const progress = await MealPlanProgress.findOneAndUpdate(
      { userId, mealPlanId: planId, date },
      {
        breakfastCompleted,
        lunchCompleted,
        dinnerCompleted,
        waterCompleted,
        completionPercentage
      },
      { upsert: true, new: true }
    );

    // Dynamically recalculate plan stats
    const todayStr = getTodayString();
    const stats = await getMealPlanStats(plan, todayStr);

    res.status(200).json({ success: true, data: progress, stats });
  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// @desc    Delete a meal plan
// @route   DELETE /api/meal-plans/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────
export const deleteMealPlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const plan = await MealPlan.findOneAndDelete({ _id: req.params.id, userId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Meal plan not found.' });
    }

    // Delete compliance history
    await MealPlanProgress.deleteMany({ mealPlanId: req.params.id, userId });

    res.status(200).json({ success: true, message: 'Meal plan deleted successfully.' });
  } catch (error) {
    console.error('Delete Meal Plan Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// @desc    AI Health Coach Advice
// @route   POST /api/meal-plans/coach-advice
// @access  Private
// ─────────────────────────────────────────────────────────────────
export const getCoachAdvice = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { weather } = req.body; // optional weather info: { temp, condition }
    const todayStr = getTodayString();

    const [plan, goals] = await Promise.all([
      MealPlan.findOne({ userId, status: 'active' }),
      SmartGoal.find({ userId, status: 'active' }).select('title domain').lean()
    ]);

    let stats = null;
    if (plan) {
      stats = await getMealPlanStats(plan, todayStr);
    }

    let adviceText = '';
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const goalsDesc = goals.length > 0 
        ? goals.map(g => `"${g.title}"`).join(', ')
        : 'General fitness';

      const weatherDesc = weather && weather.temp != null
        ? `Weather is currently ${weather.temp}°C outside (${weather.condition || 'Clear'})`
        : 'Weather context unavailable';

      const progressDesc = plan && stats
        ? `User is following a ${plan.category} meal plan (${plan.conditionOrGoal.join(', ')}) with ${stats.adherence}% adherence and is on streak day ${stats.streak}`
        : 'No active meal plan currently';

      const prompt = `You are a supportive, high-energy AI Health Coach. 
Briefly evaluate the user's situation:
- Active Goals: ${goalsDesc}
- Today's Weather: ${weatherDesc}
- Meal Plan Progress: ${progressDesc}

Safety Guidelines:
- Never recommend medicine or dosage changes.
- Never recommend starvation.
- Integrate goals, compliance history, and weather.

Write a friendly, motivational 2-3 sentence coaching tip. Suggest hydration adjustments if weather is extremely hot (e.g. >30°C). Return text only (no markdown code blocks, keep it conversational).`;

      const response = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 7000))
      ]);
      adviceText = response.response.text().trim();
    } catch (geminiError) {
      console.warn('[MEAL COACH] Gemini coach advice failed, using fallback:', geminiError.message);
      
      // Fallback advice depending on weather and plan
      if (weather && weather.temp >= 30) {
        adviceText = `It's hot outside (${weather.temp}°C)! Make sure to front-load your hydration and aim for an additional 500ml of water today. Keep your meals light and avoid deep-fried foods to stay active.`;
      } else {
        adviceText = `Keep up the consistency! Stay focused on your active goals and continue prioritizing balanced nutrition, healthy hydration, and good sleep today. You've got this!`;
      }
    }

    res.status(200).json({ success: true, advice: adviceText });
  } catch (error) {
    console.error('AI Coach Advice Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
