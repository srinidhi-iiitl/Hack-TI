import cron from 'node-cron';
import LifeProfile from '../models/LifeProfile.js';
import DailyTracking from '../models/DailyTracking.js';

export const startCaretakerJobs = () => {
  // This cron expression ('0 0 * * *') means "Run exactly at Midnight every day"
  // Tip: If you want to test it right now, change it to '* * * * *' (Run every minute)
  cron.schedule('0 0 * * *', async () => {
    console.log('🤖 Caretaker AI: Initializing Midnight Diagnostics...');

    try {
      const profiles = await LifeProfile.find({});
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      for (let profile of profiles) {
        const userId = profile.userId;

        // --- 1. DAILY TRACKING INITIALIZATION ---
        // Ensure a fresh tracking sheet exists for the new day
        let dailyLog = await DailyTracking.findOne({ userId, dateString: todayString });
        if (!dailyLog) {
          await DailyTracking.create({ userId, dateString: todayString });
          console.log(`Created fresh daily log for user: ${userId}`);
        }

        // --- 2. REPRODUCTIVE HEALTH (PERIOD TRACKING) ---
        if (profile.reproductiveHealth && profile.reproductiveHealth.isTracking) {
          const nextPeriod = profile.reproductiveHealth.nextExpectedDate;
          
          if (nextPeriod) {
            const msInDay = 24 * 60 * 60 * 1000;
            const daysUntil = Math.round((nextPeriod.getTime() - today.getTime()) / msInDay);

            if (daysUntil === 5) {
              console.log(`🔔 NOTIFICATION TRIGGERED: User ${userId} is 5 days away from their cycle.`);
              /* NOTE: Here you would insert code to send an email, push notification, 
                or save an alert to an "Insights" database for the frontend Dashboard to read.
              */
            }

            // Auto-reset cycle if the expected date has passed by a few days
            if (daysUntil < -3) {
              const newExpectedDate = new Date(nextPeriod);
              newExpectedDate.setDate(newExpectedDate.getDate() + profile.reproductiveHealth.cycleLengthDays);
              profile.reproductiveHealth.lastPeriodDate = nextPeriod;
              profile.reproductiveHealth.nextExpectedDate = newExpectedDate;
              await profile.save();
              console.log(`Recalculated next cycle date for user: ${userId}`);
            }
          }
        }

        // --- 3. MEDICAL & DIET GUARDRAILS ---
        // Fetch yesterday's data to see how they did
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];
        
        const yesterdaysLog = await DailyTracking.findOne({ userId, dateString: yesterdayString });
        
        if (yesterdaysLog) {
          const caloriesHit = yesterdaysLog.health.caloriesConsumed;
          const calorieTarget = profile.healthContext.dailyCalorieTarget;
          
          // Example: Diabetic/Weight Guardrail Checks
          if (profile.healthContext.medicalConditions.includes('diabetic') && caloriesHit > calorieTarget + 300) {
             console.log(`⚠️ MEDICAL ALERT: User ${userId} exceeded glycemic safety bounds yesterday.`);
          }
        }
      }

      console.log('🤖 Caretaker AI: Diagnostics Complete. Sleeping until tomorrow.');
    } catch (error) {
      console.error('Caretaker Error:', error);
    }
  });
};