import React, { useState } from 'react';
import axios from 'axios';
// ✅ Import the Gamification Hook
import { useGamification } from '../context/GamificationContext';

const glassCardClass = 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#c8a84b]/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.52)]';

const overviewMetrics = [
  {
    label: 'Savings Consistency',
    value: 'Peak',
    detail: '12-day active streak',
    tone: 'primary',
    bar: 100,
  },
  {
    label: 'Financial Stability',
    value: '82%',
    detail: '+2.4% this month',
    tone: 'primary',
    icon: ShieldIcon,
    ring: 82,
  },
  {
    label: 'Spending Balance',
    value: 'Balanced',
    detail: 'Allocated: $3,420 / $4,500',
    tone: 'neutral',
    segments: true,
  },
  {
    label: 'Stress Spending',
    value: 'Rising',
    detail: 'Anomaly detected',
    tone: 'warm',
    spark: [18, 42, 34, 66, 78, 92],
  },
];

function Finance() {
  // ✅ Omniscient Form State
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' or 'income'
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [isImpulse, setIsImpulse] = useState(false);
  
  // ✅ Initialize the Hook
  const { triggerReward } = useGamification();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // ✅ Submit Function linked to the new Omniscient Route
  const handleLogTransaction = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await axios.post(`${API_BASE_URL}/api/finance/transaction`, {
        type: activeTab,
        amount: Number(amount),
        category,
        isImpulse: activeTab === 'expense' ? isImpulse : false
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        // Clear fields
        setAmount('');
        setIsImpulse(false);
        
        // Trigger the cinematic popup!
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
      console.error('Failed to log transaction:', error);
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-[#05070d] px-5 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,168,75,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(123,97,255,0.10),transparent_26%),radial-gradient(circle_at_center,rgba(15,143,132,0.08),transparent_30%)]" />
      <div className="relative">
      
      {/* Header Section */}
      <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Finance Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">
            Comprehensive tracking of behavioral spending metrics, global macroeconomic factors, and financial projections.
          </p>
        </div>
      </section>

      {/* ✅ UPGRADED: Omniscient Gamification Form */}
      <section className="mb-6">
        <article className={`${glassCardClass} flex flex-col gap-5 p-6`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-semibold">Ledger Entry</h2>
              <p className="mt-1 text-sm text-white/60">Log transactions to maintain fiscal discipline.</p>
            </div>
            <div className="flex rounded-lg bg-white/5 p-1 gap-1">
              <button onClick={() => setActiveTab('expense')} className={`rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'expense' ? 'bg-[#ff4d7d] text-white shadow-lg' : 'text-white/60 hover:text-white'}`}>Expense</button>
              <button onClick={() => setActiveTab('income')} className={`rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'income' ? 'bg-[#10c7a1] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}>Income</button>
            </div>
          </div>

          <form onSubmit={handleLogTransaction} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs uppercase text-white/60">Amount (₹/$)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#c8a84b] focus:outline-none" required />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs uppercase text-white/60">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#11131a] p-3 text-white focus:border-[#c8a84b] focus:outline-none">
                {activeTab === 'expense' ? (
                  <>
                    <option value="food">Dining / Groceries</option>
                    <option value="rent">Rent / Utilities</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="medical">Health / Medical</option>
                    <option value="other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="salary">Salary</option>
                    <option value="freelance">Freelance</option>
                    <option value="investment">Investment Yield</option>
                  </>
                )}
              </select>
            </div>

            {activeTab === 'expense' && (
              <div className="flex items-center gap-2 mb-3 min-w-[180px]">
                <input type="checkbox" id="impulse" checked={isImpulse} onChange={(e) => setIsImpulse(e.target.checked)} className="w-4 h-4 accent-[#ff4d7d]" />
                <label htmlFor="impulse" className="text-sm font-medium text-white/80 cursor-pointer">Mark as Impulse Buy</label>
              </div>
            )}

            <button type="submit" className={`whitespace-nowrap px-8 py-3 rounded-lg font-bold transition-all ${activeTab === 'expense' ? 'bg-[#ff4d7d] text-white hover:shadow-[0_0_15px_rgba(255,77,125,0.4)]' : 'bg-[#10c7a1] text-black hover:shadow-[0_0_15px_rgba(16,199,161,0.4)]'}`}>
              Commit & Earn XP
            </button>
          </form>
        </article>
      </section>

      {/* 4 Required Metric Cards */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewMetrics.map((metric) => (
          <OverviewCard key={metric.label} metric={metric} />
        ))}
      </section>

      {/* Unusual Spending Spike & Macro Market Analysis */}
      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Unusual Spending Spike Detector */}
        <article className={`${glassCardClass} p-6 xl:col-span-7`}>
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Unusual Spending Spike Detector</h2>
              <p className="mt-1 text-sm text-white/60">AI behavioral anomaly detection</p>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#c8a84b]">
              Action recommended
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-4">
              <div className="rounded-2xl border-l-4 border-[#c8a84b] bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#c8a84b]" />
                  <div>
                    <p className="text-base font-semibold text-white">Weekend food delivery spending increased 28%</p>
                    <p className="mt-1 text-sm leading-6 text-white/68">
                      This spike correlates with a 15% reduction in sleep consistency during high-stress windows.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <MiniStat label="Avg. delivery cost" value="$42.50" delta="+12.40" />
                <MiniStat label="Trigger window" value="11 PM - 1 AM" />
              </div>
            </div>

            <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="absolute inset-4 flex items-end justify-between gap-2">
                {[40, 35, 45, 85, 38].map((height, index) => (
                  <div
                    key={height + index}
                    className={`w-full rounded-sm ${index === 3 ? 'bg-[#c8a84b]' : 'bg-[#7b61ff]/25'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <p className="absolute bottom-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">Activity variance</p>
            </div>
          </div>
        </article>

        {/* Macro Market Context Card */}
        <article className={`${glassCardClass} flex flex-col p-6 xl:col-span-5`}>
          <div className="mb-5">
              <h2 className="text-xl font-semibold text-white">Macro Market Analysis</h2>
              <p className="mt-1 text-sm text-white/60">Global catalysts: Political, Legal, Conflict, & Health updates</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[280px] pr-1">
            <MarketImpactRow 
              title="Geopolitical Conflict / War Risks" 
              detail="Supply chain disruptions detected in energy sectors. Expect minor inflationary spikes in regional utility and fuel costs." 
              type="danger" 
            />
            <MarketImpactRow 
              title="Tax Law Amendments" 
              detail="New capital gains structural changes passed. Portfolio reassessment recommended prior to end-of-quarter cycles." 
              type="warning" 
            />
            <MarketImpactRow 
              title="Political / Policy Shifts" 
              detail="Tech sector regulatory updates impacting high-growth assets. Shifting allocation safely toward defensive indexes." 
              type="info" 
            />
            <MarketImpactRow 
              title="Public Health / Pandemics" 
              detail="Healthcare buffer thresholds optimized automatically following global biosurveillance warning models." 
              type="info" 
            />
          </div>
        </article>
      </section>

      {/* Observation & Suggestions and Cross Intelligence */}
      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Finance Observation & Suggestion */}
        <article className={`${glassCardClass} p-6 xl:col-span-6`}>
          <h2 className="mb-4 text-xl font-semibold">Finance Observation & Suggestions</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7b61ff]/15 text-[#7b61ff]">
                <BoltIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Impulse Spending Trigger Mitigated</p>
                <p className="mt-1 text-xs leading-5 text-white/60">Identified a loop of 10 PM social media surfing causing stress buys. Restricting shopping apps after 9 PM could yield up to $140/mo in direct savings.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c8a84b]/15 text-[#c8a84b]">
                <VerifiedIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Liquidity Optimization Target</p>
                <p className="mt-1 text-xs leading-5 text-white/60">To counter market volatility, freeze all speculative certification/luxury purchases for 90 days. Redirect excess funds entirely into your Savings Shield.</p>
              </div>
            </div>
          </div>
        </article>

        {/* Cross Intelligence */}
        <article className={`${glassCardClass} p-6 space-y-4 xl:col-span-6`}>
              <h2 className="text-xl font-semibold text-white">Cross Intelligence</h2>
          <RecommendationCard
            icon={WarningIcon}
            title="Overspending Inflation Correlates to Stress"
            detail="When spending climbs past target budgets, internal economic pressure compromises focus, triggering reactive lifestyle cycles."
            tone="warm"
          />
          <RecommendationCard
            icon={MindIcon}
            title="Biometric Stress & Health Degradation Risk"
            detail="Spike indicators show higher financial anomalies precisely when sleep drops below 6.5 hours. Wellness directly dictates savings retention."
            tone="primary"
          />
        </article>
      </section>

      {/* Financial Trajectory (Future Projection Graph) */}
      <section className="grid grid-cols-1 gap-6">
        <article className={`${glassCardClass} p-6`}>
          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Financial Trajectory</h2>
              <p className="mt-1 text-sm text-white/60">AI forecasting based on current lifestyle habits versus optimized stability tracks</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Legend color="#c8a84b" label="Current path" />
              <Legend color="#7b61ff" label="Stable path" />
            </div>
          </div>
          <div className="relative h-72">
            <svg className="h-full w-full" viewBox="0 0 800 240" preserveAspectRatio="none">
              <line stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="800" y1="205" y2="205" />
              <line stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="800" y1="145" y2="145" />
              <line stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="800" y1="85" y2="85" />
              <path d="M0 168 Q200 178 400 194 T800 226" fill="none" opacity="0.55" stroke="#c8a84b" strokeDasharray="8 6" strokeWidth="3" />
              <path d="M0 168 Q200 152 400 120 T800 48" fill="none" stroke="#7df3cc" strokeLinecap="round" strokeWidth="4" />
              <circle cx="400" cy="120" fill="#7df3cc" r="7" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">
              <span>Current</span>
              <span>6 months</span>
              <span>1 year</span>
              <span>2 years</span>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/60">Projected difference in 24 months:</p>
            <span className="text-xl font-semibold text-[#c8a84b]">+$18,450.00</span>
          </div>
        </article>
      </section>
      </div>
    </div>
  );
}

{/* --- Sub-Components --- */}

function MarketImpactRow({ title, detail, type }) {
  let badgeColor = "bg-white/5 text-white/72 border-white/10";
  if (type === "danger") badgeColor = "bg-[#111722] text-[#c8a84b] border-[#c8a84b]/20";
  if (type === "warning") badgeColor = "bg-[#111722] text-[#ffb38a] border-[#ff7a00]/20";

  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-3 ${badgeColor}`}>
      <h4 className="text-xs font-bold uppercase tracking-wider">{title}</h4>
      <p className="text-sm leading-relaxed text-white/72">{detail}</p>
    </div>
  );
}

function OverviewCard({ metric }) {
  const Icon = metric.icon;
  const tone = metric.tone === 'warm' ? '#c8a84b' : '#7df3cc';

  return (
    <article className={`${glassCardClass} relative overflow-hidden p-5`}>
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-10 rounded-full bg-[#c8a84b]/10" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">{metric.label}</p>
          <h3 className="text-2xl font-semibold" style={{ color: tone }}>{metric.value}</h3>
          <p className="mt-2 flex items-center gap-1 text-sm text-white/60">
            {metric.tone === 'primary' && <ArrowUpIcon className="h-4 w-4 text-[#7df3cc]" />}
            {metric.detail}
          </p>
        </div>
        {metric.ring && (
          <div className="relative h-16 w-16 shrink-0">
            <ProgressRing value={metric.ring} color={tone} />
            <Icon className="absolute inset-0 m-auto h-5 w-5" style={{ color: tone }} />
          </div>
        )}
      </div>

      {metric.bar && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-gradient-to-r from-[#c8a84b] to-[#7df3cc]" style={{ width: `${metric.bar}%` }} />
        </div>
      )}

      {metric.segments && (
        <div className="mt-4 flex h-3 gap-1">
          <div className="flex-1 rounded-l-full bg-[#7df3cc]" />
          <div className="flex-1 bg-[#7df3cc]" />
          <div className="flex-1 bg-[#c8a84b]/70" />
          <div className="flex-1 rounded-r-full bg-white/10" />
        </div>
      )}

      {metric.spark && (
        <div className="mt-4 flex h-9 items-end gap-1">
          {metric.spark.map((height, index) => (
            <div key={height + index} className="w-2 rounded-t-sm bg-gradient-to-t from-[#c8a84b] to-[#7df3cc]" style={{ height: `${height}%`, opacity: 0.2 + index * 0.13 }} />
          ))}
        </div>
      )}
    </article>
  );
}

function ProgressRing({ value, color }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
      <circle cx="32" cy="32" fill="none" r={radius} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="4" />
      <circle cx="32" cy="32" fill="none" r={radius} stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

function MiniStat({ label, value, delta }) {
  return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">{label}</p>
      <p className="text-lg font-semibold">
        {value} {delta && <span className="text-sm text-[#8b4e3f]">{delta}</span>}
      </p>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-white/60">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function RecommendationCard({ icon: Icon, title, detail, tone }) {
  const warm = tone === 'warm';

  return (
    <button className={`group w-full rounded-lg border p-4 text-left transition ${warm ? 'border-[#efcfc5] hover:bg-[#fff1ed]' : 'border-[#c8dbe2] bg-[#eef6f8]/60 hover:bg-[#eef6f8]'}`} type="button">
      <div className="mb-2 flex items-start justify-between">
        <Icon className={`h-5 w-5 ${warm ? 'text-[#8b4e3f]' : 'text-[#416f82]'}`} />
        <ArrowRightIcon className="h-4 w-4 text-[#596467]/50 transition group-hover:text-[#416f82]" />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#596467]">{detail}</p>
    </button>
  );
}

function IconBase({ className, style, children }) {
  return (
    <svg aria-hidden="true" className={className} style={style} viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

function ShieldIcon({ className, style }) {
  return <IconBase className={className} style={style}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="m9 12 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function ArrowUpIcon({ className }) {
  return <IconBase className={className}><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function WarningIcon({ className }) {
  return <IconBase className={className}><path d="M12 9v4M12 17h.01M10.3 4.4 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function ArrowRightIcon({ className }) {
  return <IconBase className={className}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function BoltIcon({ className }) {
  return <IconBase className={className}><path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function VerifiedIcon({ className }) {
  return <IconBase className={className}><path d="M20 7 9 18l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function MindIcon({ className }) {
  return <IconBase className={className}><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1.2.8-1.5 1.8-1.5 3h-5c0-1.2-.3-2.2-1.5-3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

export default Finance;