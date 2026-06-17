import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import DigitalTwinLogo from './DigitalTwinLogo';
import { fetchTodayDailyUpdate } from '../features/dailyUpdate/dailyUpdateThunks';
import useNotificationCount from '../hooks/useNotificationCount';

// ✅ MODIFIED: Grouped Health, Finance, and Career under Dashboard's subItems
const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    subItems: [
      { label: 'Health', href: '/health', icon: HeartIcon },
      { label: 'Finance', href: '/finance', icon: WalletIcon },
      { label: 'Career', href: '/career', icon: BriefIcon },
    ]
  },
  { label: 'Goals', href: '/goals', icon: TargetIcon },
  { label: 'Intelligence', href: '/intelligence', icon: SparkIcon },
  { label: 'Simulation', href: '/simulation', icon: BranchIcon },
  { label: 'Twin Copilot', href: '/copilot', icon: ChatIcon },
  { label: 'Daily Update', href: '/daily-update', icon: CalendarIcon, dailyUpdate: true },
  { label: 'Document Upload', href: '/document-upload', icon: DocumentUploadIcon },
  { label: 'Notifications', href: '/notifications', icon: BellIcon },
];

const settingsItem = { label: 'Settings', href: '/settings', icon: SettingsIcon };

function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dispatch = useDispatch();
  const unreadNotificationCount = useNotificationCount();
  const { theme } = useTheme();
  useEffect(() => {
    dispatch(fetchTodayDailyUpdate());
    const refresh = () => dispatch(fetchTodayDailyUpdate());
    window.addEventListener('daily-update-completed', refresh);
    return () => window.removeEventListener('daily-update-completed', refresh);
  }, [dispatch]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 h-screen shrink-0 overflow-hidden px-4 py-6 transition-all duration-300 lg:relative lg:block ${theme === 'light'
          ? 'border-r border-slate-200 bg-white text-slate-900 shadow-[0_0_30px_rgba(0,0,0,0.06)]'
          : 'border-r border-white/10 bg-[#130b1c] text-white shadow-[24px_0_80px_-40px_rgba(0,0,0,0.65)]'
        } ${isCollapsed ? 'lg:w-20 w-68' : 'w-68'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,0,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,0,127,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      <div className="flex h-full flex-col">
        <div className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          <NavLink to="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#ff7a00] via-[#ff007f] to-[#7b61ff] p-[1px] shadow-[0_0_24px_rgba(255,0,127,0.18)]">
              <div
                className={`grid h-full w-full place-items-center rounded-[calc(1rem-1px)] ${theme === 'light' ? 'bg-white' : 'bg-[#160d22]'
                  }`}
              >              <DigitalTwinLogo className="h-8 w-8 rounded-full" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-semibold tracking-[0.18em] ${theme === 'light' ? 'text-slate-900' : 'text-white/90'
                    }`}
                >DigitalTwin</p>
                {/* <p className="truncate text-[11px] uppercase tracking-[0.28em] text-white/45">Warm control deck</p> */}
              </div>
            )}
          </NavLink>

          {!isCollapsed && (
            <div className="flex items-center gap-2">
              {/* Mobile close button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen?.(false)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition lg:hidden ${theme === 'light'
                    ? 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`} aria-label="Close sidebar"
              >
                <XIcon className="h-4 w-4" />
              </button>
              
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className={`hidden lg:flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${theme === 'light'
                    ? 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`} aria-label="Collapse sidebar"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="mx-auto mt-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Expand sidebar"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        )}

        <nav className="relative mt-9 space-y-1">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.label}
              item={item}
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              unreadNotificationCount={unreadNotificationCount}
            />
          ))}
        </nav>

        <nav className="relative mt-auto border-t border-white/10 pt-4">
          <SidebarNavItem item={settingsItem} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} unreadNotificationCount={unreadNotificationCount} />
        </nav>
      </div>
    </aside>
  );
}

// ✅ MODIFIED: Added Dropdown / Accordion Logic
function SidebarNavItem({ item, isCollapsed, setIsCollapsed, unreadNotificationCount = 0 }) {
  const location = useLocation();
  const Icon = item.icon;
  const hasSubItems = !!item.subItems;
  const dailyUpdateCompleted = useSelector((state) => state.dailyUpdate.completed);

  // Check if any sub-item is the current active route
  const isSubItemActive = hasSubItems && item.subItems.some((sub) => location.pathname === sub.href);
  const pendingDailyUpdate = item.dailyUpdate && !dailyUpdateCompleted;
  const hasUnreadNotifications = item.href === '/notifications' && unreadNotificationCount > 0;

  // State to manage dropdown visibility
  const [isOpen, setIsOpen] = useState(isSubItemActive);

  // Auto-expand if a sub-item becomes active
  useEffect(() => {
    if (isSubItemActive) {
      window.setTimeout(() => setIsOpen(true), 0);
    }
  }, [isSubItemActive, location.pathname]);

  const handleParentClick = () => {
    if (hasSubItems) {
      setIsOpen(!isOpen);
      // If user clicks the parent while collapsed, auto-expand the sidebar
      if (isCollapsed) {
        setIsCollapsed(false);
        setIsOpen(true);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <NavLink
        to={item.href}
        title={isCollapsed ? item.label : undefined}
        onClick={handleParentClick}
        className={({ isActive }) =>
          `group flex items-center justify-between rounded-2xl py-2.5 text-sm font-semibold transition-all duration-200 ${isCollapsed ? 'px-0 justify-center' : 'px-3'
          } ${isActive || isSubItemActive || pendingDailyUpdate
            ? 'border border-white/10 bg-gradient-to-r from-[#ff7a00]/20 via-[#ff007f]/18 to-[#7b61ff]/18 text-white shadow-[0_14px_32px_-18px_rgba(255,122,0,0.8)]'
            : 'border border-transparent text-white/62 hover:border-white/10 hover:bg-white/5 hover:text-white'
          }`
        }
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0 text-inherit transition-transform duration-200 group-hover:scale-105" />
          {!isCollapsed && <span>{item.label}</span>}
          {pendingDailyUpdate && !isCollapsed && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#ffb020]/25 bg-[#ffb020]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ffd089]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffb020]" />
              Pending
            </span>
          )}
          {hasUnreadNotifications && !isCollapsed && (
            <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-black leading-none text-white shadow-[0_0_14px_rgba(239,68,68,0.75)]">
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
          {pendingDailyUpdate && isCollapsed && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ffb020] shadow-[0_0_10px_rgba(255,176,32,0.8)]" />}
          {hasUnreadNotifications && isCollapsed && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-[#130b1c] bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.9)]" />}
        </div>

        {hasSubItems && !isCollapsed && (
          <button
            onClick={(e) => {
              e.preventDefault(); // Prevent navigating, just toggle
              setIsOpen(!isOpen);
            }}
            className="p-1 text-white/40 hover:text-white transition-colors"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </NavLink>

      {/* ✅ NEW: Dropdown Items Rendering */}
      {hasSubItems && isOpen && !isCollapsed && (
        <div className="mt-1 flex flex-col gap-1 pl-9 pr-2 mb-2 overflow-hidden transition-all">
          {item.subItems.map((sub) => (
            <NavLink
              key={sub.label}
              to={sub.href}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl py-2 px-3 text-xs font-medium transition-all duration-200 ${isActive
                  ? 'text-white bg-white/10 border border-white/10 shadow-sm'
                  : 'text-white/40 hover:text-white/90 hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <sub.icon className="h-3.5 w-3.5 shrink-0" />
              {sub.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function HomeIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function HeartIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.4-9-9.2C1.4 7 3.8 4 7.1 4c1.9 0 3.4 1 4.2 2.3C12.1 5 13.6 4 15.5 4 18.8 4 21.2 7 19.6 10.8 17.7 15.6 12 20 12 20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function WalletIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="2" /><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" stroke="currentColor" strokeWidth="2" /></svg>;
}

function BriefIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M9 7V5h6v2m-9 3h12m-14 0h18v10H4V10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function TargetIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2" /><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" /><path d="M12 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}

function SparkIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function BranchIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M6 6h7a5 5 0 0 1 5 5v7m0 0-3-3m3 3 3-3M6 18h4a4 4 0 0 0 4-4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChatIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function BellIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CalendarIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v15H4V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="m8 15 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SettingsIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" stroke="currentColor" strokeWidth="2" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4l-.4 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.4 3.1h4l.4-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function ChevronLeftIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChevronRightIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function XIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>;
}

// ✅ NEW: Added Chevron Down for the dropdown accordion
function ChevronDownIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DocumentUploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export default Sidebar;
