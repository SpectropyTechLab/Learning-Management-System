import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RiCalendarCheckLine, RiFileList3Line, RiHome2Line, RiStackLine, RiTeamLine } from 'react-icons/ri';
import { BiBookOpen } from 'react-icons/bi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ContentAuthorizerShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function ContentAuthorizerShell({
  title,
  subtitle,
  actions,
  children,
}: ContentAuthorizerShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || 'Content Authorizer';
  const userEmail = user?.email || 'authorizer@spectropy.com';

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navItems = useMemo(
    () => [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: <RiHome2Line />,
        active: location.pathname === '/content-authorizer/dashboard',
        onClick: () => navigate('/content-authorizer/dashboard'),
      },
      {
        key: 'courses',
        label: 'Courses',
        icon: <BiBookOpen />,
        active: isActive('/content-authorizer/courses'),
        onClick: () => navigate('/content-authorizer/courses'),
      },
      {
        key: 'packs',
        label: 'Packs',
        icon: <RiStackLine />,
        active: isActive('/content-authorizer/packs'),
        onClick: () => navigate('/content-authorizer/packs'),
      },
      {
        key: 'community',
        label: 'Community',
        icon: <RiTeamLine />,
        active: isActive('/content-authorizer/community'),
        onClick: () => navigate('/content-authorizer/community'),
      },
      {
        key: 'question-bank',
        label: 'Question Bank',
        icon: <RiFileList3Line />,
        active: isActive('/question-bank'),
        onClick: () => navigate('/question-bank'),
      },
      {
        key: 'exams',
        label: 'Exams',
        icon: <RiFileList3Line />,
        active: isActive('/exams'),
        onClick: () => navigate('/exams'),
      },
      {
        key: 'teaching-sessions',
        label: 'Teacher Session Tracker',
        icon: <RiCalendarCheckLine />,
        active: isActive('/content-authorizer/teaching-sessions'),
        onClick: () => navigate('/content-authorizer/teaching-sessions/micro-schedules'),
      },
    ],
    [location.pathname, navigate],
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <DashboardLayout
      shellClass={theme.shellClass}
      layoutClass={theme.layoutClass}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-0"
      sidebar={
        <SidebarNav
          brandLogo="/logo.png"
          brandName="Spectropy"
          title="Content Authorizer"
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
          onProfileClick={() => navigate('/content-authorizer/profile')}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      }
      header={
        <div className={theme.headerClass}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden mr-3 rounded-lg border p-2 ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-gray-600 md:text-base">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      }
    >
      <div className="p-6">{children}</div>
    </DashboardLayout>
  );
}
