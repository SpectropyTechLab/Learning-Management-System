// src/pages/content_authorizer/Dashboard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import { RiCalendarCheckLine, RiHome2Line, RiFileList3Line, RiStackLine } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { PiChatsCircleBold } from 'react-icons/pi';

const featureCards = [
  {
    title: "Platform Question Bank",
    desc: "Curate reusable question sets for tenants.",
  },
  {
    title: "Content Packs",
    desc: "Bundle courses into licensed packs.",
  },
  {
    title: "Approval Queue",
    desc: "Review and approve platform-level content.",
  },
  {
    title: "Exam Templates",
    desc: "Define reusable exam structures.",
  },
];

export default function ContentAuthorizerDashboard() {
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
      active: true,
      onClick: () => navigate("/content-authorizer/dashboard"),
    },
    {
      key: "courses",
      label: "Courses",
      icon: <BiBookOpen />,
      active: false,
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
      key: "exams",
      label: "Exams",
      icon: <RiFileList3Line />,
      active: false,
      onClick: () => navigate("/exams"),
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
              <h1 className="text-xl md:text-2xl font-bold">
                Platform Content Dashboard
              </h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                Plan, review, and curate platform-wide content.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
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
            <li>Define platform-level question standards and formats.</li>
            <li>Prepare starter question packs for pilot tenants.</li>
            <li>Set review workflow for question approvals.</li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}




