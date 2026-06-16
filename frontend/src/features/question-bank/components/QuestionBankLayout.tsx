import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import QuestionBankShell from "@/features/question-bank/components/QuestionBankShell";

interface QuestionBankLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showBack?: boolean;
}

const roleDashboardMap: Record<string, string> = {
  super_admin: "/superadmin/dashboard",
  client_admin: "/admin/dashboard",
  content_authorizer: "/content-authorizer/dashboard",
  school_owner: "/school-owner/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export default function QuestionBankLayout({
  title,
  description,
  children,
  actions,
  showBack = true,
}: QuestionBankLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const backPath = roleDashboardMap[user?.role ?? "teacher"] || "/login";
  const pageDescription = description ?? "Manage question bank resources.";
  const showHeaderBack = showBack && user?.role !== "client_admin";

  return (
    <QuestionBankShell
      title={title}
      description={pageDescription}
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          {showHeaderBack && (
            <button
              onClick={() => navigate(backPath)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
          )}
          {actions}
        </div>
      }
    >
      <main className="min-w-0">{children}</main>
    </QuestionBankShell>
  );
}
