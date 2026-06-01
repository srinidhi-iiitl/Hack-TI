const navigationTargets = [
  { intent: 'dashboard', patterns: ['dashboard', 'dash board', 'home'], target: '/dashboard', label: 'Dashboard' },
  { intent: 'health', patterns: ['health', 'helth', 'help page', 'yelp', 'yelp page'], target: '/health', label: 'Health' },
  { intent: 'finance', patterns: ['finance', 'financial', 'money', 'wealth', 'finances'], target: '/finance', label: 'Finance' },
  { intent: 'career', patterns: ['career', 'job', 'work'], target: '/career', label: 'Career' },
  { intent: 'goals', patterns: ['goals', 'goal'], target: '/goals', label: 'Goals' },
  { intent: 'simulation', patterns: ['ai simulation', 'simulation', 'simulator'], target: '/simulation', label: 'Simulation' },
  { intent: 'notifications', patterns: ['notifications', 'notification', 'alerts'], target: '/notifications', label: 'Notifications' },
  { intent: 'settings', patterns: ['settings', 'setting', 'preferences'], target: '/settings', label: 'Settings' },
  { intent: 'intelligence', patterns: ['ai intelligence', 'intelligence', 'insights'], target: '/intelligence', label: 'AI Intelligence' },
];

export function parseAssistantCommand(rawCommand = '') {
  const command = normalizeCommand(rawCommand);
  console.log('[Twin Assistant] Transcript:', rawCommand);

  if (!command) {
    return {
      action: 'unknown',
      response: 'I did not catch that. Please try again.',
      message: 'I did not catch that. Please try again.',
    };
  }

  if (/\b(log\s*out|logout|sign\s*out)\b/.test(command)) {
    return withMessage({ action: 'logout', response: 'Logging out...' });
  }

  const dashboardMetricAction = parseDashboardMetric(command);
  if (dashboardMetricAction) return dashboardMetricAction;

  const healthQuestionAction = parseHealthQuestion(command);
  if (healthQuestionAction) return healthQuestionAction;

  const financeQuestionAction = parseFinanceQuestion(command);
  if (financeQuestionAction) return financeQuestionAction;

  const navigationAction = parseNavigation(command);
  if (navigationAction) return navigationAction;

  const goalAction = parseGoal(command);
  if (goalAction) return goalAction;

  const simulationAction = parseSimulation(command);
  if (simulationAction) return simulationAction;

  return {
    action: 'unknown',
    response: 'I can open pages, answer health or finance questions, create goals, run what-if simulations, or log you out.',
    message: 'I can open pages, answer health or finance questions, create goals, run what-if simulations, or log you out.',
  };
}

function parseHealthQuestion(command) {
  if (!/\b(health score|my health|how is my health|what is my health)\b/.test(command)) return null;

  return withMessage({
    action: 'answer_health_score',
    response: 'Checking your health score...',
  });
}

function parseDashboardMetric(command) {
  const queryVerb = /\b(what is|what's|show|tell me|give me|check|current)\b/.test(command);
  if (!queryVerb && !/\b(score|rate)\b/.test(command)) return null;

  if (/\bhealth score\b|\bmy health\b/.test(command)) {
    return withMessage({
      action: 'answer_dashboard_metric',
      metric: 'healthScore',
      response: 'Checking your health score...',
    });
  }

  if (/\bfinance score\b|\bfinancial score\b|\bfinancial health\b/.test(command)) {
    return withMessage({
      action: 'answer_dashboard_metric',
      metric: 'financeScore',
      response: 'Checking your finance score...',
    });
  }

  if (/\bcareer score\b|\bcareer momentum\b/.test(command)) {
    return withMessage({
      action: 'answer_dashboard_metric',
      metric: 'careerScore',
      response: 'Checking your career score...',
    });
  }

  if (/\bproductivity score\b|\bmy productivity\b/.test(command)) {
    return withMessage({
      action: 'answer_dashboard_metric',
      metric: 'productivityScore',
      response: 'Checking your productivity score...',
    });
  }

  if (/\bsavings rate\b|\bsaving rate\b/.test(command)) {
    return withMessage({
      action: 'answer_dashboard_metric',
      metric: 'savingsRate',
      response: 'Checking your savings rate...',
    });
  }

  return null;
}

function parseFinanceQuestion(command) {
  if (!/\b(my savings|what are my savings|how much.*sav|savings)\b/.test(command)) return null;

  return withMessage({
    action: 'answer_savings',
    response: 'Checking your savings...',
  });
}

function parseNavigation(command) {
  const match = navigationTargets.find((item) =>
    item.patterns.some((pattern) => fuzzyIncludes(command, pattern)),
  );

  if (!match) return null;

  const hasNavigationVerb = /\b(open|go to|show|navigate to|take me to|launch|switch to|visit)\b/.test(command);
  const looksLikePageRequest = /\b(page|screen|section|tab)\b/.test(command);
  const commandIsOnlyTarget = match.patterns.some((pattern) => command === pattern || command === `${pattern} page`);

  if (!hasNavigationVerb && !looksLikePageRequest && !commandIsOnlyTarget) return null;

  console.log('[Twin Assistant] Detected intent:', match.intent);
  console.log('[Twin Assistant] Action: navigate');
  console.log('[Twin Assistant] Target:', match.target);

  return withMessage({
    action: 'navigate',
    intent: match.intent,
    target: match.target,
    response: `Opening ${match.label}...`,
  });
}

function fuzzyIncludes(command, pattern) {
  if (command.includes(pattern)) return true;

  const words = command.split(' ');
  const patternWords = pattern.split(' ');
  return patternWords.every((patternWord) =>
    words.some((word) => isCloseWord(word, patternWord)),
  );
}

function isCloseWord(word, pattern) {
  if (word === pattern) return true;
  if (word.length < 4 || pattern.length < 4) return false;
  if (word.startsWith(pattern.slice(0, 4)) || pattern.startsWith(word.slice(0, 4))) return true;

  return levenshteinDistance(word, pattern) <= 2;
}

function levenshteinDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  return rows[a.length][b.length];
}

function parseGoal(command) {
  const goalMatch = command.match(/\b(?:create|add|set|make)\s+(?:a\s+)?goal\s+(?:to|for|called|named)?\s*(.+)$/);
  if (!goalMatch?.[1]) return null;

  const rawTitle = cleanTrailingWords(goalMatch[1]);
  const title = toTitleCase(rawTitle);
  const amount = parseAmount(command);
  const domain = inferGoalDomain(command);

  return withMessage({
    action: 'create_goal',
    title,
    domain,
    targetMetric: amount || 1,
    unit: amount ? 'Rs' : 'milestone',
    priority: 'medium',
    deadline: getFutureDate(90),
    description: `Created by Twin Assistant from: "${command}"`,
    response: `Creating goal: ${title}...`,
  });
}

function parseSimulation(command) {
  if (!command.startsWith('what if')) return null;

  const payload = {
    command,
    current: {},
    simulated: {},
  };
  const number = parseNumber(command);

  if (command.includes('study')) payload.simulated.study = number || 4;
  if (command.includes('save') || command.includes('savings')) {
    payload.simulated.savings = number ? Math.max(1, Math.round(number / 1000)) : 5;
  }
  if (command.includes('exercise') || command.includes('workout')) payload.simulated.exercise = number || 4;
  if (command.includes('sleep')) payload.simulated.sleep = number || 8;

  return withMessage({
    action: 'run_simulation',
    payload,
    response: 'Running simulation...',
  });
}

function withMessage(action) {
  return {
    ...action,
    message: action.message || action.response,
  };
}

function normalizeCommand(command) {
  return String(command).toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanTrailingWords(value) {
  return value.replace(/\b(please|now|today)\b/g, '').trim();
}

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function inferGoalDomain(command) {
  if (/\b(save|saving|rupees|lakh|money|finance|invest)\b/.test(command)) return 'finance';
  if (/\b(developer|frontend|career|job|study|learn|project)\b/.test(command)) return 'career';
  if (/\b(health|fitness|sleep|workout|exercise|weight)\b/.test(command)) return 'health';
  return 'career';
}

function parseAmount(command) {
  const lakhMatch = command.match(/(\d+(?:\.\d+)?)\s*lakh/);
  if (lakhMatch) return Number(lakhMatch[1]) * 100000;

  const rupeeMatch = command.match(/(?:rs|rupees|inr)?\s*(\d{3,})/);
  if (rupeeMatch) return Number(rupeeMatch[1]);

  return null;
}

function parseNumber(command) {
  const match = command.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
