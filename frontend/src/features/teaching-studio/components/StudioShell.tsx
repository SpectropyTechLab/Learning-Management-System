import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, FileText, Home, Layers3, LayoutDashboard, Menu, MonitorPlay, PanelLeftClose, ScrollText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import { useAuth } from '@/features/auth/hooks/useAuth';

const sections = [
  ['Dashboard', '/studio', LayoutDashboard],
  ['Curriculum', '/studio/curriculum', BookOpen],
  ['Session Plan', '/studio/session-plans', FileText],
  ['Screen Scripts', '/studio/screen-scripts', ScrollText],
  ['Screen Editor', '/studio/editor', MonitorPlay],
  ['Resource Library', '/studio/resources', Layers3],
] as const;

const SIDEBAR_STORAGE_KEY = 'digital-studio-sidebar-open';

export default function StudioShell({ title, subtitle, actions, scrollContent = true, wrapContent = true, children }: {
  title: string; subtitle?: string; actions?: ReactNode; scrollContent?: boolean; wrapContent?: boolean; children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = getDashboardTheme(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(min-width: 768px)').matches;
  });
  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);
  const homePath = user?.role === 'super_admin' ? '/superadmin/dashboard' : '/content-authorizer/dashboard';
  const navItems = useMemo(() => sections.map(([label, path, Icon]) => ({
    key: path, label, icon: <Icon size={18} />,
    active: path === '/studio' ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`),
    onClick: () => {
      navigate(path);
      if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(false);
    },
  })), [location.pathname, navigate]);
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  return <DashboardLayout
    shellClass={theme.shellClass} layoutClass={theme.layoutClass}
    sidebarOpen={sidebarOpen} onSidebarClose={() => setSidebarOpen(false)} contentClassName="p-0" contentScrollable={scrollContent}
    sidebar={<SidebarNav brandLogo="/logo.png" brandName="Spectropy" title="Digital Studio"
      topAction={<button type="button" onClick={() => navigate(homePath)} className="inline-flex items-center gap-2 px-2 py-1 text-sm font-medium text-slate-700 transition hover:text-blue-900"><Home size={17} /><span>Home</span></button>}
      navItems={navItems} userInfo={{ name: user?.full_name || 'Content Authorizer', email: user?.email || '' }}
      onProfileClick={user?.role === 'content_authorizer' ? () => navigate('/content-authorizer/profile') : undefined} onLogout={handleLogout}
      sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} collapsibleOnDesktop closeOnNavigate={false} compactOnDesktop />}
    header={<div className={`${theme.headerClass} !py-3 lg:!py-3`}><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setSidebarOpen((open) => !open)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${theme.secondaryBorderClass}`} aria-label={sidebarOpen ? 'Hide Digital Studio menu' : 'Show Digital Studio menu'} aria-expanded={sidebarOpen}>{sidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}<span className="hidden sm:inline">Menu</span></button><div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap"><h1 className="shrink-0 text-lg font-bold text-slate-900 md:text-xl">{title}</h1>{subtitle && <span className="truncate text-sm text-slate-600">{subtitle}</span>}</div></div>{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}</div></div>}
  >{wrapContent ? <div className={`bg-gray-50 p-6 text-slate-900 ${scrollContent ? '' : 'h-full min-h-0 overflow-hidden'}`}>{children}</div> : children}</DashboardLayout>;
}
