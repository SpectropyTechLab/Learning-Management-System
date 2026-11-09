import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, CheckSquare, FileText, FolderOpen, Home, Layers3, LayoutDashboard, Menu, MonitorPlay, ScrollText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import StudioAccountMenu, { type StudioThemePreference } from './StudioAccountMenu';

const sections = [
  ['Dashboard', '/studio', LayoutDashboard],
  ['Session Library', '/studio/sessions', FolderOpen],
  ['Review & Publish', '/studio/review', CheckSquare],
  ['Curriculum', '/studio/curriculum', BookOpen],
  ['Session Plan', '/studio/session-plans', FileText],
  ['Screen Scripts', '/studio/screen-scripts', ScrollText],
  ['Screen Editor', '/studio/editor', MonitorPlay],
  ['Resource Library', '/studio/resources', Layers3],
] as const;

const authorRoles = new Set(['super_admin', 'content_authorizer']);

const SIDEBAR_STORAGE_KEY = 'digital-studio-sidebar-expanded-v2';
const THEME_STORAGE_KEY = 'digital-studio-theme';

export default function StudioShell({ title, subtitle, actions, scrollContent = true, wrapContent = true, children }: {
  title: string; subtitle?: string; actions?: ReactNode; scrollContent?: boolean; wrapContent?: boolean; children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = getDashboardTheme(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });
  const [themePreference, setThemePreference] = useState<StudioThemePreference>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });
  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);
  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);
  const homePath = ({
    super_admin: '/superadmin/dashboard',
    content_authorizer: '/content-authorizer/dashboard',
    client_admin: '/admin/dashboard',
    school_owner: '/school-owner/dashboard',
    teacher: '/teacher/dashboard',
  } as Record<string, string>)[user?.role || ''] || '/';
  const profilePath = ({
    content_authorizer: '/content-authorizer/profile',
    teacher: '/teacher/profile',
    school_owner: '/school-owner/profile',
    client_admin: '/admin/profile',
  } as Record<string, string>)[user?.role || ''];
  const playerOpen = location.pathname.startsWith('/studio/player/');
  const visibleSections = authorRoles.has(user?.role || '')
    ? sections
    : playerOpen
      ? ([sections[0], ['Screen View', location.pathname, MonitorPlay]] as const)
      : sections.slice(0, 1);
  const navItems = useMemo(() => visibleSections.map(([label, path, Icon]) => ({
    key: path, label, icon: <Icon size={18} />,
    active: path === '/studio' ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`),
    onClick: () => {
      navigate(path);
      if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false);
    },
  })), [location.pathname, navigate, visibleSections]);
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  return <DashboardLayout
    shellClass={`${theme.shellClass} studio-theme-${themePreference}`} layoutClass={theme.layoutClass}
    sidebarOpen={sidebarOpen} onSidebarClose={() => setSidebarOpen(false)} contentClassName="p-0" contentScrollable={scrollContent}
    sidebar={<SidebarNav brandLogo="/logo.png" brandName="Spectropy" title="Digital Studio"
      topAction={<button type="button" onClick={() => navigate(homePath)} aria-label="Home" className={`group relative inline-flex w-full items-center rounded-lg py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-blue-900 ${sidebarOpen ? 'gap-2 px-2' : 'justify-center px-0'}`}><Home size={18} /><span className={sidebarOpen ? '' : 'md:hidden'}>Home</span>{!sidebarOpen ? <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-[70] ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white group-hover:md:block group-focus-visible:md:block">Home</span> : null}</button>}
      navItems={navItems} userInfo={{ name: user?.full_name || 'Studio user', email: user?.email || '' }}
      sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onToggle={() => setSidebarOpen((open) => !open)} theme={theme} closeOnNavigate={false} compactOnDesktop railOnDesktop showUserInfo={false} showLogout={false}
      footerContent={<StudioAccountMenu collapsed={!sidebarOpen} name={user?.full_name || 'Studio user'} email={user?.email || ''} theme={themePreference} onThemeChange={setThemePreference} onHome={() => navigate(homePath)} onProfile={profilePath ? () => navigate(profilePath) : undefined} onLogout={handleLogout} />} />}
    header={<div className={`${theme.headerClass} !py-2 lg:!py-2`}><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><button type="button" onClick={() => setSidebarOpen(true)} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-slate-700 hover:bg-slate-50 md:hidden ${theme.secondaryBorderClass}`} aria-label="Open Digital Studio menu"><Menu size={18} /></button><div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap"><h1 className="shrink-0 text-lg font-bold text-slate-900 md:text-xl">{title}</h1>{subtitle && <span className="truncate text-sm text-slate-600">{subtitle}</span>}</div></div>{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}</div></div>}
  >{wrapContent ? <div className={`bg-gray-50 p-6 text-slate-900 ${scrollContent ? '' : 'h-full min-h-0 overflow-hidden'}`}>{children}</div> : children}</DashboardLayout>;
}
