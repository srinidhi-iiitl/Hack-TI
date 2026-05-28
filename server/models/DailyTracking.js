import mongoose from 'mongoose';

const dailyTrackingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateString: { type: String, required: true }, // Format: YYYY-MM-DD
  health: {
    caloriesConsumed: { type: Number, default: 0 },
    proteinConsumed: { type: Number, default: 0 },
    waterLiters: { type: Number, default: 0 },
    stressLevel: { type: Number, min: 1, max: 10, default: null },
    mood: { type: String, enum: ['excellent', 'good', 'neutral', 'bad', 'terrible'], default: null },
    sleepHours: { type: Number, default: 0 },
    medicationsTaken: [{
      name: { type: String },
      timeTaken: { type: Date, default: Date.now }
    }],
    workouts: [{
      type: { type: String },
      durationMinutes: { type: Number }
    }]
  },
  finance: {
    moneySpent: { type: Number, default: 0 },
    moneyCredited: { type: Number, default: 0 },
    transactions: [{
      amount: { type: Number },
      category: { type: String },
      type: { type: String, enum: ['income', 'expense'] },
      isImpulse: { type: Boolean, default: false } // Crucial for cross-domain AI logic
    }]
  }
}, { timestamps: true });

export default mongoose.model('DailyTracking', dailyTrackingSchema);