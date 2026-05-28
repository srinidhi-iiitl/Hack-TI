import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date }
});

const smartGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domain: { type: String, enum: ['health', 'finance', 'career'], required: true },
  title: { type: String, required: true },
  description: { type: String },
  
  // S.M.A.R.T Tracking
  targetMetric: { type: Number, required: true }, // e.g., 10000 (for $10k savings) or 10 (for 10kg weight loss)
  currentMetric: { type: Number, default: 0 },
  unit: { type: String, required: true }, // e.g., 'USD', 'kg', 'courses'
  
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline: { type: Date, required: true },
  
  milestones: [milestoneSchema],
  
  status: { type: String, enum: ['active', 'completed', 'at-risk'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('SmartGoal', smartGoalSchema);