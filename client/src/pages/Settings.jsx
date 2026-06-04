import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  Activity, Bot, CalendarDays, Check, CircleHelp, Code2, CreditCard,
  Globe, LockKeyhole, LogOut, Mail, Network, Pencil,
  Phone, Save, ShieldCheck, UserRound, X, Wifi, WifiOff, RefreshCw,
  AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp,
  Zap,
} from 'lucide-react';
import { getSettings, updateSettings } from '../services/voiceAssistantService';
import { logoutUser } from '../features/auth/authThunks';
import {
  disconnectCareerIntegration,
  fetchCareerIntegrations,
  saveCareerIntegrations,
} from '../features/careerIntegrations/careerIntegrationSlice';
import {
  disconnectHealthIntegration,
  fetchHealthIntegration,
  saveHealthIntegration,
} from '../features/healthIntegration/healthIntegrationSlice';
import { useIntegrations } from '../context/IntegrationContext';
import { fetchCareerIntegrationStats, getCareerProfileLabel } from '../utils/careerIntegrationStats';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ─── Integration definitions ──────────────────────────────────────────────────
const INTEGRATIONS = [
  {
    key: 'github',
    label: 'GitHub',
    icon: Code2,
    color: '#e2e8f0',
    accent: 'rgba(226,232,240,0.15)',
    border: 'rgba(226,232,240,0.2)',
    description: 'Sync repos, stars, languages and contribution activity.',
    fieldLabel: 'GitHub username',
    fieldKey: 'username',
    placeholder: 'e.g. torvalds',
    statsKeys: ['publicRepos', 'totalStars', 'followers'],
    statsLabels: ['Repos', 'Stars', 'Followers'],
    pages: ['Dashboard', 'Career'],
  },
  {
    key: 'leetcode',
    label: 'LeetCode',
    icon: Zap,
    color: '#fbbf24',
    accent: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.25)',
    description: 'Pull solved problems, streak, and difficulty breakdown.',
    fieldLabel: 'LeetCode username',
    fieldKey: 'username',
    placeholder: 'e.g. neal_wu',
    statsKeys: ['totalSolved', 'streak', 'ranking'],
    statsLabels: ['Solved', 'Streak', 'Rank'],
    pages: ['Dashboard', 'Career'],
  },
  {
    key: 'fitbit',
    label: 'Fitbit / Wearable',
    icon: Activity,
    color: '#34d399',
    accent: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.25)',
    description: 'Steps, sleep, heart rate, HRV — live health metrics.',
    fieldLabel: 'Fitbit username or email',
    fieldKey: 'username',
    placeholder: 'e.g. gargi@email.com',
    statsKeys: ['steps', 'sleepHours', 'avgHeartRate'],
    statsLabels: ['Steps', 'Sleep (h)', 'Heart Rate'],
    pages: ['Health', 'Dashboard'],
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: Network,
    color: '#60a5fa',
    accent: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.25)',
    description: 'Profile URL for career intelligence and networking insights.',
    fieldLabel: 'LinkedIn profile URL or username',
    fieldKey: 'username',
    placeholder: 'e.g. https://linkedin.com/in/username',
    statsKeys: [],
    statsLabels: [],
    pages: ['Career', 'Dashboard'],
  },
  {
    key: 'banking',
    label: 'Banking / Finance',
    icon: CreditCard,
    color: '#a78bfa',
    accent: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.25)',
    description: 'Plaid link or banking profile for cashflow intelligence.',
    fieldLabel: 'Banking profile link',
    fieldKey: 'profileLink',
    placeholder: 'e.g. Plaid link or bank profile URL',
    statsKeys: [],
    statsLabels: [],
    pages: ['Finance', 'Dashboard'],
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: Globe,
    color: '#fb923c',
    accent: 'rgba(251,146,60,0.1)',
    border: 'rgba(251,146,60,0.25)',
    description: 'Your personal website or portfolio for career signals.',
    fieldLabel: 'Portfolio URL',
    fieldKey: 'url',
    placeholder: 'e.g. https://yoursite.dev',
    statsKeys: [],
    statsLabels: [],
    pages: ['Career'],
  },
];

// ─── Profile fields (unchanged from original) ─────────────────────────────────
const editableFields = [
  { key: 'email',    label: 'Email',         type: 'email',    icon: Mail,         placeholder: 'you@example.com'    },
  { key: 'phone',    label: 'Phone number',  type: 'tel',      icon: Phone,        placeholder: '+91 98765 43210'    },
  { key: 'password', label: 'Password',      type: 'password', icon: LockKeyhole,  placeholder: 'New password'       },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────
function readJson(key, fallback = null) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function getInitialProfile() {
  const user = readJson('user', {}) || {};
  const onboarding = readJson('lifetwinOnboardingProfile', {}) || {};
  return {
    fullName: user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'DigitalTwin User',
    firstName: user.firstName || '',
    lastName: user.lastName  || '',
    email:     user.email    || '',
    phone:     user.phone    || onboarding.phone || '',
    dob:       user.dob      || onboarding.dob   || '',
    password:  '',
    passwordSet: Boolean(user.password || user.passwordSet),
  };
}
function normalizeBackendProfile(user = {}, onboarding = {}) {
  const local = getInitialProfile();
  const fullName = user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return {
    ...local,
    fullName:    fullName    || local.fullName,
    firstName:   user.firstName   || local.firstName,
    lastName:    user.lastName    || local.lastName,
    email:       user.email       || local.email,
    phone:       user.phone       || onboarding.phone || local.phone,
    dob:         user.dob         || onboarding.dob   || local.dob,
    password:    '',
    passwordSet: Boolean(user.passwordSet || local.passwordSet),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
function Settings() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { integrations, saveIntegration, disconnectIntegration, loading: intLoading, refreshIntegrations } = useIntegrations();
  const careerIntegrations = useSelector((state) => state.careerIntegrations);
  const healthIntegration = useSelector((state) => state.healthIntegration);

  const [profile, setProfile] = useState(getInitialProfile);
  const [draft,   setDraft]   = useState(profile);
  const [editing, setEditing] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: true,
    twinAssistantEnabled: false,
    twinAssistantPreferences: {
      backgroundListening: true,
      voiceResponses: false,
    },
    notificationPreferences: { emailNotifications: true },
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [authR, dashR, settR] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/auth/profile`,  { headers }),
          axios.get(`${API_BASE_URL}/api/dashboard`,      { headers }),
          getSettings(),
        ]);
        if (!isMounted) return;
        const authUser       = authR.status === 'fulfilled' ? authR.value.data?.data || {} : {};
        const onboardingProf = dashR.status === 'fulfilled' ? dashR.value.data?.data?.profile || {} : {};
        const backendSettings = settR.status === 'fulfilled' ? settR.value : {
          theme: 'dark',
          notifications: true,
          twinAssistantEnabled: false,
          twinAssistantPreferences: {
            backgroundListening: true,
            voiceResponses: false,
          },
          notificationPreferences: { emailNotifications: true },
        };
        const next = normalizeBackendProfile(authUser, onboardingProf);
        localStorage.setItem('user', JSON.stringify(next));
        setProfile(next); setDraft(next); setSettings(backendSettings);
      } catch (e) { console.warn('Settings load:', e.message); }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    dispatch(fetchCareerIntegrations());
    dispatch(fetchHealthIntegration());
  }, [dispatch]);

  const initials = useMemo(() =>
    profile.fullName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase(),
    [profile.fullName]);

  const handleChange = e => {
    const { name, value } = e.target;
    setDraft(c => ({ ...c, [name]: value }));
  };

  const saveProfile = async (keys) => {
    const next = keys.reduce((u, k) => ({ ...u, [k]: typeof draft[k] === 'string' ? draft[k].trim() : draft[k] }), { ...profile });
    if (keys.includes('password') && next.password) next.passwordSet = true;
    localStorage.setItem('user', JSON.stringify({ ...readJson('user', {}), ...next }));
    try {
      const token = localStorage.getItem('authToken');
      if (token && !keys.includes('password')) {
        await axios.put(`${API_BASE_URL}/api/auth/profile`, { email: next.email, phone: next.phone, dob: next.dob }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setProfile(next); setDraft(next); setEditing('');
      showToast(keys.includes('password') ? 'Password updated' : 'Changes saved');
    } catch {
      setProfile(next); setDraft(next); setEditing('');
      showToast('Saved locally');
    }
  };

  const showToast = (msg) => { setSavedMessage(msg); window.setTimeout(() => setSavedMessage(''), 2400); };

  const handleTwinAssistantToggle = async () => {
    const next = { ...settings, twinAssistantEnabled: !settings.twinAssistantEnabled };
    setSettings(next);
    try {
      const saved = await updateSettings({ twinAssistantEnabled: next.twinAssistantEnabled });
      setSettings(saved);
      window.dispatchEvent(new Event('twin-assistant-settings-updated'));
      showToast(next.twinAssistantEnabled ? 'Twin Assistant enabled' : 'Twin Assistant disabled');
    } catch { setSettings(settings); showToast('Could not save assistant setting'); }
  };

  const handleTwinAssistantPreferenceToggle = async (key) => {
    const twinAssistantPreferences = {
      ...(settings.twinAssistantPreferences || {}),
      [key]: !(settings.twinAssistantPreferences?.[key] ?? true),
    };
    const next = { ...settings, twinAssistantPreferences };
    setSettings(next);
    try {
      const saved = await updateSettings({ twinAssistantPreferences });
      setSettings(saved);
      window.dispatchEvent(new Event('twin-assistant-settings-updated'));
      showToast('Twin Assistant setting saved');
    } catch {
      setSettings(settings);
      showToast('Could not save assistant setting');
    }
  };

  const handleEmailNotificationsToggle = async () => {
    const notificationPreferences = {
      ...(settings.notificationPreferences || {}),
      emailNotifications: !(settings.notificationPreferences?.emailNotifications ?? true),
    };
    const next = { ...settings, notificationPreferences };
    setSettings(next);
    try {
      const saved = await updateSettings({ notificationPreferences });
      setSettings(saved);
      showToast(notificationPreferences.emailNotifications ? 'Email notifications enabled' : 'Email notifications disabled');
    } catch {
      setSettings(settings);
      showToast('Could not save email notification setting');
    }
  };

  const handleLogout = async () => { await dispatch(logoutUser()); navigate('/', { replace: true }); };

  const handleSaveCareerIntegrations = async (links) => {
    await dispatch(saveCareerIntegrations(links)).unwrap();
    showToast('Career integrations saved');
  };

  const handleDisconnectCareerIntegration = async (provider) => {
    await dispatch(disconnectCareerIntegration(provider)).unwrap();
    showToast(`${providerLabel(provider)} disconnected`);
  };

  const handleSaveHealthIntegration = async (integrationLink) => {
    await dispatch(saveHealthIntegration({ integrationLink })).unwrap();
    showToast('Health device connected');
  };

  const handleDisconnectHealthIntegration = async () => {
    await dispatch(disconnectHealthIntegration()).unwrap();
    showToast('Health device disconnected');
  };

  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 left-[20rem] bg-[radial-gradient(circle_at_16%_0%,rgba(255,122,0,0.12),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(16,199,161,0.10),transparent_30%),linear-gradient(135deg,rgba(123,97,255,0.08),transparent_34%)]" />

      <div className="relative mx-auto max-w-7xl space-y-6">

        {/* ── Hero header ── */}
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080d15]/95 p-6 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(255,122,0,0.18),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(123,97,255,0.18),transparent_28%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[1.5rem] border border-white/15 bg-gradient-to-br from-[#ff7a00] via-[#ff007f] to-[#7b61ff] p-[2px] shadow-[0_18px_45px_-24px_rgba(255,0,127,0.95)]">
                <div className="grid h-full w-full place-items-center rounded-[calc(1.5rem-2px)] bg-[#080d15] text-3xl font-black">{initials || 'DT'}</div>
              </div>
              <div>
                {/* <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7df3cc]/70">Settings</p> */}
                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{profile.fullName}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Profile, integrations, assistant, and session controls.</p>
              </div>
            </div>
            {savedMessage && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#10c7a1]/25 bg-[#10c7a1]/12 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#7df3cc]">
                <Check className="h-4 w-4" />{savedMessage}
              </span>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <main>
              <SettingsSection icon={UserRound} eyebrow="Profile" title="Profile Details" className="h-full">
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadOnlyCard icon={UserRound}    label="Full name"     value={profile.fullName || 'Not set'} />
                  <ReadOnlyCard icon={CalendarDays} label="Date of birth" value={profile.dob      || 'Not set'} />
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {editableFields.map(field => (
                    <EditableCard key={field.key} field={field}
                      displayValue={field.key === 'password' ? maskPassword(profile.passwordSet || profile.password) : profile[field.key]}
                      onEdit={() => { setDraft(profile); setEditing(field.key); }}
                    />
                  ))}
                </div>
              </SettingsSection>
            </main>
            <aside>
              <SettingsSection icon={CircleHelp} eyebrow="Help" title="Help And Support" className="h-full">
                <div className="space-y-3">
                  <SupportRow title="Contact support"  copy="Get help with your account, profile data, or connected links." />
                  <SupportRow title="Security help"    copy="Review sign-in and password guidance for your Digital Twin account." />
                  <a href="mailto:k.anjaliii.1011@gmail.com"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#10c7a1]/25 bg-[#10c7a1]/10 px-4 py-3 text-sm font-black text-[#7df3cc] transition hover:bg-[#10c7a1]/15">
                    <Mail className="h-4 w-4" />Email Support
                  </a>
                </div>
              </SettingsSection>
            </aside>
          </div>

          <SettingsSection icon={Network} eyebrow="Career" title="Career Integrations">
            <CareerIntegrationsSettings
              integrations={careerIntegrations}
              onSave={handleSaveCareerIntegrations}
              onDisconnect={handleDisconnectCareerIntegration}
              onRefresh={() => dispatch(fetchCareerIntegrations())}
            />
          </SettingsSection>

          <SettingsSection icon={Activity} eyebrow="Health" title="Health Integration">
            <HealthIntegrationSettings
              integration={healthIntegration}
              onSave={handleSaveHealthIntegration}
              onDisconnect={handleDisconnectHealthIntegration}
              onRefresh={() => dispatch(fetchHealthIntegration())}
            />
          </SettingsSection>

          {/* ── INTEGRATIONS ── */}
          <SettingsSection icon={Wifi} eyebrow="Integrations" title="Finance Integration">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-white/50">
                Connect your accounts once — data flows to Dashboard, Health, Career, and Finance automatically.
              </p>
              <button onClick={refreshIntegrations} disabled={intLoading}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/8 hover:text-white disabled:opacity-40">
                <RefreshCw className={`h-3.5 w-3.5 ${intLoading ? 'animate-spin' : ''}`} />
                Refresh all
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {INTEGRATIONS.filter(def => !['github', 'leetcode', 'linkedin', 'fitbit', 'portfolio'].includes(def.key)).map(def => (
                <IntegrationCard
                  key={def.key}
                  def={def}
                  state={integrations[def.key] || { status: 'disconnected' }}
                  onConnect={(payload) => { saveIntegration(def.key, payload); showToast(`${def.label} connected`); }}
                  onDisconnect={() => { disconnectIntegration(def.key); showToast(`${def.label} disconnected`); }}
                />
              ))}
            </div>
          </SettingsSection>

          {/* ── Twin Assistant ── */}
          <SettingsSection icon={Bot} eyebrow="Voice Control" title="Twin Assistant">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <AssistantToggle
                title="Enable Twin Assistant"
                copy="Start the Deepgram-powered assistant and allow hands-free voice control."
                checked={settings.twinAssistantEnabled}
                onChange={handleTwinAssistantToggle}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <AssistantToggle
                  title="Background Listening"
                  copy="Keep listening while you use the app."
                  checked={settings.twinAssistantPreferences?.backgroundListening ?? true}
                  onChange={() => handleTwinAssistantPreferenceToggle('backgroundListening')}
                  compact
                />
                <AssistantToggle
                  title="Voice Responses"
                  copy="Allow spoken responses when supported."
                  checked={settings.twinAssistantPreferences?.voiceResponses ?? false}
                  onChange={() => handleTwinAssistantPreferenceToggle('voiceResponses')}
                  compact
                />
              </div>
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <StatusPill active={settings.twinAssistantEnabled} label={settings.twinAssistantEnabled ? 'Active' : 'Inactive'} />
                <StatusPill active={settings.twinAssistantEnabled && (settings.twinAssistantPreferences?.backgroundListening ?? true)} label={settings.twinAssistantEnabled ? 'Listening' : 'Not Listening'} />
              </div>
            </div>
          </SettingsSection>

          {/* ── Logout ── */}
          <SettingsSection icon={Mail} eyebrow="Notifications" title="Website And Email Alerts">
            <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-3xl">
                <h4 className="text-xl font-black text-white">Email Notifications</h4>
                <p className="mt-2 text-sm leading-6 text-white/56">
                  Send the same Digital Twin alerts to your registered email address while keeping them visible inside the app.
                </p>
              </div>
              <button type="button" role="switch" aria-checked={settings.notificationPreferences?.emailNotifications ?? true}
                onClick={handleEmailNotificationsToggle}
                className={`relative h-9 w-16 shrink-0 rounded-full border p-1 transition ${(settings.notificationPreferences?.emailNotifications ?? true) ? 'border-[#10c7a1]/45 bg-[#10c7a1]' : 'border-white/12 bg-white/10'}`}>
                <span className={`block h-7 w-7 rounded-full bg-white shadow-lg transition ${(settings.notificationPreferences?.emailNotifications ?? true) ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>
          </SettingsSection>

          <section className="mx-auto max-w-2xl rounded-[1.5rem] border border-[#ff007f]/25 bg-[#0b111a]/92 p-5 text-center shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ff007f]/25 bg-[#ff007f]/10 text-[#ff8fbd]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff8fbd]/75">Logout</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">End Session</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">Securely close this account session.</p>
            <button type="button" onClick={handleLogout}
              className="mx-auto mt-5 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#7b61ff] px-5 py-3 text-sm font-black text-white shadow-[0_20px_50px_-25px_rgba(255,0,127,0.9)] transition hover:-translate-y-0.5">
              <LogOut className="h-4 w-4" />Logout
            </button>
          </section>
        </div>
      </div>

      {editing && (
        <EditProfileModal
          field={editableFields.find((field) => field.key === editing)}
          currentValue={editing === 'password' ? maskPassword(profile.passwordSet || profile.password) : profile[editing]}
          value={draft[editing]}
          onChange={handleChange}
          onCancel={() => { setDraft(profile); setEditing(''); }}
          onSave={() => saveProfile([editing])}
        />
      )}
    </div>
  );
}

function CareerIntegrationsSettings({ integrations, onSave, onDisconnect, onRefresh }) {
  const [draft, setDraft] = useState({
    github: integrations.github?.profileUrl || '',
    leetcode: integrations.leetcode?.profileUrl || '',
    linkedin: integrations.linkedin?.profileUrl || '',
  });
  const [savingKey, setSavingKey] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [statsByKey, setStatsByKey] = useState({});
  const [statsLoading, setStatsLoading] = useState({});

  useEffect(() => {
    setDraft({
      github: integrations.github?.profileUrl || '',
      leetcode: integrations.leetcode?.profileUrl || '',
      linkedin: integrations.linkedin?.profileUrl || '',
    });
  }, [
    integrations.github?.profileUrl,
    integrations.leetcode?.profileUrl,
    integrations.linkedin?.profileUrl,
  ]);

  useEffect(() => {
    let cancelled = false;

    ['github', 'leetcode'].forEach((key) => {
      const profileUrl = integrations[key]?.profileUrl || '';
      if (!profileUrl) {
        setStatsByKey((current) => ({ ...current, [key]: null }));
        return;
      }

      setStatsLoading((current) => ({ ...current, [key]: true }));
      fetchCareerIntegrationStats(key, profileUrl)
        .then((stats) => {
          if (!cancelled) setStatsByKey((current) => ({ ...current, [key]: stats }));
        })
        .catch(() => {
          if (!cancelled) setStatsByKey((current) => ({ ...current, [key]: null }));
        })
        .finally(() => {
          if (!cancelled) setStatsLoading((current) => ({ ...current, [key]: false }));
        });
    });

    return () => { cancelled = true; };
  }, [integrations.github?.profileUrl, integrations.leetcode?.profileUrl]);

  const rows = [
    { key: 'github', label: 'GitHub', icon: Code2, placeholder: 'https://github.com/anjali', value: integrations.github?.profileUrl || '' },
    { key: 'leetcode', label: 'LeetCode', icon: Zap, placeholder: 'https://leetcode.com/u/anjali', value: integrations.leetcode?.profileUrl || '' },
    { key: 'linkedin', label: 'LinkedIn', icon: Network, placeholder: 'https://linkedin.com/in/anjali', value: integrations.linkedin?.profileUrl || '' },
  ];

  const saveOne = async (key) => {
    setSavingKey(key);
    try {
      await onSave({ [key]: draft[key] || '' });
      setEditingKey('');
    } finally {
      setSavingKey('');
    }
  };

  const disconnectOne = async (key) => {
    setSavingKey(key);
    try {
      await onDisconnect(key);
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-white/50">Career links are shared by Onboarding, Career, and Settings through Redux.</p>
        <button type="button" onClick={onRefresh} disabled={integrations.loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/8 hover:text-white disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${integrations.loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {rows.map((row) => {
          const Icon = row.icon;
          const connected = Boolean(row.value);
          const saving = savingKey === row.key || integrations.saving;
          const editing = editingKey === row.key || !connected;
          const stats = statsByKey[row.key];

          return (
            <div key={row.key} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-[#7df3cc]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-base font-black text-white">{row.label}</h4>
                    <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.16em] ${connected ? 'text-[#10c7a1]' : 'text-white/32'}`}>
                      {connected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {connected && (
                  <button type="button" onClick={() => setEditingKey(row.key)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white/55 transition hover:bg-white/10 hover:text-white">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>

              {connected && row.key === 'github' && (
                <StatsChips
                  loading={statsLoading.github}
                  items={[
                    ['Username', stats?.username || integrations.github.username],
                    ['Repositories', stats?.repositories],
                    ['Followers', stats?.followers],
                    ['Following', stats?.following],
                    ['Stars', stats?.stars],
                  ]}
                />
              )}

              {connected && row.key === 'leetcode' && (
                <StatsChips
                  loading={statsLoading.leetcode}
                  items={[
                    ['Solved Questions', stats?.solved],
                    ['Rank', stats?.rank],
                    ['Rating', stats?.contestRating],
                    ['Contests Given', stats?.contests],
                  ]}
                />
              )}

              {connected && row.value && (
                <a href={row.value} target="_blank" rel="noreferrer"
                  className="mb-3 block truncate rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-[#7df3cc]/70 hover:text-[#7df3cc]">
                  Profile: {getCareerProfileLabel(row.key, row.value)}
                </a>
              )}

              {editing && (
                <input
                  value={draft[row.key]}
                  onChange={(event) => setDraft((current) => ({ ...current, [row.key]: event.target.value }))}
                  placeholder={row.placeholder}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#080d15] px-3 text-base font-semibold text-white outline-none placeholder:text-white/20 focus:border-[#10c7a1]/45"
                />
              )}

              <div className="mt-4 flex gap-2">
                {editing && (
                  <button type="button" onClick={() => saveOne(row.key)} disabled={saving}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#10c7a1] px-3 py-2 text-xs font-black text-[#06110f] transition hover:bg-[#7df3cc] disabled:opacity-50">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                )}
                {connected && (
                  <button type="button" onClick={() => disconnectOne(row.key)} disabled={saving}
                    className={`${editing ? '' : 'w-full'} rounded-xl border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 px-3 py-2 text-xs font-bold text-[#ff4d7d] transition hover:bg-[#ff4d7d]/15 disabled:opacity-50`}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {integrations.error && (
        <p className="rounded-xl border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 px-3 py-2 text-sm text-[#ff8fbd]">{integrations.error}</p>
      )}
    </div>
  );
}

function providerLabel(provider) {
  return ({ github: 'GitHub', leetcode: 'LeetCode', linkedin: 'LinkedIn' })[provider] || provider;
}

function HealthIntegrationSettings({ integration, onSave, onDisconnect, onRefresh }) {
  const [draft, setDraft] = useState(integration.integrationLink || '');
  const [editing, setEditing] = useState(!integration.connected);

  useEffect(() => {
    setDraft(integration.integrationLink || '');
    setEditing(!integration.connected);
  }, [integration.connected, integration.integrationLink]);

  const save = async () => {
    if (!draft.trim()) return;
    await onSave(draft.trim());
    setEditing(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-[#34d399]">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-base font-black text-white">Health Device</h4>
            <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.16em] ${integration.connected ? 'text-[#10c7a1]' : 'text-white/32'}`}>
              {integration.connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={integration.loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/50 transition hover:bg-white/8 hover:text-white disabled:opacity-40">
          <RefreshCw className={`h-3.5 w-3.5 ${integration.loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {integration.connected && (
        <div className="mb-3 grid gap-2 text-sm text-white/62 md:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">Provider: Gargi Fitband</div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">Status: Synced</div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            Last Sync: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Not synced'}
          </div>
        </div>
      )}

      {integration.connected && integration.integrationLink && !editing && (
        <p className="mb-3 truncate rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-[#7df3cc]/70">
          {integration.integrationLink}
        </p>
      )}

      {editing && (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="https://gargi-fitband/user/12345"
          className="h-11 w-full rounded-xl border border-white/10 bg-[#080d15] px-3 text-base font-semibold text-white outline-none placeholder:text-white/20 focus:border-[#10c7a1]/45"
        />
      )}

      <div className="mt-4 flex gap-2">
        {editing ? (
          <button type="button" onClick={save} disabled={integration.saving || !draft.trim()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#10c7a1] px-3 py-2 text-xs font-black text-[#06110f] transition hover:bg-[#7df3cc] disabled:opacity-50">
            {integration.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        ) : (
          <button type="button" onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        {integration.connected && (
          <button type="button" onClick={onDisconnect} disabled={integration.saving}
            className="rounded-xl border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 px-3 py-2 text-xs font-bold text-[#ff4d7d] transition hover:bg-[#ff4d7d]/15 disabled:opacity-50">
            Disconnect
          </button>
        )}
      </div>

      {integration.error && (
        <p className="mt-3 rounded-xl border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 px-3 py-2 text-sm text-[#ff8fbd]">{integration.error}</p>
      )}
    </div>
  );
}

function StatsChips({ loading, items }) {
  if (loading) {
    return (
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white/40">
          <Loader2 className="h-3 w-3 animate-spin" />
          Fetching profile
        </span>
      </div>
    );
  }

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {items
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => (
          <span key={label} className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] font-bold text-white/62">
            {label}: {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        ))}
    </div>
  );
}

// ─── IntegrationCard ─────────────────────────────────────────────────────────
function IntegrationCard({ def, state, onConnect, onDisconnect }) {
  const [expanded,    setExpanded]    = useState(false);
  const [inputValue,  setInputValue]  = useState('');
  const [connecting,  setConnecting]  = useState(false);
  const [inputError,  setInputError]  = useState('');

  const connected = state.status === 'connected';
  const Icon = def.icon;

  const handleConnect = async () => {
    if (!inputValue.trim()) { setInputError(`Enter your ${def.fieldLabel.toLowerCase()}`); return; }
    setInputError('');
    setConnecting(true);
    try {
      await onConnect({ [def.fieldKey]: inputValue.trim() });
      setExpanded(false);
      setInputValue('');
    } finally {
      setConnecting(false);
    }
  };

  // Build stats chips when connected and data exists
  const stats = def.statsKeys
    .map((k, i) => ({ label: def.statsLabels[i], value: state.data?.[k] }))
    .filter(s => s.value !== undefined && s.value !== null);

  return (
    <div
      className="flex flex-col rounded-2xl border bg-white/[0.03] transition-all duration-200"
      style={{
        borderColor: connected ? def.border : 'rgba(255,255,255,0.08)',
        backgroundColor: connected ? def.accent : undefined,
      }}
    >
      {/* ── Top row ── */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{ borderColor: def.border, backgroundColor: def.accent }}>
          <Icon className="h-5 w-5" style={{ color: def.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-black text-white">{def.label}</h4>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#10c7a1]/30 bg-[#10c7a1]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#10c7a1]">
                <CheckCircle2 className="h-2.5 w-2.5" />Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/35">
                <WifiOff className="h-2.5 w-2.5" />Not connected
              </span>
            )}
          </div>

          {/* Pages this affects */}
          <div className="mt-1 flex flex-wrap gap-1">
            {def.pages.map(p => (
              <span key={p} className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/30 bg-white/5 border border-white/8">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Expand / collapse */}
        <button onClick={() => setExpanded(e => !e)}
          className="shrink-0 h-7 w-7 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Stats row (when connected and data exists) ── */}
      {connected && stats.length > 0 && (
        <div className="mx-4 mb-3 grid grid-cols-3 gap-2 rounded-xl border border-white/8 bg-black/20 p-3">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">{s.label}</p>
              <p className="mt-0.5 text-sm font-black text-white">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Connected identity ── */}
      {connected && (state.username || state.profileLink || state.url) && (
        <div className="mx-4 mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <span className="text-xs text-white/50 truncate max-w-[70%]">
            {state.username || state.profileLink || state.url}
          </span>
          <button onClick={onDisconnect}
            className="text-[10px] font-bold text-[#ff4d7d]/70 hover:text-[#ff4d7d] transition-colors underline underline-offset-2">
            Disconnect
          </button>
        </div>
      )}

      {/* ── Expanded connect form ── */}
      {expanded && (
        <div className="border-t border-white/8 p-4 space-y-3">
          <p className="text-xs text-white/45 leading-relaxed">{def.description}</p>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: def.color }}>
              {def.fieldLabel}
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={e => { setInputValue(e.target.value); setInputError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder={def.placeholder}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#080d15] px-4 text-sm font-semibold text-white outline-none placeholder:text-white/20 focus:border-white/25 transition-colors"
            />
            {inputError && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#ff4d7d]">
                <AlertCircle className="h-3 w-3" />{inputError}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleConnect} disabled={connecting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-black text-[#05070d] transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: def.color }}>
              {connecting
                ? <><Loader2 className="h-4 w-4 animate-spin" />Connecting…</>
                : <><Wifi className="h-4 w-4" />Connect</>}
            </button>
            <button onClick={() => { setExpanded(false); setInputValue(''); setInputError(''); }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/50 hover:bg-white/8 transition-colors">
              Cancel
            </button>
          </div>

          {connected && (
            <button onClick={onDisconnect}
              className="w-full rounded-xl border border-[#ff4d7d]/20 bg-[#ff4d7d]/8 py-2 text-sm font-bold text-[#ff4d7d] hover:bg-[#ff4d7d]/15 transition-colors">
              Disconnect {def.label}
            </button>
          )}
        </div>
      )}

      {/* ── Call-to-action when collapsed and not connected ── */}
      {!expanded && !connected && (
        <button onClick={() => setExpanded(true)}
          className="mx-4 mb-4 rounded-xl border border-white/8 bg-white/4 py-2 text-xs font-bold text-white/40 hover:bg-white/8 hover:text-white/70 transition-all">
          + Connect {def.label}
        </button>
      )}
    </div>
  );
}

// ─── Shared sub-components (unchanged from original) ──────────────────────────
function SettingsSection({ icon: Icon, eyebrow, title, children, className = '' }) {
  return (
    <section className={`rounded-[1.5rem] border border-white/10 bg-[#0b111a]/92 p-5 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-6 ${className}`}>
      <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-[#7df3cc]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/40">{eyebrow}</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-white">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReadOnlyCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
        <Icon className="h-4 w-4 text-[#7df3cc]" />{label}
      </div>
      <p className="min-h-7 break-words text-base font-black text-white">{value}</p>
    </div>
  );
}

function EditableCard({ field, displayValue, onEdit }) {
  const Icon = field.icon;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition focus-within:border-[#10c7a1]/45 focus-within:bg-white/[0.07]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
            <Icon className="h-4 w-4 text-[#7df3cc]" />{field.label}
          </span>
          <p className="min-h-12 break-words rounded-xl border border-transparent py-3 text-base font-black text-white/88">
            {displayValue || 'Not set'}
          </p>
        </div>
        <button type="button" onClick={onEdit} aria-label={`Edit ${field.label}`}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/62 transition hover:bg-white/10 hover:text-white">
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EditProfileModal({ field, currentValue, value, onChange, onCancel, onSave }) {
  if (!field) return null;
  const Icon = field.icon;
  const canSave = String(value || '').trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02040a]/72 px-4 backdrop-blur-xl">
      <div className="w-full max-w-lg rounded-[1.5rem] border border-white/12 bg-[#0b111a] p-5 text-white shadow-[0_30px_100px_-35px_rgba(0,0,0,0.95)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#10c7a1]/25 bg-[#10c7a1]/10 text-[#7df3cc]">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/38">Edit Profile</p>
              <h3 className="mt-1 text-2xl font-black">{field.label}</h3>
            </div>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close edit dialog"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/62 transition hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/38">Current value</span>
            <input
              type="text"
              value={currentValue || 'Not set'}
              readOnly
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-bold text-white/62 outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#7df3cc]/70">New value</span>
            <input
              name={field.key}
              type={field.type}
              value={value || ''}
              onChange={onChange}
              placeholder={field.placeholder}
              autoComplete={field.key === 'password' ? 'new-password' : 'off'}
              className="h-12 w-full rounded-xl border border-white/10 bg-[#080d15] px-4 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-[#10c7a1]/55"
              autoFocus
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/62 transition hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10c7a1] px-4 py-3 text-sm font-black text-[#06110f] transition hover:bg-[#7df3cc] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function SupportRow({ title, copy }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-white/52">{copy}</p>
    </div>
  );
}

function AssistantToggle({ title, copy, checked, onChange, compact = false }) {
  return (
    <div className={`flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] ${compact ? 'flex-col p-4' : 'flex-col p-5 sm:flex-row sm:items-center sm:justify-between'}`}>
      <div className="min-w-0">
        <h4 className={`${compact ? 'text-sm' : 'text-xl'} font-black text-white`}>{title}</h4>
        <p className="mt-2 text-sm leading-6 text-white/56">{copy}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked}
        onClick={onChange}
        className={`relative h-9 w-16 shrink-0 rounded-full border p-1 transition ${checked ? 'border-[#10c7a1]/45 bg-[#10c7a1]' : 'border-white/12 bg-white/10'}`}>
        <span className={`block h-7 w-7 rounded-full bg-white shadow-lg transition ${checked ? 'translate-x-7' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function StatusPill({ active, label }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ${active ? 'border-[#10c7a1]/25 bg-[#10c7a1]/10 text-[#7df3cc]' : 'border-white/10 bg-white/[0.045] text-white/38'}`}>
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-[#10c7a1] shadow-[0_0_10px_rgba(16,199,161,0.8)]' : 'bg-white/30'}`} />
      {label}
    </span>
  );
}

function maskPassword(password) { return password ? '........' : 'Not set'; }

export default Settings;
