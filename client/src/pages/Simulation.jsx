import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  ArrowRight,
  Brain,
  Briefcase,
  Check,
  ChevronDown,
  CircleDollarSign,
  HeartPulse,
  RefreshCw,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { useDashboardSync } from '../context/DashboardSyncContext';
import { fetchTodayDailyUpdate } from '../features/dailyUpdate/dailyUpdateThunks';
import { fetchCareerIntegrationStats } from '../utils/careerIntegrationStats';
import { useTheme } from '../context/ThemeContext';

const simulationGroups = [
  {
    key: 'health',
    title: 'Health Simulation',
    icon: HeartPulse,
    tint: 'from-[#10c7a1]/18 to-[#7df3cc]/8',
    borderColor: 'border-[#10c7a1]/30',
    textColor: 'text-[#10c7a1]',
    fields: [
      { key: 'sleep', label: 'Sleep', unit: 'h', current: 0, simulated: 8, min: 0, max: 10, step: 0.5 },
      { key: 'exercise', label: 'Exercise', unit: 'x', current: 0, simulated: 4, min: 0, max: 7, step: 1 },
      { key: 'water', label: 'Water', unit: 'L', current: 0, simulated: 3, min: 0, max: 5, step: 0.5 },
    ],
  },
  {
    key: 'finance',
    title: 'Finance Simulation',
    icon: CircleDollarSign,
    tint: 'from-[#c8a84b]/20 to-[#ff7a00]/8',
    borderColor: 'border-[#c8a84b]/30',
    textColor: 'text-[#c8a84b]',
    fields: [
      { key: 'savings', label: 'Savings', unit: 'k', prefix: 'Rs ', current: 0, simulated: 15, min: 0, max: 50, step: 1 },
      { key: 'investment', label: 'Investment', unit: 'k', prefix: 'Rs ', current: 0, simulated: 8, min: 0, max: 40, step: 1 },
      { key: 'expenses', label: 'Expenses', unit: 'k', prefix: 'Rs ', current: 0, simulated: 16, min: 0, max: 60, step: 1 },
    ],
  },
  {
    key: 'career',
    title: 'Career Simulation',
    icon: Briefcase,
    tint: 'from-[#7b61ff]/20 to-[#ff007f]/8',
    borderColor: 'border-[#7b61ff]/30',
    textColor: 'text-[#7b61ff]',
    fields: [
      { key: 'study', label: 'Study', unit: 'h', current: 0, simulated: 3, min: 0, max: 8, step: 0.5 },
      { key: 'projects', label: 'Projects', unit: '', current: 0, simulated: 3, min: 0, max: 8, step: 1 },
      { key: 'leetcodeProblems', label: 'LeetCode Problems', unit: '', current: 0, simulated: 400, min: 0, max: 1000, step: 10 },
    ],
  },
];

const groupAccents = {
  health: {
    border: {
      light: 'border-[#10c7a1]/30 bg-[#10c7a1]/5',
      dark: 'border-[#10c7a1]/25 bg-[#10c7a1]/10',
    },
    text: {
      light: 'text-[#0e9f80]',
      dark: 'text-[#7df3cc]',
    },
    slider: 'accent-[#10c7a1]',
  },
  finance: {
    border: {
      light: 'border-[#c8a84b]/30 bg-[#c8a84b]/5',
      dark: 'border-[#c8a84b]/25 bg-[#c8a84b]/10',
    },
    text: {
      light: 'text-[#a2822a]',
      dark: 'text-[#ffe08a]',
    },
    slider: 'accent-[#c8a84b]',
  },
  career: {
    border: {
      light: 'border-[#7b61ff]/30 bg-[#7b61ff]/5',
      dark: 'border-[#7b61ff]/25 bg-[#7b61ff]/10',
    },
    text: {
      light: 'text-[#5e3aff]',
      dark: 'text-[#d5c9ff]',
    },
    slider: 'accent-[#7b61ff]',
  },
};

const resultCards = [
  {
    title: 'Health What-If',
    label: 'Health',
    from: 72,
    to: 84,
    icon: HeartPulse,
    accent: 'text-[#10c7a1]',
    signals: [
      { label: 'Energy', direction: 'up' },
      { label: 'Stress', direction: 'down' },
      { label: 'Recovery', direction: 'up' },
    ],
  },
  {
    title: 'Finance What-If',
    label: 'Finance',
    from: 68,
    to: 79,
    icon: CircleDollarSign,
    accent: 'text-[#c8a84b]',
    signals: [
      { label: 'Savings', direction: 'up' },
      { label: 'Stability', direction: 'up' },
      { label: 'Financial Risk', direction: 'down' },
    ],
  },
  {
    title: 'Career What-If',
    label: 'Career',
    from: 70,
    to: 82,
    icon: Briefcase,
    accent: 'text-[#7b61ff]',
    signals: [
      { label: 'Productivity', direction: 'up' },
      { label: 'Skill Growth', direction: 'up' },
      { label: 'Interview Readiness', direction: 'up' },
    ],
  },
];

const impactChains = [
  {
    title: 'Recovery Loop',
    copy: 'More sleep raises recovery first, then pushes work stamina higher.',
    steps: [
      {
        label: 'Sleep +2h',
        explanation: 'Adding 2 extra hours of sleep improves recovery, energy levels, and mental focus.',
      },
      {
        label: 'Health +14',
        explanation: 'Better sleep increases overall health score through improved physical and mental well-being.',
      },
      {
        label: 'Career +4',
        explanation: 'Higher energy and concentration improve productivity and work performance.',
      },
    ],
  },
  {
    title: 'Money Calm',
    copy: 'Extra savings lowers background stress and frees up focus.',
    steps: [
      {
        label: 'Savings +Rs 447k',
        explanation: 'Building stronger savings creates a larger financial safety net.',
      },
      {
        label: 'Stress -8',
        explanation: 'Reduced financial pressure lowers stress levels.',
      },
      {
        label: 'Focus +4',
        explanation: 'Lower stress improves concentration and decision making.',
      },
      {
        label: 'Career +3',
        explanation: 'Better focus supports learning, productivity, and career growth.',
      },
    ],
  },
  {
    title: 'Skill Flywheel',
    copy: 'Study time compounds into career readiness and future income upside.',
    steps: [
      {
        label: 'Study +2h',
        explanation: 'Spending additional time learning builds skills and domain knowledge.',
      },
      {
        label: 'Career +10',
        explanation: 'Stronger skills increase career readiness and professional growth.',
      },
      {
        label: 'Income Potential +6',
        explanation: 'Improved qualifications create opportunities for better roles and higher salaries.',
      },
      {
        label: 'Finance +1',
        explanation: 'Higher earning potential contributes to long-term financial improvement.',
      },
    ],
  },
];

const processingSteps = ['Analyzing Digital Twin', 'Evaluating Health Impact', 'Evaluating Financial Impact', 'Evaluating Career Impact', 'Generating AI Insights'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const domainIcons = { Health: HeartPulse, Finance: CircleDollarSign, Career: Briefcase };
const domainAccents = { Health: 'text-[#10c7a1]', Finance: 'text-[#c8a84b]', Career: 'text-[#7b61ff]' };

const defaultAnalysis = {
  resultCards,
  impactChains,
  twinScore: { current: 76, simulated: 87 },
  source: 'demo',
};

function buildInitialValues(groups = simulationGroups) {
  return groups.reduce((values, group) => {
    group.fields.forEach((field) => {
      values[field.key] = field.simulated;
    });
    return values;
  }, {});
}

function buildCurrentValues(groups = simulationGroups) {
  return groups.reduce((values, group) => {
    group.fields.forEach((field) => {
      values[field.key] = field.current;
    });
    return values;
  }, {});
}

function formatValue(field, value) {
  return `${field.prefix || ''}${value}${field.unit || ''}`;
}

function sanitizeSimulationValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

function getDynamicSliderMax(field, currentValue, simulatedValue) {
  const step = Number(field.step) > 0 ? Number(field.step) : 1;
  const largest = Math.max(
    sanitizeSimulationValue(currentValue),
    sanitizeSimulationValue(simulatedValue),
    step,
  );
  const expanded = largest * 1.2;
  return Math.max(step, Math.ceil(expanded / step) * step);
}

function normalizeAnalysis(data) {
  const resultCardsWithChrome = (data?.resultCards?.length ? data.resultCards : resultCards).map((card) => ({
    ...card,
    icon: domainIcons[card.label] || Brain,
    accent: domainAccents[card.label] || 'text-[#7df3cc]',
  }));

  return {
    resultCards: resultCardsWithChrome,
    impactChains: normalizeImpactChains(data?.impactChains?.length ? data.impactChains : impactChains),
    twinScore: data?.twinScore || defaultAnalysis.twinScore,
    summary: data?.summary || '',
    simulationSummary: data?.simulationSummary || '',
    summaryHighlights: Array.isArray(data?.summaryHighlights) ? data.summaryHighlights : [],
    healthScoreCurrent: data?.healthScoreCurrent,
    healthScoreSimulated: data?.healthScoreSimulated,
    financeScoreCurrent: data?.financeScoreCurrent,
    financeScoreSimulated: data?.financeScoreSimulated,
    careerScoreCurrent: data?.careerScoreCurrent,
    careerScoreSimulated: data?.careerScoreSimulated,
    overallTwinCurrent: data?.overallTwinCurrent,
    overallTwinSimulated: data?.overallTwinSimulated,
    healthReasoning: data?.healthReasoning || '',
    financeReasoning: data?.financeReasoning || '',
    careerReasoning: data?.careerReasoning || '',
    overallReasoning: data?.overallReasoning || '',
    healthAnalysis: data?.healthAnalysis || '',
    financeAnalysis: data?.financeAnalysis || '',
    careerAnalysis: data?.careerAnalysis || '',
    overallTwinAnalysis: data?.overallTwinAnalysis || '',
    crossDomainAnalysis: Array.isArray(data?.crossDomainAnalysis) ? data.crossDomainAnalysis : [],
    timeline: data?.timeline && typeof data.timeline === 'object' ? data.timeline : null,
    tradeoffs: Array.isArray(data?.tradeoffs) ? data.tradeoffs : [],
    timelineForecast: Array.isArray(data?.timelineForecast) ? data.timelineForecast : [],
    tradeOffAnalysis: Array.isArray(data?.tradeOffAnalysis) ? data.tradeOffAnalysis : [],
    riskAssessment: data?.riskAssessment || [],
    keyDrivers: Array.isArray(data?.keyDrivers) ? data.keyDrivers : [],
    recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
    source: data?.source || 'fallback',
  };
}

function deriveDashboardScores(dashboardData) {
  const analytics = dashboardData?.analytics || {};
  const profile = dashboardData?.profile || {};
  const healthScore = firstScore(
    dashboardData?.healthScore,
    dashboardData?.scores?.health,
    dashboardData?.health?.score,
    analytics.healthScore,
    analytics.wellnessBalance != null || analytics.burnoutRisk != null
      ? Math.round((100 - firstFiniteNumber(analytics.burnoutRisk, profile.burnoutRisk)) * 0.35 + firstFiniteNumber(analytics.wellnessBalance, profile.wellnessBalance) * 0.65)
      : null,
  );
  const financeScore = firstScore(
    dashboardData?.financeScore,
    dashboardData?.scores?.finance,
    dashboardData?.finance?.score,
    analytics.financeScore,
    analytics.financialHealth,
    profile.financialHealth,
  );
  const careerScore = firstScore(
    dashboardData?.careerScore,
    dashboardData?.scores?.career,
    dashboardData?.career?.score,
    analytics.careerScore,
    analytics.productivityScore,
    profile.productivityScore,
  );

  return {
    Health: healthScore,
    Finance: financeScore,
    Career: careerScore,
  };
}

function firstScore(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return clampNumber(Math.round(number), 0, 100);
  }
  return null;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function averageScores(scores) {
  const numbers = scores.map(Number).filter(Number.isFinite);
  if (!numbers.length) return 0;
  return Math.round(numbers.reduce((sum, score) => sum + score, 0) / numbers.length);
}

function applySimulationResultLogic(analysis, dashboardScores, currentScenario = {}, simulatedScenario = {}, scenarioFields = []) {
  const changesByDomain = buildScenarioChanges(currentScenario, simulatedScenario, scenarioFields);
  const resultCardsWithCurrent = analysis.resultCards.map((card) => ({
    ...card,
    from: getCurrentDomainScore(card.label, dashboardScores, currentScenario),
  }));
  const resultCardsWithScores = resultCardsWithCurrent.map((card) => {
    const scoreDelta = calculateDomainScoreDelta(changesByDomain[domainKeyFromLabel(card.label)] || []);
    return {
      ...card,
      to: clampNumber(Math.round(Number(card.from) + scoreDelta), 0, 100),
    };
  });
  const resultCardsWithSignals = resultCardsWithScores.map((card) => ({
    ...card,
    analysis: getDomainAnalysis(analysis, card.label, changesByDomain[domainKeyFromLabel(card.label)] || []),
    signals: buildScoreSignals(card.label, Number(card.to) - Number(card.from)),
  }));
  const currentTwinScore = averageScores([
    dashboardScores.Health ?? resultCardsWithSignals.find((card) => card.label === 'Health')?.from,
    dashboardScores.Finance ?? resultCardsWithSignals.find((card) => card.label === 'Finance')?.from,
    dashboardScores.Career ?? resultCardsWithSignals.find((card) => card.label === 'Career')?.from,
  ]);
  const simulatedTwinScore = averageScores(resultCardsWithSignals.map((card) => card.to));

  const dynamicImpactChains = buildDynamicImpactChains(currentScenario, simulatedScenario, scenarioFields);
  const dynamicSummaryPoints = buildDynamicSummaryPoints(currentScenario, simulatedScenario, {
    current: currentTwinScore,
    simulated: simulatedTwinScore,
  }, scenarioFields);

  return {
    ...analysis,
    resultCards: resultCardsWithSignals,
    impactChains: analysis.source === 'ai'
      ? buildAiImpactChains(analysis, dynamicImpactChains)
      : dynamicImpactChains,
    summaryPoints: analysis.source === 'ai'
      ? buildAiSummaryPoints(analysis, dynamicSummaryPoints)
      : dynamicSummaryPoints,
    timelineForecast: analysis.timeline
      ? normalizeTimeline(analysis.timeline)
      : analysis.timelineForecast?.length
        ? normalizeTimelineForecast(analysis.timelineForecast)
      : buildTimelineForecast(changesByDomain),
    tradeOffAnalysis: analysis.tradeoffs?.length
      ? normalizeTradeOffAnalysis(analysis.tradeoffs)
      : analysis.tradeOffAnalysis?.length
        ? normalizeTradeOffAnalysis(analysis.tradeOffAnalysis)
      : buildTradeOffAnalysis(changesByDomain),
    riskAssessment: normalizeRiskAssessment(analysis.riskAssessment, changesByDomain),
    twinScore: {
      current: currentTwinScore,
      simulated: simulatedTwinScore,
    },
  };
}

function getCurrentDomainScore(label, dashboardScores, currentScenario = {}) {
  const dashboardScore = dashboardScores[label];
  if (Number.isFinite(Number(dashboardScore))) return clampNumber(Math.round(Number(dashboardScore)), 0, 100);
  return calculateCurrentScoreFromInputs(label, currentScenario);
}

function calculateCurrentScoreFromInputs(label, values = {}) {
  if (label === 'Health') {
    return clampNumber(Math.round(
      42
      + firstFiniteNumber(values.sleep) * 5
      + firstFiniteNumber(values.water) * 4
      + firstFiniteNumber(values.exercise) * 3,
    ), 0, 100);
  }

  if (label === 'Finance') {
    const savings = firstFiniteNumber(values.savings);
    const investment = firstFiniteNumber(values.investment);
    const expenses = firstFiniteNumber(values.expenses);
    return clampNumber(Math.round(
      52
      + Math.min(savings, 80) * 0.55
      + Math.min(investment, 80) * 0.35
      - Math.min(expenses, 80) * 0.25,
    ), 0, 100);
  }

  return clampNumber(Math.round(
    45
    + firstFiniteNumber(values.study) * 5
    + firstFiniteNumber(values.projects) * 4
    + firstFiniteNumber(values.leetcodeProblems) * 0.035,
  ), 0, 100);
}

function getDomainAnalysis(analysis, label, changes = []) {
  const aiByLabel = {
    Health: analysis.healthReasoning || analysis.healthAnalysis,
    Finance: analysis.financeReasoning || analysis.financeAnalysis,
    Career: analysis.careerReasoning || analysis.careerAnalysis,
  };
  if (aiByLabel[label]) return aiByLabel[label];
  return summarizeDomainChanges(label, changes);
}

function buildAiSummaryPoints(analysis, fallbackPoints) {
  const points = [
    ...analysis.summaryHighlights.map((point) => String(point)),
    analysis.simulationSummary,
    analysis.overallReasoning || analysis.overallTwinAnalysis || analysis.summary,
  ].filter(Boolean);
  return points.length ? compactSummaryPoints(points).slice(0, 4) : fallbackPoints;
}

function compactSummaryPoints(points = []) {
  return points.map((point) => {
    const text = String(point).replace(/\s+/g, ' ').trim();
    const [label, rest] = text.split(/:\s(.+)/);
    const sentence = (rest || label || text).split(/(?<=[.!?])\s+/)[0]?.trim() || text;
    const compact = sentence.length > 86 ? `${sentence.slice(0, 83).trim()}...` : sentence;
    return rest ? `${label}: ${compact}` : compact;
  });
}

function buildAiImpactChains(analysis, fallbackChains) {
  const chains = analysis.crossDomainAnalysis?.map((item, index) => {
    if (typeof item === 'string') {
      return {
        title: `AI Chain ${index + 1}`,
        copy: 'Status: Stable',
        steps: [{ label: 'AI Analysis', explanation: item }],
      };
    }

    return {
      title: item.title || `AI Chain ${index + 1}`,
      copy: `Status: ${normalizeStatus(item.status)}`,
      steps: normalizeHumanImpactSteps(item.steps, item.analysis || item.copy || item.explanation || ''),
    };
  }).filter((chain) => chain.copy || chain.steps.length);

  if (!chains?.length) return fallbackChains;
  return normalizeImpactChains(chains.slice(0, 3));
}

function normalizeStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'improved') return 'Improved';
  if (normalized === 'mixed impact') return 'Mixed Impact';
  if (normalized === 'high risk growth') return 'High Risk Growth';
  if (normalized === 'stable growth') return 'Stable Growth';
  if (normalized === 'declined' || normalized === 'reduced') return 'Reduced';
  if (normalized === 'stable') return 'Stable';
  return 'Stable';
}

function normalizeHumanImpactSteps(steps = [], analysis = '') {
  const normalized = Array.isArray(steps)
    ? steps.slice(0, 5).map((step) => (
      typeof step === 'object'
        ? { label: String(step.label || step.status || 'Impact'), explanation: String(step.explanation || '') }
        : { label: String(step), explanation: '' }
    ))
    : [];
  if (analysis) normalized.push({ label: 'AI Analysis', explanation: String(analysis) });
  return normalized.length ? normalized : [{ label: 'AI Analysis', explanation: String(analysis || 'No major cross-domain shift detected.') }];
}

function domainKeyFromLabel(label) {
  return String(label || '').toLowerCase();
}

function withGroupFields(groups = simulationGroups, customFields = []) {
  return groups.flatMap((group) => [
    ...group.fields.map((field) => ({ ...field, groupKey: group.key })),
    ...customFields.filter((field) => field.groupKey === group.key),
  ]);
}

function buildScenarioChanges(current = {}, simulated = {}, scenarioFields = []) {
  const fields = scenarioFields.length ? scenarioFields : withGroupFields(simulationGroups);
  return fields.reduce((changes, field) => {
    const currentValue = firstFiniteNumber(current[field.key], field.current);
    const simulatedValue = firstFiniteNumber(simulated[field.key], field.simulated);
    const delta = simulatedValue - currentValue;
    if (delta === 0) return changes;

    const groupKey = field.groupKey || inferDomainFromFieldKey(field.key);
    const change = {
      key: field.key,
      label: field.label,
      unit: field.unit || '',
      prefix: field.prefix || '',
      groupKey,
      currentValue,
      simulatedValue,
      delta,
      inverse: field.key === 'expenses',
      custom: field.custom || field.key?.startsWith('custom_'),
      scoreImpact: calculateMetricScoreImpact(field, groupKey, delta),
    };

    if (!changes[groupKey]) changes[groupKey] = [];
    changes[groupKey].push(change);
    return changes;
  }, { health: [], finance: [], career: [] });
}

function buildSimulationPayload({
  currentValues,
  simulatedValues,
  scenarioFields,
  dashboardScores,
  dashboardData,
  dailyUpdate,
  financeData,
}) {
  const changesByDomain = buildScenarioChanges(currentValues, simulatedValues, scenarioFields);
  const customInputs = scenarioFields
    .filter((field) => field.custom || field.key?.startsWith('custom_'))
    .map((field) => ({
      category: field.groupKey,
      name: field.label,
      current: firstFiniteNumber(currentValues[field.key], field.current),
      simulated: firstFiniteNumber(simulatedValues[field.key], field.simulated),
      unit: field.unit || '',
    }));

  return {
    currentState: {
      health: {
        score: dashboardScores.Health,
        sleep: firstFiniteNumber(currentValues.sleep),
        water: firstFiniteNumber(currentValues.water),
        exercise: firstFiniteNumber(currentValues.exercise),
        stress: firstFiniteNumber(dashboardData?.analytics?.burnoutRisk, dashboardData?.profile?.burnoutRisk),
        steps: firstFiniteNumber(dashboardData?.health?.steps, dashboardData?.healthData?.steps),
        heartRate: firstFiniteNumber(dashboardData?.health?.heartRate, dashboardData?.healthData?.heartRate),
      },
      finance: {
        score: dashboardScores.Finance,
        savings: firstFiniteNumber(currentValues.savings),
        investments: firstFiniteNumber(currentValues.investment),
        expenses: firstFiniteNumber(currentValues.expenses),
        income: firstFiniteNumber(financeData?.totalSalary, dashboardData?.profile?.monthlyIncome, dashboardData?.finance?.monthlyIncome),
      },
      career: {
        score: dashboardScores.Career,
        studyHours: firstFiniteNumber(currentValues.study),
        projects: firstFiniteNumber(currentValues.projects),
        leetcodeSolved: firstFiniteNumber(currentValues.leetcodeProblems),
        githubActivity: firstFiniteNumber(dashboardData?.career?.githubActivity, dashboardData?.careerData?.githubActivity, currentValues.projects),
        linkedInActivity: firstFiniteNumber(dashboardData?.career?.linkedInActivity, dashboardData?.careerData?.linkedInActivity),
      },
    },
    simulatedState: {
      health: {
        score: dashboardScores.Health,
        sleep: firstFiniteNumber(simulatedValues.sleep),
        water: firstFiniteNumber(simulatedValues.water),
        exercise: firstFiniteNumber(simulatedValues.exercise),
        stress: firstFiniteNumber(dashboardData?.analytics?.burnoutRisk, dashboardData?.profile?.burnoutRisk),
        steps: firstFiniteNumber(dashboardData?.health?.steps, dashboardData?.healthData?.steps),
        heartRate: firstFiniteNumber(dashboardData?.health?.heartRate, dashboardData?.healthData?.heartRate),
      },
      finance: {
        score: dashboardScores.Finance,
        savings: firstFiniteNumber(simulatedValues.savings),
        investments: firstFiniteNumber(simulatedValues.investment),
        expenses: firstFiniteNumber(simulatedValues.expenses),
        income: firstFiniteNumber(financeData?.totalSalary, dashboardData?.profile?.monthlyIncome, dashboardData?.finance?.monthlyIncome),
      },
      career: {
        score: dashboardScores.Career,
        studyHours: firstFiniteNumber(simulatedValues.study),
        projects: firstFiniteNumber(simulatedValues.projects),
        leetcodeSolved: firstFiniteNumber(simulatedValues.leetcodeProblems),
        githubActivity: firstFiniteNumber(dashboardData?.career?.githubActivity, dashboardData?.careerData?.githubActivity, simulatedValues.projects),
        linkedInActivity: firstFiniteNumber(dashboardData?.career?.linkedInActivity, dashboardData?.careerData?.linkedInActivity),
      },
    },
    customInputs,
    changedInputs: Object.values(changesByDomain).flat().map((change) => ({
      category: change.groupKey,
      name: change.label,
      current: change.currentValue,
      simulated: change.simulatedValue,
      difference: change.delta,
      unit: change.unit,
    })),
    goals: dailyUpdate?.activeGoals || dashboardData?.goals || dashboardData?.activeGoals || [],
    dailyUpdates: dailyUpdate?.todayUpdate || null,
    dashboardScores,
  };
}

function inferDomainFromFieldKey(key) {
  if (['sleep', 'exercise', 'water'].includes(key)) return 'health';
  if (['savings', 'investment', 'expenses'].includes(key)) return 'finance';
  return 'career';
}

function calculateMetricScoreImpact(field, groupKey, delta) {
  const weights = {
    sleep: 4,
    exercise: 3,
    water: 2,
    savings: 0.6,
    investment: 0.45,
    expenses: -0.5,
    study: 3,
    projects: 2,
    leetcodeProblems: 0.08,
  };
  if (weights[field.key] != null) return delta * weights[field.key];

  const normalizedDelta = groupKey === 'finance' && Math.abs(delta) >= 1000
    ? delta / 1000
    : delta;
  const customWeights = { health: 0.4, finance: 0.6, career: 0.6 };
  return normalizedDelta * (customWeights[groupKey] || 0.5);
}

function calculateDomainScoreDelta(changes = []) {
  const total = changes.reduce((sum, change) => sum + change.scoreImpact, 0);
  return clampNumber(total, -35, 35);
}

function buildScoreSignals(label, delta) {
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
  const labelsByDomain = {
    Health: ['Energy', 'Stress', 'Recovery'],
    Finance: ['Savings', 'Stability', 'Financial Risk'],
    Career: ['Productivity', 'Skill Growth', 'Interview Readiness'],
  };
  return (labelsByDomain[label] || []).map((signalLabel) => ({ label: signalLabel, direction }));
}

function pickDominantCause(causes) {
  const normalized = causes.map((cause) => {
    const delta = Number(cause.delta) || 0;
    const direction = cause.scoreImpact != null
      ? Math.sign(cause.scoreImpact)
      : delta === 0 ? 0 : (cause.inverse ? -Math.sign(delta) : Math.sign(delta));
    return {
      ...cause,
      delta,
      direction,
      magnitude: Math.abs(cause.scoreImpact ?? delta * (cause.weight || 1)),
    };
  });

  return normalized.reduce((best, cause) => (
    cause.magnitude > best.magnitude ? cause : best
  ), normalized[0] || { label: 'Input', delta: 0, unit: '', direction: 0, magnitude: 0 });
}

function scaleDirectionalImpact(cause, multiplier) {
  if (!cause?.direction || (!cause?.delta && !cause?.scoreImpact)) return 0;
  const base = cause.scoreImpact != null ? Math.abs(cause.scoreImpact) : Math.abs(cause.delta);
  const magnitude = Math.max(1, Math.round(base * multiplier));
  return cause.direction * magnitude;
}

function signedNumber(value) {
  const number = Math.round(Number(value) || 0);
  return number > 0 ? `+${number}` : `${number}`;
}

function signedMagnitude(value) {
  const number = Math.round(Number(value) || 0);
  return number > 0 ? `+${number}` : number < 0 ? `-${Math.abs(number)}` : '0';
}

function formatDelta(value, unit = '') {
  const number = roundValue(value);
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}${Math.abs(number)}${unit}`;
}

function formatChangeDelta(change) {
  const delta = roundValue(change.delta);
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const absolute = Math.abs(delta);
  if (change.groupKey === 'finance' && !change.unit && absolute >= 1000) {
    return `${sign}${roundValue(absolute / 1000, 0)}k`;
  }
  return `${sign}${change.prefix || ''}${absolute}${change.unit || ''}`;
}

function describeHealthCause(cause) {
  if (!cause?.delta) return `${cause.label} is unchanged, so this loop stays neutral.`;
  if (cause.direction > 0) return `${cause.label} improves the recovery baseline.`;
  return `${cause.label} weakens the recovery baseline.`;
}

function describeFinanceCause(cause) {
  if (!cause?.delta) return `${cause.label} is unchanged, so this loop stays neutral.`;
  if (cause.direction > 0) {
    return cause.inverse
      ? 'Lower expenses reduce financial pressure.'
      : `${cause.label} improves financial resilience.`;
  }
  return cause.inverse
    ? 'Higher expenses increase financial pressure.'
    : `${cause.label} weakens financial resilience.`;
}

function describeCareerCause(cause) {
  if (!cause?.delta) return `${cause.label} is unchanged, so this loop stays neutral.`;
  if (cause.direction > 0) {
    if (cause.key === 'leetcodeProblems') return 'Higher coding practice strengthens problem-solving momentum.';
    if (cause.key === 'projects') return 'More projects strengthen portfolio signal.';
    if (cause.custom) return `${cause.label} strengthens professional growth.`;
    return 'Additional study time strengthens skill growth.';
  }
  if (cause.key === 'leetcodeProblems') return 'Lower coding practice weakens problem-solving momentum.';
  if (cause.key === 'projects') return 'Fewer projects reduce portfolio signal.';
  if (cause.custom) return `${cause.label} weakens professional growth.`;
  return 'Reduced study time slows skill growth.';
}

function buildDynamicImpactChains(current = {}, simulated = {}, scenarioFields = []) {
  const sleepDelta = Number(simulated.sleep || 0) - Number(current.sleep || 0);
  const exerciseDelta = Number(simulated.exercise || 0) - Number(current.exercise || 0);
  const waterDelta = Number(simulated.water || 0) - Number(current.water || 0);
  const savingsDelta = Number(simulated.savings || 0) - Number(current.savings || 0);
  const investmentDelta = Number(simulated.investment || 0) - Number(current.investment || 0);
  const expenseDelta = Number(simulated.expenses || 0) - Number(current.expenses || 0);
  const studyDelta = Number(simulated.study || 0) - Number(current.study || 0);
  const projectDelta = Number(simulated.projects || 0) - Number(current.projects || 0);
  const leetcodeDelta = Number(simulated.leetcodeProblems || 0) - Number(current.leetcodeProblems || 0);
  const changesByDomain = buildScenarioChanges(current, simulated, scenarioFields);
  const healthCause = pickDominantCause(changesByDomain.health);
  const recoveryImpact = scaleDirectionalImpact(healthCause, 0.9);
  const focusFromHealth = scaleDirectionalImpact(healthCause, 2.6);
  const careerFromHealth = scaleDirectionalImpact(healthCause, 1.7);

  const financeCause = pickDominantCause(changesByDomain.finance);
  const financialStability = scaleDirectionalImpact(financeCause, 0.8);
  const financialStress = -scaleDirectionalImpact(financeCause, 0.45);
  const focusFromFinance = scaleDirectionalImpact(financeCause, 0.4);
  const finalFromFinance = scaleDirectionalImpact(financeCause, 0.3);
  const finalFinanceLabel = financeCause.key === 'expenses' ? 'Finance' : 'Career';

  const careerCause = pickDominantCause(changesByDomain.career);
  const primaryCareerEffectLabel = careerCause.key === 'projects'
    ? 'Portfolio Strength'
    : careerCause.key === 'leetcodeProblems'
      ? 'Problem Solving'
      : careerCause.custom
        ? 'Professional Growth'
        : 'Career';
  const primaryCareerEffect = scaleDirectionalImpact(careerCause, 0.8);
  const interviewReadiness = scaleDirectionalImpact(careerCause, 0.65);
  const incomePotential = scaleDirectionalImpact(careerCause, careerCause.key === 'projects' ? 1 : 1.7);
  const financeFromCareer = scaleDirectionalImpact(careerCause, 1);

  return [
    {
      title: 'Recovery Loop',
      copy: `Status: ${getDomainStatus(changesByDomain.health)}`,
      steps: [
        {
          label: 'AI Analysis',
          explanation: buildDomainCopy('Health', changesByDomain.health, recoveryImpact),
        },
      ],
    },
    {
      title: 'Money Impact',
      copy: `Status: ${getFinanceFallbackStatus(changesByDomain.finance)}`,
      steps: [
        {
          label: 'AI Analysis',
          explanation: buildDomainCopy('Finance', changesByDomain.finance, financialStability),
        },
      ],
    },
    {
      title: 'Career Momentum',
      copy: `Status: ${getDomainStatus(changesByDomain.career)}`,
      steps: [
        {
          label: 'AI Analysis',
          explanation: buildDomainCopy('Career', changesByDomain.career, primaryCareerEffect),
        },
      ],
    },
  ];
}

function getDomainStatus(changes = []) {
  const delta = calculateDomainScoreDelta(changes);
  if (delta > 0.5) return 'Improved';
  if (delta < -0.5) return 'Reduced';
  return 'Stable';
}

function getFinanceFallbackStatus(changes = []) {
  const byKey = Object.fromEntries(changes.map((change) => [change.key, change.delta]));
  if ((byKey.savings > 0 || byKey.investment > 0) && byKey.expenses > 0) return 'Mixed Impact';
  return getDomainStatus(changes);
}

function normalizeTimelineForecast(items = []) {
  return ['30 Day Outlook', '90 Day Outlook', '1 Year Outlook'].map((period, index) => {
    const item = items.find((entry) => entry.period === period) || items[index] || {};
    return {
      period,
      forecast: String(item.forecast || item.analysis || item.copy || 'Projection remains stable for this period.'),
    };
  });
}

function normalizeTimeline(timeline = {}) {
  return [
    { period: '30 Day Outlook', forecast: String(timeline.thirtyDays || 'The first month projection remains stable.') },
    { period: '90 Day Outlook', forecast: String(timeline.ninetyDays || 'The 90 day projection remains stable.') },
    { period: '1 Year Outlook', forecast: String(timeline.oneYear || 'The one year projection remains stable.') },
  ];
}

function buildTimelineForecast(changesByDomain = {}) {
  const statuses = {
    health: getDomainStatus(changesByDomain.health),
    finance: getDomainStatus(changesByDomain.finance),
    career: getDomainStatus(changesByDomain.career),
  };
  return [
    { period: '30 Day Outlook', forecast: `Early signals show health ${statuses.health.toLowerCase()}, finance ${statuses.finance.toLowerCase()}, and career ${statuses.career.toLowerCase()} as the scenario begins.` },
    { period: '90 Day Outlook', forecast: 'The most changed inputs start compounding into clearer habit, money, and productivity patterns.' },
    { period: '1 Year Outlook', forecast: 'The simulated direction becomes a stronger twin forecast if the new values are maintained consistently.' },
  ];
}

function normalizeTradeOffAnalysis(items = []) {
  return items.slice(0, 4).map((item) => ({
    benefit: String(item.benefit || 'Potential benefit'),
    risk: String(item.risk || 'Potential risk'),
    impact: String(item.impact || item.analysis || 'This trade-off should be monitored as the scenario develops.'),
  }));
}

function buildTradeOffAnalysis(changesByDomain = {}) {
  const changes = Object.values(changesByDomain).flat();
  const positive = changes.find((change) => change.scoreImpact > 0);
  const negative = changes.find((change) => change.scoreImpact < 0);
  if (positive && negative) {
    return [{
      benefit: `${positive.label} ${formatChangeDelta(positive)}`,
      risk: `${negative.label} ${formatChangeDelta(negative)}`,
      impact: 'The scenario improves one area while creating pressure in another, so the gain should be balanced against the risk.',
    }];
  }
  if (positive) {
    return [{
      benefit: `${positive.label} ${formatChangeDelta(positive)}`,
      risk: 'Consistency requirement',
      impact: 'The main upside depends on sustaining the simulated behavior long enough for the twin to register durable progress.',
    }];
  }
  return [{
    benefit: 'Stable baseline',
    risk: 'Limited upside',
    impact: 'With few positive changes, the scenario protects stability but may not create a meaningful future lift.',
  }];
}

function normalizeRiskAssessment(items = [], changesByDomain = {}) {
  if (!Array.isArray(items) && items && typeof items === 'object') {
    return [
      {
        domain: 'Health Risk',
        status: normalizeRiskStatus(items.health?.level),
        analysis: String(items.health?.reason || 'Health risk remains watchable based on the simulated values.'),
      },
      {
        domain: 'Finance Risk',
        status: normalizeRiskStatus(items.finance?.level),
        analysis: String(items.finance?.reason || 'Finance risk remains watchable based on the simulated values.'),
      },
      {
        domain: 'Career Risk',
        status: normalizeRiskStatus(items.career?.level),
        analysis: String(items.career?.reason || 'Career risk remains watchable based on the simulated values.'),
      },
      {
        domain: 'Overall Risk',
        status: normalizeRiskStatus(items.overall?.level),
        analysis: String(items.overall?.reason || 'Overall risk reflects the complete simulated scenario.'),
      },
    ];
  }
  if (!Array.isArray(items) || !items.length) return buildRiskAssessment(changesByDomain);
  const fallback = ['Health Risk', 'Finance Risk', 'Career Risk'];
  return fallback.map((domain, index) => {
    const item = items.find((entry) => entry.domain === domain) || items[index] || {};
    return {
      domain,
      status: normalizeRiskStatus(item.status),
      analysis: String(item.analysis || item.reason || 'Risk remains watchable based on the simulated values.'),
    };
  });
}

function buildRiskAssessment(changesByDomain = {}) {
  return [
    buildDomainRisk('Health Risk', changesByDomain.health),
    buildDomainRisk('Finance Risk', changesByDomain.finance),
    buildDomainRisk('Career Risk', changesByDomain.career),
    buildDomainRisk('Overall Risk', Object.values(changesByDomain).flat()),
  ];
}

function buildDomainRisk(domain, changes = []) {
  const scoreDelta = calculateDomainScoreDelta(changes);
  const status = scoreDelta < -8 ? 'High' : scoreDelta < 0 ? 'Medium' : 'Low';
  return {
    domain,
    status,
    analysis: buildRiskExplanation(domain, changes, status, scoreDelta),
  };
}

function buildRiskExplanation(domain, changes = [], status, scoreDelta) {
  const domainName = domain.replace(' Risk', '');
  const changed = [...changes].filter((change) => change.delta !== 0);
  const positive = changed
    .filter((change) => change.scoreImpact > 0)
    .sort((a, b) => b.scoreImpact - a.scoreImpact);
  const negative = changed
    .filter((change) => change.scoreImpact < 0)
    .sort((a, b) => a.scoreImpact - b.scoreImpact);
  const strongestPositive = positive[0];
  const strongestNegative = negative[0];
  const netCopy = `Net score impact ${signedMagnitude(scoreDelta)}.`;

  if (!changed.length) {
    return `${domainName} risk stays ${status.toLowerCase()} because no ${domainName.toLowerCase()} inputs changed. ${netCopy}`;
  }

  if (status === 'Low') {
    if (strongestPositive && strongestNegative) {
      return `${domainName} risk is low because ${strongestPositive.label} ${formatChangeDelta(strongestPositive)} offsets pressure from ${strongestNegative.label} ${formatChangeDelta(strongestNegative)}. ${netCopy}`;
    }
    if (strongestPositive) {
      return `${domainName} risk is low because ${strongestPositive.label} ${formatChangeDelta(strongestPositive)} improves the simulated scenario. ${netCopy}`;
    }
    return `${domainName} risk is low because the changed inputs do not create a negative score impact. ${netCopy}`;
  }

  if (status === 'Medium') {
    if (strongestPositive && strongestNegative) {
      return `${domainName} risk is medium because ${strongestNegative.label} ${formatChangeDelta(strongestNegative)} adds pressure, partly balanced by ${strongestPositive.label} ${formatChangeDelta(strongestPositive)}. ${netCopy}`;
    }
    return `${domainName} risk is medium because ${strongestNegative?.label || 'the simulated inputs'} ${strongestNegative ? formatChangeDelta(strongestNegative) : ''} weakens the scenario. ${netCopy}`;
  }

  if (strongestPositive && strongestNegative) {
    return `${domainName} risk is high because ${strongestNegative.label} ${formatChangeDelta(strongestNegative)} creates the largest downside, even after ${strongestPositive.label} ${formatChangeDelta(strongestPositive)}. ${netCopy}`;
  }

  return `${domainName} risk is high because ${strongestNegative?.label || 'the simulated inputs'} ${strongestNegative ? formatChangeDelta(strongestNegative) : ''} creates a strong negative score impact. ${netCopy}`;
}

function normalizeRiskStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'low') return 'Low';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'high') return 'High';
  return 'Medium';
}

function buildHealthCopy({ sleepDelta, exerciseDelta, waterDelta, healthImpact }) {
  const changes = [
    sleepDelta !== 0 && `sleep ${sleepDelta > 0 ? 'increases' : 'decreases'} by ${Math.abs(roundValue(sleepDelta))} hours`,
    exerciseDelta !== 0 && `exercise ${exerciseDelta > 0 ? 'increases' : 'decreases'} by ${Math.abs(Math.round(exerciseDelta))} sessions`,
    waterDelta !== 0 && `water intake ${waterDelta > 0 ? 'increases' : 'decreases'} by ${Math.abs(roundValue(waterDelta))}L`,
  ].filter(Boolean);
  if (!changes.length) return 'Health inputs remain unchanged, so recovery and fatigue risk stay stable.';
  return `${changes.join(', ')}. ${healthImpact > 0 ? 'Recovery improves and health score rises.' : healthImpact < 0 ? 'Recovery declines and health score drops.' : 'Health impact remains balanced.'}`;
}

function buildFinanceCopy({ savingsDelta, investmentDelta, expensesDelta, financeImpact }) {
  const changes = [
    savingsDelta !== 0 && `savings ${savingsDelta > 0 ? 'increase' : 'decrease'} by Rs ${Math.abs(Math.round(savingsDelta))}k`,
    investmentDelta !== 0 && `investments ${investmentDelta > 0 ? 'increase' : 'decrease'} by Rs ${Math.abs(Math.round(investmentDelta))}k`,
    expensesDelta !== 0 && `expenses ${expensesDelta > 0 ? 'increase' : 'decrease'} by Rs ${Math.abs(Math.round(expensesDelta))}k`,
  ].filter(Boolean);
  if (!changes.length) return 'Finance inputs remain unchanged, so stability and risk stay stable.';
  return `${changes.join(', ')}. ${financeImpact > 0 ? 'Financial stability improves and future stress falls.' : financeImpact < 0 ? 'Financial resilience weakens and financial risk rises.' : 'Finance impact remains balanced.'}`;
}

function buildCareerCopy({ studyDelta, projectsDelta, leetcodeDelta, careerImpact }) {
  const changes = [
    studyDelta !== 0 && `study ${studyDelta > 0 ? 'increases' : 'decreases'} by ${Math.abs(roundValue(studyDelta))} hours`,
    projectsDelta !== 0 && `projects ${projectsDelta > 0 ? 'increase' : 'decrease'} by ${Math.abs(Math.round(projectsDelta))}`,
    leetcodeDelta !== 0 && `LeetCode solved count ${leetcodeDelta > 0 ? 'increases' : 'decreases'} by ${Math.abs(Math.round(leetcodeDelta))}`,
  ].filter(Boolean);
  if (!changes.length) return 'Career inputs remain unchanged, so skill growth and interview readiness stay stable.';
  return `${changes.join(', ')}. ${careerImpact > 0 ? 'Career readiness improves and income potential rises.' : careerImpact < 0 ? 'Career momentum declines and income potential weakens.' : 'Career impact remains balanced.'}`;
}

function buildDomainCopy(domainLabel, changes = [], impact = 0) {
  if (!changes.length) return `${domainLabel} inputs remain unchanged, so this chain stays stable.`;
  const changedLabels = changes.map((change) => `${change.label} ${formatChangeDelta(change)}`);
  const direction = impact > 0 ? 'improves' : impact < 0 ? 'declines' : 'stays balanced';
  return `${changedLabels.join(', ')}. ${domainLabel} ${direction} through the combined scenario changes.`;
}

function describeSleepChange(delta) {
  if (delta > 0) return `Sleep increases by ${roundValue(delta)} hours, improving rest and recovery capacity.`;
  if (delta < 0) return `Sleep decreases by ${Math.abs(roundValue(delta))} hours, increasing fatigue risk.`;
  return 'Sleep is unchanged.';
}

function describeHealthImpact(impact, exerciseDelta, waterDelta) {
  if (impact > 0) return `Recovery improves from better rest${exerciseDelta > 0 ? ', more movement' : ''}${waterDelta > 0 ? ', and hydration' : ''}.`;
  if (impact < 0) return `Recovery declines because the health inputs move in a weaker direction.`;
  return 'Recovery stays stable because health gains and losses balance out.';
}

function buildDynamicSummaryPoints(current = {}, simulated = {}, twinScore = {}, scenarioFields = []) {
  const changesByDomain = buildScenarioChanges(current, simulated, scenarioFields);
  const points = [
    summarizeDomainChanges('Health', changesByDomain.health),
    summarizeDomainChanges('Finance', changesByDomain.finance),
    summarizeDomainChanges('Career', changesByDomain.career),
    summarizeOverallTwinScore(twinScore.current ?? 0, twinScore.simulated ?? 0),
  ];

  return points;
}

function summarizeDomainChanges(domainLabel, changes = []) {
  if (!changes.length) return `${domainLabel} remains stable because no ${domainLabel.toLowerCase()} inputs changed.`;
  const direction = calculateDomainScoreDelta(changes) >= 0 ? 'improves' : 'declines';
  return `${domainLabel} ${direction} through: ${changes.map((change) => `${change.label} ${formatChangeDelta(change)}`).join(', ')}.`;
}

function summarizeHealthChange({ sleepDelta, exerciseDelta, waterDelta }) {
  if (sleepDelta !== 0) return describeMetricDelta('Sleep', sleepDelta, ' hours', 'increasing recovery and overall health', 'reducing recovery and overall health');
  if (exerciseDelta !== 0) return describeMetricDelta('Exercise frequency', exerciseDelta, '', 'improving stamina and overall health', 'reducing activity support for overall health');
  if (waterDelta !== 0) return describeMetricDelta('Water intake', waterDelta, 'L', 'improving hydration and recovery', 'reducing hydration and recovery');
  return 'Health remains stable because sleep, exercise, and water changes balance out.';
}

function summarizeFinanceChange({ savingsDelta, investmentDelta, expensesDelta }) {
  if (savingsDelta !== 0) {
    return savingsDelta > 0
      ? `Increased savings improve financial stability by ${Math.abs(Math.round(savingsDelta))}k.`
      : `Reduced savings weaken financial stability by ${Math.abs(Math.round(savingsDelta))}k.`;
  }
  if (investmentDelta !== 0) {
    return investmentDelta > 0
      ? `Investments increase by ${Math.abs(Math.round(investmentDelta))}k, improving long-term growth.`
      : `Investments decrease by ${Math.abs(Math.round(investmentDelta))}k, reducing future growth potential.`;
  }
  if (expensesDelta !== 0) {
    return expensesDelta > 0
      ? `Expenses increase by ${Math.abs(Math.round(expensesDelta))}k, reducing financial efficiency.`
      : `Expenses decrease by ${Math.abs(Math.round(expensesDelta))}k, improving financial health.`;
  }
  return 'Finance remains stable because savings, investments, and expenses are balanced.';
}

function summarizeCareerChange({ studyDelta, projectsDelta, leetcodeDelta }) {
  if (studyDelta !== 0) {
    return studyDelta > 0
      ? `Study time increases by ${Math.abs(roundValue(studyDelta))} hours, accelerating skill growth.`
      : `Study time decreases by ${Math.abs(roundValue(studyDelta))} hours, slowing skill development.`;
  }
  if (projectsDelta !== 0) {
    return projectsDelta > 0
      ? `Project count increases by ${Math.abs(Math.round(projectsDelta))}, strengthening professional experience.`
      : `Project count decreases by ${Math.abs(Math.round(projectsDelta))}, reducing portfolio strength.`;
  }
  if (leetcodeDelta !== 0) {
    return leetcodeDelta > 0
      ? `Problem solving practice increases by ${Math.abs(Math.round(leetcodeDelta))}, improving interview readiness.`
      : `Problem solving activity decreases by ${Math.abs(Math.round(leetcodeDelta))}, reducing interview preparation momentum.`;
  }
  return 'Career remains stable because study, projects, and LeetCode practice are unchanged.';
}

function describeMetricDelta(label, delta, unit, positiveEffect, negativeEffect) {
  const amount = Math.abs(roundValue(delta));
  return delta > 0
    ? `${label} increases by ${amount}${unit}, ${positiveEffect}.`
    : `${label} decreases by ${amount}${unit}, ${negativeEffect}.`;
}

function summarizeOverallTwinScore(current, simulated) {
  const currentScore = Math.round(Number(current) || 0);
  const simulatedScore = Math.round(Number(simulated) || 0);
  if (simulatedScore > currentScore) return `Overall Twin Score improves from ${currentScore} to ${simulatedScore}.`;
  if (simulatedScore < currentScore) return `Overall Twin Score declines from ${currentScore} to ${simulatedScore}.`;
  return `Overall Twin Score remains stable at ${currentScore}.`;
}

function normalizeImpactChains(chains = []) {
  return chains.map((chain) => {
    const fallback = impactChains.find((item) => item.title === chain.title);
    return {
      ...chain,
      copy: chain.copy || fallback?.copy || '',
      steps: (chain.steps || fallback?.steps || []).map((step, index) => {
        if (typeof step === 'object' && step.label) {
          return { ...step, label: normalizeImpactLabel(step.label) };
        }
        return {
          label: normalizeImpactLabel(String(step)),
          explanation: fallback?.steps?.[index]?.explanation || '',
        };
      }),
    };
  });
}

function normalizeImpactLabel(label) {
  return String(label).replace(/Savings \+Rs\s*-/i, 'Savings +Rs ');
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function roundValue(value, decimals = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const factor = 10 ** decimals;
  return Math.round(number * factor) / factor;
}

function moneyToK(value) {
  return Math.max(0, roundValue(firstFiniteNumber(value) / 1000, 1));
}

function readStoredOnboardingProfile() {
  try {
    const stored = localStorage.getItem('lifetwinOnboardingProfile');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function deriveSimulationCurrentValues({ dashboardData, dailyUpdate, healthIntegration, githubStats, leetcodeStats, financeData }) {
  const storedProfile = readStoredOnboardingProfile();
  const profile = dashboardData?.profile || {};
  const lifestyle = storedProfile?.lifestyle || {};
  const financialPatterns = storedProfile?.financialPatterns || {};
  const daily = dailyUpdate || {};
  const dailyHealth = daily.health || {};
  const dailyFinance = daily.finance || {};
  const dailyCareer = daily.career || {};
  const healthDevice = healthIntegration?.deviceData || {};

  const income = firstFiniteNumber(
    financeData?.totalSalary,
    profile.monthlyIncome,
    financialPatterns.monthlyIncome,
    dashboardData?.finance?.monthlyIncome,
  );
  const expensesRaw = firstFiniteNumber(
    financeData?.monthlyExpenses,
    dashboardData?.finance?.monthlyExpenses,
    dashboardData?.financeData?.monthlyExpenses,
    dailyFinance.moneySpent,
    profile.monthlyExpenditure,
    financialPatterns.monthlyExpenditure,
    dashboardData?.finance?.monthlyExpenditure,
  );
  const investmentRaw = firstFiniteNumber(
    financeData?.portfolioValue,
    dailyFinance.portfolioValue,
    dailyFinance.investments,
    dashboardData?.finance?.portfolioValue,
    dashboardData?.financeData?.portfolioValue,
    profile.portfolioValue,
  );
  const projects = firstFiniteNumber(
    githubStats?.repositories,
    dailyCareer.projectsCompleted,
    dashboardData?.career?.projectsCompleted,
    dashboardData?.careerData?.projectsCompleted,
    profile.projectsCompleted,
  );

  return {
    sleep: roundValue(firstFiniteNumber(
      healthDevice.sleepHours,
      dailyHealth.sleepHours,
      profile.sleepHours,
      lifestyle.sleepHours,
    )),
    exercise: roundValue(firstFiniteNumber(
      dailyHealth.workouts?.length,
      profile.exerciseFrequency,
      lifestyle.exerciseFrequency,
    ), 0),
    water: roundValue(firstFiniteNumber(
      dailyHealth.waterLiters,
      dailyHealth.waterIntake,
      profile.waterLiters,
      profile.waterIntake,
      dashboardData?.health?.waterLiters,
    )),
    savings: moneyToK(Math.max(0, income - expensesRaw)),
    investment: moneyToK(investmentRaw),
    expenses: moneyToK(expensesRaw),
    study: roundValue(firstFiniteNumber(
      dailyCareer.studyHours,
      profile.studyHours,
      lifestyle.studyHours,
      dashboardData?.career?.studyHours,
    )),
    projects: roundValue(projects, 0),
    leetcodeProblems: roundValue(firstFiniteNumber(leetcodeStats?.solved), 0),
  };
}

function buildSimulationGroupsWithCurrent(baseGroups, currentValues, leetcodeConnected) {
  return baseGroups.map((group) => ({
    ...group,
    fields: group.fields.map((field) => ({
      ...field,
      current: currentValues[field.key] ?? field.current,
      simulated: field.key === 'leetcodeProblems'
        ? Math.max(400, currentValues.leetcodeProblems || field.simulated)
        : Math.max(field.simulated, currentValues[field.key] ?? field.current),
      max: field.key === 'leetcodeProblems'
        ? Math.max(1000, Math.ceil(((currentValues.leetcodeProblems || 0) + 200) / 100) * 100)
        : field.max,
      helperText: field.key === 'leetcodeProblems' && !leetcodeConnected
        ? 'Connect LeetCode to use real coding data.'
        : '',
    })),
  }));
}

function Simulation() {
  const { theme } = useTheme();
  const location = useLocation();
  const dispatch = useDispatch();
  const { dashboardData, isLoading: isDashboardLoading } = useDashboardSync();
  const healthIntegration = useSelector((state) => state.healthIntegration);
  const careerIntegrations = useSelector((state) => state.careerIntegrations);
  const dailyUpdate = useSelector((state) => state.dailyUpdate);
  const assistantSimulationApplied = useRef(false);
  const dailyUpdateFetchRequestedRef = useRef(false);
  const simulationRequestInFlightRef = useRef(false);
  const [currentValues, setCurrentValues] = useState(buildCurrentValues);
  const [values, setValues] = useState(buildInitialValues);
  const [customFields, setCustomFields] = useState([]);
  const [modalGroup, setModalGroup] = useState(null); // stores group key when modal is open
  const [githubStats, setGithubStats] = useState(null);
  const [githubStatsLoading, setGithubStatsLoading] = useState(false);
  const [leetcodeStats, setLeetcodeStats] = useState(null);
  const [leetcodeStatsLoading, setLeetcodeStatsLoading] = useState(false);
  const [financeData, setFinanceData] = useState(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  // Form states for the modal input
  const [newLabel, setNewLabel] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newCurrent, setNewCurrent] = useState('');
  const [newSimulated, setNewSimulated] = useState('');

  const [phase, setPhase] = useState('build');
  const [completedSteps, setCompletedSteps] = useState(0);
  const [dotCount, setDotCount] = useState(3);
  const [analysis, setAnalysis] = useState(defaultAnalysis);
  const [inputError, setInputError] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [isAiRequestLoading, setIsAiRequestLoading] = useState(false);
  const isLoadingInputs = isDashboardLoading || dailyUpdate.loading || githubStatsLoading || leetcodeStatsLoading || financeLoading;

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);
  const dashboardScores = useMemo(() => deriveDashboardScores(dashboardData), [dashboardData]);

  useEffect(() => {
    if (!dailyUpdateFetchRequestedRef.current && !dailyUpdate.todayUpdate && !dailyUpdate.loading) {
      dailyUpdateFetchRequestedRef.current = true;
      dispatch(fetchTodayDailyUpdate());
    }
  }, [dailyUpdate.loading, dailyUpdate.todayUpdate, dispatch]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

    let cancelled = false;
    const fetchFinanceData = () => {
      setFinanceLoading(true);
      axios.get(`${API_BASE_URL}/api/integrations/finance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (!cancelled && response.data?.success) {
            setFinanceData(response.data.data);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setFinanceData(null);
            console.warn('Simulation finance data fallback:', error.response?.data?.message || error.message);
          }
        })
        .finally(() => {
          if (!cancelled) setFinanceLoading(false);
        });
    };

    fetchFinanceData();
    window.addEventListener('upload-history-updated', fetchFinanceData);
    window.addEventListener('dashboard-data-updated', fetchFinanceData);
    window.addEventListener('daily-update-saved', fetchFinanceData);

    return () => {
      cancelled = true;
      window.removeEventListener('upload-history-updated', fetchFinanceData);
      window.removeEventListener('dashboard-data-updated', fetchFinanceData);
      window.removeEventListener('daily-update-saved', fetchFinanceData);
    };
  }, []);

  useEffect(() => {
    const profileUrl = careerIntegrations.leetcode?.profileUrl;
    if (!careerIntegrations.leetcode?.connected || !profileUrl) {
      setLeetcodeStats(null);
      setInputError('');
      return undefined;
    }

    let cancelled = false;
    setLeetcodeStatsLoading(true);
    setInputError('');
    fetchCareerIntegrationStats('leetcode', profileUrl)
      .then((stats) => {
        if (!cancelled) setLeetcodeStats(stats);
      })
      .catch((error) => {
        if (!cancelled) {
          setLeetcodeStats(null);
          setInputError('Unable to load LeetCode problems right now.');
          console.warn('Simulation LeetCode stats fallback:', error.response?.data?.message || error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLeetcodeStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [careerIntegrations.leetcode?.connected, careerIntegrations.leetcode?.profileUrl]);

  useEffect(() => {
    const profileUrl = careerIntegrations.github?.profileUrl;
    if (!careerIntegrations.github?.connected || !profileUrl) {
      setGithubStats(null);
      return undefined;
    }

    let cancelled = false;
    setGithubStatsLoading(true);
    fetchCareerIntegrationStats('github', profileUrl)
      .then((stats) => {
        if (!cancelled) setGithubStats(stats);
      })
      .catch((error) => {
        if (!cancelled) {
          setGithubStats(null);
          console.warn('Simulation GitHub stats fallback:', error.response?.data?.message || error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setGithubStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [careerIntegrations.github?.connected, careerIntegrations.github?.profileUrl]);

  const derivedCurrentValues = useMemo(
    () => deriveSimulationCurrentValues({
      dashboardData,
      dailyUpdate: dailyUpdate.todayUpdate,
      healthIntegration,
      githubStats,
      leetcodeStats,
      financeData,
    }),
    [dashboardData, dailyUpdate.todayUpdate, healthIntegration, githubStats, leetcodeStats, financeData],
  );

  const dynamicSimulationGroups = useMemo(
    () => buildSimulationGroupsWithCurrent(
      simulationGroups,
      derivedCurrentValues,
      Boolean(careerIntegrations.leetcode?.connected),
    ),
    [careerIntegrations.leetcode?.connected, derivedCurrentValues],
  );

  const allSimulationFields = useMemo(
    () => withGroupFields(dynamicSimulationGroups, customFields),
    [customFields, dynamicSimulationGroups],
  );

  useEffect(() => {
    setCurrentValues((current) => ({ ...current, ...derivedCurrentValues }));
    setValues((current) => {
      const next = { ...current };
      dynamicSimulationGroups.forEach((group) => {
        group.fields.forEach((field) => {
          if (next[field.key] == null) {
            next[field.key] = field.simulated;
          }
        });
      });
      return next;
    });
  }, [derivedCurrentValues, dynamicSimulationGroups]);

  const handleSliderChange = (key, value) => {
    setValues((current) => ({ ...current, [key]: sanitizeSimulationValue(value) }));
  };

  const handleAddCustomInput = (groupKey) => {
    setModalGroup(groupKey);
  };

  const handleSaveCustomInput = (e) => {
    e.preventDefault();
    if (!newLabel) return;

    const generatedKey = `custom_${modalGroup}_${Date.now()}`;
    const currentNum = Number(newCurrent) || 0;
    const simulatedNum = Number(newSimulated) || 0;

    const newFieldObj = {
      key: generatedKey,
      groupKey: modalGroup,
      label: newLabel,
      unit: newUnit,
      custom: true,
      current: currentNum,
      simulated: simulatedNum,
      min: Math.min(currentNum, simulatedNum, 0),
      max: Math.max(currentNum, simulatedNum, 10) * 2,
      step: 1,
    };

    setCustomFields((prev) => [...prev, newFieldObj]);
    setCurrentValues((prev) => ({ ...prev, [generatedKey]: currentNum }));
    setValues((prev) => ({ ...prev, [generatedKey]: simulatedNum }));

    // Reset Form & Close Modal
    setNewLabel('');
    setNewUnit('');
    setNewCurrent('');
    setNewSimulated('');
    setModalGroup(null);
  };

  const startSimulation = useCallback(async (overrides = {}) => {
    if (simulationRequestInFlightRef.current) return;
    simulationRequestInFlightRef.current = true;
    setIsAiRequestLoading(true);

    const nextCurrentValues = { ...currentValues, ...(overrides.current || {}) };
    const nextValues = { ...values, ...(overrides.simulated || {}) };

    setPhase('loading');
    setCompletedSteps(0);
    setDotCount(3);
    setAnalysisError('');

    processingSteps.forEach((_, index) => {
      window.setTimeout(() => setCompletedSteps(index + 1), 450 + index * 520);
    });

    let tick = 0;
    const dotTimer = window.setInterval(() => {
      tick += 1;
      setDotCount((current) => (current === 1 ? 3 : current - 1));
      if (tick >= 24) {
        window.clearInterval(dotTimer);
      }
    }, 300);

    const simulationContext = buildSimulationPayload({
      currentValues: nextCurrentValues,
      simulatedValues: nextValues,
      scenarioFields: allSimulationFields,
      dashboardScores,
      dashboardData,
      dailyUpdate,
      financeData,
    });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    const minimumRunTime = new Promise((resolve) => window.setTimeout(resolve, 1800));

    try {
      const responsePromise = axios.post(
        `${API_BASE_URL}/api/simulation/analyze`,
        { current: nextCurrentValues, simulated: nextValues, simulationContext },
        { headers: authHeaders, signal: controller.signal },
      );
      const [response] = await Promise.all([responsePromise, minimumRunTime]);
      setAnalysis({
        ...applySimulationResultLogic(normalizeAnalysis(response.data?.data), dashboardScores, nextCurrentValues, nextValues, allSimulationFields),
        aiLoading: false,
      });
    } catch (error) {
      await minimumRunTime;
      const timedOut = error.name === 'CanceledError' || error.code === 'ERR_CANCELED';
      setAnalysis({
        ...applySimulationResultLogic(normalizeAnalysis(defaultAnalysis), dashboardScores, nextCurrentValues, nextValues, allSimulationFields),
        aiLoading: false,
      });
      setAnalysisError(timedOut ? 'AI insights are taking longer than expected.' : 'AI analysis unavailable. Showing fallback twin analysis.');
      console.warn('Simulation AI fallback:', error.response?.data?.message || error.message);
    } finally {
      window.clearInterval(dotTimer);
      window.clearTimeout(timeoutId);
      setCompletedSteps(processingSteps.length);
      setPhase('result');
      simulationRequestInFlightRef.current = false;
      setIsAiRequestLoading(false);
    }
  }, [allSimulationFields, authHeaders, currentValues, dailyUpdate, dashboardData, dashboardScores, financeData, values]);

  useEffect(() => {
    if (phase !== 'result') return;
    setAnalysis((current) => applySimulationResultLogic(current, dashboardScores, currentValues, values, allSimulationFields));
  }, [allSimulationFields, currentValues, dashboardScores, phase, values]);

  useEffect(() => {
    const assistantSimulation = location.state?.assistantSimulation;
    if (!assistantSimulation || assistantSimulationApplied.current || isLoadingInputs) return;

    assistantSimulationApplied.current = true;
    setCurrentValues((current) => ({ ...current, ...(assistantSimulation.current || {}) }));
    setValues((current) => ({ ...current, ...(assistantSimulation.simulated || {}) }));
    startSimulation(assistantSimulation);
  }, [isLoadingInputs, location.state, startSimulation]);

  const resetSimulation = () => {
    setCompletedSteps(0);
    setAnalysisError('');
    setPhase('build');
  };

  if (phase === 'loading') {
    return <ProcessingScreen completedSteps={completedSteps} dotCount={dotCount} />;
  }

  
  if (phase === 'result') {
    return <ResultScreen analysis={analysis} analysisError={analysisError} onReset={resetSimulation} />;
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <HeroPanel eyebrow="Digital Twin Simulator" title="Build Simulation" icon={Brain}>
          <p className={`mt-3 max-w-2xl text-sm leading-6 ${
            theme === 'light' ? 'text-slate-700' : 'text-white/60'
          }`}>
            Adjust future inputs. Watch the twin calculate before and after impact.
          </p>
          {(isLoadingInputs || inputError) && (
            <p className={`mt-3 text-sm font-semibold ${
              theme === 'light' ? 'text-[#0e9f80]' : 'text-[#7df3cc]/80'
            }`}>
              {isLoadingInputs ? 'Loading your current twin inputs...' : inputError}
            </p>
          )}
        </HeroPanel>

        <section className="grid gap-5 xl:grid-cols-3">
          {dynamicSimulationGroups.map((group) => {
            // Merge static defaults with dynamically added inputs filtered by category key
            const combinedFields = [
              ...group.fields,
              ...customFields.filter((f) => f.groupKey === group.key),
            ];

            return (
              <SimulationCard
                key={group.key}
                group={group}
                combinedFields={combinedFields}
                currentValues={currentValues}
                values={values}
                onChange={handleSliderChange}
                onAddCustom={handleAddCustomInput}
              />
            );
          })}
        </section>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={startSimulation}
            disabled={isAiRequestLoading || isLoadingInputs}
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#7b61ff] px-7 py-4 text-sm font-black text-white shadow-[0_20px_50px_-25px_rgba(255,0,127,0.9)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
          >
            <Sparkles className="h-5 w-5" />
            {isAiRequestLoading ? 'Running Simulation...' : 'Start Simulation'}
          </button>
        </div>
      </div>

      {/* Dynamic Creation Modal popup wrapper */}
      {modalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-md overflow-hidden rounded-3xl border p-6 shadow-2xl ${
            theme === 'light'
              ? 'border-slate-200 bg-white text-slate-900 shadow-slate-200/50'
              : 'border-white/10 bg-[#0b111a] text-white shadow-2xl'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              theme === 'light' ? 'border-slate-200' : 'border-white/10'
            }`}>
              <h4 className="text-xl font-black capitalize tracking-tight">
                Add Custom {modalGroup} Metric
              </h4>
              <button
                type="button"
                onClick={() => setModalGroup(null)}
                className={`rounded-lg p-1 transition-colors ${
                  theme === 'light'
                    ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    : 'text-white/40 hover:bg-white/10 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomInput} className="mt-4 space-y-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                  theme === 'light' ? 'text-slate-600' : 'text-white/50'
                }`}>Metric Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Deep Sleep, Net Worth, Side Hustle"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-400'
                      : 'border-white/10 bg-white/5 text-white focus:border-white/30'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                  theme === 'light' ? 'text-slate-600' : 'text-white/50'
                }`}>Unit (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., %, bpm, hrs, count"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-400'
                      : 'border-white/10 bg-white/5 text-white focus:border-white/30'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                    theme === 'light' ? 'text-slate-600' : 'text-white/50'
                  }`}>Current Value</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newCurrent}
                    onChange={(e) => setNewCurrent(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                      theme === 'light'
                        ? 'border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-400'
                        : 'border-white/10 bg-white/5 text-white focus:border-white/30'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                    theme === 'light' ? 'text-slate-600' : 'text-white/50'
                  }`}>Simulated Value</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newSimulated}
                    onChange={(e) => setNewSimulated(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                      theme === 'light'
                        ? 'border-slate-200 bg-slate-50 text-slate-900 focus:border-slate-400'
                        : 'border-white/10 bg-white/5 text-white focus:border-white/30'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalGroup(null)}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-[#ff7a00] to-[#ff007f] py-3 text-sm font-black text-white hover:opacity-90 cursor-pointer"
                >
                  Add Metric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }) {
  const { theme } = useTheme();
  return (
    <div className={`min-h-[calc(100vh-112px)] px-4 py-6 sm:px-6 lg:px-8 ${
      theme === 'light'
        ? 'bg-[#f8fafc] text-slate-900'
        : 'bg-[#05070d] text-white'
    }`}>
      <div className="pointer-events-none fixed inset-0 left-[20rem] bg-[radial-gradient(circle_at_16%_0%,rgba(255,122,0,0.12),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(16,199,161,0.10),transparent_30%),linear-gradient(135deg,rgba(123,97,255,0.08),transparent_34%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function HeroPanel({ eyebrow, title, icon: Icon, children }) {
  const { theme } = useTheme();
  return (
    <section className={`relative overflow-hidden rounded-[1.75rem] border p-6 shadow-xl sm:p-8 ${
      theme === 'light'
        ? 'border-slate-200 bg-white text-slate-900 shadow-slate-100/50'
        : 'border-white/10 bg-[#080d15]/95 text-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)]'
    }`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(255,122,0,0.18),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(123,97,255,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_38%)]" />
      <div className="relative">
        <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${
          theme === 'light'
            ? 'border-slate-200 bg-slate-50 text-slate-500'
            : 'border-white/10 bg-white/5 text-white/58'
        }`}>
          <Icon className="h-3.5 w-3.5 text-[#10c7a1]" />
          {eyebrow}
        </div>
        <h2 className={`text-3xl font-black tracking-tight sm:text-5xl ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function SimulationCard({ group, combinedFields, currentValues, values, onChange, onAddCustom }) {
  const { theme } = useTheme();
  const Icon = group.icon;

  return (
    <article className={`flex flex-col overflow-hidden rounded-[1.5rem] border shadow-xl backdrop-blur-xl ${
      theme === 'light'
        ? 'border-slate-200 bg-white shadow-slate-100/50'
        : 'border-white/10 bg-[#0b111a]/92'
    }`}>
      <div className={`border-b bg-gradient-to-br ${group.tint} p-5 ${
        theme === 'light' ? 'border-slate-200' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
            theme === 'light'
              ? 'border-slate-200 bg-slate-50 text-slate-800'
              : 'border-white/10 bg-white/8 text-white'
          }`}>
            <Icon className="h-5 w-5" />
          </span>
          <h3 className={`text-2xl font-black tracking-tight ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>{group.title}</h3>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {combinedFields.map((field) => (
          <SimulationField
            key={field.key}
            field={field}
            currentValue={currentValues[field.key] ?? field.current}
            simulatedValue={values[field.key] ?? field.simulated}
            onChange={onChange}
            groupKey={group.key}
          />
        ))}

        {/* Dynamic Dotted Action Button matching screenshot blueprint wireframes */}
        <button
          type="button"
          onClick={() => onAddCustom(group.key)}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-transparent py-4 text-sm font-bold transition-all duration-200 active:scale-[0.99] ${
            theme === 'light'
              ? group.key === 'health'
                ? 'border-[#10c7a1]/50 text-[#0e9f80] hover:bg-[#10c7a1]/5'
                : group.key === 'finance'
                  ? 'border-[#c8a84b]/50 text-[#a2822a] hover:bg-[#c8a84b]/5'
                  : 'border-[#7b61ff]/50 text-[#5e3aff] hover:bg-[#7b61ff]/5'
              : `${group.borderColor} ${group.textColor} hover:bg-white/[0.02]`
          }`}
        >
          <Plus className="h-4 w-4" />
          Add Custom {group.title.split(' ')[0]} Input
        </button>
      </div>
    </article>
  );
}

function SimulationField({ field, currentValue, simulatedValue, onChange, groupKey }) {
  const { theme } = useTheme();
  const safeCurrent = sanitizeSimulationValue(currentValue);
  const safeSimulated = sanitizeSimulationValue(simulatedValue);
  const sliderMax = getDynamicSliderMax(field, safeCurrent, safeSimulated);
  const currentGroupKey = groupKey || field.groupKey || inferDomainFromFieldKey(field.key) || 'health';

  return (
    <div className={`rounded-2xl border p-4 ${
      theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
    }`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`text-sm font-black ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>{field.label}</span>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${
          theme === 'light'
            ? currentGroupKey === 'health'
              ? 'bg-[#10c7a1]/10 text-[#0e9f80] ring-1 ring-[#10c7a1]/20'
              : currentGroupKey === 'finance'
                ? 'bg-[#c8a84b]/10 text-[#a2822a] ring-1 ring-[#c8a84b]/20'
                : 'bg-[#7b61ff]/10 text-[#5e3aff] ring-1 ring-[#7b61ff]/20'
            : 'bg-white/8 text-[#7df3cc] ring-1 ring-white/10'
        }`}>
          {formatValue(field, safeSimulated)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={sliderMax}
        step={field.step}
        value={safeSimulated}
        onChange={(event) => onChange(field.key, event.target.value)}
        className={`w-full cursor-pointer ${
          theme === 'light'
            ? currentGroupKey === 'health'
              ? 'accent-[#10c7a1]'
              : currentGroupKey === 'finance'
                ? 'accent-[#c8a84b]'
                : 'accent-[#7b61ff]'
            : 'accent-[#10c7a1]'
        }`}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ValuePill label="Current" value={formatValue(field, safeCurrent)} groupKey={currentGroupKey} />
        <SimulatedValueInput field={field} value={safeSimulated} onChange={onChange} groupKey={currentGroupKey} />
      </div>
      {field.helperText && (
        <p className={`mt-2 text-xs font-semibold ${
          theme === 'light' ? 'text-slate-600' : 'text-white/42'
        }`}>{field.helperText}</p>
      )}
    </div>
  );
}

function ValuePill({ label, value, strong = false, groupKey }) {
  const { theme } = useTheme();
  const currentGroupKey = groupKey || 'health';

  const lightStrongStyles = {
    health: 'border-[#10c7a1]/30 bg-[#10c7a1]/8',
    finance: 'border-[#c8a84b]/30 bg-[#c8a84b]/8',
    career: 'border-[#7b61ff]/30 bg-[#7b61ff]/8',
  };

  const lightTextStrongStyles = {
    health: 'text-[#0e9f80]',
    finance: 'text-[#a2822a]',
    career: 'text-[#5e3aff]',
  };

  const borderBgClass = theme === 'light'
    ? strong
      ? lightStrongStyles[currentGroupKey]
      : 'border-slate-200 bg-slate-100/50'
    : strong
      ? 'border-[#10c7a1]/25 bg-[#10c7a1]/10'
      : 'border-white/10 bg-white/[0.045]';

  const labelClass = theme === 'light'
    ? strong
      ? lightTextStrongStyles[currentGroupKey]
      : 'text-slate-500'
    : 'text-white/36';

  const valueClass = theme === 'light'
    ? strong
      ? lightTextStrongStyles[currentGroupKey]
      : 'text-slate-800'
    : strong
      ? 'text-[#7df3cc]'
      : 'text-white/78';

  return (
    <div className={`rounded-xl border px-3 py-2 ${borderBgClass}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${labelClass}`}>{label}</p>
      <p className={`mt-1 text-sm font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function SimulatedValueInput({ field, value, onChange, groupKey }) {
  const { theme } = useTheme();
  const currentGroupKey = groupKey || inferDomainFromFieldKey(field.key) || 'health';

  const lightStyles = {
    health: {
      borderBg: 'border-[#10c7a1]/30 bg-[#10c7a1]/8',
      text: 'text-[#0e9f80]',
      label: 'text-[#0e9f80]/80',
    },
    finance: {
      borderBg: 'border-[#c8a84b]/30 bg-[#c8a84b]/8',
      text: 'text-[#a2822a]',
      label: 'text-[#a2822a]/80',
    },
    career: {
      borderBg: 'border-[#7b61ff]/30 bg-[#7b61ff]/8',
      text: 'text-[#5e3aff]',
      label: 'text-[#5e3aff]/80',
    },
  };

  const borderBgClass = theme === 'light'
    ? lightStyles[currentGroupKey].borderBg
    : 'border-[#10c7a1]/25 bg-[#10c7a1]/10';

  const labelTextClass = theme === 'light'
    ? lightStyles[currentGroupKey].label
    : 'text-white/36';

  const textColorClass = theme === 'light'
    ? lightStyles[currentGroupKey].text
    : 'text-[#7df3cc]';

  return (
    <label className={`rounded-xl border px-3 py-2 cursor-text ${borderBgClass}`}>
      <span className={`block text-[10px] font-bold uppercase tracking-[0.18em] ${labelTextClass}`}>Simulated</span>
      <span className={`mt-1 flex items-center gap-1 text-sm font-black ${textColorClass}`}>
        {field.prefix && <span>{field.prefix}</span>}
        <input
          type="number"
          min={0}
          step={field.step}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          onBlur={(event) => {
            if (event.target.value === '') onChange(field.key, 0);
          }}
          className={`min-w-0 flex-1 bg-transparent font-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${textColorClass}`}
          aria-label={`${field.label} simulated value`}
        />
        {field.unit && <span className="shrink-0">{field.unit}</span>}
      </span>
    </label>
  );
}

function ProcessingScreen({ completedSteps, dotCount }) {
  const { theme } = useTheme();
  const dots = '.'.repeat(dotCount);

  return (
    <PageShell>
      <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-4xl items-center justify-center">
        <section className={`relative w-full overflow-hidden rounded-[1.75rem] border p-6 shadow-xl sm:p-8 ${
          theme === 'light'
            ? 'border-slate-200 bg-white text-slate-900 shadow-slate-100/50'
            : 'border-white/10 bg-[#080d15]/95 text-white shadow-[0_24px_80px_-35px_rgba(0,0,0,0.9)]'
        }`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,199,161,0.20),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(123,97,255,0.25),transparent_30%)]" />
          <div className="relative mx-auto max-w-2xl text-center">
            <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-50'
                : 'border-white/12 bg-white/8'
            }`}>
              <Brain className={`h-9 w-9 animate-pulse ${
                theme === 'light' ? 'text-[#0e9f80]' : 'text-[#7df3cc]'
              }`} />
            </div>
            <p className={`text-xs font-bold uppercase tracking-[0.3em] ${
              theme === 'light' ? 'text-slate-600' : 'text-white/48'
            }`}>Digital Twin Processing</p>
            <h2 className={`mt-3 text-3xl font-black tracking-tight sm:text-5xl ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>Processing{dots}</h2>

            <div className="mt-8 space-y-3 text-left">
              {processingSteps.map((step, index) => {
                const done = completedSteps > index;
                const active = completedSteps === index;
                return (
                  <div key={step} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50/50'
                      : 'border-white/10 bg-white/[0.055]'
                  }`}>
                    <span className={`font-bold ${
                      theme === 'light' ? 'text-slate-900' : 'text-white/84'
                    }`}>{step}...</span>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      theme === 'light'
                        ? done ? 'bg-[#10c7a1] text-white' : active ? 'bg-[#7b61ff]/15 text-[#7b61ff]' : 'bg-slate-200 text-slate-500'
                        : done ? 'bg-[#10c7a1] text-[#07120f]' : active ? 'bg-[#7b61ff]/25 text-white' : 'bg-white/8 text-white/28'
                    }`}>
                      {done ? <Check className="h-4 w-4" /> : <RefreshCw className={`h-4 w-4 ${active ? 'animate-spin' : ''}`} />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function ResultScreen({ analysis, analysisError, onReset }) {
  const { theme } = useTheme();
  const twinScore = analysis.twinScore || defaultAnalysis.twinScore;
  const aiLoading = Boolean(analysis.aiLoading);

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <HeroPanel eyebrow="Simulation Complete" title="Simulation Result" icon={Check}>
          <p className={`mt-3 max-w-2xl text-sm leading-6 ${
            theme === 'light' ? 'text-slate-700' : 'text-white/60'
          }`}>
            {aiLoading ? 'Score cards are ready. AI insights are being generated in the background.' : analysis.source === 'ai' ? 'Generated from real-time AI analysis of your current and simulated values.' : analysisError || 'Generated from deterministic fallback analysis.'}
          </p>
          <div className="mt-6 grid items-stretch gap-4 xl:grid-cols-2">
            <OverallTwinScore current={twinScore.current} simulated={twinScore.simulated} />
            <SimulationSummary current={twinScore.current} simulated={twinScore.simulated} points={analysis.summaryPoints} isLoading={aiLoading} />
          </div>
        </HeroPanel>

        <section className="grid gap-5 xl:grid-cols-3">
          {analysis.resultCards.map((card) => (
            <ResultCard key={card.title} card={card} isLoading={aiLoading} />
          ))}
        </section>

        <section>
          <div className={`rounded-[1.5rem] border p-5 shadow-xl backdrop-blur-xl sm:p-6 ${
            theme === 'light'
              ? 'border-slate-200 bg-white shadow-slate-100/50'
              : 'border-white/10 bg-[#0b111a]/92'
          }`}>
            <div className={`mb-5 flex items-center justify-between border-b pb-4 ${
              theme === 'light' ? 'border-slate-200' : 'border-white/10'
            }`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.24em] ${
                  theme === 'light' ? 'text-[#0e9f80]' : 'text-[#7df3cc]/70'
                }`}>Cross Domain Analysis</p>
                <h3 className={`mt-1 text-2xl font-black ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>Impact chains</h3>
                <p className={`mt-2 max-w-2xl text-sm leading-6 ${
                  theme === 'light' ? 'text-slate-700' : 'text-white/54'
                }`}>
                  The twin links cause and effect across domains, so one habit can move health, focus, and finances together.
                </p>
              </div>
              <Brain className="h-6 w-6 shrink-0 text-[#7b61ff]" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {aiLoading
                ? ['Recovery Loop', 'Money Impact', 'Career Momentum'].map((title) => <ImpactChainSkeleton key={title} title={title} />)
                : analysis.impactChains.map((chain) => (
                  <ImpactChain key={chain.title} chain={chain} />
                ))}
            </div>
          </div>
        </section>

        <TimelineForecast items={analysis.timelineForecast} isLoading={aiLoading} />

        <section className="grid gap-5 lg:grid-cols-2">
          <TradeOffAnalysis items={analysis.tradeOffAnalysis} isLoading={aiLoading} />
          <RiskAssessment items={analysis.riskAssessment} isLoading={aiLoading} />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition cursor-pointer ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/85'
                : 'border-white/10 bg-white/[0.065] text-white/86 hover:bg-white/10'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            Run Another Simulation
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#7b61ff] px-5 py-3 text-sm font-black text-white shadow-[0_20px_50px_-25px_rgba(255,0,127,0.9)] transition hover:-translate-y-0.5 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Save Scenario
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function SimulationSummary({ current, simulated, points: dynamicPoints, isLoading = false }) {
  const { theme } = useTheme();
  const points = dynamicPoints || [
    'Health score improves significantly due to better recovery and energy levels.',
    'Career growth accelerates through increased productivity and learning.',
    'Financial stability remains strong with reduced risk.',
    `Overall Twin Score improves from ${current} to ${simulated}.`,
  ];

  return (
    <div className={`flex h-full min-h-[360px] flex-col rounded-[1.35rem] border p-6 backdrop-blur-xl ${
      theme === 'light' ? 'border-slate-200 bg-slate-50/60' : 'border-white/10 bg-white/[0.055]'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
          theme === 'light'
            ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#0e9f80]'
            : 'border-[#10c7a1]/25 bg-[#10c7a1]/10 text-[#7df3cc]'
        }`}>
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.22em] ${
            theme === 'light' ? 'text-[#0e9f80]' : 'text-[#7df3cc]/70'
          }`}>Simulation Summary</p>
          <h3 className={`mt-1 text-xl font-black ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>Based on your selected improvements</h3>
        </div>
      </div>

      <div className="mt-5 grid flex-1 gap-3 md:grid-cols-2">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => (
          <div key={`summary-skeleton-${index}`} className={`rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#080d15]/80'
          }`}>
            <SkeletonLine className="h-3 w-3/4" />
            <SkeletonLine className="mt-3 h-3 w-full" />
            <SkeletonLine className="mt-2 h-3 w-5/6" />
          </div>
        )) : points.map((point) => (
          <div key={point} className={`flex gap-3 rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#080d15]/80'
          }`}>
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#10c7a1] shadow-[0_0_10px_rgba(16,199,161,0.75)]" />
            <p className={`text-sm leading-6 ${
              theme === 'light' ? 'text-slate-700' : 'text-white/66'
            }`}>{point}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverallTwinScore({ current, simulated }) {
  const { theme } = useTheme();
  const progressWidth = `${Math.min(Math.max(Number(simulated || 0), 0), 100)}%`;
  const directionCopy = Number(simulated) > Number(current)
    ? 'Your simulated choices improve the full Digital Twin across health, finance, and career signals.'
    : Number(simulated) < Number(current)
      ? 'Your simulated choices reduce the full Digital Twin outlook after weighing health, finance, and career trade-offs.'
      : 'Your simulated choices keep the full Digital Twin outlook stable across health, finance, and career signals.';

  return (
    <div className={`flex h-full min-h-[360px] flex-col rounded-[1.35rem] border p-6 shadow-xl ${
      theme === 'light'
        ? 'border-slate-200 bg-gradient-to-br from-[#f5f3ff] via-[#faf5ff] to-[#f0fdfa] text-slate-800 shadow-slate-100/50'
        : 'border-white/10 bg-gradient-to-br from-[#1a103d]/88 via-[#231044]/82 to-[#132b35]/88 text-white shadow-[0_20px_60px_-40px_rgba(0,0,0,0.9)]'
    }`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.24em] ${
            theme === 'light' ? 'text-slate-500' : 'text-white/48'
          }`}>Overall Twin Score</p>
          <p className={`mt-2 text-sm leading-6 ${
            theme === 'light' ? 'text-slate-700' : 'text-white/56'
          }`}>
            {directionCopy}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <TwinScore label="Current Twin" value={current} />
        <ArrowRight className={`mx-auto hidden h-5 w-5 sm:block ${
          theme === 'light' ? 'text-slate-500' : 'text-white/38'
        }`} />
        <TwinScore label="Simulated Twin" value={simulated} active />
      </div>

      <div className={`mt-auto rounded-2xl border p-4 ${
        theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.055]'
      }`}>
        <div className={`flex items-center justify-between text-sm font-bold ${
          theme === 'light' ? 'text-slate-700' : 'text-white/70'
        }`}>
          <span>Before</span>
          <ArrowRight className="h-4 w-4" />
          <span>After</span>
        </div>
        <div className={`mt-3 h-3 overflow-hidden rounded-full ${
          theme === 'light' ? 'bg-slate-200/80' : 'bg-white/10'
        }`}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#10c7a1]"
            style={{ width: progressWidth }}
          />
        </div>
      </div>
    </div>
  );
}

function ResultCard({ card, isLoading = false }) {
  const { theme } = useTheme();
  const Icon = card.icon;

  return (
    <article className={`rounded-[1.5rem] border p-5 shadow-xl backdrop-blur-xl ${
      theme === 'light'
        ? 'border-slate-200 bg-white shadow-slate-100/50'
        : 'border-white/10 bg-[#0b111a]/92'
    }`}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.24em] ${
            theme === 'light' ? 'text-slate-500' : 'text-white/40'
          }`}>{card.title}</p>
          <h3 className={`mt-1 text-2xl font-black ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>{card.label}</h3>
        </div>
        <Icon className={`h-6 w-6 ${card.accent}`} />
      </div>

      <div className="mb-5 flex items-end gap-4">
        <span className={`text-5xl font-black ${
          theme === 'light' ? 'text-slate-400' : 'text-white/35'
        }`}>{card.from}</span>
        <ArrowRight className={`mb-3 h-6 w-6 ${
          theme === 'light' ? 'text-[#0e9f80]' : 'text-[#7df3cc]/65'
        }`} />
        <span className={`text-6xl font-black ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>{card.to}</span>
      </div>

      <div className="grid gap-2">
        {card.signals.map((signal) => (
          <div key={signal.label} className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
          }`}>
            <span className={`text-sm font-bold ${
              theme === 'light' ? 'text-slate-700' : 'text-white/82'
            }`}>{signal.label}</span>
            {signal.direction === 'up'
              ? <TrendingUp className="h-5 w-5 text-[#10c7a1]" />
              : signal.direction === 'down'
                ? <TrendingDown className="h-5 w-5 text-[#ff007f]" />
                : <Minus className={`h-5 w-5 ${theme === 'light' ? 'text-slate-400' : 'text-white/38'}`} />}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className={`mt-4 rounded-2xl border p-4 ${
          theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
        }`}>
          <SkeletonLine className="h-3 w-2/3" />
          <SkeletonLine className="mt-3 h-3 w-full" />
          <SkeletonLine className="mt-2 h-3 w-4/5" />
        </div>
      ) : card.analysis && (
        <p className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
          theme === 'light' ? 'border-slate-200 bg-slate-50/50 text-slate-600' : 'border-white/10 bg-white/[0.045] text-white/58'
        }`}>
          {card.analysis}
        </p>
      )}
    </article>
  );
}

function TimelineForecast({ items = [], isLoading = false }) {
  const { theme } = useTheme();
  return (
    <section className={`rounded-[1.5rem] border p-5 shadow-xl backdrop-blur-xl sm:p-6 ${
      theme === 'light'
        ? 'border-slate-200 bg-white shadow-slate-100/50'
        : 'border-white/10 bg-[#0b111a]/92'
    }`}>
      <div className={`mb-5 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-white/10'
      }`}>
        <p className={`text-xs font-bold uppercase tracking-[0.24em] ${
          theme === 'light' ? 'text-[#0e9f80]' : 'text-[#7df3cc]/70'
        }`}>Timeline Visualization</p>
        <h3 className={`mt-1 text-2xl font-black ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>Future projection timeline</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? Array.from({ length: 3 }).map((_, index) => (
          <div key={`timeline-skeleton-${index}`} className={`rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
          }`}>
            <SkeletonLine className="h-3 w-1/2" />
            <SkeletonLine className="mt-4 h-3 w-full" />
            <SkeletonLine className="mt-2 h-3 w-5/6" />
          </div>
        )) : items.map((item) => (
          <div key={item.period} className={`rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
          }`}>
            <p className={`text-sm font-black ${
              theme === 'light' ? 'text-[#0e9f80]' : 'text-[#7df3cc]'
            }`}>{item.period}</p>
            <p className={`mt-3 text-sm leading-6 ${
              theme === 'light' ? 'text-slate-700' : 'text-white/58'
            }`}>{item.forecast}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TradeOffAnalysis({ items = [], isLoading = false }) {
  const { theme } = useTheme();
  return (
    <section className={`rounded-[1.5rem] border p-5 shadow-xl backdrop-blur-xl sm:p-6 ${
      theme === 'light'
        ? 'border-slate-200 bg-white shadow-slate-100/50'
        : 'border-white/10 bg-[#0b111a]/92'
    }`}>
      <div className={`mb-5 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-white/10'
      }`}>
        <p className={`text-xs font-bold uppercase tracking-[0.24em] ${
          theme === 'light' ? 'text-[#a2822a]' : 'text-[#c8a84b]/80'
        }`}>Trade-Off Analysis</p>
        <h3 className={`mt-1 text-2xl font-black ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>Benefits and risks</h3>
      </div>
      <div className="space-y-3">
        {isLoading ? Array.from({ length: 2 }).map((_, index) => (
          <div key={`tradeoff-skeleton-${index}`} className={`rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
          }`}>
            <SkeletonLine className="h-3 w-1/3" />
            <SkeletonLine className="mt-3 h-3 w-2/3" />
            <SkeletonLine className="mt-4 h-3 w-full" />
          </div>
        )) : items.map((item) => (
          <div key={`${item.benefit}-${item.risk}`} className={`rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
          }`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#10c7a1]/70">Benefit</p>
                <p className={`mt-1 text-sm font-black ${
                  theme === 'light' ? 'text-slate-800' : 'text-white'
                }`}>{item.benefit}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff007f]/70">Risk</p>
                <p className={`mt-1 text-sm font-black ${
                  theme === 'light' ? 'text-slate-800' : 'text-white'
                }`}>{item.risk}</p>
              </div>
            </div>
            <p className={`mt-3 text-sm leading-6 ${
              theme === 'light' ? 'text-slate-700' : 'text-white/58'
            }`}>{item.impact}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskAssessment({ items = [], isLoading = false }) {
  const { theme } = useTheme();
  return (
    <section className={`rounded-[1.5rem] border p-5 shadow-xl backdrop-blur-xl sm:p-6 ${
      theme === 'light'
        ? 'border-slate-200 bg-white shadow-slate-100/50'
        : 'border-white/10 bg-[#0b111a]/92'
    }`}>
      <div className={`mb-5 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-white/10'
      }`}>
        <p className={`text-xs font-bold uppercase tracking-[0.24em] ${
          theme === 'light' ? 'text-[#d0006f]' : 'text-[#ff007f]/70'
        }`}>Risk Assessment</p>
        <h3 className={`mt-1 text-2xl font-black ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>Domain risk levels</h3>
      </div>
      <div className="space-y-3">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => (
          <div key={`risk-skeleton-${index}`} className={`rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
          }`}>
            <SkeletonLine className="h-3 w-1/2" />
            <SkeletonLine className="mt-3 h-3 w-full" />
            <SkeletonLine className="mt-2 h-3 w-4/5" />
          </div>
        )) : items.map((item) => (
          <div key={item.domain} className={`rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <p className={`text-sm font-black ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>{item.domain}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${riskStatusClass(item.status, theme)}`}>{item.status}</span>
            </div>
            <p className={`mt-3 text-sm leading-6 ${
              theme === 'light' ? 'text-slate-700' : 'text-white/58'
            }`}>{item.analysis}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function riskStatusClass(status, theme) {
  if (theme === 'light') {
    if (status === 'Low') return 'bg-[#10c7a1]/10 text-[#0e9f80] ring-1 ring-[#10c7a1]/20';
    if (status === 'High') return 'bg-[#ff007f]/10 text-[#d0006f] ring-1 ring-[#ff007f]/20';
    return 'bg-[#c8a84b]/15 text-[#a2822a] ring-1 ring-[#c8a84b]/20';
  }
  if (status === 'Low') return 'bg-[#10c7a1]/10 text-[#7df3cc] ring-1 ring-[#10c7a1]/25';
  if (status === 'High') return 'bg-[#ff007f]/10 text-[#ff8dbf] ring-1 ring-[#ff007f]/25';
  return 'bg-[#c8a84b]/10 text-[#ffe08a] ring-1 ring-[#c8a84b]/25';
}

function SkeletonLine({ className = '' }) {
  const { theme } = useTheme();
  return <div className={`animate-pulse rounded-full bg-gradient-to-r ${
    theme === 'light'
      ? 'from-slate-200 via-slate-100 to-slate-200'
      : 'from-white/8 via-white/18 to-white/8'
  } ${className}`} />;
}

function ImpactChainSkeleton({ title }) {
  const { theme } = useTheme();
  return (
    <div className={`rounded-[1.25rem] border p-4 ${
      theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
    }`}>
      <p className={`text-sm font-black ${
        theme === 'light' ? 'text-slate-800' : 'text-white'
      }`}>{title}</p>
      <div className="mt-2 min-h-12">
        <SkeletonLine className="h-3 w-2/3" />
        <SkeletonLine className="mt-2 h-3 w-full" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`impact-skeleton-${index}`} className={`rounded-2xl border p-4 ${
            theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#080d15]/92'
          }`}>
            <SkeletonLine className="mx-auto h-3 w-1/2" />
            <SkeletonLine className="mx-auto mt-3 h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ... keeping standard subcomponents uniform
function ImpactChain({ chain }) {
  const { theme } = useTheme();
  return (
    <div className={`rounded-[1.25rem] border p-4 ${
      theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
    }`}>
      <p className={`text-sm font-black ${
        theme === 'light' ? 'text-slate-800' : 'text-white'
      }`}>{chain.title}</p>
      <p className={`mt-2 min-h-12 text-xs leading-5 ${
        theme === 'light' ? 'text-slate-600' : 'text-white/52'
      }`}>{chain.copy}</p>
      <div className="mt-4 space-y-3">
        {chain.steps.map((item, index) => (
          <div key={`${chain.title}-${item.label}`} className="flex flex-col items-center">
            <div className={`w-full rounded-2xl border p-4 shadow-sm ${
              theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#080d15]/92'
            }`}>
              <p className={`text-center text-base font-black ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>{item.label}</p>
              {item.explanation && (
                <p className={`mx-auto mt-2 max-w-[18rem] text-center text-xs leading-5 ${
                  theme === 'light' ? 'text-slate-600' : 'text-white/48'
                }`}>
                  {item.explanation}
                </p>
              )}
            </div>
            {index < chain.steps.length - 1 && (
              <div className="flex w-full flex-col items-center">
                <div className={`h-3 w-px ${theme === 'light' ? 'bg-slate-200' : 'bg-white/10'}`} />
                <ChevronDown className={`my-1 h-5 w-5 ${
                  theme === 'light'
                    ? chain.title === 'Recovery Loop'
                      ? 'text-[#0e9f80]'
                      : chain.title === 'Money Impact' || chain.title === 'Money Calm'
                        ? 'text-[#a2822a]'
                        : 'text-[#5e3aff]'
                    : 'text-[#7df3cc]/70'
                }`} />
                <div className={`h-3 w-px ${theme === 'light' ? 'bg-slate-200' : 'bg-white/10'}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TwinScore({ label, value, active = false }) {
  const { theme } = useTheme();
  return (
    <div className={`rounded-2xl border px-4 py-5 text-center ${
      theme === 'light'
        ? active ? 'border-[#10c7a1]/30 bg-[#10c7a1]/8' : 'border-slate-200 bg-slate-100/50'
        : active ? 'border-[#10c7a1]/25 bg-[#10c7a1]/10' : 'border-white/10 bg-white/[0.055]'
    }`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
        theme === 'light' ? 'text-slate-500' : 'text-white/45'
      }`}>{label}</p>
      <p className={`mt-2 text-5xl font-black ${
        theme === 'light'
          ? active ? 'text-[#0e9f80]' : 'text-slate-800'
          : active ? 'text-[#7df3cc]' : 'text-white'
      }`}>{value}</p>
    </div>
  );
}

export default Simulation;
