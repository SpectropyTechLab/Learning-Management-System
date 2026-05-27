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

const featureCards = [
  { title: "Question Bank", desc: "Create and draft questions by subject and chapter." },
  { title: "Exams", desc: "Build exams with sections and rules." },
  { title: "Results", desc: "Review performance after grading." },
  { title: "Courses", desc: "Publish lessons and manage course content." },
];

export default function TeacherHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = getDashboardTheme(false);
  const userFullName = user?.full_name || "Teacher";
  const userEmail = user?.email || "teacher@spectropy.com";
  const coursePermissions = getCoursePermissions({ role: user?.role, permissions: user?.permissions });
  const questionPermissions = getQuestionPermissions({ role: user?.role, permissions: user?.permissions });
  const examPermissions = getExamPermissions({ role: user?.role, permissions: user?.permissions });

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
          brandName="Spectropy"
          title="Teacher"
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
            {coursePermissions.canView && (
              <button
                onClick={() => navigate("/teacher/courses")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border ${theme.secondaryBorderClass}`}
              >
                Manage Courses
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards
            .filter((card) => {
              if (card.title === "Question Bank") {
                return questionPermissions.canView;
              }
              if (card.title === "Exams") {
                return examPermissions.canRead;
              }
              if (card.title === "Courses") {
                return coursePermissions.canView;
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
            <li>Create draft questions for approval.</li>
            <li>Assemble exams and assign them to batches.</li>
            <li>Track submissions and view results.</li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}




