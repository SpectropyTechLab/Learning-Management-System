import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, FileText, Home, LayoutDashboard, MonitorPlay, ScrollText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import { useAuth } from '@/features/auth/hooks/useAuth';

const sections = [
  ['Dashboard', '/content-authorizer/studio', LayoutDashboard],
  ['Curriculum', '/content-authorizer/studio/curriculum', BookOpen],
  ['Session Plan', '/content-authorizer/studio/session-plans', FileText],
  ['Screen Scripts', '/content-authorizer/studio/screen-scripts', ScrollText],
  ['Screen Editor', '/content-authorizer/studio/editor', MonitorPlay],
] as const;

export default function StudioShell({ title, subtitle, actions, children }: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = getDashboardTheme(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = useMemo(() => sections.map(([label, path, Icon]) => ({
    key: path, label, icon: <Icon size={18} />,
    active: path === '/content-authorizer/studio' ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`),
    onClick: () => { navigate(path); setSidebarOpen(false); },
  })), [location.pathname, navigate]);
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  return <DashboardLayout
    shellClass={theme.shellClass} layoutClass={theme.layoutClass}
    sidebarOpen={sidebarOpen} onSidebarClose={() => setSidebarOpen(false)} contentClassName="p-0"
    sidebar={<SidebarNav brandLogo="/logo.png" brandName="Spectropy" title="Digital Studio"
      topAction={<button type="button" onClick={() => navigate('/content-authorizer/dashboard')} className="inline-flex items-center gap-2 px-2 py-1 text-sm font-medium text-slate-700 transition hover:text-blue-900"><Home size={17} /><span>Home</span></button>}
      navItems={navItems} userInfo={{ name: user?.full_name || 'Content Authorizer', email: user?.email || '' }}
      onProfileClick={() => navigate('/content-authorizer/profile')} onLogout={handleLogout}
      sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} />}
    header={<div className={theme.headerClass}><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className={`md:hidden rounded-lg border p-2 ${theme.secondaryBorderClass}`} aria-label="Open menu">Menu</button><div><h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-slate-600 md:text-base">{subtitle}</p>}</div></div>{actions && <div className="flex items-center gap-2">{actions}</div>}</div></div>}
  ><div className="bg-gray-50 p-6 text-slate-900">{children}</div></DashboardLayout>;
}
