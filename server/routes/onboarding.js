import express from 'express';
import { completeDailyGoals, getDashboardProfile, saveOnboardingProfile } from '../controllers/onboardingController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import OnboardingProfile from '../models/OnboardingProfile.js';

const router = express.Router();

router.post('/onboarding', authenticateToken, saveOnboardingProfile);
router.get('/onboarding', authenticateToken, asyncHandler(async (req, res) => {
  const profile = await OnboardingProfile.findOne({ userId: req.user.userId }).sort({ updatedAt: -1 });
  res.status(200).json({ success: true, data: profile, completed: Boolean(profile) });
}));
router.put('/onboarding', authenticateToken, saveOnboardingProfile);
router.get('/dashboard', authenticateToken, getDashboardProfile);
router.post('/daily-goals/complete', authenticateToken, completeDailyGoals);

export default router;
