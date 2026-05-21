import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { ComprehensionPassage } from "@/types/questionBank";

const normalizeRichText = (value: any) => {
  if (typeof value === "string") return { html: value, json: null };
  if (value && typeof value === "object") {
    return { html: value.html ?? value.text ?? "", json: value.json ?? null };
  }
  return { html: "", json: null };
};

const stripHtml = (value: { html?: string | null } | null | undefined) =>
  String(value?.html ?? "").replace(/<[^>]*>/g, "").trim();

const normalizePassage = (item: any): ComprehensionPassage => ({
  id: (item.id ?? "") as string | number,
  title: normalizeRichText(item.title),
  passage_content: normalizeRichText(item.passage_content),
  program_id: item.program_id ?? null,
  grade_id: item.grade_id ?? null,
  subject_id: item.subject_id ?? null,
  chapter_id: item.chapter_id ?? null,
  topic_id: item.topic_id ?? null,
  created_at: item.created_at ?? undefined,
  updated_at: item.updated_at ?? undefined,
});

export default function QuestionPassagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = getQuestionPermissions(user);
  const [passages, setPassages] = useState<ComprehensionPassage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/comprehension-passages", {
          params: { page: 1, page_size: 200 },
        });
        const payload = Array.isArray(res.data?.data) ? res.data.data : [];
        if (!mounted) return;
        setPassages(payload.map(normalizePassage));
      } catch {
        if (!mounted) return;
        setPassages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <QuestionBankLayout
      title="Comprehension Passages"
      description="Create and maintain shared passages that can be linked to normal questions."
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/question-bank")}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Back to Questions
          </button>
          {permissions.canCreate ? (
            <button
              onClick={() => navigate("/question-bank/passages/new")}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Passage
            </button>
          ) : null}
        </div>
      }
    >
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading passages...
        </div>
      ) : passages.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No passages found.
        </div>
      ) : (
        <div className="space-y-3">
          {passages.map((passage) => (
            <div key={passage.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {stripHtml(passage.title) || `Passage ${passage.id}`}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-3">
                    {stripHtml(passage.passage_content) || "No preview available"}
                  </p>
                </div>
                {permissions.canCreate ? (
                  <button
                    onClick={() => navigate(`/question-bank/passages/${passage.id}/edit`)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </QuestionBankLayout>
  );
}
