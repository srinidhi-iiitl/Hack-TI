import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getGithubIntegration, getLeetcodeIntegration, postLinkedinIntegration } from '../controllers/integrationController.js';

const router = express.Router();

// Helper to simulate network delay
const simulateNetwork = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. HEALTH: Simulate Apple Health / Fitbit API
router.get('/health', authenticateToken, async (req, res) => {
  await simulateNetwork(1500); // 1.5s delay
  
  const mockHealthData = {
    source: 'Apple Health / Fitbit',
    lastSync: new Date().toISOString(),
    metrics: {
      // Existing metrics (Kept intact to prevent frontend crashes)
      steps: Math.floor(Math.random() * (12000 - 4000) + 4000),
      activeCalories: Math.floor(Math.random() * (900 - 300) + 300),
      sleepHours: (Math.random() * (8.5 - 4.5) + 4.5).toFixed(1),
      avgHeartRate: Math.floor(Math.random() * (85 - 60) + 60),
      
      // ✅ NEW: Smart Signals for deep Copilot physical burnout detection
      restingHeartRate: Math.floor(Math.random() * (75 - 55) + 55),
      hrv: Math.floor(Math.random() * (80 - 30) + 30) // Heart Rate Variability (Stress indicator)
    }
  };
  
  res.status(200).json({ success: true, data: mockHealthData });
});

// 2. FINANCE: Simulate Banking API / Credit Score
router.get('/finance', authenticateToken, async (req, res) => {
  await simulateNetwork(2000); // 2s delay
  
  const mockFinanceData = {
    source: 'Plaid Banking',
    lastSync: new Date().toISOString(),
    creditScore: Math.floor(Math.random() * (850 - 650) + 650),
    
    // ✅ NEW: Smart Signals for cross-domain budget analysis
    accountBalance: 4250.75,
    metrics: {
      monthlySavingsRate: "12%",
      unusualSpikeDetected: true, 
    },
    
    // Existing transactions + Timestamps added for AI correlation
    recentTransactions: [
      { id: 'txn_1', vendor: 'Starbucks', amount: 5.40, category: 'food', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'txn_2', vendor: 'Netflix', amount: 15.99, category: 'entertainment', timestamp: new Date(Date.now() - 172800000).toISOString() },
      { id: 'txn_3', vendor: 'Tech Corp Salary', amount: 2500.00, category: 'income', timestamp: new Date(Date.now() - 432000000).toISOString() },
      // Added an impulse expense to give the AI something to complain about!
      { id: 'txn_4', vendor: 'UberEats Delivery', amount: 45.50, category: 'food', timestamp: new Date(Date.now() - 4000000).toISOString() } 
    ]
  };

  res.status(200).json({ success: true, data: mockFinanceData });
});

// 3. CAREER: Simulate GitHub / Coursera API
router.get('/career', authenticateToken, async (req, res) => {
  await simulateNetwork(1200); // 1.2s delay
  
  const mockCareerData = {
    source: 'GitHub & LinkedIn Connect',
    lastSync: new Date().toISOString(),
    
    // Existing metrics
    githubCommitsThisWeek: Math.floor(Math.random() * (45 - 5) + 5),
    topLanguages: ['JavaScript', 'Python', 'C++'],
    recentCertificates: ['Advanced React Patterns', 'GenAI Prompt Engineering'],
    
    // ✅ NEW: Smart Signals for burnout and upskilling detection
    linkedInProfileStrength: 'All-Star',
    hoursInMeetingsToday: (Math.random() * (6 - 1) + 1).toFixed(1),
    learning: {
      courseraActiveCourse: 'Advanced Machine Learning',
      courseProgress: '65%'
    }
  };

  res.status(200).json({ success: true, data: mockCareerData });
});
// ==========================================
// ONBOARDING VERIFICATION ROUTES
// ==========================================

router.get('/github/:username(*)', authenticateToken, getGithubIntegration);
router.get('/leetcode/:username(*)', authenticateToken, getLeetcodeIntegration);
router.post('/linkedin', authenticateToken, postLinkedinIntegration);
export default router;
