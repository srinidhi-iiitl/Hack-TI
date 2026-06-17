import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Activity, DollarSign, Briefcase, Calendar, PlusCircle,
  Flame, TrendingUp, AlertTriangle, X, CheckCircle, Loader2,
  Sparkles, Trophy, BarChart2, Link2, Shield, Star, Brain,
  Trash2, ChevronRight, RefreshCw, Zap, Clock, Map,
  ArrowRight, Check, Circle, Lock, Wifi, WifiOff,
  Apple, Utensils, Info, HeartPulse, Dumbbell, Baby
} from 'lucide-react';
import toast from 'react-hot-toast';
import mealPlanApi from '../services/mealPlanApi';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const getGlassClass = (theme) =>
  theme === 'light'
    ? 'rounded-2xl border border-slate-200 bg-white shadow-sm'
    : 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl';

const getGlassHoverClass = (theme) =>
  theme === 'light'
    ? 'rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#7b61ff]/30 hover:shadow-lg cursor-pointer active:scale-[0.98]'
    : 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_28px_70px_rgba(0,0,0,0.55)] cursor-pointer active:scale-[0.98]';

const DOMAIN_CONFIG = {
  health:  { icon: Activity,   color: '#ff4d7d', label: 'Health & Wellness',  emoji: '🏃' },
  finance: { icon: DollarSign, color: '#10c7a1', label: 'Wealth & Finance',   emoji: '💰' },
  career:  { icon: Briefcase,  color: '#c8a84b', label: 'Career & Learning',  emoji: '💻' },
};

const GOAL_TEMPLATES = [
  { domain: 'health',  title: 'Run 5km without stopping',       targetMetric: 5,      unit: 'km',       priority: 'high',   emoji: '🏃' },
  { domain: 'health',  title: 'Lose 5kg body weight',           targetMetric: 5,      unit: 'kg',       priority: 'high',   emoji: '⚖️' },
  { domain: 'health',  title: 'Sleep 8 hours every night',      targetMetric: 30,     unit: 'nights',   priority: 'medium', emoji: '😴' },
  { domain: 'health',  title: 'Drink 3L water daily',           targetMetric: 90,     unit: 'liters',   priority: 'medium', emoji: '💧' },
  { domain: 'finance', title: 'Save ₹1 Lakh emergency fund',    targetMetric: 100000, unit: '₹',        priority: 'high',   emoji: '💰' },
  { domain: 'finance', title: 'Invest ₹5000/month in SIP',      targetMetric: 60000,  unit: '₹',        priority: 'medium', emoji: '📈' },
  { domain: 'finance', title: 'Reduce food spend to ₹8k/month', targetMetric: 8000,   unit: '₹/mo',     priority: 'low',    emoji: '🍱' },
  { domain: 'career',  title: 'Complete 50 LeetCode problems',  targetMetric: 50,     unit: 'problems', priority: 'high',   emoji: '💻' },
  { domain: 'career',  title: 'Read 12 books this year',        targetMetric: 12,     unit: 'books',    priority: 'medium', emoji: '📚' },
  { domain: 'career',  title: 'Build and ship 3 side projects', targetMetric: 3,      unit: 'projects', priority: 'high',   emoji: '🚀' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPrediction(goal) {
  if (!goal.currentMetric || goal.currentMetric === 0) return null;
  const created     = new Date(goal.createdAt || Date.now() - 7 * 86400000);
  const now         = new Date();
  const daysElapsed = Math.max((now - created) / 86400000, 1);
  const rate        = goal.currentMetric / daysElapsed;
  if (rate <= 0) return null;
  const remaining = goal.targetMetric - goal.currentMetric;
  const daysLeft  = Math.ceil(remaining / rate);
  const predicted = new Date(now.getTime() + daysLeft * 86400000);
  const onTrack   = predicted <= new Date(goal.deadline);
  return { daysLeft, onTrack, rate: rate.toFixed(2) };
}

function detectCrossDomainInsights(goals) {
  const insights = [];
  const h = goals.filter(g => g.domain === 'health');
  const f = goals.filter(g => g.domain === 'finance');
  const c = goals.filter(g => g.domain === 'career');

  if (h.length && f.length) {
    const hasDiet    = h.some(g => /eat|food|kg/i.test(g.title + g.unit));
    const hasSavings = f.some(g => /save|fund/i.test(g.title));
    if (hasDiet && hasSavings)
      insights.push({ type: 'synergy', icon: Link2, color: '#10c7a1', message: 'Eating at home aligns both your health and savings goals — 2× XP opportunity.' });
  }
  if (c.length && h.length) {
    const hasCode  = c.some(g => /project|leetcode/i.test(g.title));
    const hasSleep = h.some(g => /sleep/i.test(g.title));
    if (hasCode && hasSleep)
      insights.push({ type: 'conflict', icon: AlertTriangle, color: '#c8a84b', message: 'Late-night coding sessions conflict with your sleep goal. Hard cutoff at 11 PM protects both.' });
  }
  if (goals.length >= 3)
    insights.push({ type: 'synergy', icon: Shield, color: '#7b61ff', message: `${goals.length} active objectives. Complete all in the same week to unlock the "Omni-Domain" badge.` });

  return insights;
}

// ─── Sync Status Banner ───────────────────────────────────────────────────────
function SyncStatusBanner({ syncStatus, onRefresh, refreshing }) {
  const { theme } = useTheme();
  const lastSync   = syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt) : null;
  const minAgo     = lastSync ? Math.floor((Date.now() - lastSync) / 60000) : null;
  const hasSources = syncStatus?.sources?.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className={`mb-6 rounded-xl border px-5 py-4 transition-all duration-500 ${
        hasSources
          ? (theme === 'light' ? 'border-[#10c7a1]/30 bg-[#10c7a1]/5 text-[#0f172a]' : 'border-[#10c7a1]/25 bg-[#10c7a1]/8')
          : (theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/8 bg-white/3')
      }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Animated pulse dot */}
          <div className="relative flex-shrink-0">
            <div className={`h-2 w-2 rounded-full ${hasSources ? 'bg-[#10c7a1]' : (theme === 'light' ? 'bg-slate-300' : 'bg-white/20')}`} />
            {hasSources && (
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-[#10c7a1] animate-ping opacity-60" />
            )}
          </div>

          {hasSources ? (
            <>
              <span className="text-xs font-bold text-[#10c7a1]">Live — synced from</span>
              {syncStatus.sources.map((src, i) => (
                <span key={i}
                  className="rounded-full border border-[#10c7a1]/30 bg-[#10c7a1]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#10c7a1]">
                  {src.label}: {src.value}
                </span>
              ))}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>
                Autonomous sync idle
              </span>
              <span className={`text-[10px] ${theme === 'light' ? 'text-slate-400 border-slate-200 bg-white' : 'text-white/25 border-white/10'} border rounded-full px-2.5 py-0.5`}>
                Scan a meal or receipt in Copilot to activate
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {minAgo !== null && (
            <span className={`text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-white/25'}`}>
              {minAgo === 0 ? 'just now' : `${minAgo}m ago`}
            </span>
          )}
          <button onClick={onRefresh} disabled={refreshing}
            className={`flex items-center gap-1.5 rounded-lg border ${theme === 'light' ? 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 shadow-sm' : 'border-white/10 bg-white/5 text-white/40 hover:text-white'} px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40`}>
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Goal Detail Drawer ───────────────────────────────────────────────────────
function GoalDetailDrawer({ goal, onClose, onDelete }) {
  const { theme } = useTheme();
  const glass = getGlassClass(theme);
  const [roadmap, setRoadmap]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [roadmapRequested, setRoadmapRequested] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const roadmapRequestInFlightRef = useRef(false);

  const cfg        = DOMAIN_CONFIG[goal.domain] || DOMAIN_CONFIG.health;
  const Icon       = cfg.icon;
  const pct        = Math.min(Math.round((goal.currentMetric / goal.targetMetric) * 100), 100);
  const prediction = getPrediction(goal);
  const isComplete = pct >= 100;
  const daysLeft   = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);

  useEffect(() => {
    roadmapRequestInFlightRef.current = false;
    setRoadmap(null);
    setRoadmapRequested(false);
    setLoading(false);
  }, [goal._id]);

  useEffect(() => {
    if (!roadmapRequested || roadmapRequestInFlightRef.current) return;

    roadmapRequestInFlightRef.current = true;
    const fetchRoadmap = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const res   = await axios.get(`${API_BASE_URL}/api/goals/${goal._id}/roadmap`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) setRoadmap(res.data.roadmap);
      } catch (e) {
        console.error('Roadmap fetch failed:', e);
        // Fallback roadmap so UI never breaks
        setRoadmap({
          overview:   `To reach ${goal.targetMetric} ${goal.unit}, focus on consistent daily progress. Your current pace is being tracked automatically.`,
          weeklyTarget: Math.ceil((goal.targetMetric - goal.currentMetric) / Math.max(daysLeft / 7, 1)),
          milestones: [
            { label: '25% milestone', target: Math.round(goal.targetMetric * 0.25), tip: 'Build the habit first. Consistency beats intensity.' },
            { label: '50% milestone', target: Math.round(goal.targetMetric * 0.5),  tip: 'You are halfway. Reassess your strategy and double down.' },
            { label: '75% milestone', target: Math.round(goal.targetMetric * 0.75), tip: 'The final stretch. Maintain momentum and avoid burnout.' },
            { label: 'Goal complete', target: goal.targetMetric,                    tip: 'You did it. Log the win and set a harder target.' },
          ],
          dailyActions: [
            'Check your progress every morning for 60 seconds',
            'Link this goal to one daily habit you already have',
            'Review at end of week — adjust pace if needed',
          ],
          risks: ['Inconsistency is the #1 killer of long-term goals', 'Avoid comparing your pace to others'],
        });
      }
      roadmapRequestInFlightRef.current = false;
      setLoading(false);
    };
    fetchRoadmap();
  }, [goal._id, roadmapRequested]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/api/goals/${goal._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onDelete(goal._id);
      onClose();
    } catch (e) {
      console.error('Delete failed:', e);
    }
    setDeleting(false);
  };

  // Map milestone completion
  const getMilestoneStatus = (target) => {
    if (goal.currentMetric >= target) return 'done';
    if (goal.currentMetric >= target * 0.8) return 'near';
    return 'locked';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={`w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto ${glass} rounded-t-3xl sm:rounded-3xl`}>

        {/* ── Drawer Header ── */}
        <div className={`sticky top-0 z-10 flex items-start justify-between p-6 pb-4 ${theme === 'light' ? 'bg-white/95 border-slate-200' : 'bg-[#0f1320]/95 border-white/8'} backdrop-blur-xl border-b rounded-t-3xl sm:rounded-t-3xl`}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5" style={{ backgroundColor: `${cfg.color}18` }}>
              <Icon className="h-5 w-5" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
              <h2 className={`text-lg font-black leading-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{goal.title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Delete button */}
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 px-3 py-2 text-xs font-semibold text-[#ff4d7d] hover:bg-[#ff4d7d]/15 transition">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Sure?</span>
                <button onClick={handleDelete} disabled={deleting}
                  className="rounded-xl bg-[#ff4d7d] px-3 py-2 text-xs font-bold text-white hover:bg-[#e0355f] transition disabled:opacity-50">
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes, delete'}
                </button>
                <button onClick={() => setDeleteConfirm(false)}
                  className={`rounded-xl border ${theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900' : 'border-white/10 bg-white/5 text-white/60 hover:text-white'} px-3 py-2 text-xs font-semibold transition`}>
                  Cancel
                </button>
              </div>
            )}
            <button onClick={onClose}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800' : 'border-white/10 bg-white/5 text-white/50 hover:text-white'} transition`}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Progress Overview ── */}
          <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }}>
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-xs mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Current Progress</p>
                <p className="text-3xl font-black" style={{ color: cfg.color }}>
                  {goal.currentMetric?.toLocaleString()}
                  <span className={`text-base font-semibold ml-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>/ {goal.targetMetric?.toLocaleString()} {goal.unit}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black" style={{ color: cfg.color }}>{pct}%</p>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>complete</p>
              </div>
            </div>

            {/* Fat progress bar */}
            <div className={`h-4 w-full overflow-hidden rounded-full ${theme === 'light' ? 'bg-slate-100' : 'bg-white/8'}`}>
              <motion.div className="h-full rounded-full relative overflow-hidden"
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.4, ease: 'easeOut' }}
                style={{ background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})` }}>
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent animate-pulse ${theme === 'light' ? 'to-white/40' : 'to-white/20'}`} />
              </motion.div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-xl p-3 text-center ${theme === 'light' ? 'bg-slate-100/50' : 'bg-white/5'}`}>
                <p className={`text-xs mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Deadline</p>
                <p className={`text-sm font-bold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                  {daysLeft > 0 ? `${daysLeft}d left` : <span className="text-[#ff4d7d]">Overdue</span>}
                </p>
              </div>
              <div className={`rounded-xl p-3 text-center ${theme === 'light' ? 'bg-slate-100/50' : 'bg-white/5'}`}>
                <p className={`text-xs mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Streak</p>
                <p className="text-sm font-bold text-[#ff4d7d]">
                  {goal.streak > 0 ? `🔥 ${goal.streak}d` : '—'}
                </p>
              </div>
              <div className={`rounded-xl p-3 text-center ${theme === 'light' ? 'bg-slate-100/50' : 'bg-white/5'}`}>
                <p className={`text-xs mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Priority</p>
                <p className={`text-sm font-bold ${
                  goal.priority === 'high' ? 'text-[#ff4d7d]' :
                  goal.priority === 'medium' ? 'text-[#c8a84b]' : (theme === 'light' ? 'text-slate-500' : 'text-white/50')
                }`}>{goal.priority}</p>
              </div>
            </div>

            {/* AI Prediction */}
            {prediction && !isComplete && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border ${
                prediction.onTrack
                  ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#10c7a1]'
                  : 'border-[#ff4d7d]/30 bg-[#ff4d7d]/10 text-[#ff4d7d]'
              }`}>
                <TrendingUp className="h-4 w-4 flex-shrink-0" />
                {prediction.onTrack
                  ? `On track — at current pace you'll finish in ~${prediction.daysLeft} days`
                  : `Behind pace — needs ~${prediction.daysLeft} more days but only ${daysLeft} remain`}
              </div>
            )}
            {isComplete && (
              <div className="flex items-center gap-2 rounded-xl border border-[#10c7a1]/40 bg-[#10c7a1]/15 px-4 py-3 text-sm font-bold text-[#10c7a1]">
                <CheckCircle className="h-4 w-4" /> Goal achieved! Outstanding work.
              </div>
            )}
          </div>

          {/* ── Auto-Sync Info ── */}
          <div className={`rounded-xl border px-5 py-4 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/8 bg-white/3'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-4 w-4 text-[#10c7a1]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#10c7a1]">Autonomous Tracking Active</p>
            </div>
            <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-650' : 'text-white/50'}`}>
              Progress updates automatically whenever you scan meals, receipts, or medical reports in the Copilot. No manual input needed — your Digital Twin is always watching.
            </p>
            {goal.lastLoggedAt && (
              <p className={`mt-2 text-xs ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>
                Last auto-update: {new Date(goal.lastLoggedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* ── AI Roadmap ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-xl bg-[#7b61ff]/20 p-2">
                <Brain className="h-4 w-4 text-[#7b61ff]" />
              </div>
              <h3 className={`font-bold text-base ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>AI-Generated Roadmap</h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#7b61ff]">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm font-semibold animate-pulse">Generating your personal roadmap...</p>
              </div>
            ) : !roadmap ? (
              <div className={`rounded-2xl border border-dashed p-5 text-center ${theme === 'light' ? 'border-[#7b61ff]/30 bg-[#7b61ff]/5' : 'border-[#7b61ff]/25 bg-[#7b61ff]/5'}`}>
                <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>Generate a personalized roadmap for this goal when you need it.</p>
                <button
                  type="button"
                  onClick={() => setRoadmapRequested(true)}
                  disabled={loading}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#7b61ff]/30 bg-[#7b61ff]/10 px-4 py-2 text-xs font-bold text-[#c084fc] transition hover:bg-[#7b61ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate roadmap
                </button>
              </div>
            ) : roadmap && (
              <div className="space-y-5">

                {/* Overview */}
                <div className="rounded-xl border border-[#7b61ff]/25 bg-[#7b61ff]/8 p-4">
                  <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>{roadmap.overview}</p>
                  {roadmap.weeklyTarget && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#7b61ff]/30 bg-[#7b61ff]/15 px-3 py-1">
                      <Zap className="h-3.5 w-3.5 text-[#7b61ff]" />
                      <span className="text-xs font-bold text-[#7b61ff]">
                        Weekly target: {Number(roadmap.weeklyTarget).toLocaleString()} {goal.unit}/week
                      </span>
                    </div>
                  )}
                </div>

                {/* Milestone Map */}
                {roadmap.milestones?.length > 0 && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${theme === 'light' ? 'text-slate-450' : 'text-white/40'}`}>Milestone Map</p>
                    <div className="relative">
                      {/* Vertical connector line */}
                      <div className={`absolute left-4 top-4 bottom-4 w-px ${theme === 'light' ? 'bg-slate-200' : 'bg-white/10'}`} />
                      <div className="space-y-3">
                        {roadmap.milestones.map((m, i) => {
                           const status = getMilestoneStatus(m.target);
                           return (
                             <motion.div key={i}
                               initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: i * 0.08 }}
                               className={`relative flex gap-4 rounded-xl border p-4 transition-all ${
                                 status === 'done'
                                   ? 'border-[#10c7a1]/30 bg-[#10c7a1]/8'
                                   : status === 'near'
                                   ? `border-${cfg.color}/30 ${theme === 'light' ? 'bg-slate-100/50' : 'bg-white/5'}`
                                   : `${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/8 bg-white/3'} opacity-60`
                               }`}>
                               {/* Node */}
                               <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full z-10 ${
                                 status === 'done'
                                   ? 'bg-[#10c7a1] text-black'
                                   : status === 'near'
                                   ? `border-2 ${theme === 'light' ? 'border-slate-300 bg-slate-100' : 'border-white/30 bg-white/10'}`
                                   : `border ${theme === 'light' ? 'border-slate-200 bg-white shadow-sm' : 'border border-white/15 bg-[#0f1320]'}`
                               }`}>
                                 {status === 'done'
                                   ? <Check className="h-4 w-4" />
                                   : status === 'near'
                                   ? <Circle className={`h-3 w-3 ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`} />
                                   : <Lock className={`h-3 w-3 ${theme === 'light' ? 'text-slate-400' : 'text-white/25'}`} />}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center justify-between gap-2 mb-1">
                                   <p className={`text-sm font-bold ${status === 'done' ? 'text-[#10c7a1]' : (theme === 'light' ? 'text-slate-800' : 'text-white')}`}>
                                     {m.label}
                                   </p>
                                   <span className={`text-xs font-bold flex-shrink-0 ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>
                                     {Number(m.target).toLocaleString()} {goal.unit}
                                   </span>
                                 </div>
                                 <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>{m.tip}</p>
                               </div>
                             </motion.div>
                           );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily Actions */}
                {roadmap.dailyActions?.length > 0 && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${theme === 'light' ? 'text-slate-450' : 'text-white/40'}`}>Daily Actions</p>
                    <div className="space-y-2">
                      {roadmap.dailyActions.map((action, i) => (
                        <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${theme === 'light' ? 'bg-slate-50 border border-slate-200/60 shadow-sm' : 'bg-white/5'}`}>
                          <ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white/75'}`}>{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {roadmap.risks?.length > 0 && (
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${theme === 'light' ? 'text-slate-450' : 'text-white/40'}`}>Watch Out For</p>
                    <div className="space-y-2">
                      {roadmap.risks.map((risk, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl border border-[#ff4d7d]/15 bg-[#ff4d7d]/6 px-4 py-3">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#ff4d7d]" />
                          <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white/70'}`}>{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* ── Recent Progress Logs ── */}
          {goal.progressLogs?.length > 0 && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${theme === 'light' ? 'text-slate-450' : 'text-white/40'}`}>Recent Auto-Syncs</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...goal.progressLogs].reverse().slice(0, 8).map((log, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5'}`}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className={`text-xs ${theme === 'light' ? 'text-slate-650' : 'text-white/60'}`}>{log.note || 'Progress logged'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold" style={{ color: cfg.color }}>+{log.value} {goal.unit}</span>
                      <span className={`text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>{new Date(log.loggedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, onClick }) {
  const { theme } = useTheme();
  const glassHover = getGlassHoverClass(theme);
  const cfg        = DOMAIN_CONFIG[goal.domain] || DOMAIN_CONFIG.health;
  const Icon       = cfg.icon;
  const pct        = Math.min(Math.round((goal.currentMetric / goal.targetMetric) * 100), 100);
  const prediction = getPrediction(goal);
  const isComplete = pct >= 100;
  const daysLeft   = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);

  return (
    <article
      onClick={onClick}
      className={`${glassHover} flex flex-col justify-between p-6 relative overflow-hidden cursor-pointer`}
      style={{ boxShadow: isComplete ? `0 0 30px ${cfg.color}30` : undefined }}>

      {isComplete && (
        <div className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: `radial-gradient(circle at 50% 0%, ${cfg.color}15, transparent 70%)` }} />
      )}

      {/* Top row */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ backgroundColor: `${cfg.color}18` }}>
            <Icon className="h-5 w-5" style={{ color: cfg.color }} />
          </div>
          {goal.streak > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-[#ff4d7d]/30 bg-[#ff4d7d]/10 px-2 py-0.5 text-xs font-bold text-[#ff4d7d]">
              <Flame className="h-3 w-3" /> {goal.streak}d
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isComplete && <CheckCircle className="h-5 w-5 text-[#10c7a1]" />}
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            goal.priority === 'high'   ? 'border-[#ff4d7d]/40 text-[#ff4d7d]' :
            goal.priority === 'medium' ? 'border-[#c8a84b]/40 text-[#c8a84b]' :
            (theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-white/20 text-white/50')
          }`}>{goal.priority}</span>
        </div>
      </div>

      <h3 className={`text-base font-bold leading-snug mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{goal.title}</h3>
      <p className={`text-xs mb-5 ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>{cfg.label}</p>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className={theme === 'light' ? 'text-slate-500' : 'text-white/50'}>Progress</span>
          <span className="font-bold" style={{ color: cfg.color }}>
            {goal.currentMetric?.toLocaleString()} / {goal.targetMetric?.toLocaleString()} {goal.unit}
          </span>
        </div>
        <div className={`h-2.5 w-full overflow-hidden rounded-full ${theme === 'light' ? 'bg-slate-100' : 'bg-white/8'}`}>
          <motion.div className="h-full rounded-full" initial={{ width: 0 }}
            animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ background: `linear-gradient(90deg, ${cfg.color}aa, ${cfg.color})` }} />
        </div>
        <div className={`flex justify-between text-xs ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
          <span>{pct}% complete</span>
          <span>{100 - pct}% remaining</span>
        </div>
      </div>

      {/* Prediction */}
      {prediction && !isComplete && (
        <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border ${
          prediction.onTrack
            ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#10c7a1]'
            : 'border-[#ff4d7d]/30 bg-[#ff4d7d]/10 text-[#ff4d7d]'
        }`}>
          <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
          {prediction.onTrack
            ? `On track · ~${prediction.daysLeft} days at current pace`
            : `Behind pace · ~${prediction.daysLeft} days needed, ${daysLeft} left`}
        </div>
      )}

      {/* Bottom */}
      <div className={`mt-5 pt-4 border-t flex items-center justify-between ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
        <div className={`flex items-center gap-1.5 text-xs ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
          <Calendar className="h-3.5 w-3.5" />
          {daysLeft > 0 ? `${daysLeft}d left` : <span className="text-[#ff4d7d]">Overdue</span>}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cfg.color }}>
          {isComplete
            ? <><Star className="h-3.5 w-3.5" /> Completed!</>
            : <><ChevronRight className="h-3.5 w-3.5" /> View Roadmap</>
          }
        </div>
      </div>
    </article>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Goals() {
  const { theme } = useTheme();
  const glass = getGlassClass(theme);
  const glassHover = getGlassHoverClass(theme);
  const [goals, setGoals]             = useState([]);
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedGoal, setSelectedGoal]  = useState(null);
  const [weeklyDigest, setWeeklyDigest]  = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [activeFilter, setActiveFilter]  = useState('all');
  const [syncStatus, setSyncStatus]      = useState(null);
  const [syncRefreshing, setSyncRefreshing] = useState(false);

  // Meal Planner State
  const [mealPlans, setMealPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [pastPlans, setPastPlans] = useState([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState(null);
  const [coachAdvice, setCoachAdvice] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);
  const [weather, setWeather] = useState(null);
  const [deletingPlanId, setDeletingPlanId] = useState(null);

  // Meal Planner Form State
  const [formCategory, setFormCategory] = useState('Fitness Goal');
  const [formAge, setFormAge] = useState('');
  const [formGender, setFormGender] = useState('Male');
  const [formHeightCm, setFormHeightCm] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formActivityLevel, setFormActivityLevel] = useState('Moderate');
  const [formDietaryPreference, setFormDietaryPreference] = useState('Vegetarian');
  const [formAllergies, setFormAllergies] = useState('');
  const [formDuration, setFormDuration] = useState('7');
  const [formCustomDuration, setFormCustomDuration] = useState('');
  const [formConditions, setFormConditions] = useState([]);
  const [formOtherCondition, setFormOtherCondition] = useState('');
  const [formFitnessGoal, setFormFitnessGoal] = useState('Weight Loss');
  const [formTrimester, setFormTrimester] = useState('1');

  // Form state
  const [domain, setDomain]           = useState('health');
  const [title, setTitle]             = useState('');
  const [targetMetric, setTargetMetric] = useState('');
  const [unit, setUnit]               = useState('');
  const [deadline, setDeadline]       = useState('');
  const [priority, setPriority]       = useState('medium');

  const token = localStorage.getItem('authToken');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchMealPlans = useCallback(async () => {
    setLoadingMeals(true);
    try {
      const res = await mealPlanApi.getMealPlans();
      if (res.success) {
        setMealPlans(res.data);
        const active = res.data.find(p => p.status === 'active');
        setActivePlan(active);
        setPastPlans(res.data.filter(p => p.status !== 'active'));
      }
    } catch (e) {
      console.error('Error fetching meal plans:', e);
    } finally {
      setLoadingMeals(false);
    }
  }, []);

  const fetchCoachAdvice = useCallback(async (currentWeather) => {
    setCoachLoading(true);
    try {
      const res = await mealPlanApi.getCoachAdvice(currentWeather);
      if (res.success) {
        setCoachAdvice(res.data.advice);
      }
    } catch (e) {
      console.error('Error fetching AI coach advice:', e);
    } finally {
      setCoachLoading(false);
    }
  }, []);

  const handleCreateMealPlan = async (e) => {
    e.preventDefault();
    setGeneratingPlan(true);

    const conditionOrGoal = [];
    if (formCategory === 'Health Issue') {
      conditionOrGoal.push(...formConditions);
      if (formConditions.includes('Other') && formOtherCondition.trim()) {
        conditionOrGoal.push(formOtherCondition.trim());
      }
    } else if (formCategory === 'Fitness Goal') {
      conditionOrGoal.push(formFitnessGoal);
    } else if (formCategory === 'Pregnancy') {
      conditionOrGoal.push(`Trimester ${formTrimester}`);
    }

    const durationDays = formDuration === 'custom' ? Number(formCustomDuration) : Number(formDuration);

    const payload = {
      category: formCategory,
      conditionOrGoal,
      trimester: formCategory === 'Pregnancy' ? Number(formTrimester) : undefined,
      age: Number(formAge),
      gender: formGender,
      heightCm: Number(formHeightCm),
      weight: Number(formWeight),
      activityLevel: formActivityLevel,
      dietaryPreference: formDietaryPreference,
      allergies: formAllergies,
      duration: durationDays
    };

    try {
      const res = await mealPlanApi.createMealPlan(payload);
      if (res.success) {
        toast.success('AI Meal Plan generated successfully!');
        setIsPlanModalOpen(false);
        setModalStep(1);
        // Reset form
        setFormAge('');
        setFormHeightCm('');
        setFormWeight('');
        setFormAllergies('');
        setFormConditions([]);
        setFormOtherCondition('');
        fetchMealPlans();
        fetchCoachAdvice(weather);
      }
    } catch (err) {
      console.error('Failed to create meal plan:', err);
      toast.error(err.response?.data?.message || 'Failed to generate meal plan. Try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleRegenerateMealPlan = async (id) => {
    setRegeneratingPlan(true);
    try {
      const res = await mealPlanApi.regenerateMealPlan(id);
      if (res.success) {
        toast.success('Meal plan recipes regenerated successfully!');
        setSelectedMealPlan(res.data);
        fetchMealPlans();
      }
    } catch (err) {
      console.error('Failed to regenerate meal plan:', err);
      toast.error('Failed to regenerate alternative recipes. Try again.');
    } finally {
      setRegeneratingPlan(false);
    }
  };

  const handleDeleteMealPlan = async (id) => {
    setDeletingPlanId(id);
    try {
      const res = await mealPlanApi.deleteMealPlan(id);
      if (res.success) {
        toast.success('Meal plan deleted successfully.');
        setSelectedMealPlan(null);
        fetchMealPlans();
        fetchCoachAdvice(weather);
      }
    } catch (err) {
      console.error('Failed to delete meal plan:', err);
      toast.error('Failed to delete meal plan.');
    } finally {
      setDeletingPlanId(null);
    }
  };

  useEffect(() => {
    fetchMealPlans();
    
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
              fetchCoachAdvice(res.data.data);
            } else {
              fetchCoachAdvice(null);
            }
          } catch (e) {
            console.error('Failed to get weather advice on Goals page', e);
            fetchCoachAdvice(null);
          }
        },
        () => {
          fetchCoachAdvice(null);
        }
      );
    } else {
      fetchCoachAdvice(null);
    }
  }, [fetchMealPlans, fetchCoachAdvice]);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/goals`, authHeaders);
      if (res.data.success) setGoals(res.data.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchSyncStatus = useCallback(async (showSpinner = false) => {
    if (showSpinner) setSyncRefreshing(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/goals/sync-status`, authHeaders);
      if (res.data.success) {
        setSyncStatus(res.data);
        // Also refresh goals so progress bars update
        const goalsRes = await axios.get(`${API_BASE_URL}/api/goals`, authHeaders);
        if (goalsRes.data.success) setGoals(goalsRes.data.data);
      }
    } catch (e) { console.error(e); }
    if (showSpinner) setSyncRefreshing(false);
  }, []);

  useEffect(() => {
    console.log("[GoalsPage] Mounted and registering event listeners including 'dashboard-data-updated'.");
    fetchGoals();
    fetchSyncStatus();
    
    const handleSync = () => {
      console.log("[GoalsPage] Received 'dashboard-data-updated' or sync event! Re-fetching goals, sync status, and meal plans.");
      fetchGoals();
      fetchSyncStatus();
      fetchMealPlans();
    };
    window.addEventListener('dashboard-synced', handleSync);
    window.addEventListener('daily-update-completed', handleSync);
    window.addEventListener('goals-updated', handleSync);
    window.addEventListener('upload-history-updated', handleSync);
    window.addEventListener('dashboard-data-updated', handleSync);

    const interval = setInterval(() => {
      console.log("[GoalsPage] Running 60s sync status poll...");
      fetchSyncStatus();
    }, 60000);
    return () => {
      console.log("[GoalsPage] Unmounting. Cleaning up listeners and interval.");
      clearInterval(interval);
      window.removeEventListener('dashboard-synced', handleSync);
      window.removeEventListener('daily-update-completed', handleSync);
      window.removeEventListener('goals-updated', handleSync);
      window.removeEventListener('upload-history-updated', handleSync);
      window.removeEventListener('dashboard-data-updated', handleSync);
    };
  }, [fetchGoals, fetchSyncStatus]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE_URL}/api/goals`,
        { domain, title, targetMetric: Number(targetMetric), unit, deadline, priority },
        authHeaders
      );
      if (res.data.success) {
        setGoals(prev => [...prev, res.data.data]);
        setIsFormOpen(false);
        setTitle(''); setTargetMetric(''); setUnit(''); setDeadline('');
      }
    } catch (e) { console.error(e); }
  };

  const applyTemplate = (tpl) => {
    setDomain(tpl.domain); setTitle(tpl.title);
    setTargetMetric(String(tpl.targetMetric)); setUnit(tpl.unit); setPriority(tpl.priority);
    setShowTemplates(false); setIsFormOpen(true);
  };

  const handleDeleteGoal = (goalId) => {
    setGoals(prev => prev.filter(g => g._id !== goalId));
  };

  const generateWeeklyDigest = async () => {
    setDigestLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/goals/weekly-digest`, authHeaders);
      if (res.data.success) setWeeklyDigest(res.data.digest);
    } catch (e) {
      const completed = goals.filter(g => g.currentMetric >= g.targetMetric).length;
      setWeeklyDigest({
        summary: `${goals.length} objectives · ${completed} completed`,
        highlights: [`📊 ${goals.filter(g=>g.domain==='health').length} health · ${goals.filter(g=>g.domain==='finance').length} finance · ${goals.filter(g=>g.domain==='career').length} career`],
        advice: 'Consistent daily progress beats occasional sprints.'
      });
    }
    setDigestLoading(false);
  };

  const crossDomainInsights = detectCrossDomainInsights(goals);
  const filtered = activeFilter === 'all' ? goals : goals.filter(g => g.domain === activeFilter);
  const stats = {
    total:     goals.length,
    completed: goals.filter(g => g.currentMetric >= g.targetMetric).length,
    onTrack:   goals.filter(g => getPrediction(g)?.onTrack).length,
    streaks:   goals.filter(g => g.streak > 0).length,
  };

  return (
    <div className={`min-h-screen px-5 py-8 sm:px-8 font-sans transition-colors duration-300 ${
      theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#05070d] text-white'
    }`}>
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute -top-40 -left-40 h-96 w-96 rounded-full blur-[120px] ${theme === 'light' ? 'bg-[#ff4d7d]/4' : 'bg-[#ff4d7d]/8'}`} />
        <div className={`absolute -bottom-40 -right-40 h-96 w-96 rounded-full blur-[120px] ${theme === 'light' ? 'bg-[#10c7a1]/4' : 'bg-[#10c7a1]/8'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full blur-[100px] ${theme === 'light' ? 'bg-[#7b61ff]/3' : 'bg-[#7b61ff]/6'}`} />
      </div>

      <div className="relative mx-auto max-w-6xl">

        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#7b61ff]/30 bg-[#7b61ff]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#7b61ff]">
              <Target className="h-3 w-3" /> S.M.A.R.T Goal Engine
            </div>
            <h1 className={`text-4xl font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Your Objectives</h1>
            <p className={`mt-1 text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Fully autonomous — progress updates from your live data streams.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={generateWeeklyDigest} disabled={digestLoading || !goals.length}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-40 ${theme === 'light' ? 'border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-slate-700' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
              {digestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4 text-[#7b61ff]" />}
              Weekly Digest
            </button>
            <button onClick={() => setShowTemplates(true)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${theme === 'light' ? 'border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-slate-700' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
              <Sparkles className="h-4 w-4 text-[#c8a84b]" /> Templates
            </button>
            <button onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-2 rounded-xl bg-[#7b61ff] px-6 py-3 font-bold text-white shadow-[0_0_20px_rgba(123,97,255,0.3)] transition hover:bg-[#6345ed]">
              <PlusCircle className="h-5 w-5" /> New Objective
            </button>
          </div>
        </motion.header>

        {/* Stats Strip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Goals',    value: stats.total,     icon: Target,     color: '#7b61ff' },
            { label: 'Completed',      value: stats.completed, icon: Trophy,     color: '#10c7a1' },
            { label: 'On Track',       value: stats.onTrack,   icon: TrendingUp, color: '#c8a84b' },
            { label: 'Active Streaks', value: stats.streaks,   icon: Flame,      color: '#ff4d7d' },
          ].map((s, i) => (
            <div key={i} className={`${glass} flex items-center gap-4 p-4`}>
              <div className="rounded-xl p-2.5" style={{ backgroundColor: `${s.color}18` }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Sync Status Banner */}
        <SyncStatusBanner
          syncStatus={syncStatus}
          onRefresh={() => fetchSyncStatus(true)}
          refreshing={syncRefreshing}
        />

        {/* Weekly Digest */}
        <AnimatePresence>
          {weeklyDigest && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className={`mb-8 ${glass} border-[#7b61ff]/30 p-6`}>
              <div className="flex items-start justify-between mb-4">
                <h2 className="flex items-center gap-2 font-bold text-[#7b61ff]">
                  <Brain className="h-5 w-5" /> Weekly AI Digest
                </h2>
                <button onClick={() => setWeeklyDigest(null)} className={theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white'}><X className="h-4 w-4" /></button>
              </div>
              <p className={`mb-4 ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>{weeklyDigest.summary}</p>
              <div className="space-y-2 mb-4">
                {weeklyDigest.highlights?.map((h, i) => (
                  <div key={i} className={`rounded-lg px-4 py-2 text-sm ${theme === 'light' ? 'bg-slate-100/50 text-slate-650 border border-slate-200/50' : 'bg-white/5 text-white/70'}`}>{h}</div>
                ))}
              </div>
              <div className={`rounded-xl border p-4 text-sm ${theme === 'light' ? 'border-[#7b61ff]/25 bg-[#7b61ff]/5 text-slate-800' : 'border border-[#7b61ff]/20 bg-[#7b61ff]/10 text-white/90'}`}>
                <span className="font-bold text-[#7b61ff]">Copilot: </span>{weeklyDigest.advice}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cross-Domain Insights */}
        <AnimatePresence>
          {crossDomainInsights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-3">
              {crossDomainInsights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border px-5 py-4"
                  style={{ borderColor: `${ins.color}40`, backgroundColor: `${ins.color}0d` }}>
                  <ins.icon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: ins.color }} />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest mr-2" style={{ color: ins.color }}>
                      {ins.type === 'synergy' ? 'Synergy' : 'Conflict'}
                    </span>
                    <span className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>{ins.message}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Goal Form */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.section initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className={`mb-8 ${glass} border-[#7b61ff]/30 p-6`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2 text-[#7b61ff]">
                  <Target className="h-5 w-5" /> Define New Objective
                </h2>
                <button onClick={() => setIsFormOpen(false)} className={theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white'}><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCreateGoal} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
                <div>
                  <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Domain</label>
                  <select value={domain} onChange={e => setDomain(e.target.value)}
                    className={`w-full rounded-lg border p-3 focus:border-[#7b61ff] focus:outline-none ${theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-white/5 text-white'}`}>
                    <option value="health">🏃 Health & Wellness</option>
                    <option value="finance">💰 Wealth & Finance</option>
                    <option value="career">💻 Career & Learning</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Goal Title</label>
                  <input type="text" placeholder="e.g., Save for house downpayment" value={title} onChange={e => setTitle(e.target.value)} required
                    className={`w-full rounded-lg border p-3 focus:border-[#7b61ff] focus:outline-none ${theme === 'light' ? 'border-slate-200 bg-white text-slate-900 placeholder-slate-400' : 'border-white/10 bg-white/5 text-white placeholder-white/30'}`} />
                </div>
                <div>
                  <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Target Number</label>
                  <input type="number" placeholder="e.g., 10000" value={targetMetric} onChange={e => setTargetMetric(e.target.value)} required
                    className={`w-full rounded-lg border p-3 focus:border-[#7b61ff] focus:outline-none ${theme === 'light' ? 'border-slate-200 bg-white text-slate-900 placeholder-slate-400' : 'border-white/10 bg-white/5 text-white placeholder-white/30'}`} />
                </div>
                <div>
                  <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Unit</label>
                  <input type="text" placeholder="e.g., ₹, kg, chapters" value={unit} onChange={e => setUnit(e.target.value)} required
                    className={`w-full rounded-lg border p-3 focus:border-[#7b61ff] focus:outline-none ${theme === 'light' ? 'border-slate-200 bg-white text-slate-900 placeholder-slate-400' : 'border-white/10 bg-white/5 text-white placeholder-white/30'}`} />
                </div>
                <div>
                  <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Target Deadline</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required
                    className={`w-full rounded-lg border p-3 focus:border-[#7b61ff] focus:outline-none ${theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-white/5 text-white'}`} />
                </div>
                <div>
                  <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className={`w-full rounded-lg border p-3 focus:border-[#7b61ff] focus:outline-none ${theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-white/10 bg-white/5 text-white'}`}>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-2">
                  <button type="submit"
                    className="w-full rounded-lg bg-gradient-to-r from-[#7b61ff] to-[#10c7a1] px-6 py-3 font-bold text-white shadow-lg transition hover:scale-[1.01]">
                    Initialize Objective & Earn XP
                  </button>
                </div>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Templates Modal */}
        <AnimatePresence>
          {showTemplates && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto ${glass} p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-[#c8a84b]">
                    <Sparkles className="h-5 w-5" /> Quick-Start Templates
                  </h2>
                  <button onClick={() => setShowTemplates(false)} className={theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-white/40 hover:text-white'}><X className="h-5 w-5" /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {GOAL_TEMPLATES.map((tpl, i) => {
                    const cfg = DOMAIN_CONFIG[tpl.domain];
                    return (
                      <button key={i} onClick={() => applyTemplate(tpl)}
                        className={`text-left rounded-xl border p-4 transition hover:scale-[1.02] ${theme === 'light' ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-350' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}>
                        <div className="text-2xl mb-2">{tpl.emoji}</div>
                        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: cfg.color }}>{cfg.label}</div>
                        <div className={`text-sm font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{tpl.title}</div>
                        <div className={`mt-2 text-xs ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Target: {tpl.targetMetric.toLocaleString()} {tpl.unit}</div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PERSONALIZED MEAL PLANNER SECTION ── */}
        <section className={`mb-10 rounded-[1.75rem] border p-6 sm:p-8 ${theme === 'light' ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#080d15]/95 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)]'}`}>
          <div className={`flex items-center justify-between border-b pb-5 mb-6 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#10c7a1] to-[#7b61ff] p-3 text-white">
                <Utensils className="h-6 w-6" />
              </div>
              <div>
                <h2 className={`text-2xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>AI Personalized Meal Planner</h2>
                <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Custom diet charts aligned with bio-metrics & conditions</p>
              </div>
            </div>
            {!activePlan && (
              <button onClick={() => { setIsPlanModalOpen(true); setModalStep(1); }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#10c7a1] to-[#7b61ff] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:scale-[1.02]">
                <PlusCircle className="h-4 w-4" /> Create Meal Plan
              </button>
            )}
          </div>

          {/* AI Health Coach Banner */}
          {coachAdvice && (
            <div className="mb-6 rounded-2xl border border-[#7b61ff]/30 bg-[#7b61ff]/10 px-5 py-4 flex items-start gap-3.5">
              <Brain className="h-5 w-5 text-[#c084fc] shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#c084fc] mb-1">AI Health Coach</p>
                <p className={`text-sm leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>{coachAdvice}</p>
              </div>
            </div>
          )}

          {/* Active Plan Dashboard metrics */}
          {activePlan && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`rounded-2xl border p-4 flex items-center justify-between ${theme === 'light' ? 'border-slate-200 bg-slate-50/50 shadow-sm' : 'border-white/10 bg-[#0f1320]/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)]'}`}>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Adherence</p>
                  <p className="text-2xl font-black text-[#10c7a1] mt-1">{activePlan.stats?.adherence ?? 0}%</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#10c7a1]/10 flex items-center justify-center text-white border border-[#10c7a1]/20">
                  <Target className="h-5 w-5 text-[#10c7a1]" />
                </div>
              </div>
              <div className={`rounded-2xl border p-4 flex items-center justify-between ${theme === 'light' ? 'border-slate-200 bg-slate-50/50 shadow-sm' : 'border-white/10 bg-[#0f1320]/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)]'}`}>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Days Remaining</p>
                  <p className="text-2xl font-black text-[#7b61ff] mt-1">{activePlan.stats?.daysRemaining ?? 0}d</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#7b61ff]/10 flex items-center justify-center text-white border border-[#7b61ff]/20">
                  <Clock className="h-5 w-5 text-[#7b61ff]" />
                </div>
              </div>
              <div className={`rounded-2xl border p-4 flex items-center justify-between ${theme === 'light' ? 'border-slate-200 bg-slate-50/50 shadow-sm' : 'border-white/10 bg-[#0f1320]/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)]'}`}>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Current Streak</p>
                  <p className="text-2xl font-black text-[#ff4d7d] mt-1">{activePlan.stats?.streak ?? 0} Days</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#ff4d7d]/10 flex items-center justify-center text-white border border-[#ff4d7d]/20">
                  <Flame className="h-5 w-5 text-[#ff4d7d]" />
                </div>
              </div>
            </div>
          )}

          {/* Active Meal Plan Main Card */}
          {activePlan ? (
            <div className={`${glass} p-6 border-[#10c7a1]/25 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 rounded-bl-xl border-l border-b border-[#10c7a1]/25 bg-[#10c7a1]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#10c7a1]">
                Active Plan
              </div>
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <h3 className={`text-xl font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                    <Apple className="h-5 w-5 text-[#10c7a1]" /> 
                    {activePlan.category === 'Health Issue' ? `${activePlan.conditionOrGoal.join(' & ')} Plan` : activePlan.category === 'Pregnancy' ? `Pregnancy Diet (${activePlan.conditionOrGoal.join(', ')})` : `${activePlan.conditionOrGoal.join(', ')} Plan`}
                  </h3>
                  <p className={`text-xs mt-1 capitalize ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Target Duration: {activePlan.duration} Days · Started {new Date(activePlan.startDate).toLocaleDateString()}</p>
                  
                  {/* Calorie & Protein Targets Summary */}
                  {activePlan.mealPlan && (
                    <div className="mt-3 flex gap-4 text-xs font-semibold">
                      <span className="flex items-center gap-1 text-[#ffb38a]">
                        <Flame className="h-3.5 w-3.5" /> 
                        {activePlan.mealPlan.dailyCalories ?? 1600} kcal/day
                      </span>
                      <span className="flex items-center gap-1 text-[#7df3cc]">
                        <Dumbbell className="h-3.5 w-3.5" /> 
                        Protein: {activePlan.mealPlan.proteinTarget ?? '60g'}
                      </span>
                    </div>
                  )}

                  {/* Dual progress bars */}
                  <div className="mt-5 space-y-4 max-w-md">
                    <div>
                      <div className={`flex justify-between text-xs mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>
                        <span>Dietary Adherence</span>
                        <span className="font-bold text-[#10c7a1]">{activePlan.stats?.adherence ?? 0}%</span>
                      </div>
                      <div className={`h-2 w-full overflow-hidden rounded-full ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-[#10c7a1]/70 to-[#10c7a1]"
                          style={{ width: `${activePlan.stats?.adherence ?? 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className={`flex justify-between text-xs mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}>
                        <span>Timeline Completion</span>
                        <span className="font-bold text-[#7b61ff]">{activePlan.stats?.timelineCompletion ?? 0}%</span>
                      </div>
                      <div className={`h-2 w-full overflow-hidden rounded-full ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-[#7b61ff]/70 to-[#7b61ff]"
                          style={{ width: `${activePlan.stats?.timelineCompletion ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <button onClick={() => setSelectedMealPlan(activePlan)}
                    className={`w-full md:w-auto rounded-xl border px-5 py-3 text-xs font-bold transition text-center ${theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
                    View Diet Details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`py-10 text-center border border-dashed rounded-2xl ${theme === 'light' ? 'border-slate-250 bg-slate-50/50' : 'border-white/15'}`}>
              <Apple className={`h-10 w-10 mx-auto mb-3 ${theme === 'light' ? 'text-slate-300' : 'text-white/20'}`} />
              <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/45'}`}>No active meal plan. Let Gemini build a custom meal plan for you.</p>
              <button onClick={() => { setIsPlanModalOpen(true); setModalStep(1); }}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#10c7a1]/40 bg-[#10c7a1]/10 px-4 py-2 text-xs font-bold text-[#10c7a1] hover:bg-[#10c7a1]/20 transition">
                Create New Plan
              </button>
            </div>
          )}

          {/* Past plans history */}
          {pastPlans.length > 0 && (
            <div className="mt-8">
              <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Past Meal Plans</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {pastPlans.map((plan) => (
                  <div key={plan._id} onClick={() => setSelectedMealPlan(plan)}
                    className={`rounded-xl border p-4 flex justify-between items-center cursor-pointer transition ${theme === 'light' ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-350 shadow-sm' : 'border-white/5 bg-[#0f1320]/40 hover:border-white/15 hover:bg-white/[0.02]'}`}>
                    <div>
                      <p className={`text-sm font-bold ${theme === 'light' ? 'text-slate-750' : 'text-white/80'}`}>
                        {plan.category === 'Health Issue' ? `${plan.conditionOrGoal.join(' & ')} Plan` : plan.category === 'Pregnancy' ? `Pregnancy Diet (${plan.conditionOrGoal.join(', ')})` : `${plan.conditionOrGoal.join(', ')} Plan`}
                      </p>
                      <p className={`text-[10px] mt-1 capitalize ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>{plan.duration} Days · Status: {plan.status} · Adherence: {plan.progress}%</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── CREATE MEAL PLAN MODAL ── */}
        <AnimatePresence>
          {isPlanModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                className={`w-full max-w-xl max-h-[90vh] overflow-y-auto ${glass} p-6 relative`}>
                
                <div className={`flex items-center justify-between mb-5 border-b pb-3 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-[#10c7a1]">
                    <Sparkles className="h-5 w-5" /> AI Personalized Meal Planner
                  </h3>
                  <button onClick={() => { if (!generatingPlan) setIsPlanModalOpen(false); }} className={theme === 'light' ? 'text-slate-450 hover:text-slate-700' : 'text-white/40 hover:text-white'}>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {generatingPlan ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#10c7a1] text-center">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p className="text-sm font-bold animate-pulse">Consulting Gemini AI...</p>
                    <p className={`text-xs mt-2 max-w-[280px] ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Analyzing bio-metrics, calculating BMI, checking safety regulations, and structuring your recipe plan.</p>
                  </div>
                ) : (
                  <form onSubmit={handleCreateMealPlan} className="space-y-5">
                    {/* Step 1: Select Category */}
                    {modalStep === 1 && (
                      <div className="space-y-4">
                        <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white/70'}`}>Step 1: Choose the category for your meal plan</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            { id: 'Health Issue', label: 'Health Issue', icon: HeartPulse, color: '#ff4d7d' },
                            { id: 'Fitness Goal', label: 'Fitness Goal', icon: Dumbbell, color: '#10c7a1' },
                            { id: 'Pregnancy', label: 'Pregnancy', icon: Baby, color: '#7b61ff' }
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <button key={item.id} type="button" onClick={() => { setFormCategory(item.id); setModalStep(2); }}
                                className={`rounded-2xl border p-5 flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] text-center ${
                                  formCategory === item.id 
                                    ? (theme === 'light' ? 'border-slate-350 bg-slate-100/80 text-slate-900 shadow-sm' : 'border-white/20 bg-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)]')
                                    : (theme === 'light' ? 'border-slate-200 bg-slate-50/50 text-slate-650 hover:bg-slate-100 hover:border-slate-300' : 'border-white/5 bg-[#0f1320]/40 text-white/70 hover:border-white/15 hover:bg-white/[0.04]')
                                }`}
                                style={{
                                  boxShadow: formCategory === item.id && theme !== 'light' ? `0 0 25px ${item.color}30` : undefined,
                                  borderColor: formCategory === item.id ? item.color : undefined
                                }}
                              >
                                <div className="rounded-2xl p-4 flex items-center justify-center transition-all duration-300" 
                                  style={{ 
                                    backgroundColor: `${item.color}15`,
                                    border: `1px solid ${item.color}30`
                                  }}>
                                  <Icon className="h-7 w-7" style={{ color: item.color }} />
                                </div>
                                <span className="text-xs font-bold tracking-wide">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Information form */}
                    {modalStep === 2 && (
                      <div className="space-y-4">
                        <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white/70'}`}>Step 2: Enter your physical details & preferences</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Age</label>
                            <input type="number" placeholder="e.g. 28" value={formAge} onChange={e => setFormAge(e.target.value)} required
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 placeholder-slate-400 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white placeholder-white/25 focus:border-[#10c7a1]/55'}`} />
                          </div>
                          <div>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Gender</label>
                            <select value={formGender} onChange={e => setFormGender(e.target.value)}
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white focus:border-[#10c7a1]/55'}`}>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Height (cm)</label>
                            <input type="number" placeholder="e.g. 175" value={formHeightCm} onChange={e => setFormHeightCm(e.target.value)} required
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 placeholder-slate-400 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white placeholder-white/25 focus:border-[#10c7a1]/55'}`} />
                          </div>
                          <div>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Weight (kg)</label>
                            <input type="number" placeholder="e.g. 70" value={formWeight} onChange={e => setFormWeight(e.target.value)} required
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 placeholder-slate-400 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white placeholder-white/25 focus:border-[#10c7a1]/55'}`} />
                          </div>
                          <div>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Activity Level</label>
                            <select value={formActivityLevel} onChange={e => setFormActivityLevel(e.target.value)}
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white focus:border-[#10c7a1]/55'}`}>
                              <option value="Sedentary">Sedentary</option>
                              <option value="Moderate">Moderate Activity</option>
                              <option value="Active">Highly Active</option>
                            </select>
                          </div>
                          <div>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Diet Preference</label>
                            <select value={formDietaryPreference} onChange={e => setFormDietaryPreference(e.target.value)}
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white focus:border-[#10c7a1]/55'}`}>
                              <option value="Vegetarian">Vegetarian</option>
                              <option value="Vegan">Vegan</option>
                              <option value="Eggitarian">Eggitarian</option>
                              <option value="Non-Vegetarian">Non-Vegetarian</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Allergies (Optional)</label>
                          <input type="text" placeholder="e.g. peanuts, dairy, gluten" value={formAllergies} onChange={e => setFormAllergies(e.target.value)}
                            className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 placeholder-slate-400 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white placeholder-white/25 focus:border-[#10c7a1]/55'}`} />
                        </div>

                        {/* Category Specific Fields */}
                        {formCategory === 'Health Issue' && (
                          <div className={`space-y-2 border-t pt-3 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                            <label className={`block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Co-Existing Conditions (Select Multiple)</label>
                            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                              {['Diabetes', 'High Blood Pressure', 'Cholesterol', 'PCOS', 'Thyroid', 'Fatty Liver', 'Digestive Issues', 'Kidney Disease', 'Other'].map(cond => {
                                const selected = formConditions.includes(cond);
                                return (
                                  <button type="button" key={cond}
                                    onClick={() => setFormConditions(prev => prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond])}
                                    className={`text-left rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                      selected 
                                        ? 'border-[#10c7a1] bg-[#10c7a1]/10 text-[#10c7a1]' 
                                        : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-350' : 'border-white/10 bg-white/5 text-white/50')
                                    }`}>
                                    {cond}
                                  </button>
                                );
                              })}
                            </div>
                            {formConditions.includes('Other') && (
                              <input type="text" placeholder="Enter other health conditions..." value={formOtherCondition} onChange={e => setFormOtherCondition(e.target.value)} required
                                className={`w-full rounded-xl border p-3 text-sm outline-none mt-2 ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white focus:border-[#10c7a1]/55'}`} />
                            )}
                          </div>
                        )}

                        {formCategory === 'Fitness Goal' && (
                          <div className={`border-t pt-3 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Primary Fitness Goal</label>
                            <select value={formFitnessGoal} onChange={e => setFormFitnessGoal(e.target.value)}
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white focus:border-[#10c7a1]/55'}`}>
                              <option value="Weight Loss">Weight Loss</option>
                              <option value="Weight Gain">Weight Gain</option>
                              <option value="Muscle Gain">Muscle Gain</option>
                              <option value="Fat Loss">Fat Loss</option>
                              <option value="General Fitness">General Fitness</option>
                            </select>
                          </div>
                        )}

                        {formCategory === 'Pregnancy' && (
                          <div className={`border-t pt-3 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Current Trimester</label>
                            <select value={formTrimester} onChange={e => setFormTrimester(e.target.value)}
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white focus:border-[#10c7a1]/55'}`}>
                              <option value="1">Trimester 1 (Weeks 1 - 12)</option>
                              <option value="2">Trimester 2 (Weeks 13 - 27)</option>
                              <option value="3">Trimester 3 (Weeks 28+)</option>
                            </select>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setModalStep(1)}
                            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800' : 'border-white/10 bg-white/5 text-white/60 hover:text-white'}`}>
                            Back
                          </button>
                          <button type="button" onClick={() => setModalStep(3)}
                            className="flex-1 rounded-xl bg-[#10c7a1] px-4 py-3 text-sm font-bold text-black hover:bg-[#7df3cc] transition">
                            Next
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Duration Selection */}
                    {modalStep === 3 && (
                      <div className="space-y-4">
                        <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-white/70'}`}>Step 3: Select plan duration</p>
                        
                        <div className="grid gap-3 sm:grid-cols-2">
                          {['7', '14', '30', 'custom'].map((dur) => (
                            <button key={dur} type="button" onClick={() => setFormDuration(dur)}
                              className={`rounded-2xl border flex flex-col items-center justify-center p-4 transition text-center hover:scale-[1.02] ${
                                formDuration === dur 
                                  ? 'border-[#10c7a1] bg-[#10c7a1]/10 text-[#10c7a1] font-bold' 
                                  : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-650 hover:bg-slate-100 hover:border-slate-350' : 'border-white/10 bg-white/5 text-white/60')
                              }`}>
                              <span className="text-lg font-bold">
                                {dur === 'custom' ? 'Custom' : `${dur} Days`}
                              </span>
                            </button>
                          ))}
                        </div>

                        {formDuration === 'custom' && (
                          <div>
                            <label className={`mb-1 block text-xs uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>Custom Days Count</label>
                            <input type="number" placeholder="Enter number of days" value={formCustomDuration} onChange={e => setFormCustomDuration(e.target.value)} required
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${theme === 'light' ? 'border-slate-250 bg-white text-slate-900 placeholder-slate-400 focus:border-[#10c7a1]' : 'border-white/10 bg-white/5 text-white placeholder-white/25 focus:border-[#10c7a1]/55'}`} />
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setModalStep(2)}
                            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800' : 'border-white/10 bg-white/5 text-white/60 hover:text-white'}`}>
                            Back
                          </button>
                          <button type="submit"
                            className="flex-1 rounded-xl bg-gradient-to-r from-[#10c7a1] to-[#7b61ff] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-[1.01]">
                            Generate AI Diet Plan
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MEAL PLAN DETAIL DRAWER ── */}
        <AnimatePresence>
          {selectedMealPlan && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
              onClick={e => e.target === e.currentTarget && setSelectedMealPlan(null)}>
              <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                className={`w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto ${glass} rounded-t-3xl sm:rounded-3xl`}>
                
                {/* Header */}
                <div className={`sticky top-0 z-10 flex items-start justify-between p-6 pb-4 backdrop-blur-xl border-b rounded-t-3xl sm:rounded-t-3xl ${theme === 'light' ? 'bg-white/95 border-slate-200 text-slate-900' : 'bg-[#0f1320]/95 border-white/8'}`}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-[#10c7a1] to-[#7b61ff] p-2.5">
                      <Apple className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#10c7a1]">Meal Plan Details</span>
                      <h2 className={`text-lg font-black leading-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {selectedMealPlan.category === 'Health Issue' ? `${selectedMealPlan.conditionOrGoal.join(' & ')} Plan` : selectedMealPlan.category === 'Pregnancy' ? `Pregnancy Diet (${selectedMealPlan.conditionOrGoal.join(', ')})` : `${selectedMealPlan.conditionOrGoal.join(', ')} Plan`}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDeleteMealPlan(selectedMealPlan._id)} disabled={deletingPlanId === selectedMealPlan._id}
                      className="flex items-center gap-1.5 rounded-xl border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 px-3 py-2 text-xs font-semibold text-[#ff4d7d] hover:bg-[#ff4d7d]/15 transition disabled:opacity-50">
                      {deletingPlanId === selectedMealPlan._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                    </button>
                    <button onClick={() => setSelectedMealPlan(null)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-800' : 'border-white/10 bg-white/5 text-white/50 hover:text-white'}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  
                  {/* AI Summary Card */}
                  {selectedMealPlan.mealPlan?.aiSummary && (
                    <div className={`rounded-2xl border p-5 space-y-3 ${theme === 'light' ? 'border-[#7b61ff]/35 bg-[#7b61ff]/5' : 'border-[#7b61ff]/30 bg-[#7b61ff]/5'}`}>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#c084fc] flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> AI Summary & Bio-Metrics
                      </p>
                      <div className={`grid grid-cols-2 gap-2 text-xs leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-white/70'}`}>
                        <div><span className={theme === 'light' ? 'text-slate-450' : 'text-white/40'}>Bio-Metrics:</span> {selectedMealPlan.age}y / {selectedMealPlan.gender} / {selectedMealPlan.heightCm}cm / {selectedMealPlan.weight}kg</div>
                        <div><span className={theme === 'light' ? 'text-slate-450' : 'text-white/40'}>BMI Status:</span> {selectedMealPlan.bmi} ({selectedMealPlan.bmiCategory})</div>
                        <div><span className={theme === 'light' ? 'text-slate-450' : 'text-white/40'}>Activity level:</span> {selectedMealPlan.activityLevel}</div>
                        <div><span className={theme === 'light' ? 'text-slate-450' : 'text-white/40'}>Preferences:</span> {selectedMealPlan.dietaryPreference}</div>
                      </div>
                      <div className={`border-t pt-2 text-xs ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
                        <p className={`font-semibold ${theme === 'light' ? 'text-slate-850' : 'text-white/90'}`}>Designed for: <span className={`font-normal ${theme === 'light' ? 'text-slate-650' : 'text-white/70'}`}>{selectedMealPlan.mealPlan.aiSummary.designedFor}</span></p>
                        <p className={`font-semibold mt-1 ${theme === 'light' ? 'text-slate-850' : 'text-white/90'}`}>Key Focus: <span className={`font-normal ${theme === 'light' ? 'text-slate-650' : 'text-white/70'}`}>{selectedMealPlan.mealPlan.aiSummary.keyFocus?.join(', ')}</span></p>
                      </div>
                    </div>
                  )}

                  {/* Dual progress bars detail */}
                  <div className={`grid grid-cols-2 gap-4 border-b pb-5 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/3'}`}>
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Plan Adherence</span>
                      <p className="text-2xl font-black text-[#10c7a1] mt-1">{selectedMealPlan.stats?.adherence ?? 0}%</p>
                      <div className={`h-1.5 w-full rounded-full overflow-hidden mt-2 ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`}>
                        <div className="h-full bg-[#10c7a1]" style={{ width: `${selectedMealPlan.stats?.adherence ?? 0}%` }} />
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/3'}`}>
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Plan Completion</span>
                      <p className="text-2xl font-black text-[#7b61ff] mt-1">{selectedMealPlan.stats?.timelineCompletion ?? 0}%</p>
                      <div className={`h-1.5 w-full rounded-full overflow-hidden mt-2 ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`}>
                        <div className="h-full bg-[#7b61ff]" style={{ width: `${selectedMealPlan.stats?.timelineCompletion ?? 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Recipes block */}
                  {selectedMealPlan.mealPlan && (
                    <div className="space-y-4">
                      <h3 className={`text-sm font-bold uppercase tracking-widest border-b pb-2 ${theme === 'light' ? 'text-slate-500 border-slate-200' : 'text-white/50 border-white/10'}`}>Daily Meals Menu</h3>
                      
                      <div className="space-y-3">
                        {[
                          { title: 'Breakfast', items: selectedMealPlan.mealPlan.breakfast, icon: Utensils, color: '#ff4d7d' },
                          { title: 'Morning Snack', items: selectedMealPlan.mealPlan.morningSnack, icon: Apple, color: '#ffb38a' },
                          { title: 'Lunch', items: selectedMealPlan.mealPlan.lunch, icon: Utensils, color: '#10c7a1' },
                          { title: 'Evening Snack', items: selectedMealPlan.mealPlan.eveningSnack, icon: Apple, color: '#c8a84b' },
                          { title: 'Dinner', items: selectedMealPlan.mealPlan.dinner, icon: Utensils, color: '#7b61ff' }
                        ].map(meal => {
                          const MealIcon = meal.icon;
                          return (
                            <div key={meal.title} className={`rounded-xl p-4 border ${theme === 'light' ? 'bg-slate-50 border-slate-200/80 shadow-sm' : 'bg-white/5 border-white/5'}`}>
                              <h4 className="text-xs font-bold flex items-center gap-2 mb-2" style={{ color: meal.color }}>
                                <MealIcon className="h-4 w-4" />
                                {meal.title}
                              </h4>
                              <ul className="list-disc pl-4 space-y-1">
                                {meal.items?.map((item, idx) => (
                                  <li key={idx} className={`text-xs leading-normal ${theme === 'light' ? 'text-slate-700' : 'text-white/70'}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-semibold">
                        <div className={`rounded-xl p-3 text-center border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                          <p className={`mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Water Intake Target</p>
                          <p className="text-sm text-[#7df3cc]">{selectedMealPlan.mealPlan.waterIntake ?? '3L'}</p>
                        </div>
                        <div className={`rounded-xl p-3 text-center border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                          <p className={`mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>Calories & Protein</p>
                          <p className="text-sm text-[#ffb38a]">{selectedMealPlan.mealPlan.dailyCalories ?? 1600} kcal / {selectedMealPlan.mealPlan.proteinTarget ?? '65g'}</p>
                        </div>
                      </div>

                      {/* Foods to avoid */}
                      {selectedMealPlan.mealPlan.foodsToAvoid?.length > 0 && (
                        <div className={`rounded-xl border p-4 ${theme === 'light' ? 'border-[#ff4d7d]/30 bg-[#ff4d7d]/5' : 'border border-[#ff4d7d]/15 bg-[#ff4d7d]/5'}`}>
                          <h4 className="text-xs font-bold text-[#ff4d7d] mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4" /> Foods To Avoid
                          </h4>
                          <ul className="list-disc pl-4 space-y-1">
                            {selectedMealPlan.mealPlan.foodsToAvoid.map((item, idx) => (
                              <li key={idx} className={`text-xs ${theme === 'light' ? 'text-[#ff4d7d]/85' : 'text-[#ffb3ca]'}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {selectedMealPlan.mealPlan.recommendations?.length > 0 && (
                        <div className={`rounded-xl border p-4 ${theme === 'light' ? 'bg-[#10c7a1]/5 border-[#10c7a1]/25' : 'bg-[#10c7a1]/5 border-[#10c7a1]/10'}`}>
                          <h4 className="text-xs font-bold text-[#10c7a1] mb-2 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4" /> Health Recommendations
                          </h4>
                          <ul className="list-disc pl-4 space-y-1">
                            {selectedMealPlan.mealPlan.recommendations.map((item, idx) => (
                              <li key={idx} className={`text-xs ${theme === 'light' ? 'text-slate-700' : 'text-white/70'}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Alternative Regeneration Button */}
                  {selectedMealPlan.status === 'active' && (
                    <button type="button" onClick={() => handleRegenerateMealPlan(selectedMealPlan._id)} disabled={regeneratingPlan}
                      className="w-full rounded-xl border border-[#10c7a1]/40 bg-[#10c7a1]/10 px-4 py-3 text-xs font-bold text-[#10c7a1] hover:bg-[#10c7a1]/20 transition flex items-center justify-center gap-2 disabled:opacity-50">
                      {regeneratingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Regenerate Alternative Recipes
                    </button>
                  )}

                  {/* Medical Disclaimer */}
                  <div className={`rounded-xl border p-4 flex items-start gap-3 ${theme === 'light' ? 'border-slate-200 bg-slate-50/85' : 'border border-white/5 bg-[#0f1320]/60'}`}>
                    <Info className={`h-5 w-5 shrink-0 mt-0.5 ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`} />
                    <p className={`text-[10px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>
                      This meal plan is AI-generated for informational purposes only and should not replace professional medical or nutritional advice. Consult a qualified healthcare professional before making significant dietary changes.
                    </p>
                  </div>

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goal Detail Drawer */}
        <AnimatePresence>
          {selectedGoal && (
            <GoalDetailDrawer
              goal={selectedGoal}
              onClose={() => setSelectedGoal(null)}
              onDelete={handleDeleteGoal}
            />
          )}
        </AnimatePresence>

        {/* Domain Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'health', 'finance', 'career'].map(f => {
            const cfg = f === 'all' ? null : DOMAIN_CONFIG[f];
            return (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all border ${
                  activeFilter === f 
                    ? (theme === 'light' ? 'bg-slate-250 border-slate-350 text-slate-800' : 'bg-white/10 border-white/30 text-white') 
                    : (theme === 'light' ? 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'border-transparent text-white/40 hover:text-white hover:bg-white/5')
                }`}
                style={activeFilter === f && cfg ? { borderColor: `${cfg.color}60`, color: cfg.color } : {}}>
                {f === 'all' ? '✦ All' : `${cfg.emoji} ${cfg.label}`}
              </button>
            );
          })}
        </div>

        {/* Goal Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((goal, i) => (
              <motion.div key={goal._id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.05 }}>
                <GoalCard goal={goal} onClick={() => setSelectedGoal(goal)} />
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`col-span-full py-16 text-center border border-dashed rounded-2xl ${theme === 'light' ? 'border-slate-250 bg-slate-50/50' : 'border-white/15'}`}>
              <Target className={`h-12 w-12 mx-auto mb-4 ${theme === 'light' ? 'text-slate-300' : 'text-white/20'}`} />
              <p className={`mb-4 ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>No objectives yet. Start with a template or create your own.</p>
              <button onClick={() => setShowTemplates(true)}
                className="rounded-xl border border-[#7b61ff]/40 bg-[#7b61ff]/10 px-6 py-3 text-sm font-semibold text-[#7b61ff] hover:bg-[#7b61ff]/20 transition">
                Browse Templates
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
