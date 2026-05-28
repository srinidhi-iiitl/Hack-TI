import { GoogleGenerativeAI } from '@google/generative-ai';
import DailyTracking from '../models/DailyTracking.js';
import LifeProfile from '../models/LifeProfile.js';
import SmartGoal from '../models/SmartGoal.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class CopilotOracleService {
  static async generateCrossDomainAdvice(userId, userQuestion) {
    try {
      const todayString = new Date().toISOString().split('T')[0];
      
      const [dailyLog, lifeProfile, activeGoals] = await Promise.all([
        DailyTracking.findOne({ userId, dateString: todayString }),
        LifeProfile.findOne({ userId }),
        SmartGoal.find({ userId, status: { $in: ['active', 'at-risk'] } })
      ]);

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const formattedGoals = activeGoals.map(g => 
        `[${g.domain.toUpperCase()}] ${g.title}: Aiming for ${g.targetMetric}${g.unit} by ${new Date(g.deadline).toDateString()}. Current progress: ${g.currentMetric}${g.unit}. Priority: ${g.priority}.`
      ).join('\n');

      const systemContext = `
        You are LifeTwin Copilot, an omniscient, predictive advisor. You analyze how a choice in one domain cascadingly impacts others.
        
        USER'S ACTIVE S.M.A.R.T GOALS:
        ${formattedGoals || 'No active goals set yet.'}

        USER METRIC PROFILE:
        - Health Target: ${lifeProfile?.healthContext?.dailyCalorieTarget || 2000} kcal/day. 
        - Finance Profile: Spent today: ₹${dailyLog?.finance?.moneySpent || 0}, Credited today: ₹${dailyLog?.finance?.moneyCredited || 0}
        - Current Stress Level recorded: ${dailyLog?.health?.stressLevel || 'Moderate'}
        
        CRITICAL RULES:
        1. Always align your advice with the user's active SMART Goals.
        2. You MUST return ONLY valid, raw JSON (no markdown formatting, no backticks).
        
        JSON STRUCTURE REQUIRED:
        {
          "verdict": "A punchy, 1-2 sentence final decision (e.g., 'Hold off on this purchase. Your stress is peaking and it jeopardizes your wedding goal.').",
          "riskLevel": "Low" | "Medium" | "High",
          "impacts": [
            { "domain": "Health" | "Finance" | "Career", "detail": "1 short sentence explaining the ripple effect." }
          ],
          "action": "One specific, immediate step the user should take right now."
        }
      `;

      const response = await model.generateContent([systemContext, userQuestion]);
      const responseText = response.response.text();
      
      // ✅ FIXED: Safely parsing and cleaning the AI's markdown backticks
      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return cleanedText; 

    } catch (error) {
      console.error('Oracle Engine Error:', error);
      return JSON.stringify({
        verdict: "My cognitive systems are cycling. Let's try that query again.",
        riskLevel: "High",
        impacts: [],
        action: "Please retry your request."
      });
    }
  }
}

export default CopilotOracleService;