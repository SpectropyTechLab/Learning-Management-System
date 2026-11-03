import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RiFileList3Line, RiHome2Line, RiSlideshowLine, RiStackLine } from 'react-icons/ri';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getOrganizationLabel, getRoleDisplayTitle } from '@/features/auth/utils/roleBranding';
import spectropyLogo from '/logo.png';

interface TeachingStudioShellProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function TeachingStudioShell({ title, subtitle, actions, children }: TeachingStudioShellProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = getDashboardTheme(false);
  const roleTitle = getRoleDisplayTitle(user?.role);
  const organizationLabel = getOrganizationLabel(user);
  const editorOpen = location.pathname === '/content-authorizer/studio'
    || location.pathname.startsWith('/content-authorizer/studio/sessions/');
  const curriculumOpen = location.pathname.endsWith('/studio/curriculum');
  const sessionPlanOpen = location.pathname.endsWith('/studio/session-plan');
  const scriptPlanOpen = location.pathname.endsWith('/studio/script-plan');
  const dashboardPath = user?.role === 'super_admin'
    ? '/superadmin/dashboard'
    : user?.role === 'client_admin'
      ? '/admin/dashboard'
      : user?.role === 'school_owner'
        ? '/school-owner/dashboard'
        : user?.role === 'teacher'
          ? '/teacher/dashboard'
          : '/content-authorizer/dashboard';

  const navItems = useMemo(() => {
    const items = [
      {
        key: 'back',
        label: 'Back to Dashboard',
        icon: <RiHome2Line />,
        active: false,
        onClick: () => navigate(dashboardPath),
      },
      {
        key: 'curriculum',
        label: 'Curriculum',
        icon: <RiStackLine />,
        active: curriculumOpen,
        onClick: () => navigate('/content-authorizer/studio/curriculum'),
      },
      {
        key: 'session-plan',
        label: 'Session Plan',
        icon: <RiFileList3Line />,
        active: sessionPlanOpen,
        onClick: () => navigate('/content-authorizer/studio/session-plan'),
      },
      {
        key: 'screen-script',
        label: 'Screen Script',
        icon: <RiFileList3Line />,
        active: scriptPlanOpen,
        onClick: () => navigate('/content-authorizer/studio/script-plan'),
      },
      {
        key: 'screen-editor',
        label: 'Screen Editor',
        icon: <RiSlideshowLine />,
        active: editorOpen,
        onClick: () => navigate('/content-authorizer/studio'),
      },
    ];
    return items;
  }, [curriculumOpen, dashboardPath, editorOpen, navigate, scriptPlanOpen, sessionPlanOpen]);

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
      sidebar={(
        <SidebarNav
          brandLogo={spectropyLogo}
          brandName={organizationLabel}
          brandTag={organizationLabel}
          title="Teaching Studio"
          navItems={navItems}
          userInfo={{
            name: user?.full_name || roleTitle,
            email: user?.email || '',
            meta: organizationLabel,
          }}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      )}
      header={(
        <div className={theme.headerClass}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={`md:hidden rounded-lg border p-2 ${theme.secondaryBorderClass}`}
                aria-label="Open menu"
              >
                Menu
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {actions}
            </div>
          </div>
        </div>
      )}
    >
      <div className="px-4 py-4 sm:px-6 sm:py-6">{children}</div>
    </DashboardLayout>
  );
}
