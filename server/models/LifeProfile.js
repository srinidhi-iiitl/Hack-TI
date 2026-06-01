import mongoose from 'mongoose';

const lifeProfileSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  // --- NUTRITION & MEDICAL ---
  healthContext: {
    weightGoal: { type: String, enum: ['lose', 'maintain', 'gain'], default: 'maintain' },
    medicalConditions: [{ type: String }], // e.g., 'diabetic', 'vitamin-d-deficiency'
    dailyCalorieTarget: { type: Number, default: 2000 },
    dailyWaterTargetLiters: { type: Number, default: 3.0 },
    macrosTarget: { 
      protein: { type: Number, default: 150 }, 
      carbs: { type: Number, default: 200 }, 
      fat: { type: Number, default: 65 } 
    }
  },
  // --- CYCLE TRACKING ---
  reproductiveHealth: {
    isTracking: { type: Boolean, default: false },
    lastPeriodDate: { type: Date },
    cycleLengthDays: { type: Number, default: 28 },
    nextExpectedDate: { type: Date }
  },
  pregnancy: {
    isTracking: { type: Boolean, default: false },
    dueDate: { type: Date },
    week: { type: Number, min: 0, max: 42, default: 0 },
    notes: { type: String, trim: true, default: '' }
  },
  // --- FINANCIAL RULES ---
  financeContext: {
    monthlyIncomeTarget: { type: Number, default: 0 },
    monthlySpendLimit: { type: Number, default: 0 },
    taxBracket: { type: String, default: 'Standard' }
  }
}, { timestamps: true });

export default mongoose.model('LifeProfile', lifeProfileSchema);
