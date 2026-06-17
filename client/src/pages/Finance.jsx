import { useTheme } from '../context/ThemeContext';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';

const getGlassCardClass = (theme) =>
  theme === 'light'
    ? 'rounded-2xl border border-[#e2e8f0] bg-white shadow-sm'
    : 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
function Finance() {
  const { theme } = useTheme();
  const { triggerReward, history = [], unlockedBadges = [], availableBadges = [] } = useGamification();

  // ── Bank connection state ──
  // ── Backend finance data state ──
  const [financeData, setFinanceData] = useState(null);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeError, setFinanceError] = useState(null);

  // ── Backend health data state (for Retail Therapy Alert) ──
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [careerData, setCareerData] = useState(null);
  const [careerLoading, setCareerLoading] = useState(true);

  // ── Live exchange rate state ──
  // ── AI Macro Market Analysis state ──
  const [marketData, setMarketData] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [documentIntelligence, setDocumentIntelligence] = useState(null);
  const [documentIntelligenceLoading, setDocumentIntelligenceLoading] = useState(false);

  const hasAutonomousSyncedRef = useRef(false);
  const marketRequestInFlightRef = useRef(false);
  const documentIntelligenceRequestInFlightRef = useRef(false);
  const documentIntelligenceDebounceRef = useRef(null);

  // ═════════════════════════════════════════════
  // 1. Check onboarding profile for bank connection + autonomous sync
  // ═════════════════════════════════════════════
  useEffect(() => {
    const profile = JSON.parse(localStorage.getItem('lifetwinOnboardingProfile') || '{}');
    const isConnected = profile?.integrations?.banking?.status === 'connected';

    if (isConnected && !hasAutonomousSyncedRef.current) {
      hasAutonomousSyncedRef.current = true;

      // AUTONOMOUS GAMIFICATION TRIGGER
      const runAutonomousSync = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await axios.get(`${API_BASE_URL}/api/integrations/finance`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success) {
            const data = response.data.data;

            // Smart Gamification Rule 1: High Credit Score
            if (data.creditScore >= 750) {
              setTimeout(() => {
                triggerReward(100, ['Excellent Credit'], 100);
                toast.success(`Plaid Sync: Prime Credit Score Verified (${data.creditScore}). +100 XP`, { icon: '🏦' });
              }, 2000);
            }

            // Smart Gamification Rule 2: Avoiding Impulse Buys
            if (!data.metrics.unusualSpikeDetected) {
              setTimeout(() => {
                triggerReward(40, ['Disciplined Spender'], 140);
                toast.success(`Plaid Sync: No impulse spikes detected this week. +40 XP`, { icon: '🛡️' });
              }, 4500);
            }
          }
        } catch (error) {
          console.error("Autonomous bank sync failed", error);
        }
      };

      runAutonomousSync();
    }
  }, [triggerReward]);

  // ═════════════════════════════════════════════
  // 2. Fetch finance data from backend
  // ═════════════════════════════════════════════
  useEffect(() => {
    const fetchFinanceData = async () => {
      setFinanceLoading(true);
      setFinanceError(null);
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/integrations/finance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setFinanceData(response.data.data);
          // ✅ Mark bank as connected if backend successfully returns valid integration data
        }
      } catch (err) {
        console.error('Failed to fetch finance data:', err);
        setFinanceData(null);
        setFinanceError('Unable to load finance data');
      } finally {
        setFinanceLoading(false);
      }
    };
    fetchFinanceData();
  }, []);

  // ═════════════════════════════════════════════
  // 3. Fetch health data for Retail Therapy Alert
  // ═════════════════════════════════════════════
  useEffect(() => {
    const fetchHealthData = async () => {
      setHealthLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/integrations/health`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setHealthData(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch health data:', err);
      } finally {
        setHealthLoading(false);
      }
    };
    fetchHealthData();
  }, []);

  useEffect(() => {
    const fetchCareerData = async () => {
      setCareerLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/integrations/career`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setCareerData(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch career data for finance cross intelligence:', err);
      } finally {
        setCareerLoading(false);
      }
    };
    fetchCareerData();
  }, []);

  // ═════════════════════════════════════════════
  // 4. Fetch live exchange rates (auto-refresh every 60s)
  // ═════════════════════════════════════════════

  // ═════════════════════════════════════════════
  // 5. Fetch AI Macro Market Analysis
  // ═════════════════════════════════════════════
  const fetchMarketAnalysis = async () => {
    if (marketRequestInFlightRef.current) return;

    marketRequestInFlightRef.current = true;
    setMarketLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/finance/market-analysis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setMarketData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch market analysis:', err);
    } finally {
      marketRequestInFlightRef.current = false;
      setMarketLoading(false);
    }
  };

  const fetchDocumentIntelligence = async () => {
    if (documentIntelligenceRequestInFlightRef.current) return;

    documentIntelligenceRequestInFlightRef.current = true;
    setDocumentIntelligenceLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/finance/document-intelligence`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setDocumentIntelligence(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch finance document intelligence:', err);
      setDocumentIntelligence({
        status: 'empty',
        message: 'No financial history available yet.',
        detail: 'Upload bills, receipts, or financial documents to detect unusual spending patterns.',
        insights: [],
        spikes: [],
        categoryAnalysis: [],
      });
    } finally {
      documentIntelligenceRequestInFlightRef.current = false;
      setDocumentIntelligenceLoading(false);
    }
  };

  useEffect(() => {
    const handleUploadHistoryUpdated = () => {
      window.clearTimeout(documentIntelligenceDebounceRef.current);
      documentIntelligenceDebounceRef.current = window.setTimeout(fetchDocumentIntelligence, 600);
    };

    window.addEventListener('upload-history-updated', handleUploadHistoryUpdated);
    return () => {
      window.clearTimeout(documentIntelligenceDebounceRef.current);
      window.removeEventListener('upload-history-updated', handleUploadHistoryUpdated);
    };
  }, []);


  // ═════════════════════════════════════════════
  // Bank Sync handler
  // ═════════════════════════════════════════════

  const financeHistory = history.filter(log => ['🏦', '💰', '📉', '🛡️', '💳'].includes(log.emoji)).slice(0, 4);

  const fallbackBadges = [
    { id: 'f1', title: 'Savings Champion', requirement: 'Save 20% of income', xpNeeded: 200, icon: '💰' },
    { id: 'f2', title: 'Credit Prime', requirement: 'Reach 750+ Credit Score', xpNeeded: 500, icon: '🏦' },
    { id: 'f3', title: 'Discipline', requirement: 'No impulse buys for 7 days', xpNeeded: 150, icon: '🛡️' }
  ];

  const dbFinanceBadges = availableBadges.filter(b => ['plaid', 'budget', 'savings', 'credit'].some(key => b.id.includes(key)));
  const financeBadges = dbFinanceBadges.length > 0 ? dbFinanceBadges : fallbackBadges;

  // Derived metrics
  const overviewMetrics = buildOverviewMetrics(financeData, financeLoading, financeError);

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div
      className={`relative min-h-full overflow-hidden px-5 py-6 sm:px-6 lg:px-8 ${theme === 'light'
        ? 'bg-[#f8fafc] text-[#0f172a]'
        : 'bg-[#05070d] text-white'
        }`}
    >      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,168,75,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(123,97,255,0.10),transparent_26%),radial-gradient(circle_at_center,rgba(15,143,132,0.08),transparent_30%)]" />
      <div className="relative">

        {/* Header Section */}
        <section className="mb-6">
          <div>
            <h1 className={`text-4xl font-semibold tracking-tight ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>Finance Intelligence</h1>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${theme === 'light' ? 'text-[#334155]' : 'text-white/90'}`}>
              Autonomous tracking of behavioral spending metrics, global macroeconomic factors, and AI-powered financial projections.
            </p>
          </div>
        </section>

        {/* ── 🏆 Autonomous Achievements ── */}
        <section className="mb-6">
          <article
            className={`rounded-2xl border border-[#c8a84b]/20 ${theme === 'light'
              ? 'bg-white'
              : 'bg-gradient-to-br from-[#c8a84b]/5 to-[#05070d]'
              } p-6 shadow-[0_18px_48px_rgba(200,168,75,0.08)] backdrop-blur-xl`}
          >
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>
                  <span className="text-2xl">🏆</span> Autonomous Financial Achievements
                </h2>
                <p className={`mt-1 text-sm ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>Your connected banking APIs automatically validate your financial milestones.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Validations */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h3 className={`text-xs font-bold uppercase tracking-widest ${theme === 'light' ? 'text-[#94a3b8]' : 'text-white/60'} mb-3`}>Recent Validations</h3>
                <div className="space-y-2">
                  {financeHistory.length > 0 ? financeHistory.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{log.emoji}</span>
                        <span className={`text-sm font-medium ${theme === 'light' ? 'text-[#334155]' : 'text-white/90'}`}>{log.activity}</span>
                      </div>
                      <span className="text-xs font-bold text-[#c8a84b]">+{log.points} XP</span>
                    </div>
                  )) : (
                    <p className={`text-sm ${theme === 'light' ? 'text-[#94a3b8]' : 'text-white/50'} italic`}>No financial syncs logged yet. APIs run autonomously in the background.</p>
                  )}
                </div>
              </div>

              {/* Financial Badges */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h3 className={`text-xs font-bold uppercase tracking-widest ${theme === 'light' ? 'text-[#94a3b8]' : 'text-white/60'} mb-3`}>Financial Badges</h3>
                <div className="grid grid-cols-1 gap-3">
                  {financeBadges.map(badge => {
                    const isUnlocked = unlockedBadges.includes(badge.id);
                    return (
                      <div key={badge.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isUnlocked ? 'bg-[#c8a84b]/10 border-[#c8a84b]/30' : 'bg-white/5 border-white/5 opacity-60'}`}>
                        <span className="text-2xl">{badge.icon}</span>
                        <div>
                          <p className={`text-sm font-bold ${isUnlocked ? 'text-[#c8a84b]' : (theme === 'light' ? 'text-[#334155]' : 'text-white/80')}`}>{badge.title}</p>
                          <p className={`text-[10px] ${theme === 'light' ? 'text-[#94a3b8]' : 'text-white/60'}`}>{badge.requirement}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* ── Overview Metrics ── */}
        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewMetrics.map((metric) => (
            <OverviewCard key={metric.label} metric={metric} />
          ))}
        </section>

        {/* ── ⚠️ Retail Therapy Alert + 📈 Live Market Snapshot ── */}

        {/* ── Unusual Spending Spike Detector + Macro Market Analysis ── */}
        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <article className={`${getGlassCardClass(theme)} p-6 xl:col-span-8`}>
            <SpendingSpikeDetector
              intelligence={documentIntelligence}
              loading={documentIntelligenceLoading}
              onAnalyze={fetchDocumentIntelligence}
            />
          </article>

          <article className={`${getGlassCardClass(theme)} flex flex-col p-6 xl:col-span-4`}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>Macro Market Analysis</h2>
                <p className={`mt-1 text-sm ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>Global catalysts: Political, Legal, Conflict, & Health updates</p>
              </div>
              <button
                type="button"
                onClick={fetchMarketAnalysis}
                disabled={marketLoading}
                className="shrink-0 rounded-xl border border-[#c8a84b]/30 bg-[#c8a84b]/10 px-3 py-2 text-xs font-bold text-[#f5d76e] transition hover:bg-[#c8a84b]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {marketLoading ? 'Loading...' : marketData ? 'Refresh' : 'Analyze'}
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[280px] pr-1">
              {marketLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="finance-pulse-skeleton h-14 rounded-lg bg-white/5" />
                  ))}
                </div>
              ) : marketData?.impacts && marketData.impacts.length > 0 ? (
                marketData.impacts.map((imp, idx) => (
                  <MarketImpactRow key={idx} title={imp.title} detail={imp.detail} type={imp.type} />
                ))
              ) : (
                <p className={`text-sm ${theme === 'light' ? 'text-[#94a3b8]' : 'text-white/50'} italic`}>Click Analyze to generate market impact insights.</p>
              )}
            </div>
          </article>
        </section>

        {/* ── Finance Observation & Suggestions + Cross Intelligence ── */}
        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <article className={`${getGlassCardClass(theme)} p-6 xl:col-span-6`}>
            <h2 className={`mb-4 text-xl font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>Finance Observation & Suggestions</h2>
            <div className="space-y-4">
              <div className={`flex items-start gap-4 rounded-2xl p-4 ${theme === 'light'
                ? 'border border-[#e2e8f0] bg-[#f8fafc]'
                : 'border border-white/10 bg-white/5'
                }`}>                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7b61ff]/15 text-[#7b61ff]">
                  <BoltIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className={`mb-4 text-xl font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>
                    Impulse Spending Trigger Mitigated
                  </h2>
                  <p className={`mt-1 text-xs leading-5 ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>Identified a loop of 10 PM social media surfing causing stress buys. Restricting shopping apps after 9 PM could yield up to $140/mo in direct savings.</p>
                </div>
              </div>
              <div className={`flex items-start gap-4 rounded-2xl p-4 ${theme === 'light'
                ? 'border border-[#e2e8f0] bg-[#f8fafc]'
                : 'border border-white/10 bg-white/5'
                }`}>                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c8a84b]/15 text-[#c8a84b]">
                  <VerifiedIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className={`mb-4 text-xl font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>
                    Liquidity Optimization Target
                  </h2>
                  <p className={`mt-1 text-xs leading-5 ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>To counter market volatility, freeze all speculative certification/luxury purchases for 90 days. Redirect excess funds entirely into your Savings Shield.</p>
                </div>
              </div>
            </div>
          </article>

          <article className={`${getGlassCardClass(theme)} p-6 space-y-4 xl:col-span-6`}>
            <CrossIntelligencePanel
              documentIntelligence={documentIntelligence}
              financeData={financeData}
              healthData={healthData}
              careerData={careerData}
              loading={documentIntelligenceLoading || financeLoading || healthLoading || careerLoading}
            />
          </article>
        </section>

        {/* ── Financial Trajectory ── */}
        <section className="grid grid-cols-1 gap-6">
          <article className={`${getGlassCardClass(theme)} p-6`}>
            <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>Financial Trajectory</h2>
                <p className={`mt-1 text-sm ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>AI forecasting based on current lifestyle habits versus optimized stability tracks</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <Legend color="#c8a84b" label="Current path" />
                <Legend color="#7df3cc" label="Stable path" />
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
              <div className={`absolute inset-x-0 bottom-0 flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] ${theme === 'light' ? 'text-[#94a3b8]' : 'text-white/70'}`}>
                <span>Current</span>
                <span>6 months</span>
                <span>1 year</span>
                <span>2 years</span>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className={`text-sm ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>Projected difference in 24 months:</p>
              <span className="text-xl font-semibold text-[#c8a84b]">+₹1,50,000.00</span>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HELPER: Build overview metrics from backend
   ═══════════════════════════════════════════════ */
function buildOverviewMetrics(financeData, loading, error) {
  if (loading) {
    return [
      { label: 'Total Salary', value: null, detail: 'Loading...', tone: 'primary', loading: true },
      { label: 'Monthly Expenses', value: null, detail: 'Loading...', tone: 'primary', loading: true },
      { label: 'Share Holdings', value: null, detail: 'Loading...', tone: 'neutral', loading: true },
      { label: 'LIC / Insurance', value: null, detail: 'Loading...', tone: 'neutral', loading: true },
    ];
  }

  if (error || !financeData) {
    return [
      { label: 'Total Salary', value: '—', detail: error || 'Data unavailable', tone: 'neutral', bar: 0 },
      { label: 'Monthly Expenses', value: '—', detail: error || 'Data unavailable', tone: 'neutral', bar: 0 },
      { label: 'Share Holdings', value: '-', detail: error || 'Data unavailable', tone: 'neutral', bar: 0 },
      { label: 'LIC / Insurance', value: '-', detail: error || 'Data unavailable', tone: 'neutral', bar: 0 },
    ];
  }

  const holdings = financeData.holdings || [];
  const isInsuranceHolding = (holding) => {
    const name = String(holding.assetName || '').toLowerCase();
    return name === 'lic' || name.includes('lic') || name.includes('insurance');
  };
  const shareHoldings = holdings.filter(h => !isInsuranceHolding(h));
  const insuranceHoldings = holdings.filter(isInsuranceHolding);
  const sharesCount = shareHoldings.reduce((sum, h) => sum + Number(h.shares || 0), 0);
  const shareValue = shareHoldings.reduce((sum, h) => sum + Number(h.value || 0), 0);
  const insuranceCount = insuranceHoldings.length;
  const insuranceValue = insuranceHoldings.reduce((sum, h) => sum + Number(h.value || 0), 0);
  const expenseDetail = buildMonthlyExpenseDetail(financeData);

  return [
    {
      label: 'Total Salary',
      value: `₹${financeData.totalSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}`,
      detail: `Base + Monthly Credits`,
      tone: 'primary',
      bar: 100
    },
    {
      label: 'Monthly Expenses',
      value: `₹${financeData.monthlyExpenses?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}`,
      detail: expenseDetail,
      tone: financeData.metrics?.unusualSpikeDetected ? 'warm' : 'primary',
      bar: financeData.totalSalary > 0 ? Math.min((financeData.monthlyExpenses / financeData.totalSalary) * 100, 100) : 0,
    },
    {
      label: 'Share Holdings',
      value: `${sharesCount.toLocaleString('en-IN')} Shares`,
      detail: `Updated from Daily Update buys/sells - Rs ${shareValue.toLocaleString('en-IN')}`,
      tone: 'primary',
      ring: Math.min((shareValue / 50000) * 100, 100),
      icon: ShareIcon
    },
    {
      label: 'LIC / Insurance',
      value: `${insuranceCount} Plan${insuranceCount === 1 ? '' : 's'}`,
      detail: `Updated from Daily Update insurance - Rs ${insuranceValue.toLocaleString('en-IN')}`,
      tone: insuranceValue > 0 ? 'primary' : 'neutral',
      ring: Math.min((insuranceValue / 50000) * 100, 100),
      icon: ShieldIcon
    },
  ];
}

/* ═══════════════════════════════════════════════
   HELPER: Compute Retail Therapy Alert
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   COMPONENT: Retail Therapy Alert
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   COMPONENT: Alert Metric Chip
   ═══════════════════════════════════════════════ */
function buildMonthlyExpenseDetail(financeData) {
  const breakdown = financeData?.expenseBreakdown || {};
  const daily = Number(breakdown.dailyUpdateSpending || 0);
  const uploaded = Number(breakdown.uploadedDocumentSpending || 0);

  if (daily > 0 || uploaded > 0) {
    const parts = [];
    if (daily > 0) parts.push(`daily updates Rs ${daily.toLocaleString('en-IN')}`);
    if (uploaded > 0) parts.push(`uploaded bills Rs ${uploaded.toLocaleString('en-IN')}`);
    return `Onboarding baseline + ${parts.join(' + ')}`;
  }

  return 'From onboarding monthly expenditure baseline';
}

function SpendingSpikeDetector({ intelligence, loading, onAnalyze }) {
  const { theme } = useTheme();
  const status = intelligence?.status;
  const spikes = intelligence?.spikes || [];
  const categoryAnalysis = intelligence?.categoryAnalysis || [];
  const visibleItems = spikes.length ? spikes : categoryAnalysis.filter((item) => item.severity !== 'Normal');

  const headerAction = (
    <button
      type="button"
      onClick={onAnalyze}
      disabled={loading}
      className="rounded-xl border border-[#7b61ff]/30 bg-[#7b61ff]/10 px-3 py-2 text-xs font-bold text-[#c084fc] transition hover:bg-[#7b61ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? 'Analyzing...' : intelligence ? 'Re-analyze' : 'Analyze documents'}
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <PanelTitle title="Unusual Spending Spike Detector" subtitle="Reading uploaded finance documents" />
          {headerAction}
        </div>
        {[1, 2, 3].map((item) => <div key={item} className="finance-pulse-skeleton h-16 rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  if (status === 'empty' || !intelligence) {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <PanelTitle title="Unusual Spending Spike Detector" subtitle="Document-based anomaly detection" badge="Empty State" />
          {headerAction}
        </div>
        <EmptyFinanceState title="No financial history available yet." detail="Upload bills, receipts, or financial documents to detect unusual spending patterns." />
      </div>
    );
  }

  if (status === 'insufficient') {
    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <PanelTitle title="Unusual Spending Spike Detector" subtitle={`${intelligence.documentCount || 1} finance document found`} badge="Needs History" />
          {headerAction}
        </div>
        <EmptyFinanceState title="More spending history is needed before unusual spending can be detected." detail="Need at least 2-3 finance records for comparison." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <PanelTitle title="Unusual Spending Spike Detector" subtitle={`${intelligence.documentCount || 0} uploaded finance documents analyzed`} badge={visibleItems.length ? 'Document Signal' : 'No Spikes'} />
        {headerAction}
      </div>
      {visibleItems.length ? (
        <div className="space-y-4">
          {visibleItems.slice(0, 3).map((item) => (
            <div key={item.category} className="rounded-2xl border-l-4 bg-white/5 p-4" style={{ borderLeftColor: severityColor(item.severity) }}>
              <div className="flex items-start gap-3">
                <WarningIcon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: severityColor(item.severity) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-base font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>{item.title}</p>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: severityColor(item.severity) }}>
                      {item.severity}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm leading-6 ${theme === 'light' ? 'text-[#334155]' : 'text-white/90'}`}>{item.description}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-3">
            <MiniStat label="Historical average" value={formatRs(visibleItems[0]?.average)} />
            <MiniStat label="Current expense" value={formatRs(visibleItems[0]?.current)} />
            <MiniStat label="Difference" value={`+${visibleItems[0]?.changePct || 0}%`} />
          </div>
        </div>
      ) : (
        <EmptyFinanceState title="No unusual spending spikes detected." detail="Uploaded finance documents do not show category increases above the 20% threshold." />
      )}
    </div>
  );
}

function CrossIntelligencePanel({ documentIntelligence, financeData, healthData, careerData, loading }) {
  const { theme } = useTheme();
  const insights = buildCrossDomainFinanceInsights({ financeData, healthData, careerData, documentIntelligence });

  if (loading) {
    return (
      <div className="space-y-4">
        <PanelTitle title="Cross Intelligence" subtitle="Connecting finance with health and career signals" />
        {[1, 2, 3].map((item) => <div key={item} className="finance-pulse-skeleton h-14 rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  if (!financeData && !healthData && !careerData) {
    return (
      <div className="space-y-4">
        <PanelTitle title="Cross Intelligence" subtitle="Finance × Health × Career" badge="No Signals" />
        <EmptyFinanceState title="No cross-domain data available yet." detail="Connect or sync finance, health, and career data to see how money patterns affect wellbeing and productivity." />
      </div>
    );
  }

  if (!insights.length) {
    return (
      <div className="space-y-4">
        <PanelTitle title="Cross Intelligence" subtitle="Finance × Health × Career" badge="Stable" />
        <EmptyFinanceState title="No strong cross-domain finance signals detected." detail="Current finance, health, and career readings do not show a meaningful relationship that needs action." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PanelTitle title="Cross Intelligence" subtitle="Finance × Health × Career signals" badge="Live Twin Data" />
      <ul className="space-y-3">
        {insights.slice(0, 5).map((insight, index) => (
          <li key={`${insight}-${index}`} className={`rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 ${theme === 'light' ? 'text-[#334155]' : 'text-white/88'}`}>
            <span className="mr-2 text-[#7df3cc]">•</span>{insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildCrossDomainFinanceInsights({ financeData, healthData, careerData, documentIntelligence }) {
  const insights = [];
  const monthlyExpenses = Number(financeData?.monthlyExpenses || 0);
  const totalSalary = Number(financeData?.totalSalary || 0);
  const savingsRate = parsePercent(financeData?.metrics?.monthlySavingsRate);
  const portfolioValue = Number(financeData?.portfolioValue || 0);
  const transactions = Array.isArray(financeData?.recentTransactions) ? financeData.recentTransactions : [];
  const discretionarySpend = transactions
    .filter((txn) => /food|dining|entertainment|shopping|retail/i.test(String(txn.category || txn.merchant || '')))
    .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);

  const sleepHours = Number(healthData?.metrics?.sleepHours || 0);
  const hrv = Number(healthData?.metrics?.hrv || 0);
  const steps = Number(healthData?.metrics?.steps || 0);
  const commits = Number(careerData?.githubCommitsThisWeek || 0);
  const meetings = Number(careerData?.hoursInMeetingsToday || 0);
  const courseProgress = parsePercent(careerData?.learning?.courseProgress);
  const topSpike = documentIntelligence?.spikes?.[0] || documentIntelligence?.categoryAnalysis?.find((item) => item.severity !== 'Normal');

  if (totalSalary > 0 && monthlyExpenses > 0) {
    const expenseRatio = Math.round((monthlyExpenses / totalSalary) * 100);
    if (expenseRatio >= 70 && sleepHours > 0 && sleepHours < 6.5) {
      insights.push(`Monthly expenses are using ${expenseRatio}% of income while sleep is ${sleepHours}h, suggesting finance pressure may be affecting recovery.`);
    } else {
      insights.push(`Monthly expenses are ${expenseRatio}% of income, leaving a savings rate of ${Number.isFinite(savingsRate) ? `${savingsRate}%` : 'limited visible'} for stability planning.`);
    }
  }

  if (discretionarySpend > 0 && meetings > 0) {
    insights.push(`Discretionary spending is Rs ${Math.round(discretionarySpend).toLocaleString('en-IN')} while meeting load is ${meetings}h today; high-workload days may be influencing convenience purchases.`);
  }

  if (portfolioValue > 0 && courseProgress > 0) {
    insights.push(`Portfolio value is Rs ${Math.round(portfolioValue).toLocaleString('en-IN')} and active course progress is ${courseProgress}%, linking investment growth with career upskilling momentum.`);
  }

  if (Number.isFinite(savingsRate) && savingsRate >= 25 && commits >= 10) {
    insights.push(`Savings rate is ${savingsRate}% while GitHub activity shows ${commits} commits this week, indicating finance stability is supporting career execution.`);
  } else if (commits > 0 && monthlyExpenses > 0) {
    insights.push(`Career activity shows ${commits} commits this week alongside Rs ${Math.round(monthlyExpenses).toLocaleString('en-IN')} in monthly expenses; protect focus by keeping fixed costs predictable.`);
  }

  if (hrv > 0 && hrv < 45 && monthlyExpenses > 0) {
    insights.push(`HRV is ${hrv}ms and monthly spending is Rs ${Math.round(monthlyExpenses).toLocaleString('en-IN')}; stress signals and finance load should be reviewed together.`);
  }

  if (steps > 0 && steps < 6000 && discretionarySpend > 0) {
    insights.push(`Steps are ${steps.toLocaleString('en-IN')} and discretionary spending is Rs ${Math.round(discretionarySpend).toLocaleString('en-IN')}; low-activity days may be pairing with higher convenience spending.`);
  }

  if (topSpike) {
    insights.push(`${topSpike.category} spending increased by ${topSpike.changePct}% versus its document-based average, making it the clearest finance category to compare against health and career patterns.`);
  }

  return Array.from(new Set(insights)).slice(0, 5);
}

function parsePercent(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const number = Number(String(value).replace('%', '').trim());
  return Number.isFinite(number) ? number : NaN;
}

function PanelTitle({ title, subtitle, badge }) {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>{title}</h2>
        <p className={`mt-1 text-sm ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>{subtitle}</p>
      </div>

      {badge && (
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${theme === 'light'
          ? 'border border-[#e2e8f0] bg-[#f8fafc] text-[#c8a84b]'
          : 'border border-white/10 bg-white/5 text-[#c8a84b]'
          }`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function EmptyFinanceState({ title, detail }) {
  const { theme } = useTheme();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-[#c8a84b]">
          <VerifiedIcon className="h-5 w-5" />
        </div>
        <div>
          <p className={`text-sm font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>{title}</p>
          <p className={`mt-1 text-sm leading-6 ${theme === 'light' ? 'text-[#64748b]' : 'text-white/70'}`}>{detail}</p>
        </div>
      </div>
    </div>
  );
}

function severityColor(severity) {
  if (severity === 'Unusual Spending Spike') return '#ff4d7d';
  if (severity === 'High Increase') return '#ffb020';
  if (severity === 'Moderate Increase') return '#c8a84b';
  return '#10c7a1';
}

function formatRs(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}


/* ═══════════════════════════════════════════════
   COMPONENT: Live Market Snapshot
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   COMPONENT: Exchange Rate Row
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS (preserved from original)
   ═══════════════════════════════════════════════ */
function MarketImpactRow({ title, detail, type }) {
  const { theme } = useTheme();

  let cardClasses = "";
  let titleClasses = "";
  let bodyClasses = "";

  if (theme === 'light') {
    cardClasses = "bg-white border-[#e2e8f0]";
    titleClasses = "text-[#0f172a]";
    bodyClasses = "text-[#64748b]";
  } else {
    let badgeColor = "bg-white/5 text-white/90 border-white/10";
    if (type === "danger") badgeColor = "bg-[#111722] text-[#c8a84b] border-[#c8a84b]/20";
    if (type === "warning") badgeColor = "bg-[#111722] text-[#ffb38a] border-[#ff7a00]/20";
    cardClasses = badgeColor;
    bodyClasses = "text-white/80";
  }

  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-3 ${cardClasses}`}>
      <h4 className={`text-xs font-bold uppercase tracking-wider ${titleClasses}`}>{title}</h4>
      <p className={`text-sm leading-relaxed ${bodyClasses}`}>{detail}</p>
    </div>
  );
}

function OverviewCard({ metric }) {
  const { theme } = useTheme();
  const Icon = metric.icon;
  const tone = metric.tone === 'warm' ? '#c8a84b' : '#7df3cc';

  if (metric.loading) {
    return (
      <article className={`${getGlassCardClass(theme)} relative overflow-hidden p-5`}>
        <div className="space-y-3">
          <div className="finance-pulse-skeleton h-3 w-24 rounded bg-white/8" />
          <div className="finance-pulse-skeleton h-8 w-20 rounded bg-white/8" />
          <div className="finance-pulse-skeleton h-3 w-32 rounded bg-white/8" />
          <div className="finance-pulse-skeleton mt-2 h-2 w-full rounded-full bg-white/8" />
        </div>
      </article>
    );
  }

  return (
    <article className={`${getGlassCardClass(theme)} relative overflow-hidden p-5`}>
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-10 rounded-full bg-[#c8a84b]/10" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.14em] ${theme === 'light' ? 'text-[#64748b]' : 'text-white/70'}`}>{metric.label}</p>
          <h3 className="text-2xl font-semibold" style={{ color: tone }}>{metric.value}</h3>
          <p className={`mt-2 flex items-center gap-1 text-sm ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>
            {metric.tone === 'primary' && <ArrowUpIcon className="h-4 w-4 text-[#7df3cc]" />}
            {metric.detail}
          </p>
        </div>
        {metric.ring != null && Icon && (
          <div className="relative h-16 w-16 shrink-0">
            <ProgressRing value={metric.ring} color={tone} />
            <Icon className="absolute inset-0 m-auto h-5 w-5" style={{ color: tone }} />
          </div>
        )}
      </div>

      {metric.bar != null && (
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
  const { theme } = useTheme();
  return (
    <div className={`rounded-lg border p-4 ${theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/5'}`}>
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.14em] ${theme === 'light' ? 'text-[#64748b]' : 'text-white/70'}`}>{label}</p>
      <p className={`text-lg font-semibold ${theme === 'light' ? 'text-[#0f172a]' : 'text-white'}`}>
        {value} {delta && <span className="text-sm text-[#c8a84b]">{delta}</span>}
      </p>
    </div>
  );
}

function Legend({ color, label }) {
  const { theme } = useTheme();
  return (
    <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-[#64748b]' : 'text-white/80'}`}>
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════ */
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

// ✅ Rest of your teammate's SVG icons remain unmodified down here...
function ShareIcon({ className, style }) {
  return <IconBase className={className} style={style}><path d="M4 19V5M4 19h16M8 15l3-3 3 2 5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M16 7h3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function ArrowUpIcon({ className }) {
  return <IconBase className={className}><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function WarningIcon({ className, style }) {
  return <IconBase className={className} style={style}><path d="M12 9v4M12 17h.01M10.3 4.4 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}


// ... Keep everything exactly the same to protect execution stability!
function BoltIcon({ className }) {
  return <IconBase className={className}><path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function VerifiedIcon({ className }) {
  return <IconBase className={className}><path d="M20 7 9 18l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}


export default Finance;
