import OnboardingProfile from '../models/OnboardingProfile.js';

export async function recalculateScoresAfterUpload(userId, domain, data) {
  try {
    const profile = await OnboardingProfile.findOne({ userId }).sort({ updatedAt: -1 });
    if (!profile) return null;

    let healthDelta = 0;
    let financeDelta = 0;
    let careerDelta = 0;
    let burnoutDelta = 0;

    // ── 1. PRIMARY DOMAIN EFFECTS ──
    if (domain === 'finance') {
      const fin = data.financeData || {};
      const subType = data.subType;
      
      if (subType === 'bank' || subType === 'generic' || !subType) {
        const spent = fin.moneySpent || 0;
        const credited = fin.moneyCredited || 0;
        if (spent > credited && spent > 0) {
          financeDelta = -4;
          burnoutDelta = 2;
        } else if (credited > spent) {
          financeDelta = 5;
          burnoutDelta = -2;
        }

        // Detect outside food / dining out to trigger cross-domain penalties
        const txns = fin.transactions || [];
        const isOutsideFood = txns.some(t => {
          const cat = String(t.category || '').toLowerCase();
          return cat.includes('food') || cat.includes('dining') || cat.includes('restaurant') || cat.includes('grocery') || cat.includes('alcohol') || cat.includes('cafe') || cat.includes('starbucks');
        });
        if (isOutsideFood) {
          healthDelta -= 3;   // Outside food degrades physical health
          careerDelta -= 2;   // Heavy outside meals induce lethargy / lower focus
          burnoutDelta += 1;
        }
      } else if (subType === 'mutual_fund') {
        const returns = fin.returns || 0;
        if (returns > 0) {
          financeDelta = 6;
        } else if (returns < 0) {
          financeDelta = -3;
        }
      }
    } else if (domain === 'health') {
      const hl = data.healthData || {};
      
      if (hl.deficiencies && hl.deficiencies.length > 0) {
        healthDelta -= (hl.deficiencies.length * 3);
        burnoutDelta += (hl.deficiencies.length * 2);
      }
      if (hl.vitals) {
        const { systolic, diastolic, heartRate } = hl.vitals;
        let abnormalCount = 0;
        if (systolic && (systolic < 90 || systolic > 140)) abnormalCount++;
        if (diastolic && (diastolic < 60 || diastolic > 90)) abnormalCount++;
        if (heartRate && (heartRate < 50 || heartRate > 100)) abnormalCount++;
        
        if (abnormalCount > 0) {
          healthDelta -= (abnormalCount * 2);
        } else if (systolic || diastolic || heartRate) {
          healthDelta += 4; // all checked vitals normal
        }
      }
    } else if (domain === 'career') {
      const car = data.careerData || {};
      
      const completedCourses = car.completedCourses || 0;
      const githubCommits = car.githubCommits || 0;
      const projectsCompleted = car.projectsCompleted || 0;
      const studyHours = car.studyHours || 0;
 
      if (completedCourses > 0) {
        careerDelta += (completedCourses * 5);
        burnoutDelta -= 3;
      }
      if (githubCommits > 0) {
        careerDelta += 3;
        burnoutDelta -= 1;
      }
      if (projectsCompleted > 0) {
        careerDelta += 4;
        burnoutDelta -= 2;
      }
      if (studyHours > 0) {
        careerDelta += Math.min(studyHours * 2, 6);
      }
    }

    // ── 2. CROSS-DOMAIN SIDE EFFECTS ──
    const crossEffects = data.crossDomainEffects || {};

    // Apply Health Side-Effects (e.g. estimated calories consumed or workouts performed)
    if (crossEffects.health) {
      const hlEff = crossEffects.health;
      if (hlEff.caloriesConsumed > 0) {
        healthDelta -= 2; // Outside food calorie burden
        careerDelta -= 1; // Lethargy impact
        burnoutDelta += 1;
      }
      if (Array.isArray(hlEff.workouts) && hlEff.workouts.length > 0) {
        healthDelta += 4; // Exercise health boost
        burnoutDelta -= 2;
      }
    }

    // Apply Finance Side-Effects (e.g. gym subscription fees or course certificate costs)
    if (crossEffects.finance) {
      const finEff = crossEffects.finance;
      const spent = finEff.moneySpent || 0;
      if (spent > 0) {
        financeDelta -= 2; // Cost penalty
      }
    }

    // Apply Career Side-Effects (e.g. bootcamp bills contributing study hours or certifications)
    if (crossEffects.career) {
      const carEff = crossEffects.career;
      const studyHours = carEff.studyHours || 0;
      const completedCourses = carEff.completedCourses || 0;
      if (studyHours > 0) {
        careerDelta += Math.min(studyHours * 1.5, 4);
      }
      if (completedCourses > 0) {
        careerDelta += (completedCourses * 3);
      }
    }

    // ── 3. SAVE AND BALANCE PROFILE SCORES ──
    profile.financialHealth = Math.min(Math.max(Number(profile.financialHealth || 60) + financeDelta, 5), 98);
    profile.wellnessBalance = Math.min(Math.max(Number(profile.wellnessBalance || 60) + healthDelta, 15), 96);
    profile.productivityScore = Math.min(Math.max(Number(profile.productivityScore || 60) + careerDelta, 20), 98);
    profile.burnoutRisk = Math.min(Math.max(Number(profile.burnoutRisk || 35) + burnoutDelta, 0), 100);

    // Recalculate threshold states dynamically
    const severityMap = { healthy: 'low', warning: 'medium', critical: 'high' };
    const colorMap = { healthy: 'green', warning: 'orange', critical: 'red' };
    
    const buildThresholdState = ({ score, status, label }) => ({
      score, status, severity: severityMap[status], colorState: colorMap[status], label
    });

    const getSavingsStatus = (rate) => rate >= 20 ? 'healthy' : rate >= 10 ? 'warning' : 'critical';
    const savingsRate = profile.monthlyIncome > 0
      ? ((profile.monthlyIncome - profile.monthlyExpenditure) / profile.monthlyIncome) * 100
      : 0;

    profile.thresholdStates = {
      ...(profile.thresholdStates || {}),
      burnout: buildThresholdState({
        score: profile.burnoutRisk,
        status: profile.burnoutRisk > 65 ? 'critical' : profile.burnoutRisk >= 45 ? 'warning' : 'healthy',
        label: `${profile.burnoutRisk}% burnout risk`
      }),
      financial: buildThresholdState({
        score: profile.financialHealth,
        status: getSavingsStatus(savingsRate),
        label: `${profile.financialHealth}% financial health`
      }),
      wellness: buildThresholdState({
        score: profile.wellnessBalance,
        status: profile.wellnessBalance < 45 ? 'critical' : profile.wellnessBalance < 65 ? 'warning' : 'healthy',
        label: `${profile.wellnessBalance}% wellness balance`
      }),
      productivity: buildThresholdState({
        score: profile.productivityScore,
        status: profile.productivityScore < 45 ? 'critical' : profile.productivityScore < 65 ? 'warning' : 'healthy',
        label: `${profile.productivityScore}% productivity`
      })
    };

    profile.markModified('thresholdStates');

    await profile.save();
    return profile;
  } catch (error) {
    console.error('[ScoreRecalculationService] Recalculation failed:', error.message);
    return null;
  }
}
