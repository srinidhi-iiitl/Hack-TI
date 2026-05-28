import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';

// Data Arrays
const healthMetrics = [
  { label: 'Pulse', value: 72, status: 'Ideal bpm', tone: 'primary', icon: HeartPulseIcon, isGood: true },
  { label: 'Sleep Quality', value: 92, status: 'Peak', tone: 'warm', icon: MoonIcon, isGood: true },
  { label: 'Hydration', value: 75, status: 'Needs attention', tone: 'sky', icon: DropIcon, isGood: false },
  { label: 'Stress Level', value: 58, status: 'Moderate', tone: 'neutral', icon: BalanceIcon, isGood: false },
  { label: 'Steps', value: 82, status: '8,420 steps', tone: 'primary', icon: RunIcon, isGood: true },
];

const tobaccoBars = [80, 65, 90, 50, 40, 30, 25];

// Smooth lifting and border-darkening transition class applied upon user hover
const interactiveCardClass = 'rounded-2xl border border-white/10 bg-[#11131a]/84 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#ff7a00]/30 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] cursor-pointer active:scale-[0.98]';

function Health() {
  const [isMounted, setIsMounted] = useState(false);

  // --- NEW GAMIFICATION LOGIC START ---
  const [activeTab, setActiveTab] = useState('workout'); // 'workout', 'sleep', 'vitals', 'meds'
  
  // States for forms
  const [workoutType, setWorkoutType] = useState('');
  const [duration, setDuration] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [stressLevel, setStressLevel] = useState('5');
  const [mood, setMood] = useState('neutral');
  const [waterIntake, setWaterIntake] = useState('');
  const [medName, setMedName] = useState('');
  
  const { triggerReward } = useGamification();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const handleLogHealth = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = `/api/health-metrics/${activeTab}`; 
      
      let payload = {};
      if (activeTab === 'workout') payload = { type: workoutType, duration: Number(duration) };
      if (activeTab === 'sleep') payload = { hours: Number(sleepHours) };
      if (activeTab === 'vitals') payload = { stressLevel: Number(stressLevel), mood, waterLiters: Number(waterIntake) };
      if (activeTab === 'meds') payload = { medName };

      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`, 
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Clear forms on success
        setWorkoutType(''); setDuration(''); setSleepHours('');
        setStressLevel('5'); setWaterIntake(''); setMedName('');
        
        const gamificationData = response.data.gamification;
        if (gamificationData) {
          triggerReward(
            gamificationData.xpAwarded, 
            gamificationData.newBadges, 
            gamificationData.newTotalXP
          );
        }
      }
    } catch (error) {
      console.error(`Failed to log ${activeTab}:`, error);
    }
  };
  // --- NEW GAMIFICATION LOGIC END ---

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative min-h-full overflow-hidden bg-[#06080f] px-6 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,0,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,143,132,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_20%)]" />
      <div className="relative">
      
      {/* Header Section */}
      <section className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Health Intelligence Hub</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/68">
          Synchronized biometric tracking, environmental context logs, and preventative recovery paths.
        </p>
      </section>

      {/* --- NEW GAMIFICATION QUICK ACTION FORM --- */}
      <section className="mb-8">
        <article className="rounded-2xl border border-white/10 bg-[#11131a]/84 p-6 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Log Daily Metrics</h2>
              <p className="mt-1 text-sm text-white/60">Maintain your health streak and earn XP.</p>
            </div>
            
            {/* ✅ EXPANDED TAB TOGGLE */}
            <div className="flex flex-wrap rounded-lg bg-white/5 p-1 gap-1">
              <button 
                onClick={() => setActiveTab('workout')}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'workout' ? 'bg-[#16a34a] text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Workout
              </button>
              <button 
                onClick={() => setActiveTab('sleep')}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'sleep' ? 'bg-[#2f83b7] text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Sleep
              </button>
              <button 
                onClick={() => setActiveTab('vitals')} 
                className={`rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'vitals' ? 'bg-[#c8a84b] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Vitals/Mood
              </button>
              <button 
                onClick={() => setActiveTab('meds')} 
                className={`rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'meds' ? 'bg-[#ff4d7d] text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Medication
              </button>
            </div>
          </div>

          <form onSubmit={handleLogHealth} className="flex w-full flex-col gap-3 sm:flex-row items-end">
            {activeTab === 'workout' && (
              <>
                <div className="w-full sm:w-1/3">
                  <label className="mb-1 block text-xs uppercase text-white/60">Activity Type</label>
                  <input type="text" placeholder="e.g., Weightlifting, Running" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#16a34a] focus:outline-none" required />
                </div>
                <div className="w-full sm:w-1/3">
                  <label className="mb-1 block text-xs uppercase text-white/60">Duration (Mins)</label>
                  <input type="number" placeholder="45" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#16a34a] focus:outline-none" required />
                </div>
              </>
            )}

            {activeTab === 'sleep' && (
              <div className="w-full sm:w-2/3">
                <label className="mb-1 block text-xs uppercase text-white/60">Hours Slept</label>
                <input type="number" step="0.5" placeholder="e.g., 7.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#2f83b7] focus:outline-none" required />
              </div>
            )}

            {activeTab === 'vitals' && (
              <>
                <div className="w-full sm:w-1/4">
                  <label className="mb-1 block text-xs uppercase text-white/60">Stress (1-10)</label>
                  <input type="number" min="1" max="10" value={stressLevel} onChange={(e) => setStressLevel(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#c8a84b] focus:outline-none" required />
                </div>
                <div className="w-full sm:w-1/4">
                  <label className="mb-1 block text-xs uppercase text-white/60">Mood</label>
                  <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#11131a] p-3 text-white focus:border-[#c8a84b] focus:outline-none" required>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="neutral">Neutral</option>
                    <option value="bad">Bad</option>
                    <option value="terrible">Terrible</option>
                  </select>
                </div>
                <div className="w-full sm:w-1/4">
                  <label className="mb-1 block text-xs uppercase text-white/60">Water (Liters)</label>
                  <input type="number" step="0.1" placeholder="2.5" value={waterIntake} onChange={(e) => setWaterIntake(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#c8a84b] focus:outline-none" required />
                </div>
              </>
            )}

            {activeTab === 'meds' && (
              <div className="w-full sm:w-2/3">
                <label className="mb-1 block text-xs uppercase text-white/60">Medication Name</label>
                <input type="text" placeholder="e.g., Vitamin D, Iron, Prescriptions" value={medName} onChange={(e) => setMedName(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#ff4d7d] focus:outline-none" required />
              </div>
            )}
            
            <button type="submit" className={`w-full sm:w-1/3 whitespace-nowrap rounded-lg px-6 py-3 font-bold transition-all ${
              activeTab === 'workout' ? 'bg-[#16a34a] text-white hover:shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 
              activeTab === 'sleep' ? 'bg-[#2f83b7] text-white hover:shadow-[0_0_15px_rgba(47,131,183,0.4)]' :
              activeTab === 'vitals' ? 'bg-[#c8a84b] text-black hover:shadow-[0_0_15px_rgba(200,168,75,0.4)]' :
              'bg-[#ff4d7d] text-white hover:shadow-[0_0_15px_rgba(255,77,125,0.4)]'
            }`}>
              Save & Earn XP
            </button>
          </form>
        </article>
      </section>
      {/* --- END GAMIFICATION FORM --- */}

      {/* 1. Core Health Metrics Cards */}
      <section className="mb-8 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
        {healthMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {/* 2. Environmental Intelligence Panel */}
      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <article className="rounded-[1.6rem] border border-white/10 bg-[#0c1018]/82 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-[#ff7a00]/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.55)] cursor-pointer active:scale-[0.98] xl:col-span-12">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ff7a00] via-[#ff4d7d] to-[#0f8f84] text-white shadow-[0_0_28px_rgba(255,122,0,0.24)]">
                <CloudIcon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/56">Today's Environmental Forecast</h3>
                <p className="mt-0.5 text-3xl font-bold text-white">41°C <span className="text-sm font-medium text-white/58">(Dry Heat Wave • UV Index: Extreme)</span></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#7df3cc]">📍 Current Location</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#ffb38a]">⚠️ Peak Heat Window: 12 PM - 4 PM</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors duration-300 hover:bg-white/[0.08]">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffb38a]">
                <DropIcon className="h-4 w-4" />
                Adaptive Water Intake
              </div>
              <p className="mb-1.5 text-2xl font-bold text-white">3.8 Liters</p>
              <p className="text-sm leading-relaxed text-white/64">
                Intense heat drives higher baseline transpiration. Scale up targets by <strong className="text-[#ffb38a]">+800ml</strong>. Include electrolytes before 2:00 PM.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors duration-300 hover:bg-white/[0.08]">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7df3cc]">
                <FemaleIcon className="h-4 w-4" />
                Apparel Optimization
              </div>
              <p className="mb-1.5 text-lg font-bold text-white">Loose Linen & Cottons</p>
              <p className="text-sm leading-relaxed text-white/64">
                Opt for loose-fitting, highly breathable open-weave fabrics. Avoid dark synthetic blends that trap heat radiation.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors duration-300 hover:bg-white/[0.08]">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c8a84b]">
                <RunIcon className="h-4 w-4" />
                Activity Realignment
              </div>
              <p className="mb-1.5 text-lg font-bold text-white">Indoor-only Cardio Threshold</p>
              <p className="text-sm leading-relaxed text-white/64">
                Postpone high-intensity outdoor activities until past 7:00 PM. High thermal loads fast-track systemic physical exhaustion.
              </p>
            </div>
          </div>
        </article>
      </section>

      {/* 3. Reproductive Health Modules */}
      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <article className="flex flex-col justify-between rounded-[1.6rem] border border-white/10 bg-[#0b0f16]/82 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-[#ff7a00]/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.55)] cursor-pointer active:scale-[0.98] xl:col-span-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#ffb38a]">Period & Cycle Wellness</h3>
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/75">Day 14 • Ovulation Phase</span>
            </div>
            
            <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
              <p className="mb-1.5 text-base font-bold text-[#ffb38a]">⚠️ Dietary Alert & Pain Management</p>
              <p className="leading-relaxed text-sm">
                Avoid heavy legumes like <strong className="text-[#ffb38a]">channa (chickpeas)</strong>, rajma, or fried foods today. High-gas foods induce abdominal bloating which puts extra pressure on the pelvic wall, severely aggravating menstrual cramps.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-start gap-3.5 text-sm">
              <LowImpactIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#7df3cc]" />
              <p className="leading-relaxed text-white/70"><span className="font-semibold text-white">Exercise Matrix:</span> Swap high-impact lifting for restorative mobility stretches to control cramping responses.</p>
            </div>
            <div className="flex items-start gap-3.5 text-sm">
              <MealIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#c8a84b]" />
              <p className="leading-relaxed text-white/70"><span className="font-semibold text-[#7df3cc]">Optimization:</span> Shift toward iron-rich elements and warm ginger infusions to relax uterine muscles.</p>
            </div>
          </div>
        </article>

        <article className={`${interactiveCardClass} p-6 xl:col-span-6 flex flex-col justify-between`}>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#7df3cc]">Pregnancy Companion</h3>
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/75">Trimester 2</span>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-white/48">Current Progress</p>
                <p className="mt-1.5 text-2xl font-bold text-white">18 Weeks, 4 Days</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-white/48">Weight Trajectory</p>
                <p className="mt-1.5 text-2xl font-bold text-[#c8a84b]">+4.2 kg <span className="text-xs font-normal text-white/55">(Optimal)</span></p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/5 p-4.5 text-sm">
            <SparkIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#7df3cc]" />
            <p className="leading-relaxed text-white/70"><span className="font-semibold text-white">Fetal Signal:</span> Auditory nerves are functioning. Avoid environments exceeding 85dB to keep heart rates uniform.</p>
          </div>
        </article>
      </section>

      {/* 4. Tobacco Dash & Enhanced Daily Optimization Matrix */}
      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Smoke / Tobacco Reduction Card */}
        <article className={`${interactiveCardClass} p-6 xl:col-span-4 flex flex-col justify-between`}>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#c8a84b]">Tobacco Log</h3>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-[#7df3cc]">-15% WK</span>
            </div>
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-white">3</span>
              <span className="text-sm text-white/60">units / avg daily</span>
            </div>
            <div className="mb-5 flex h-24 items-end gap-2 px-1">
              {tobaccoBars.map((height, index) => (
                <div key={index} className="flex-1 overflow-hidden rounded-t bg-white/5">
                  <div
                    className="w-full origin-bottom rounded-t bg-gradient-to-t from-[#c8a84b] to-[#7b61ff] transition-all duration-[1200ms] ease-out"
                    style={{ 
                      height: isMounted ? `${height}%` : '0%', 
                      opacity: 0.4 + index * 0.08 
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <Observation text="Late-night stress periods trigger dependencies. Swap for warm chamomile liquid blends past 10:00 PM." />
        </article>

        {/* Daily Optimization Matrix */}
        <article className={`${interactiveCardClass} p-6 xl:col-span-8 flex flex-col justify-between`}>
          <div className="mb-5 border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">Daily Optimization Matrix</h2>
            <p className="mt-1 text-sm text-white/60">Continuous comparative view of circadian habits and target corrections.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 grow">
            <div className="rounded-xl bg-[#fbf9f8] p-5 border border-[#e4e2e1] flex flex-col justify-center">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                <div className="p-1.5 rounded-md bg-[#ffdad2]">
                  <MoonIcon className="h-4 w-4 text-[#ea580c]" />
                </div>
                Yesterday's Critical Gaps (Warning)
              </div>
              <div className="space-y-3.5 text-sm text-[#ea580c] leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" />
                  <p>Late-night screen outputs prolonged brain-wave stimulation past 11:15 PM.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" />
                  <p>Deep REM recovery dropped by <span className="font-bold">18%</span> via fragmented tracking.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" />
                  <p>Fluid consistency flatlined early at 2.2L, prompting minor internal water retention.</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-xl bg-[#eef6f8] p-5 border border-[#c8dbe2] flex flex-col justify-center">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#16a34a]">
                <div className="p-1.5 rounded-md bg-[#e6f1f4]">
                  <AutoIcon className="h-4 w-4 text-[#16a34a]" />
                </div>
                Today's Action Plan (Optimal)
              </div>
              <div className="space-y-3.5 text-sm text-[#16a34a] leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" />
                  <p>Absolute physical screen drop-offs strictly by <span className="font-bold">10:30 PM</span>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" />
                  <p>Force hydration benchmarks forward: Log +800ml before midday system readings.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" />
                  <p>Incorporate soft, structured spine-extension resets over dense mental routines.</p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* 5. Cross-Intelligence Feed & Future Recovery Trajectory */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Cross Intelligence Insights */}
        <article className={`${interactiveCardClass} p-6 xl:col-span-5`}>
          <div className="mb-5 flex items-center justify-between border-b border-[#d8e5ea] pb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1b1c1c]">Cross-Intelligence Insights</h2>
              <p className="text-sm text-[#596467] mt-1">Biometric correlations calculated across tracking segments.</p>
            </div>
            <SparkIcon className="h-6 w-6 text-[#416f82] shrink-0" />
          </div>
          <div className="space-y-4">
            <FeedItem 
              color="#ea580c" 
              title="Smoke vs Stress Nexus" 
              text="Elevated nicotine intake reliably spikes subsequent evening resting heart rates by 6 bpm, imitating active stress patterns." 
              isGood={false}
            />
            <FeedItem 
              color="#16a34a" 
              title="Hydration & Recovery Link" 
              text="Achieving your baseline 3.0L metrics matches a clear 12% boost in overall morning metabolic efficiency scores." 
              isGood={true}
            />
            <FeedItem 
              color="#16a34a" 
              title="Step Count Multiplier" 
              text="Accumulating over 8,000 steps prior to 6:00 PM correlates with an easier entry into deep slow-wave sleep cycles." 
              isGood={true}
            />
          </div>
        </article>

        {/* Future Recovery Trajectory Card */}
        <article className={`${interactiveCardClass} p-6 xl:col-span-7 flex flex-col justify-between`}>
          <div>
            <h3 className="mb-4 text-xl font-bold tracking-tight">Future Recovery Trajectory</h3>
            <div className="relative mb-5 h-52 overflow-hidden rounded-xl border border-[#d8e5ea] bg-[#f7fbfc]">
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 640 220">
                <line x1="0" y1="55" x2="640" y2="55" stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />
                <line x1="0" y1="110" x2="640" y2="110" stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />
                <line x1="0" y1="165" x2="640" y2="165" stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />

                <path 
                  d="M0 120 Q110 92 210 132 T430 170 T640 188" 
                  fill="none" 
                  opacity="0.5" 
                  stroke="#ea580c" 
                  strokeDasharray="1000"
                  strokeDashoffset={isMounted ? '0' : '1000'}
                  className="transition-all duration-[1500ms] ease-in-out"
                  strokeWidth="3" 
                />
                <path 
                  d="M0 126 Q120 82 225 66 T430 48 T640 32" 
                  fill="none" 
                  stroke="#16a34a" 
                  strokeLinecap="round" 
                  strokeDasharray="1000"
                  strokeDashoffset={isMounted ? '0' : '1000'}
                  className="transition-all duration-[1800ms] ease-in-out delay-100"
                  strokeWidth="4" 
                />
              </svg>
              <div className="absolute right-4 top-4 space-y-2 text-xs font-semibold bg-white/90 backdrop-blur border border-[#d8e5ea] p-2.5 rounded-lg shadow-sm">
                <Legend color="#16a34a" label="Recommended path" />
                <Legend color="#ea580c" label="Current path" />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PathCard tone="primary" title="Recommended Recovery Path" text="Balanced recovery metrics, stable system metrics, and protected metabolic reserves." />
            <PathCard tone="warm" title="Current Path Trajectory" text="Elevated bio-strain margins indicate potential physical burnout by late next week." />
          </div>
        </article>
      </section>

      </div>
    </div>
  );
}

{/* Subcomponents */}
function MetricCard({ metric }) {
  const Icon = metric.icon;
  const tone = getTone(metric.tone);
  const textColorClass = metric.isGood ? 'text-[#16a34a]' : 'text-[#ea580c]';

  return (
    <article className={`${interactiveCardClass} p-5 text-center`}>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f0eded]">
        <ProgressRing value={metric.value} color={metric.isGood ? '#16a34a' : '#ea580c'} />
      </div>
      <div className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: tone.bg, color: metric.isGood ? '#16a34a' : '#ea580c' }}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#596467] truncate">{metric.label}</h3>
      <p className={`mt-1 text-sm font-bold truncate ${textColorClass}`}>{metric.status}</p>
    </article>
  );
}

// 60FPS High-Precision RequestAnimationFrame Counter Loop
function ProgressRing({ value, color }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const [currentVal, setCurrentVal] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const targetValue = parseInt(value, 10);
    const duration = 1200; // Complete loading sweep in 1.2s

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = timestamp - startTimestamp;
      const progressPercentage = Math.min(progress / duration, 1);
      
      setCurrentVal(Math.floor(progressPercentage * targetValue));

      if (progress < duration) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  const offset = circumference - (currentVal / 100) * circumference;

  return (
    <div className="relative h-14 w-14">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" fill="none" r={radius} stroke="#e4e2e1" strokeWidth="4.5" />
        <circle 
          cx="36" 
          cy="36" 
          fill="none" 
          r={radius} 
          stroke={color} 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          strokeLinecap="round" 
          strokeWidth="4.5"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold tracking-tight">{currentVal}%</div>
    </div>
  );
}

function Observation({ text }) {
  return (
    <div className="rounded-xl bg-[#f0eded] p-4 border border-transparent">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#596467]">
        <LightIcon className="h-4 w-4" />
        Context Observation
      </div>
      <p className="text-sm leading-relaxed text-[#596467]">{text}</p>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#596467]">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function PathCard({ tone, title, text }) {
  const styles = tone === 'primary'
    ? 'border-[#c8dbe2] bg-[#eef6f8] text-[#16a34a]'
    : 'border-[#efcfc5] bg-[#fff1ed] text-[#ea580c]';

  return (
    <div className={`rounded-xl border p-5 transition-colors duration-300 ${styles}`}>
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em]">{title}</h4>
      <p className="text-sm leading-relaxed text-[#596467]">{text}</p>
    </div>
  );
}

function FeedItem({ color, title, text, isGood }) {
  const inlineAlertColor = isGood ? 'text-[#16a34a]' : 'text-[#ea580c]';
  return (
    <div className="flex gap-4 items-start rounded-xl bg-[#fbf9f8] border border-[#e4e2e1] p-4.5 hover:bg-white transition-all duration-300">
      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="text-sm leading-relaxed text-[#596467]">
        <span className={`font-bold block mb-1 text-base ${inlineAlertColor}`}>{title}</span> 
        {text}
      </div>
    </div>
  );
}

function getTone(tone) {
  const tones = {
    primary: { color: '#416f82', bg: '#e6f1f4' },
    warm: { color: '#8b4e3f', bg: '#ffdad2' },
    neutral: { color: '#596467', bg: '#f0eded' },
    sky: { color: '#2f83b7', bg: '#e0f2fe' },
  };
  return tones[tone] || tones.primary;
}

// Icon Infrastructure
function IconBase({ className, children }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

function HeartPulseIcon({ className }) {
  return <IconBase className={className}><path d="M20.8 8.6c0 5-8.8 10.4-8.8 10.4S3.2 13.6 3.2 8.6A4.4 4.4 0 0 1 11 5.8l1 1.1 1-1.1a4.4 4.4 0 0 1 7.8 2.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M7 12h2l1.2-2.5 2.2 5 1.5-2.5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function MoonIcon({ className }) {
  return <IconBase className={className}><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a7 7 0 1 0 11.5 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function BalanceIcon({ className }) {
  return <IconBase className={className}><path d="M12 4v16M6 7h12M7 7l-4 7h8L7 7Zm10 0-4 7h8l-4-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function DropIcon({ className }) {
  return <IconBase className={className}><path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function RunIcon({ className }) {
  return <IconBase className={className}><path d="M13 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 22l1-5-3-2-2 3M18 22l-3-5 1-5-3-2-2 3-4-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function CloudIcon({ className }) {
  return <IconBase className={className}><path d="M7 18h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.1 8.2 5 5 0 0 0 7 18Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function AutoIcon({ className }) {
  return <IconBase className={className}><path d="m12 3 1.7 4.6L18 9.3l-4.3 1.7L12 16l-1.7-5L6 9.3l4.3-1.7L12 3ZM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function FemaleIcon({ className }) {
  return <IconBase className={className}><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13v8M8.5 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></IconBase>;
}

function LowImpactIcon({ className }) {
  return <IconBase className={className}><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" /></IconBase>;
}

function MealIcon({ className }) {
  return <IconBase className={className}><path d="M6 3v8M9 3v8M6 7h3M17 3v18M14 7c0-2.2 1.4-4 3-4v8c-1.6 0-3-1.8-3-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function LightIcon({ className }) {
  return <IconBase className={className}><path d="M9 18h6M10 22h4M8.5 14.5a5.5 5.5 0 1 1 7 0c-.9.7-1.2 1.4-1.3 2.5H9.8c-.1-1.1-.4-1.8-1.3-2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function SparkIcon({ className }) {
  return <IconBase className={className}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

export default Health;