import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import spectropyLogo from "/logo.png";
import { RiArrowLeftLine, RiDraftLine, RiFileList3Line, RiHome2Line } from "react-icons/ri";
import { getOrganizationLabel, getRoleDisplayTitle } from "@/features/auth/utils/roleBranding";

interface ExamShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  backTo?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

const DASHBOARD_BY_ROLE: Record<string, string> = {
  super_admin: "/superadmin/dashboard",
  client_admin: "/admin/dashboard",
  content_authorizer: "/content-authorizer/dashboard",
  school_owner: "/school-owner/dashboard",
  teacher: "/teacher/dashboard",
};

export default function ExamShell({
  title,
  description,
  children,
  headerAction,
  backTo,
  headerClassName,
  bodyClassName,
}: ExamShellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || "Exam Manager";
  const userEmail = user?.email || "";
  const organizationLabel = getOrganizationLabel(user);
  const roleTitle = getRoleDisplayTitle(user?.role);
  const isActive = (path: string) => location.pathname === path;
  const resolvedBackPath =
    backTo || DASHBOARD_BY_ROLE[String(user?.role ?? "")] || "/admin/dashboard";
  const handleBack = () => {
    navigate(resolvedBackPath);
  };

  const navItems = [
    {
      key: "exam-list",
      label: "Exam List",
      icon: <RiFileList3Line />,
      active: isActive("/exams"),
      onClick: () => navigate("/exams"),
    },
    {
      key: "blueprints",
      label: "Blueprints",
      icon: <RiDraftLine />,
      active: isActive("/exams/blueprints"),
      onClick: () => navigate("/exams/blueprints"),
    },
  ];

  return (
    <DashboardLayout
      shellClass={`${theme.shellClass} h-screen overflow-hidden`}
      layoutClass={`${theme.layoutClass} h-screen overflow-hidden`}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-0"
      sidebar={
        <SidebarNav
          brandLogo={spectropyLogo}
          brandName={organizationLabel}
          title={roleTitle}
          brandTag={organizationLabel}
          topAction={
            <button
              type="button"
              onClick={() => {
                navigate(resolvedBackPath);
                setSidebarOpen(false);
              }}
              className="inline-flex items-center gap-2 px-2 py-1 text-sm font-medium text-slate-700 transition hover:text-slate-900"
            >
              <RiHome2Line className="text-base" />
              <span>Back to Dashboard</span>
            </button>
          }
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail, meta: organizationLabel }}
          showUserInfo={false}
          showLogout={false}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      }
      header={
        <div className={`${theme.headerClass} ${headerClassName ?? ""}`.trim()}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden mr-3 p-2 rounded-lg border ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
              <p className="mt-1 text-sm md:text-base text-slate-600">
                {description}
              </p>
            </div>
            {headerAction && (
              <div className="flex w-full flex-wrap items-stretch gap-2 md:w-auto md:justify-end">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className={bodyClassName ?? "p-6"}>{children}</div>
    </DashboardLayout>
  );
}
