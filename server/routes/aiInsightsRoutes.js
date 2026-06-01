import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import OnboardingProfile from '../models/OnboardingProfile.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const profile = await OnboardingProfile.findOne({ userId: req.user.userId }).sort({ updatedAt: -1 }).lean();
  res.status(200).json({
    success: true,
    data: {
      insights: profile?.aiInsights || [],
      recommendations: profile?.recommendations || [],
      correlationAnalysis: profile?.correlationAnalysis || {},
      source: profile?.aiSource || 'fallback',
    },
  });
});

export default router;
