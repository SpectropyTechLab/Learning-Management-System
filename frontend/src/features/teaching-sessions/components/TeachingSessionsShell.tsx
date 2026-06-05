import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import type { ReactNode } from 'react';
import spectropyLogo from '/logo.png';
import { RiCalendarScheduleLine, RiFileList3Line, RiHome2Line, RiLineChartLine, RiShieldUserLine } from 'react-icons/ri';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';

interface TeachingSessionsShellProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function TeachingSessionsShell({
  title,
  subtitle,
  actions,
  children,
}: TeachingSessionsShellProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = getDashboardTheme(false);
  const role = user?.role;

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navItems = useMemo(() => {
    const items = [
      {
        key: 'back',
        label: 'Back to Dashboard',
        icon: <RiHome2Line />,
        active: false,
        onClick: () => {
          const fallback = role === 'content_authorizer'
            ? '/content-authorizer/dashboard'
            : role === 'super_admin'
              ? '/superadmin/dashboard'
              : role === 'client_admin'
                ? '/admin/dashboard'
                : role === 'school_owner'
                  ? '/school-owner/dashboard'
                  : '/teacher/dashboard';
          navigate(fallback);
        },
      },
    ];

    if (role === 'content_authorizer') {
      items.push(
        {
          key: 'micro',
          label: 'Micro Schedules',
          icon: <RiFileList3Line />,
          active: isActive('/content-authorizer/teaching-sessions/micro-schedules'),
          onClick: () => navigate('/content-authorizer/teaching-sessions/micro-schedules'),
        },
        {
          key: 'planner',
          label: 'Lesson Planners',
          icon: <RiFileList3Line />,
          active: isActive('/content-authorizer/teaching-sessions/lesson-planners'),
          onClick: () => navigate('/content-authorizer/teaching-sessions/lesson-planners'),
        },
        {
          key: 'templates',
          label: 'Templates',
          icon: <RiCalendarScheduleLine />,
          active: isActive('/content-authorizer/teaching-sessions/templates'),
          onClick: () => navigate('/content-authorizer/teaching-sessions/templates'),
        },
      );
    }

    if (role === 'super_admin') {
      items.push({
        key: 'entitlements',
        label: 'Tracker Access',
        icon: <HiOutlineBuildingOffice2 />,
        active: isActive('/superadmin/teaching-sessions/entitlements'),
        onClick: () => navigate('/superadmin/teaching-sessions/entitlements'),
      });
    }

    if (role === 'client_admin') {
      items.push(
        {
          key: 'setup',
          label: 'Session Setup',
          icon: <RiCalendarScheduleLine />,
          active: isActive('/admin/teaching-sessions/setup'),
          onClick: () => navigate('/admin/teaching-sessions/setup'),
        },
        {
          key: 'permissions',
          label: 'Teacher Access',
          icon: <RiShieldUserLine />,
          active: isActive('/admin/teaching-sessions/permissions'),
          onClick: () => navigate('/admin/teaching-sessions/permissions'),
        },
        {
          key: 'sessions',
          label: 'Live Sessions',
          icon: <RiFileList3Line />,
          active: isActive('/admin/teaching-sessions/sessions'),
          onClick: () => navigate('/admin/teaching-sessions/sessions'),
        },
        {
          key: 'analytics-admin',
          label: 'Analytics',
          icon: <RiLineChartLine />,
          active: isActive('/admin/teaching-sessions/analytics'),
          onClick: () => navigate('/admin/teaching-sessions/analytics'),
        },
      );
    }

    if (role === 'school_owner') {
      items.push({
        key: 'analytics-school',
        label: 'School Analytics',
        icon: <RiLineChartLine />,
        active: isActive('/school-owner/teaching-sessions/analytics'),
        onClick: () => navigate('/school-owner/teaching-sessions/analytics'),
      });
    }

    if (role === 'teacher') {
      items.push(
        {
          key: 'mine',
          label: 'My Sessions',
          icon: <RiCalendarScheduleLine />,
          active: isActive('/teacher/teaching-sessions') && !isActive('/teacher/teaching-sessions/analytics'),
          onClick: () => navigate('/teacher/teaching-sessions'),
        },
        {
          key: 'analytics-teacher',
          label: 'My Analytics',
          icon: <RiLineChartLine />,
          active: isActive('/teacher/teaching-sessions/analytics'),
          onClick: () => navigate('/teacher/teaching-sessions/analytics'),
        },
      );
    }

    return items;
  }, [isActive, navigate, role, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleTitle = role === 'content_authorizer'
    ? 'Content Authorizer'
    : role === 'super_admin'
      ? 'Super Admin'
      : role === 'client_admin'
        ? 'Client Admin'
        : role === 'school_owner'
          ? 'School Owner'
          : 'Teacher';

  return (
    <DashboardLayout
      shellClass={theme.shellClass}
      layoutClass={theme.layoutClass}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-0"
      sidebar={
        <SidebarNav
          brandLogo={spectropyLogo}
          brandName="Spectropy"
          title={roleTitle}
          brandTag="Teacher Session Tracker"
          navItems={navItems}
          userInfo={{
            name: user?.full_name || roleTitle,
            email: user?.email || '',
            meta: roleTitle,
          }}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      }
      header={
        <div className={theme.headerClass}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`md:hidden mr-1 rounded-lg border p-2 ${theme.secondaryBorderClass}`}
                aria-label="Open menu"
              >
                Menu
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
              </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
          </div>
        </div>
      }
    >
      <div className="px-4 py-4 sm:px-6 sm:py-6">{children}</div>
    </DashboardLayout>
  );
}
