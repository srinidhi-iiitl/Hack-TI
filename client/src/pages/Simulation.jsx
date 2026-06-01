import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  Plus,
  X,
} from 'lucide-react';

const simulationGroups = [
  {
    key: 'health',
    title: 'Health Simulation',
    icon: HeartPulse,
    tint: 'from-[#10c7a1]/18 to-[#7df3cc]/8',
    borderColor: 'border-[#10c7a1]/30',
    textColor: 'text-[#10c7a1]',
    fields: [
      { key: 'sleep', label: 'Sleep', unit: 'h', current: 6, simulated: 8, min: 4, max: 10, step: 0.5 },
      { key: 'exercise', label: 'Exercise', unit: 'x', current: 2, simulated: 4, min: 0, max: 7, step: 1 },
      { key: 'water', label: 'Water', unit: 'L', current: 1, simulated: 3, min: 0.5, max: 5, step: 0.5 },
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
      { key: 'savings', label: 'Savings', unit: 'k', prefix: 'Rs ', current: 5, simulated: 15, min: 0, max: 50, step: 1 },
      { key: 'investment', label: 'Investment', unit: 'k', prefix: 'Rs ', current: 2, simulated: 8, min: 0, max: 40, step: 1 },
      { key: 'expenses', label: 'Expenses', unit: 'k', prefix: 'Rs ', current: 20, simulated: 16, min: 5, max: 60, step: 1 },
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
      { key: 'study', label: 'Study', unit: 'h', current: 1, simulated: 3, min: 0, max: 8, step: 0.5 },
      { key: 'projects', label: 'Projects', unit: '', current: 1, simulated: 3, min: 0, max: 8, step: 1 },
      { key: 'networking', label: 'Networking', unit: '', current: 2, simulated: 5, min: 0, max: 12, step: 1 },
    ],
  },
];

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
    steps: ['Sleep +2h', 'Health +12', 'Career +5'],
  },
  {
    title: 'Money Calm',
    copy: 'Extra savings lowers background stress and frees up focus.',
    steps: ['Savings +Rs 10k', 'Stress -8', 'Focus +4', 'Career +2'],
  },
  {
    title: 'Skill Flywheel',
    copy: 'Study time compounds into career readiness and future income upside.',
    steps: ['Study +2h', 'Career +10', 'Income Potential +6', 'Finance +4'],
  },
];

const processingSteps = ['Analyzing Health', 'Analyzing Finance', 'Analyzing Career', 'Generating Cross Impact'];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const domainIcons = { Health: HeartPulse, Finance: CircleDollarSign, Career: Briefcase };
const domainAccents = { Health: 'text-[#10c7a1]', Finance: 'text-[#c8a84b]', Career: 'text-[#7b61ff]' };

const defaultAnalysis = {
  resultCards,
  impactChains,
  twinScore: { current: 76, simulated: 87 },
  source: 'demo',
};

function buildInitialValues() {
  return simulationGroups.reduce((values, group) => {
    group.fields.forEach((field) => {
      values[field.key] = field.simulated;
    });
    return values;
  }, {});
}

function buildCurrentValues() {
  return simulationGroups.reduce((values, group) => {
    group.fields.forEach((field) => {
      values[field.key] = field.current;
    });
    return values;
  }, {});
}

function formatValue(field, value) {
  return `${field.prefix || ''}${value}${field.unit || ''}`;
}

function normalizeAnalysis(data) {
  const resultCardsWithChrome = (data?.resultCards?.length ? data.resultCards : resultCards).map((card) => ({
    ...card,
    icon: domainIcons[card.label] || Brain,
    accent: domainAccents[card.label] || 'text-[#7df3cc]',
  }));

  return {
    resultCards: resultCardsWithChrome,
    impactChains: data?.impactChains?.length ? data.impactChains : impactChains,
    twinScore: data?.twinScore || defaultAnalysis.twinScore,
    source: data?.source || 'fallback',
  };
}

function Simulation() {
  const location = useLocation();
  const assistantSimulationApplied = useRef(false);
  const [currentValues, setCurrentValues] = useState(buildCurrentValues);
  const [values, setValues] = useState(buildInitialValues);
  const [customFields, setCustomFields] = useState([]);
  const [modalGroup, setModalGroup] = useState(null); // stores group key when modal is open

  // Form states for the modal input
  const [newLabel, setNewLabel] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newCurrent, setNewCurrent] = useState('');
  const [newSimulated, setNewSimulated] = useState('');

  const [phase, setPhase] = useState('build');
  const [completedSteps, setCompletedSteps] = useState(0);
  const [dotCount, setDotCount] = useState(3);
  const [analysis, setAnalysis] = useState(defaultAnalysis);
  const [isLoadingInputs, setIsLoadingInputs] = useState(true);
  const [inputError, setInputError] = useState('');
  const [analysisError, setAnalysisError] = useState('');

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentValues = async () => {
      setIsLoadingInputs(true);
      setInputError('');

      try {
        const response = await axios.get(`${API_BASE_URL}/api/simulation/current`, { headers: authHeaders });
        const payload = response.data?.data;
        if (!isMounted || !payload) return;

        setCurrentValues((current) => ({ ...current, ...payload.current }));
        setValues((current) => ({ ...current, ...payload.simulated }));
      } catch (error) {
        if (!isMounted) return;
        setInputError('Using local defaults until backend data is available.');
        console.warn('Simulation current values fallback:', error.response?.data?.message || error.message);
      } finally {
        if (isMounted) setIsLoadingInputs(false);
      }
    };

    loadCurrentValues();
    return () => {
      isMounted = false;
    };
  }, [authHeaders]);

  const handleSliderChange = (key, value) => {
    setValues((current) => ({ ...current, [key]: Number(value) }));
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
      if (tick >= 8) {
        window.clearInterval(dotTimer);
      }
    }, 300);

    const minimumRunTime = new Promise((resolve) => window.setTimeout(resolve, 2800));

    try {
      const responsePromise = axios.post(
        `${API_BASE_URL}/api/simulation/analyze`,
        { current: nextCurrentValues, simulated: nextValues },
        { headers: authHeaders },
      );
      const [response] = await Promise.all([responsePromise, minimumRunTime]);
      setAnalysis(normalizeAnalysis(response.data?.data));
    } catch (error) {
      await minimumRunTime;
      setAnalysis(normalizeAnalysis(defaultAnalysis));
      setAnalysisError('AI analysis unavailable. Showing fallback twin analysis.');
      console.warn('Simulation AI fallback:', error.response?.data?.message || error.message);
    } finally {
      window.clearInterval(dotTimer);
      setCompletedSteps(processingSteps.length);
      setPhase('result');
    }
  }, [authHeaders, currentValues, values]);

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
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
            Adjust future inputs. Watch the twin calculate before and after impact.
          </p>
          {(isLoadingInputs || inputError) && (
            <p className="mt-3 text-sm font-semibold text-[#7df3cc]/80">
              {isLoadingInputs ? 'Loading your current twin inputs...' : inputError}
            </p>
          )}
        </HeroPanel>

        <section className="grid gap-5 xl:grid-cols-3">
          {simulationGroups.map((group) => {
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
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#7b61ff] px-7 py-4 text-sm font-black text-white shadow-[0_20px_50px_-25px_rgba(255,0,127,0.9)] transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-5 w-5" />
            Start Simulation
          </button>
        </div>
      </div>

      {/* Dynamic Creation Modal popup wrapper */}
      {modalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0b111a] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h4 className="text-xl font-black capitalize tracking-tight">
                Add Custom {modalGroup} Metric
              </h4>
              <button
                type="button"
                onClick={() => setModalGroup(null)}
                className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomInput} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Metric Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Deep Sleep, Net Worth, Side Hustle"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Unit (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., %, bpm, hrs, count"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-white/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Current Value</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newCurrent}
                    onChange={(e) => setNewCurrent(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-1">Simulated Value</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newSimulated}
                    onChange={(e) => setNewSimulated(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalGroup(null)}
                  className="w-full rounded-xl bg-white/5 py-3 text-sm font-bold text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-[#ff7a00] to-[#ff007f] py-3 text-sm font-black text-white hover:opacity-90"
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
  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 left-[20rem] bg-[radial-gradient(circle_at_16%_0%,rgba(255,122,0,0.12),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(16,199,161,0.10),transparent_30%),linear-gradient(135deg,rgba(123,97,255,0.08),transparent_34%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function HeroPanel({ eyebrow, title, icon: Icon, children }) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080d15]/95 p-6 text-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)] sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(255,122,0,0.18),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(123,97,255,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_38%)]" />
      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">
          <Icon className="h-3.5 w-3.5 text-[#10c7a1]" />
          {eyebrow}
        </div>
        <h2 className="text-3xl font-black tracking-tight sm:text-5xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function SimulationCard({ group, combinedFields, currentValues, values, onChange, onAddCustom }) {
  const Icon = group.icon;

  return (
    <article className="flex flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b111a]/92 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className={`border-b border-white/10 bg-gradient-to-br ${group.tint} p-5`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="text-2xl font-black tracking-tight text-white">{group.title}</h3>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {combinedFields.map((field) => (
          <div key={field.key} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-white">{field.label}</span>
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-[#7df3cc] ring-1 ring-white/10">
                {formatValue(field, values[field.key] ?? field.simulated)}
              </span>
            </div>

            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={values[field.key] ?? field.simulated}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="w-full accent-[#10c7a1]"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ValuePill label="Current" value={formatValue(field, currentValues[field.key] ?? field.current)} />
              <ValuePill label="Simulated" value={formatValue(field, values[field.key] ?? field.simulated)} strong />
            </div>
          </div>
        ))}

        {/* Dynamic Dotted Action Button matching screenshot blueprint wireframes */}
        <button
          type="button"
          onClick={() => onAddCustom(group.key)}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed ${group.borderColor} bg-transparent py-4 text-sm font-bold ${group.textColor} transition-all duration-200 hover:bg-white/[0.02] active:scale-[0.99]`}
        >
          <Plus className="h-4 w-4" />
          Add Custom {group.title.split(' ')[0]} Input
        </button>
      </div>
    </article>
  );
}

function ValuePill({ label, value, strong = false }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${strong ? 'border-[#10c7a1]/25 bg-[#10c7a1]/10' : 'border-white/10 bg-white/[0.045]'}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/36">{label}</p>
      <p className={`mt-1 text-sm font-black ${strong ? 'text-[#7df3cc]' : 'text-white/78'}`}>{value}</p>
    </div>
  );
}

function ProcessingScreen({ completedSteps, dotCount }) {
  const dots = '.'.repeat(dotCount);

  return (
    <PageShell>
      <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-4xl items-center justify-center">
        <section className="relative w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080d15]/95 p-6 text-white shadow-[0_24px_80px_-35px_rgba(0,0,0,0.9)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,199,161,0.20),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(123,97,255,0.25),transparent_30%)]" />
          <div className="relative mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-white/12 bg-white/8">
              <Brain className="h-9 w-9 animate-pulse text-[#7df3cc]" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/48">Digital Twin Processing</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Processing{dots}</h2>

            <div className="mt-8 space-y-3 text-left">
              {processingSteps.map((step, index) => {
                const done = completedSteps > index;
                const active = completedSteps === index;
                return (
                  <div key={step} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
                    <span className="font-bold text-white/84">{step}...</span>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? 'bg-[#10c7a1] text-[#07120f]' : active ? 'bg-[#7b61ff]/25 text-white' : 'bg-white/8 text-white/28'}`}>
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
  const twinScore = analysis.twinScore || defaultAnalysis.twinScore;

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <HeroPanel eyebrow="Simulation Complete" title="Simulation Result" icon={Check}>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
            {analysis.source === 'ai' ? 'Generated from real-time AI analysis of your current and simulated values.' : analysisError || 'Generated from deterministic fallback analysis.'}
          </p>
          <div className="mt-5">
            <ScoreGauge current={twinScore.current} simulated={twinScore.simulated} />
          </div>
        </HeroPanel>

        <section className="grid gap-5 xl:grid-cols-3">
          {analysis.resultCards.map((card) => (
            <ResultCard key={card.title} card={card} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#0b111a]/92 p-5 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#7df3cc]/70">Cross Domain Analysis</p>
                <h3 className="mt-1 text-2xl font-black text-white">Impact chains</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/54">
                  The twin links cause and effect across domains, so one habit can move health, focus, and finances together.
                </p>
              </div>
              <Brain className="h-6 w-6 shrink-0 text-[#7b61ff]" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {analysis.impactChains.map((chain) => (
                <ImpactChain key={chain.title} chain={chain} />
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#1a103d] via-[#231044] to-[#132b35] p-5 text-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/48">Overall Twin Score</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <TwinScore label="Current Twin" value={twinScore.current} />
              <TwinScore label="Simulated Twin" value={twinScore.simulated} active />
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
              <div className="flex items-center justify-between text-sm font-bold text-white/70">
                <span>Before</span>
                <ArrowRight className="h-4 w-4" />
                <span>After</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#10c7a1]" />
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.065] px-5 py-3 text-sm font-black text-white/86 transition hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Run Another Simulation
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#7b61ff] px-5 py-3 text-sm font-black text-white shadow-[0_20px_50px_-25px_rgba(255,0,127,0.9)] transition hover:-translate-y-0.5"
          >
            <Save className="h-4 w-4" />
            Save Scenario
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function ResultCard({ card }) {
  const Icon = card.icon;

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#0b111a]/92 p-5 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/40">{card.title}</p>
          <h3 className="mt-1 text-2xl font-black text-white">{card.label}</h3>
        </div>
        <Icon className={`h-6 w-6 ${card.accent}`} />
      </div>

      <div className="mb-5 flex items-end gap-4">
        <span className="text-5xl font-black text-white/35">{card.from}</span>
        <ArrowRight className="mb-3 h-6 w-6 text-[#7df3cc]/65" />
        <span className="text-6xl font-black text-white">{card.to}</span>
      </div>

      <div className="grid gap-2">
        {card.signals.map((signal) => (
          <div key={signal.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
            <span className="text-sm font-bold text-white/82">{signal.label}</span>
            {signal.direction === 'up' ? <TrendingUp className="h-5 w-5 text-[#10c7a1]" /> : <TrendingDown className="h-5 w-5 text-[#ff007f]" />}
          </div>
        ))}
      </div>
    </article>
  );
}

// ... keeping standard subcomponents uniform
function ImpactChain({ chain }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.045] p-4">
      <p className="text-sm font-black text-white">{chain.title}</p>
      <p className="mt-2 min-h-12 text-xs leading-5 text-white/52">{chain.copy}</p>
      <div className="mt-4">
        {chain.steps.map((item, index) => (
          <div key={item} className="flex flex-col items-center">
            <div className="w-full rounded-2xl border border-white/10 bg-[#080d15] px-4 py-3 text-center text-base font-black text-white shadow-sm">
              {item}
            </div>
            {index < chain.steps.length - 1 && <ChevronDown className="my-2 h-6 w-6 text-[#7df3cc]/70" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreGauge({ current, simulated }) {
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (simulated / 100) * circumference;

  return (
    <div className="flex w-fit items-center gap-5 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="url(#scoreGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="9"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#ff7a00" />
            <stop offset="0.5" stopColor="#ff007f" />
            <stop offset="1" stopColor="#10c7a1" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/42">Twin Score</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-3xl font-black text-white/45">{current}</span>
          <ArrowRight className="h-5 w-5 text-white/38" />
          <span className="text-5xl font-black text-white">{simulated}</span>
        </div>
      </div>
    </div>
  );
}

function TwinScore({ label, value, active = false }) {
  return (
    <div className={`rounded-2xl border px-4 py-5 text-center ${active ? 'border-[#10c7a1]/25 bg-[#10c7a1]/10' : 'border-white/10 bg-white/[0.055]'}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className={`mt-2 text-5xl font-black ${active ? 'text-[#7df3cc]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

export default Simulation;
