import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts';
import {
  BadgeDollarSign, Bell, Briefcase, CalendarDays, CheckCircle2,
  ChevronRight, HeartPulse, Search, Target,
  Flame, Brain, Activity, ArrowUpRight, Wallet,
  MessageCircle, Camera, Send, Lock, Trophy,
} from 'lucide-react';
import { useGamification } from '../context/GamificationContext';
import { useIntegrations } from '../context/IntegrationContext';
import { useDashboardSync } from '../context/DashboardSyncContext';
import useNotificationCount from '../hooks/useNotificationCount';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 22 } },
};

const fallbackProfile = {
  behavioralAnalysis: { focusAreas: ['productivity', 'finance', 'health'] },
  integrations: {
    github: { status: 'disconnected', username: '' },
    leetcode: { status: 'disconnected', username: '' },
    fitbit: { status: 'disconnected' },
    linkedin: { status: 'disconnected', profileLink: '' },
    banking: { status: 'disconnected' },
  },
  lifestyle: { gender: '', sleepHours: 6, studyHours: 5, exerciseFrequency: 2, spendingStyle: 'balanced', smokingHabits: 'no', periodTracking: 'not_now', genderSpecificHealthContext: 'not_now' },
  financialPatterns: { monthlyIncome: '52000', monthlyExpenditure: '34000', savingsHabits: 'moderate', financialStressLevel: 5 },
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────
function Dashboard() {
  const navigate = useNavigate();
  const { dashboardData, isLoading: isLoadingDashboard, refreshDashboard } = useDashboardSync();
  const [liveFinanceData, setLiveFinanceData] = useState(null);
  const user = getStoredUser();
  const firstName = user?.firstName || 'Anjali';
  const profile = useMemo(() => normalizeProfile(dashboardData?.profile || getStoredProfile()), [dashboardData]);
  const { integrations } = useIntegrations();
  const insights = useMemo(() => buildInsights(profile, dashboardData, integrations, liveFinanceData), [profile, dashboardData, integrations, liveFinanceData]);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const { totalXP = 0, level = 1, history = [], unlockedBadges = [], availableBadges = [] } = useGamification();

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => refreshDashboard?.(), 0);
    return () => window.clearTimeout(refreshTimer);
  }, [refreshDashboard]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshDashboard?.();
    };

    window.addEventListener('focus', refreshDashboard);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('focus', refreshDashboard);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    let cancelled = false;

    const fetchLiveFinance = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const response = await axios.get(`${API_BASE_URL}/api/integrations/finance`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled && response.data?.success) {
          setLiveFinanceData(response.data.data);
        }
      } catch (error) {
        console.warn('[Dashboard] Failed to load live finance data:', error.message);
      }
    };

    fetchLiveFinance();

    window.addEventListener('daily-update-completed', fetchLiveFinance);
    window.addEventListener('upload-history-updated', fetchLiveFinance);
    window.addEventListener('dashboard-data-updated', fetchLiveFinance);

    return () => {
      cancelled = true;
      window.removeEventListener('daily-update-completed', fetchLiveFinance);
      window.removeEventListener('upload-history-updated', fetchLiveFinance);
      window.removeEventListener('dashboard-data-updated', fetchLiveFinance);
    };
  }, []);

  return (
    <div className="flex min-h-screen min-w-0 flex-1 overflow-hidden bg-[#05070c] text-white" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.016)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
        <div className="absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-[#7b61ff]/6 blur-[130px]" />
        <div className="absolute -right-40 bottom-0 h-[560px] w-[560px] rounded-full bg-[#10c7a1]/5 blur-[150px]" />
        <div className="absolute left-1/3 top-1/2 h-[280px] w-[280px] rounded-full bg-[#c8a84b]/3 blur-[100px]" />
      </div>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader
          today={today}
          firstName={firstName}
          onSearchClick={() => navigate('/copilot')}
          onNotificationClick={() => navigate('/notifications')}
        />

        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-6 lg:px-8" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <motion.div className="mx-auto w-full max-w-[1480px] space-y-5" variants={pageVariants} initial="hidden" animate="show">

            {/* ── HERO ── */}
            <motion.div variants={itemVariants}>
              <HeroSection firstName={firstName} insights={insights} isLoading={isLoadingDashboard} navigate={navigate} />
            </motion.div>

            {/* ── ROW 1: Score Cards ── */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ScoreCard
                title="Health Score"
                value={insights.healthScore}
                icon={HeartPulse}
                emoji="🧬"
                colorState={insights.healthState.colorState}
                subtitle={`${insights.burnoutRisk}% burnout risk`}
                onClick={() => navigate('/health')}
              />
              <ScoreCard
                title="Finance Score"
                value={insights.financeScore}
                icon={BadgeDollarSign}
                emoji="💎"
                colorState={insights.thresholds.financial.colorState}
                subtitle={insights.monthlyBuffer}
                onClick={() => navigate('/finance')}
              />
              <ScoreCard
                title="Career Score"
                value={insights.productivityScore}
                icon={Briefcase}
                emoji="🎯"
                colorState={insights.thresholds.productivity.colorState}
                subtitle={`${insights.recoveryScore}% recovery`}
                onClick={() => navigate('/career')}
              />
            </motion.div>

            {/* ── ROW 2: Gamified Journey Map (With Motivating XP Vault) ── */}
            <motion.div variants={itemVariants}>
              <GamifiedJourneyMap 
                totalXP={totalXP} 
                level={level} 
                history={history} 
                unlockedBadges={unlockedBadges} 
                availableBadges={availableBadges} 
                profile={profile} 
                liveIntegrations={integrations}
              />
            </motion.div>

            {/* ── ROW 3: Radar + Digital Twin + Daily Calendar ── */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.85fr_0.9fr]">
              <LifeBalanceRadar insights={insights} />
              <DigitalTwinPanel insights={insights} />
              <DailyCalendarStreak insights={insights} />
            </motion.div>

            {/* ── ROW 4: Finance Chart + AI Insights ── */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
              <FinanceChart insights={insights} onOpen={() => navigate('/finance')} />
              <AIInsightsPanel insights={insights} navigate={navigate} />
            </motion.div>

            {/* ── ROW 5: Command Portals ── */}
            <motion.div variants={itemVariants}>
              <CommandPortals navigate={navigate} />
            </motion.div>

            {/* ── ROW 6: Adaptive Recommendations ── */}
            <motion.div variants={itemVariants}>
              <AdaptiveRecommendations insights={insights} />
            </motion.div>

          </motion.div>
        </main>
      </section>
    </div>
  );
}

// ─── Gamified Journey Map (UPGRADED MASSIVE XP VAULT) ───────────────────────
function GamifiedJourneyMap({ totalXP, level, history, unlockedBadges, availableBadges, profile, liveIntegrations }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [shareTip, setShareTip] = useState(null);

  // Safely calculate today's XP directly from the backend history logs
  const todayXP = history.reduce((sum, log) => sum + (log.points || 0), 0);
  
  // Calculate readiness titles
  const readinessTitle = level < 3 ? 'Initiate' : level < 6 ? 'Intermediate' : level < 9 ? 'Advanced' : 'Vanguard';
  const remainingToNext = 500 - (totalXP % 500); 
  const progressPercent = Math.min(((totalXP % 500) / 500) * 100, 100);

  // Use live context first, fall back to profile for SSR / loading state
  const isConnected = (key) => {
    if (liveIntegrations?.[key]?.status === 'connected') return true;
    if (profile?.integrations?.[key]?.status === 'connected') return true;
    
    const linkKeys = {
      github: 'githubUsername',
      leetcode: 'leetcodeUsername',
      fitbit: 'fitbitProfile',
      linkedin: 'linkedinProfile',
      banking: 'bankingProfile'
    };
    const field = linkKeys[key];
    if (field && profile?.[field]) return true;

    return false;
  };

  // Fallback to static milestones if backend badges haven't loaded yet
  const fallbackMilestones = [
    { id: 'gh1', filterKey: 'github', title: 'GitHub CONTRIBUTOR', req: 'Connect & sync 5 repositories', xp: 200, icon: '💻', completed: isConnected('github') },
    { id: 'lc1', filterKey: 'leetcode', title: 'LeetCode PROBLEM SOLVER', req: 'Solve 10 algorithm problems', xp: 150, icon: '⚡', completed: isConnected('leetcode') },
    { id: 'fb1', filterKey: 'fitbit', title: 'Fitbit ACTIVE', req: 'Log 10,000 steps for 7 consecutive days', xp: 300, icon: '🏃', completed: isConnected('fitbit') },
    { id: 'li1', filterKey: 'linkedin', title: 'LinkedIn NETWORKER', req: 'Sync 50+ professional connections', xp: 100, icon: '🔗', completed: isConnected('linkedin') },
    { id: 'bk1', filterKey: 'banking', title: 'Banking SA SAVER', req: 'Maintain positive spending trajectory', xp: 100, icon: '🏦', completed: isConnected('banking') },
    { id: 'v1', filterKey: 'all', title: 'DIGITAL TWIN VANGUARD', req: 'Reach Level 10 System Readiness', xp: 1000, icon: '👑', completed: level >= 10, isUltimate: true },
  ];

  // Merge backend badges with our UI rules
  const MASTER_MILESTONES = availableBadges.length > 0 ? availableBadges.map(b => ({
     id: b.id,
     filterKey: b.id.includes('github') ? 'github' : b.id.includes('sleep') ? 'fitbit' : b.id.includes('spend') ? 'banking' : 'all',
     title: b.title,
     req: b.requirement,
     xp: b.xpNeeded,
     icon: b.icon,
     completed: unlockedBadges.includes(b.id)
  })) : fallbackMilestones;

  const filteredMilestones = activeFilter === 'all' 
    ? MASTER_MILESTONES 
    : MASTER_MILESTONES.filter(m => m.filterKey === activeFilter);

  // Social Share Simulator
  const handleShare = (platform, id) => {
    setShareTip({ platform, id });
    setTimeout(() => setShareTip(null), 3000);
  };

  const getFilterColor = (key) => {
    if (key === activeFilter) return 'bg-[#10c7a1]/20 text-[#10c7a1] border-[#10c7a1]/40';
    if (isConnected(key)) return 'bg-white/10 text-white border-white/20';
    return 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10';
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 rounded-[1.75rem] border border-white/10 bg-[#0d1018]/90 backdrop-blur-2xl p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 bg-[#10c7a1]/5 blur-[80px] rounded-full" />
      
      {/* Left Column: Visual Map & Stats */}
      <div className="flex-1 flex flex-col min-w-[50%]">
        
        {/* ✅ THE MASSIVE GLOWING XP VAULT (Motivator) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 p-5 rounded-2xl bg-gradient-to-br from-[#c8a84b]/15 to-transparent border border-[#c8a84b]/30 relative overflow-hidden shadow-[0_0_40px_rgba(200,168,75,0.08)]">
           <div className="absolute right-0 top-0 w-48 h-full bg-gradient-to-l from-[#c8a84b]/20 to-transparent pointer-events-none" />
           <Flame className="absolute -bottom-4 -left-4 w-24 h-24 text-[#c8a84b] opacity-10 pointer-events-none" />
           
           <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-black uppercase tracking-widest text-[#c8a84b]">
                 <Target className="w-3.5 h-3.5" /> Total Earned Experience
              </div>
              <div className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(200,168,75,0.4)] flex items-baseline gap-2">
                 {totalXP} <span className="text-xl text-[#c8a84b] pb-1">XP</span>
              </div>
              
              {/* Animated Today Badge */}
              <AnimatePresence>
                 {todayXP > 0 && (
                    <motion.div 
                       initial={{ scale: 0.8, opacity: 0, y: 10 }} 
                       animate={{ scale: 1, opacity: 1, y: 0 }} 
                       className="absolute -top-3 -right-12 bg-gradient-to-r from-[#10c7a1] to-emerald-400 text-[#05070c] px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider shadow-[0_0_15px_rgba(16,199,161,0.6)] transform rotate-12"
                    >
                       +{todayXP} TODAY!
                    </motion.div>
                 )}
              </AnimatePresence>
           </div>

           <div className="hidden sm:block w-px h-14 bg-white/10 mx-2" />

           <div className="flex-1 w-full relative z-10">
              <div className="flex justify-between items-end mb-2 text-xs font-bold">
                 <span className="text-white/60">Level {level} <span className="text-white tracking-wider uppercase text-[10px] bg-white/10 px-2 py-0.5 rounded ml-1">{readinessTitle}</span></span>
                 <span className="text-[#c8a84b]">{remainingToNext} XP to next level</span>
              </div>
              <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                 <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${progressPercent}%` }} 
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#c8a84b] to-[#fde047] rounded-full shadow-[0_0_10px_rgba(200,168,75,0.8)]"
                 />
              </div>
           </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'github', 'leetcode', 'fitbit', 'linkedin', 'banking'].map(key => (
            <button 
              key={key} 
              onClick={() => setActiveFilter(key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 capitalize ${getFilterColor(key)}`}
            >
              {key === 'all' ? 'All Integrations' : key.replace('banking', 'Banking App')}
            </button>
          ))}
        </div>

        {/* Central Visual Map (The Pathway) */}
        <div className="relative mt-auto mb-4 py-8 px-4 border border-white/5 bg-[#05070c]/50 rounded-2xl overflow-hidden">
          {/* SVG Connecting Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <path 
              d="M 50,60 C 150,60 200,120 350,120 C 500,120 550,60 750,60" 
              fill="none" 
              stroke="rgba(255,255,255,0.08)" 
              strokeWidth="4" 
              strokeDasharray="8 8"
            />
            {/* Highlight line based on filter (Simulated) */}
            <path 
              d="M 50,60 C 150,60 200,120 350,120 C 500,120 550,60 750,60" 
              fill="none" 
              stroke={activeFilter !== 'all' ? "#10c7a1" : "url(#glowGradient)"} 
              strokeWidth="4" 
              className="transition-all duration-700"
              style={{ strokeDasharray: activeFilter === 'all' ? '100% 0' : '20% 80%', strokeDashoffset: activeFilter === 'github' ? '0%' : '-30%' }}
            />
            <defs>
              <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10c7a1" />
                <stop offset="50%" stopColor="#7b61ff" />
                <stop offset="100%" stopColor="#c8a84b" />
              </linearGradient>
            </defs>
          </svg>

          {/* Integration Nodes */}
          <div className="relative z-10 flex justify-between items-center px-4 md:px-12">
            {[
              { id: 'github', icon: '💻', yOffset: '-translate-y-4' },
              { id: 'leetcode', icon: '⚡', yOffset: 'translate-y-6' },
              { id: 'fitbit', icon: '🏃', yOffset: 'translate-y-8' },
              { id: 'linkedin', icon: '🔗', yOffset: 'translate-y-2' },
              { id: 'banking', icon: '🏦', yOffset: '-translate-y-6' }
            ].map((node) => {
              const connected = isConnected(node.id);
              const isTargeted = activeFilter === node.id || activeFilter === 'all';
              return (
                <div key={node.id} className={`flex flex-col items-center transition-all duration-500 ${node.yOffset} ${isTargeted ? 'scale-110 opacity-100' : 'scale-90 opacity-40'}`}>
                  <div className={`h-12 w-12 rounded-full border-[3px] flex items-center justify-center text-lg shadow-xl relative
                    ${connected ? 'bg-[#10c7a1]/20 border-[#10c7a1] text-white shadow-[0_0_20px_rgba(16,199,161,0.3)]' : 'bg-[#0a0e18] border-white/20 text-white/30'}`}>
                    {node.icon}
                    {connected && <CheckCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 bg-black rounded-full text-[#10c7a1]" />}
                  </div>
                  <span className="text-[10px] mt-2 font-bold tracking-widest uppercase text-white/50">{node.id}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Milestones List */}
      <div className="flex-1 lg:max-w-[45%] flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
        <h3 className="text-sm font-bold text-white tracking-widest uppercase mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#c8a84b]" /> Milestone Unlocks & Rewards
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {filteredMilestones.map((m) => (
              <motion.div 
                key={m.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden transition-all duration-300
                  ${m.completed ? 'bg-gradient-to-r from-white/5 to-[#10c7a1]/5 border-[#10c7a1]/30' : 'bg-black/20 border-white/5'}`}
              >
                {/* Milestone Details */}
                <div className="flex gap-4 items-start">
                  <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-xl 
                    ${m.completed ? 'bg-[#10c7a1]/20 text-white' : 'bg-white/5 text-white/20'}`}>
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-bold truncate ${m.completed ? (m.isUltimate ? 'text-[#c8a84b]' : 'text-white') : 'text-white/40'}`}>
                        {m.title}
                      </h4>
                      {m.completed ? (
                         <span className="shrink-0 ml-2 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-[#10c7a1]/20 text-[#10c7a1] border border-[#10c7a1]/30">Unlocked</span>
                      ) : (
                         <span className="shrink-0 ml-2 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-white/5 text-white/30 border border-white/10 flex items-center gap-1"><Lock className="h-2 w-2"/> Locked</span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed mb-2">{m.req}</p>
                    <p className="text-xs font-mono font-semibold text-[#7b61ff]">Earn {m.xp} XP {m.isUltimate && '& Vanguard Title'}</p>
                  </div>
                </div>

                {/* Simulated Interaction Panel (Only shows if completed) */}
                {m.completed && (
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Share Achievement</span>
                    <div className="flex gap-2 relative">
                      {[
                        { name: 'WhatsApp', icon: MessageCircle, color: 'text-green-400 hover:bg-green-400/20' },
                        { name: 'Instagram', icon: Camera, color: 'text-pink-400 hover:bg-pink-400/20' },
                        { name: 'Twitter', icon: Send, color: 'text-sky-400 hover:bg-sky-400/20' }
                      ].map(social => (
                         <button 
                           key={social.name}
                           onClick={() => handleShare(social.name, m.id)}
                           className={`h-7 w-7 rounded-md flex items-center justify-center bg-white/5 transition-colors ${social.color}`}
                         >
                           <social.icon className="h-3.5 w-3.5" />
                         </button>
                      ))}
                      
                      {/* Tooltip Simulation */}
                      {shareTip?.id === m.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-[#05070c] border border-[#10c7a1]/40 rounded-lg shadow-2xl z-20 text-center"
                        >
                           <p className="text-[10px] font-bold text-white">Opening {shareTip.platform}...</p>
                           <p className="text-[9px] text-white/60 mt-0.5">Simulated share operation successful!</p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────
function DashboardHeader({ today, firstName, onSearchClick, onNotificationClick }) {
  const unreadNotificationCount = useNotificationCount();

  return (
    <motion.header
      className="flex shrink-0 items-center justify-between border-b border-white/8 bg-[#070a10]/80 px-4 py-3.5 backdrop-blur-xl lg:px-8"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-1 max-w-xl">
        <button
          type="button"
          onClick={onSearchClick}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/40 transition hover:bg-white/8 hover:border-white/15 hover:text-white/60"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Ask your Twin Copilot…</span>
          <span className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white/30">⌘K</span>
        </button>
      </div>
      <div className="ml-4 flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/55 sm:flex">
          <CalendarDays className="h-3.5 w-3.5 text-[#c8a84b]" />
          {today}
        </div>
        <button
          type="button"
          onClick={onNotificationClick}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#070a10] bg-[#ef4444] px-1 text-[10px] font-black leading-none text-white shadow-[0_0_12px_rgba(239,68,68,0.75)]">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-[#7b61ff] to-[#10c7a1] text-sm font-bold text-white shadow-[0_0_12px_rgba(16,199,161,0.25)]">
          {firstName.slice(0, 1).toUpperCase()}
        </div>
      </div>
    </motion.header>
  );
}

function HeroSection({ firstName, insights, isLoading, navigate }) {
  const alignmentColor = insights.burnoutRisk > 70 ? '#ff4d7d' : insights.financeScore < 40 ? '#c8a84b' : '#10c7a1';

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0e18]/90 backdrop-blur-2xl">
      <div className="relative px-6 py-7 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(123,97,255,0.06),transparent_40%)]" />
        <motion.div className="pointer-events-none absolute right-8 top-4 h-32 w-32 rounded-full bg-[#c8a84b]/10 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 9, repeat: Infinity }} />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Good morning, {firstName}.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/60">
              Your signals are in{' '}
              <span className="font-semibold drop-shadow-[0_0_8px_currentColor]" style={{ color: alignmentColor }}>
                {insights.alignmentLabel}
              </span>
              {isLoading && <span className="ml-2 text-white/30 text-xs animate-pulse">syncing…</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <HeroButton label="Open Health" onClick={() => navigate('/health')} primary />
            <HeroButton label="Open Finance" onClick={() => navigate('/finance')} />
            <HeroButton label="Open Career" onClick={() => navigate('/career')} />
            <HeroButton label="AI Insights" onClick={() => navigate('/intelligence')} accent />
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-4 border-t border-white/8 pt-5">
          <StatusPill icon="🧬" label="Burnout Risk" value={`${insights.burnoutRisk}%`} colorState={insights.thresholds.burnout.colorState} />
          <StatusPill icon="💧" label="Recovery" value={`${insights.recoveryScore}%`} colorState={insights.thresholds.wellness.colorState} />
          <StatusPill icon="💎" label="Savings Rate" value={`${insights.savingsRate}%`} colorState={insights.savingsState.colorState} />
          <StatusPill icon="🎯" label="Productivity" value={`${insights.productivityScore}%`} colorState={insights.thresholds.productivity.colorState} />
          <div className="ml-auto flex items-center gap-2 rounded-xl border border-[#10c7a1]/20 bg-[#10c7a1]/8 px-3 py-1.5 text-xs font-semibold text-[#10c7a1]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Premium Sync Active
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroButton({ label, onClick, primary, accent }) {
  const base = 'rounded-xl px-4 py-2 text-sm font-semibold transition-all';
  if (primary) return <button type="button" onClick={onClick} className={`${base} bg-white text-black hover:bg-white/90`}>{label}</button>;
  if (accent) return <button type="button" onClick={onClick} className={`${base} border border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#10c7a1] hover:bg-[#10c7a1]/20`}>{label}</button>;
  return <button type="button" onClick={onClick} className={`${base} border border-white/10 bg-white/5 text-white/80 hover:bg-white/10`}>{label}</button>;
}

function StatusPill({ icon, label, value, colorState }) {
  const c = colorStateToHex(colorState);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5">
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-white/45 font-medium">{label}</span>
      <span className="text-xs font-bold" style={{ color: c }}>{value}</span>
    </div>
  );
}

function ScoreCard({ title, value, emoji, colorState, subtitle, onClick }) {
  const c = colorStateToHex(colorState);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    let frameId;
    window.setTimeout(() => {
      const duration = 900;
      const start = performance.now();
      const tick = (ts) => {
        const p = Math.min((ts - start) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setDisplayed(Math.round(value * e));
        if (p < 1) frameId = requestAnimationFrame(tick);
      };
      setDisplayed(0);
      frameId = requestAnimationFrame(tick);
    }, 0);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <motion.article
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.015 }}
      className="cursor-pointer rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl transition-colors hover:border-white/20"
      style={{ boxShadow: `0 0 0 1px ${c}08` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{title}</p>
          <p className="mt-1.5 text-3xl font-semibold text-white">{displayed}<span className="text-lg text-white/40">%</span></p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg" style={{ background: `${c}15`, border: `1px solid ${c}25` }}>
          {emoji}
        </div>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${c}80, ${c})` }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">{subtitle}</p>
        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: c }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: c }} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{colorState === 'green' ? 'Good' : colorState === 'orange' ? 'Watch' : 'Alert'}</span>
        </div>
      </div>
    </motion.article>
  );
}

function DigitalTwinAvatar({ insights }) {
  const burnout = insights.burnoutRisk;
  const health = insights.healthScore;
  const finance = insights.financeScore;
  const [blink, setBlink] = useState(false);
  const [breathe, setBreathe] = useState(false);

  const mood = useMemo(() => {
    if (burnout > 70 || health < 45) return 'tired';
    if (burnout > 50 || health < 65) return 'alert';
    if (finance < 40) return 'stressed';
    return 'optimal';
  }, [burnout, health, finance]);

  const moodConfig = {
    tired: {
      aura: '#ff4d7d', auraOpacity: 0.18, eyeOffset: 2,
      mouthPath: 'M 38 62 Q 50 58 62 62', eyeScale: 0.7,
      glowColor: 'rgba(255,77,125,0.22)',
      skinGradFrom: '#2a1a1f', skinGradTo: '#1a0e14',
      advice: 'Recovery signals low. A 20-min nap can reset cortisol.',
      label: '😴 Fatigued',
    },
    alert: {
      aura: '#c8a84b', auraOpacity: 0.2, eyeOffset: 0,
      mouthPath: 'M 40 62 Q 50 64 60 62', eyeScale: 1,
      glowColor: 'rgba(200,168,75,0.22)',
      skinGradFrom: '#1e1a10', skinGradTo: '#13100a',
      advice: 'Moderate stress detected. Hydrate and take a 5-min break.',
      label: '⚠️ Alert Mode',
    },
    stressed: {
      aura: '#c8a84b', auraOpacity: 0.22, eyeOffset: 1,
      mouthPath: 'M 38 63 Q 50 59 62 63', eyeScale: 0.85,
      glowColor: 'rgba(200,168,75,0.2)',
      skinGradFrom: '#1c1a10', skinGradTo: '#121008',
      advice: 'Finance stress detected. Set one budget goal today.',
      label: '💸 Finance Stress',
    },
    optimal: {
      aura: '#10c7a1', auraOpacity: 0.22, eyeOffset: 0,
      mouthPath: 'M 38 60 Q 50 68 62 60', eyeScale: 1,
      glowColor: 'rgba(16,199,161,0.28)',
      skinGradFrom: '#0e1e1a', skinGradTo: '#071310',
      advice: 'All systems aligned. Consistency compounds.',
      label: '✨ Optimal',
    },
  };

  const cfg = moodConfig[mood];

  useEffect(() => {
    const blinkTimer = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3200 + Math.random() * 1800);
    const breatheTimer = setInterval(() => setBreathe(b => !b), 3000);
    return () => { clearInterval(blinkTimer); clearInterval(breatheTimer); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        <motion.div className="absolute rounded-full"
          style={{ width: 130, height: 130, background: `radial-gradient(circle, ${cfg.aura}30 0%, transparent 70%)`, filter: 'blur(16px)' }}
          animate={{ scale: breathe ? 1.14 : 1, opacity: breathe ? cfg.auraOpacity * 1.35 : cfg.auraOpacity }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        <motion.div className="absolute rounded-full border"
          style={{ width: 106, height: 106, borderColor: `${cfg.aura}35` }}
          animate={{ scale: breathe ? 1.05 : 0.97, opacity: breathe ? 0.75 : 0.35 }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        <motion.svg width="88" height="88" viewBox="0 0 100 100"
          style={{ filter: `drop-shadow(0 0 14px ${cfg.glowColor})` }}
          animate={{ y: breathe ? -2.5 : 2 }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        >
          <defs>
            <radialGradient id="dtSkinGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={cfg.skinGradFrom} />
              <stop offset="100%" stopColor={cfg.skinGradTo} />
            </radialGradient>
            <radialGradient id="dtEyeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={cfg.aura} stopOpacity="0.9" />
              <stop offset="100%" stopColor={cfg.aura} stopOpacity="0.2" />
            </radialGradient>
            <filter id="dtSoftGlow">
              <feGaussianBlur stdDeviation="1.4" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <ellipse cx="50" cy="52" rx="32" ry="34" fill="url(#dtSkinGrad)" stroke={`${cfg.aura}28`} strokeWidth="1" />
          <rect x="43" y="82" width="14" height="10" rx="4" fill={cfg.skinGradFrom} />
          <motion.g filter="url(#dtSoftGlow)" animate={{ scaleY: blink ? 0.08 : cfg.eyeScale, y: cfg.eyeOffset }} style={{ originY: '50%' }} transition={{ duration: blink ? 0.08 : 0.2 }}>
            <ellipse cx="36" cy="46" rx="5.5" ry="5.5" fill="url(#dtEyeGlow)" />
            <circle cx="36" cy="46" r="3.2" fill={cfg.aura} opacity="0.95" />
            <circle cx="37.2" cy="44.8" r="1.1" fill="white" opacity="0.7" />
            <ellipse cx="64" cy="46" rx="5.5" ry="5.5" fill="url(#dtEyeGlow)" />
            <circle cx="64" cy="46" r="3.2" fill={cfg.aura} opacity="0.95" />
            <circle cx="65.2" cy="44.8" r="1.1" fill="white" opacity="0.7" />
          </motion.g>
          <motion.g animate={{ y: mood === 'tired' ? 2 : mood === 'stressed' ? -1 : 0 }} transition={{ duration: 0.5 }}>
            <path d="M 29 38 Q 36 35 43 37" stroke={cfg.aura} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.65" />
            <path d="M 57 37 Q 64 35 71 38" stroke={cfg.aura} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.65" />
          </motion.g>
          <path d="M 48 52 Q 46 58 49 59 Q 51 59 52 58 Q 54 57 52 52" stroke={cfg.aura} strokeWidth="1" fill="none" opacity="0.3" />
          <motion.path d={cfg.mouthPath} stroke={cfg.aura} strokeWidth="2.2" fill="none" strokeLinecap="round" animate={{ d: cfg.mouthPath }} transition={{ duration: 0.8, ease: 'easeInOut' }} opacity="0.85" />
          <g opacity="0.2">
            <path d="M 18 50 L 14 50 L 14 44 L 10 44" stroke={cfg.aura} strokeWidth="0.8" fill="none" />
            <circle cx="10" cy="44" r="1.5" fill={cfg.aura} />
            <path d="M 82 50 L 86 50 L 86 44 L 90 44" stroke={cfg.aura} strokeWidth="0.8" fill="none" />
            <circle cx="90" cy="44" r="1.5" fill={cfg.aura} />
            <path d="M 18 60 L 12 60" stroke={cfg.aura} strokeWidth="0.8" fill="none" />
            <path d="M 82 60 L 88 60" stroke={cfg.aura} strokeWidth="0.8" fill="none" />
          </g>
        </motion.svg>
      </div>
      <motion.div key={mood} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em]"
        style={{ color: cfg.aura }}>
        {cfg.label}
      </motion.div>
      <motion.div key={cfg.advice} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center text-[11px] leading-5 text-white/60 backdrop-blur-md w-full"
        style={{ boxShadow: `0 0 16px ${cfg.glowColor}` }}
      >
        <span className="mr-1 font-bold" style={{ color: cfg.aura }}>Twin:</span>
        {cfg.advice}
      </motion.div>
    </div>
  );
}

function DigitalTwinPanel({ insights }) {
  return (
    <motion.article whileHover={{ y: -3, scale: 1.01 }} className="flex h-full flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Digital Twin</h3>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Live Signal</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-base">🤖</div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <DigitalTwinAvatar insights={insights} />
      </div>
    </motion.article>
  );
}

function LifeBalanceRadar({ insights }) {
  const data = [
    { subject: 'Health', A: insights.healthScore, emoji: '🧬', color: '#10c7a1', desc: 'Biometric + recovery' },
    { subject: 'Finance', A: insights.financeScore, emoji: '💎', color: '#c8a84b', desc: 'Savings + buffer' },
    { subject: 'Career', A: insights.productivityScore, emoji: '🎯', color: '#7b61ff', desc: 'Productivity + momentum' },
    { subject: 'Recovery', A: insights.recoveryScore, emoji: '💧', color: '#38bdf8', desc: 'Sleep + exercise + stress' },
    { subject: 'Resilience', A: 100 - insights.burnoutRisk, emoji: '🛡️', color: '#f472b6', desc: 'Inverse burnout index' },
  ];

  return (
    <motion.article whileHover={{ y: -3 }} className="flex flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Life Balance</h3>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35 mt-0.5">Hover axes for details</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-base">⚡</span>
      </div>
      <div className="grid flex-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={({ x, y, payload }) => {
                const entry = data.find(d => d.subject === payload.value);
                return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={entry?.color || 'rgba(255,255,255,0.45)'} fontSize={9.5} fontWeight={700} letterSpacing="0.08em">{payload.value}</text>;
              }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <RechartsTooltip content={<LifeBalanceTooltip data={data} />} />
              <Radar name="Score" dataKey="A" stroke="#7b61ff" strokeWidth={2} fill="rgba(123,97,255,0.13)" dot={{ r: 4, fill: '#7b61ff', stroke: 'rgba(123,97,255,0.35)', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#7b61ff', stroke: 'white', strokeWidth: 2 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2">
          {data.map((item, i) => (
            <motion.div key={item.subject} whileHover={{ x: 3 }} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.025] px-3.5 py-2.5 transition hover:border-white/12">
              <div className="flex items-center gap-2.5">
                <span className="text-sm">{item.emoji}</span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/35">{item.subject}</p>
                  <p className="text-sm font-semibold text-white">{item.A}%</p>
                </div>
              </div>
              <div className="h-1 w-14 overflow-hidden rounded-full bg-white/8">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: item.color }} initial={{ width: 0 }} animate={{ width: `${item.A}%` }} transition={{ duration: 1.1, delay: i * 0.08 }} />
              </div>
            </motion.div>
          ))}
          <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11px] text-white/45 leading-5">
            <span className="text-[#10c7a1] font-semibold">Balance note:</span> Recovery and resilience are shaping today's priorities.
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function LifeBalanceTooltip({ active, payload, data }) {
  if (!active || !payload?.length) return null;
  const entry = data.find(d => d.subject === payload[0]?.payload?.subject);
  if (!entry) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0e17]/95 px-3.5 py-2.5 backdrop-blur-xl text-left" style={{ boxShadow: `0 0 18px ${entry.color}30` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span>{entry.emoji}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: entry.color }}>{entry.subject}</span>
      </div>
      <p className="text-xl font-bold text-white">{entry.A}<span className="text-sm font-normal text-white/45 ml-0.5">%</span></p>
      <p className="mt-0.5 text-[10px] text-white/40">{entry.desc}</p>
    </div>
  );
}

function DailyCalendarStreak({ insights }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const calendar = useMemo(() => buildRitualCalendar(now, insights), [now, insights]);

  return (
    <motion.article whileHover={{ y: -3 }} className="flex flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Daily Streak</h3>
          <p className="mt-0.5 font-mono text-[10px] text-white/35">{formatTimeLeft(now)} remaining today</p>
          {calendar.streakStarted && (
            <p className="mt-1 text-xs font-bold text-[#10c7a1]">🔥 {calendar.currentStreak} day streak</p>
          )}
        </div>
        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 p-2.5 min-w-[50px]">
          <span className="text-lg font-bold text-white leading-none">{calendar.today}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mt-0.5">{calendar.monthShort}</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-2.5 gap-x-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-white/30">{d}</div>
        ))}
        {calendar.days.map(day => (
          <div key={day.key} className="grid h-7 place-items-center">
            {day.type === 'blank' ? <span /> : <CalendarDay day={day} />}
          </div>
        ))}
      </div>
      {!calendar.streakStarted && (
        <p className="mt-4 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2.5 text-center text-[11px] text-white/45">
          Complete today's goals to begin your streak.
        </p>
      )}
    </motion.article>
  );
}

function CalendarDay({ day }) {
  if (day.state === 'today-complete') return <span className="grid h-7 w-7 place-items-center rounded-full bg-[#10c7a1] text-xs font-bold text-[#05070c] shadow-[0_0_10px_rgba(16,199,161,0.5)]">{day.value}</span>;
  if (day.state === 'today') return <span className="grid h-7 w-7 place-items-center rounded-full border border-[#10c7a1] bg-[#10c7a1]/10 text-xs font-bold text-[#10c7a1]">{day.value}</span>;
  if (day.state === 'done') return <span className="grid h-7 w-7 place-items-center rounded-full border border-white/15 text-white/40 text-[10px]">✓</span>;
  if (day.state === 'missed') return <span className="relative grid h-7 w-7 place-items-center text-xs text-white/35">{day.value}<span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#ff4d7d]" /></span>;
  return <span className="text-xs text-white/40">{day.value}</span>;
}

function FinanceChart({ insights, onOpen }) {
  const [range, setRange] = useState('1M');
  const [hovered, setHovered] = useState(null);
  const chart = insights.financeRanges[range];
  const finStyle = getVisualState(insights.thresholds.financial.colorState);

  return (
    <motion.article whileHover={{ y: -3 }} onClick={onOpen} className="cursor-pointer rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl transition hover:border-white/18">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Financial Trajectory</h3>
          <p className={`text-xs mt-0.5 ${finStyle.text}`}>{chart.summary}</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {['1W', '1M'].map(r => (
            <button key={r} onClick={e => { e.stopPropagation(); setRange(r); }} type="button"
              className={`rounded-lg px-3 py-1 text-[10px] font-bold uppercase transition ${range === r ? 'bg-white/15 text-white' : 'text-white/35 hover:text-white/60'}`}>{r}</button>
          ))}
        </div>
      </div>
      <div className="relative h-48 overflow-hidden rounded-xl border border-white/5 bg-white/[0.01] px-4 pb-7 pt-4">
        <div className="absolute inset-x-4 top-4 bottom-7 grid grid-rows-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-white/[0.04]" />)}
        </div>
        <div className="absolute inset-x-4 bottom-7 top-4 flex items-end gap-2">
          {chart.bars.map((h, i) => (
            <div key={i} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <div className="w-full rounded-t-lg transition-all duration-200"
                style={{ height: `${h}%`, backgroundColor: finStyle.softStroke, opacity: hovered === i ? 0.9 : 0.35 + i * (0.5 / Math.max(chart.bars.length - 1, 1)), transform: hovered === i ? 'translateY(-2px)' : 'none' }} />
            </div>
          ))}
        </div>
        <svg className="pointer-events-none absolute inset-x-4 bottom-7 top-4" viewBox="0 0 368 140" preserveAspectRatio="none" style={{ height: 'calc(100% - 44px)', width: 'calc(100% - 32px)' }}>
          <polyline points={chart.linePoints} fill="none" stroke={finStyle.stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          {chart.pointData.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#0a0e17" stroke={finStyle.stroke} strokeWidth="2.5" />)}
        </svg>
        <div className="absolute inset-x-4 bottom-2 flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/30">
          {chart.labels.map(l => <span key={l}>{l}</span>)}
        </div>
      </div>
      <div className="mt-4 flex gap-6 border-t border-white/6 pt-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">Savings Rate</p>
          <p className={`text-lg font-bold ${finStyle.text}`}>{insights.savingsRate}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1">Monthly Buffer</p>
          <p className={`text-lg font-bold ${getVisualState(insights.bufferState.colorState).text}`}>{insights.monthlyBuffer}</p>
        </div>
      </div>
    </motion.article>
  );
}

function AIInsightsPanel({ insights, navigate }) {
  return (
    <motion.article whileHover={{ y: -3 }} className="flex flex-col rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">AI Insights</h3>
          <p className="text-[10px] font-medium uppercase tracking-widest text-white/35 mt-0.5">Live signal feed</p>
        </div>
        <button type="button" onClick={() => navigate('/intelligence')} className="flex items-center gap-1.5 rounded-xl border border-[#7b61ff]/25 bg-[#7b61ff]/10 px-3 py-1.5 text-[11px] font-bold text-[#7b61ff] transition hover:bg-[#7b61ff]/20">
          <Brain className="h-3.5 w-3.5" /> Full Intelligence <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {insights.feed.map((item, i) => {
          const state = getVisualState(item.colorState);
          const isNeg = item.sentiment === 'negative';
          return (
            <motion.div key={i} whileHover={{ scale: 1.01 }} className={`rounded-xl border bg-white/[0.025] p-3.5 ${state.card}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${state.badge}`}>{item.label}</span>
                <span className="text-[9px] text-white/30 shrink-0">{item.time}</span>
              </div>
              <p className={`text-xs leading-5 ${isNeg ? state.text : 'text-white/75'}`}>{item.title}</p>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/35">Weekly Alignment</p>
        <div className="flex h-16 items-end gap-1">
          {insights.alignmentBars.map((h, i) => {
            const s = getVisualState(alignmentColorState(h));
            return <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: s.stroke, opacity: 0.45 + i * 0.1 }} />;
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] font-bold uppercase tracking-widest text-white/25">
          <span>Mon</span><span>Today</span>
        </div>
      </div>
    </motion.article>
  );
}

function CommandPortals({ navigate }) {
  const portals = [
    { title: 'Vitality Chamber', desc: 'Biometrics & Recovery', path: '/health', icon: '🧬', color: '#ff4d7d', particles: ['💊', '🏃', '💤'] },
    { title: 'Wealth Nexus', desc: 'Cashflow & Assets', path: '/finance', icon: '💎', color: '#10c7a1', particles: ['📈', '💳', '🏦'] },
    { title: 'Trajectory Forge', desc: 'Focus & Momentum', path: '/career', icon: '🎯', color: '#7b61ff', particles: ['⚡', '🧠', '🚀'] },
  ];
  return (
    <section>
      <div className="mb-3.5 flex items-center gap-3">
        <h2 className="text-base font-semibold text-white">Command Center</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {portals.map(p => <PortalCard key={p.title} portal={p} navigate={navigate} />)}
      </div>
    </section>
  );
}

function PortalCard({ portal: p, navigate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div onClick={() => navigate(p.path)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} whileHover={{ y: -6, scale: 1.02 }} transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="group cursor-pointer overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl" style={{ borderColor: hovered ? `${p.color}40` : undefined, boxShadow: hovered ? `0 0 32px ${p.color}12` : undefined, transition: 'border-color 0.3s, box-shadow 0.3s' }}>
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl transition-all duration-400" style={{ backgroundColor: p.color, opacity: hovered ? 0.14 : 0.05 }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">{p.desc}</p>
            <h3 className="mt-1 text-xl font-bold text-white">{p.title}</h3>
          </div>
          <motion.div animate={{ rotate: hovered ? 8 : 0, scale: hovered ? 1.08 : 1 }} transition={{ type: 'spring', stiffness: 280 }} className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl" style={{ boxShadow: hovered ? `0 0 16px ${p.color}35` : undefined }}>{p.icon}</motion.div>
        </div>
        <div className="flex gap-1.5 mb-5">
          {p.particles.map((part, i) => <motion.span key={i} animate={{ y: hovered ? [0, -3, 0] : 0 }} transition={{ duration: 0.5, delay: i * 0.08, repeat: hovered ? Infinity : 0, repeatType: 'reverse' }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] text-xs">{part}</motion.span>)}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold transition-all" style={{ color: p.color }}>
          Enter Portal <motion.div animate={{ x: hovered ? 4 : 0 }}><ChevronRight className="h-4 w-4" /></motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function AdaptiveRecommendations({ insights }) {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a0e18]/80 p-5 sm:p-6 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-white">Adaptive Recommendations</h2>
        <div className="flex items-center gap-2 rounded-xl border border-[#10c7a1]/20 bg-[#10c7a1]/8 px-3 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10c7a1]" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#10c7a1]">Deep Sync Active</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {insights.recommendations.slice(0, 3).map(item => {
          const s = getVisualState(item.colorState);
          return (
            <motion.div key={item.title} whileHover={{ y: -3, scale: 1.01 }} className={`overflow-hidden rounded-xl border bg-white/[0.025] ${s.card}`}>
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                <h4 className={`text-sm font-semibold ${s.text}`}>{item.title}</h4>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.icon}`}>{item.icon && <item.icon className="h-4 w-4" />}</div>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs leading-5.5 text-white/55">{item.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-[#7b61ff]/8 blur-3xl" />
    </section>
  );
}

// ─── Utility Functions ────────────────────────────────────────────────────────
// [All existing utility functions remain identical]
function colorStateToHex(state) {
  const n = normalizeColorState(state);
  return n === 'green' ? '#10c7a1' : n === 'orange' ? '#c8a84b' : '#ff4d7d';
}
function getVisualState(colorState = 'green') {
  const n = normalizeColorState(colorState);
  const states = {
    green: { label: 'Healthy', stroke: '#10c7a1', softStroke: 'rgba(16,199,161,0.35)', glowColor: 'rgba(16,199,161,0.2)', text: 'text-[#10c7a1]', card: 'border-white/8 hover:border-[#10c7a1]/30', icon: 'bg-[#10c7a1]/10 text-[#10c7a1] border border-[#10c7a1]/20', badge: 'bg-[#10c7a1]/10 text-[#10c7a1] border border-[#10c7a1]/20', surface: 'bg-[#10c7a1]/5 border border-[#10c7a1]/10' },
    orange: { label: 'Warning', stroke: '#c8a84b', softStroke: 'rgba(200,168,75,0.35)', glowColor: 'rgba(200,168,75,0.2)', text: 'text-[#c8a84b]', card: 'border-white/8 hover:border-[#c8a84b]/30', icon: 'bg-[#c8a84b]/10 text-[#c8a84b] border border-[#c8a84b]/20', badge: 'bg-[#c8a84b]/10 text-[#c8a84b] border border-[#c8a84b]/20', surface: 'bg-[#c8a84b]/5 border border-[#c8a84b]/10' },
    red: { label: 'Critical', stroke: '#ff4d7d', softStroke: 'rgba(255,77,125,0.35)', glowColor: 'rgba(255,77,125,0.2)', text: 'text-[#ff4d7d]', card: 'border-white/8 hover:border-[#ff4d7d]/30', icon: 'bg-[#ff4d7d]/10 text-[#ff4d7d] border border-[#ff4d7d]/20', badge: 'bg-[#ff4d7d]/10 text-[#ff4d7d] border border-[#ff4d7d]/20', surface: 'bg-[#ff4d7d]/5 border border-[#ff4d7d]/10' },
  };
  return states[n] || states.green;
}
function normalizeColorState(cs = 'green') {
  const m = { healthy: 'green', warning: 'orange', danger: 'red', critical: 'red' };
  return m[cs] || cs || 'green';
}
function alignmentColorState(v) { return v <= 33 ? 'red' : v <= 66 ? 'orange' : 'green'; }

function getStoredProfile() { try { const s = localStorage.getItem('lifetwinOnboardingProfile'); return s ? JSON.parse(s) : fallbackProfile; } catch { return fallbackProfile; } }
function getStoredUser() { try { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null; } catch { return null; } }

function normalizeProfile(r) {
  if (!r) return fallbackProfile;
  if (r.lifestyle && r.financialPatterns) return r;
  return {
    behavioralAnalysis: { focusAreas: r.selectedSignals || [] },
    integrations: {
      github: { status: r.githubUsername ? 'connected' : 'skipped', username: r.githubUsername || '' },
      leetcode: { status: r.leetcodeUsername ? 'connected' : 'skipped', username: r.leetcodeUsername || '' },
      fitbit: { status: r.fitbitProfile ? 'connected' : 'skipped', profileLink: r.fitbitProfile || '' },
      googleCalendar: { status: r.calendarProfile ? 'connected' : 'skipped', profileLink: r.calendarProfile || '' },
      linkedin: { status: r.linkedinProfile ? 'connected' : 'skipped', profileLink: r.linkedinProfile || '' },
      banking: { status: r.bankingProfile ? 'connected' : 'skipped', profileLink: r.bankingProfile || '' },
    },
    lifestyle: { gender: r.gender || '', sleepHours: r.sleepHours ?? 7, studyHours: r.studyHours ?? 4, exerciseFrequency: r.exerciseFrequency ?? 2, spendingStyle: r.spendingStyle || 'balanced', smokingHabits: r.smokingHabit || 'no', periodTracking: r.periodTracking || 'not_now', genderSpecificHealthContext: r.genderSpecificHealthContext || 'not_now' },
    financialPatterns: { monthlyIncome: r.monthlyIncome ?? 0, monthlyExpenditure: r.monthlyExpenditure ?? 0, savingsHabits: r.savingsHabit || 'moderate', financialStressLevel: r.financialStressLevel ?? 5 },
    aiScores: { burnoutRisk: r.burnoutRisk, productivityScore: r.productivityScore, financialHealth: r.financialHealth, wellnessBalance: r.wellnessBalance },
  };
}

function buildInsights(profile, dashboardData = null, liveIntegrations = null, liveFinanceData = null) {
  const sleepHours = Number(profile.lifestyle.sleepHours || 7);
  const studyHours = Number(profile.lifestyle.studyHours || 4);
  const exerciseFrequency = Number(profile.lifestyle.exerciseFrequency || 2);
  const stressLevel = Number(profile.financialPatterns.financialStressLevel || 4);
  const liveIncome = Number(liveFinanceData?.totalSalary);
  const liveExpenditure = Number(liveFinanceData?.monthlyExpenses);
  const liveAccountBalance = Number(liveFinanceData?.accountBalance);
  const income = Number.isFinite(liveIncome) && liveIncome > 0 ? liveIncome : Number(profile.financialPatterns.monthlyIncome || 0);
  const expenditure = Number.isFinite(liveExpenditure) && liveExpenditure >= 0 ? liveExpenditure : Number(profile.financialPatterns.monthlyExpenditure || 0);
  const rawSavingsRate = income > 0 ? Math.round(((income - expenditure) / income) * 100) : 0;
  const savingsRate = income > 0 ? Math.max(0, rawSavingsRate) : 28;
  const integrationSnapshot = liveIntegrations || profile.integrations || {};
  const connectedCount = Object.values(integrationSnapshot).filter(i => i.status === 'connected').length;
  const monthlyBufferValue = Number.isFinite(liveAccountBalance) ? liveAccountBalance : income > 0 ? income - expenditure : null;
  const monthlyBuffer = monthlyBufferValue !== null ? formatMoney(monthlyBufferValue) : 'Add data';
  const hasGithub = integrationSnapshot.github?.status === 'connected';
  const hasLeetcode = integrationSnapshot.leetcode?.status === 'connected';
  const smokingHabit = profile.lifestyle.smokingHabits || 'no';
  const gender = profile.lifestyle.gender || '';
  const gt = getGenderThresholds(gender);
  const periodLoad = gender === 'female' && profile.lifestyle.periodTracking === 'irregular' ? 5 : 0;
  const maleCredit = gender === 'male' && profile.lifestyle.genderSpecificHealthContext !== 'not_now' && exerciseFrequency >= 3 ? 3 : 0;

  const calcBurnout = clamp(Math.round(42 + Math.max(0, gt.idealSleepHours - sleepHours) * 8 + Math.max(0, studyHours - gt.heavyStudyHours) * 5 + stressLevel * 2 - exerciseFrequency * 3 + (smokingHabit === 'yes' ? 8 : 0) + periodLoad - maleCredit), 18, 95);
  const calcProductivity = clamp(Math.round(58 + studyHours * 5 + connectedCount * 3 + (hasGithub ? 4 : 0) + (hasLeetcode ? 3 : 0) - Math.max(0, gt.idealSleepHours - sleepHours) * 3 - Math.max(0, stressLevel - 6) * 3), 30, 98);
  const calcRecovery = clamp(Math.round(54 + sleepHours * 4 + exerciseFrequency * gt.exerciseWeight - stressLevel * 3 - (smokingHabit === 'yes' ? 10 : 0) - periodLoad), 18, 96);
  const calcFinance = clamp(Math.round(50 + rawSavingsRate * 0.8 - stressLevel * 2 - (expenditure > income && income > 0 ? 18 : 0)), 8, 98);

  const analytics = dashboardData?.analytics || profile.aiScores || {};
  const burnoutRisk = clamp(Number.isFinite(Number(analytics.burnoutRisk)) ? Number(analytics.burnoutRisk) : calcBurnout, 0, 100);
  const productivityScore = clamp(Number.isFinite(Number(analytics.productivityScore)) ? Number(analytics.productivityScore) : calcProductivity, 0, 100);
  const recoveryScore = clamp(Number.isFinite(Number(analytics.wellnessBalance)) ? Number(analytics.wellnessBalance) : calcRecovery, 0, 100);
  const financeScore = clamp(Number.isFinite(Number(analytics.financialHealth)) ? Number(analytics.financialHealth) : calcFinance, 0, 100);
  const healthScore = clamp(Math.round((100 - burnoutRisk) * 0.35 + recoveryScore * 0.65), 35, 96);

  const thresholds = normalizeThresholds(dashboardData?.thresholds || analytics.thresholds, { sleepHours, stressLevel, burnoutRisk, financeScore, recoveryScore, productivityScore, income, expenditure, gender });
  const healthState = deriveHealthState({ healthScore, burnoutState: thresholds.burnout, wellnessState: thresholds.wellness });
  const metricStates = dashboardData?.metricStates || dashboardData?.analytics?.metricStates || {};
  const savingsState = metricStates.savingsRate || deriveSavingsState({ rawSavingsRate });
  const bufferState = metricStates.savingsBuffer || deriveBufferState({ income, expenditure });
  const financeRanges = buildFinanceRanges({ income, expenditure, stressLevel, savingsRate: rawSavingsRate, financeScore });
  const recommendations = normalizeRecommendations(dashboardData?.recommendations, { sleepHours, studyHours, savingsRate, rawSavingsRate, burnoutRisk, stressLevel, exerciseFrequency, smokingHabit, hasGithub, hasLeetcode });
  const feed = buildFeed(dashboardData?.aiInsights, { exerciseFrequency, savingsRate, rawSavingsRate, sleepHours, burnoutRisk, stressLevel, productivityScore, studyHours, smokingHabit, hasGithub, hasLeetcode, financeScore, recoveryScore });
  const streak = normalizeStreak(dashboardData?.streak || dashboardData?.profile);

  return {
    burnoutRisk, productivityScore, recoveryScore, financeScore, healthScore, sleepHours, studyHours, exerciseFrequency, stressLevel, streak, thresholds, healthState, savingsState, bufferState, savingsRate, monthlyBufferValue, monthlyBuffer,
    financeRanges,
    alignmentBars: buildAlignmentBars({ sleepHours, studyHours, exerciseFrequency, stressLevel, rawSavingsRate, healthScore, financeScore, productivityScore, recoveryScore, burnoutRisk, hasGithub, hasLeetcode }),
    alignmentLabel: burnoutRisk > 70 ? 'active recovery mode' : rawSavingsRate < 0 ? 'financial caution mode' : 'optimal alignment',
    recommendations, feed,
  };
}

function normalizeRecommendations(api, ctx) {
  const src = mergeByTitle([...buildFallbackRecommendations(ctx), ...(Array.isArray(api) ? api : [])]);
  return src.map((item, i) => ({ title: item.title, detail: item.detail || item.message || 'Personalized from your latest onboarding signals.', icon: iconForCategory(item.category || item.title), severity: item.severity || 'low', colorState: normalizeColorState(item.colorState || colorStateFromSeverity(item.severity)), originalIndex: i })).sort((a, b) => recommendationPriority(b) - recommendationPriority(a) || a.originalIndex - b.originalIndex).slice(0, 3);
}

function buildFallbackRecommendations({ sleepHours, studyHours, savingsRate, rawSavingsRate, burnoutRisk, stressLevel, exerciseFrequency, smokingHabit, hasGithub, hasLeetcode }) {
  const items = [];
  if (sleepHours < 5 && studyHours > 8) items.push({ title: 'Prioritize 7+ hours of sleep', detail: 'Protect the next 3 nights with an earlier wind-down window.', category: 'wellness', severity: 'high', colorState: 'red' });
  else if (sleepHours < 7) items.push({ title: 'Early Recharge', detail: 'Move bedtime 45 minutes earlier to improve tomorrow recovery.', category: 'wellness', severity: 'medium', colorState: 'orange' });
  else if (exerciseFrequency >= 4 && stressLevel <= 3) items.push({ title: 'Maintain current health rhythm', detail: 'Keep the same workout cadence for the next week.', category: 'health', severity: 'low', colorState: 'green' });
  if (rawSavingsRate < 0) items.push({ title: 'Reduce discretionary spending this week', detail: 'Pause flexible purchases and review recurring expenses.', category: 'finance', severity: 'high', colorState: 'red' });
  else if (savingsRate > 25) items.push({ title: 'Increase long-term savings allocation', detail: 'Move a small surplus into savings while income stays ahead.', category: 'finance', severity: 'low', colorState: 'green' });
  if (burnoutRisk > 65 || stressLevel > 7) items.push({ title: 'Recovery Break', detail: 'Schedule a 20-minute reset before the next deep-work block.', category: 'health', severity: burnoutRisk > 70 ? 'high' : 'medium', colorState: burnoutRisk > 70 ? 'red' : 'orange' });
  if (smokingHabit === 'yes') items.push({ title: 'Reduce recovery friction', detail: 'Pair one craving window with a short walk or breathing reset.', category: 'health', severity: 'medium', colorState: 'orange' });
  if (hasGithub || hasLeetcode) items.push({ title: 'Protect coding momentum', detail: 'Keep one focused coding or practice block active today.', category: 'career', severity: 'low', colorState: 'green' });
  else items.push({ title: 'Add a coding signal', detail: 'Connect GitHub or LeetCode to make career intelligence more specific.', category: 'career', severity: 'low', colorState: 'green' });
  return items;
}

function buildFeed(apiInsights, ctx) {
  const behavioral = buildBehaviorFeed(ctx);
  const ai = Array.isArray(apiInsights) ? apiInsights.map((item, i) => ({ label: item.label || 'Insight', time: i === 0 ? 'Now' : i === 1 ? '12m ago' : '28m ago', title: item.message || item.title || 'Digital Twin insight updated.', colorState: normalizeColorState(item.colorState || colorStateFromSeverity(item.severity) || 'green'), sentiment: item.sentiment || sentimentFromColorState(item.colorState) })) : [];
  return mergeFeed([...behavioral, ...ai]).slice(0, 3);
}

function buildBehaviorFeed(ctx) {
  const items = [];
  if (ctx.sleepHours < 5 && ctx.studyHours > 8) {
    items.push({ label: 'Burnout', time: 'Now', title: 'Late-night study patterns may increase burnout risk because recovery time is reduced.', colorState: 'red', sentiment: 'negative' });
    items.push({ label: 'Wellness', time: '4m ago', title: 'Reduced sleep consistency is impacting recovery stability.', colorState: 'orange', sentiment: 'negative' });
  } else if (ctx.exerciseFrequency >= 4 && ctx.stressLevel <= 3) {
    items.push({ label: 'Recovery', time: 'Now', title: 'Exercise frequency is improving recovery rhythm and focus stability.', colorState: 'green', sentiment: 'positive' });
    items.push({ label: 'Productivity', time: '9m ago', title: 'Wellness consistency is positively impacting productivity confidence.', colorState: 'green', sentiment: 'positive' });
  } else {
    items.push({ label: 'Biometric', time: 'Now', title: ctx.exerciseFrequency > 2 ? 'Workout consistency is improving recovery confidence.' : 'A short mobility block today would improve recovery confidence.', colorState: ctx.exerciseFrequency > 2 ? 'green' : 'orange', sentiment: ctx.exerciseFrequency > 2 ? 'positive' : 'neutral' });
  }
  if (ctx.rawSavingsRate < 0) items.push({ label: 'Finance', time: '11m ago', title: 'Financial stress indicators are increasing because spending trajectory exceeds income stability.', colorState: 'red', sentiment: 'negative' });
  else if (ctx.savingsRate > 25) items.push({ label: 'Finance', time: '18m ago', title: 'Financial discipline is currently stable as income stays ahead of expenditure.', colorState: 'green', sentiment: 'positive' });
  if (ctx.hasGithub || ctx.hasLeetcode) items.push({ label: 'Career', time: '24m ago', title: 'GitHub or LeetCode signals strengthen the career momentum pattern.', colorState: 'green', sentiment: 'positive' });
  if (ctx.smokingHabit === 'yes') items.push({ label: 'Wellness', time: '31m ago', title: 'Smoking habit is adding recovery friction to the wellness model.', colorState: 'red', sentiment: 'negative' });
  return items;
}

function mergeByTitle(items) { const s = new Set(); return items.filter(i => { const k = String(i.title || '').toLowerCase(); if (!k || s.has(k)) return false; s.add(k); return true; }); }
function mergeFeed(items) { const s = new Set(); return items.filter(i => { const k = `${i.label}-${i.title}`.toLowerCase(); if (s.has(k)) return false; s.add(k); return true; }); }

function normalizeThresholds(api, ctx) {
  const gt = getGenderThresholds(ctx.gender);
  return {
    sleep: api?.sleep || thresholdState(ctx.sleepHours < gt.criticalSleepHours ? 'critical' : ctx.sleepHours < gt.idealSleepHours ? 'warning' : 'healthy', ctx.sleepHours),
    stress: api?.stress || thresholdState(ctx.stressLevel >= 7 ? 'critical' : ctx.stressLevel >= 5 ? 'warning' : 'healthy', ctx.stressLevel),
    burnout: api?.burnout || thresholdState(ctx.burnoutRisk > gt.criticalBurnout ? 'critical' : ctx.burnoutRisk >= gt.warningBurnout ? 'warning' : 'healthy', ctx.burnoutRisk),
    financial: api?.financial || thresholdState(savingsStatusFromRate(ctx.income > 0 ? ((ctx.income - ctx.expenditure) / ctx.income) * 100 : 0), ctx.financeScore),
    wellness: api?.wellness || thresholdState(ctx.recoveryScore < gt.criticalWellness ? 'critical' : ctx.recoveryScore < gt.warningWellness ? 'warning' : 'healthy', ctx.recoveryScore),
    productivity: api?.productivity || thresholdState(ctx.productivityScore < 45 ? 'critical' : ctx.productivityScore < 65 ? 'warning' : 'healthy', ctx.productivityScore),
  };
}

function getGenderThresholds(gender) {
  if (gender === 'female') return { idealSleepHours: 7.5, criticalSleepHours: 5.5, heavyStudyHours: 6, warningBurnout: 38, criticalBurnout: 68, warningWellness: 67, criticalWellness: 47, exerciseWeight: 5.5 };
  return { idealSleepHours: 7, criticalSleepHours: 5, heavyStudyHours: 7, warningBurnout: 42, criticalBurnout: 72, warningWellness: 63, criticalWellness: 43, exerciseWeight: 6 };
}

function thresholdState(status, score) { return { score, status, severity: status === 'critical' ? 'high' : status === 'warning' ? 'medium' : 'low', colorState: status === 'critical' ? 'red' : status === 'warning' ? 'orange' : 'green' }; }
function deriveHealthState({ healthScore, burnoutState, wellnessState }) {
  if (burnoutState.status === 'critical' || wellnessState.status === 'critical' || healthScore < 45) return thresholdState('critical', healthScore);
  if (burnoutState.status === 'warning' || wellnessState.status === 'warning' || healthScore < 65) return thresholdState('warning', healthScore);
  return thresholdState('healthy', healthScore);
}
function deriveSavingsState({ rawSavingsRate }) { return thresholdState(savingsStatusFromRate(rawSavingsRate), rawSavingsRate); }
function deriveBufferState({ income, expenditure }) { if (income <= 0) return thresholdState('warning', 0); return thresholdState(savingsStatusFromRate(((income - expenditure) / income) * 100), ((income - expenditure) / income) * 100); }
function savingsStatusFromRate(r) { return r <= 33 ? 'critical' : r <= 66 ? 'warning' : 'healthy'; }
function colorStateFromSeverity(s) { return s === 'high' ? 'red' : s === 'medium' ? 'orange' : 'green'; }
function recommendationPriority(item) { const n = normalizeColorState(item.colorState); return n === 'red' || item.severity === 'high' ? 3 : n === 'orange' || item.severity === 'medium' ? 2 : 1; }
function sentimentFromColorState(cs) { return normalizeColorState(cs) === 'red' ? 'negative' : 'neutral'; }
function iconForCategory(cat = '') {
  const t = String(cat).toLowerCase();
  if (t.includes('finance') || t.includes('spending') || t.includes('saving')) return Wallet;
  if (t.includes('career') || t.includes('product') || t.includes('learning')) return Briefcase;
  return Activity;
}

function buildFinanceRanges({ income, expenditure, stressLevel, savingsRate, financeScore }) {
  const weekly = buildFinanceSeries({ income, expenditure, stressLevel, savingsRate, financeScore, points: 7, volatility: 7, rangeWeight: 0.65 });
  const monthly = buildFinanceSeries({ income, expenditure, stressLevel, savingsRate, financeScore, points: 12, volatility: 4.5, rangeWeight: 1 });
  return {
    '1W': { bars: weekly, linePoints: buildLinePoints(weekly), pointData: buildPointData(weekly), labels: ['Start', 'Mid', 'Today'], summary: 'Estimated weekly cashflow pattern from current income, spending, and savings signals' },
    '1M': { bars: monthly, linePoints: buildLinePoints(monthly), pointData: buildPointData(monthly), labels: ['Low', 'Baseline', 'Current'], summary: 'Estimated monthly finance trajectory based on current income, expenses, savings, and financial health' },
  };
}

function buildFinanceSeries({ income, expenditure, stressLevel, savingsRate, financeScore, points, volatility, rangeWeight }) {
  const pressure = income > 0 && expenditure > income;
  const trend = pressure ? -1 : savingsRate > 25 ? 1 : 0.35;
  const base = clamp(financeScore - trend * 22 * rangeWeight - stressLevel, 12, 82);
  return Array.from({ length: points }, (_, i) => clamp(base + (i * (trend * 5.5 * rangeWeight)) + (Math.sin(i * 0.9 + stressLevel * 0.2) * volatility) - (pressure ? i * 2.8 * rangeWeight : 0), 10, 96));
}

function buildLinePoints(s) { return buildPointData(s).map(p => `${p.x},${p.y}`).join(' '); }
function buildPointData(s) { const step = 352 / Math.max(s.length - 1, 1); return s.map((v, i) => ({ x: 8 + i * step, y: 140 - v * 1.25 })); }

function buildAlignmentBars({ sleepHours, studyHours, exerciseFrequency, stressLevel, rawSavingsRate, healthScore, financeScore, productivityScore, recoveryScore, burnoutRisk, hasGithub, hasLeetcode }) {
  const sleep = clamp(35 + sleepHours * 7 - Math.max(0, studyHours - 7) * 4, 8, 96);
  const stress = clamp(100 - stressLevel * 8 + exerciseFrequency * 4, 8, 96);
  const finance = clamp(55 + rawSavingsRate * 0.75 - stressLevel * 2, 8, 96);
  const career = clamp(productivityScore + (hasGithub ? 4 : 0) + (hasLeetcode ? 4 : 0) - Math.max(0, 6 - sleepHours) * 3, 8, 96);
  const recovery = clamp((recoveryScore + sleep + stress) / 3, 8, 96);
  const twin = clamp((healthScore + financeScore + career + recovery + (100 - burnoutRisk)) / 5, 8, 96);
  return [recovery, sleep, career, finance, stress, twin];
}

function buildRitualCalendar(date, insights) {
  const year = date.getFullYear(); const month = date.getMonth(); const today = date.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay();
  const streak = insights.streak || normalizeStreak();
  const completedDates = new Set(streak.completedDailyGoals.filter(e => e.goalCompleted !== false).map(e => e.date));
  const missedDates = new Set(streak.completedDailyGoals.filter(e => e.goalCompleted === false).map(e => e.date));
  const blanks = Array.from({ length: firstDay }, (_, i) => ({ key: `b-${i}`, type: 'blank' }));
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const value = i + 1; const isToday = value === today; const isFuture = value > today;
    const completed = completedDates.has(formatDateKey(year, month, value));
    const missed = missedDates.has(formatDateKey(year, month, value));
    return { key: `d-${value}`, type: 'day', value, state: isToday && completed ? 'today-complete' : isToday && missed ? 'missed' : isToday ? 'today' : isFuture ? 'future' : completed ? 'done' : missed || streak.streakStarted ? 'missed' : 'empty' };
  });
  return { today, monthShort: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date), currentStreak: streak.currentStreak, streakStarted: streak.streakStarted, days: [...blanks, ...days] };
}

function normalizeStreak(r = {}) { return { currentStreak: Number(r.currentStreak || 0), streakStarted: Boolean(r.streakStarted), lastGoalCompletionDate: r.lastGoalCompletionDate || '', completedDailyGoals: Array.isArray(r.completedDailyGoals) ? r.completedDailyGoals.map(e => ({ ...e, goalCompleted: e.goalCompleted !== false })) : [] }; }
function formatDateKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function formatTimeLeft(date) { const end = new Date(date); end.setHours(23, 59, 59, 999); const s = Math.max(0, Math.floor((end - date) / 1000)); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(v => String(v).padStart(2, '0')).join(':'); }
function formatMoney(v) { return Number.isNaN(v) ? 'Add data' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v); }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

export default Dashboard;

