import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  createGoalFromAssistant,
  getDashboardForAssistant,
  getFinanceForAssistant,
  getSettings,
  processAssistantCommand,
  runSimulationForAssistant,
} from '../../services/voiceAssistantService';
import TwinAssistantButton from './TwinAssistantButton';
import { TwinAssistantContext } from './twinAssistantContext';
import { logoutUser } from '../../features/auth/authThunks';

export default function TwinAssistantProvider({ children }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [enabled, setEnabled] = useState(false);
  const [assistantState, setAssistantState] = useState('disabled');
  const [assistantMessage, setAssistantMessage] = useState('Ready for commands...');
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const lastProcessedTranscript = useRef('');
  const lastProcessedAt = useRef(0);
  const restartTimer = useRef(null);
  const commandTimer = useRef(null);
  const listeningRef = useRef(false);
  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const loadSettings = useCallback(async () => {
    try {
      const settings = await getSettings();
      const nextEnabled = Boolean(settings.twinAssistantEnabled);
      setEnabled(nextEnabled);
      setPanelOpen(nextEnabled);
      setAssistantState(nextEnabled ? 'ready' : 'disabled');
      setAssistantMessage(nextEnabled ? 'Ready for commands...' : 'Twin Assistant is disabled. Enable it in Settings.');
    } catch (error) {
      console.warn('Twin Assistant settings fallback:', error.response?.data?.message || error.message);
      setEnabled(false);
      setAssistantState('disabled');
      setAssistantMessage('Twin Assistant is disabled. Enable it in Settings.');
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadSettings);
    window.addEventListener('twin-assistant-settings-updated', loadSettings);
    return () => window.removeEventListener('twin-assistant-settings-updated', loadSettings);
  }, [loadSettings]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const startListening = useCallback(async ({ force = false } = {}) => {
    if (!browserSupportsSpeechRecognition || !enabled) return;
    if (listeningRef.current && !force) return;

    resetTranscript();
    setDisplayTranscript('');
    setPanelOpen(true);
    setAssistantState('ready');
    setAssistantMessage('Ready for commands...');
    if (force && listeningRef.current) {
      SpeechRecognition.stopListening();
      await wait(150);
    }
    await SpeechRecognition.startListening({ continuous: true, interimResults: true, language: 'en-IN' });
    console.log('[Twin Assistant] Listening started');
  }, [browserSupportsSpeechRecognition, enabled, resetTranscript]);

  const stopListening = useCallback(() => {
    if (restartTimer.current) {
      window.clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    if (commandTimer.current) {
      window.clearTimeout(commandTimer.current);
      commandTimer.current = null;
    }
    SpeechRecognition.stopListening();
    setAssistantState(enabled ? 'ready' : 'disabled');
    setAssistantMessage(enabled ? 'Ready for commands...' : 'Twin Assistant is disabled. Enable it in Settings.');
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      window.setTimeout(stopListening, 0);
      return;
    }

    if (!browserSupportsSpeechRecognition) {
      window.setTimeout(() => {
        setPanelOpen(true);
        setAssistantState('ready');
        setAssistantMessage('Speech recognition is not supported in this browser.');
      }, 0);
      return;
    }

    window.setTimeout(() => {
      startListening();
    }, 0);
  }, [browserSupportsSpeechRecognition, enabled, startListening, stopListening]);

  useEffect(() => {
    if (enabled && !listening && (assistantState === 'ready' || assistantState === 'listening')) {
      restartTimer.current = window.setTimeout(() => {
        startListening();
      }, 450);
    }
  }, [assistantState, enabled, listening, startListening]);

  const addMessage = useCallback((role, text) => {
    if (!text) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      { role, text },
    ]);
  }, []);

  const executeAction = useCallback(
    async (action) => {
      if (!action) return;

      const responseMessage = action.response || action.message || 'Working on it...';
      setAssistantState('responding');
      setAssistantMessage(responseMessage);
      addMessage('assistant', responseMessage);
      console.log('[Twin Assistant] Response:', action);

      await wait(750);

      if (action.action === 'navigate' && action.target) {
        console.log(`[Twin Assistant] Response: navigate -> ${action.target}`);
        setAssistantState('responding');
        console.log('[Twin Assistant] Executing navigation');
        navigate(action.target);
        console.log('[Twin Assistant] Navigation executed.');
        return;
      }

      if (action.action === 'create_goal') {
        console.log('[Twin Assistant] Executing goal creation');
        setAssistantState('processing');
        await createGoalFromAssistant(action);
        setAssistantState('responding');
        setAssistantMessage(`Created goal: ${action.title}`);
        addMessage('assistant', `Created goal: ${action.title}`);
        navigate('/goals');
        return;
      }

      if (action.action === 'run_simulation') {
        console.log('[Twin Assistant] Executing simulation');
        setAssistantState('processing');
        const result = await runSimulationForAssistant(action.payload);
        console.log('[Twin Assistant] Simulation result:', result);
        setAssistantState('responding');
        const simulationResponse = formatSimulationResponse(result);
        setAssistantMessage(simulationResponse);
        addMessage('assistant', simulationResponse);
        return;
      }

      if (action.action === 'answer_health_score') {
        console.log('[Twin Assistant] Executing health score answer');
        setAssistantState('processing');
        const result = await getDashboardForAssistant();
        console.log('[Twin Assistant] Dashboard health score response:', result);
        setAssistantState('responding');
        const healthResponse = formatDashboardHealthResponse(result);
        setAssistantMessage(healthResponse);
        addMessage('assistant', healthResponse);
        return;
      }

      if (action.action === 'answer_dashboard_metric') {
        console.log('[Twin Assistant] Executing dashboard metric answer');
        setAssistantState('processing');
        const result = await getDashboardForAssistant();
        console.log('[Twin Assistant] Dashboard metric response:', result);
        setAssistantState('responding');
        const metricResponse = formatDashboardMetricResponse(result, action.metric);
        setAssistantMessage(metricResponse);
        addMessage('assistant', metricResponse);
        return;
      }

      if (action.action === 'answer_savings') {
        console.log('[Twin Assistant] Executing savings answer');
        setAssistantState('processing');
        const result = await getFinanceForAssistant();
        console.log('[Twin Assistant] Finance response:', result);
        setAssistantState('responding');
        const savingsResponse = formatSavingsResponse(result);
        setAssistantMessage(savingsResponse);
        addMessage('assistant', savingsResponse);
        return;
      }

      if (action.action === 'logout') {
        console.log('[Twin Assistant] Executing logout');
        setAssistantState('processing');
        await dispatch(logoutUser());
        navigate('/', { replace: true });
      }
    },
    [addMessage, dispatch, navigate],
  );

  const submitTranscript = useCallback(
    async (spokenText) => {
      const command = cleanCommand(spokenText);
      const commandKey = command.toLowerCase();
      const now = Date.now();
      if (
        !command
        || (commandKey === lastProcessedTranscript.current && now - lastProcessedAt.current < 5000)
      ) {
        return;
      }

      lastProcessedTranscript.current = commandKey;
      lastProcessedAt.current = now;
      setAssistantState('processing');
      setAssistantMessage('Processing command...');
      setDisplayTranscript(command);
      addMessage('user', command);
      console.log('[Twin Assistant] Speech received:', spokenText);
      console.log('[Twin Assistant] Sending command:', command);
      SpeechRecognition.stopListening();

      try {
        const action = await processAssistantCommand(command);
        console.log('[Twin Assistant] Response received:', action);
        console.log('[Twin Assistant] Detected intent:', action.metric || action.intent || action.action);
        console.log('[Twin Assistant] Action:', action.action);
        if (action.target) console.log('[Twin Assistant] Target:', action.target);
        await executeAction(action);
      } catch (error) {
        console.error('[Twin Assistant] Command failed:', error);
        setAssistantState('responding');
        const errorMessage = error.response?.data?.response || error.response?.data?.message || 'I could not process that command.';
        setAssistantMessage(errorMessage);
        addMessage('assistant', errorMessage);
      } finally {
        restartTimer.current = window.setTimeout(() => {
          lastProcessedTranscript.current = '';
          if (enabled) {
            setAssistantState('ready');
            setAssistantMessage('Ready for commands...');
            setDisplayTranscript('');
            resetTranscript();
            window.setTimeout(() => startListening({ force: true }), 250);
          }
        }, 1400);
      }
    },
    [addMessage, enabled, executeAction, resetTranscript, startListening],
  );

  useEffect(() => {
    if (enabled && finalTranscript && assistantState !== 'processing' && assistantState !== 'responding') {
      window.setTimeout(() => submitTranscript(finalTranscript), 0);
    }
  }, [assistantState, enabled, finalTranscript, submitTranscript]);

  useEffect(() => {
    const liveTranscript = transcript.trim();

    if (!enabled || assistantState === 'processing' || assistantState === 'responding' || !liveTranscript) return;

    console.log('[Twin Assistant] Transcript:', liveTranscript);
    window.setTimeout(() => {
      setAssistantState('listening');
      setDisplayTranscript(liveTranscript);
      setAssistantMessage('Listening...');
    }, 0);

    if (commandTimer.current) {
      window.clearTimeout(commandTimer.current);
    }

    commandTimer.current = window.setTimeout(() => {
      setAssistantState('ready');
      setAssistantMessage('Ready for commands...');
    }, 1200);

    return () => {
      if (commandTimer.current) {
        window.clearTimeout(commandTimer.current);
        commandTimer.current = null;
      }
    };
  }, [assistantState, enabled, transcript]);

  const toggleListening = useCallback(async () => {
    setPanelOpen(true);

    if (!enabled) {
      setAssistantMessage('Twin Assistant is disabled. Enable it in Settings.');
      return;
    }

    if (!browserSupportsSpeechRecognition) {
      setAssistantMessage('Speech recognition is not supported in this browser.');
      return;
    }

    lastProcessedTranscript.current = '';
    if (!listeningRef.current) {
      await startListening({ force: true });
    }
  }, [browserSupportsSpeechRecognition, enabled, startListening]);

  const submitTextCommand = useCallback((command) => {
    return submitTranscript(command);
  }, [submitTranscript]);

  useEffect(() => () => {
    if (restartTimer.current) window.clearTimeout(restartTimer.current);
    if (commandTimer.current) window.clearTimeout(commandTimer.current);
    SpeechRecognition.stopListening();
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      transcript: displayTranscript || transcript,
      speechActive: assistantState === 'listening' && Boolean((displayTranscript || transcript).trim()),
      messages,
      assistantState,
      assistantMessage,
      panelOpen,
      setPanelOpen,
      toggleListening,
      submitTextCommand,
    }),
    [assistantMessage, assistantState, displayTranscript, enabled, messages, panelOpen, submitTextCommand, toggleListening, transcript],
  );

  return (
    <TwinAssistantContext.Provider value={value}>
      {children}
      <TwinAssistantButton />
    </TwinAssistantContext.Provider>
  );
}

function cleanCommand(spokenText) {
  return String(spokenText || '').trim();
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatDashboardHealthResponse(result) {
  const dashboard = result?.data || {};
  const analytics = dashboard.analytics || dashboard.profile || {};
  const burnoutRisk = Number(analytics.burnoutRisk);
  const wellnessBalance = Number(analytics.wellnessBalance);

  if (Number.isFinite(burnoutRisk) && Number.isFinite(wellnessBalance)) {
    const score = clamp(Math.round((100 - burnoutRisk) * 0.35 + wellnessBalance * 0.65), 35, 96);
    return `Your current health score is ${score}%.`;
  }

  const fallbackScore = dashboard.profile?.healthScore ?? analytics.healthScore;

  if (Number.isFinite(Number(fallbackScore))) {
    return `Your current health score is ${Math.round(Number(fallbackScore))}%.`;
  }

  return 'I checked your dashboard data, but I could not find your current health score yet.';
}

function formatDashboardMetricResponse(result, metric) {
  const metrics = getDashboardMetrics(result);

  if (metric === 'healthScore' && Number.isFinite(metrics.healthScore)) {
    return `Your current health score is ${metrics.healthScore}%.`;
  }

  if (metric === 'financeScore' && Number.isFinite(metrics.financeScore)) {
    return `Your current finance score is ${metrics.financeScore}%.`;
  }

  if ((metric === 'careerScore' || metric === 'productivityScore') && Number.isFinite(metrics.productivityScore)) {
    const label = metric === 'careerScore' ? 'career score' : 'productivity score';
    return `Your current ${label} is ${metrics.productivityScore}%.`;
  }

  if (metric === 'savingsRate' && Number.isFinite(metrics.savingsRate)) {
    return `Your current savings rate is ${metrics.savingsRate}%.`;
  }

  return 'I checked your dashboard data, but I could not find that metric yet.';
}

function getDashboardMetrics(result) {
  const dashboard = result?.data || {};
  const profile = dashboard.profile || {};
  const analytics = dashboard.analytics || {};
  const burnoutRisk = pickNumber(analytics.burnoutRisk, profile.burnoutRisk);
  const wellnessBalance = pickNumber(analytics.wellnessBalance, profile.wellnessBalance);
  const productivityScore = pickNumber(analytics.productivityScore, profile.productivityScore);
  const financeScore = pickNumber(analytics.financialHealth, profile.financialHealth);
  const income = pickNumber(profile.monthlyIncome, 0);
  const expenditure = pickNumber(profile.monthlyExpenditure, 0);
  const rawSavingsRate = income > 0 ? Math.round(((income - expenditure) / income) * 100) : 0;

  return {
    healthScore: Number.isFinite(burnoutRisk) && Number.isFinite(wellnessBalance)
      ? clamp(Math.round((100 - burnoutRisk) * 0.35 + wellnessBalance * 0.65), 35, 96)
      : NaN,
    financeScore: Number.isFinite(financeScore) ? clamp(Math.round(financeScore), 0, 100) : NaN,
    productivityScore: Number.isFinite(productivityScore) ? clamp(Math.round(productivityScore), 0, 100) : NaN,
    savingsRate: income > 0 ? Math.max(0, rawSavingsRate) : NaN,
  };
}

function pickNumber(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)));
  return value === undefined ? NaN : Number(value);
}

function formatSimulationResponse(result) {
  const twinScore = result?.data?.twinScore;

  if (
    twinScore
    && Number.isFinite(Number(twinScore.current))
    && Number.isFinite(Number(twinScore.simulated))
  ) {
    return `Simulation complete. Your twin score could move from ${Math.round(Number(twinScore.current))}% to ${Math.round(Number(twinScore.simulated))}%.`;
  }

  return 'Simulation complete. I have your what-if result ready.';
}

function formatSavingsResponse(result) {
  const data = result?.data || {};
  const daily = data.daily || {};
  const onboarding = data.onboarding || {};
  const credited = Number(daily.moneyCredited || 0);
  const spent = Number(daily.moneySpent || 0);
  const monthlyIncome = Number(onboarding.monthlyIncome || 0);
  const monthlyExpenditure = Number(onboarding.monthlyExpenditure || 0);
  const savings = credited > 0 || spent > 0
    ? credited - spent
    : monthlyIncome - monthlyExpenditure;

  if (Number.isFinite(savings)) {
    return `You currently have Rs ${Math.max(0, Math.round(savings)).toLocaleString('en-IN')} in savings.`;
  }

  return 'I checked your finance data, but I could not find your current savings yet.';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
