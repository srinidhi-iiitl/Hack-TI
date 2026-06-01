import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import {
  Activity,
  Bot,
  CalendarDays,
  Check,
  CircleHelp,
  Code2,
  CreditCard,
  ExternalLink,
  Globe,
  LockKeyhole,
  LogOut,
  Mail,
  Network,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { getSettings, updateSettings } from '../services/voiceAssistantService';
import { logoutUser } from '../features/auth/authThunks';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const editableFields = [
  { key: 'email', label: 'Email', type: 'email', icon: Mail, placeholder: 'you@example.com' },
  { key: 'phone', label: 'Phone number', type: 'tel', icon: Phone, placeholder: '+91 98765 43210' },
  { key: 'password', label: 'Password', type: 'password', icon: LockKeyhole, placeholder: 'New password' },
];

const platformFields = [
  { key: 'linkedin', label: 'LinkedIn', icon: Network, placeholder: 'https://linkedin.com/in/username' },
  { key: 'github', label: 'GitHub', icon: Code2, placeholder: 'https://github.com/username' },
  { key: 'portfolio', label: 'Portfolio', icon: Globe, placeholder: 'https://your-site.com' },
  { key: 'fitband', label: 'Fitband', icon: Activity, placeholder: 'Fitbit/Fitband profile or device link' },
  { key: 'banking', label: 'Bank link', icon: CreditCard, placeholder: 'Banking profile or Plaid link' },
];

function readJson(key, fallback = null) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function getInitialProfile() {
  const user = readJson('user', {}) || {};
  const onboarding = readJson('lifetwinOnboardingProfile', {}) || {};
  const links = user.links || user.platforms || onboarding.links || {};

  return {
    fullName: user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'DigitalTwin User',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phone || onboarding.phone || '',
    dob: user.dob || onboarding.dob || '',
    password: user.password || '',
    passwordSet: Boolean(user.password || user.passwordSet),
    linkedin: links.linkedin || user.linkedin || '',
    github: links.github || user.github || '',
    portfolio: links.portfolio || user.portfolio || '',
    fitband: links.fitband || links.fitbit || user.fitband || onboarding.fitbitProfile || '',
    banking: links.banking || links.bank || user.banking || onboarding.bankingProfile || '',
  };
}

function normalizeBackendProfile(user = {}, onboarding = {}) {
  const localProfile = getInitialProfile();
  const links = user.links || {};
  const fullName = user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();

  return {
    ...localProfile,
    fullName: fullName || localProfile.fullName,
    firstName: user.firstName || localProfile.firstName,
    lastName: user.lastName || localProfile.lastName,
    email: user.email || localProfile.email,
    phone: user.phone || onboarding.phone || localProfile.phone,
    dob: user.dob || onboarding.dob || localProfile.dob,
    password: '',
    passwordSet: Boolean(user.passwordSet || localProfile.passwordSet),
    linkedin: links.linkedin || onboarding.linkedinProfile || localProfile.linkedin,
    github: links.github || onboarding.githubUsername || localProfile.github,
    portfolio: links.portfolio || localProfile.portfolio,
    fitband: links.fitband || onboarding.fitbitProfile || localProfile.fitband,
    banking: links.banking || onboarding.bankingProfile || localProfile.banking,
  };
}

function Settings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(getInitialProfile);
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: true,
    twinAssistantEnabled: false,
  });

  useEffect(() => {
    let isMounted = true;

    const loadBackendProfile = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [authResult, onboardingResult, settingsResult] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/auth/profile`, { headers }),
          axios.get(`${API_BASE_URL}/api/dashboard`, { headers }),
          getSettings(),
        ]);

        if (!isMounted) return;

        const authUser = authResult.status === 'fulfilled' ? authResult.value.data?.data || {} : {};
        const onboardingProfile = onboardingResult.status === 'fulfilled' ? onboardingResult.value.data?.data?.profile || {} : {};
        const backendSettings = settingsResult.status === 'fulfilled'
          ? settingsResult.value
          : { theme: 'dark', notifications: true, twinAssistantEnabled: false };
        const nextProfile = normalizeBackendProfile(authUser, onboardingProfile);

        localStorage.setItem('user', JSON.stringify(nextProfile));
        localStorage.setItem('lifetwinOnboardingProfile', JSON.stringify(onboardingProfile));
        setProfile(nextProfile);
        setDraft(nextProfile);
        setSettings(backendSettings);
      } catch (error) {
        if (!isMounted) return;
        console.warn('Settings profile fallback:', error.response?.data?.message || error.message);
      }
    };

    loadBackendProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const initials = useMemo(
    () =>
      profile.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
    [profile.fullName],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const saveProfile = async (keys) => {
    const nextProfile = keys.reduce(
      (updated, key) => ({
        ...updated,
        [key]: typeof draft[key] === 'string' ? draft[key].trim() : draft[key],
      }),
      { ...profile },
    );
    if (keys.includes('password') && nextProfile.password) {
      nextProfile.passwordSet = true;
    }

    const storedUser = readJson('user', {}) || {};
    const storedOnboarding = readJson('lifetwinOnboardingProfile', {}) || {};
    const nextLinks = {
      linkedin: nextProfile.linkedin,
      github: nextProfile.github,
      portfolio: nextProfile.portfolio,
      fitband: nextProfile.fitband,
      banking: nextProfile.banking,
    };

    localStorage.setItem(
      'user',
      JSON.stringify({
        ...storedUser,
        fullName: nextProfile.fullName,
        name: nextProfile.fullName,
        email: nextProfile.email,
        phone: nextProfile.phone,
        dob: nextProfile.dob,
        password: nextProfile.password,
        links: nextLinks,
        passwordSet: nextProfile.passwordSet,
      }),
    );
    localStorage.setItem(
      'lifetwinOnboardingProfile',
      JSON.stringify({ ...storedOnboarding, phone: nextProfile.phone, dob: nextProfile.dob, links: nextLinks }),
    );

    try {
      const token = localStorage.getItem('authToken');
      if (token && !keys.includes('password')) {
        await axios.put(
          `${API_BASE_URL}/api/auth/profile`,
          {
            email: nextProfile.email,
            phone: nextProfile.phone,
            dob: nextProfile.dob,
            links: nextLinks,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      setProfile(nextProfile);
      setDraft(nextProfile);
      setEditing('');
      setSavedMessage(keys.includes('password') ? 'Password display updated' : 'Changes saved');
      window.setTimeout(() => setSavedMessage(''), 2200);
    } catch (error) {
      console.warn('Settings save fallback:', error.response?.data?.message || error.message);
      setSavedMessage('Saved locally');
      setProfile(nextProfile);
      setDraft(nextProfile);
      setEditing('');
      window.setTimeout(() => setSavedMessage(''), 2200);
    }
  };

  const startEdit = (key) => {
    setDraft(profile);
    setEditing(key);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setEditing('');
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/', { replace: true });
  };

  const handleTwinAssistantToggle = async () => {
    const nextEnabled = !settings.twinAssistantEnabled;
    const optimisticSettings = { ...settings, twinAssistantEnabled: nextEnabled };
    setSettings(optimisticSettings);

    try {
      const savedSettings = await updateSettings({ twinAssistantEnabled: nextEnabled });
      setSettings(savedSettings);
      window.dispatchEvent(new Event('twin-assistant-settings-updated'));
      setSavedMessage(nextEnabled ? 'Twin Assistant enabled' : 'Twin Assistant disabled');
    } catch (error) {
      setSettings(settings);
      setSavedMessage('Assistant setting could not be saved');
      console.warn('Twin Assistant setting save failed:', error.response?.data?.message || error.message);
    } finally {
      window.setTimeout(() => setSavedMessage(''), 2200);
    }
  };

  return (
    <div className="min-h-[calc(100vh-112px)] bg-[#05070d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 left-[20rem] bg-[radial-gradient(circle_at_16%_0%,rgba(255,122,0,0.12),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(16,199,161,0.10),transparent_30%),linear-gradient(135deg,rgba(123,97,255,0.08),transparent_34%)]" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080d15]/95 p-6 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.85)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(255,122,0,0.18),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(123,97,255,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_38%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[1.5rem] border border-white/15 bg-gradient-to-br from-[#ff7a00] via-[#ff007f] to-[#7b61ff] p-[2px] shadow-[0_18px_45px_-24px_rgba(255,0,127,0.95)]">
                <div className="grid h-full w-full place-items-center rounded-[calc(1.5rem-2px)] bg-[#080d15] text-3xl font-black">
                  {initials || 'DT'}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7df3cc]/70">Settings</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{profile.fullName}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
                  Manage your profile details, connected platforms, support options, and secure session.
                </p>
              </div>
            </div>

            {savedMessage && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#10c7a1]/25 bg-[#10c7a1]/12 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#7df3cc]">
                <Check className="h-4 w-4" />
                {savedMessage}
              </span>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <main className="h-full">
              <SettingsSection icon={UserRound} eyebrow="Profile" title="Profile Details" className="h-full">
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadOnlyCard icon={UserRound} label="Full name" value={profile.fullName || 'Not set'} />
                  <ReadOnlyCard icon={CalendarDays} label="Date of birth" value={profile.dob || 'Not set'} />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {editableFields.map((field) => (
                    <EditableCard
                      key={field.key}
                      field={field}
                      value={draft[field.key]}
                      displayValue={field.key === 'password' ? maskPassword(profile.passwordSet || profile.password) : profile[field.key]}
                      isEditing={editing === field.key}
                      onEdit={() => startEdit(field.key)}
                      onCancel={cancelEdit}
                      onChange={handleChange}
                      onSave={() => saveProfile([field.key])}
                    />
                  ))}
                </div>
              </SettingsSection>
            </main>

            <aside className="h-full">
              <SettingsSection icon={CircleHelp} eyebrow="Help" title="Help And Support" className="h-full">
                <div className="space-y-3">
                  <SupportRow title="Contact support" copy="Get help with your account, profile data, or connected links." />
                  <SupportRow title="Security help" copy="Review sign-in and password guidance for your Digital Twin account." />
                  <a
                    href="mailto:support@digitaltwin.app"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#10c7a1]/25 bg-[#10c7a1]/10 px-4 py-3 text-sm font-black text-[#7df3cc] transition hover:bg-[#10c7a1]/15"
                  >
                    <Mail className="h-4 w-4" />
                    Email Support
                  </a>
                </div>
              </SettingsSection>
            </aside>
          </div>

          <SettingsSection icon={ExternalLink} eyebrow="Platform" title="Connected Links">
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {platformFields.map((field) => (
                <EditableCard
                  key={field.key}
                  field={{ ...field, type: 'url' }}
                  value={draft[field.key]}
                  displayValue={profile[field.key]}
                  isEditing={editing === field.key}
                  onEdit={() => startEdit(field.key)}
                  onCancel={cancelEdit}
                  onChange={handleChange}
                  onSave={() => saveProfile([field.key])}
                />
              ))}
            </div>
          </SettingsSection>

          <SettingsSection icon={Bot} eyebrow="Voice Control" title="Twin Assistant">
            <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-3xl">
                <h4 className="text-xl font-black text-white">Twin Assistant</h4>
                <p className="mt-2 text-sm leading-6 text-white/56">
                  Enable or disable the Twin Voice Assistant. When enabled, users can control parts of the application using voice commands. When disabled, all actions must be performed manually.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.twinAssistantEnabled}
                onClick={handleTwinAssistantToggle}
                className={`relative h-9 w-16 shrink-0 rounded-full border p-1 transition ${
                  settings.twinAssistantEnabled
                    ? 'border-[#10c7a1]/45 bg-[#10c7a1]'
                    : 'border-white/12 bg-white/10'
                }`}
              >
                <span
                  className={`block h-7 w-7 rounded-full bg-white shadow-lg transition ${
                    settings.twinAssistantEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
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
            <button
              type="button"
              onClick={handleLogout}
              className="mx-auto mt-5 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#7b61ff] px-5 py-3 text-sm font-black text-white shadow-[0_20px_50px_-25px_rgba(255,0,127,0.9)] transition hover:-translate-y-0.5"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

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
        <Icon className="h-4 w-4 text-[#7df3cc]" />
        {label}
      </div>
      <p className="min-h-7 break-words text-base font-black text-white">{value}</p>
    </div>
  );
}

function EditableCard({ field, value, displayValue, isEditing, onEdit, onCancel, onChange, onSave }) {
  const Icon = field.icon;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition focus-within:border-[#10c7a1]/45 focus-within:bg-white/[0.07]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label className="min-w-0 flex-1">
          <span className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
            <Icon className="h-4 w-4 text-[#7df3cc]" />
            {field.label}
          </span>
          {isEditing ? (
            <input
              name={field.key}
              type={field.type}
              value={value}
              onChange={onChange}
              placeholder={field.placeholder}
              autoComplete={field.key === 'password' ? 'new-password' : 'off'}
              className="h-12 w-full rounded-xl border border-white/10 bg-[#080d15] px-4 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-[#10c7a1]/55"
            />
          ) : (
            <p className="min-h-12 break-words rounded-xl border border-transparent py-3 text-base font-black text-white/88">
              {displayValue || 'Not set'}
            </p>
          )}
        </label>

        {isEditing ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/62 transition hover:bg-white/10 hover:text-white"
              aria-label={`Cancel ${field.label} edit`}
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#10c7a1] text-[#06110f] transition hover:bg-[#7df3cc]"
              aria-label={`Save ${field.label}`}
            >
              <Save className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/62 transition hover:bg-white/10 hover:text-white"
            aria-label={`Edit ${field.label}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
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

function maskPassword(password) {
  return password ? '........' : 'Not set';
}

export default Settings;
