import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useGamification } from '../context/GamificationContext';
import {
  disconnectHealthIntegration,
  fetchHealthIntegration,
  saveHealthIntegration,
} from '../features/healthIntegration/healthIntegrationSlice';
import {
  Eye, EyeOff, AlertCircle, Baby, Flower2,
  Sparkles, ChevronRight, ChevronLeft, Wifi, WifiOff,
  Cigarette, TrendingDown, CheckCircle2, Flame, Wind,
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const card = 'rounded-2xl border border-white/10 bg-[#11131a]/84 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl';
const iCard = `${card} transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#ff7a00]/30 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] cursor-pointer active:scale-[0.98]`;

// ─── Key used everywhere for persisted wearable state ─────────────────────────
const LS_FITBIT    = 'ltFitbitConnected';  // { username, connectedAt }  — set on connect
const LS_DISMISSED = 'ltWearableDismissed'; // 'true' — set when user explicitly closes the banner

// ─── Floral SVG decorations ───────────────────────────────────────────────────
function FloralDeco({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none">
      <g opacity="0.35">
        {[0,60,120,180,240,300].map((deg, i) => (
          <ellipse key={i}
            cx={60+22*Math.cos((deg*Math.PI)/180)} cy={60+22*Math.sin((deg*Math.PI)/180)}
            rx="12" ry="20"
            transform={`rotate(${deg} ${60+22*Math.cos((deg*Math.PI)/180)} ${60+22*Math.sin((deg*Math.PI)/180)})`}
            fill="currentColor" />
        ))}
        <circle cx="60" cy="60" r="10" fill="currentColor" opacity="0.8" />
      </g>
    </svg>
  );
}
function SmallFlower({ className }) {
  return (
    <svg className={className} viewBox="0 0 60 60" fill="none">
      <g opacity="0.5">
        {[0,72,144,216,288].map((deg, i) => (
          <ellipse key={i}
            cx={30+13*Math.cos((deg*Math.PI)/180)} cy={30+13*Math.sin((deg*Math.PI)/180)}
            rx="7" ry="12"
            transform={`rotate(${deg} ${30+13*Math.cos((deg*Math.PI)/180)} ${30+13*Math.sin((deg*Math.PI)/180)})`}
            fill="currentColor" />
        ))}
        <circle cx="30" cy="30" r="6" fill="currentColor" opacity="0.9" />
      </g>
    </svg>
  );
}

// ─── Cycle phase calculator ───────────────────────────────────────────────────
function computePhase(lastPeriodStr, condition = 'none') {
  if (!lastPeriodStr) return null;
  const daysSince = Math.floor((Date.now() - new Date(lastPeriodStr)) / 86400000);
  const cycleLen = condition === 'pcod' ? 35 : 28;
  const day = ((daysSince % cycleLen) + cycleLen) % cycleLen + 1;
  if (day <= 5) return { name:'Menstrual Phase', emoji:'🌸', day, cycleLen, color:'#ff6b9d', grad:'from-[#ff6b9d]/20 to-[#ffb3d1]/5', border:'border-[#ff6b9d]/30', mood:'Gentle rest & nourishment', next:'Follicular', daysToNext:6-day,
    pamper:['Rest is productive — your body is working hard. Skip intense workouts today.','Warm ginger & cinnamon tea eases cramps and boosts circulation.','Iron-rich foods (lentils, spinach, dark chocolate) replenish what you lose.','Heat therapy on the lower abdomen reduces prostaglandin-driven pain.'] };
  if (day <= 13) return { name:'Follicular Phase', emoji:'🌼', day, cycleLen, color:'#ffd166', grad:'from-[#ffd166]/20 to-[#ffe9a0]/5', border:'border-[#ffd166]/30', mood:'Rising energy & motivation', next:'Ovulation', daysToNext:14-day,
    pamper:['Energy is climbing — this is your best window for new challenges & harder workouts.','Estrogen rising boosts mood and creativity. Great time for bold decisions.','Fermented foods (yoghurt, kimchi) support gut-hormone communication.','Vitamin D & zinc support follicle development this week.'] };
  if (day <= 16) return { name:'Ovulation Phase', emoji:'✨', day, cycleLen, color:'#06d6a0', grad:'from-[#06d6a0]/20 to-[#b7ffe6]/5', border:'border-[#06d6a0]/30', mood:'Peak energy & confidence', next:'Luteal', daysToNext:17-day,
    pamper:['Peak confidence & social energy — you are magnetic today.','High-intensity workouts feel easier; testosterone peaks briefly.','Antioxidant-rich berries & leafy greens support the ovulatory surge.','Your skin glows naturally — minimal-makeup day, embrace it.'] };
  return { name:'Luteal Phase', emoji:'🌙', day, cycleLen, color:'#a78bfa', grad:'from-[#a78bfa]/20 to-[#ddd6fe]/5', border:'border-[#a78bfa]/30', mood:'Reflective, cosy & inward', next:'Menstrual', daysToNext:cycleLen-day+1,
    pamper:['Progesterone rises — cravings are real & valid. Choose magnesium-rich dark chocolate.','Gentle yoga, walks, and restorative stretching suit this reflective phase.','Complex carbs (sweet potato, oats) stabilise mood-linked serotonin.','Sleep quality may dip — lavender pillow spray and a firm screen cut-off at 10:30 PM.'] };
}

// ─── Smoking streak helper ────────────────────────────────────────────────────
function computeSmokingStreak(lastCigaretteStr) {
  if (!lastCigaretteStr) return 0;
  return Math.floor((Date.now() - new Date(lastCigaretteStr)) / 86400000);
}

// ─── Empty state card when device not connected ───────────────────────────────
// onConnect is only passed when the user has NOT yet dismissed/connected — never nag.
function NoDataCell({ label, icon: Icon, onConnect }) {
  return (
    <article className={`${card} p-5 text-center flex flex-col items-center justify-center gap-3 min-h-[140px]`}>
      <div className="h-14 w-14 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center">
        <Icon className="h-6 w-6 text-white/20" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/30">{label}</p>
        <p className="text-[11px] text-white/20 mt-0.5">No device data</p>
      </div>
      {/* Only render the CTA when onConnect is provided (first-time user only) */}
      {onConnect && (
        <button onClick={onConnect} className="text-[10px] font-semibold text-[#ff7a00]/60 hover:text-[#ff7a00] transition-colors underline underline-offset-2">
          Connect device
        </button>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Health() {
  const dispatch = useDispatch();
  const healthIntegration = useSelector((state) => state.healthIntegration);
  const [mounted, setMounted]               = useState(false);
  const [syncStatus, setSyncStatus]         = useState('idle'); // idle|syncing|connected|error
  const [syncError, setSyncError]           = useState('');
  const [wearable, setWearable]             = useState(null);
  const [weather, setWeather]               = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError]     = useState(false);
  const [dashProfile, setDashProfile]       = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ── ONE-TIME connection state ──────────────────────────────────────────────
  // Read ONCE at mount from localStorage — never re-derived on every render.
  // alreadyConnected  → user has a saved Fitbit session  → auto-sync, no prompt ever
  // promptDismissed   → user explicitly closed the banner → never show it again
  const [promptDismissed, setPromptDismissed] = useState(
    () => localStorage.getItem(LS_DISMISSED) === 'true'
  );
  // showConnectBanner: true only for brand-new users who haven't connected or dismissed
  const showConnectBanner = !healthIntegration.connected && !promptDismissed && syncStatus !== 'connected';

  // Women's health
  const [womenMode, setWomenMode]   = useState('period_setup');
  const [periodSetup, setPeriodSetup] = useState({ lastPeriod:'', condition:'none' });
  const [setupStep, setSetupStep]   = useState(0);
  const [symptoms, setSymptoms]     = useState([]);
  const [blurred, setBlurred]       = useState(false);
  const [pregWeeks, setPregWeeks]   = useState('');
  const [pregDue, setPregDue]       = useState('');
  const [phase, setPhase]           = useState(null);

  // Smoking tracker
  const [smokingMode, setSmokingMode]       = useState('view');
  const [smokingEnabled, setSmokingEnabled] = useState(() => localStorage.getItem('ltSmokingEnabled') === 'true');
  const [smokeLogLoading, setSmokeLogLoading] = useState(false);
  const [smokingData, setSmokingData]       = useState(null);

  const { triggerReward, history = [], unlockedBadges = [], availableBadges = [] } = useGamification();
  const API   = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = () => localStorage.getItem('authToken');

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    dispatch(fetchHealthIntegration());
    fetchDashProfile();

    // Women's health — localStorage only
    const savedPeriod = JSON.parse(localStorage.getItem('ltWomenHealth') || 'null');
    if (savedPeriod?.lastPeriod) {
      setPeriodSetup(savedPeriod);
      setPhase(computePhase(savedPeriod.lastPeriod, savedPeriod.condition));
      setWomenMode('period');
    }
    const savedPreg = JSON.parse(localStorage.getItem('ltPregnancy') || 'null');
    if (savedPreg?.weeks) {
      setPregWeeks(savedPreg.weeks);
      setPregDue(savedPreg.dueDate || '');
      setWomenMode('preg_dashboard');
    }

    // Smoking
    const savedSmoke = JSON.parse(localStorage.getItem('ltSmoking') || 'null');
    if (savedSmoke) setSmokingData(savedSmoke);

    // ── KEY FIX: if the user already connected before, silently re-sync.
    // No modal, no banner, no prompt — just fetch data in the background.
    fetchWeather();
  }, []);

  useEffect(() => {
    if (healthIntegration.connected) {
      setSyncStatus('connected');
      if (Object.keys(healthIntegration.deviceData || {}).length > 0) {
        setWearable(healthIntegration.deviceData);
      } else {
        fetchWearable();
      }
      localStorage.setItem(LS_DISMISSED, 'true');
      setPromptDismissed(true);
      return;
    }

    if (!healthIntegration.connected && syncStatus === 'connected') {
      localStorage.removeItem(LS_FITBIT);
      setWearable(null);
      setSyncStatus('idle');
    }
  }, [healthIntegration.connected, healthIntegration.deviceData]);

  // ── API helpers ─────────────────────────────────────────────────────────────
  async function fetchDashProfile() {
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.data?.success) setDashProfile(res.data.data);
    } catch (err) {
      console.error('Dashboard profile fetch failed', err);
    } finally {
      setProfileLoading(false);
    }
  }

  async function fetchWearable() {
    setWearable({});
    try {
      const res = await axios.get(`${API}/api/integrations/health`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.data?.success && res.data?.data?.metrics) {
        const m = res.data.data.metrics;
        m.sleepHours = parseFloat(m.sleepHours);
        setWearable(m);
        setSyncStatus('connected');
        const sleepGoal = dashProfile?.profile?.sleepHours || 7;
        if (m.steps >= 10000)                                triggerReward(50, 'Daily Step Goal Hit', '👟');
        if (m.sleepHours >= sleepGoal)                       triggerReward(40, 'Sleep Goal Achieved', '💤');
        if (m.avgHeartRate >= 55 && m.avgHeartRate <= 85)    triggerReward(30, 'Healthy Resting HR', '❤️');
        if (m.hrv > 60)                                      triggerReward(75, 'Optimal HRV Recovery', '⚡');
      } else {
        setWearable(null);
        setSyncStatus('error');
        setSyncError('Device returned no data. Check your Fitbit connection in Settings.');
      }
    } catch (err) {
      setWearable(null);
      setSyncStatus('error');
      setSyncError(err?.response?.data?.message || 'Could not reach the health service. Try reconnecting.');
    }
  }

  async function fetchWeather() {
    setWeatherLoading(true); setWeatherError(false);
    try {
      const res = await axios.get(
        'https://api.open-meteo.com/v1/forecast?latitude=25.60&longitude=85.12' +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,windspeed_10m&timezone=auto'
      );
      const d   = res.data.current;
      const temp      = Math.round(d.temperature_2m);
      const feelsLike = Math.round(d.apparent_temperature);
      const humidity  = Math.round(d.relative_humidity_2m);
      const windKph   = Math.round(d.windspeed_10m);
      const wc        = d.weathercode;
      let condition = 'Clear Sky';
      if (wc === 0) condition = 'Clear Sky';
      else if (wc <= 3)  condition = 'Partly Cloudy';
      else if (wc <= 48) condition = 'Foggy / Overcast';
      else if (wc <= 55) condition = 'Light Drizzle';
      else if (wc <= 67) condition = 'Rainy';
      else if (wc <= 77) condition = 'Snowy';
      else if (wc <= 82) condition = 'Heavy Rain';
      else condition = 'Thunderstorm';
      const isHot    = temp >= 32;
      const isRainy  = wc >= 51 && wc <= 82;
      const isStormy = wc >= 83;
      const hydrationL = temp >= 35 ? 3.8 : temp >= 28 ? 3.2 : 2.5;
      let clothingRec, activityRec;
      if (isStormy)      { clothingRec = 'Full rain gear, waterproof boots.'; activityRec = 'Stay indoors. High lightning risk today.'; }
      else if (isRainy)  { clothingRec = 'Waterproof outer layer, quick-dry fabrics.'; activityRec = 'Indoor training preferred — wet roads and low visibility.'; }
      else if (temp >= 38){ clothingRec = 'Loose open-weave linen only. Protect your neck and head.'; activityRec = 'Outdoors only before 7 AM or after 7 PM.'; }
      else if (isHot)    { clothingRec = 'Breathable cotton or linen. Light colours reflect heat.'; activityRec = 'Avoid peak sun hours 11 AM–4 PM.'; }
      else if (temp >= 24){ clothingRec = 'Light breathable layers — a kurta or linen shirt is ideal.'; activityRec = 'Full day optimal for any outdoor activity.'; }
      else if (temp <= 15){ clothingRec = 'Thermal base layer + outer shell.'; activityRec = 'Warm up well before any outdoor workout.'; }
      else { clothingRec = 'Comfortable light layers — mild and pleasant conditions.'; activityRec = 'Ideal window for any activity level.'; }
      setWeather({ temp, feelsLike, humidity, windKph, condition, isHot, isRainy, isStormy, clothingRec, activityRec, hydrationL });
    } catch { setWeatherError(true); }
    finally  { setWeatherLoading(false); }
  }

  // ── Connect modal state ────────────────────────────────────────────────────
  const [connectModal, setConnectModal]     = useState(false);
  const [connectInput, setConnectInput]     = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError]     = useState('');
  const [healthLinkDraft, setHealthLinkDraft] = useState('');
  const [healthPageError, setHealthPageError] = useState('');

  useEffect(() => {
    setHealthLinkDraft(healthIntegration.integrationLink || '');
  }, [healthIntegration.integrationLink]);

  // Only called from explicit user action (error retry or settings button)
  function handleConnect() {
    setConnectModal(true);
    setConnectInput(healthIntegration.integrationLink || healthLinkDraft || '');
    setConnectError('');
  }

  // Dismiss the one-time banner permanently
  function dismissBanner() {
    localStorage.setItem(LS_DISMISSED, 'true');
    setPromptDismissed(true);
  }

  async function handleDisconnectDevice() {
    try {
      await dispatch(disconnectHealthIntegration()).unwrap();
      localStorage.removeItem(LS_FITBIT);
      localStorage.removeItem(LS_DISMISSED);
      setWearable(null);
      setSyncStatus('idle');
      setPromptDismissed(false);
      setHealthLinkDraft('');
      setHealthPageError('');
    } catch (err) {
      setSyncError(err?.response?.data?.message || 'Could not disconnect your health device.');
      setSyncStatus('error');
    }
  }

  async function saveHealthFromPage() {
    if (!healthLinkDraft.trim()) {
      setHealthPageError('Enter your health integration link.');
      return;
    }

    setHealthPageError('');
    try {
      const saved = await dispatch(saveHealthIntegration({ integrationLink: healthLinkDraft.trim() })).unwrap();
      localStorage.setItem(LS_DISMISSED, 'true');
      setPromptDismissed(true);
      setSyncStatus('connected');
      setWearable(saved.deviceData || {});
    } catch (err) {
      setHealthPageError(err?.response?.data?.message || 'Could not save health integration.');
    }
  }

  async function submitConnect() {
    if (!connectInput.trim()) { setConnectError('Enter your health integration link.'); return; }
    setConnectLoading(true); setConnectError('');
    try {
      const saved = await dispatch(saveHealthIntegration({ integrationLink: connectInput.trim() })).unwrap();
      localStorage.setItem(LS_DISMISSED, 'true');
      setPromptDismissed(true);
      setSyncStatus('connected');
      setConnectModal(false);
      const m = saved.deviceData || {};
      setWearable(m);
      const sg = dashProfile?.profile?.sleepHours || 7;
      if (m.steps >= 10000)                             triggerReward(50, 'Daily Step Goal Hit', '👟');
      if (m.sleepHours >= sg)                           triggerReward(40, 'Sleep Goal Achieved', '💤');
      if (m.avgHeartRate >= 55 && m.avgHeartRate <= 85) triggerReward(30, 'Healthy Resting HR', '❤️');
      if (m.hrv > 60)                                   triggerReward(75, 'Optimal HRV Recovery', '⚡');
    } catch (err) {
      const msg = err?.response?.status === 401
        ? 'Session expired — please log in again.'
        : err?.response?.status === 404
        ? 'Health endpoint not found. Check your server is running on port 5000.'
        : err?.response?.data?.message || 'Connection failed. Make sure your dev server is running.';
      setConnectError(msg);
    } finally { setConnectLoading(false); }
  }

  // ── Women's health helpers ──────────────────────────────────────────────────
  function savePeriod() {
    localStorage.setItem('ltWomenHealth', JSON.stringify(periodSetup));
    setPhase(computePhase(periodSetup.lastPeriod, periodSetup.condition));
    setWomenMode('period');
  }
  function savePreg() {
    localStorage.setItem('ltPregnancy', JSON.stringify({ weeks: pregWeeks, dueDate: pregDue }));
    setWomenMode('preg_dashboard');
  }
  function resetWomen() {
    localStorage.removeItem('ltWomenHealth');
    localStorage.removeItem('ltPregnancy');
    setPeriodSetup({ lastPeriod:'', condition:'none' });
    setPregWeeks(''); setPregDue('');
    setSetupStep(0); setPhase(null); setWomenMode('period_setup');
  }

  // ── Smoking tracker helpers ─────────────────────────────────────────────────
  async function logSmokingEvent(type) {
    setSmokeLogLoading(true);
    try {
      const now     = new Date().toISOString();
      const updated = {
        ...(smokingData || { history: [], cravingsResisted: 0 }),
        lastEvent: type,
        lastEventTime: now,
        ...(type === 'smoked'
          ? { lastCigarette: now, history: [...(smokingData?.history || []), { type, time: now }].slice(-30) }
          : { cravingsResisted: (smokingData?.cravingsResisted || 0) + 1, history: [...(smokingData?.history || []), { type, time: now }].slice(-30) }),
      };
      localStorage.setItem('ltSmoking', JSON.stringify(updated));
      setSmokingData(updated);
      if (type === 'craving_resisted') triggerReward(25, 'Craving Resisted! 💪', '🚭');
      await axios.post(
        `${API}/api/health-metrics/vitals`,
        { stressLevel: type === 'smoked' ? 7 : 4, mood: type === 'smoked' ? 'stressed' : 'determined', waterLiters: 0 },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
    } catch (err) { console.error('Smoking log failed', err); }
    finally { setSmokeLogLoading(false); setSmokingMode('view'); }
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const profile      = dashProfile?.profile  || {};
  const analytics    = dashProfile?.analytics || {};
  const aiInsights   = dashProfile?.aiInsights || [];
  const name         = profile?.githubData?.name || profile?.githubUsername || 'You';
  const sleepGoal    = profile?.sleepHours    || 7;
  const exerciseFreq = profile?.exerciseFrequency || 2;
  const isSmoker     = profile?.smokingHabit === 'yes' || smokingEnabled;
  const smokingStreak = computeSmokingStreak(smokingData?.lastCigarette);
  const burnoutRisk  = analytics?.burnoutRisk   ?? null;
  const wellnessScore = analytics?.wellnessBalance ?? null;
  const wearableReady = wearable && Object.keys(wearable).length > 0 && wearable.steps !== undefined;

  const metrics = [
    { key:'hr',       label:'Heart Rate', icon:HeartPulseIcon, value:wearable?.avgHeartRate??null,
      display:wearable?.avgHeartRate ? `${wearable.avgHeartRate} bpm` : null,
      ring:wearable?.avgHeartRate ? Math.min(100,Math.round(100-Math.abs(wearable.avgHeartRate-70)*2)) : null,
      good:wearable?.avgHeartRate>=55&&wearable?.avgHeartRate<=85, tone:'primary' },
    { key:'sleep',    label:'Sleep', icon:MoonIcon, value:wearable?.sleepHours??null,
      display:wearable?.sleepHours!=null ? `${wearable.sleepHours}h / ${sleepGoal}h` : null,
      ring:wearable?.sleepHours!=null ? Math.min(100,Math.round((wearable.sleepHours/sleepGoal)*100)) : null,
      good:wearable?.sleepHours>=sleepGoal*0.875, tone:'warm' },
    { key:'steps',    label:'Steps', icon:RunIcon, value:wearable?.steps??null,
      display:wearable?.steps!=null ? wearable.steps.toLocaleString() : null,
      ring:wearable?.steps!=null ? Math.min(100,Math.round((wearable.steps/10000)*100)) : null,
      good:wearable?.steps>=8000, tone:'primary' },
    { key:'hrv',      label:'HRV', icon:BalanceIcon, value:wearable?.hrv??null,
      display:wearable?.hrv!=null ? `${wearable.hrv} ms` : null,
      ring:wearable?.hrv!=null ? Math.min(100,wearable.hrv) : null,
      good:wearable?.hrv>=55, tone:'neutral' },
    { key:'calories', label:'Calories', icon:FlameIconSvg, value:wearable?.activeCalories??null,
      display:wearable?.activeCalories!=null ? `${wearable.activeCalories} kcal` : null,
      ring:wearable?.activeCalories!=null ? Math.min(100,Math.round((wearable.activeCalories/600)*100)) : null,
      good:wearable?.activeCalories>=400, tone:'sky' },
  ];

  const healthHistory = history.filter(l => ['👟','💤','❤️','⚡','🧬','💧','🚭'].includes(l.emoji)).slice(0,6);
  const healthBadges  = availableBadges.filter(b => ['fitbit','sleep_master','first_step','hydration_hero','heart_health'].includes(b.id));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-full overflow-hidden bg-[#06080f] px-6 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,0,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,143,132,0.12),transparent_24%)]" />

      <div className="relative space-y-8">

        {/* ── HEADER ── */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Health Dashboard</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/55">
              {profileLoading ? 'Waking up your Digital Twin…'
               : wearableReady && burnoutRisk !== null && burnoutRisk > 65
                ? `Burnout risk is at ${burnoutRisk}% — your Fitbit is showing the strain. Let's make today a recovery day.`
               : wearableReady && wearable.hrv >= 55
                ? `HRV ${wearable.hrv}ms, ${wearable.steps?.toLocaleString()} steps, ${wearable.sleepHours}h sleep. Your Twin says: you're in good shape today.`
               : burnoutRisk !== null && burnoutRisk > 65
                ? `Your profile puts burnout risk at ${burnoutRisk}%. Protecting sleep and reducing stress are the two highest-leverage moves right now.`
               : wellnessScore !== null
                ? `Wellness score: ${wellnessScore}/100 — driven by your sleep, exercise, and stress patterns from onboarding.`
               : `Your Digital Twin is ready. Add a wearable and it'll start reading your body in real time.`}
            </p>
          </div>

          {/* ── HEADER RIGHT: sync badge or quiet re-connect link only ── */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {syncStatus === 'connected' ? (
              // ✅ Already connected — just show the green badge
              <div className="flex items-center gap-2 rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 px-4 py-2 text-sm font-bold text-[#16a34a]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-[#16a34a] opacity-75" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                </span>
                Health Device Connected
              </div>
            ) : syncStatus === 'error' ? (
              // ⚠️ Sync failed — show error + reconnect link (user explicitly clicks)
              <div className="rounded-xl border border-[#ea580c]/30 bg-[#ea580c]/10 px-4 py-2.5 text-sm max-w-xs">
                <p className="font-bold text-[#ea580c]">Sync failed</p>
                <p className="text-[11px] text-[#ea580c]/70 mt-0.5">{syncError}</p>
                <button onClick={handleConnect} className="text-[11px] font-bold text-[#ea580c] underline mt-1">
                  Reconnect →
                </button>
              </div>
            ) : healthIntegration.loading ? (
              // 🔄 Was connected before but sync hasn't resolved yet — quiet spinner
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/35">
                <div className="h-3 w-3 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                Syncing…
              </div>
            ) : (
              // 🆕 Brand-new user — show the prominent CTA only if banner not dismissed
              showConnectBanner && (
                <button onClick={handleConnect}
                  className="flex items-center gap-2 rounded-xl border border-[#ff4d7d]/50 bg-[#ff4d7d]/10 px-5 py-2.5 text-sm font-bold text-[#ff4d7d] hover:bg-[#ff4d7d]/20 transition-all">
                  <Wifi className="h-4 w-4" /> Connect Health Device
                </button>
              )
            )}
            {wearableReady && (
              <p className="text-[10px] text-white/25 text-right">
                Last sync: just now · {wearable.steps?.toLocaleString()} steps logged
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-[#34d399]">
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Health API Integration</h2>
                  <p className={`mt-1 text-[11px] font-bold uppercase tracking-[0.16em] ${healthIntegration.connected ? 'text-[#10c7a1]' : 'text-white/35'}`}>
                    {healthIntegration.connected ? 'Gargi Fitband Connected' : 'Connect Gargi Fitband'}
                  </p>
                </div>
              </div>
              {!healthIntegration.connected && (
                <button
                  type="button"
                  onClick={() => dispatch(fetchHealthIntegration())}
                  disabled={healthIntegration.loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/50 transition hover:bg-white/8 hover:text-white disabled:opacity-40"
                >
                  <span className={`h-3 w-3 rounded-full border-2 border-white/20 border-t-white/60 ${healthIntegration.loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              )}
            </div>

            {healthIntegration.connected ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="min-w-0 w-full">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Connected Link
                  </p>
                  <p className="w-full truncate rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/65">
                    {healthIntegration.integrationLink || 'Gargi Fitband connected'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectDevice}
                  disabled={healthIntegration.saving}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-[#ea580c]/30 bg-[#ea580c]/10 px-4 py-2 text-sm font-bold text-[#ea580c] transition hover:bg-[#ea580c]/18 disabled:opacity-40"
                >
                  {healthIntegration.saving ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Health Integration Link
                  </label>
                  <input
                    type="text"
                    value={healthLinkDraft}
                    onChange={(event) => setHealthLinkDraft(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && saveHealthFromPage()}
                    placeholder="https://gargi-fitband/user/12345"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-[#34d399]/50"
                  />
                  {healthPageError && <p className="mt-2 text-xs font-semibold text-[#ea580c]">{healthPageError}</p>}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <button
                    type="button"
                    onClick={saveHealthFromPage}
                    disabled={healthIntegration.saving || !healthLinkDraft.trim()}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#10c7a1]/35 bg-[#10c7a1]/12 px-4 py-2 text-sm font-bold text-[#10c7a1] transition hover:bg-[#10c7a1]/20 disabled:opacity-40"
                  >
                    {healthIntegration.saving ? 'Saving...' : 'Connect'}
                  </button>
                </div>
              </div>
            )}

            {healthIntegration.connected && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-white/50">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Provider: Gargi Fitband</span>
                <span className="rounded-full border border-[#10c7a1]/20 bg-[#10c7a1]/10 px-3 py-1.5 text-[#10c7a1]">Status: Synced</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  Last sync: {healthIntegration.lastSync ? new Date(healthIntegration.lastSync).toLocaleString() : 'Just now'}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── ONE-TIME CONNECT BANNER (new users only, dismissible) ── */}
        {showConnectBanner && (
          <section>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ff4d7d]/20 bg-gradient-to-r from-[#ff4d7d]/8 to-[#a78bfa]/8 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-[#ff4d7d]/15 flex items-center justify-center">
                  <Wifi className="h-4 w-4 text-[#ff4d7d]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Connect your wearable for live data</p>
                  <p className="text-xs text-white/40 mt-0.5">Your Digital Twin reads steps, sleep, heart rate, and HRV automatically once connected.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={handleConnect}
                  className="rounded-xl border border-[#ff4d7d]/40 bg-[#ff4d7d]/15 px-4 py-2 text-xs font-bold text-[#ff4d7d] hover:bg-[#ff4d7d]/25 transition-all">
                  Connect now
                </button>
                <button onClick={dismissBanner}
                  className="h-7 w-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all text-xs"
                  title="Dismiss — you can reconnect from Settings anytime">
                  ✕
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── DEV TOOLBAR ── */}
        {import.meta.env.DEV && (
          <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Demo controls</span>
            <div className="flex flex-wrap gap-2 ml-2">
              <button
                onClick={() => { const next = !smokingEnabled; setSmokingEnabled(next); localStorage.setItem('ltSmokingEnabled', String(next)); }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${smokingEnabled ? 'border-[#f59e0b]/50 bg-[#f59e0b]/15 text-[#f59e0b]' : 'border-white/10 bg-white/5 text-white/35 hover:bg-white/8'}`}>
                🚬 Quit Companion {smokingEnabled ? 'ON' : 'OFF'}
              </button>
              <button onClick={fetchWearable} disabled={syncStatus === 'syncing'}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/35 hover:bg-white/8 transition-all disabled:opacity-40">
                ⌚ Re-sync Mock Data
              </button>
            </div>
          </section>
        )}

        {/* ── METRIC CARDS ── */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {metrics.map(m => m.value != null
            // Connected card
            ? <MetricCard key={m.key} metric={m} mounted={mounted} />
            // Empty card — only pass onConnect for brand-new users so we don't nag returning ones
            : <NoDataCell key={m.key} label={m.label} icon={m.icon}
                onConnect={showConnectBanner ? handleConnect : undefined} />
          )}
        </section>

        {/* ── GAMIFICATION: Achievements & XP ── */}
        <section>
          <article className={`${card} border-[#10c7a1]/20 bg-gradient-to-br from-[#10c7a1]/5 to-[#06080f] p-6`}>
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <TrophyIcon className="h-5 w-5 text-[#10c7a1]" /> Health Achievements
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  {wearableReady
                    ? `Synced from your device · ${wearable.steps?.toLocaleString()} steps · ${wearable.sleepHours}h sleep · HRV ${wearable.hrv}ms`
                    : 'Your milestones are validated the moment your device data arrives — no manual logging needed.'}
                </p>
              </div>
              {wearableReady && (
                <span className="shrink-0 rounded-xl border border-[#10c7a1]/30 bg-[#10c7a1]/10 px-3 py-1.5 text-xs font-bold text-[#10c7a1]">
                  Live · just synced
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl bg-black/20 border border-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Recent Rewards</p>
                {healthHistory.length > 0 ? (
                  <div className="space-y-2.5">
                    {healthHistory.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/8 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{log.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-white/85">{log.activity}</p>
                            <p className="text-[10px] text-white/30">Validated from wearable</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#10c7a1] bg-[#10c7a1]/10 px-3 py-1 rounded-full">+{log.points} XP</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <WifiOff className="h-8 w-8 text-white/10 mb-3" />
                    <p className="text-sm text-white/30">No rewards validated yet.</p>
                    <p className="text-xs text-white/20 mt-1">Hit your goals and rewards appear here automatically.</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-black/20 border border-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Badges</p>
                {healthBadges.length > 0 ? (
                  <div className="space-y-3">
                    {healthBadges.map(badge => {
                      const earned = unlockedBadges.includes(badge.id);
                      return (
                        <div key={badge.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${earned ? 'bg-gradient-to-r from-[#10c7a1]/10 to-transparent border-[#10c7a1]/30' : 'bg-white/3 border-white/5 opacity-40 grayscale'}`}>
                          <span className="text-2xl">{badge.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${earned ? 'text-[#10c7a1]' : 'text-white/45'}`}>{badge.title}</p>
                            <p className="text-[10px] text-white/25 truncate">{badge.requirement}</p>
                          </div>
                          {earned && <span className="text-[10px] font-bold text-[#10c7a1] bg-[#10c7a1]/15 px-2 py-0.5 rounded-full shrink-0">Earned</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span className="text-4xl mb-3">🏅</span>
                    <p className="text-sm text-white/30">Badges appear here once you start hitting your health targets.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">
                {name !== 'You' ? `${name}'s milestone targets` : 'Your milestone targets'}
              </p>
              <div className={`grid gap-3 ${isSmoker ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
                {[
                  { icon:'👟', label:`${(10000).toLocaleString()} steps`, pts:'50 XP', sub:'Daily step goal', active: wearableReady && wearable.steps >= 10000 },
                  { icon:'💤', label:`${sleepGoal}h sleep`,               pts:'40 XP', sub:'From your onboarding', active: wearableReady && wearable.sleepHours >= sleepGoal },
                  { icon:'❤️', label:'Healthy HR',                         pts:'30 XP', sub:'55–85 bpm at rest',   active: wearableReady && wearable.avgHeartRate >= 55 && wearable.avgHeartRate <= 85 },
                  { icon:'⚡', label:'HRV above 60ms',                     pts:'75 XP', sub:'Deep recovery zone',   active: wearableReady && wearable.hrv > 60 },
                  ...(isSmoker ? [{ icon:'🚭', label:'Craving resisted', pts:'25 XP', sub:'Quit Companion win', active: (smokingData?.cravingsResisted ?? 0) > 0 }] : []),
                ].map(item => (
                  <div key={item.icon} className={`rounded-xl border p-3 text-center transition-all ${item.active ? 'bg-[#10c7a1]/10 border-[#10c7a1]/30' : 'bg-white/4 border-white/5'}`}>
                    <span className="text-2xl">{item.icon}</span>
                    <p className={`mt-2 text-xs font-bold ${item.active ? 'text-[#10c7a1]' : 'text-white/65'}`}>{item.label}</p>
                    <p className="text-[10px] text-white/28">{item.sub}</p>
                    <p className={`mt-1.5 text-xs font-bold ${item.active ? 'text-[#10c7a1]' : 'text-white/40'}`}>{item.active ? '✓ Earned!' : item.pts}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        {/* ── WEATHER ── */}
        <section>
          <article className="rounded-[1.6rem] border border-[#ff7a00]/20 bg-gradient-to-br from-[#11131a] to-[#1a1110] p-6">
            {weatherLoading && (
              <div className="flex items-center gap-3 py-4">
                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                <span className="text-sm text-white/40">Fetching live weather for Patna, Bihar…</span>
              </div>
            )}
            {weatherError && (
              <div className="flex items-center gap-3 rounded-xl bg-[#ea580c]/10 border border-[#ea580c]/20 px-4 py-3">
                <AlertCircle className="h-5 w-5 text-[#ea580c]" />
                <p className="text-sm text-[#ea580c]/80">Weather service unreachable. Check your connection.</p>
              </div>
            )}
            {weather && !weatherLoading && (
              <>
                <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white ${weather.isHot ? 'bg-gradient-to-br from-[#ff7a00] to-[#ff4d7d]' : weather.isRainy ? 'bg-gradient-to-br from-[#2f83b7] to-[#0f8f84]' : 'bg-gradient-to-br from-[#416f82] to-[#0f8f84]'}`}>
                      {weather.isHot ? <SunIcon className="h-7 w-7" /> : <CloudIcon className="h-7 w-7" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/45">Live · Patna, Bihar</p>
                      <p className="mt-0.5 text-3xl font-bold text-white">
                        {weather.temp}°C <span className="text-sm font-medium text-white/45">— {weather.condition}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Pill label={`Feels ${weather.feelsLike}°C`} />
                    <Pill label={`${weather.humidity}% humidity`} />
                    <Pill label={`${weather.windKph} km/h wind`} />
                    {weather.isHot && <Pill label="⚠️ UV High" warn />}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <WeatherCard accent="#ffb38a" icon={<DropIcon className="h-4 w-4" />} title="Hydration Target"
                    value={`${weather.hydrationL} L today`}
                    desc={`At ${weather.temp}°C with ${weather.humidity}% humidity — ${weather.hydrationL > 2.5 ? 'elevated sweat loss, front-load your intake before noon' : 'standard target, spread evenly through the day'}.`} />
                  <WeatherCard accent="#7df3cc" icon={<FemaleIcon className="h-4 w-4" />} title="What to Wear"
                    value={weather.isHot ? 'Loose Linen / Cotton' : weather.isRainy ? 'Waterproof Layer' : 'Light Layers'}
                    desc={weather.clothingRec} />
                  <WeatherCard accent="#c8a84b" icon={<RunIcon className="h-4 w-4" />} title="Activity Window"
                    value={weather.isHot ? 'Before 8 AM · After 7 PM' : weather.isRainy ? 'Indoor Training' : 'All Day Optimal'}
                    desc={weather.activityRec} />
                </div>
              </>
            )}
          </article>
        </section>

        {/* ── BLOOM COMPANION + DAILY MATRIX ── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <article className="relative flex flex-col rounded-[1.6rem] border border-[#ffb3d1]/20 bg-gradient-to-br from-[#0b0f16]/95 via-[#12080e]/80 to-[#0b0f16]/95 p-6 xl:col-span-6 overflow-hidden min-h-[520px]">
            <FloralDeco className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 text-[#ff6b9d] opacity-20" />
            <FloralDeco className="pointer-events-none absolute -bottom-12 -left-10 h-48 w-48 text-[#c084fc] opacity-10" />
            <SmallFlower className="pointer-events-none absolute top-1/2 right-4 h-16 w-16 text-[#ffd166] opacity-15" />
            <SmallFlower className="pointer-events-none absolute top-20 left-6 h-12 w-12 text-[#ff6b9d] opacity-10" />
            <button onClick={() => setBlurred(b => !b)}
              className="absolute top-5 right-5 z-50 h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              title={blurred ? 'Show' : 'Hide for privacy'}>
              {blurred ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <div className={`relative z-10 flex flex-col h-full transition-all duration-500 ${blurred ? 'blur-md opacity-30 select-none pointer-events-none' : ''}`}>
              {womenMode === 'period_setup'   && <PeriodSetup step={setupStep} setStep={setSetupStep} setup={periodSetup} setSetup={setPeriodSetup} onComplete={savePeriod} />}
              {womenMode === 'period'         && phase && <PeriodTracker phase={phase} setup={periodSetup} symptoms={symptoms} toggleSym={s => setSymptoms(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s])} onMissed={() => setWomenMode('troubleshoot')} onPreg={() => setWomenMode('preg_setup')} onReset={resetWomen} wearable={wearableReady ? wearable : null} />}
              {womenMode === 'troubleshoot'   && <TroubleshootPanel condition={periodSetup.condition} wearable={wearableReady ? wearable : null} onBack={() => setWomenMode('period')} onConfirm={() => setWomenMode('preg_setup')} />}
              {womenMode === 'preg_setup'     && <PregSetup weeks={pregWeeks} setWeeks={setPregWeeks} due={pregDue} setDue={setPregDue} onSave={savePreg} onBack={() => setWomenMode('period')} />}
              {womenMode === 'preg_dashboard' && <PregDashboard weeks={parseInt(pregWeeks)||6} due={pregDue} weather={weather} onReset={resetWomen} onBack={() => setWomenMode('period')} />}
            </div>
          </article>

          <article className={`${iCard} p-6 xl:col-span-6 flex flex-col`}>
            <div className="mb-5 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-white">Daily Optimization Matrix</h2>
              <p className="mt-1 text-sm text-white/50">
                {wearableReady
                  ? `${name !== 'You' ? name + "'s" : 'Your'} live signals · just synced from Fitbit`
                  : profileLoading ? 'Loading your profile…'
                  : `${name !== 'You' ? 'Hey ' + name + ', this' : 'This'} is built from your onboarding profile — connect a device to make it live`}
              </p>
            </div>
            {wearableReady ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 grow">
                <div className="rounded-xl bg-[#fbf9f8] p-5 border border-[#e4e2e1] flex flex-col">
                  <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                    <div className="p-1.5 rounded-md bg-[#ffdad2]"><MoonIcon className="h-4 w-4 text-[#ea580c]" /></div>
                    What the data flags
                  </div>
                  <div className="space-y-3 text-sm leading-relaxed flex-1">
                    {wearable.sleepHours < sleepGoal && <GapItem text={`Sleep was ${wearable.sleepHours}h — ${(sleepGoal - wearable.sleepHours).toFixed(1)}h short of your ${sleepGoal}h target.`} />}
                    {wearable.hrv < 55 && <GapItem text={`HRV at ${wearable.hrv}ms — your nervous system needs rest today.`} />}
                    {wearable.avgHeartRate > 85 && <GapItem text={`Resting HR is ${wearable.avgHeartRate} bpm — elevated, likely from stress or poor sleep.`} />}
                    {isSmoker && <GapItem text="Smoking is measurably raising your resting HR and suppressing HRV recovery." />}
                    {wearable.sleepHours >= sleepGoal && wearable.hrv >= 55 && wearable.avgHeartRate <= 85 && (
                      <div className="flex items-start gap-2.5 text-[#16a34a]">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" />
                        <p>All recovery signals look healthy — you're set for a strong day.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-[#eef6f8] p-5 border border-[#c8dbe2] flex flex-col">
                  <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#16a34a]">
                    <div className="p-1.5 rounded-md bg-[#e6f1f4]"><AutoIcon className="h-4 w-4 text-[#16a34a]" /></div>
                    Your plan for today
                  </div>
                  <div className="space-y-3 text-sm text-[#16a34a] leading-relaxed flex-1">
                    <ActionItem text={`Drink ${weather?.hydrationL ?? 2.5}L — front-load before noon.`} />
                    {wearable.steps < 10000 && <ActionItem text={`${(10000 - wearable.steps).toLocaleString()} steps remaining to hit your goal.`} />}
                    {wearable.hrv < 55
                      ? <ActionItem text="HRV is low — swap today's workout for a 20-min walk or yoga." />
                      : <ActionItem text={weather?.isHot ? 'Outdoor workout after 7 PM to avoid heat strain.' : 'Conditions are clear for a full workout today.'} />}
                    <ActionItem text="Screens off by 10:30 PM — the highest-impact sleep intervention." />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grow flex flex-col gap-4">
                <div className="rounded-xl border border-[#ff7a00]/20 bg-[#ff7a00]/5 px-4 py-3 flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-[#ff7a00] shrink-0" />
                  <p className="text-xs text-[#ff7a00]/80">No live wearable — showing goal-based plan from your profile.</p>
                </div>
                {!profileLoading && profile.sleepHours && (
                  <div className="rounded-xl bg-[#eef6f8] p-5 border border-[#c8dbe2] flex-1">
                    <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#16a34a]">
                      <div className="p-1.5 rounded-md bg-[#e6f1f4]"><AutoIcon className="h-4 w-4 text-[#16a34a]" /></div>
                      Goal-based plan
                    </div>
                    <div className="space-y-3 text-sm text-[#16a34a] leading-relaxed">
                      <ActionItem text={`Target ${sleepGoal}h sleep · ${exerciseFreq} workout sessions this week.`} />
                      <ActionItem text={`Drink ${weather?.hydrationL ?? 2.5}L water${weather?.isHot ? ' — heat increases your needs today' : ''}.`} />
                      {isSmoker && <ActionItem text="Each cigarette-free hour lowers your resting HR noticeably." />}
                      <ActionItem text="Screens off by 10:30 PM — the single most effective sleep lever." />
                    </div>
                  </div>
                )}
                {/* Only show the connect CTA inside the matrix for brand-new users */}
                {showConnectBanner && (
                  <button onClick={handleConnect}
                    className="mt-auto w-full py-2.5 rounded-xl border border-[#ff4d7d]/30 bg-[#ff4d7d]/8 text-sm font-bold text-[#ff4d7d] hover:bg-[#ff4d7d]/15 transition-all">
                    Connect device to unlock live insights →
                  </button>
                )}
              </div>
            )}
          </article>
        </section>

        {/* ── SMOKING TRACKER ── */}
        {isSmoker && (
          <section>
            <article className={`${card} border-[#f59e0b]/20 bg-gradient-to-br from-[#1a1208]/95 to-[#0b0f16]/95 p-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#f59e0b]/30 to-[#ea580c]/20 flex items-center justify-center">
                    <Cigarette className="h-5 w-5 text-[#f59e0b]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Quit Companion</h2>
                    <p className="text-sm text-white/45">Your personal tracker for breaking the habit — one day at a time.</p>
                  </div>
                </div>
                {smokingMode === 'view' && (
                  <button onClick={() => setSmokingMode('log')}
                    className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-2 text-sm font-bold text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-all">
                    Log Now
                  </button>
                )}
              </div>
              {smokingMode === 'log' ? (
                <div className="flex flex-col items-center gap-5 py-4">
                  <p className="text-base font-semibold text-white/80 text-center">What happened just now?</p>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <button onClick={() => logSmokingEvent('smoked')} disabled={smokeLogLoading}
                      className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-[#ea580c]/30 bg-[#ea580c]/10 hover:bg-[#ea580c]/20 transition-all disabled:opacity-50">
                      <span className="text-3xl">🚬</span>
                      <span className="text-sm font-bold text-[#ea580c]">I smoked</span>
                      <span className="text-[10px] text-white/35">No judgment — log it</span>
                    </button>
                    <button onClick={() => logSmokingEvent('craving_resisted')} disabled={smokeLogLoading}
                      className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-[#16a34a]/30 bg-[#16a34a]/10 hover:bg-[#16a34a]/20 transition-all disabled:opacity-50">
                      <span className="text-3xl">💪</span>
                      <span className="text-sm font-bold text-[#16a34a]">Resisted</span>
                      <span className="text-[10px] text-white/35">+25 XP earned</span>
                    </button>
                  </div>
                  <button onClick={() => setSmokingMode('view')} className="text-xs text-white/25 hover:text-white transition-all">Cancel</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/8 p-5 flex flex-col items-center justify-center text-center">
                    {smokingData?.lastCigarette ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]/60 mb-2">Smoke-free streak</p>
                        <p className="text-5xl font-black text-white">{smokingStreak}</p>
                        <p className="text-sm text-white/50 mt-1">{smokingStreak === 1 ? 'day' : 'days'}</p>
                        {smokingStreak >= 7  && <p className="mt-3 text-xs text-[#f59e0b] font-bold">🔥 One week! Circulation is improving.</p>}
                        {smokingStreak >= 30 && <p className="mt-1 text-xs text-[#16a34a] font-bold">🌿 30 days! Lung function is recovering.</p>}
                      </>
                    ) : (
                      <><span className="text-4xl mb-2">🕐</span><p className="text-sm text-white/40">Log your first event to start your streak.</p></>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="h-4 w-4 text-[#16a34a]" />
                      <p className="text-xs font-bold uppercase tracking-wider text-[#16a34a]">What's happening in your body</p>
                    </div>
                    <div className="space-y-2.5">
                      {smokingStreak >= 1  && <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-[#16a34a] shrink-0 mt-0.5" /><p className="text-xs text-white/60">Oxygen levels in blood are returning to normal.</p></div>}
                      {smokingStreak >= 3  && <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-[#16a34a] shrink-0 mt-0.5" /><p className="text-xs text-white/60">Carbon monoxide is clearing — energy levels rising.</p></div>}
                      {smokingStreak >= 7  && <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-[#16a34a] shrink-0 mt-0.5" /><p className="text-xs text-white/60">Circulation improving — HRV should start to rise.</p></div>}
                      {smokingStreak >= 14 && <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-[#16a34a] shrink-0 mt-0.5" /><p className="text-xs text-white/60">Lung capacity measurably better. Exercise gets easier.</p></div>}
                      {smokingStreak < 1   && <p className="text-xs text-white/30 italic">Your recovery timeline will show here once you start logging.</p>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#a78bfa]/20 bg-[#a78bfa]/8 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-[#a78bfa]" />
                      <p className="text-xs font-bold uppercase tracking-wider text-[#a78bfa]">Your data says</p>
                    </div>
                    {wearableReady ? (
                      <p className="text-sm text-white/70 leading-relaxed">
                        {wearable.hrv < 55
                          ? `Your HRV is ${wearable.hrv}ms — smoking is actively suppressing your recovery. Each cigarette-free day pushes this number up.`
                          : wearable.avgHeartRate > 75
                          ? `Your resting HR is ${wearable.avgHeartRate} bpm. Quitting for 7 days typically drops resting HR by 5–8 bpm in smokers.`
                          : `Your HRV is ${wearable.hrv}ms and climbing. Staying smoke-free is working — keep going.`}
                      </p>
                    ) : (
                      <p className="text-sm text-white/55 leading-relaxed">
                        {smokingStreak >= 14 ? `${smokingStreak} days strong. Lung capacity is measurably recovering.`
                         : smokingStreak >= 7 ? `One week smoke-free. Circulation is actively improving.`
                         : smokingStreak >= 1 ? `${smokingStreak} day${smokingStreak > 1 ? 's' : ''} since your last cigarette. The cravings are loudest now — resisting them is where the real change happens.`
                         : `Your Digital Twin already knows you smoke — every smoke-free hour matters.`}
                      </p>
                    )}
                    {(smokingData?.cravingsResisted ?? 0) > 0 && (
                      <p className="mt-3 text-xs text-[#a78bfa] font-semibold">
                        🏆 {smokingData.cravingsResisted} {smokingData.cravingsResisted === 1 ? 'craving' : 'cravings'} resisted total
                      </p>
                    )}
                  </div>
                </div>
              )}
            </article>
          </section>
        )}

        {/* ── CROSS INSIGHTS + RECOVERY TRAJECTORY ── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <article className={`${iCard} p-6 xl:col-span-5`}>
            <div className="mb-5 flex items-center justify-between border-b border-[#d8e5ea] pb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#1b1c1c]">Cross-Signal Insights</h2>
                <p className="text-sm text-[#596467] mt-1">
                  {wearableReady
                    ? `From live Fitbit data · ${weather ? weather.temp + '°C outside' : ''}`
                    : 'Your profile powers these — connect a device to make them precise.'}
                </p>
              </div>
              <SparkIcon className="h-6 w-6 text-[#416f82] shrink-0" />
            </div>
            <div className="space-y-4">
              {wearableReady ? (
                <>
                  <FeedItem color={wearable.steps >= 8000 ? '#16a34a' : '#ea580c'} title="Steps & Sleep Quality"
                    text={wearable.steps >= 8000
                      ? `${wearable.steps.toLocaleString()} steps today — this volume is strongly correlated with faster deep-sleep onset tonight.`
                      : `${(10000 - wearable.steps).toLocaleString()} steps remaining. More movement today will directly improve your sleep depth.`}
                    isGood={wearable.steps >= 8000} />
                  <FeedItem color={wearable.hrv >= 55 ? '#16a34a' : '#ea580c'} title="HRV & Recovery Readiness"
                    text={wearable.hrv >= 55
                      ? `HRV ${wearable.hrv}ms — your nervous system is recovered and ready.`
                      : `HRV ${wearable.hrv}ms — below recovery threshold. Swap intense exercise for rest or a slow walk today.`}
                    isGood={wearable.hrv >= 55} />
                  {isSmoker && (
                    <FeedItem color="#ea580c" title="Nicotine & Heart Rate"
                      text={`Your resting HR (${wearable.avgHeartRate} bpm) is elevated. Every smoke-free day reduces this.`}
                      isGood={false} />
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                  <div className="h-14 w-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                    <span className="text-2xl">📡</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#596467]">Your signal data is waiting</p>
                    <p className="text-xs text-white/30 mt-1 max-w-[200px] mx-auto leading-relaxed">A connected wearable lets your Digital Twin correlate sleep, movement, and stress in real time.</p>
                  </div>
                </div>
              )}
              {weather && (
                <FeedItem color={weather.isHot ? '#ea580c' : '#2f83b7'} title="Weather & Hydration Risk"
                  text={`${weather.temp}°C, ${weather.humidity}% humidity in Patna right now. ${weather.isHot ? `Dehydration risk is high — target ${weather.hydrationL}L and add electrolytes.` : `Conditions are mild. ${weather.hydrationL}L target applies.`}`}
                  isGood={!weather.isHot} />
              )}
              {aiInsights.filter(i => ['Burnout Risk','Wellness','Productivity'].includes(i.label)).map((ins, idx) => (
                <FeedItem key={idx}
                  color={ins.colorState === 'green' ? '#16a34a' : ins.colorState === 'orange' ? '#f59e0b' : '#ea580c'}
                  title={`Your Twin on ${ins.label}`}
                  text={ins.message}
                  isGood={ins.sentiment === 'positive'} />
              ))}
            </div>
          </article>

          <article className={`${iCard} p-6 xl:col-span-7 flex flex-col`}>
            <div>
              <h3 className="mb-1 text-xl font-bold tracking-tight">Recovery Trajectory</h3>
              <p className="mb-5 text-sm text-white/45">
                {wearableReady
                  ? `Based on your HRV ${wearable.hrv}ms, ${wearable.sleepHours}h sleep, and ${wearable.steps?.toLocaleString()} steps.`
                  : 'Showing the recommended path. Your personal curve appears once your device is synced.'}
              </p>
              <div className="relative mb-5 h-52 overflow-hidden rounded-xl border border-[#d8e5ea] bg-[#f7fbfc]">
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 640 220">
                  <line x1="0" y1="55"  x2="640" y2="55"  stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="110" x2="640" y2="110" stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="165" x2="640" y2="165" stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />
                  {wearableReady ? (
                    <path d={wearable.hrv >= 55 ? "M0 130 Q110 110 210 90 T430 70 T640 50" : "M0 120 Q110 130 210 145 T430 165 T640 185"}
                      fill="none" opacity="0.7" stroke="#ea580c" strokeWidth="3"
                      strokeDasharray="1000" strokeDashoffset={mounted ? '0' : '1000'}
                      className="transition-all duration-[1500ms] ease-in-out" />
                  ) : (
                    <path d="M0 110 Q320 110 640 110" fill="none" stroke="#e4e2e1" strokeWidth="2" strokeDasharray="6" />
                  )}
                  <path d="M0 126 Q120 82 225 66 T430 48 T640 32" fill="none" stroke="#16a34a" strokeLinecap="round"
                    strokeDasharray="1000" strokeDashoffset={mounted ? '0' : '1000'}
                    className="transition-all duration-[1800ms] ease-in-out delay-100" strokeWidth="4" />
                </svg>
                <div className="absolute right-4 top-4 bg-white/90 backdrop-blur border border-[#d8e5ea] p-2.5 rounded-lg shadow-sm space-y-2 text-xs font-semibold">
                  <Legend color="#16a34a" label="Recommended path" />
                  <Legend color={wearableReady ? '#ea580c' : '#e4e2e1'} label={wearableReady ? `Your trajectory (HRV ${wearable.hrv}ms)` : 'Awaiting device sync'} />
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <PathCard tone="primary" title="Recommended Path"
                text="Consistent sleep at your target, daily step goal, and 2L+ hydration before noon stabilise your recovery over 7 days." />
              <PathCard tone="warm" title="Your Trajectory"
                text={wearableReady
                  ? wearable.hrv < 55
                    ? `HRV at ${wearable.hrv}ms indicates accumulated strain. Without rest today, burnout risk rises through the week.`
                    : `HRV ${wearable.hrv}ms is strong. Protect your sleep window tonight to keep this trend going.`
                  : 'Connect your wearable — your Digital Twin will model your personal recovery curve from real data.'} />
            </div>
          </article>
        </section>

      </div>

      {/* ── CONNECT DEVICE MODAL ── */}
      {connectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={e => e.target===e.currentTarget && setConnectModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0f18] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#ff4d7d]/30 to-[#a78bfa]/20 flex items-center justify-center">
                <Wifi className="h-6 w-6 text-[#ff4d7d]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Connect Health Device</h3>
                <p className="text-xs text-white/40">Provider · Gargi Fitband</p>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-5">
              Once connected, your Digital Twin reads your steps, sleep, heart rate, and HRV automatically — and surfaces insights tailored to your goals, not generic advice.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#ff4d7d] mb-2">Health Integration Link</label>
                <input type="text"
                  placeholder="https://gargi-fitband/user/12345"
                  value={connectInput}
                  onChange={e => setConnectInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitConnect()}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white text-sm placeholder-white/20 focus:border-[#ff4d7d]/50 focus:outline-none transition-all"
                />
                {connectError && <p className="mt-2 text-xs text-[#ea580c]">{connectError}</p>}
              </div>
              <button onClick={submitConnect} disabled={connectLoading}
                className="w-full bg-gradient-to-r from-[#ff4d7d] to-[#a78bfa] text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {connectLoading
                  ? <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Connecting Device...</>
                  : <><Wifi className="h-4 w-4" /> Connect & Start Syncing</>}
              </button>
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] text-white/25 text-center leading-relaxed">
                  Your wearable data stays within your Digital Twin. It is never sold or shared.
                </p>
              </div>
            </div>
            <button onClick={() => setConnectModal(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Women's Health Sub-screens ───────────────────────────────────────────────
function PeriodSetup({ step, setStep, setup, setSetup, onComplete }) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#ff6b9d] to-[#c084fc] flex items-center justify-center">
          <Flower2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#ff6b9d]">Bloom Health Companion</h3>
          <p className="text-[11px] text-white/35">One-time setup · Stored locally only · Never shared</p>
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        {[0,1,2].map(i => <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-500 ${i <= step ? 'bg-gradient-to-r from-[#ff6b9d] to-[#c084fc]' : 'bg-white/10'}`} />)}
      </div>
      {step === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
          <div className="relative mb-5">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#ff6b9d]/20 to-[#c084fc]/20 border border-[#ff6b9d]/20 flex items-center justify-center">
              <span className="text-4xl">🌸</span>
            </div>
            <SmallFlower className="absolute -top-2 -right-2 h-8 w-8 text-[#ffd166]" />
            <SmallFlower className="absolute -bottom-1 -left-1 h-6 w-6 text-[#ff6b9d]" />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Set up your Bloom Companion</h4>
          <p className="text-sm text-white/45 leading-relaxed max-w-xs mb-6">Two quick questions so your Digital Twin can give you phase-aware guidance that actually fits your body.</p>
          <button onClick={() => setStep(1)} className="w-full max-w-xs bg-gradient-to-r from-[#ff6b9d] to-[#c084fc] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all hover:shadow-[0_0_20px_rgba(255,107,157,0.35)]">
            Let's begin 🌷
          </button>
        </div>
      )}
      {step === 1 && (
        <div className="flex flex-col flex-1">
          <p className="text-base font-bold text-white mb-1">When did your last period start?</p>
          <p className="text-sm text-white/40 mb-5">Used only to calculate your current phase. Never sent to any server.</p>
          <input type="date" max={new Date().toISOString().split('T')[0]}
            className="w-full bg-black/40 border border-[#ff6b9d]/20 rounded-xl p-3.5 text-white text-sm focus:border-[#ff6b9d]/50 focus:outline-none transition-all"
            value={setup.lastPeriod} onChange={e => setSetup(p => ({...p, lastPeriod:e.target.value}))} />
          <div className="flex gap-3 mt-auto pt-6">
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-white/30 hover:text-white transition-all"><ChevronLeft className="h-4 w-4" /> Back</button>
            <button onClick={() => setStep(2)} disabled={!setup.lastPeriod}
              className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#ff6b9d] to-[#c084fc] text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-30 transition-all">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="flex flex-col flex-1">
          <p className="text-base font-bold text-white mb-1">Any existing conditions?</p>
          <p className="text-sm text-white/40 mb-5">Personalises phase predictions and pampering advice for your body.</p>
          <div className="space-y-3">
            {[
              { v:'none', l:'No conditions',  d:'Standard ~28 day cycle',             e:'🌸' },
              { v:'pcod', l:'PCOD / PCOS',    d:'Irregular cycles, hormonal imbalance', e:'🌺' },
              { v:'endo', l:'Endometriosis',  d:'Painful periods, chronic inflammation',e:'💐' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setSetup(p => ({...p, condition:opt.v}))}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${setup.condition===opt.v ? 'border-[#ff6b9d]/60 bg-[#ff6b9d]/10' : 'border-white/10 bg-white/3 hover:bg-white/6'}`}>
                <span className="text-xl">{opt.e}</span>
                <div><p className="text-sm font-bold text-white">{opt.l}</p><p className="text-[11px] text-white/35">{opt.d}</p></div>
                {setup.condition===opt.v && <span className="ml-auto text-[#ff6b9d] font-bold text-lg">✓</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-auto pt-6">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-white/30 hover:text-white transition-all"><ChevronLeft className="h-4 w-4" /> Back</button>
            <button onClick={onComplete}
              className="ml-auto bg-gradient-to-r from-[#ff6b9d] to-[#c084fc] text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-all hover:shadow-[0_0_20px_rgba(255,107,157,0.3)]">
              Activate Bloom 🌷
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodTracker({ phase, setup, symptoms, toggleSym, onMissed, onPreg, onReset, wearable }) {
  const pct = Math.round((phase.day / phase.cycleLen) * 100);
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ff6b9d]/30 to-[#c084fc]/30 flex items-center justify-center text-sm">{phase.emoji}</div>
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff6b9d]">Bloom Companion</h3>
        </div>
        <button onClick={onReset} className="text-[10px] text-white/20 hover:text-white/45 transition-all underline">Reset</button>
      </div>
      <div className={`rounded-2xl bg-gradient-to-r ${phase.grad} border ${phase.border} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Day {phase.day} of {phase.cycleLen}</p>
            <h4 className="text-xl font-bold mt-0.5" style={{color:phase.color}}>{phase.name} {phase.emoji}</h4>
            <p className="text-xs text-white/40 mt-0.5">{phase.mood}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/30">Next: {phase.next}</p>
            <p className="text-sm font-bold text-white/55">{phase.daysToNext}d away</p>
          </div>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`, background:`linear-gradient(90deg,${phase.color}70,${phase.color})`}} />
        </div>
      </div>
      {wearable && (wearable.avgHeartRate > 80 || wearable.hrv < 55) && (
        <div className="rounded-xl border border-[#ff6b9d]/20 bg-[#ff6b9d]/8 p-3 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-[#ff6b9d] mt-0.5" />
          <p className="text-xs text-white/65 leading-relaxed">
            <span className="font-bold text-[#ff6b9d]">Your Fitbit says: </span>
            {wearable.avgHeartRate > 80 ? `elevated HR (${wearable.avgHeartRate} bpm) ` : ''}
            {wearable.hrv < 55 ? `+ low HRV (${wearable.hrv}ms) ` : ''}
            — consistent with {phase.name.toLowerCase()}. Your body may need extra rest today.
          </p>
        </div>
      )}
      <div>
        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Quick Symptom Log</p>
        <div className="flex flex-wrap gap-2">
          {[{id:'cramps',icon:'🤕',l:'Cramps'},{id:'bloat',icon:'🌪️',l:'Bloating'},{id:'mood',icon:'🎢',l:'Mood'},{id:'fatigue',icon:'😴',l:'Fatigue'},{id:'headache',icon:'🤯',l:'Headache'}].map(s => (
            <button key={s.id} onClick={() => toggleSym(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${symptoms.includes(s.id) ? 'bg-[#ff6b9d]/20 border-[#ff6b9d]/60 text-[#ff6b9d]' : 'bg-white/4 border-white/10 text-white/35 hover:bg-white/8'}`}>
              {s.icon} {s.l}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/4 p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 shrink-0" style={{color:phase.color}} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{color:phase.color}}>Phase Pampering Guide</p>
        </div>
        <div className="space-y-2">
          {phase.pamper.map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{backgroundColor:phase.color}} />
              <p className="text-xs text-white/55 leading-relaxed">{symptoms.includes('cramps') && i === 0 ? tip.replace('Skip intense workouts','🔥 Skip the gym entirely') : tip}</p>
            </div>
          ))}
          {setup.condition === 'pcod' && <div className="flex items-start gap-2.5 mt-2 pt-2 border-t border-white/8"><div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffd166]" /><p className="text-xs text-[#ffd166]/70 leading-relaxed">PCOD: Avoid sugar spikes — low-GI carbs manage insulin & androgen levels.</p></div>}
          {setup.condition === 'endo' && <div className="flex items-start gap-2.5 mt-2 pt-2 border-t border-white/8"><div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f87171]" /><p className="text-xs text-[#f87171]/70 leading-relaxed">Endo: Anti-inflammatory foods (turmeric, omega-3s, ginger) reduce prostaglandin pain.</p></div>}
        </div>
      </div>
      <div className="flex gap-2.5">
        <button onClick={onMissed} className="flex-1 py-2.5 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/8 text-[11px] font-bold text-[#f59e0b] hover:bg-[#f59e0b]/15 transition-all">🗓️ Missed a Period?</button>
        <button onClick={onPreg}   className="flex-1 py-2.5 rounded-xl border border-[#06d6a0]/30 bg-[#06d6a0]/8 text-[11px] font-bold text-[#06d6a0] hover:bg-[#06d6a0]/15 transition-all">🌿 Positive Test?</button>
      </div>
    </div>
  );
}

function TroubleshootPanel({ condition, wearable, onBack, onConfirm }) {
  const hasDevice = wearable && wearable.hrv !== undefined;
  const hrvLow = hasDevice && wearable.hrv < 55;
  const hrHigh = hasDevice && wearable.avgHeartRate > 80;
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-[#f59e0b] shrink-0" />
        <h3 className="text-base font-bold text-white">Delayed Cycle Analysis</h3>
      </div>
      <div className="rounded-xl bg-[#f59e0b]/8 border border-[#f59e0b]/20 p-4">
        <p className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider mb-2">What your data suggests</p>
        <p className="text-sm text-white/65 leading-relaxed">
          {hasDevice && (hrvLow || hrHigh)
            ? `Your Fitbit shows ${hrvLow ? `HRV at ${wearable.hrv}ms` : ''}${hrvLow && hrHigh ? ' and ' : ''}${hrHigh ? `HR at ${wearable.avgHeartRate} bpm` : ''} — these are classic cortisol-stress markers that suppress ovulation.`
            : 'Cycles shift 3–10 days due to stress, travel, disrupted sleep, or hormonal fluctuations.'}
          {condition === 'pcod' && ' With PCOD, cycles of 35–90 days are common and expected.'}
          {condition === 'endo' && ' Endometriosis can cause irregular bleeding distinct from a standard late period.'}
        </p>
      </div>
      <div className="rounded-xl bg-white/4 border border-white/8 p-4 flex-1">
        <p className="text-xs font-bold text-white/35 uppercase tracking-wider mb-3">Recommended now</p>
        <div className="space-y-2.5">
          {[{i:'🧘',t:'Reduce cortisol: gentle yoga, deep breathing, digital detox evenings.'},{i:'🥑',t:'Healthy fats (avocado, walnuts, olive oil) support progesterone and oestrogen.'},{i:'😴',t:'Protect 7–9h sleep — the ovulatory signal is closely tied to circadian rhythm.'},{i:'💊',t:condition!=='none'?'Consult your gynaecologist about cycle regulation options.':'If delayed >14 days, take a pregnancy test and speak to a doctor.'}].map((x,i) => (
            <div key={i} className="flex items-start gap-3"><span className="text-base">{x.i}</span><p className="text-xs text-white/50 leading-relaxed">{x.t}</p></div>
          ))}
        </div>
      </div>
      <button onClick={onConfirm} className="w-full py-3 rounded-xl border border-[#06d6a0]/30 bg-[#06d6a0]/10 text-sm font-bold text-[#06d6a0] hover:bg-[#06d6a0]/20 transition-all">🌿 My test came back positive →</button>
      <button onClick={onBack} className="text-xs text-white/25 hover:text-white text-center transition-all">← Back to Cycle Tracker</button>
    </div>
  );
}

function PregSetup({ weeks, setWeeks, due, setDue, onSave, onBack }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
        <div className="relative mb-5">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#06d6a0]/20 to-[#b7ffe6]/10 border border-[#06d6a0]/20 flex items-center justify-center"><span className="text-4xl">🌿</span></div>
          <SmallFlower className="absolute -top-2 -right-1 h-8 w-8 text-[#ffd166]" />
        </div>
        <h4 className="text-lg font-bold text-white mb-1">Pregnancy Journey Mode</h4>
        <p className="text-sm text-white/40 max-w-xs mb-6">A few details to switch your Digital Twin to maternal health tracking.</p>
        <div className="w-full max-w-sm space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#06d6a0] mb-2">Weeks Pregnant</label>
            <input type="number" min="1" max="42" placeholder="e.g. 8"
              className="w-full bg-black/40 border border-[#06d6a0]/20 rounded-xl p-3.5 text-white text-sm focus:border-[#06d6a0]/50 focus:outline-none transition-all"
              value={weeks} onChange={e => setWeeks(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#06d6a0] mb-2">Expected Due Date (optional)</label>
            <input type="date" className="w-full bg-black/40 border border-[#06d6a0]/20 rounded-xl p-3.5 text-white text-sm focus:border-[#06d6a0]/50 focus:outline-none transition-all"
              value={due} onChange={e => setDue(e.target.value)} />
          </div>
          <button onClick={onSave} disabled={!weeks} className="w-full bg-gradient-to-r from-[#06d6a0] to-[#0f8f84] text-black font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-30 transition-all hover:shadow-[0_0_20px_rgba(6,214,160,0.3)]">
            Activate Pregnancy Mode 🌿
          </button>
          <button onClick={onBack} className="w-full text-xs text-white/25 hover:text-white text-center py-1 transition-all">← Back to Cycle Tracker</button>
        </div>
      </div>
    </div>
  );
}

function PregDashboard({ weeks, due, weather, onReset, onBack }) {
  const tri = weeks > 27 ? 3 : weeks > 13 ? 2 : 1;
  const baby = (() => {
    if (weeks<=4)  return {icon:'🫘',l:'Poppy seed',s:'~1mm'};
    if (weeks<=6)  return {icon:'🫐',l:'Blueberry',s:'~6mm'};
    if (weeks<=8)  return {icon:'🫑',l:'Kidney bean',s:'~1.6cm'};
    if (weeks<=10) return {icon:'🍇',l:'Grape',s:'~3cm'};
    if (weeks<=12) return {icon:'🍋',l:'Lime',s:'~5cm'};
    if (weeks<=16) return {icon:'🥑',l:'Avocado',s:'~11cm'};
    if (weeks<=20) return {icon:'🥭',l:'Mango',s:'~16cm'};
    if (weeks<=24) return {icon:'🌽',l:'Corn',s:'~30cm'};
    if (weeks<=28) return {icon:'🍆',l:'Aubergine',s:'~35cm'};
    if (weeks<=32) return {icon:'🥦',l:'Broccoli',s:'~42cm'};
    if (weeks<=36) return {icon:'🥥',l:'Coconut',s:'~47cm'};
    return {icon:'🎃',l:'Small watermelon',s:'~51cm'};
  })();
  const daysLeft = due ? Math.max(0, Math.round((new Date(due)-Date.now())/86400000)) : null;
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#06d6a0]/30 to-transparent flex items-center justify-center text-base">🌿</div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#06d6a0]">Pregnancy Companion</h3>
            <p className="text-[11px] text-white/30">Trimester {tri}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onBack}  className="text-[10px] text-white/25 hover:text-white/55 transition-all underline">← Periods</button>
          <button onClick={onReset} className="text-[10px] text-white/20 hover:text-white/45 transition-all underline">Reset</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/4 p-3 text-center"><p className="text-[9px] font-bold uppercase tracking-wider text-white/30">Week</p><p className="text-2xl font-bold text-[#06d6a0] mt-0.5">{weeks}</p></div>
        <div className="rounded-xl border border-white/8 bg-white/4 p-3 text-center"><p className="text-[9px] font-bold uppercase tracking-wider text-white/30">Baby</p><p className="text-xl mt-0.5">{baby.icon}</p></div>
        <div className="rounded-xl border border-white/8 bg-white/4 p-3 text-center"><p className="text-[9px] font-bold uppercase tracking-wider text-white/30">{daysLeft!=null?'Days Left':'Trimester'}</p><p className="text-xl font-bold text-white/70 mt-0.5">{daysLeft!=null?daysLeft:tri}</p></div>
      </div>
      <div className="rounded-xl border border-[#06d6a0]/15 bg-[#06d6a0]/6 p-3 flex items-center gap-3">
        <span className="text-3xl">{baby.icon}</span>
        <div><p className="text-sm font-bold text-[#06d6a0]">About the size of a {baby.l}</p><p className="text-[11px] text-white/35">{baby.s} · Week {weeks}</p></div>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/4 p-4 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-3">This Week's Focus</p>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5"><span className="text-base">💧</span><p className="text-xs text-white/55 leading-relaxed">Blood volume expanding — aim for {weather?.hydrationL ? weather.hydrationL+0.5 : 3}L+ daily to prevent dizziness and support amniotic fluid.</p></div>
          {tri===1 && <div className="flex items-start gap-2.5"><span className="text-base">🍃</span><p className="text-xs text-white/55 leading-relaxed">Folic acid (400–800mcg/day) is critical now for neural tube development.</p></div>}
          {tri===2 && <div className="flex items-start gap-2.5"><span className="text-base">🚶</span><p className="text-xs text-white/55 leading-relaxed">20–30 min gentle walks support circulation and reduce pregnancy oedema.</p></div>}
          {tri===3 && <div className="flex items-start gap-2.5"><span className="text-base">🛌</span><p className="text-xs text-white/55 leading-relaxed">Left-side sleeping improves blood flow to baby and reduces vena cava pressure.</p></div>}
          {weather && <div className="flex items-start gap-2.5"><span className="text-base">🌡️</span><p className="text-xs text-white/55 leading-relaxed">{weather.isHot?`At ${weather.temp}°C, avoid hot baths, saunas, and midday sun — overheating is a risk.`:'Temperature is comfortable today — light outdoor walks are safe.'}</p></div>}
        </div>
      </div>
    </div>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────
function MetricCard({ metric, mounted }) {
  const toneDark = {
    primary: { bg:'rgba(65,111,130,0.18)', color:'#7dd3f0' },
    warm:    { bg:'rgba(234,88,12,0.15)',  color:'#fdba74' },
    neutral: { bg:'rgba(168,139,250,0.15)',color:'#c4b5fd' },
    sky:     { bg:'rgba(47,131,183,0.18)', color:'#7dd3f0' },
  }[metric.tone] || { bg:'rgba(65,111,130,0.18)', color:'#7dd3f0' };
  const Icon = metric.icon;
  const valueColor = metric.good ? '#4ade80' : '#f87171';
  return (
    <article className={`${iCard} p-5 text-center`}>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/5 ring-1 ring-white/8">
        <ProgressRing value={metric.ring} color={metric.good ? '#4ade80' : '#f87171'} mounted={mounted} />
      </div>
      <div className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-xl"
           style={{ backgroundColor: toneDark.bg, color: toneDark.color }}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-white/55 truncate">{metric.label}</h3>
      <p className="mt-1 text-sm font-bold truncate" style={{ color: valueColor }}>{metric.display}</p>
    </article>
  );
}

function ProgressRing({ value, color, mounted }) {
  const r = 28, circ = 2*Math.PI*r;
  const [cur, setCur] = useState(0);
  useEffect(() => {
    if (!mounted || value==null) return;
    const target = Math.min(100,Math.max(0,Math.round(value)));
    let start = null;
    const step = ts => { if(!start)start=ts; const p=Math.min((ts-start)/1200,1); setCur(Math.floor(p*target)); if(p<1)requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [value, mounted]);
  const offset = circ-(cur/100)*circ;
  return (
    <div className="relative h-14 w-14">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" fill="none" r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="4.5" />
        <circle cx="36" cy="36" fill="none" r={r} stroke={color} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="4.5" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold text-white/90">{cur}%</div>
    </div>
  );
}

function Pill({ label, warn }) {
  return <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${warn?'border-[#ffb38a]/30 bg-[#ffb38a]/10 text-[#ffb38a]':'border-white/10 bg-white/5 text-white/50'}`}>{label}</span>;
}
function WeatherCard({ accent, icon, title, value, desc }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{color:accent}}>{icon} {title}</div>
      <p className="mb-1.5 text-lg font-bold text-white">{value}</p>
      <p className="text-sm leading-relaxed text-white/52">{desc}</p>
    </div>
  );
}
function GapItem({ text }) { return <div className="flex items-start gap-2.5 text-[#ea580c]"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" /><p>{text}</p></div>; }
function ActionItem({ text }) { return <div className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" /><p>{text}</p></div>; }
function Legend({ color, label }) { return <div className="flex items-center gap-2 text-sm text-[#596467]"><span className="h-2 w-2 rounded-full" style={{backgroundColor:color}} /><span>{label}</span></div>; }
function PathCard({ tone, title, text }) {
  const s = tone==='primary' ? 'border-[#c8dbe2] bg-[#eef6f8] text-[#16a34a]' : 'border-[#efcfc5] bg-[#fff1ed] text-[#ea580c]';
  return <div className={`rounded-xl border p-5 ${s}`}><h4 className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em]">{title}</h4><p className="text-sm leading-relaxed text-[#596467]">{text}</p></div>;
}
function FeedItem({ color, title, text, isGood }) {
  return (
    <div className="flex gap-4 items-start rounded-xl bg-[#fbf9f8] border border-[#e4e2e1] p-4 hover:bg-white transition-all">
      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{backgroundColor:color}} />
      <div className="text-sm text-[#596467]">
        <span className={`font-bold block mb-1 text-base ${isGood?'text-[#16a34a]':'text-[#ea580c]'}`}>{title}</span>
        {text}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IB({className,children}){return <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none">{children}</svg>;}
function HeartPulseIcon({className}){return <IB className={className}><path d="M20.8 8.6c0 5-8.8 10.4-8.8 10.4S3.2 13.6 3.2 8.6A4.4 4.4 0 0 1 11 5.8l1 1.1 1-1.1a4.4 4.4 0 0 1 7.8 2.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M7 12h2l1.2-2.5 2.2 5 1.5-2.5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></IB>;}
function MoonIcon({className}){return <IB className={className}><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a7 7 0 1 0 11.5 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></IB>;}
function BalanceIcon({className}){return <IB className={className}><path d="M12 4v16M6 7h12M7 7l-4 7h8L7 7Zm10 0-4 7h8l-4-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></IB>;}
function DropIcon({className}){return <IB className={className}><path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></IB>;}
function RunIcon({className}){return <IB className={className}><path d="M13 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 22l1-5-3-2-2 3M18 22l-3-5 1-5-3-2-2 3-4-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></IB>;}
function FlameIconSvg({className}){return <IB className={className}><path d="M12 2c0 0-6 7-6 12a6 6 0 0 0 12 0c0-5-6-12-6-12ZM9 17c0-2 3-5 3-5s3 3 3 5a3 3 0 0 1-6 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></IB>;}
function CloudIcon({className}){return <IB className={className}><path d="M7 18h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.1 8.2 5 5 0 0 0 7 18Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></IB>;}
function SunIcon({className}){return <IB className={className}><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></IB>;}
function AutoIcon({className}){return <IB className={className}><path d="m12 3 1.7 4.6L18 9.3l-4.3 1.7L12 16l-1.7-5L6 9.3l4.3-1.7L12 3ZM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></IB>;}
function FemaleIcon({className}){return <IB className={className}><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13v8M8.5 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></IB>;}
function SparkIcon({className}){return <IB className={className}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></IB>;}
function TrophyIcon({className}){return <IB className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></IB>;}
