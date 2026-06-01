import GamificationEngine from '../services/GamificationEngine.js';
import { getLatestOnboardingProfile } from '../services/domainDataService.js';

export const getCareer = async (req, res) => {
  const onboarding = await getLatestOnboardingProfile(req.user.userId);
  res.status(200).json({
    success: true,
    data: {
      studyHours: onboarding?.studyHours || 0,
      burnoutRisk: onboarding?.burnoutRisk || 0,
      productivityScore: onboarding?.productivityScore || 0,
      careerMomentum: onboarding?.careerMomentum || 0,
      insights: onboarding?.careerInsights || [],
    },
  });
};

export const createCareer = async (req, res) => {
  res.status(201).json({ success: true, data: req.body, message: 'Career entry accepted' });
};

export const updateCareer = async (req, res) => {
  res.status(200).json({ success: true, data: req.body, message: 'Career entry updated' });
};

export const getRoadmap = async (req, res) => {
  const onboarding = await getLatestOnboardingProfile(req.user.userId);
  res.status(200).json({
    success: true,
    data: [
      { title: 'Stabilize daily focus', status: onboarding?.studyHours >= 2 ? 'active' : 'recommended' },
      { title: 'Build two portfolio projects', status: 'recommended' },
      { title: 'Prepare interview loops', status: 'recommended' },
    ],
  });
};

export const getTrajectory = async (req, res) => {
  const onboarding = await getLatestOnboardingProfile(req.user.userId);
  res.status(200).json({
    success: true,
    data: [
      { label: 'Productivity', value: onboarding?.productivityScore || 0 },
      { label: 'Momentum', value: onboarding?.careerMomentum || 0 },
      { label: 'Growth', value: onboarding?.professionalGrowthScore || 0 },
    ],
  });
};

export const getBurnoutAnalysis = async (req, res) => {
  const onboarding = await getLatestOnboardingProfile(req.user.userId);
  res.status(200).json({
    success: true,
    data: {
      burnoutRisk: onboarding?.burnoutRisk || 0,
      recommendation: 'Protect recovery blocks and keep deep work sessions bounded.',
      source: 'fallback',
    },
  });
};

// @desc    Log a completed course/learning session
// @route   POST /api/career/course
export const logCourse = async (req, res) => {
  try {
    // ✅ FIXED: Using .userId
    const userId = req.user.userId; 
    const { courseName } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'COURSE_DONE', 
      { courseName }
    );

    res.status(201).json({
      success: true,
      message: 'Course completion logged!',
      gamification: gamificationResult 
    });
  } catch (error) {
    console.error('Career Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Log a deep work / focus session
// @route   POST /api/career/focus
export const logFocusSession = async (req, res) => {
  try {
    // ✅ FIXED: Using .userId
    const userId = req.user.userId; 
    const { durationMinutes } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'FOCUS_SESSION_COMPLETED', 
      { durationMinutes }
    );

    res.status(201).json({
      success: true,
      message: 'Focus session logged!',
      gamification: gamificationResult 
    });
  } catch (error) {
    console.error('Career Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
