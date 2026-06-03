import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Activity, DollarSign, Briefcase, Calendar, PlusCircle,
  Flame, TrendingUp, AlertTriangle, X, CheckCircle, Loader2,
  Sparkles, Trophy, BarChart2, Link2, Shield, Star, Brain,
  Trash2, ChevronRight, RefreshCw, Zap, Clock, Map,
  ArrowRight, Check, Circle, Lock, Wifi, WifiOff
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const glass      = 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl';
const glassHover = `${glass} transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_28px_70px_rgba(0,0,0,0.55)]`;

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
  const lastSync   = syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt) : null;
  const minAgo     = lastSync ? Math.floor((Date.now() - lastSync) / 60000) : null;
  const hasSources = syncStatus?.sources?.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className={`mb-6 rounded-xl border px-5 py-4 transition-all duration-500 ${
        hasSources
          ? 'border-[#10c7a1]/25 bg-[#10c7a1]/8'
          : 'border-white/8 bg-white/3'
      }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Animated pulse dot */}
          <div className="relative flex-shrink-0">
            <div className={`h-2 w-2 rounded-full ${hasSources ? 'bg-[#10c7a1]' : 'bg-white/20'}`} />
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
              <span className="text-xs font-semibold text-white/40">
                Autonomous sync idle
              </span>
              <span className="text-[10px] text-white/25 border border-white/10 rounded-full px-2.5 py-0.5">
                Scan a meal or receipt in Copilot to activate
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {minAgo !== null && (
            <span className="text-[10px] text-white/25">
              {minAgo === 0 ? 'just now' : `${minAgo}m ago`}
            </span>
          )}
          <button onClick={onRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/40 hover:text-white transition disabled:opacity-40">
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
  const [roadmap, setRoadmap]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const cfg        = DOMAIN_CONFIG[goal.domain] || DOMAIN_CONFIG.health;
  const Icon       = cfg.icon;
  const pct        = Math.min(Math.round((goal.currentMetric / goal.targetMetric) * 100), 100);
  const prediction = getPrediction(goal);
  const isComplete = pct >= 100;
  const daysLeft   = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);

  useEffect(() => {
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
      setLoading(false);
    };
    fetchRoadmap();
  }, [goal._id]);

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
        <div className="sticky top-0 z-10 flex items-start justify-between p-6 pb-4 bg-[#0f1320]/95 backdrop-blur-xl border-b border-white/8 rounded-t-3xl sm:rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5" style={{ backgroundColor: `${cfg.color}18` }}>
              <Icon className="h-5 w-5" style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
              <h2 className="text-lg font-black leading-tight">{goal.title}</h2>
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
                <span className="text-xs text-white/50">Sure?</span>
                <button onClick={handleDelete} disabled={deleting}
                  className="rounded-xl bg-[#ff4d7d] px-3 py-2 text-xs font-bold text-white hover:bg-[#e0355f] transition disabled:opacity-50">
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Yes, delete'}
                </button>
                <button onClick={() => setDeleteConfirm(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 hover:text-white transition">
                  Cancel
                </button>
              </div>
            )}
            <button onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Progress Overview ── */}
          <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}08` }}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-white/50 mb-1">Current Progress</p>
                <p className="text-3xl font-black" style={{ color: cfg.color }}>
                  {goal.currentMetric?.toLocaleString()}
                  <span className="text-base font-semibold text-white/50 ml-1">/ {goal.targetMetric?.toLocaleString()} {goal.unit}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black" style={{ color: cfg.color }}>{pct}%</p>
                <p className="text-xs text-white/40">complete</p>
              </div>
            </div>

            {/* Fat progress bar */}
            <div className="h-4 w-full overflow-hidden rounded-full bg-white/8">
              <motion.div className="h-full rounded-full relative overflow-hidden"
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.4, ease: 'easeOut' }}
                style={{ background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse" />
              </motion.div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-white/40 mb-1">Deadline</p>
                <p className="text-sm font-bold text-white">
                  {daysLeft > 0 ? `${daysLeft}d left` : <span className="text-[#ff4d7d]">Overdue</span>}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-white/40 mb-1">Streak</p>
                <p className="text-sm font-bold text-[#ff4d7d]">
                  {goal.streak > 0 ? `🔥 ${goal.streak}d` : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <p className="text-xs text-white/40 mb-1">Priority</p>
                <p className={`text-sm font-bold ${
                  goal.priority === 'high' ? 'text-[#ff4d7d]' :
                  goal.priority === 'medium' ? 'text-[#c8a84b]' : 'text-white/50'
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
          <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-4 w-4 text-[#10c7a1]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#10c7a1]">Autonomous Tracking Active</p>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Progress updates automatically whenever you scan meals, receipts, or medical reports in the Copilot. No manual input needed — your Digital Twin is always watching.
            </p>
            {goal.lastLoggedAt && (
              <p className="mt-2 text-xs text-white/30">
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
              <h3 className="font-bold text-base">AI-Generated Roadmap</h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#7b61ff]">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm font-semibold animate-pulse">Generating your personal roadmap...</p>
              </div>
            ) : roadmap && (
              <div className="space-y-5">

                {/* Overview */}
                <div className="rounded-xl border border-[#7b61ff]/25 bg-[#7b61ff]/8 p-4">
                  <p className="text-sm text-white/80 leading-relaxed">{roadmap.overview}</p>
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
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Milestone Map</p>
                    <div className="relative">
                      {/* Vertical connector line */}
                      <div className="absolute left-4 top-4 bottom-4 w-px bg-white/10" />
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
                                  ? `border-${cfg.color}/30 bg-white/5`
                                  : 'border-white/8 bg-white/3 opacity-60'
                              }`}>
                              {/* Node */}
                              <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full z-10 ${
                                status === 'done'
                                  ? 'bg-[#10c7a1] text-black'
                                  : status === 'near'
                                  ? 'border-2 border-white/30 bg-white/10'
                                  : 'border border-white/15 bg-[#0f1320]'
                              }`}>
                                {status === 'done'
                                  ? <Check className="h-4 w-4" />
                                  : status === 'near'
                                  ? <Circle className="h-3 w-3 text-white/60" />
                                  : <Lock className="h-3 w-3 text-white/25" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <p className={`text-sm font-bold ${status === 'done' ? 'text-[#10c7a1]' : 'text-white'}`}>
                                    {m.label}
                                  </p>
                                  <span className="text-xs font-bold text-white/50 flex-shrink-0">
                                    {Number(m.target).toLocaleString()} {goal.unit}
                                  </span>
                                </div>
                                <p className="text-xs text-white/50 leading-relaxed">{m.tip}</p>
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
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Daily Actions</p>
                    <div className="space-y-2">
                      {roadmap.dailyActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3">
                          <ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                          <p className="text-sm text-white/75">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {roadmap.risks?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Watch Out For</p>
                    <div className="space-y-2">
                      {roadmap.risks.map((risk, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl border border-[#ff4d7d]/15 bg-[#ff4d7d]/6 px-4 py-3">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#ff4d7d]" />
                          <p className="text-sm text-white/70">{risk}</p>
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
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Recent Auto-Syncs</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...goal.progressLogs].reverse().slice(0, 8).map((log, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className="text-xs text-white/60">{log.note || 'Progress logged'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold" style={{ color: cfg.color }}>+{log.value} {goal.unit}</span>
                      <span className="text-[10px] text-white/30">{new Date(log.loggedAt).toLocaleDateString()}</span>
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
            'border-white/20 text-white/50'
          }`}>{goal.priority}</span>
        </div>
      </div>

      <h3 className="text-base font-bold leading-snug mb-1">{goal.title}</h3>
      <p className="text-xs text-white/40 mb-5">{cfg.label}</p>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Progress</span>
          <span className="font-bold" style={{ color: cfg.color }}>
            {goal.currentMetric?.toLocaleString()} / {goal.targetMetric?.toLocaleString()} {goal.unit}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/8">
          <motion.div className="h-full rounded-full" initial={{ width: 0 }}
            animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ background: `linear-gradient(90deg, ${cfg.color}aa, ${cfg.color})` }} />
        </div>
        <div className="flex justify-between text-xs text-white/40">
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
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-white/40">
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
  const [goals, setGoals]             = useState([]);
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedGoal, setSelectedGoal]  = useState(null);
  const [weeklyDigest, setWeeklyDigest]  = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [activeFilter, setActiveFilter]  = useState('all');
  const [syncStatus, setSyncStatus]      = useState(null);
  const [syncRefreshing, setSyncRefreshing] = useState(false);

  // Form state
  const [domain, setDomain]           = useState('health');
  const [title, setTitle]             = useState('');
  const [targetMetric, setTargetMetric] = useState('');
  const [unit, setUnit]               = useState('');
  const [deadline, setDeadline]       = useState('');
  const [priority, setPriority]       = useState('medium');

  const token = localStorage.getItem('authToken');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

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
    fetchGoals();
    fetchSyncStatus();
    // Poll every 60 seconds for auto-sync updates
    const interval = setInterval(() => fetchSyncStatus(), 60000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen bg-[#05070d] px-5 py-8 text-white sm:px-8 font-sans">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#ff4d7d]/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#10c7a1]/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[#7b61ff]/6 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">

        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#7b61ff]/30 bg-[#7b61ff]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#7b61ff]">
              <Target className="h-3 w-3" /> S.M.A.R.T Goal Engine
            </div>
            <h1 className="text-4xl font-black tracking-tight">Your Objectives</h1>
            <p className="mt-1 text-white/50 text-sm">Fully autonomous — progress updates from your live data streams.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={generateWeeklyDigest} disabled={digestLoading || !goals.length}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40">
              {digestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4 text-[#7b61ff]" />}
              Weekly Digest
            </button>
            <button onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10">
              <Sparkles className="h-4 w-4 text-[#c8a84b]" /> Templates
            </button>
            <button onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-2 rounded-xl bg-[#7b61ff] px-6 py-3 font-bold shadow-[0_0_20px_rgba(123,97,255,0.3)] transition hover:bg-[#6345ed]">
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
                <div className="text-xs text-white/50">{s.label}</div>
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
                <button onClick={() => setWeeklyDigest(null)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-white/80 mb-4">{weeklyDigest.summary}</p>
              <div className="space-y-2 mb-4">
                {weeklyDigest.highlights?.map((h, i) => (
                  <div key={i} className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70">{h}</div>
                ))}
              </div>
              <div className="rounded-xl border border-[#7b61ff]/20 bg-[#7b61ff]/10 p-4 text-sm text-white/90">
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
                    <span className="text-sm text-white/80">{ins.message}</span>
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
                <button onClick={() => setIsFormOpen(false)} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCreateGoal} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Domain</label>
                  <select value={domain} onChange={e => setDomain(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none">
                    <option value="health">🏃 Health & Wellness</option>
                    <option value="finance">💰 Wealth & Finance</option>
                    <option value="career">💻 Career & Learning</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Goal Title</label>
                  <input type="text" placeholder="e.g., Save for house downpayment" value={title} onChange={e => setTitle(e.target.value)} required
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-[#7b61ff] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Target Number</label>
                  <input type="number" placeholder="e.g., 10000" value={targetMetric} onChange={e => setTargetMetric(e.target.value)} required
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-[#7b61ff] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Unit</label>
                  <input type="text" placeholder="e.g., ₹, kg, chapters" value={unit} onChange={e => setUnit(e.target.value)} required
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-[#7b61ff] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Target Deadline</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none">
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
                  <button onClick={() => setShowTemplates(false)} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {GOAL_TEMPLATES.map((tpl, i) => {
                    const cfg = DOMAIN_CONFIG[tpl.domain];
                    return (
                      <button key={i} onClick={() => applyTemplate(tpl)}
                        className="text-left rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]">
                        <div className="text-2xl mb-2">{tpl.emoji}</div>
                        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: cfg.color }}>{cfg.label}</div>
                        <div className="text-sm font-semibold text-white">{tpl.title}</div>
                        <div className="mt-2 text-xs text-white/40">Target: {tpl.targetMetric.toLocaleString()} {tpl.unit}</div>
                      </button>
                    );
                  })}
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
                  activeFilter === f ? 'bg-white/10 border-white/30 text-white' : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'
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
              className="col-span-full py-16 text-center border border-dashed border-white/15 rounded-2xl">
              <Target className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 mb-4">No objectives yet. Start with a template or create your own.</p>
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
