import { useTheme } from '../context/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';
import useNotificationCount from '../hooks/useNotificationCount';
import LanguageSelector from './LanguageSelector';

const pageTitles = {
  '/dashboard': 'Your Digital Twin dashboard',
  '/health': ' ',
  '/finance': ' ',
  '/career': ' ',
  '/intelligence': 'Cross-domain intelligence',
  '/simulation': ' ',
  '/copilot': 'Twin Copilot',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useNotificationCount();
  const user = getStoredUser();
  const firstName = user?.firstName || 'Anjali';
  const pageTitle = pageTitles[location.pathname] || 'DigitalTwin workspace';
  const greeting = getTimeGreeting();
  const { theme } = useTheme();

  return (
    <header
      className={`px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8 ${theme === 'light'
          ? 'border-b border-slate-200 bg-white text-slate-900'
          : 'border-b border-violet-500/20 bg-[#1a103d]/90 text-white'
        }`}
    >     <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] backdrop-blur-xl ${theme === 'light'
              ? 'border border-slate-200 bg-slate-100 text-slate-500'
              : 'border border-white/10 bg-white/5 text-white/55'
            }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#10c7a1] shadow-[0_0_18px_rgba(16,199,161,0.85)]" />
            DigitalTwin workspace
          </div>
          <p className={`text-sm font-semibold tracking-[0.18em] ${theme === 'light' ? 'text-slate-500' : 'text-white/60'
            }`}>{greeting}, {firstName}</p>
          <h1
            className={`text-4xl font-bold tracking-tight sm:text-5xl ${theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}
          >            <span
            className={
              theme === 'light'
                ? 'text-slate-900'
                : 'bg-gradient-to-r from-white via-[#9db7ff] to-[#7df3cc] bg-clip-text text-transparent'
            }
          >{pageTitle}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${theme === 'light'
                ? 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`} type="button"
            aria-label="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <BellIcon className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#1a103d] bg-[#ef4444] px-1 text-[10px] font-black leading-none text-white shadow-[0_0_14px_rgba(239,68,68,0.8)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#7b61ff] via-[#1d5fff] to-[#10c7a1] text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,199,161,0.18)]"
            type="button"
            aria-label="Profile"
            onClick={() => navigate('/settings')}
          >
            {firstName.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function BellIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default Navbar;
