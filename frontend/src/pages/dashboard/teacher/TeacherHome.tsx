// src/pages/teacher/TeacherHome.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import { RiCalendarCheckLine, RiHome2Line, RiFileList3Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { getCoursePermissions } from "@/features/courses/utils/coursePermissions";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";
import { getExamPermissions } from "@/features/exams/utils/examPermissions";
import { getOrganizationLabel, getRoleDisplayTitle } from "@/features/auth/utils/roleBranding";

export default function TeacherHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || "Teacher";
  const userEmail = user?.email || "teacher@spectropy.com";
  const organizationLabel = getOrganizationLabel(user);
  const roleTitle = getRoleDisplayTitle(user?.role);
  const coursePermissions = getCoursePermissions({ role: user?.role, permissions: user?.permissions });
  const questionPermissions = getQuestionPermissions({ role: user?.role, permissions: user?.permissions });
  const examPermissions = getExamPermissions({ role: user?.role, permissions: user?.permissions });
  const featureCards = [
    {
      title: "Courses",
      desc: "Review assigned courses, manage class access, and open teaching content quickly.",
      enabled: coursePermissions.canView,
      badge: "Live",
    },
    {
      title: "Question Bank",
      desc: "Create and review question content available for teaching workflows.",
      enabled: questionPermissions.canView,
      badge: "Live",
    },
    {
      title: "Exams",
      desc: "Prepare assessments, monitor readiness, and review exam-related work.",
      enabled: examPermissions.canRead,
      badge: "Live",
    },
    {
      title: "Teacher Session Tracker",
      desc: "Track classroom execution, delivery progress, and teaching-session activity.",
      enabled: true,
      badge: "Live",
    },
  ];

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <RiHome2Line />,
      active: true,
      onClick: () => navigate("/teacher/dashboard"),
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
    ...(coursePermissions.canView
      ? [{
          key: "courses",
          label: "Courses",
          icon: <BiBookOpen />,
          active: false,
          onClick: () => navigate("/teacher/courses"),
        }]
      : []),
    {
      key: "teaching-sessions",
      label: "Teacher Session Tracker",
      icon: <RiCalendarCheckLine />,
      active: false,
      onClick: () => navigate("/teacher/teaching-sessions"),
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
          brandTag={organizationLabel}
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail }}
          onProfileClick={() => navigate("/teacher/profile")}
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
              <h1 className="text-xl md:text-2xl font-bold">Teaching Dashboard</h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                Manage your classes, assessments, and learning materials.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards
            .filter((card) => card.enabled)
            .map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  {card.badge}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Daily Priorities</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Keep assigned courses ready for classroom delivery.</li>
            <li>Review question and exam work needed for active teaching plans.</li>
            <li>Monitor teacher session activity and follow up on execution gaps.</li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}




