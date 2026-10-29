import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import ProfilePanel from "@/features/users/components/ProfilePanel";
import { RiCalendarCheckLine, RiHome2Line, RiFileList3Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { getCoursePermissions } from "@/features/courses/utils/coursePermissions";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";
import { getExamPermissions } from "@/features/exams/utils/examPermissions";
import { useHasVisibleExams } from "@/features/exams/hooks/useHasVisibleExams";
import { useHasVisibleQuestionBankPrograms } from "@/features/question-bank/hooks/useHasVisibleQuestionBankPrograms";
import { getOrganizationLabel, getRoleDisplayTitle } from "@/features/auth/utils/roleBranding";

export default function SchoolOwnerProfile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const coursePermissions = getCoursePermissions({ role: user?.role, permissions: user?.permissions });
  const questionPermissions = getQuestionPermissions(user);
  const examPermissions = getExamPermissions(user);
  const canShowQuestionBank = useHasVisibleQuestionBankPrograms(questionPermissions.canView);
  const canShowExams = useHasVisibleExams(examPermissions.canRead);
  const organizationLabel = getOrganizationLabel(user);
  const roleTitle = getRoleDisplayTitle(user?.role);

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate("/school-owner/dashboard"),
    },
    ...(coursePermissions.canView
      ? [{
          key: "courses",
          label: "Courses",
          icon: <BiBookOpen />,
          active: false,
          onClick: () => navigate("/school-owner/courses"),
        }]
      : []),
    ...(canShowQuestionBank
      ? [{
          key: "question-bank",
          label: "Question Bank",
          icon: <RiFileList3Line />,
          active: false,
          onClick: () => navigate("/question-bank"),
        }]
      : []),
    ...(canShowExams
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
          brandName={organizationLabel}
          title={roleTitle}
          navItems={navItems}
          userInfo={{
            name: user?.full_name || "School Admin",
            email: user?.email || "owner@spectropy.com",
          }}
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
              <h1 className="text-xl md:text-2xl font-bold">Profile</h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                View and update your account details.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6">
        <ProfilePanel />
      </div>
    </DashboardLayout>
  );
}




