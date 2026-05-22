// src/pages/student/StudentDashboard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import spectropyLogo from "/logo.png";
import AdminCourseManager from '@/features/courses/components/list/AdminCourseManager';
import { getDashboardTheme } from '@/components/layout/dashboardTheme';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isClientTenant = false;
  const brandLogo = spectropyLogo;
  const brandName = 'Spectropy';

  const userFullName = user?.full_name || 'Student';
  const userEmail = user?.email || 'student@lms.com';
  const dashboardTitle = 'Student Dashboard';
  const theme = getDashboardTheme(false);

  const handleBackToLogin = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={theme.shellClass}>
      <div className={theme.layoutClass}>
        {mobileMenuOpen ? (
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          />
        ) : null}

        {/* Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[88vw] max-w-xs flex-col border-r transition-transform lg:static lg:z-auto lg:w-72 lg:max-w-none lg:translate-x-0 lg:border-b-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isClientTenant ? 'border-amber-100 bg-white/90 backdrop-blur' : 'border-blue-100 bg-white'
            }`}
        >
          <div className={`p-6 border-b ${isClientTenant ? 'border-amber-100' : 'border-blue-100'}`}>
            <div className="flex items-center space-x-3">
              <img
                src={brandLogo}
                alt={`${brandName} Logo`}
                className="h-11 w-auto rounded-md object-contain"
              />
              <div>
                <p
                  className={`text-xs uppercase tracking-[0.3em] ${isClientTenant ? 'text-amber-700' : 'text-blue-600'
                    }`}
                >
                  {brandName}
                </p>
                <h1 className="text-lg font-semibold">{dashboardTitle}</h1>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/student/dashboard');
              }}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-colors ${isClientTenant
                ? 'bg-amber-100 text-amber-900 border-l-4 border-amber-600'
                : 'bg-blue-100 text-blue-900 border-l-4 border-blue-700'
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Courses
            </button>
          </nav>

          {/* User Info */}
          <div className="px-4 pb-4">
            <div
              className={`flex items-center rounded-2xl border p-3 ${isClientTenant ? 'border-amber-100 bg-amber-50' : 'border-blue-100 bg-blue-50'
                }`}
            >
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${isClientTenant ? 'bg-amber-200' : 'bg-blue-200'
                  }`}
              >
                <span className={`font-semibold text-xl ${isClientTenant ? 'text-amber-900' : 'text-blue-900'}`}>
                  {userFullName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {userFullName}
                </p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          <footer className={`mt-auto border-t px-4 py-2 ${isClientTenant ? 'border-amber-100' : 'border-blue-100'}`}>
            <button
              onClick={handleBackToLogin}
              className={`w-full flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold ${isClientTenant
                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Logout
            </button>
          </footer>
        </aside>

        {/* Right Panel */}
        <section className="flex-1 overflow-y-auto">
          <div
            className={`border-b px-4 py-4 backdrop-blur sm:px-6 sm:py-6 ${isClientTenant ? 'border-amber-100 bg-white/70' : 'border-blue-100 bg-white'
              }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex items-center rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                Menu
              </button>
            </div>
            <h1 className="text-2xl font-bold">Active Courses</h1>
            <p className="text-slate-600 mt-1">
              {`Continue your learning with ${brandName} course modules.`}
            </p>
          </div>

          <div className="p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
              <AdminCourseManager
                mode="student"
                role={user?.role}
                theme={theme}
                isGvjbClient={false}
                brandLogo={brandLogo}
                brandName={brandName}
                courseBannerClass="bg-blue-50"
                listTitle="My Courses"
                emptyMessage="You are not enrolled in any courses yet."
                onViewCourse={(courseId) => navigate(`/student/course/${courseId}`)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
