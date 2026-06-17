import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Activity, BadgeIndianRupee, Briefcase, CheckCircle2, Loader2, Target, Brain, Sun } from 'lucide-react';
import { clearDailyUpdateCooldown } from '../features/dailyUpdate/dailyUpdateSlice';
import { fetchTodayDailyUpdate, submitDailyUpdate } from '../features/dailyUpdate/dailyUpdateThunks';
import axios from 'axios';
import toast from 'react-hot-toast';
import mealPlanApi from '../services/mealPlanApi';
import { useTheme } from '../context/ThemeContext';


const concernOptions = ['Headache', 'Fever', 'Fatigue', 'Stress', 'Anxiety', 'Sleep Issues', 'Other'];
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const initialForm = {
  health: {
    waterIntake: '',
    exercised: false,
    ateProperly: false,
    smokedToday: false,
    cigarettesCount: '',
    healthConcern: false,
    concernTypes: [],
    concernDescription: '',
  },
  finance: {
    spending: '',
    boughtShares: false,
    boughtShareDetails: { stockName: '', quantity: '', amount: '' },
    soldShares: false,
    soldShareDetails: { stockName: '', quantity: '', amount: '' },
    insurancePurchased: false,
    insuranceDetails: { providerName: '', amount: '' },
  },
  career: {
    studyHours: '',
    completedCourse: false,
    appliedJobs: false,
    workedOnProject: false,
  },
  goal: {
    goalId: '',
    goalIds: [],
    goalCompleted: false,
  },
};

function DailyUpdate() {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { activeGoals, completed, dailyUpdateLastSubmittedAt, error, loading, success } = useSelector((state) => state.dailyUpdate);
  const isSmoker = useSelector((state) => state.auth?.user?.smokingProfile?.smoker === true);
  const [form, setForm] = useState(initialForm);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Meal Planner State inside Daily Updates
  const [activeMealPlan, setActiveMealPlan] = useState(null);
  const [mealProgress, setMealProgress] = useState({
    breakfastCompleted: false,
    lunchCompleted: false,
    dinnerCompleted: false,
    waterCompleted: false
  });
  const [weather, setWeather] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const token = localStorage.getItem('authToken');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Helper: Get local today YYYY-MM-DD
  function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fetch active meal plan and today's progress
  const fetchActiveMealPlanAndTodayProgress = async () => {
    try {
      const res = await mealPlanApi.getMealPlans();
      if (res.success && res.data?.length > 0) {
        const active = res.data.find(p => p.status === 'active');
        if (active) {
          setActiveMealPlan(active);
          
          // Get today's progress details
          const detailRes = await mealPlanApi.getMealPlanById(active._id);
          if (detailRes.success && detailRes.progressLogs) {
            const todayStr = getTodayString();
            const todayLog = detailRes.progressLogs.find(log => log.date === todayStr);
            if (todayLog) {
              setMealProgress({
                breakfastCompleted: todayLog.breakfastCompleted || false,
                lunchCompleted: todayLog.lunchCompleted || false,
                dinnerCompleted: todayLog.dinnerCompleted || false,
                waterCompleted: todayLog.waterCompleted || false
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch active meal plan & progress logs:', e);
    }
  };

  useEffect(() => {
    fetchActiveMealPlanAndTodayProgress();

    // Fetch weather details
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await axios.post(`${API_BASE_URL}/api/health/weather-advice`, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }, authHeaders);
            if (res.data?.success) {
              setWeather(res.data.data);
            }
          } catch (e) {
            console.error('Failed to fetch weather in DailyUpdate', e);
          }
        }
      );
    }
  }, []);

  const handleToggleMealItem = async (key) => {
    if (!activeMealPlan) return;
    
    const updatedProgress = {
      ...mealProgress,
      [key]: !mealProgress[key]
    };
    
    // Optimistic UI update
    setMealProgress(updatedProgress);
    
    try {
      const todayStr = getTodayString();
      const res = await mealPlanApi.updateMealPlanProgress(activeMealPlan._id, {
        date: todayStr,
        ...updatedProgress
      });
      
      // Update local active meal plan state with returned stats
      if (res.success && res.stats) {
        setActiveMealPlan(prev => ({
          ...prev,
          progress: res.stats.adherence,
          stats: res.stats
        }));
      }
      
      toast.success('Meal plan progress logged!');
      // Dispatch sync event so other pages/drawers refresh automatically
      window.dispatchEvent(new Event('dashboard-data-updated'));
    } catch (err) {
      console.error('Failed to log meal plan progress:', err);
      toast.error('Failed to save progress.');
      // Revert state
      setMealProgress(mealProgress);
    }
  };

  const renderMealTrackingCard = () => {
    if (!activeMealPlan) return null;

    let completedCount = 0;
    if (mealProgress.breakfastCompleted) completedCount++;
    if (mealProgress.lunchCompleted) completedCount++;
    if (mealProgress.dinnerCompleted) completedCount++;
    if (mealProgress.waterCompleted) completedCount++;
    const adherencePercent = Math.round((completedCount / 4) * 100);

    return (
      <div className={`rounded-[1.5rem] p-5 sm:p-6 space-y-5 ${
        theme === 'light'
          ? 'border border-slate-200 bg-white shadow-sm text-slate-900'
          : 'border border-white/10 bg-[#0b111a]/92 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] text-white'
      }`}>
        <div className={`flex items-center justify-between border-b pb-4 ${
          theme === 'light' ? 'border-slate-200' : 'border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-50 text-[#10c7a1]'
                : 'border-white/10 bg-white/8 text-[#10c7a1]'
            }`}>
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black">Today's Meal Plan</h2>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Track your daily meal adherence</p>
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full border border-[#10c7a1]/30 bg-[#10c7a1]/10 px-2.5 py-1 text-xs font-bold text-[#10c7a1]">
              Today: {adherencePercent}% adherence
            </span>
          </div>
        </div>

        {/* Optional Weather Nutrition Tip */}
        {weather && weather.temp !== null && weather.temp !== undefined && (
          <div className="rounded-xl border border-[#7b61ff]/30 bg-[#7b61ff]/10 px-4 py-3 flex items-start gap-2.5">
            <Sun className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
              <strong>Weather Alert ({weather.temp}°C, {weather.condition}):</strong>{' '}
              {weather.isHot 
                ? 'AI recommends: Increase water intake to 3.5L+, avoid heavy oily lunches, and prefer cooling foods like fruits and curd.'
                : weather.isRainy || weather.isStormy
                ? 'AI recommends: Focus on warm, freshly cooked meals, herbal teas, and avoid street food.'
                : 'Mild weather is optimal for standard nutrition targets.'
              }
            </p>
          </div>
        )}

        {/* Meal checks */}
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: 'breakfastCompleted', label: 'Followed Breakfast', mealKey: 'breakfast' },
            { key: 'lunchCompleted', label: 'Followed Lunch', mealKey: 'lunch' },
            { key: 'dinnerCompleted', label: 'Followed Dinner', mealKey: 'dinner' },
            { key: 'waterCompleted', label: 'Completed Water Goal', desc: activeMealPlan.mealPlan?.waterIntake ?? '3L' }
          ].map(item => {
            const checked = mealProgress[item.key];
            const menuStr = item.mealKey ? activeMealPlan.mealPlan?.[item.mealKey]?.join(', ') : item.desc;
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => handleToggleMealItem(item.key)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  checked
                    ? theme === 'light'
                      ? 'border-[#10c7a1]/60 bg-[#10c7a1]/8 text-[#0e9f80]'
                      : 'border-[#10c7a1]/55 bg-[#10c7a1]/10 shadow-[0_12px_30px_-20px_rgba(16,199,161,0.5)]'
                    : theme === 'light'
                      ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/15 hover:bg-white/[0.06] text-white'
                }`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  checked
                    ? theme === 'light'
                      ? 'border-[#10c7a1] bg-[#10c7a1] text-white'
                      : 'border-[#10c7a1] bg-[#10c7a1] text-[#06110f]'
                    : theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-transparent'
                      : 'border-white/15 bg-black/20 text-transparent'
                }`}>
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <span className={`block text-xs font-black ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{item.label}</span>
                  <span className={`block text-[10px] mt-1 line-clamp-2 leading-relaxed ${
                    theme === 'light' ? 'text-slate-500' : 'text-white/40'
                  }`}>
                    {menuStr || 'Target menu items'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  useEffect(() => {
    dispatch(fetchTodayDailyUpdate());
  }, [dispatch]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const remaining = dailyUpdateLastSubmittedAt
    ? (dailyUpdateLastSubmittedAt + COOLDOWN_MS) - currentTime
    : 0;
  const cooldownText = remaining > 0
    ? `Next update available in ${formatRemainingTime(remaining)}`
    : 'Daily update available now';

  useEffect(() => {
    if (dailyUpdateLastSubmittedAt) {
      localStorage.setItem('dailyUpdateLastSubmittedAt', String(dailyUpdateLastSubmittedAt));
    }
  }, [dailyUpdateLastSubmittedAt]);

  useEffect(() => {
    if ((completed || success) && remaining <= 0) {
      localStorage.removeItem('dailyUpdateLastSubmittedAt');
      dispatch(clearDailyUpdateCooldown());
    }
  }, [completed, dispatch, remaining, success]);

  const selectedGoals = useMemo(
    () => activeGoals.filter((goal) => form.goal.goalIds.includes(goal._id)),
    [activeGoals, form.goal.goalIds],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    await dispatch(submitDailyUpdate(normalizeForm(form, isSmoker))).unwrap().catch(() => null);
    dispatch(fetchTodayDailyUpdate());
  };

  if (completed || success) {
    return (
      <div className={`min-h-[calc(100vh-112px)] px-4 py-8 sm:px-6 lg:px-8 space-y-6 transition-colors duration-200 ${
        theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#05070d] text-white'
      }`}>
        <div className={`mx-auto flex max-w-3xl flex-col items-center rounded-[1.75rem] border p-10 text-center transition ${
          theme === 'light'
            ? 'border-slate-200 bg-white shadow-sm'
            : 'border-[#10c7a1]/25 bg-[#0b111a]/95 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9)]'
        }`}>
          <CheckCircle2 className="h-16 w-16 text-[#10c7a1]" />
          <h1 className={`mt-5 text-3xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Today's Twin Check-In Completed</h1>
          <p className={`mt-3 ${theme === 'light' ? 'text-slate-500' : 'text-white/58'}`}>{cooldownText}</p>
        </div>
        {activeMealPlan && (
          <div className="mx-auto max-w-3xl w-full">
            {renderMealTrackingCard()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-112px)] px-4 py-6 sm:px-6 lg:px-8 transition-colors duration-200 ${
      theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#05070d] text-white'
    }`}>
      <div className="pointer-events-none fixed inset-0 left-[20rem] bg-[radial-gradient(circle_at_16%_0%,rgba(16,199,161,0.12),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(123,97,255,0.12),transparent_30%)]" />
      <form onSubmit={handleSubmit} className="relative mx-auto max-w-6xl space-y-6">
        <header className={`rounded-[1.75rem] border p-6 sm:p-8 transition ${
          theme === 'light'
            ? 'border-slate-200 bg-white shadow-sm'
            : 'border-white/10 bg-[#080d15]/95 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)]'
        }`}>
          <p className={`text-xs font-bold uppercase tracking-[0.28em] ${
            theme === 'light' ? 'text-[#0f9f80]' : 'text-[#7df3cc]/70'
          }`}>Daily Update</p>
          <h1 className={`mt-2 text-3xl font-black tracking-tight sm:text-5xl ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>Daily Twin Check-In</h1>
          <p className={`mt-3 text-sm leading-6 ${
            theme === 'light' ? 'text-slate-500' : 'text-white/58'
          }`}>Help your Digital Twin stay updated with today's activities.</p>
        </header>

        {error && <div className="rounded-2xl border border-[#ff4d7d]/30 bg-[#ff4d7d]/10 p-4 text-sm font-semibold text-[#ffb3ca]">{error}</div>}

        <Section icon={Activity} title="Health Check-In">
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label="Water intake today (liters)" value={form.health.waterIntake} onChange={(value) => update('health.waterIntake', value, setForm)} />
            <ToggleField label="Did you exercise today?" value={form.health.exercised} onChange={(value) => update('health.exercised', value, setForm)} />
            <ToggleField label="Did you eat properly today?" value={form.health.ateProperly} onChange={(value) => update('health.ateProperly', value, setForm)} />
            {isSmoker && <ToggleField label="Did you smoke today?" value={form.health.smokedToday} onChange={(value) => update('health.smokedToday', value, setForm)} />}
          </div>
          {isSmoker && form.health.smokedToday && (
            <div className="mt-3">
              <NumberField label="How many cigarettes did you smoke today?" value={form.health.cigarettesCount} onChange={(value) => update('health.cigarettesCount', value, setForm)} />
            </div>
          )}
          <ToggleField label="Any health concerns today?" value={form.health.healthConcern} onChange={(value) => update('health.healthConcern', value, setForm)} />
          {form.health.healthConcern && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {concernOptions.map((option) => (
                  <label key={option} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-700'
                      : 'border-white/10 bg-white/[0.045] text-white/78'
                  }`}>
                    <input
                      type="checkbox"
                      checked={form.health.concernTypes.includes(option)}
                      onChange={() => toggleConcern(option, setForm)}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {form.health.concernTypes.includes('Other') && (
                <textarea
                  value={form.health.concernDescription}
                  onChange={(event) => update('health.concernDescription', event.target.value, setForm)}
                  placeholder="Describe your symptoms, discomfort, or concerns..."
                  className={`min-h-28 w-full rounded-2xl border p-4 text-sm outline-none transition ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-[#10c7a1]'
                      : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/25 focus:border-[#10c7a1]/55'
                  }`}
                />
              )}
            </div>
          )}
        </Section>

        <Section icon={BadgeIndianRupee} title="Finance Check-In">
          <NumberField label="How much did you spend today?" value={form.finance.spending} onChange={(value) => update('finance.spending', value, setForm)} />
          <TradeBlock label="Did you buy any shares today?" enabled={form.finance.boughtShares} onToggle={(value) => update('finance.boughtShares', value, setForm)} details={form.finance.boughtShareDetails} path="finance.boughtShareDetails" setForm={setForm} />
          <TradeBlock label="Did you sell any shares today?" enabled={form.finance.soldShares} onToggle={(value) => update('finance.soldShares', value, setForm)} details={form.finance.soldShareDetails} path="finance.soldShareDetails" setForm={setForm} />
          <ToggleField label="Did you purchase any LIC or Insurance plan today?" value={form.finance.insurancePurchased} onChange={(value) => update('finance.insurancePurchased', value, setForm)} />
          {form.finance.insurancePurchased && (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Provider name" value={form.finance.insuranceDetails.providerName} onChange={(value) => update('finance.insuranceDetails.providerName', value, setForm)} />
              <NumberField label="Amount" value={form.finance.insuranceDetails.amount} onChange={(value) => update('finance.insuranceDetails.amount', value, setForm)} />
            </div>
          )}
        </Section>

        <Section icon={Briefcase} title="Career Check-In">
          <NumberField label="How many hours did you study today?" value={form.career.studyHours} onChange={(value) => update('career.studyHours', value, setForm)} />
          <div className="grid gap-4 md:grid-cols-3">
            <ToggleField label="Completed a course/module?" value={form.career.completedCourse} onChange={(value) => update('career.completedCourse', value, setForm)} />
            <ToggleField label="Applied for jobs?" value={form.career.appliedJobs} onChange={(value) => update('career.appliedJobs', value, setForm)} />
            <ToggleField label="Worked on a project?" value={form.career.workedOnProject} onChange={(value) => update('career.workedOnProject', value, setForm)} />
          </div>
        </Section>

        <Section icon={Target} title="Goal Check-In">
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              <div className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
                theme === 'light'
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-white/10 bg-white/[0.045]'
              }`}>
                <div>
                  <p className={`text-sm font-black ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Completed goals today</p>
                  <p className={`mt-1 text-xs font-semibold ${
                    theme === 'light' ? 'text-slate-500' : 'text-white/48'
                  }`}>
                    {selectedGoals.length ? `${selectedGoals.length} selected` : 'Select every goal you completed today'}
                  </p>
                </div>
                {selectedGoals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => update('goal.goalIds', [], setForm)}
                    className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                      theme === 'light'
                        ? 'border-slate-200 bg-slate-100 text-slate-500 hover:border-[#ff4d7d]/50 hover:text-[#ff4d7d]'
                        : 'border-white/10 bg-black/20 text-white/52 hover:border-[#ff4d7d]/35 hover:text-[#ffb3ca]'
                    }`}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {activeGoals.map((goal) => {
                  const selected = form.goal.goalIds.includes(goal._id);
                  return (
                    <button
                      type="button"
                      key={goal._id}
                      onClick={() => toggleGoal(goal._id, setForm)}
                      className={`flex min-h-28 items-start gap-3 rounded-2xl border p-4 text-left transition ${
                        selected
                          ? theme === 'light'
                            ? 'border-[#10c7a1]/60 bg-[#10c7a1]/8 shadow-sm text-slate-800'
                            : 'border-[#10c7a1]/55 bg-[#10c7a1]/12 shadow-[0_18px_45px_-32px_rgba(16,199,161,0.9)] text-white'
                          : theme === 'light'
                            ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                            : 'border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.065] text-white'
                      }`}
                      aria-pressed={selected}
                    >
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                        selected
                          ? theme === 'light'
                            ? 'border-[#10c7a1] bg-[#10c7a1] text-white'
                            : 'border-[#10c7a1] bg-[#10c7a1] text-[#06110f]'
                          : theme === 'light'
                            ? 'border-slate-200 bg-slate-50 text-transparent'
                            : 'border-white/15 bg-black/20 text-transparent'
                      }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-black">{goal.title}</span>
                        <span className={`mt-2 block text-xs font-semibold ${
                          theme === 'light' ? 'text-slate-500' : 'text-white/50'
                        }`}>
                          Progress: {goal.progress}% · Today's target: {goal.todayTarget}
                        </span>
                        <span className={`mt-3 block h-2 overflow-hidden rounded-full ${
                          theme === 'light' ? 'bg-slate-100' : 'bg-white/10'
                        }`}>
                          <span
                            className="block h-full rounded-full bg-[#10c7a1]"
                            style={{ width: `${Math.min(Math.max(goal.progress || 0, 0), 100)}%` }}
                          />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className={`rounded-2xl border p-4 ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-50 text-slate-500'
                : 'border-white/10 bg-white/[0.045] text-white/60'
            }`}>No active goals found. Create a goal to start tracking progress.</p>
          )}
        </Section>

        {activeMealPlan && renderMealTrackingCard()}

        <button
          type="submit"
          disabled={loading}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-sm font-black transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:shadow-none ${
            theme === 'light'
              ? 'border-transparent bg-[#10c7a1] text-[#06110f] hover:bg-[#7df3cc] shadow-md disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400'
              : 'border-[#10c7a1]/35 bg-[#10c7a1] text-[#06110f] shadow-[0_20px_50px_-25px_rgba(16,199,161,0.9)] hover:bg-[#7df3cc] disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35'
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Submit Daily Twin Check-In
        </button>
      </form>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  const { theme } = useTheme();
  return (
    <section className={`rounded-[1.5rem] p-5 sm:p-6 transition ${
      theme === 'light'
        ? 'border border-slate-200 bg-white shadow-sm text-slate-900'
        : 'border border-white/10 bg-[#0b111a]/92 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] text-white'
    }`}>
      <div className={`mb-5 flex items-center gap-3 border-b pb-5 ${
        theme === 'light' ? 'border-slate-200' : 'border-white/10'
      }`}>
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
          theme === 'light'
            ? 'border-slate-200 bg-slate-50 text-[#0f9f80]'
            : 'border-white/10 bg-white/8 text-[#7df3cc]'
        }`}>
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-2xl font-black">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function NumberField({ label, value, onChange }) {
  return <Field label={label} type="number" value={value} onChange={onChange} />;
}

function TextField({ label, value, onChange }) {
  return <Field label={label} type="text" value={value} onChange={onChange} />;
}

function Field({ label, type, value, onChange }) {
  const { theme } = useTheme();
  return (
    <label className="block">
      <span className={`mb-2 block text-xs font-bold uppercase tracking-[0.18em] ${
        theme === 'light' ? 'text-slate-500' : 'text-white/40'
      }`}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition ${
          theme === 'light'
            ? 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-[#10c7a1]'
            : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/25 focus:border-[#10c7a1]/55'
        }`}
      />
    </label>
  );
}

function ToggleField({ label, value, onChange }) {
  const { theme } = useTheme();
  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${
      theme === 'light'
        ? 'border-slate-200 bg-slate-50'
        : 'border-white/10 bg-white/[0.045]'
    }`}>
      <span className={`text-sm font-bold ${
        theme === 'light' ? 'text-slate-700' : 'text-white/82'
      }`}>{label}</span>
      <div className={`flex rounded-xl border p-1 ${
        theme === 'light'
          ? 'border-slate-200 bg-slate-100'
          : 'border-white/10 bg-black/20'
      }`}>
        {[true, false].map((option) => (
          <button
            type="button"
            key={String(option)}
            onClick={() => onChange(option)}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
              value === option
                ? theme === 'light'
                  ? 'bg-[#10c7a1] text-white shadow-sm'
                  : 'bg-[#10c7a1] text-[#06110f]'
                : theme === 'light'
                  ? 'text-slate-500 hover:text-slate-800'
                  : 'text-white/45 hover:text-white'
            }`}
          >
            {option ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

function TradeBlock({ label, enabled, onToggle, details, path, setForm }) {
  return (
    <div className="space-y-4">
      <ToggleField label={label} value={enabled} onChange={onToggle} />
      {enabled && (
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Stock name" value={details.stockName} onChange={(value) => update(`${path}.stockName`, value, setForm)} />
          <NumberField label="Quantity" value={details.quantity} onChange={(value) => update(`${path}.quantity`, value, setForm)} />
          <NumberField label="Amount" value={details.amount} onChange={(value) => update(`${path}.amount`, value, setForm)} />
        </div>
      )}
    </div>
  );
}

function update(path, value, setForm) {
  setForm((current) => {
    const next = structuredClone(current);
    const keys = path.split('.');
    let pointer = next;
    keys.slice(0, -1).forEach((key) => { pointer = pointer[key]; });
    pointer[keys.at(-1)] = value;
    return next;
  });
}

function toggleConcern(option, setForm) {
  setForm((current) => {
    const exists = current.health.concernTypes.includes(option);
    return {
      ...current,
      health: {
        ...current.health,
        concernTypes: exists
          ? current.health.concernTypes.filter((item) => item !== option)
          : [...current.health.concernTypes, option],
      },
    };
  });
}

function toggleGoal(goalId, setForm) {
  setForm((current) => {
    const goalIds = current.goal.goalIds || [];
    const exists = goalIds.includes(goalId);
    const nextGoalIds = exists ? goalIds.filter((id) => id !== goalId) : [...goalIds, goalId];
    return {
      ...current,
      goal: {
        ...current.goal,
        goalId: nextGoalIds[0] || '',
        goalIds: nextGoalIds,
        goalCompleted: nextGoalIds.length > 0,
      },
    };
  });
}

function normalizeForm(form, isSmoker = false) {
  const goalIds = Array.from(new Set([...(form.goal.goalIds || []), form.goal.goalId].filter(Boolean)));
  return {
    ...form,
    health: {
      ...form.health,
      waterIntake: Number(form.health.waterIntake || 0),
      ateProperly: Boolean(form.health.ateProperly),
      smokedToday: isSmoker ? Boolean(form.health.smokedToday) : false,
      cigarettesCount: isSmoker ? Number(form.health.cigarettesCount || 0) : 0,
    },
    finance: {
      ...form.finance,
      spending: Number(form.finance.spending || 0),
      boughtShareDetails: numericTrade(form.finance.boughtShareDetails),
      soldShareDetails: numericTrade(form.finance.soldShareDetails),
      insuranceDetails: {
        ...form.finance.insuranceDetails,
        amount: Number(form.finance.insuranceDetails.amount || 0),
      },
    },
    career: {
      ...form.career,
      studyHours: Number(form.career.studyHours || 0),
    },
    goal: {
      ...form.goal,
      goalId: goalIds[0] || '',
      goalIds,
      goalCompleted: goalIds.length > 0,
    },
  };
}

function numericTrade(value) {
  return {
    ...value,
    quantity: Number(value.quantity || 0),
    amount: Number(value.amount || 0),
  };
}

function formatRemainingTime(remaining) {
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor(
    (remaining % (1000 * 60 * 60)) / (1000 * 60),
  );
  const seconds = Math.floor(
    (remaining % (1000 * 60)) / 1000,
  );

  return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

export default DailyUpdate;
