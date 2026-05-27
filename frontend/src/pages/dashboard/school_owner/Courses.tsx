import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import { RiCalendarCheckLine, RiHome2Line, RiFileList3Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import AdminCourseManager from "@/features/courses/components/list/AdminCourseManager";
import { getCoursePermissions } from "@/features/courses/utils/coursePermissions";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";
import { getExamPermissions } from "@/features/exams/utils/examPermissions";

export default function SchoolOwnerCourses() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || "School Owner";
  const userEmail = user?.email || "owner@spectropy.com";
  const coursePermissions = getCoursePermissions({ role: user?.role, permissions: user?.permissions });
  const questionPermissions = getQuestionPermissions(user);
  const examPermissions = getExamPermissions(user);

  if (!coursePermissions.canView) {
    return <Navigate to="/unauthorized" replace />;
  }

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate("/school-owner/dashboard"),
    },
    {
      key: "courses",
      label: "Courses",
      icon: <BiBookOpen />,
      active: true,
      onClick: () => navigate("/school-owner/courses"),
    },
    ...(questionPermissions.canView
      ? [{
          key: "question-bank",
          label: "Question Bank",
          icon: <RiFileList3Line />,
          active: false,
          onClick: () => navigate("/question-bank"),
        }]
      : []),
    ...(examPermissions.canRead
      ? [{
          key: "exams",
          label: "Exams",
          icon: <RiFileList3Line />,
          active: false,
          onClick: () => navigate("/exams"),
        }]
      : []),
    {
      key: "teaching-sessions",
      label: "Teacher Session Tracker",
      icon: <RiCalendarCheckLine />,
      active: false,
      onClick: () => navigate("/school-owner/teaching-sessions/analytics"),
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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
          title="School Owner"
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
          onProfileClick={() => navigate("/school-owner/profile")}
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
            className={`md:hidden mr-3 p-2 rounded-lg border ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Courses</h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                Monitor course progress and manage enrollments.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6">
        <AdminCourseManager
          mode="admin"
          role={user?.role}
          permissionKeys={user?.permissions}
          apiPrefix="/school-owner"
          theme={theme}
          brandLogo="/logo.png"
          brandName="Spectropy"
          courseBannerClass="bg-blue-50"
          listTitle="Assigned Courses"
          emptyMessage="No courses found."
          onManageContent={(courseId) => navigate(`/school-owner/courses/${courseId}/content`)}
          onViewCourse={(courseId) => navigate(`/school-owner/courses/${courseId}/content`)}
          onEnroll={(courseId) => navigate(`/school-owner/courses/${courseId}/enroll`)}
        />
      </div>
    </DashboardLayout>
  );
}




