import mongoose from 'mongoose';

const mealPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: ['Health Issue', 'Fitness Goal', 'Pregnancy'], required: true },
  conditionOrGoal: [{ type: String, required: true }],
  trimester: { type: Number, enum: [1, 2, 3] }, // Optional, only for pregnancy category
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  heightCm: { type: Number, required: true },
  weight: { type: Number, required: true },
  bmi: { type: Number, required: true },
  bmiCategory: { type: String, required: true },
  activityLevel: { type: String, enum: ['Sedentary', 'Moderate', 'Active'], required: true },
  dietaryPreference: { type: String, enum: ['Vegetarian', 'Vegan', 'Eggitarian', 'Non-Vegetarian'], required: true },
  allergies: { type: String, default: '' },
  duration: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  mealPlan: {
    breakfast: [{ type: String }],

    morningSnack: [{ type: String }],
    lunch: [{ type: String }],
    eveningSnack: [{ type: String }],
    dinner: [{ type: String }],
    waterIntake: { type: String },
    dailyCalories: { type: Number },
    proteinTarget: { type: String },
    foodsToAvoid: [{ type: String }],
    recommendations: [{ type: String }],
    aiSummary: {
      designedFor: { type: String },
      dietType: { type: String },
      keyFocus: [{ type: String }]
    }
  },
  budget: {
    amount: { type: Number },
    category: { type: String },
  },
  reportAnalysis: {

    reportFileName: { type: String },
    detectedConditions: [{ type: String, default: undefined }],
    extractedMetrics: { type: Object },
    analyzedAt: { type: Date }
  },
  status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active' }
}, { timestamps: true });


export default mongoose.model('MealPlan', mealPlanSchema);
