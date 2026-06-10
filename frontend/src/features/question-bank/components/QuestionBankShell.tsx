import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import spectropyLogo from "/logo.png";
import { RiFileList3Line } from "react-icons/ri";
import { getOrganizationLabel } from "@/features/auth/utils/roleBranding";

interface QuestionBankShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

const roleConfig = {
  super_admin: {
    label: "Super Admin",
    profilePath: "",
  },
  client_admin: {
    label: "Admin",
    profilePath: "/admin/profile",
  },
  content_authorizer: {
    label: "Content Authorizer",
    profilePath: "/content-authorizer/profile",
  },
  school_owner: {
    label: "School Admin",
    profilePath: "/school-owner/profile",
  },
  teacher: {
    label: "Teacher",
    profilePath: "/teacher/profile",
  },
  student: {
    label: "Student",
    profilePath: "",
  },
} as const;

const questionBankTabs = [
  { key: "questions", label: "Questions", to: "/question-bank" },
  { key: "programs", label: "Programs", to: "/question-bank/programs" },
  { key: "grades", label: "Grades", to: "/question-bank/grades" },
  { key: "subjects", label: "Subjects", to: "/question-bank/subjects" },
  { key: "chapters", label: "Chapters", to: "/question-bank/chapters" },
  { key: "topics", label: "Topics", to: "/question-bank/topics" },
  { key: "folders", label: "Folders", to: "/question-bank/folders" },
  { key: "converter", label: "Converter", to: "/question-bank/converter" },
  { key: "bulk-upload", label: "Bulk Upload", to: "/question-bank/bulk-upload" },
] as const;

export default function QuestionBankShell({
  title,
  description,
  children,
  headerAction,
}: QuestionBankShellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const brandLogo = spectropyLogo;
  const brandName = getOrganizationLabel(user);
  const theme = getDashboardTheme(false);

  const roleKey = (user?.role ?? "student") as keyof typeof roleConfig;
  const config = roleConfig[roleKey];
  const userFullName = user?.full_name || config.label;
  const userEmail = user?.email || "";

  const isTabActive = (to: string) =>
    to === "/question-bank"
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const navItems = questionBankTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    icon: <RiFileList3Line />,
    active: isTabActive(tab.to),
    onClick: () => navigate(tab.to),
  }));

  return (
    <DashboardLayout
      shellClass={`${theme.shellClass} h-screen overflow-hidden`}
      layoutClass={`${theme.layoutClass} h-screen overflow-hidden`}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-0"
      sidebar={
        <SidebarNav
          brandLogo={brandLogo}
          brandName={brandName}
          title={config.label}
          brandTag={brandName}
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
          showUserInfo={false}
          showLogout={false}
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
              <p className="mt-1 text-sm md:text-base text-slate-600">
                {description}
              </p>
            </div>
            {headerAction}
          </div>
        </div>
      }
    >
      <div className="p-6">{children}</div>
    </DashboardLayout>
  );
}
