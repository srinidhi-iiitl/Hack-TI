import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  Activity, Bot, CalendarDays, Check, CircleHelp, Code2, CreditCard,
  Globe, LockKeyhole, LogOut, Mail, Network, Pencil,
  Phone, Save, ShieldCheck, UserRound, X, Wifi, WifiOff, RefreshCw,
  AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp,
  Zap, Briefcase, Palette,
} from 'lucide-react';
import { getSettings, updateSettings } from '../services/voiceAssistantService';
import { useTheme } from '../context/ThemeContext';
import { logoutUser } from '../features/auth/authThunks';
import { loginSuccess } from '../features/auth/authSlice';
import {
  disconnectCareerIntegration,
  fetchCareerIntegrations,
  normalizeCareerDomain,
  saveCareerIntegrations,
  selectCareerDomainIntegrations,
} from '../features/careerIntegrations/careerIntegrationSlice';
import {
  disconnectHealthIntegration,
  fetchHealthIntegration,
  saveHealthIntegration,
} from '../features/healthIntegration/healthIntegrationSlice';
import { getHealthProviderLabel } from '../services/healthIntegrationApi.js';
import { useIntegrations } from '../context/IntegrationContext';
import { fetchCareerIntegrationStats, getCareerProfileLabel } from '../utils/careerIntegrationStats';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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

const CAREER_LINK_ROWS = {
  software: [
    { key: 'github', label: 'GitHub', icon: Code2, placeholder: 'https://github.com/anjali', metrics: ['Repositories', 'Followers', 'Stars'] },
    { key: 'leetcode', label: 'LeetCode', icon: Zap, placeholder: 'https://leetcode.com/u/anjali', metrics: ['Problems Solved', 'Contest Rating', 'Rank'] },
    { key: 'linkedin', label: 'LinkedIn', icon: Network, placeholder: 'https://linkedin.com/in/anjali', metrics: ['Profile URL', 'Professional Network'] },
  ],
  business: [
    { key: 'linkedin', label: 'LinkedIn', icon: Network, placeholder: 'https://linkedin.com/in/anjali', metrics: ['Network strength'] },
    { key: 'portfolio', label: 'Professional Portfolio / Personal Website', icon: Globe, placeholder: 'https://your-portfolio.com', metrics: ['Content count', 'Activity'] },
    { key: 'businessProfile', label: 'MBA / Business Profile Link', icon: Briefcase, placeholder: 'https://medium.com/@your-name', metrics: ['Professional presence'] },
  ],
  creative: [
    { key: 'portfolio', label: 'Portfolio Website', icon: Globe, placeholder: 'https://your-portfolio.com', metrics: ['Projects'] },
    { key: 'linkedin', label: 'LinkedIn', icon: Network, placeholder: 'https://linkedin.com/in/anjali', metrics: ['Professional profile'] },
    { key: 'behance', label: 'Behance / Dribbble', icon: Palette, placeholder: 'https://behance.net/your-name or https://dribbble.com/your-name', metrics: ['Creative work', 'Design shots'] },
  ],
};

const CAREER_DOMAIN_NAMES = {
  software: 'Software & Coding',
  business: 'Business & MBA',
  creative: 'Creative & Design',
};

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
  const { theme } = useTheme();
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { integrations, saveIntegration, disconnectIntegration, loading: intLoading, refreshIntegrations } = useIntegrations();
  const careerIntegrations = useSelector((state) => state.careerIntegrations);
  const [selectedCareerDomain, setSelectedCareerDomain] = useState(() => localStorage.getItem('career_domain') || 'coding');
  const selectedCareerIntegrations = useMemo(
    () => selectCareerDomainIntegrations({ careerIntegrations }, selectedCareerDomain),
    [careerIntegrations, selectedCareerDomain],
  );
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

  useEffect(() => {
    const syncCareerDomain = () => {
      setSelectedCareerDomain(localStorage.getItem('career_domain') || 'coding');
    };

    window.addEventListener('storage', syncCareerDomain);
    window.addEventListener('career-domain-updated', syncCareerDomain);
    return () => {
      window.removeEventListener('storage', syncCareerDomain);
      window.removeEventListener('career-domain-updated', syncCareerDomain);
    };
  }, []);

  const initials = useMemo(() =>
    profile.fullName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase(),
    [profile.fullName]);

  const handleChange = e => {
    const { name, value } = e.target;
    setDraft(c => ({ ...c, [name]: value }));
  };

  const persistProfile = (nextProfile) => {
    const safeProfile = { ...nextProfile };
    delete safeProfile.password;
    delete safeProfile.currentPassword;
    delete safeProfile.confirmPassword;
    const savedUser = { ...readJson('user', {}), ...safeProfile, password: '' };
    localStorage.setItem('user', JSON.stringify(savedUser));
    const token = localStorage.getItem('authToken');
    if (token) dispatch(loginSuccess({ token, user: savedUser }));
  };

  const saveProfile = async (keys) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      showToast('Please log in again to save changes');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (keys.includes('password')) {
        const oldPassword = String(draft.currentPassword || '');
        const newPassword = String(draft.password || '');
        const confirmPassword = String(draft.confirmPassword || '');

        if (!oldPassword || !newPassword || !confirmPassword) {
          showToast('Enter current password, new password, and confirmation');
          return;
        }

        await axios.put(`${API_BASE_URL}/api/auth/change-password`, { oldPassword, newPassword, confirmPassword }, { headers });
        const next = { ...profile, password: '', passwordSet: true };
        persistProfile(next);
        setProfile(next);
        setDraft(next);
        setEditing('');
        showToast('Password updated');
        return;
      }

      const next = keys.reduce((u, k) => ({ ...u, [k]: typeof draft[k] === 'string' ? draft[k].trim() : draft[k] }), { ...profile });
      const response = await axios.put(
        `${API_BASE_URL}/api/auth/profile`,
        { email: next.email, phone: next.phone, dob: next.dob },
        { headers },
      );
      const saved = normalizeBackendProfile(response.data?.data || next, {});
      persistProfile(saved);
      setProfile(saved);
      setDraft(saved);
      setEditing('');
      showToast('Changes saved');
    } catch (error) {
      showToast(error?.response?.data?.message || 'Could not save changes');
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
    await dispatch(saveCareerIntegrations({ domain: selectedCareerDomain, links })).unwrap();
    showToast('Career integrations saved');
  };

  const handleDisconnectCareerIntegration = async (provider) => {
    await dispatch(disconnectCareerIntegration({ domain: selectedCareerDomain, provider })).unwrap();
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
    <div className={`min-h-[calc(100vh-112px)] px-4 py-6 sm:px-6 lg:px-8 transition-colors duration-200 ${
      theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#05070d] text-white'
    }`}>
      <div className="pointer-events-none fixed inset-0 left-[20rem] bg-[radial-gradient(circle_at_16%_0%,rgba(255,122,0,0.12),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(16,199,161,0.10),transparent_30%),linear-gradient(135deg,rgba(123,97,255,0.08),transparent_34%)]" />

      <div className="relative mx-auto max-w-7xl space-y-6">

        {/* ── Hero header ── */}
        <section className={`relative overflow-hidden rounded-[1.75rem] border p-6 transition-all duration-200 sm:p-8 ${
          theme === 'light'
            ? 'border-slate-200 bg-white shadow-sm'
            : 'border-white/10 bg-[#080d15]/95 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)]'
        }`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(255,122,0,0.18),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(123,97,255,0.18),transparent_28%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[1.5rem] border border-white/15 bg-gradient-to-br from-[#ff7a00] via-[#ff007f] to-[#7b61ff] p-[2px] shadow-[0_18px_45px_-24px_rgba(255,0,127,0.95)]">
                <div className={`grid h-full w-full place-items-center rounded-[calc(1.5rem-2px)] text-3xl font-black ${
                  theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#080d15] text-white'
                }`}>{initials || 'DT'}</div>
              </div>
              <div>
                {/* <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7df3cc]/70">Settings</p> */}
                <h2 className={`mt-2 text-3xl font-black tracking-tight sm:text-5xl ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{profile.fullName}</h2>
                <p className={`mt-3 max-w-2xl text-sm leading-6 ${
                  theme === 'light' ? 'text-slate-600' : 'text-white/60'
                }`}>Profile, integrations, assistant, and session controls.</p>
              </div>
            </div>
            {savedMessage && (
              <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                theme === 'light'
                  ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#0f9f80]'
                  : 'border-[#10c7a1]/25 bg-[#10c7a1]/12 text-[#7df3cc]'
              }`}>
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
                      onEdit={() => { setDraft(field.key === 'password' ? { ...profile, currentPassword: '', password: '', confirmPassword: '' } : profile); setEditing(field.key); }}
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
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                      theme === 'light'
                        ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#0f9f80] hover:bg-[#10c7a1]/15'
                        : 'border-[#10c7a1]/25 bg-[#10c7a1]/10 text-[#7df3cc] hover:bg-[#10c7a1]/15'
                    }`}>
                    <Mail className="h-4 w-4" />Email Support
                  </a>
                </div>
              </SettingsSection>
            </aside>
          </div>

          <SettingsSection icon={Network} eyebrow="Career" title="Career Integrations">
            <CareerIntegrationsSettings
              integrations={careerIntegrations}
              domain={selectedCareerDomain}
              domainIntegrations={selectedCareerIntegrations}
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
              <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-white/50'}`}>
                Connect your accounts once — data flows to Dashboard, Health, Career, and Finance automatically.
              </p>
              <button onClick={refreshIntegrations} disabled={intLoading}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                  theme === 'light'
                    ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
                }`}>
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
            <div className={`space-y-4 rounded-2xl border p-5 ${
              theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
            }`}>
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
              <div className={`flex flex-wrap gap-2 border-t pt-4 ${
                theme === 'light' ? 'border-slate-200' : 'border-white/10'
              }`}>
                <StatusPill active={settings.twinAssistantEnabled} label={settings.twinAssistantEnabled ? 'Active' : 'Inactive'} />
                <StatusPill active={settings.twinAssistantEnabled && (settings.twinAssistantPreferences?.backgroundListening ?? true)} label={settings.twinAssistantEnabled ? 'Listening' : 'Not Listening'} />
              </div>
            </div>
          </SettingsSection>

          {/* ── Logout ── */}
          <SettingsSection icon={Mail} eyebrow="Notifications" title="Website And Email Alerts">
            <div className={`flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
              theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
            }`}>
              <div className="max-w-3xl">
                <h4 className={`text-xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Email Notifications</h4>
                <p className={`mt-2 text-sm leading-6 ${theme === 'light' ? 'text-slate-600' : 'text-white/56'}`}>
                  Send the same Digital Twin alerts to your registered email address while keeping them visible inside the app.
                </p>
              </div>
              <button type="button" role="switch" aria-checked={settings.notificationPreferences?.emailNotifications ?? true}
                onClick={handleEmailNotificationsToggle}
                className={`relative h-9 w-16 shrink-0 rounded-full border p-1 transition ${(settings.notificationPreferences?.emailNotifications ?? true) ? 'border-[#10c7a1]/45 bg-[#10c7a1]' : (theme === 'light' ? 'border-slate-200 bg-slate-100' : 'border-white/12 bg-white/10')}`}>
                <span className={`block h-7 w-7 rounded-full bg-white shadow-lg transition ${(settings.notificationPreferences?.emailNotifications ?? true) ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>
          </SettingsSection>

          {/* ── Appearance ── */}
          <AppearanceSection />

          <section className={`mx-auto max-w-2xl rounded-[1.5rem] border p-5 text-center transition-all duration-200 sm:p-6 ${
            theme === 'light'
              ? 'border-slate-200 bg-white shadow-sm text-slate-900'
              : 'border-[#ff007f]/25 bg-[#0b111a]/92 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl'
          }`}>
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${
              theme === 'light'
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-[#ff007f]/25 bg-[#ff007f]/10 text-[#ff8fbd]'
            }`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className={`text-xs font-bold uppercase tracking-[0.24em] ${
              theme === 'light' ? 'text-red-500' : 'text-[#ff8fbd]/75'
            }`}>Logout</p>
            <h3 className={`mt-2 text-2xl font-black tracking-tight ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>End Session</h3>
            <p className={`mx-auto mt-3 max-w-md text-sm leading-6 ${
              theme === 'light' ? 'text-slate-600' : 'text-white/50'
            }`}>Securely close this account session.</p>
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
          draft={draft}
          onChange={handleChange}
          onCancel={() => { setDraft(profile); setEditing(''); }}
          onSave={() => saveProfile([editing])}
        />
      )}
    </div>
  );
}

function CareerIntegrationsSettings({ integrations, domain, domainIntegrations, onSave, onDisconnect, onRefresh }) {
  const domainKey = normalizeCareerDomain(domain);
  const rows = CAREER_LINK_ROWS[domainKey] || CAREER_LINK_ROWS.software;
  const [draft, setDraft] = useState(() => buildCareerDraft(rows, domainIntegrations));
  const [savingKey, setSavingKey] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [statsByKey, setStatsByKey] = useState({});
  const [statsLoading, setStatsLoading] = useState({});

  useEffect(() => {
    setDraft(buildCareerDraft(rows, domainIntegrations));
    setEditingKey('');
  }, [domainKey, domainIntegrations]);

  useEffect(() => {
    let cancelled = false;

    ['github', 'leetcode'].forEach((key) => {
      const profileUrl = domainIntegrations[key]?.profileUrl || '';
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
  }, [domainIntegrations.github?.profileUrl, domainIntegrations.leetcode?.profileUrl]);

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

  const { theme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className={`text-sm ${theme === 'light' ? 'text-slate-600' : 'text-white/50'}`}>
          Showing integrations for {CAREER_DOMAIN_NAMES[domainKey] || 'Software & Coding'}.
        </p>
        <button type="button" onClick={onRefresh} disabled={integrations.loading}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
            theme === 'light'
              ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/8 hover:text-white'
          }`}>
          <RefreshCw className={`h-3.5 w-3.5 ${integrations.loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {rows.map((row) => {
          const Icon = row.icon;
          const value = domainIntegrations[row.key]?.profileUrl || '';
          const connected = Boolean(value);
          const saving = savingKey === row.key || integrations.saving;
          const editing = editingKey === row.key || !connected;
          const stats = statsByKey[row.key];

          return (
            <div key={row.key} className={`rounded-2xl border p-4 transition-all duration-200 ${
              theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
            }`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                    theme === 'light' ? 'border-slate-200 bg-white text-[#10c7a1]' : 'border-white/10 bg-white/8 text-[#7df3cc]'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className={`text-base font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{row.label}</h4>
                    <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.16em] ${connected ? 'text-[#10c7a1]' : (theme === 'light' ? 'text-slate-400' : 'text-white/32')}`}>
                      {connected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {connected && (
                  <button type="button" onClick={() => setEditingKey(row.key)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                      theme === 'light'
                        ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white'
                    }`}>
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>

              {connected && row.key === 'github' && (
                <StatsChips
                  loading={statsLoading.github}
                  items={[
                    ['Username', stats?.username || domainIntegrations.github?.username],
                    ['Repositories', stats?.repositories],
                    ['Followers', stats?.followers],
                    ['Stars', stats?.stars],
                  ]}
                />
              )}

              {connected && row.key === 'leetcode' && (
                <StatsChips
                  loading={statsLoading.leetcode}
                  items={[
                    ['Problems Solved', stats?.solved],
                    ['Contest Rating', stats?.contestRating],
                    ['Rank', stats?.rank],
                  ]}
                />
              )}

              {connected && !['github', 'leetcode'].includes(row.key) && (
                <StatsChips
                  loading={false}
                  items={(row.metrics || []).map((metric) => [metric, 'Connected'])}
                />
              )}

              {connected && value && (
                <a href={value} target="_blank" rel="noreferrer"
                  className={`mb-3 block truncate rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    theme === 'light'
                      ? 'border-[#10c7a1]/30 bg-[#10c7a1]/5 text-[#0f9f80] hover:text-[#10c7a1]'
                      : 'border-white/8 bg-white/[0.03] text-[#7df3cc]/70 hover:text-[#7df3cc]'
                  }`}>
                  Profile: {getCareerProfileLabel(row.key, value)}
                </a>
              )}

              {editing && (
                <input
                  value={draft[row.key]}
                  onChange={(event) => setDraft((current) => ({ ...current, [row.key]: event.target.value }))}
                  placeholder={row.placeholder}
                  className={`h-11 w-full rounded-xl border px-3 text-base font-semibold outline-none transition ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#10c7a1]/70'
                      : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/20 focus:border-[#10c7a1]/45'
                  }`}
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
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                      editing ? '' : 'w-full'
                    } ${
                      theme === 'light'
                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                        : 'border-[#ff4d7d]/20 bg-[#ff4d7d]/8 text-[#ff4d7d] hover:bg-[#ff4d7d]/15'
                    }`}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {integrations.error && (
        <p className={`rounded-xl border px-3 py-2 text-sm ${
          theme === 'light' ? 'border-red-200 bg-red-50 text-red-600' : 'border-[#ff4d7d]/20 bg-[#ff4d7d]/8 text-[#ff8fbd]'
        }`}>{integrations.error}</p>
      )}
    </div>
  );
}

function buildCareerDraft(rows, integrations = {}) {
  return rows.reduce((draft, row) => {
    draft[row.key] = integrations[row.key]?.profileUrl || '';
    return draft;
  }, {});
}

function providerLabel(provider) {
  return ({
    github: 'GitHub',
    leetcode: 'LeetCode',
    linkedin: 'LinkedIn',
    portfolio: 'Portfolio',
    businessProfile: 'Business Profile',
    behance: 'Behance / Dribbble',
  })[provider] || provider;
}

function HealthIntegrationSettings({ integration, onSave, onDisconnect, onRefresh }) {
  const { theme } = useTheme();
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
    <div className={`rounded-2xl border p-4 transition-all duration-200 ${
      theme === 'light' ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-white/[0.045]'
    }`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
            theme === 'light' ? 'border-slate-200 bg-white text-[#34d399]' : 'border-white/10 bg-white/8 text-[#34d399]'
          }`}>
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <h4 className={`text-base font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Health Device</h4>
            <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.16em] ${integration.connected ? 'text-[#10c7a1]' : (theme === 'light' ? 'text-slate-400' : 'text-white/32')}`}>
              {integration.connected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        <button type="button" onClick={onRefresh} disabled={integration.loading}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
            theme === 'light'
              ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/8 hover:text-white'
          }`}>
          <RefreshCw className={`h-3.5 w-3.5 ${integration.loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {integration.connected && (
        <div className={`mb-3 grid gap-2 text-sm md:grid-cols-3 ${theme === 'light' ? 'text-slate-600' : 'text-white/62'}`}>
          <div className={`rounded-xl border px-3 py-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/8 bg-white/[0.03]'}`}>
            Provider: {getHealthProviderLabel(integration.integrationLink, integration.provider)}
          </div>
          <div className={`rounded-xl border px-3 py-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/8 bg-white/[0.03]'}`}>Status: Synced</div>
          <div className={`rounded-xl border px-3 py-2 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/8 bg-white/[0.03]'}`}>
            Last Sync: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Not synced'}
          </div>
        </div>
      )}

      {integration.connected && integration.integrationLink && !editing && (
        <p className={`mb-3 truncate rounded-xl border px-3 py-2 text-sm font-semibold transition ${
          theme === 'light' ? 'border-[#34d399]/35 bg-[#34d399]/5 text-[#10c7a1]' : 'border-white/8 bg-white/[0.03] text-[#7df3cc]/70'
        }`}>
          {integration.integrationLink}
        </p>
      )}

      {editing && (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="https://gargi-fitband/user/12345"
          className={`h-11 w-full rounded-xl border px-3 text-base font-semibold outline-none transition ${
            theme === 'light'
              ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#10c7a1]'
              : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/20 focus:border-[#10c7a1]/45'
          }`}
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
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white'
            }`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
        {integration.connected && (
          <button type="button" onClick={onDisconnect} disabled={integration.saving}
            className={`rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
              theme === 'light'
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                : 'border-[#ff4d7d]/20 bg-[#ff4d7d]/8 text-[#ff4d7d] hover:bg-[#ff4d7d]/15'
            }`}>
            Disconnect
          </button>
        )}
      </div>

      {integration.error && (
        <p className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
          theme === 'light' ? 'border-red-200 bg-red-50 text-red-600' : 'border-[#ff4d7d]/20 bg-[#ff4d7d]/8 text-[#ff8fbd]'
        }`}>{integration.error}</p>
      )}
    </div>
  );
}

function StatsChips({ loading, items }) {
  const { theme } = useTheme();
  if (loading) {
    return (
      <div className="mb-3 flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
          theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-white/10 bg-white/5 text-white/40'
        }`}>
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
          <span key={label} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all duration-200 ${
            theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-white/10 bg-white/6 text-white/62'
          }`}>
            {label}: {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        ))}
    </div>
  );
}

// ─── IntegrationCard ─────────────────────────────────────────────────────────
function IntegrationCard({ def, state, onConnect, onDisconnect }) {
  const { theme } = useTheme();
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
      className={`flex flex-col rounded-2xl border transition-all duration-200 ${
        theme === 'light'
          ? connected
            ? ''
            : 'border-slate-200 bg-slate-50/50'
          : connected
            ? ''
            : 'border-white/[0.08] bg-white/[0.03]'
      }`}
      style={{
        borderColor: connected ? def.border : undefined,
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
            <h4 className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{def.label}</h4>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#10c7a1]/30 bg-[#10c7a1]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#10c7a1]">
                <CheckCircle2 className="h-2.5 w-2.5" />Connected
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-white/10 bg-white/5 text-white/35'
              }`}>
                <WifiOff className="h-2.5 w-2.5" />Not connected
              </span>
            )}
          </div>

          {/* Pages this affects */}
          <div className="mt-1 flex flex-wrap gap-1">
            {def.pages.map(p => (
              <span key={p} className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-white/8 bg-white/5 text-white/30'
              }`}>
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Expand / collapse */}
        <button onClick={() => setExpanded(e => !e)}
          className={`shrink-0 h-7 w-7 rounded-lg border flex items-center justify-center transition-colors ${
            theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800' : 'border-white/10 bg-white/5 text-white/40 hover:text-white'
          }`}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Stats row (when connected and data exists) ── */}
      {connected && stats.length > 0 && (
        <div className={`mx-4 mb-3 grid grid-cols-3 gap-2 rounded-xl border p-3 ${
          theme === 'light' ? 'border-slate-200 bg-slate-100/50' : 'border-white/8 bg-black/20'
        }`}>
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-[9px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-white/35'}`}>{s.label}</p>
              <p className={`mt-0.5 text-sm font-black ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Connected identity ── */}
      {connected && (state.username || state.profileLink || state.url) && (
        <div className={`mx-4 mb-3 flex items-center justify-between rounded-xl border px-3 py-2 ${
          theme === 'light' ? 'border-[#10c7a1]/20 bg-[#10c7a1]/5' : 'border-white/8 bg-white/[0.03]'
        }`}>
          <span className={`text-xs truncate max-w-[70%] ${theme === 'light' ? 'text-slate-600' : 'text-white/50'}`}>
            {state.username || state.profileLink || state.url}
          </span>
          <button onClick={onDisconnect}
            className={`text-[10px] font-bold transition-colors underline underline-offset-2 ${
              theme === 'light' ? 'text-red-500 hover:text-red-700' : 'text-[#ff4d7d]/70 hover:text-[#ff4d7d]'
            }`}>
            Disconnect
          </button>
        </div>
      )}

      {/* ── Expanded connect form ── */}
      {expanded && (
        <div className={`border-t p-4 space-y-3 ${theme === 'light' ? 'border-slate-200' : 'border-white/8'}`}>
          <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-white/45'}`}>{def.description}</p>

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
              className={`h-11 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition-colors ${
                theme === 'light'
                  ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#10c7a1]'
                  : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/20 focus:border-white/25'
              }`}
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
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/8'
              }`}>
              Cancel
            </button>
          </div>

          {connected && (
            <button onClick={onDisconnect}
              className={`w-full rounded-xl border py-2 text-sm font-bold transition-colors ${
                theme === 'light' ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'border-[#ff4d7d]/20 bg-[#ff4d7d]/8 text-[#ff4d7d] hover:bg-[#ff4d7d]/15'
              }`}>
              Disconnect {def.label}
            </button>
          )}
        </div>
      )}

      {/* ── Call-to-action when collapsed and not connected ── */}
      {!expanded && !connected && (
        <button onClick={() => setExpanded(true)}
          className={`mx-4 mb-4 rounded-xl border py-2 text-xs font-bold transition-all ${
            theme === 'light'
              ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
              : 'border-white/8 bg-white/4 text-white/40 hover:bg-white/8 hover:text-white/70'
          }`}>
          + Connect {def.label}
        </button>
      )}
    </div>
  );
}

// ── Appearance Section ──────────────────────────────────────────────────────
function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options = [
    {
      id: 'dark',
      label: 'Dark Mode',
      description: 'Default deep-dark interface. Easy on the eyes at night.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'light',
      label: 'Light Mode',
      description: 'Clean, bright interface. Great for well-lit environments.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </svg>
      ),
    },
  ];

  return (
    <SettingsSection icon={Palette} eyebrow="Appearance" title="Theme">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const isActive = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              aria-pressed={isActive}
              className={`relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200 ${
                isActive
                  ? 'border-[#10c7a1]/50 bg-[#10c7a1]/10 shadow-[0_0_0_1px_rgba(16,199,161,0.25)]'
                  : theme === 'light'
                    ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100'
                    : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]'
              }`}
            >
              {/* Icon */}
              <span
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  isActive
                    ? `border-[#10c7a1]/30 bg-[#10c7a1]/15 ${theme === 'light' ? 'text-[#0f9f80]' : 'text-[#7df3cc]'}`
                    : theme === 'light'
                      ? 'border-slate-200 bg-white text-slate-400'
                      : 'border-white/10 bg-white/[0.055] text-white/50'
                }`}
              >
                {opt.icon}
              </span>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className={`text-base font-black transition-colors ${
                  theme === 'light'
                    ? isActive ? 'text-slate-900' : 'text-slate-600'
                    : isActive ? 'text-white' : 'text-white/70'
                }`}>
                  {opt.label}
                </p>
                <p className={`mt-1 text-sm leading-5 ${theme === 'light' ? 'text-slate-500' : 'text-white/45'}`}>{opt.description}</p>
              </div>

              {/* Active indicator */}
              {isActive && (
                <span className="absolute right-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#10c7a1] text-[#06110f]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className={`mt-3 text-xs ${theme === 'light' ? 'text-slate-400' : 'text-white/35'}`}>
        Your preference is saved locally and persists across sessions.
      </p>
    </SettingsSection>
  );
}

function SettingsSection({ icon: Icon, eyebrow, title, children, className = '' }) {
  const { theme } = useTheme();

  return (
    <section className={`rounded-[1.5rem] border ${
      theme === 'light'
        ? `border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`
        : `border-white/10 bg-[#0b111a]/92 p-5 shadow-[0_20px_60px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-6 ${className}`
    }`}>
      <div className={`mb-5 flex items-center gap-3 border-b pb-5 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
          theme === 'light'
            ? 'border-slate-200 bg-slate-50 text-[#10c7a1]'
            : 'border-white/10 bg-white/8 text-[#7df3cc]'
        }`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className={`text-xs font-bold uppercase tracking-[0.24em] ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>{eyebrow}</p>
          <h3 className={`mt-1 text-2xl font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReadOnlyCard({ icon: Icon, label, value }) {
  const { theme } = useTheme();

  return (
    <div className={`rounded-2xl border ${theme === 'light' ? 'border-slate-200 bg-slate-50/50 p-4' : 'border-white/10 bg-white/[0.045] p-4'}`}>
      <div className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
        <Icon className={`h-4 w-4 ${theme === 'light' ? 'text-[#10c7a1]' : 'text-[#7df3cc]'}`} />{label}
      </div>
      <p className={`min-h-7 break-words text-base font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function EditableCard({ field, displayValue, onEdit }) {
  const Icon = field.icon;
  const { theme } = useTheme();

  return (
    <div className={`rounded-2xl border transition ${
      theme === 'light'
        ? 'border-slate-200 bg-slate-50/50 p-4 transition focus-within:border-[#10c7a1] focus-within:bg-slate-100'
        : 'border-white/10 bg-white/[0.045] p-4 transition focus-within:border-[#10c7a1]/45 focus-within:bg-white/[0.07]'
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
            <Icon className={`h-4 w-4 ${theme === 'light' ? 'text-[#10c7a1]' : 'text-[#7df3cc]'}`} />{field.label}
          </span>
          <p className={`min-h-12 break-words rounded-xl border border-transparent py-3 text-base font-black ${theme === 'light' ? 'text-slate-900' : 'text-white/88'}`}>
            {displayValue || 'Not set'}
          </p>
        </div>
        <button type="button" onClick={onEdit} aria-label={`Edit ${field.label}`}
          className={theme === 'light'
            ? 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-800'
            : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/62 transition hover:bg-white/10 hover:text-white'
          }>
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EditProfileModal({ field, currentValue, value, draft = {}, onChange, onCancel, onSave }) {
  if (!field) return null;
  const Icon = field.icon;
  const isPassword = field.key === 'password';
  const canSave = isPassword
    ? Boolean(draft.currentPassword && draft.password && draft.confirmPassword)
    : String(value || '').trim().length > 0;
  const { theme } = useTheme();

  return (
    <div className={theme === 'light'
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md'
      : 'fixed inset-0 z-50 flex items-center justify-center bg-[#02040a]/72 px-4 backdrop-blur-xl'
    }>
      <div className={theme === 'light'
        ? 'w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-xl sm:p-6'
        : 'w-full max-w-lg rounded-[1.5rem] border border-white/12 bg-[#0b111a] p-5 text-white shadow-[0_30px_100px_-35px_rgba(0,0,0,0.95)] sm:p-6'
      }>
        <div className={`mb-5 flex items-start justify-between gap-4 border-b pb-5 ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
              theme === 'light'
                ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#0f9f80]'
                : 'border-[#10c7a1]/25 bg-[#10c7a1]/10 text-[#7df3cc]'
            }`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.22em] ${theme === 'light' ? 'text-slate-400' : 'text-white/38'}`}>Edit Profile</p>
              <h3 className="mt-1 text-2xl font-black">{field.label}</h3>
            </div>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close edit dialog"
            className={theme === 'light'
              ? 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800'
              : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/62 transition hover:bg-white/10 hover:text-white'
            }>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {isPassword ? (
            <>
              <label className="block">
                <span className={`mb-2 block text-xs font-bold uppercase tracking-[0.18em] ${theme === 'light' ? 'text-slate-400' : 'text-white/38'}`}>Current password</span>
                <input
                  name="currentPassword"
                  type="password"
                  value={draft.currentPassword || ''}
                  onChange={onChange}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  className={`h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none focus:border-[#10c7a1]/55 ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                      : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/25'
                  }`}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className={`mb-2 block text-xs font-bold uppercase tracking-[0.18em] ${theme === 'light' ? 'text-[#0f9f80]' : 'text-[#7df3cc]/70'}`}>New password</span>
                <input
                  name="password"
                  type="password"
                  value={draft.password || ''}
                  onChange={onChange}
                  placeholder="New password"
                  autoComplete="new-password"
                  className={`h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none focus:border-[#10c7a1]/55 ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                      : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/25'
                  }`}
                />
              </label>
              <label className="block">
                <span className={`mb-2 block text-xs font-bold uppercase tracking-[0.18em] ${theme === 'light' ? 'text-[#0f9f80]' : 'text-[#7df3cc]/70'}`}>Confirm new password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  value={draft.confirmPassword || ''}
                  onChange={onChange}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className={`h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none focus:border-[#10c7a1]/55 ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                      : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/25'
                  }`}
                />
              </label>
            </>
          ) : (
            <>
              <label className="block">
                <span className={`mb-2 block text-xs font-bold uppercase tracking-[0.18em] ${theme === 'light' ? 'text-slate-400' : 'text-white/38'}`}>Current value</span>
                <input
                  type="text"
                  value={currentValue || 'Not set'}
                  readOnly
                  className={`h-12 w-full rounded-xl border px-4 text-sm font-bold outline-none ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-100 text-slate-600'
                      : 'border-white/10 bg-white/[0.045] text-white/62'
                  }`}
                />
              </label>

              <label className="block">
                <span className={`mb-2 block text-xs font-bold uppercase tracking-[0.18em] ${theme === 'light' ? 'text-[#0f9f80]' : 'text-[#7df3cc]/70'}`}>New value</span>
                <input
                  name={field.key}
                  type={field.type}
                  value={value || ''}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  className={`h-12 w-full rounded-xl border px-4 text-sm font-semibold outline-none focus:border-[#10c7a1]/55 ${
                    theme === 'light'
                      ? 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                      : 'border-white/10 bg-[#080d15] text-white placeholder:text-white/25'
                  }`}
                  autoFocus
                />
              </label>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel}
            className={theme === 'light'
              ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800'
              : 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/62 transition hover:bg-white/10 hover:text-white'
            }>
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={!canSave}
            className={theme === 'light'
              ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#10c7a1] px-4 py-3 text-sm font-black text-[#06110f] transition hover:bg-[#7df3cc] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
              : 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#10c7a1] px-4 py-3 text-sm font-black text-[#06110f] transition hover:bg-[#7df3cc] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30'
            }>
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function SupportRow({ title, copy }) {
  const { theme } = useTheme();

  return (
    <div className={`rounded-2xl border ${theme === 'light' ? 'border-slate-200 bg-slate-50/50 p-4' : 'border-white/10 bg-white/[0.045] p-4'}`}>
      <p className={`text-sm font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{title}</p>
      <p className={`mt-2 text-sm leading-6 ${theme === 'light' ? 'text-slate-600' : 'text-white/52'}`}>{copy}</p>
    </div>
  );
}

function AssistantToggle({ title, copy, checked, onChange, compact = false }) {
  const { theme } = useTheme();

  return (
    <div className={theme === 'light'
      ? `flex gap-4 rounded-2xl border border-slate-200 bg-white ${compact ? 'flex-col p-4' : 'flex-col p-5 sm:flex-row sm:items-center sm:justify-between'}`
      : `flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] ${compact ? 'flex-col p-4' : 'flex-col p-5 sm:flex-row sm:items-center sm:justify-between'}`
    }>
      <div className="min-w-0">
        <h4 className={`${compact ? 'text-sm' : 'text-xl'} font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{title}</h4>
        <p className={`mt-2 text-sm leading-6 ${theme === 'light' ? 'text-slate-600' : 'text-white/56'}`}>{copy}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked}
        onClick={onChange}
        className={`relative h-9 w-16 shrink-0 rounded-full border p-1 transition ${checked ? 'border-[#10c7a1]/45 bg-[#10c7a1]' : (theme === 'light' ? 'border-slate-200 bg-slate-100' : 'border-white/12 bg-white/10')}`}>
        <span className={`block h-7 w-7 rounded-full bg-white shadow-lg transition ${checked ? 'translate-x-7' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function StatusPill({ active, label }) {
  const { theme } = useTheme();

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ${
      theme === 'light'
        ? active ? 'border-[#10c7a1]/25 bg-[#10c7a1]/10 text-[#0f9f80]' : 'border-slate-200 bg-slate-100 text-slate-500'
        : active ? 'border-[#10c7a1]/25 bg-[#10c7a1]/10 text-[#7df3cc]' : 'border-white/10 bg-white/[0.045] text-white/38'
    }`}>
      <span className={`h-2 w-2 rounded-full ${
        active ? 'bg-[#10c7a1] shadow-[0_0_10px_rgba(16,199,161,0.8)]' : (theme === 'light' ? 'bg-slate-300' : 'bg-white/30')
      }`} />
      {label}
    </span>
  );
}

function maskPassword(password) { return password ? '........' : 'Not set'; }

export default Settings;

