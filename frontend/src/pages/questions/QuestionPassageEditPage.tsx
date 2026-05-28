import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import ComprehensionPassageForm from "@/features/question-bank/components/ComprehensionPassageForm";
import type { ComprehensionPassage, CurriculumItem, Question } from "@/types/questionBank";

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.program_id ?? item.grade_id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name:
        item.name ??
        (item.grade_number !== undefined && item.grade_number !== null ? `Grade ${item.grade_number}` : null) ??
        item.title ??
        item.subject_name ??
        "Untitled",
      program_id: item.program_id ?? item.programId ?? null,
      grade_id: item.grade_id ?? item.gradeId ?? null,
      grade_number: item.grade_number ?? item.gradeNumber ?? null,
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const normalizeRichText = (value: any) => {
  if (typeof value === "string") return { html: value, json: null };
  if (value && typeof value === "object") {
    return { html: value.html ?? value.text ?? "", json: value.json ?? null };
  }
  return { html: "", json: null };
};

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

const normalizeQuestionText = (value: any) => {
  if (typeof value === "string") return { html: value, json: null };
  if (value && typeof value === "object") {
    return { html: value.html ?? value.text ?? "", json: value.json ?? null };
  }
  return { html: "", json: null };
};

const normalizeOptions = (options: any) => {
  if (!Array.isArray(options)) return [];
  return options.map((option: any, index: number) => ({
    id: String(option.id ?? index),
    text: typeof option.text === "object" ? option.text : { html: option.text ?? "", json: null },
    is_correct: option.is_correct ?? option.isCorrect ?? option.correct ?? undefined,
  }));
};

const normalizeQuestion = (item: any): Question => ({
  id: item.id ?? item.question_id ?? `${Math.random()}`,
  question_type: item.question_type ?? "mcq_single",
  question_text: normalizeQuestionText(item.question_text),
  options: normalizeOptions(item.options),
  correct_answer: item.correct_answer ?? null,
  solution: normalizeQuestionText(item.solution),
  solution_video_url: item.solution_video_url ?? null,
  scoring_mode: item.scoring_mode ?? "all_or_nothing",
  comprehension_passage_id: item.comprehension_passage_id ?? null,
  comprehension: item.comprehension ?? null,
  comprehension_passage: normalizeQuestionText(item.comprehension_passage),
  comprehension_questions: item.comprehension_questions ?? [],
  program_id: item.program_id ?? null,
  grade_id: item.grade_id ?? null,
  subject_id: item.subject_id ?? null,
  chapter_id: item.chapter_id ?? null,
  topic_id: item.topic_id ?? null,
  folder_id: item.folder_id ?? null,
  question_group_type: item.question_group_type ?? null,
  difficulty_level: item.difficulty_level ?? "easy",
  marks_positive: Number(item.marks_positive ?? 4),
  marks_negative: Number(item.marks_negative ?? 1),
  category: item.category ?? null,
  exam_tags: item.exam_tags ?? [],
  status: item.status ?? "draft",
  created_by: item.created_by ?? "Unknown",
  created_at: item.created_at ?? null,
  review_note: item.review_note ?? null,
});

const stripHtml = (value: { html?: string | null } | null | undefined) =>
  String(value?.html ?? "").replace(/<[^>]*>/g, "").trim();

export default function QuestionPassageEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "";
  const passagesListPath = useMemo(
    () =>
      returnTo
        ? `/question-bank/passages?returnTo=${encodeURIComponent(returnTo)}`
        : "/question-bank/passages",
    [returnTo]
  );
  const childQuestionReturnPath = useMemo(
    () => returnTo || passagesListPath,
    [passagesListPath, returnTo]
  );
  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [passage, setPassage] = useState<ComprehensionPassage | null>(null);
  const [childQuestions, setChildQuestions] = useState<Question[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setPrograms(normalizeCurriculum(payload));
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, []);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/comprehension-passages/${id}`);
        if (!mounted) return;
        setPassage(normalizePassage(res.data));
      } catch {
        if (!mounted) return;
        setPassage(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const loadChildQuestions = async () => {
      setLoadingChildren(true);
      try {
        const res = await api.get("/questions", {
          params: {
            page: 1,
            page_size: 200,
            comprehension_passage_id: id,
          },
        });
        const payload = Array.isArray(res.data?.data) ? res.data.data : [];
        if (!mounted) return;
        setChildQuestions(payload.map(normalizeQuestion));
      } catch {
        if (!mounted) return;
        setChildQuestions([]);
      } finally {
        if (mounted) setLoadingChildren(false);
      }
    };

    loadChildQuestions();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSave = async (payload: Record<string, unknown>) => {
    try {
      await api.put(`/comprehension-passages/${id}`, payload);
      navigate(passagesListPath);
    } catch (error: any) {
      alert(error?.response?.data?.error || "Failed to update passage.");
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Passage"
      description="Update the shared passage content used by linked questions."
    >
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading passage...
        </div>
      ) : passage ? (
        <>
          <ComprehensionPassageForm
            initialPassage={passage}
            programs={programs}
            grades={[]}
            subjects={[]}
            chapters={[]}
            topics={[]}
            onClose={() => navigate(passagesListPath)}
            onSave={handleSave}
          />
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Linked Child Questions</h3>
                <p className="text-sm text-slate-500">
                  Edit the child questions here to update options, answers, and solutions.
                </p>
              </div>
            </div>

            {loadingChildren ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Loading linked questions...
              </div>
            ) : childQuestions.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No linked child questions found for this passage.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {childQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Question {index + 1}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {stripHtml(question.question_text) || "No preview available"}
                        </p>
                        <div className="mt-2 text-xs text-slate-500">
                          {question.question_type} | {question.difficulty_level} | {question.status}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/question-bank/${question.id}/edit?returnTo=${encodeURIComponent(
                                childQuestionReturnPath
                              )}`
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Edit Question
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/question-bank/${question.id}/delete?returnTo=${encodeURIComponent(
                                childQuestionReturnPath
                              )}`
                            )
                          }
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Passage not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
