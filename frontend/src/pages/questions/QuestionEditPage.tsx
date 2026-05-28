import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import QuestionForm from "@/features/question-bank/components/QuestionForm";
import type { CurriculumItem, Question } from "@/types/questionBank";

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

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name: item.name ?? item.title ?? item.subject_name ?? "Untitled",
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get("folderId") ?? "";
  const returnTo = searchParams.get("returnTo") ?? "";
  const returnPath = useMemo(
    () => (returnTo || (folderId ? `/question-bank/folders/${folderId}` : "/question-bank")),
    [folderId, returnTo]
  );
  const passageLibraryPath = useMemo(
    () =>
      returnTo
        ? `/question-bank/passages?returnTo=${encodeURIComponent(returnTo)}`
        : "/question-bank/passages",
    [returnTo]
  );
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters] = useState<CurriculumItem[]>([]);
  const [topics] = useState<CurriculumItem[]>([]);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (payload.length) {
          setPrograms(normalizeCurriculum(payload));
        }
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadQuestion = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/questions/${id}`);
        if (!res.data) throw new Error("Missing data");
        setQuestion(normalizeQuestion(res.data));
      } catch {
        setQuestion(null);
      } finally {
        setLoading(false);
      }
    };
    loadQuestion();
  }, [id]);

  const handleSave = async (payload: Omit<Question, "id">) => {
    if (!id) return;
    try {
      await api.put(`/questions/${id}`, payload);
      navigate(returnPath, {
        state: !folderId ? { refreshQuestionList: true } : null,
      });
      return;
    } catch {
      alert("Failed to update question.");
      return;
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Question"
      description={
        folderId
          ? "Update the question details while staying inside this folder."
          : "Update the question details and answers."
      }
      showBack={false}
      actions={
        <button
          onClick={() => navigate(returnPath)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading question...
        </div>
      ) : question?.question_type === "comprehensive" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center text-sm text-amber-800">
          <p>
            Legacy comprehensive parent records can no longer be edited in-place.
            Create or edit a linked passage from the passage library, then work with the migrated child questions.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate(passageLibraryPath)}
              className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Go to Passage Library
            </button>
          </div>
        </div>
      ) : question ? (
        <QuestionForm
          variant="page"
          initialQuestion={question}
          programs={programs}
          grades={grades}
          subjects={subjects}
          chapters={chapters}
          topics={topics}
          onClose={() => navigate(returnPath)}
          onSave={(payload) => handleSave(payload)}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Question not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
