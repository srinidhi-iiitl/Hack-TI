import mongoose from 'mongoose';

const shareDetailsSchema = new mongoose.Schema(
  {
    stockName: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const insuranceDetailsSchema = new mongoose.Schema(
  {
    providerName: { type: String, trim: true, default: '' },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const dailyUpdateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    health: {
      waterIntake: { type: Number, default: 0 },
      exercised: { type: Boolean, default: false },
      sleepHours: { type: Number, default: 0 },
      ateProperly: { type: Boolean, default: false },
      healthConcern: { type: Boolean, default: false },
      concernTypes: [{ type: String, trim: true }],
      concernDescription: { type: String, trim: true, default: '' },
    },
    finance: {
      spending: { type: Number, default: 0 },
      boughtShares: { type: Boolean, default: false },
      boughtShareDetails: { type: shareDetailsSchema, default: () => ({}) },
      soldShares: { type: Boolean, default: false },
      soldShareDetails: { type: shareDetailsSchema, default: () => ({}) },
      insurancePurchased: { type: Boolean, default: false },
      insuranceDetails: { type: insuranceDetailsSchema, default: () => ({}) },
    },
    career: {
      studyHours: { type: Number, default: 0 },
      completedCourse: { type: Boolean, default: false },
      appliedJobs: { type: Boolean, default: false },
      workedOnProject: { type: Boolean, default: false },
    },
    goal: {
      goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartGoal', default: null },
      goalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SmartGoal' }],
      goalCompleted: { type: Boolean, default: false },
    },
    completed: { type: Boolean, default: true },
  },
  { timestamps: true },
);

dailyUpdateSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('DailyUpdate', dailyUpdateSchema);
