import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateToken } from '../middleware/auth.js';
import DailyTracking from '../models/DailyTracking.js';
import LifeProfile from '../models/LifeProfile.js';
import OnboardingProfile from '../models/OnboardingProfile.js';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const round = (value, precision = 1) => Number((Number(value) || 0).toFixed(precision));

function buildCurrentValues({ onboarding, lifeProfile, dailyLog }) {
  const monthlyIncome = onboarding?.monthlyIncome || lifeProfile?.financeContext?.monthlyIncomeTarget || 0;
  const monthlyExpense = onboarding?.monthlyExpenditure || lifeProfile?.financeContext?.monthlySpendLimit || dailyLog?.finance?.moneySpent || 0;
  const savings = monthlyIncome > 0 ? Math.max(0, monthlyIncome - monthlyExpense) / 1000 : 5;
  const workouts = dailyLog?.health?.workouts?.length || onboarding?.exerciseFrequency || 2;

  return {
    sleep: round(dailyLog?.health?.sleepHours || onboarding?.sleepHours || 6),
    exercise: clamp(workouts, 0, 7),
    water: round(dailyLog?.health?.waterLiters || lifeProfile?.healthContext?.dailyWaterTargetLiters || 1),
    savings: round(savings, 0),
    investment: round(Math.max(2, savings * 0.35), 0),
    expenses: round((dailyLog?.finance?.moneySpent || monthlyExpense || 20000) / 1000, 0),
    study: round(onboarding?.studyHours || 1),
    projects: clamp(Math.round((onboarding?.careerMomentum || 25) / 25), 0, 8),
    networking: clamp(Math.round((onboarding?.professionalGrowthScore || 35) / 18), 0, 12),
  };
}

function buildRecommendedValues(current) {
  return {
    sleep: clamp(round(current.sleep + 2), 4, 10),
    exercise: clamp(current.exercise + 2, 0, 7),
    water: clamp(round(current.water + 1.5), 0.5, 5),
    savings: clamp(current.savings + 10, 0, 50),
    investment: clamp(current.investment + 6, 0, 40),
    expenses: clamp(current.expenses - 4, 5, 60),
    study: clamp(round(current.study + 2), 0, 8),
    projects: clamp(current.projects + 2, 0, 8),
    networking: clamp(current.networking + 3, 0, 12),
  };
}

function fallbackAnalysis(current, simulated) {
  const sleepGain = round(simulated.sleep - current.sleep);
  const savingsGain = round(simulated.savings - current.savings, 0);
  const studyGain = round(simulated.study - current.study);

  const healthFrom = clamp(Math.round(58 + current.sleep * 3 + current.exercise * 2 + current.water * 2), 45, 95);
  const financeFrom = clamp(Math.round(52 + current.savings * 1.4 + current.investment * 1.1 - current.expenses * 0.35), 40, 96);
  const careerFrom = clamp(Math.round(55 + current.study * 4 + current.projects * 3 + current.networking * 1.5), 42, 96);
  const healthTo = clamp(Math.round(healthFrom + sleepGain * 4 + (simulated.exercise - current.exercise) * 2 + (simulated.water - current.water) * 1.5), healthFrom, 99);
  const financeTo = clamp(Math.round(financeFrom + savingsGain * 0.8 + (simulated.investment - current.investment) * 1.3 - Math.min(0, simulated.expenses - current.expenses)), financeFrom, 99);
  const careerTo = clamp(Math.round(careerFrom + studyGain * 4 + (simulated.projects - current.projects) * 3 + (simulated.networking - current.networking) * 1.2), careerFrom, 99);
  const currentTwin = Math.round((healthFrom + financeFrom + careerFrom) / 3);
  const simulatedTwin = Math.round((healthTo + financeTo + careerTo) / 3);

  return {
    resultCards: [
      {
        title: 'Health What-If',
        label: 'Health',
        from: healthFrom,
        to: healthTo,
        signals: [
          { label: 'Energy', direction: 'up' },
          { label: 'Stress', direction: 'down' },
          { label: 'Recovery', direction: 'up' },
        ],
      },
      {
        title: 'Finance What-If',
        label: 'Finance',
        from: financeFrom,
        to: financeTo,
        signals: [
          { label: 'Savings', direction: 'up' },
          { label: 'Stability', direction: 'up' },
          { label: 'Financial Risk', direction: 'down' },
        ],
      },
      {
        title: 'Career What-If',
        label: 'Career',
        from: careerFrom,
        to: careerTo,
        signals: [
          { label: 'Productivity', direction: 'up' },
          { label: 'Skill Growth', direction: 'up' },
          { label: 'Interview Readiness', direction: 'up' },
        ],
      },
    ],
    impactChains: [
      {
        title: 'Recovery Loop',
        copy: `Adding ${sleepGain || 0}h of sleep improves recovery and protects deep work energy.`,
        steps: [`Sleep +${sleepGain || 0}h`, `Health +${Math.max(1, healthTo - healthFrom)}`, `Career +${Math.max(1, Math.round((careerTo - careerFrom) * 0.35))}`],
      },
      {
        title: 'Money Calm',
        copy: `Raising savings by Rs ${savingsGain || 0}k reduces financial pressure and frees focus.`,
        steps: [`Savings +Rs ${savingsGain || 0}k`, 'Stress -8', 'Focus +4', `Career +${Math.max(1, Math.round((careerTo - careerFrom) * 0.25))}`],
      },
      {
        title: 'Skill Flywheel',
        copy: `Extra study time compounds into stronger project momentum and income potential.`,
        steps: [`Study +${studyGain || 0}h`, `Career +${Math.max(1, careerTo - careerFrom)}`, 'Income Potential +6', `Finance +${Math.max(1, Math.round((financeTo - financeFrom) * 0.35))}`],
      },
    ],
    twinScore: {
      current: currentTwin,
      simulated: Math.max(currentTwin, simulatedTwin),
    },
    source: 'fallback',
  };
}

async function getUserSimulationContext(userId) {
  const today = new Date().toISOString().split('T')[0];
  const [onboarding, lifeProfile, dailyLog] = await Promise.all([
    OnboardingProfile.findOne({ userId }).sort({ updatedAt: -1 }).lean(),
    LifeProfile.findOne({ userId }).lean(),
    DailyTracking.findOne({ userId, dateString: today }).lean(),
  ]);

  return { onboarding, lifeProfile, dailyLog };
}

router.get('/current', authenticateToken, async (req, res) => {
  try {
    const context = await getUserSimulationContext(req.user.userId);
    const current = buildCurrentValues(context);

    res.status(200).json({
      success: true,
      data: {
        current,
        simulated: buildRecommendedValues(current),
        source: {
          hasOnboarding: Boolean(context.onboarding),
          hasLifeProfile: Boolean(context.lifeProfile),
          hasDailyLog: Boolean(context.dailyLog),
        },
      },
    });
  } catch (error) {
    console.error('Simulation current route error:', error);
    res.status(500).json({ success: false, message: 'Unable to load simulation inputs.' });
  }
});

router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { current, simulated } = req.body;
    if (!current || !simulated) {
      return res.status(400).json({ success: false, message: 'Current and simulated values are required.' });
    }

    const fallback = fallbackAnalysis(current, simulated);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({ success: true, data: fallback });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
You are Personal Digital Twin's simulation engine.
Analyze the user's current and simulated inputs in real time.
Return ONLY valid raw JSON. No markdown.

Use this exact JSON structure:
{
  "resultCards": [
    {
      "title": "Health What-If",
      "label": "Health",
      "from": 72,
      "to": 84,
      "signals": [
        { "label": "Energy", "direction": "up" },
        { "label": "Stress", "direction": "down" },
        { "label": "Recovery", "direction": "up" }
      ]
    }
  ],
  "impactChains": [
    {
      "title": "2-3 word title",
      "copy": "One short sentence explaining the cross-domain effect.",
      "steps": ["Input change", "Domain impact", "Second domain impact"]
    }
  ],
  "twinScore": { "current": 76, "simulated": 87 },
  "source": "ai"
}

Rules:
- Include exactly 3 resultCards: Health, Finance, Career.
- Include exactly 3 impactChains.
- Scores must be integers from 0 to 100.
- Keep labels short and UI friendly.

Current values:
${JSON.stringify(current)}

Simulated values:
${JSON.stringify(simulated)}
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      return res.status(200).json({ success: true, data: { ...fallback, ...parsed, source: 'ai' } });
    } catch (aiError) {
      console.warn('Simulation AI fallback activated:', aiError.message);
      return res.status(200).json({ success: true, data: fallback });
    }
  } catch (error) {
    console.error('Simulation analyze route error:', error);
    res.status(500).json({ success: false, message: 'Unable to run simulation analysis.' });
  }
});

router.post('/run', authenticateToken, async (req, res) => {
  try {
    const { current, simulated } = req.body;
    if (!current || !simulated) {
      return res.status(400).json({ success: false, message: 'Current and simulated values are required.' });
    }

    return res.status(200).json({ success: true, data: fallbackAnalysis(current, simulated) });
  } catch (error) {
    console.error('Simulation run route error:', error);
    return res.status(500).json({ success: false, message: 'Unable to run simulation analysis.' });
  }
});

export default router;
