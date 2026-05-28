import UserGamification from '../models/UserGamification.js';
import ActivityLog from '../models/ActivityLog.js';
import BadgeDefinition from '../models/BadgeDefinition.js';
import LifeProfile from '../models/LifeProfile.js';
const XP_TABLE = {
  EXPENSE_LOGGED: { xp: 10, domain: 'finance' },
  BUDGET_MET: { xp: 30, domain: 'finance' },
  WORKOUT_LOGGED: { xp: 15, domain: 'health' },
  SLEEP_LOGGED: { xp: 10, domain: 'health' },
  COURSE_DONE: { xp: 20, domain: 'career' },
  FOCUS_SESSION_COMPLETED: { xp: 15, domain: 'career' },
  INCOME_LOGGED: { xp: 15, domain: 'finance' },
  DAILY_SYNC_COMPLETED: { xp: 50, domain: 'health' },
  AI_MEAL_LOGGED: { xp: 15, domain: 'health' },
  AI_RECEIPT_LOGGED: { xp: 15, domain: 'finance' },
  AI_MEDICAL_LOGGED: { xp: 20, domain: 'health' },
  VITALS_LOGGED: { xp: 15, domain: 'health' },
  MEDS_TAKEN: { xp: 20, domain: 'health' },
  GOAL_SET: { xp: 25, domain: 'career' },
  GOAL_MILESTONE_HIT: { xp: 50, domain: 'career' },
  
};

// Calculate level based on XP (Level 1: 0-99, Level 2: 100-249, Level 3: 250-499...)
function calculateLevel(totalXP) {
  if (totalXP < 100) return 1;
  if (totalXP < 250) return 2;
  if (totalXP < 500) return 3;
  if (totalXP < 900) return 4;
  return Math.floor((totalXP - 900) / 500) + 5;
}

// Check if dates are consecutive days
function isYesterday(lastDate, currentDate) {
  if (!lastDate) return false;
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return lastDate.toDateString() === yesterday.toDateString();
}

function isToday(lastDate, currentDate) {
  if (!lastDate) return false;
  return lastDate.toDateString() === currentDate.toDateString();
}

class GamificationEngine {
  static async logEvent(userId, eventName, metadata = {}) {
    try {
      const eventConfig = XP_TABLE[eventName];
      if (!eventConfig) return null;

      const { xp, domain } = eventConfig;
      const now = new Date();

      // 1. Ensure user gamification profile exists
      let gamification = await UserGamification.findOne({ userId });
      if (!gamification) {
        gamification = new UserGamification({ userId });
      }

      // 2. Append to ActivityLog
      await ActivityLog.create({
        userId,
        domain,
        event: eventName,
        xpAwarded: xp,
        metadata
      });

      // 3. Update XP and Level
      gamification.totalXP += xp;
      gamification.weeklyXP += xp;
      const newLevel = calculateLevel(gamification.totalXP);
      const levelUp = newLevel > gamification.level;
      gamification.level = newLevel;

      // 4. Update Streaks
      const currentDomainStreak = gamification.streaks[domain];
      if (!isToday(currentDomainStreak.lastActivity, now)) {
        if (isYesterday(currentDomainStreak.lastActivity, now)) {
          currentDomainStreak.current += 1;
        } else {
          currentDomainStreak.current = 1;
        }
        currentDomainStreak.lastActivity = now;
        if (currentDomainStreak.current > currentDomainStreak.best) {
          currentDomainStreak.best = currentDomainStreak.current;
        }
      }

      // 5. Evaluate Badges
      const newBadges = [];
      const userBadgeIds = gamification.badges.map(b => b.badgeId);
      const allDefinitions = await BadgeDefinition.find({ domain });

      for (const badgeDef of allDefinitions) {
        // Skip if user already has it
        if (userBadgeIds.includes(badgeDef.badgeId)) continue;

        let earned = false;
        
        // Evaluate Streak Condition
        if (badgeDef.condition.type === 'streak' && currentDomainStreak.current >= badgeDef.condition.targetValue) {
          earned = true;
        } 
        // Evaluate Event Count Condition
        else if (badgeDef.condition.type === 'event_count' && badgeDef.condition.event === eventName) {
          const count = await ActivityLog.countDocuments({ userId, event: eventName });
          if (count >= badgeDef.condition.targetValue) earned = true;
        }

        if (earned) {
          gamification.badges.push({ badgeId: badgeDef.badgeId });
          newBadges.push(badgeDef);
        }
      }

      await gamification.save();

      return {
        xpAwarded: xp,
        newTotalXP: gamification.totalXP,
        level: gamification.level,
        levelUp,
        domainStreak: currentDomainStreak.current,
        newBadges
      };

    } catch (error) {
      console.error('Gamification Engine Error:', error);
      return null;
    }
  }
}

export default GamificationEngine;