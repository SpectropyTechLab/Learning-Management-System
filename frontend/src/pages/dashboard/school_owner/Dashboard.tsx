// src/pages/school_owner/Dashboard.tsx
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

const featureCards = [
  {
    title: "Question Approvals",
    desc: "Approve or reject teacher-submitted questions.",
  },
  {
    title: "Exams",
    desc: "Schedule school-wide assessments.",
  },
  {
    title: "Teachers",
    desc: "Manage teacher access and assignments.",
  },
  {
    title: "Batches",
    desc: "Oversee batches and student rosters.",
  },
];

export default function SchoolOwnerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || "School Owner";
  const userEmail = user?.email || "owner@spectropy.com";
  const coursePermissions = getCoursePermissions({ role: user?.role, permissions: user?.permissions });
  const questionPermissions = getQuestionPermissions(user);
  const examPermissions = getExamPermissions(user);

  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <RiHome2Line />,
      active: true,
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
              <h1 className="text-xl md:text-2xl font-bold">
                School Operations Dashboard
              </h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                Oversee approvals, exams, and staff operations.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards
            .filter((card) => {
              if (card.title === "Question Approvals") {
                return questionPermissions.canApprove || questionPermissions.canReject;
              }
              if (card.title === "Exams") {
                return examPermissions.canRead;
              }
              return true;
            })
            .map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Coming soon
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Focus for MVP</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Approve only vetted questions for school exams.</li>
            <li>Ensure exams follow schedule and visibility rules.</li>
            <li>Monitor teacher activity and student participation.</li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}




