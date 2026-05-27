// src/pages/admin/admindashboard.tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';

import spectropyLogo from "/logo.png";
import { RiCalendarCheckLine, RiHome2Line, RiFileList3Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import DashboardHome from './Home';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SidebarNav from '@/components/layout/SidebarNav';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';
import AdminCourseManager from '@/features/courses/components/list/AdminCourseManager';
import { getCoursePermissions } from '@/features/courses/utils/coursePermissions';
import { getQuestionPermissions } from '@/features/question-bank/utils/questionPermissions';
import { getExamPermissions } from '@/features/exams/utils/examPermissions';

type ClientUser = {
  logo?: string;
  client_name?: string;
};

export default function CourseStudents() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const clientUser = user as (typeof user & ClientUser) | null;

  const userFullName = user?.full_name || 'Super Administrator';
  const userEmail = user?.email || 'super@lms.com';
  const isContentAuthorizer = user?.role === 'content_authorizer';

  const brandLogo = clientUser?.logo || spectropyLogo;
  const brandName = clientUser?.client_name || 'Spectropy';
  const dashboardTitle = clientUser?.client_name ? `${clientUser.client_name} Dashboard` : 'Admin Dashboard';
  const homeTitle = clientUser?.client_name
    ? `Welcome to the ${clientUser.client_name} Dashboard`
    : 'Welcome to the Admin Dashboard';
  const clientMeta = clientUser?.client_name ? `${clientUser.client_name} Client` : null;
  const theme = getDashboardTheme(false);
  const courseBannerClass = isContentAuthorizer ? 'bg-sky-100' : 'bg-blue-50';
  const coursePermissions = getCoursePermissions(user);
  const questionPermissions = getQuestionPermissions(user);
  const examPermissions = getExamPermissions(user);

  const [activeTab, setActiveTab] = useState<'courses' | 'home'>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const requestedTab = (location.state as { activeTab?: typeof activeTab } | null)?.activeTab;
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (activeTab === 'courses' && !coursePermissions.canView) {
      setActiveTab('home');
    }
  }, [activeTab, coursePermissions.canView]);

  const navItems = [
    {
      key: 'home',
      label: 'Home',
      icon: <RiHome2Line />,
      active: activeTab === 'home',
      onClick: () => setActiveTab('home'),
    },
    {
      key: 'org',
      label: 'Organization',
      icon: <HiOutlineBuildingOffice2 />,
      active: false,
      onClick: () => navigate('/admin/org'),
    },
    ...(coursePermissions.canView
      ? [{
          key: 'courses',
          label: 'Courses',
          icon: <BiBookOpen />,
          active: activeTab === 'courses',
          onClick: () => setActiveTab('courses'),
        }]
      : []),
    ...(user?.role === 'client_admin'
      ? [{
          key: 'licensed-content',
          label: 'Licensed Content',
          icon: <RiFileList3Line />,
          active: false,
          onClick: () => navigate('/admin/licensed-content'),
        }]
      : []),
    ...(user?.role === 'client_admin'
      ? [{
          key: 'teaching-sessions',
          label: 'Teacher Session Tracker',
          icon: <RiCalendarCheckLine />,
          active: false,
          onClick: () => navigate('/admin/teaching-sessions/setup'),
        }]
      : []),
    ...(questionPermissions.canView
      ? [{
          key: 'question-bank',
          label: 'Question Bank',
          icon: <RiFileList3Line />,
          active: false,
          onClick: () => navigate('/question-bank'),
        }]
      : []),
    ...(examPermissions.canRead
      ? [{
          key: 'exams',
          label: 'Exams',
          icon: <RiFileList3Line />,
          active: false,
          onClick: () => navigate('/exams'),
        }]
      : []),
  ];

  const handleBackToLogin = async () => {
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
          brandLogo={brandLogo}
          brandName={brandName}
          title={dashboardTitle}
          brandTag={clientUser?.client_name}
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail, meta: clientMeta }}
          onProfileClick={() => navigate("/admin/profile")}
          onLogout={handleBackToLogin}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      }
      header={
        <div className={theme.headerClass}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden mr-3 p-2 rounded-lg border ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">
                {activeTab === 'courses' && 'Courses'}
                {activeTab === 'home' && homeTitle}
                
              </h1>

              <p
                className="text-gray-600 mt-1 text-sm md:text-base"
              >
                {activeTab === 'courses' &&
                  'Set up your courses and share your knowledge.'}
                {activeTab === 'home' && 'Key metrics at a glance'}
                
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6">
        {activeTab === 'courses' && (
          <AdminCourseManager
            mode="admin"
            role={user?.role}
            permissionKeys={user?.permissions}
            theme={theme}
            brandLogo={brandLogo}
            brandName={brandName}
            courseBannerClass={courseBannerClass}
            listTitle="All Courses"
            emptyMessage="No courses found."
            onManageContent={(courseId) =>
              navigate(`/admin/courses/${courseId}/content`, {
                state: { activeTab: 'courses' },
              })
            }
            onViewCourse={(courseId) =>
              navigate(`/admin/courses/${courseId}/content`, {
                state: { activeTab: 'courses' },
              })
            }
            onEnroll={(courseId) =>
              navigate(`/admin/courses/${courseId}/enroll`, {
                state: { activeTab: 'courses' },
              })
            }
          />
        )}

        {activeTab === 'home' && <DashboardHome />}

      </div>
    </DashboardLayout>
  );
}
