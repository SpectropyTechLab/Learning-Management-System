import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import QuestionBankList from "@/features/question-bank/components/QuestionBankList";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const permissions = getQuestionPermissions(user);
  const returnTo = `${location.pathname}${location.search}`;

  return (
    <QuestionBankLayout
      title="Question Bank"
      description="Create, review, and organize assessment questions."
      actions={
        permissions.canCreate ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/question-bank/converter")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Converter
            </button>
            <button
              onClick={() => navigate("/question-bank/bulk-upload")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Bulk Upload
            </button>
            <button
              onClick={() =>
                navigate(`/question-bank/passages?returnTo=${encodeURIComponent(returnTo)}`)
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Manage Passages
            </button>
            <button
              onClick={() =>
                navigate(`/question-bank/new?returnTo=${encodeURIComponent(returnTo)}`)
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Question
            </button>
          </div>
        ) : null
      }
    >
      <QuestionBankList filtersPlacement="content" />
    </QuestionBankLayout>
  );
}
