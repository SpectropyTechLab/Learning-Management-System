import { ReactNode, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import spectropyLogo from '/logo.png';
import { RiHome2Line, RiFileList3Line } from 'react-icons/ri';
import { BiBookOpen } from 'react-icons/bi';
import { PiUsersBold, PiChatsCircleBold } from 'react-icons/pi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';

interface SuperAdminShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function SuperAdminShell({
  title,
  subtitle,
  actions,
  children,
}: SuperAdminShellProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = getDashboardTheme(false);

  const userFullName = user?.full_name || user?.name || 'Super Admin';
  const userEmail = user?.email || 'superadmin@lms.com';

  const isActive = (path: string) => {
    if (path === '/superadmin/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const navItems = useMemo(
    () => [
      {
        key: 'overview',
        label: 'Overview',
        icon: <RiHome2Line />,
        active: isActive('/superadmin/dashboard'),
        onClick: () => navigate('/superadmin/dashboard'),
      },
      {
        key: 'clients',
        label: 'Clients',
        icon: <HiOutlineBuildingOffice2 />,
        active: isActive('/superadmin/clients'),
        onClick: () => navigate('/superadmin/clients'),
      },
      {
        key: 'packs',
        label: 'Content Packs',
        icon: <BiBookOpen />,
        active: isActive('/superadmin/packs'),
        onClick: () => navigate('/superadmin/packs'),
      },
      {
        key: 'entitlements',
        label: 'Entitlements',
        icon: <RiFileList3Line />,
        active: isActive('/superadmin/entitlements'),
        onClick: () => navigate('/superadmin/entitlements'),
      },
      {
        key: 'tracker-entitlements',
        label: 'Tracker Entitlements',
        icon: <RiFileList3Line />,
        active: isActive('/superadmin/teaching-sessions/entitlements'),
        onClick: () => navigate('/superadmin/teaching-sessions/entitlements'),
      },
      {
        key: 'question-bank-entitlements',
        label: 'Question Bank Entitlements',
        icon: <RiFileList3Line />,
        active: isActive('/superadmin/question-bank/entitlements'),
        onClick: () => navigate('/superadmin/question-bank/entitlements'),
      },
      {
        key: 'exam-entitlements',
        label: 'Exam Entitlements',
        icon: <RiFileList3Line />,
        active: isActive('/superadmin/exams/entitlements'),
        onClick: () => navigate('/superadmin/exams/entitlements'),
      },
      {
        key: 'users',
        label: 'Users',
        icon: <PiUsersBold />,
        active: isActive('/superadmin/users'),
        onClick: () => navigate('/superadmin/users'),
      },
      {
        key: 'permissions',
        label: 'Permissions',
        icon: <PiChatsCircleBold />,
        active: isActive('/superadmin/permissions'),
        onClick: () => navigate('/superadmin/permissions'),
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
          brandLogo={spectropyLogo}
          brandName="Spectropy"
          title="Super Admin"
          brandTag="Platform"
          topAction={
            <button
              type="button"
              onClick={() => {
                navigate('/superadmin/dashboard');
                setSidebarOpen(false);
              }}
              className="inline-flex items-center gap-2 px-2 py-1 text-sm font-medium text-slate-700 transition hover:text-slate-900"
            >
              <RiHome2Line className="text-base" />
              <span>Back to Dashboard</span>
            </button>
          }
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail, meta: 'Platform Admin' }}
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
                className={`md:hidden mr-1 p-2 rounded-lg border ${theme.secondaryBorderClass}`}
                aria-label="Open menu"
              >
                Menu
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
              </div>
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

