import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import QuestionBankShell from "@/features/question-bank/components/QuestionBankShell";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";

interface QuestionBankLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showBack?: boolean;
  showQuestionBankNavActions?: boolean;
}

const roleDashboardMap: Record<string, string> = {
  super_admin: "/superadmin/dashboard",
  client_admin: "/admin/dashboard",
  content_authorizer: "/content-authorizer/dashboard",
  school_owner: "/school-owner/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

const hideQuestionBankUtilityActionsForRoles = new Set(["school_owner", "teacher"]);

export default function QuestionBankLayout({
  title,
  description,
  children,
  actions,
  showBack = true,
  showQuestionBankNavActions = false,
}: QuestionBankLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const permissions = getQuestionPermissions(user);
  const shouldHideUtilityActionsForRole = hideQuestionBankUtilityActionsForRoles.has(user?.role ?? "");
  const backPath = roleDashboardMap[user?.role ?? "teacher"] || "/login";
  const pageDescription = description ?? "Manage question bank resources.";
  const showHeaderBack =
    showBack && user?.role !== "client_admin" && !shouldHideUtilityActionsForRole;
  const canShowQuestionBankNavActions =
    showQuestionBankNavActions &&
    permissions.canCreate &&
    user?.role !== "client_admin" &&
    !shouldHideUtilityActionsForRole;
  const isConverterPage = location.pathname === "/question-bank/converter";
  const isBulkUploadPage = location.pathname === "/question-bank/bulk-upload";

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
          {canShowQuestionBankNavActions && !isConverterPage ? (
            <button
              onClick={() => navigate("/question-bank/converter")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Converter
            </button>
          ) : null}
          {canShowQuestionBankNavActions && !isBulkUploadPage ? (
            <button
              onClick={() => navigate("/question-bank/bulk-upload")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Bulk Upload
            </button>
          ) : null}
          {actions}
        </div>
      }
    >
      <main className="min-w-0">{children}</main>
    </QuestionBankShell>
  );
}
