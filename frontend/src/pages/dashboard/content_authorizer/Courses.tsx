import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import { RiCalendarCheckLine, RiHome2Line, RiFileList3Line, RiStackLine } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { PiChatsCircleBold } from "react-icons/pi";
import AdminCourseManager from "@/features/courses/components/list/AdminCourseManager";

export default function ContentAuthorizerCourses() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || "Content Authorizer";
  const userEmail = user?.email || "authorizer@spectropy.com";

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate("/content-authorizer/dashboard"),
    },
    {
      key: "courses",
      label: "Courses",
      icon: <BiBookOpen />,
      active: true,
      onClick: () => navigate("/content-authorizer/courses"),
    },
    {
      key: "question-bank",
      label: "Question Bank",
      icon: <RiFileList3Line />,
      active: false,
      onClick: () => navigate("/question-bank"),
    },
    {
      key: "packs",
      label: "Packs",
      icon: <RiStackLine />,
      active: false,
      onClick: () => navigate("/content-authorizer/packs"),
    },
    {
      key: "teaching-sessions",
      label: "Teacher Session Tracker",
      icon: <RiCalendarCheckLine />,
      active: false,
      onClick: () => navigate("/content-authorizer/teaching-sessions/micro-schedules"),
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
          title="Content Authorizer"
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
          onProfileClick={() => navigate("/content-authorizer/profile")}
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
                Review and prepare platform-ready course structures.
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
          theme={theme}
          brandLogo="/logo.png"
          brandName="Spectropy"
          courseBannerClass="bg-sky-100"
          listTitle="All Courses"
          emptyMessage="No courses found."
          onManageContent={(courseId) =>
            navigate(`/content-authorizer/courses/${courseId}/content`)
          }
          onEnroll={(courseId) => navigate(`/admin/courses/${courseId}/enroll`)}
        />
      </div>
    </DashboardLayout>
  );
}




