import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useGamification } from '../context/GamificationContext';
import {
  disconnectCareerIntegration,
  fetchCareerIntegrations,
  saveCareerIntegrations,
} from '../features/careerIntegrations/careerIntegrationSlice';
import {
  Code2, TrendingUp, AlertTriangle, Zap, Target, Activity,
  ChevronDown, ChevronUp, Sparkles, RefreshCw, Award,
  CheckCircle, Loader2, X, Plus, Link, ExternalLink,
  Briefcase, Palette, Terminal, BookOpen, BarChart2,
  Users, Star, GitCommit, Trophy, Hash, Pencil,
} from 'lucide-react';
import { fetchCareerIntegrationStats, getCareerProfileLabel } from '../utils/careerIntegrationStats';

// ─── Design tokens ────────────────────────────────────────────────────────────
const card  = 'rounded-2xl border border-white/10 bg-[#11131a]/84 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl';
const iCard = `${card} transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#7b61ff]/30 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)]`;

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const token = () => localStorage.getItem('authToken');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─── Domain configuration ─────────────────────────────────────────────────────
const DOMAINS = {
  coding: {
    label:    'Software & Coding',
    emoji:    '💻',
    color:    '#7b61ff',
    desc:     'Track competitive programming, open source contributions, and coding consistency.',
    platforms: [
      {
        id:          'github',
        name:        'GitHub',
        color:       '#c084fc',
        icon:        GithubIcon,
        placeholder: 'your-username',
        endpoint:    (u) => `/api/integrations/github/${u}`,
        statsMap:    (d) => [
          { label: 'Public Repos',  value: d.publicRepos   ?? d.public_repos   ?? '—', icon: BookOpen },
          { label: 'Followers',     value: d.followers                          ?? '—', icon: Users   },
          { label: 'Total Stars',   value: d.totalStars    ?? d.public_gists    ?? '—', icon: Star    },
          { label: 'Recent Commits',value: d.recentActivityCount ?? d.contributions ?? '—', icon: GitCommit },
        ],
        profileUrl: (u) => `https://github.com/${u}`,
      },
      {
        id:          'leetcode',
        name:        'LeetCode',
        color:       '#10c7a1',
        icon:        Code2,
        placeholder: 'your-username',
        endpoint:    (u) => `/api/integrations/leetcode/${u}`,
        statsMap:    (d) => [
          { label: 'Total Solved', value: d.totalSolved   ?? '—', icon: CheckCircle },
          { label: 'Easy',         value: d.easySolved    ?? '—', icon: Hash        },
          { label: 'Medium',       value: d.mediumSolved  ?? '—', icon: Hash        },
          { label: 'Hard',         value: d.hardSolved    ?? '—', icon: Trophy      },
        ],
        profileUrl: (u) => `https://leetcode.com/${u}`,
      },
      {
        id:          'hackerrank',
        name:        'HackerRank',
        color:       '#10c7a1',
        icon:        Terminal,
        placeholder: 'your-username',
        endpoint:    (u) => `/api/integrations/hackerrank/${u}`,
        statsMap:    (d) => [
          { label: 'Badges',        value: d.badges        ?? d.badgesCount  ?? '—', icon: Award      },
          { label: 'Certificates',  value: d.certificates  ?? '—',                   icon: BookOpen   },
          { label: 'Points',        value: d.points        ?? '—',                   icon: Star       },
          { label: 'Rank',          value: d.rank          ?? '—',                   icon: TrendingUp },
        ],
        profileUrl: (u) => `https://www.hackerrank.com/${u}`,
      },
      {
        id:          'codeforces',
        name:        'Codeforces',
        color:       '#fbbf24',
        icon:        Hash,
        placeholder: 'your-handle',
        endpoint:    (u) => `/api/integrations/codeforces/${u}`,
        statsMap:    (d) => [
          { label: 'Rating',        value: d.rating        ?? '—', icon: TrendingUp },
          { label: 'Max Rating',    value: d.maxRating     ?? '—', icon: Star       },
          { label: 'Rank',          value: d.rank          ?? '—', icon: Trophy     },
          { label: 'Contribution',  value: d.contribution  ?? '—', icon: GitCommit  },
        ],
        profileUrl: (u) => `https://codeforces.com/profile/${u}`,
      },
    ],
  },

  business: {
    label:    'Business & MBA',
    emoji:    '📊',
    color:    '#10c7a1',
    desc:     'Track your professional network, thought leadership, and business credentials.',
    platforms: [
      {
        id:          'linkedin',
        name:        'LinkedIn',
        color:       '#7b61ff',
        icon:        Briefcase,
        placeholder: 'https://linkedin.com/in/your-name',
        endpoint:    null, // uses POST /api/integrations/linkedin
        isPost:      true,
        statsMap:    (d) => [
          { label: 'Profile Strength', value: d.profileStrength ? `${d.profileStrength}%` : '—', icon: TrendingUp },
          { label: 'Connections',      value: d.connections     ?? '—',                            icon: Users     },
          { label: 'Followers',        value: d.followers       ?? '—',                            icon: Star      },
          { label: 'Current Role',     value: d.currentRole     ?? '—',                            icon: Briefcase },
        ],
        profileUrl: (u) => u,
      },
      {
        id:          'scholar',
        name:        'Google Scholar',
        color:       '#4285f4',
        icon:        BookOpen,
        placeholder: 'Your Scholar profile URL',
        endpoint:    null,
        comingSoon:  true,
        statsMap:    () => [],
        profileUrl:  (u) => u,
      },
      {
        id:          'crunchbase',
        name:        'Crunchbase',
        color:       '#10c7a1',
        icon:        BarChart2,
        placeholder: 'Your Crunchbase profile URL',
        endpoint:    null,
        comingSoon:  true,
        statsMap:    () => [],
        profileUrl:  (u) => u,
      },
    ],
  },

  creative: {
    label:    'Creative & Design',
    emoji:    '🎨',
    color:    '#ff4d7d',
    desc:     'Track your portfolio, follower growth, and creative output across platforms.',
    platforms: [
      {
        id:          'behance',
        name:        'Behance',
        color:       '#1769ff',
        icon:        Palette,
        placeholder: 'your-username',
        endpoint:    null,
        comingSoon:  true,
        statsMap:    () => [],
        profileUrl:  (u) => `https://www.behance.net/${u}`,
      },
      {
        id:          'dribbble',
        name:        'Dribbble',
        color:       '#ff4d7d',
        icon:        Palette,
        placeholder: 'your-username',
        endpoint:    null,
        comingSoon:  true,
        statsMap:    () => [],
        profileUrl:  (u) => `https://dribbble.com/${u}`,
      },
      {
        id:          'youtube',
        name:        'YouTube',
        color:       '#ff0000',
        icon:        BarChart2,
        placeholder: '@your-channel',
        endpoint:    null,
        comingSoon:  true,
        statsMap:    () => [],
        profileUrl:  (u) => `https://youtube.com/${u}`,
      },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function seededRng(seed, offset) {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
}

function buildNeutralHeatmap(days = 365) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - ((days - 1) - i));
    return {
      key: d.toISOString().slice(0, 10),
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      count: 0,
    };
  });
}

function getHeatmapWeeks(cells = []) {
  return Math.max(1, Math.ceil(cells.length / 7));
}

function buildHeatmapMonthLabels(cells = []) {
  const seen = new Set();
  return cells.reduce((labels, cell, index) => {
    const date = new Date(`${cell.key}T00:00:00`);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (seen.has(monthKey)) return labels;

    seen.add(monthKey);
    labels.push({
      key: monthKey,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      column: Math.floor(index / 7) + 1,
    });
    return labels;
  }, []);
}

function buildHeatmapFromDateCounts(counts = {}, days = 365) {
  return buildNeutralHeatmap(days).map((cell) => ({
    ...cell,
    count: Number(counts[cell.key] || 0),
  }));
}

function leetcodeCalendarToDateCounts(calendar = {}) {
  return Object.entries(calendar).reduce((acc, [timestamp, count]) => {
    const date = new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);
    acc[date] = (acc[date] || 0) + Number(count || 0);
    return acc;
  }, {});
}

function githubEventsToDateCounts(events = []) {
  return events.reduce((acc, event) => {
    const date = new Date(event.created_at).toISOString().slice(0, 10);
    const commitCount = event.type === 'PushEvent' ? event.payload?.commits?.length || 1 : 1;
    acc[date] = (acc[date] || 0) + commitCount;
    return acc;
  }, {});
}

function mergeDateCounts(...countMaps) {
  return countMaps.reduce((merged, counts = {}) => {
    Object.entries(counts).forEach(([date, count]) => {
      merged[date] = (merged[date] || 0) + Number(count || 0);
    });
    return merged;
  }, {});
}

function buildRecentDateKeys(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - ((days - 1) - i));
    return d.toISOString().slice(0, 10);
  });
}

function calculateDynamicCareerMetrics(activityCounts = {}, hasCodingIntegration, linkedinConnected) {
  if (!hasCodingIntegration) {
    return {
      codingConsistency: null,
      codingStatus: null,
      careerMomentum: null,
      momentumStatus: null,
    };
  }

  const last90 = buildRecentDateKeys(90);
  const activeDays = last90.filter((date) => Number(activityCounts[date] || 0) > 0).length;
  const codingConsistency = clamp(Math.round((activeDays / 90) * 100), 0, 100);

  const last60 = buildRecentDateKeys(60);
  const previous30 = last60.slice(0, 30).reduce((sum, date) => sum + Number(activityCounts[date] || 0), 0);
  const current30 = last60.slice(30).reduce((sum, date) => sum + Number(activityCounts[date] || 0), 0);
  const growthPct = previous30 > 0
    ? ((current30 - previous30) / previous30) * 100
    : current30 > 0 ? 50 : -40;
  const careerMomentum = clamp(Math.round(50 + (growthPct / 2) + (linkedinConnected ? 5 : 0)), 0, 100);

  return {
    codingConsistency,
    codingStatus: getConsistencyStatus(codingConsistency),
    careerMomentum,
    momentumStatus: getMomentumStatus(careerMomentum),
  };
}

function getConsistencyStatus(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Consistent';
  if (score >= 60) return 'Improving';
  return 'Inconsistent';
}

function getMomentumStatus(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Growing';
  if (score >= 40) return 'Stable';
  return 'Needs Attention';
}

function calculateProfessionalGrowthScore({ githubStats, leetcodeStats, linkedinConnected }) {
  const hasSignal = Boolean(githubStats || leetcodeStats || linkedinConnected);
  if (!hasSignal) {
    return { score: null, status: null };
  }

  const githubScore = githubStats
    ? (Math.min(Number(githubStats.repositories || 0), 50) / 50) * 15
      + (Math.min(Number(githubStats.followers || 0), 100) / 100) * 15
      + (Math.min(Number(githubStats.stars || 0), 100) / 100) * 10
    : 0;

  const leetcodeScore = leetcodeStats
    ? (Math.min(Number(leetcodeStats.solved || 0), 1000) / 1000) * 20
      + (Math.min(Number(leetcodeStats.contestRating || 0), 2500) / 2500) * 10
      + (Math.min(Number(leetcodeStats.contests || 0), 50) / 50) * 10
    : 0;

  const linkedinScore = linkedinConnected ? 20 : 0;
  const score = clamp(Math.round(githubScore + leetcodeScore + linkedinScore), 0, 100);

  return {
    score,
    status: getProfessionalGrowthStatus(score),
  };
}

function getProfessionalGrowthStatus(score) {
  if (score >= 90) return 'All-Star';
  if (score >= 75) return 'Advanced';
  if (score >= 60) return 'Growing Fast';
  if (score >= 40) return 'Growing';
  if (score >= 20) return 'Early Stage';
  return 'Getting Started';
}

function getHeatmapColor(count) {
  if (count <= 0) return 'rgba(255,255,255,0.05)';
  if (count <= 2) return 'rgba(123,97,255,0.25)';
  if (count <= 5) return 'rgba(123,97,255,0.60)';
  return 'rgba(123,97,255,1)';
}

function extractGithubUsernameFromUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`);
    return url.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function extractLeetcodeUsernameFromUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://leetcode.com/u/${trimmed}`);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[0] === 'u' ? parts[1] || '' : parts[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

async function fetchLeetcodeActivityCounts(profileUrl) {
  const username = extractLeetcodeUsernameFromUrl(profileUrl);
  if (!username) return {};

  const response = await axios.get(`${API}/api/career-integrations/leetcode-activity`, {
    params: { username },
    headers: { Authorization: `Bearer ${token()}` },
  });

  return leetcodeCalendarToDateCounts(response.data?.data?.calendar || {});
}

async function fetchGithubActivityCounts(profileUrl) {
  const username = extractGithubUsernameFromUrl(profileUrl);
  if (!username) return {};

  const responses = await Promise.allSettled([1, 2, 3].map((page) => (
    axios.get(`https://api.github.com/users/${encodeURIComponent(username)}/events/public`, {
      params: { per_page: 100, page },
      timeout: 8000,
    })
  )));
  const events = responses.flatMap((result) => (
    result.status === 'fulfilled' && Array.isArray(result.value.data) ? result.value.data : []
  ));

  return githubEventsToDateCounts(events);
}

function buildBurnoutForecast(burnoutRisk, studyHours, sleepHours) {
  const today = new Date();
  const base  = burnoutRisk ?? 45;
  const sleepPenalty  = Math.max(0, 7 - (sleepHours || 7)) * 3;
  const studyPressure = Math.max(0, (studyHours || 4) - 5) * 2.5;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    const drift = i * (sleepPenalty + studyPressure) * 0.4;
    const noise = (seededRng(parseInt(d.toISOString().slice(0, 10).replace(/-/g, ''), 10), 13) - 0.5) * 6;
    return { label, risk: clamp(Math.round(base + drift + noise), 10, 96) };
  });
}

function buildCrossInsights(profile, analytics) {
  const insights = [];
  const studyH  = profile?.studyHours  || 4;
  const sleepH  = profile?.sleepHours  || 7;
  const burnout = analytics?.burnoutRisk ?? 50;
  const prod    = analytics?.productivityScore ?? 60;
  const fin     = analytics?.financialHealth ?? 60;
  if (sleepH < 6 && studyH > 7) insights.push({ icon: '🔥', severity: 'critical', color: '#f87171', title: 'Sleep Debt × Study Overload', body: `${studyH}h study on ${sleepH}h sleep creates compounding cognitive debt. Problem-solving speed drops 22% per night of sub-6h sleep.`, action: 'Cap study at 6h and protect sleep above everything else this week.' });
  if (burnout > 65 && prod < 60) insights.push({ icon: '⚠️', severity: 'warning', color: '#fbbf24', title: 'Burnout Risk × Productivity Gap', body: `Burnout at ${burnout}% with productivity at ${prod}/100 — you're working hard but outputting less.`, action: 'One full rest day recovers more output than pushing through.' });
  if (fin < 50 && studyH > 6)    insights.push({ icon: '💸', severity: 'warning', color: '#fbbf24', title: 'Financial Pressure × Study Hours', body: `Financial stress combined with heavy study load kills focus. Anxiety occupies the same working memory you need for deep work.`, action: 'Resolve one pending financial task this week to free cognitive bandwidth.' });
  if (burnout < 40 && prod > 70) insights.push({ icon: '🚀', severity: 'positive', color: '#4ade80', title: 'Recovery × Performance Alignment', body: `Burnout at ${burnout}% and productivity at ${prod}/100. This is your window — take on the hardest challenge you've been avoiding.`, action: 'This is your peak window — tackle the highest-difficulty item on your roadmap.' });
  if (!insights.length) insights.push({ icon: '📡', severity: 'neutral', color: '#94a3b8', title: 'Signals Stable', body: 'Career, health, and finance signals are in balance. No critical cross-domain friction detected.', action: 'Maintain current rhythm and keep logging to improve prediction accuracy.' });
  return insights;
}

// ─── Platform Integration Card ────────────────────────────────────────────────
function PlatformCard({ platform, domainColor }) {
  const STORAGE_KEY = `integration_${platform.id}`;

  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [connected, setConnected] = useState(false);
  const [data,      setData]      = useState(null);
  const [expanded,  setExpanded]  = useState(false);

  // Persist connections across refreshes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { username, profileData } = JSON.parse(saved);
        setInput(username);
        setData(profileData);
        setConnected(true);
      }
    } catch { /* ignore */ }
  }, []);

  const handleConnect = async () => {
    if (!input.trim()) return;
    setLoading(true); setError('');
    try {
      let profileData;

      if (platform.comingSoon) {
        // Coming soon — simulate only, no DB write
        await new Promise(r => setTimeout(r, 800));
        profileData = { comingSoon: true };
      } else {
        // All real platforms go through POST /api/integrations/connect
        // This saves username + fetched stats to OnboardingProfile in DB
        const res = await axios.post(
          `${API}/api/integrations/connect`,
          { integration: platform.id, username: input.trim() },
          { headers: { Authorization: `Bearer ${token()}` } }
        );
        profileData = res.data.data?.data || res.data.data || {};
      }

      setData(profileData);
      setConnected(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ username: input.trim(), profileData }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch profile. Check the username and try again.');
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setConnected(false); setData(null); setInput(''); setError('');
    localStorage.removeItem(STORAGE_KEY);
    if (!platform.comingSoon) {
      try {
        await axios.post(
          `${API}/api/integrations/disconnect`,
          { integration: platform.id },
          { headers: { Authorization: `Bearer ${token()}` } }
        );
      } catch { /* silent */ }
    }
  };

  const PIcon = platform.icon;
  const stats = connected && data && !data.comingSoon ? platform.statsMap(data) : [];

  return (
    <div className={`rounded-2xl border transition-all duration-300 ${
      connected
        ? 'border-white/15 bg-white/4'
        : 'border-white/8 bg-white/2'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => connected && setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${platform.color}18`, color: platform.color }}>
            <PIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white/90">{platform.name}</p>
              {platform.comingSoon && (
                <span className="text-[9px] font-bold uppercase tracking-widest border border-white/15 text-white/30 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
              {connected && !data?.comingSoon && (
                <span className="text-[9px] font-bold uppercase tracking-widest border px-1.5 py-0.5 rounded-full"
                  style={{ borderColor: `${platform.color}50`, color: platform.color }}>
                  Live
                </span>
              )}
            </div>
            {connected && input && (
              <p className="text-[11px] text-white/35 mt-0.5">@{input}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <button onClick={e => { e.stopPropagation(); handleDisconnect(); }}
              className="text-white/25 hover:text-[#ff4d7d] transition-colors p-1">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {connected && <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
        </div>
      </div>

      {/* Input row (when not connected) */}
      {!connected && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder={platform.comingSoon ? 'Coming soon' : platform.placeholder}
              disabled={loading || platform.comingSoon}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:border-white/25 focus:outline-none disabled:opacity-40"
            />
            <button
              onClick={handleConnect}
              disabled={loading || !input.trim() || platform.comingSoon}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-40"
              style={{ backgroundColor: `${platform.color}20`, color: platform.color, border: `1px solid ${platform.color}30` }}>
              {loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Plus className="h-3.5 w-3.5" />}
              {loading ? 'Fetching' : 'Connect'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-[#ff4d7d]">{error}</p>
          )}
        </div>
      )}

      {/* Stats (when connected and expanded) */}
      {connected && expanded && data && !data.comingSoon && (
        <div className="px-4 pb-4 space-y-3">
          {/* Stats grid */}
          {stats.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {stats.map((stat, i) => (
                <div key={i} className="rounded-xl bg-white/5 border border-white/8 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className="h-3 w-3 text-white/30" />
                    <p className="text-[10px] text-white/35 uppercase tracking-wider">{stat.label}</p>
                  </div>
                  <p className="text-base font-bold" style={{ color: platform.color }}>
                    {stat.value?.toLocaleString?.() ?? stat.value ?? '—'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Profile link */}
          {platform.profileUrl && input && !platform.isPost && (
            <a href={platform.profileUrl(input)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors">
              <ExternalLink className="h-3 w-3" /> View public profile
            </a>
          )}
        </div>
      )}

      {/* Connected summary (collapsed) */}
      {connected && !expanded && stats.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex gap-4">
            {stats.slice(0, 3).map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-sm font-bold" style={{ color: platform.color }}>
                  {stat.value?.toLocaleString?.() ?? stat.value ?? '—'}
                </p>
                <p className="text-[10px] text-white/30">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Domain Selector ──────────────────────────────────────────────────────────
function DomainSelector({ current, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.entries(DOMAINS).map(([key, dom]) => (
        <button key={key} onClick={() => onChange(key)}
          className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
            current === key
              ? 'bg-white/8 scale-[1.01]'
              : 'border-white/8 bg-white/2 hover:bg-white/5'
          }`}
          style={current === key ? { borderColor: `${dom.color}50` } : {}}>
          <div className="text-2xl mb-2">{dom.emoji}</div>
          <p className="text-sm font-bold text-white/90">{dom.label}</p>
          <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{dom.desc}</p>
          {current === key && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: dom.color }}>
              <CheckCircle className="h-3 w-3" /> Active
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Compact Heatmap ──────────────────────────────────────────────────────────
function CompactHeatmap({ careerIntegrations }) {
  const leetcodeUrl = careerIntegrations.leetcode?.profileUrl || '';
  const githubUrl = careerIntegrations.github?.profileUrl || '';
  const source = leetcodeUrl ? 'leetcode' : githubUrl ? 'github' : 'none';
  const [heatmap, setHeatmap] = useState(() => buildNeutralHeatmap());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = source === 'leetcode'
    ? 'LeetCode Activity - Last 365 Days'
    : source === 'github'
      ? 'GitHub Activity - Last 365 Days'
      : 'Coding Activity Calendar';

  const subtitle = source === 'none'
    ? 'Connect GitHub or LeetCode to view your coding activity.'
    : '';

  const loadActivity = async () => {
    setError('');

    if (source === 'none') {
      setHeatmap(buildNeutralHeatmap());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (source === 'leetcode') {
        const username = extractLeetcodeUsernameFromUrl(leetcodeUrl);
        const response = await axios.get(`${API}/api/career-integrations/leetcode-activity`, {
          params: { username },
          headers: { Authorization: `Bearer ${token()}` },
        });
        const counts = leetcodeCalendarToDateCounts(response.data?.data?.calendar || {});
        setHeatmap(buildHeatmapFromDateCounts(counts));
      } else {
        const username = extractGithubUsernameFromUrl(githubUrl);
        const responses = await Promise.allSettled([1, 2, 3].map((page) => (
          axios.get(`https://api.github.com/users/${encodeURIComponent(username)}/events/public`, {
            params: { per_page: 100, page },
            timeout: 8000,
          })
        )));
        const events = responses.flatMap((result) => (
          result.status === 'fulfilled' && Array.isArray(result.value.data) ? result.value.data : []
        ));
        setHeatmap(buildHeatmapFromDateCounts(githubEventsToDateCounts(events)));
      }
    } catch (err) {
      setError('Unable to load activity data.');
      setHeatmap(buildNeutralHeatmap());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [source, leetcodeUrl, githubUrl]);

  const visibleHeatmap = loading ? buildNeutralHeatmap() : heatmap;
  const weekCount = getHeatmapWeeks(visibleHeatmap);
  const gridColumns = `repeat(${weekCount}, minmax(10px, 1fr))`;
  const monthLabels = buildHeatmapMonthLabels(visibleHeatmap);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/30">
            {title}
          </p>
          {source === 'none' && (
            <p className="mt-1 text-[10px] text-white/25">No Coding Activity Connected</p>
          )}
        </div>
        {source !== 'none' && !error && (
          <span className="text-[10px] font-bold text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20 px-2 py-0.5 rounded-full">
            {source === 'leetcode' ? 'LeetCode Live' : 'GitHub Live'}
          </span>
        )}
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-full" style={{ minWidth: `${weekCount * 13}px` }}>
          <div className="mb-1 grid gap-[3px]" style={{ gridTemplateColumns: gridColumns }}>
            {monthLabels.map((month) => (
              <span key={month.key}
                className="truncate text-[9px] font-semibold text-white/24"
                style={{ gridColumn: `${month.column} / span 4` }}>
                {month.label}
              </span>
            ))}
          </div>
          <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateColumns: gridColumns, gridTemplateRows: 'repeat(7, 12px)' }}>
            {visibleHeatmap.map((cell, i) => (
              <div key={i} title={`${cell.date}: ${cell.count} activit${cell.count === 1 ? 'y' : 'ies'}`}
                className={`h-2.5 w-2.5 shrink-0 cursor-pointer rounded-[2px] transition-transform hover:scale-110 sm:h-3 sm:w-3 ${loading ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: loading ? 'rgba(255,255,255,0.08)' : getHeatmapColor(cell.count),
                }} />
            ))}
          </div>
        </div>
      </div>
      {loading && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/25">Loading Activity...</p>
      )}
      {!loading && source === 'none' && (
        <p className="mt-2 text-[10px] text-white/25">{subtitle}</p>
      )}
      {!loading && error && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[10px] text-[#ff8fbd]">{error}</p>
          <button type="button" onClick={loadActivity}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/50 hover:bg-white/10 hover:text-white">
            Retry
          </button>
        </div>
      )}
      <div className="flex items-center gap-1.5 justify-end mt-2">
        <span className="text-[9px] text-white/20">Less</span>
        {[0.05, 0.25, 0.5, 0.75, 1].map((o, i) => (
          <div key={i} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: `rgba(123,97,255,${o})` }} />
        ))}
        <span className="text-[9px] text-white/20">More</span>
      </div>
    </div>
  );
}

function CareerLinkCard({ provider, label, icon: Icon, placeholder, integration, saving, onSave, onDisconnect }) {
  const [input, setInput] = useState(integration.profileUrl || '');
  const [editing, setEditing] = useState(!integration.connected);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    setInput(integration.profileUrl || '');
    setEditing(!integration.connected);
  }, [integration.profileUrl]);

  const connected = Boolean(integration.connected);
  const hasChanged = input.trim() !== (integration.profileUrl || '').trim();
  const showEditor = editing || !connected;
  const showSave = showEditor && (!connected || hasChanged);

  useEffect(() => {
    if (!connected || !['github', 'leetcode'].includes(provider)) {
      setStats(null);
      return;
    }

    let cancelled = false;
    setStatsLoading(true);
    fetchCareerIntegrationStats(provider, integration.profileUrl)
      .then((nextStats) => {
        if (!cancelled) setStats(nextStats);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => { cancelled = true; };
  }, [connected, integration.profileUrl, provider]);

  const handleSave = async () => {
    await onSave({ [provider]: input });
    setEditing(false);
  };

  return (
    <div className={`rounded-2xl border p-4 transition-all ${connected ? 'border-[#10c7a1]/25 bg-[#10c7a1]/5' : 'border-white/8 bg-white/2'}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-[#c084fc]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white/90">{label}</p>
            <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-widest ${connected ? 'text-[#10c7a1]' : 'text-white/30'}`}>
              {connected ? `${label} Connected` : 'Not connected'}
            </p>
          </div>
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white/50 transition hover:bg-white/10 hover:text-white">
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button type="button" onClick={() => onDisconnect(provider)} disabled={saving}
              className="rounded-lg border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 px-2.5 py-1.5 text-[10px] font-bold text-[#ff4d7d] transition hover:bg-[#ff4d7d]/15 disabled:opacity-50">
              Disconnect
            </button>
          </div>
        )}
      </div>

      {connected && provider === 'github' && (
        <CareerStatsChips
          loading={statsLoading}
          items={[
            [stats?.repositories, 'Repos'],
            [stats?.followers, 'Followers'],
            [stats?.stars, 'Stars'],
          ]}
        />
      )}

      {connected && provider === 'leetcode' && (
        <CareerStatsChips
          loading={statsLoading}
          items={[
            [stats?.solved, 'Solved Questions'],
            [stats?.contestRating, 'Rating'],
            [stats?.contests, 'Contests Given'],
            [stats?.rank, 'Rank'],
          ]}
        />
      )}

      {connected && integration.profileUrl && (
        <a href={integration.profileUrl} target="_blank" rel="noreferrer"
          className="mb-3 flex items-center gap-2 truncate rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-[#7df3cc]/80 hover:text-[#7df3cc]">
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{getCareerProfileLabel(provider, integration.profileUrl)}</span>
        </a>
      )}

      {showEditor && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && showSave && handleSave()}
            placeholder={placeholder}
            className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#7b61ff]/45"
          />
          {showSave && (
            <button type="button" onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#7b61ff]/35 bg-[#7b61ff]/15 px-3 text-xs font-bold text-[#c084fc] transition hover:bg-[#7b61ff]/22 disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CareerStatsChips({ loading, items }) {
  if (loading) {
    return (
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/40">
          <Loader2 className="h-3 w-3 animate-spin" />
          Fetching profile
        </span>
      </div>
    );
  }

  const visible = items.filter(([value]) => value !== undefined && value !== null && value !== '');
  if (!visible.length) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {visible.map(([value, label]) => (
        <span key={label} className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-bold text-white/62">
          {typeof value === 'number' ? value.toLocaleString() : value} {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Career() {
  const dispatch = useDispatch();
  const careerIntegrations = useSelector((state) => state.careerIntegrations);
  const [mounted, setMounted]               = useState(false);
  const [dashProfile, setDashProfile]       = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [debriefText, setDebriefText]       = useState(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefError, setDebriefError]     = useState('');
  const [careerActivityCounts, setCareerActivityCounts] = useState({});
  const [professionalGrowthStats, setProfessionalGrowthStats] = useState({
    github: null,
    leetcode: null,
  });
  const [activeDomain, setActiveDomain]     = useState(
    () => localStorage.getItem('career_domain') || 'coding'
  );

  useEffect(() => {
    setMounted(true);
    fetchDashProfile();
    dispatch(fetchCareerIntegrations());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCareerActivityCounts = async () => {
      const leetcodeUrl = careerIntegrations.leetcode?.profileUrl || '';
      const githubUrl = careerIntegrations.github?.profileUrl || '';

      if (!leetcodeUrl && !githubUrl) {
        setCareerActivityCounts({});
        return;
      }

      try {
        const [leetcodeResult, githubResult] = await Promise.allSettled([
          leetcodeUrl ? fetchLeetcodeActivityCounts(leetcodeUrl) : Promise.resolve({}),
          githubUrl ? fetchGithubActivityCounts(githubUrl) : Promise.resolve({}),
        ]);

        if (cancelled) return;

        setCareerActivityCounts(mergeDateCounts(
          leetcodeResult.status === 'fulfilled' ? leetcodeResult.value : {},
          githubResult.status === 'fulfilled' ? githubResult.value : {},
        ));
      } catch {
        if (!cancelled) setCareerActivityCounts({});
      }
    };

    loadCareerActivityCounts();

    return () => { cancelled = true; };
  }, [
    careerIntegrations.github?.profileUrl,
    careerIntegrations.leetcode?.profileUrl,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadProfessionalGrowthStats = async () => {
      const githubUrl = careerIntegrations.github?.profileUrl || '';
      const leetcodeUrl = careerIntegrations.leetcode?.profileUrl || '';

      if (!githubUrl && !leetcodeUrl) {
        setProfessionalGrowthStats({ github: null, leetcode: null });
        return;
      }

      const [githubResult, leetcodeResult] = await Promise.allSettled([
        githubUrl ? fetchCareerIntegrationStats('github', githubUrl) : Promise.resolve(null),
        leetcodeUrl ? fetchCareerIntegrationStats('leetcode', leetcodeUrl) : Promise.resolve(null),
      ]);

      if (cancelled) return;

      setProfessionalGrowthStats({
        github: githubResult.status === 'fulfilled' ? githubResult.value : null,
        leetcode: leetcodeResult.status === 'fulfilled' ? leetcodeResult.value : null,
      });
    };

    loadProfessionalGrowthStats();

    return () => { cancelled = true; };
  }, [
    careerIntegrations.github?.profileUrl,
    careerIntegrations.leetcode?.profileUrl,
  ]);

  const saveCareerLinks = async (links) => {
    await dispatch(saveCareerIntegrations(links)).unwrap();
  };

  const disconnectCareerLink = async (provider) => {
    await dispatch(disconnectCareerIntegration(provider)).unwrap();
  };

  // Persist domain choice
  const handleDomainChange = (d) => {
    setActiveDomain(d);
    localStorage.setItem('career_domain', d);
  };

  async function fetchDashProfile() {
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.data?.success) setDashProfile(res.data.data);
    } catch (err) {
      console.error('Career dashboard fetch failed', err);
    } finally {
      setProfileLoading(false);
    }
  }

  async function fetchCareerDebrief() {
    setDebriefLoading(true); setDebriefError(''); setDebriefText(null);
    try {
      const pr = dashProfile?.profile    || {};
      const an = dashProfile?.analytics  || {};
      const gh = dashProfile?.githubData || {};
      const lc = dashProfile?.leetcodeData || {};
      const li = dashProfile?.linkedinData || {};
      const lines = [
        'You are a direct, warm career coach inside a Digital Twin app. Speak in second person.',
        'Write EXACTLY 3 sentences. No lists, no headers, no markdown.',
        'Sentence 1: Summarise what the data says about their career trajectory today — use specific numbers.',
        'Sentence 2: Name the single biggest opportunity or risk in their career right now.',
        'Sentence 3: Give one concrete, high-leverage action for this week.',
        '',
        'USER DATA:',
        `Career domain: ${DOMAINS[activeDomain]?.label}.`,
        `Burnout risk: ${an.burnoutRisk ?? 'unknown'}%.`,
        `Productivity score: ${an.productivityScore ?? 'unknown'}/100.`,
        `Coding consistency: ${an.codingConsistency ?? 'unknown'}/100.`,
        `Career momentum: ${an.careerMomentum ?? 'unknown'}/100.`,
        gh.connected ? `GitHub: ${gh.recentActivityCount} recent commits, ${gh.publicRepos} public repos, ${gh.followers} followers.` : 'GitHub not connected.',
        lc.connected ? `LeetCode: ${lc.totalSolved} problems solved (${lc.hardSolved} hard), ${lc.acceptanceRate}% acceptance.` : 'LeetCode not connected.',
        li.connected ? `LinkedIn profile strength: ${li.profileStrength}%.` : 'LinkedIn not connected.',
        pr.studyHours ? `Studies ${pr.studyHours} hours/day.` : '',
        pr.sleepHours ? `Sleeps ${pr.sleepHours} hours/night.` : '',
      ].filter(Boolean).join('\n');

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: lines }],
        }),
      });
      const data = await res.json();
      const text = data?.content?.find(b => b.type === 'text')?.text?.trim() || '';
      if (text) setDebriefText(text);
      else setDebriefError('Could not generate your debrief — try again.');
    } catch { setDebriefError('AI service unreachable. Check your connection.'); }
    finally { setDebriefLoading(false); }
  }

  // Derived
  const profile       = dashProfile?.profile    || {};
  const analytics     = dashProfile?.analytics  || {};
  const aiInsights    = dashProfile?.aiInsights  || [];
  const careerInsights = dashProfile?.careerInsights || [];
  const recommendations = (dashProfile?.recommendations || []).filter(r => r.category === 'career');
  const githubData    = dashProfile?.githubData  || {};
  const leetcodeData  = dashProfile?.leetcodeData || {};

  const burnoutRisk   = analytics?.burnoutRisk         ?? null;
  const prodScore     = analytics?.productivityScore   ?? null;
  const codingScore   = analytics?.codingConsistency   ?? null;
  const momentumScore = analytics?.careerMomentum      ?? null;
  const growthScore   = analytics?.professionalGrowthScore ?? null;
  const hasCodingIntegration = Boolean(careerIntegrations.github?.connected || careerIntegrations.leetcode?.connected);
  const dynamicCareerMetrics = useMemo(
    () => calculateDynamicCareerMetrics(
      careerActivityCounts,
      hasCodingIntegration,
      Boolean(careerIntegrations.linkedin?.connected),
    ),
    [
      careerActivityCounts,
      hasCodingIntegration,
      careerIntegrations.linkedin?.connected,
    ],
  );
  const dynamicCodingScore = hasCodingIntegration ? dynamicCareerMetrics.codingConsistency : null;
  const dynamicMomentumScore = hasCodingIntegration ? dynamicCareerMetrics.careerMomentum : null;
  const professionalGrowthMetric = useMemo(
    () => calculateProfessionalGrowthScore({
      githubStats: professionalGrowthStats.github,
      leetcodeStats: professionalGrowthStats.leetcode,
      linkedinConnected: Boolean(careerIntegrations.linkedin?.connected),
    }),
    [
      professionalGrowthStats.github,
      professionalGrowthStats.leetcode,
      careerIntegrations.linkedin?.connected,
    ],
  );

  const careerMetrics = [
    { key: 'momentum',    label: 'Career Momentum',    icon: TrendingUp, value: dynamicMomentumScore, color: '#7b61ff',  status: dynamicCareerMetrics.momentumStatus },
    { key: 'coding',      label: 'Coding Consistency', icon: Code2,      value: dynamicCodingScore,   color: '#10c7a1',  status: dynamicCareerMetrics.codingStatus },
    { key: 'productivity',label: 'Productivity',       icon: Zap,        value: prodScore,     color: '#fbbf24',  status: prodScore     == null ? null : prodScore     >= 75 ? 'High Output' : prodScore >= 50 ? 'Moderate' : 'Low' },
    { key: 'burnout',     label: 'Burnout Risk',       icon: Activity,   value: burnoutRisk,   color: burnoutRisk > 65 ? '#f87171' : burnoutRisk > 40 ? '#fbbf24' : '#4ade80', status: burnoutRisk == null ? null : burnoutRisk > 65 ? 'High Risk' : burnoutRisk > 40 ? 'Moderate' : 'Low Risk', inverted: true },
    { key: 'growth',      label: 'Professional Growth',icon: Award,      value: professionalGrowthMetric.score,   color: '#c084fc',  status: professionalGrowthMetric.status },
  ];

  const forecast      = useMemo(() => buildBurnoutForecast(burnoutRisk, profile?.studyHours, profile?.sleepHours), [burnoutRisk, profile]);
  const crossInsights = useMemo(() => buildCrossInsights(profile, analytics), [profile, analytics]);
  const domainConfig  = DOMAINS[activeDomain];

  const productivityInsight = aiInsights.find(i => i.label === 'Productivity');
  const burnoutInsight      = aiInsights.find(i => i.label === 'Burnout Risk');

  return (
    <div className="relative min-h-full overflow-hidden bg-[#06080f] px-6 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(123,97,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(200,168,75,0.10),transparent_26%)]" />

      <div className="relative space-y-8">

        {/* ── HEADER ── */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Career Intelligence</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/55">
              {profileLoading ? 'Loading your career signals…' :
               burnoutRisk != null && burnoutRisk > 65
                ? `Burnout risk is at ${burnoutRisk}% — recovery is the highest-leverage career move right now.`
                : prodScore != null && prodScore >= 75
                ? `Productivity at ${prodScore}/100 with ${codingScore}/100 coding consistency. You're in a strong window — use it.`
                : 'Connect your career platforms below to unlock live intelligence.'}
            </p>
          </div>
          <button onClick={fetchDashProfile} disabled={profileLoading}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/8 hover:text-white/70 transition-all disabled:opacity-40">
            <RefreshCw className={`h-3.5 w-3.5 ${profileLoading ? 'animate-spin' : ''}`} />
            {profileLoading ? 'Syncing…' : 'Refresh signals'}
          </button>
        </section>

        {/* ── METRIC CARDS ── */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {careerMetrics.map(m => (
            m.value != null
              ? <CareerMetricCard key={m.key} metric={m} mounted={mounted} />
              : <NoSignalCard     key={m.key} label={m.label} icon={m.icon} hint={m.key === 'growth' ? 'Connect your professional profiles' : ['momentum', 'coding'].includes(m.key) ? 'Connect GitHub or LeetCode' : undefined} />
          ))}
        </section>

        {/* ── CAREER DOMAIN + INTEGRATIONS ── */}
        <section className={`${card} p-6`}>
          <div className="flex items-center justify-between mb-5 border-b border-white/8 pb-4">
            <div>
              <h2 className="text-xl font-bold">Career Domain</h2>
              <p className="mt-1 text-sm text-white/45">
                Select your domain — we'll show you the right platforms to connect.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5"
              style={{ borderColor: `${domainConfig.color}40`, backgroundColor: `${domainConfig.color}10` }}>
              <span className="text-base">{domainConfig.emoji}</span>
              <span className="text-xs font-bold" style={{ color: domainConfig.color }}>{domainConfig.label}</span>
            </div>
          </div>

          {/* Domain selector */}
          <DomainSelector current={activeDomain} onChange={handleDomainChange} />

          {/* Platform integrations */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Link className="h-4 w-4 text-white/30" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/30">
                Career integrations · Connect your profiles
              </p>
            </div>
            <div className="space-y-3">
              <CareerLinkCard
                provider="github"
                label="GitHub"
                icon={GithubIcon}
                placeholder="https://github.com/anjali"
                integration={careerIntegrations.github}
                saving={careerIntegrations.saving}
                onSave={saveCareerLinks}
                onDisconnect={disconnectCareerLink}
              />
              <CareerLinkCard
                provider="leetcode"
                label="LeetCode"
                icon={Code2}
                placeholder="https://leetcode.com/u/anjali"
                integration={careerIntegrations.leetcode}
                saving={careerIntegrations.saving}
                onSave={saveCareerLinks}
                onDisconnect={disconnectCareerLink}
              />
              <CareerLinkCard
                provider="linkedin"
                label="LinkedIn"
                icon={Briefcase}
                placeholder="https://linkedin.com/in/anjali"
                integration={careerIntegrations.linkedin}
                saving={careerIntegrations.saving}
                onSave={saveCareerLinks}
                onDisconnect={disconnectCareerLink}
              />
            </div>
            {careerIntegrations.error && (
              <p className="mt-3 rounded-xl border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 px-3 py-2 text-sm text-[#ff8fbd]">
                {careerIntegrations.error}
              </p>
            )}
          </div>

          {/* Compact heatmap — only shown in coding domain */}
          {activeDomain === 'coding' && (
            <div className="mt-6 pt-5 border-t border-white/8">
              <CompactHeatmap careerIntegrations={careerIntegrations} />
            </div>
          )}

          {/* LeetCode quick stats if connected — coding domain */}
          {activeDomain === 'coding' && leetcodeData?.connected && (
            <div className="mt-4 pt-4 border-t border-white/8 grid grid-cols-3 gap-3">
              {[
                { label: 'Total Solved', value: leetcodeData.totalSolved  ?? 0, color: '#10c7a1' },
                { label: 'Hard',         value: leetcodeData.hardSolved   ?? 0, color: '#f87171' },
                { label: 'Acceptance',   value: `${leetcodeData.acceptanceRate ?? 0}%`, color: '#fbbf24' },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-white/4 border border-white/8 p-3 text-center">
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-white/35 mt-1 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── AI CAREER DEBRIEF ── */}
        <section>
          <article className={`${card} border-[#7b61ff]/20 bg-gradient-to-br from-[#7b61ff]/5 to-[#06080f] p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7b61ff]/30 to-[#c084fc]/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-[#c084fc]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Daily Career Debrief</h2>
                  <p className="text-xs text-white/40 mt-0.5">Your Digital Twin reads your signals and speaks directly to you.</p>
                </div>
              </div>
              <button onClick={fetchCareerDebrief} disabled={debriefLoading}
                className="flex items-center gap-2 rounded-xl border border-[#7b61ff]/40 bg-[#7b61ff]/10 px-4 py-2.5 text-sm font-bold text-[#c084fc] hover:bg-[#7b61ff]/20 transition-all disabled:opacity-50">
                {debriefLoading
                  ? <><div className="h-4 w-4 rounded-full border-2 border-[#c084fc]/30 border-t-[#c084fc] animate-spin" /> Thinking…</>
                  : <><Sparkles className="h-4 w-4" /> Generate today's debrief</>}
              </button>
            </div>

            {!debriefText && !debriefLoading && !debriefError && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#7b61ff]/20 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-[#7b61ff]/30" />
                </div>
                <p className="text-sm text-white/35 max-w-sm leading-relaxed">
                  Hit "Generate today's debrief" and your Digital Twin will synthesise your connected profile data, productivity score, and burnout trajectory into a personalised 3-sentence briefing.
                </p>
              </div>
            )}
            {debriefLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="flex gap-1.5">
                  {[0,1,2,3].map(i => <div key={i} className="h-2 w-2 rounded-full bg-[#7b61ff]/60 animate-bounce" style={{ animationDelay: `${i*120}ms` }} />)}
                </div>
                <p className="text-sm text-white/30">Reading your signals…</p>
              </div>
            )}
            {debriefError && (
              <div className="rounded-xl bg-[#ea580c]/10 border border-[#ea580c]/20 px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-[#ea580c] shrink-0" />
                <p className="text-sm text-[#ea580c]/80">{debriefError}</p>
              </div>
            )}
            {debriefText && (
              <div className="rounded-2xl bg-gradient-to-br from-[#7b61ff]/8 to-transparent border border-[#7b61ff]/15 p-5">
                <p className="text-base leading-[1.8] text-white/85 font-light">{debriefText}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[10px] text-white/25 uppercase tracking-widest">
                    Generated from live signals · {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' })}
                  </p>
                  <button onClick={fetchCareerDebrief} className="text-xs text-[#7b61ff]/60 hover:text-[#7b61ff] transition-colors">
                    Regenerate ↺
                  </button>
                </div>
              </div>
            )}

            {(productivityInsight || burnoutInsight) && (
              <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {[productivityInsight, burnoutInsight].filter(Boolean).map((ins, i) => (
                  <div key={i} className={`rounded-xl border p-3.5 flex items-start gap-3 ${
                    ins.colorState === 'green' ? 'bg-[#4ade80]/5 border-[#4ade80]/15' :
                    ins.colorState === 'orange'? 'bg-[#fbbf24]/5 border-[#fbbf24]/15' :
                                                 'bg-[#f87171]/5 border-[#f87171]/15'}`}>
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ins.colorState === 'green' ? '#4ade80' : ins.colorState === 'orange' ? '#fbbf24' : '#f87171' }} />
                    <div>
                      <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Your Twin on {ins.label}</p>
                      <p className="text-sm text-white/70 leading-relaxed">{ins.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* ── BURNOUT FORECAST + CROSS-DOMAIN ── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">

          {/* 7-Day Burnout Forecast */}
          <article className={`${iCard} p-6 xl:col-span-6`}>
            <div className="mb-5 border-b border-white/8 pb-4">
              <h2 className="text-xl font-bold">7-Day Burnout Forecast</h2>
              <p className="mt-1 text-sm text-white/45">
                {burnoutRisk != null
                  ? `Based on burnout risk (${burnoutRisk}%), study load (${profile.studyHours ?? '?'}h/day), sleep (${profile.sleepHours ?? '?'}h/night).`
                  : 'Complete onboarding to unlock your personal burnout trajectory.'}
              </p>
            </div>
            {burnoutRisk != null ? (
              <>
                <div className="flex items-end gap-2 h-32 mb-3">
                  {forecast.map((day, i) => {
                    const pct   = day.risk / 100;
                    const color = day.risk > 70 ? '#f87171' : day.risk > 50 ? '#fbbf24' : '#4ade80';
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                        <span className="text-[9px] font-bold" style={{ color }}>{day.risk}%</span>
                        <div className="w-full rounded-t-md" style={{ height: `${Math.max(8, pct*100)}px`, backgroundColor: color+'25', border:`1px solid ${color}30` }}>
                          <div className="rounded-t-sm" style={{ height:`${pct*100}%`, backgroundColor: color+'60' }} />
                        </div>
                        <span className="text-[9px] text-white/30">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {[['#4ade80','Safe (< 50%)'],['#fbbf24','Warning (50–70%)'],['#f87171','High (> 70%)']].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: c }} />
                      <span className="text-[10px] text-white/35">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-white/8 bg-white/3 p-3.5">
                  <p className="text-xs text-white/60 leading-relaxed">
                    {forecast[6].risk > forecast[0].risk + 10
                      ? `⚠️ Trending upward — projects ${forecast[6].risk}% burnout risk by ${forecast[6].label}. One full rest day can reverse this.`
                      : forecast[6].risk <= forecast[0].risk
                      ? '✅ Trajectory stable or improving. Keep your current sleep and study balance.'
                      : 'Burnout risk is relatively flat. Small wins in sleep quality will keep it from drifting up.'}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="h-14 w-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-sm text-white/30 max-w-xs">Complete your onboarding profile to see your 7-day burnout forecast.</p>
              </div>
            )}
          </article>

          {/* Cross-Domain Correlation Alerts */}
          <article className={`${iCard} p-6 xl:col-span-6`}>
            <div className="mb-5 border-b border-white/8 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Cross-Domain Alerts</h2>
                <p className="mt-1 text-sm text-white/45">Health × Career × Finance — signals no single app can see.</p>
              </div>
              <Target className="h-5 w-5 text-[#7b61ff] shrink-0" />
            </div>
            <div className="space-y-3">
              {crossInsights.map((ins, i) => (
                <div key={i} onClick={() => setExpandedInsight(expandedInsight === i ? null : i)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    ins.severity === 'critical' ? 'border-[#f87171]/20 bg-[#f87171]/5 hover:bg-[#f87171]/8' :
                    ins.severity === 'warning'  ? 'border-[#fbbf24]/20 bg-[#fbbf24]/5 hover:bg-[#fbbf24]/8' :
                    ins.severity === 'positive' ? 'border-[#4ade80]/20 bg-[#4ade80]/5 hover:bg-[#4ade80]/8' :
                                                  'border-white/10 bg-white/3 hover:bg-white/5'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{ins.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-white/85">{ins.title}</p>
                        {expandedInsight !== i && <p className="text-xs text-white/45 mt-1 line-clamp-1">{ins.body}</p>}
                      </div>
                    </div>
                    {expandedInsight === i ? <ChevronUp className="h-4 w-4 text-white/30 shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />}
                  </div>
                  {expandedInsight === i && (
                    <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
                      <p className="text-sm text-white/65 leading-relaxed">{ins.body}</p>
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ins.color }}>Action</span>
                        <p className="text-xs text-white/55 leading-relaxed">{ins.action}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {careerInsights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/8 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">From your connected integrations</p>
                {careerInsights.slice(0, 2).map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border ${ins.colorState === 'green' ? 'bg-[#4ade80]/5 border-[#4ade80]/15' : 'bg-[#fbbf24]/5 border-[#fbbf24]/15'}`}>
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ins.colorState === 'green' ? '#4ade80' : '#fbbf24' }} />
                    <p className="text-xs text-white/60 leading-relaxed">{ins.message}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* ── TRAJECTORY ── */}
        <section>
          <article className={`${iCard} p-6`}>
            <div className="mb-5 border-b border-white/8 pb-4">
              <h2 className="text-xl font-bold">Career Trajectory Model</h2>
              <p className="mt-1 text-sm text-white/45">
                {momentumScore != null
                  ? `Sustainable path at ${momentumScore}/100 momentum — ${burnoutRisk > 50 ? 'high-fatigue risk is pulling your curve down' : 'trajectory is currently healthy'}.`
                  : 'Complete onboarding to unlock your personal trajectory model.'}
              </p>
            </div>
            <div className="relative h-52 overflow-hidden rounded-xl border border-white/8 bg-[#0a0c14]">
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 800 220">
                <line x1="0" x2="800" y1="55"  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" x2="800" y1="110" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" x2="800" y1="165" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <path d="M0 180 Q200 140 400 155 T800 215" fill="none" stroke="#c8a84b" strokeDasharray="7 7" strokeWidth="2.5" opacity="0.7" />
                <path d={momentumScore != null && momentumScore >= 60 ? "M0 180 Q250 140 550 70 T800 35" : "M0 180 Q250 155 550 120 T800 90"}
                  fill="none" stroke="#7b61ff" strokeLinecap="round" strokeWidth="4"
                  strokeDasharray="1000" strokeDashoffset={mounted ? '0' : '1000'}
                  style={{ transition: 'stroke-dashoffset 1.8s ease-in-out' }} />
                {momentumScore != null && <circle cx="200" cy={180 - (momentumScore/100)*80} r="5" fill="#7b61ff" opacity="0.9" />}
              </svg>
              <div className="absolute right-4 top-4 bg-[#0a0c14]/90 backdrop-blur border border-white/8 p-3 rounded-xl space-y-2 text-xs font-semibold">
                <div className="flex items-center gap-2 text-[#7b61ff]"><span className="h-0.5 w-5 rounded bg-[#7b61ff] inline-block" /> Sustainable path</div>
                <div className="flex items-center gap-2 text-[#c8a84b]"><span className="h-0.5 w-5 rounded border-b-2 border-dashed border-[#c8a84b] inline-block" /> Burnout trajectory</div>
                {momentumScore != null && <div className="flex items-center gap-2 text-white/50"><span className="h-2 w-2 rounded-full bg-[#7b61ff] inline-block" /> You are here</div>}
              </div>
            </div>
            {momentumScore != null && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrajectoryCard tone="positive" title="Sustainable Path"
                  text={`Consistent ${profile.studyHours ?? 4}h study blocks, ${profile.exerciseFrequency ?? 2} workout days/week, and protected sleep keeps momentum compounding without hitting the burnout ceiling.`} />
                <TrajectoryCard tone="warning" title="High-Fatigue Risk"
                  text={burnoutRisk > 50
                    ? `At ${burnoutRisk}% burnout risk, pushing harder now risks a crash in 2–3 weeks. Recovery invested today yields more output by next month.`
                    : 'Extending study hours without protecting sleep and recovery will erode code quality and slow long-term momentum.'} />
              </div>
            )}
          </article>
        </section>

      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function CareerMetricCard({ metric, mounted }) {
  const Icon = metric.icon;
  const ringVal = metric.inverted ? 100 - metric.value : metric.value;
  return (
    <article className={`${iCard} p-5 text-center`}>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/5 ring-1 ring-white/8">
        <CareerRing value={ringVal} color={metric.color} mounted={mounted} />
      </div>
      <div className="mx-auto mb-2.5 h-9 w-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: metric.color+'18', color: metric.color }}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-white/45 truncate">{metric.label}</h3>
      <p className="mt-1 text-sm font-bold truncate" style={{ color: metric.color }}>{metric.status}</p>
    </article>
  );
}

function CareerRing({ value, color, mounted }) {
  const r = 28, circ = 2 * Math.PI * r;
  const [cur, setCur] = useState(0);
  useEffect(() => {
    if (!mounted || value == null) return;
    const target = clamp(Math.round(value), 0, 100);
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1200, 1);
      setCur(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, mounted]);
  const offset = circ - (cur / 100) * circ;
  return (
    <div className="relative h-14 w-14">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" fill="none" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" />
        <circle cx="36" cy="36" fill="none" r={r} stroke={color} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="4.5" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold text-white/80">{cur}%</div>
    </div>
  );
}

function NoSignalCard({ label, icon: Icon, hint = 'Complete onboarding' }) {
  return (
    <article className={`${card} p-5 text-center flex flex-col items-center justify-center gap-3 min-h-[140px]`}>
      <div className="h-14 w-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
        <Icon className="h-6 w-6 text-white/15" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/25">{label}</p>
        <p className="text-[11px] text-white/15 mt-0.5">{hint}</p>
      </div>
    </article>
  );
}

function TrajectoryCard({ tone, title, text }) {
  const styles = tone === 'positive' ? 'border-[#7b61ff]/20 bg-[#7b61ff]/5 text-[#c084fc]' : 'border-[#c8a84b]/20 bg-[#c8a84b]/5 text-[#c8a84b]';
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em]">{title}</h4>
      <p className="text-sm leading-relaxed text-white/55">{text}</p>
    </div>
  );
}

function GithubIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
