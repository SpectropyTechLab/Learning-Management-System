import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import ExamShell from "@/features/exams/components/ExamShell";
import Pagination from "@/components/ui/Pagination";
import QuestionFilters, { type QuestionFiltersState } from "@/features/question-bank/components/QuestionFilters";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import type { CurriculumItem, Question } from "@/types/questionBank";
import type { ExamSection } from "@/features/exams/types";

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.program_id ?? item.grade_id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name:
        item.name ??
        (item.grade_number !== undefined && item.grade_number !== null
          ? `Grade ${item.grade_number}`
          : null) ??
        item.title ??
        item.subject_name ??
        "Untitled",
      code: item.code ?? null,
      program_id: item.program_id ?? item.programId ?? null,
      grade_id: item.grade_id ?? item.gradeId ?? null,
      grade_number: item.grade_number ?? item.gradeNumber ?? null,
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const resolveQuestionText = (value: any) => {
  if (typeof value === "string") return { html: value, json: null };
  if (value && typeof value === "object") {
    return { html: value.html ?? value.text ?? "", json: value.json ?? null };
  }
  return { html: "", json: null };
};

const normalizeOptions = (options: any) => {
  if (!Array.isArray(options)) return [];
  return options.map((option, index) => {
    if (typeof option === "string") {
      return { id: `${index}`, text: { html: option, json: null } };
    }
    if (option && typeof option === "object") {
      return {
        id: String(option.id ?? index),
        text:
          typeof option.text === "object"
            ? option.text
            : { html: option.text ?? option.label ?? option.value ?? "", json: null },
        is_correct: option.is_correct ?? option.isCorrect ?? option.correct ?? undefined,
      };
    }
    return { id: `${index}`, text: { html: String(option ?? ""), json: null } };
  });
};

const normalizeQuestions = (items: any[]): Question[] =>
  items.map((item) => ({
    id: item.id ?? item.question_id ?? `${Math.random()}`,
    question_type: item.question_type ?? "mcq_single",
    question_text: resolveQuestionText(item.question_text),
    options: normalizeOptions(item.options),
    correct_answer: item.correct_answer ?? null,
    solution: resolveQuestionText(item.solution),
    solution_video_url: item.solution_video_url ?? null,
    scoring_mode: item.scoring_mode ?? "all_or_nothing",
    comprehension_passage_id: item.comprehension_passage_id ?? null,
    comprehension: item.comprehension ?? null,
    comprehension_passage: resolveQuestionText(item.comprehension_passage),
    comprehension_questions: item.comprehension_questions ?? [],
    program_id: item.program_id ?? null,
    grade_id: item.grade_id ?? null,
    subject_id: item.subject_id ?? null,
    chapter_id: item.chapter_id ?? null,
    topic_id: item.topic_id ?? null,
    difficulty_level: item.difficulty_level ?? "easy",
    marks_positive: Number(item.marks_positive ?? 4),
    marks_negative: Number(item.marks_negative ?? 1),
    exam_tags: item.exam_tags ?? [],
    status: item.status ?? "draft",
    created_by:
      item.created_by_name ??
      (item.created_by !== undefined && item.created_by !== null ? String(item.created_by) : "Unknown"),
    created_at: item.created_at ?? null,
    review_note: item.review_note ?? item.rejection_reason ?? null,
  }));

export default function ExamSectionQuestionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, sectionId } = useParams();
  const [searchParams] = useSearchParams();
  const replaceQuestionId = searchParams.get("replaceQuestionId");
  const replaceOrderIndex = searchParams.get("orderIndex");
  const isReplaceMode = Boolean(replaceQuestionId);

  const [section, setSection] = useState<ExamSection | null>(null);
  const [sectionLoading, setSectionLoading] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [topics, setTopics] = useState<CurriculumItem[]>([]);

  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState<QuestionFiltersState>({
    search: "",
    programId: "",
    gradeId: "",
    subjectId: "",
    chapterId: "",
    topicId: "",
    difficulty: "",
    type: "",
    status: "approved",
  });

  useEffect(() => {
    let mounted = true;

    const loadSection = async () => {
      if (!id || !sectionId) {
        setSectionLoading(false);
        return;
      }

      setSectionLoading(true);
      try {
        const res = await api.get(`/exams/${id}`);
        if (!mounted) return;
        const sections = Array.isArray(res.data?.sections) ? res.data.sections : [];
        const matched = sections.find((item: any) => String(item.id) === String(sectionId)) ?? null;
        if (matched) {
          setSection(matched);
        } else {
          const titleFromState = (location.state as any)?.sectionTitle;
          setSection(
            titleFromState
              ? ({ id: Number(sectionId), exam_id: Number(id), title: titleFromState } as ExamSection)
              : null
          );
        }
      } catch {
        if (!mounted) return;
        const titleFromState = (location.state as any)?.sectionTitle;
        setSection(
          titleFromState
            ? ({ id: Number(sectionId), exam_id: Number(id), title: titleFromState } as ExamSection)
            : null
        );
      } finally {
        if (mounted) setSectionLoading(false);
      }
    };

    loadSection();

    return () => {
      mounted = false;
    };
  }, [id, sectionId, location.state]);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setPrograms(normalizeCurriculum(payload));
      } catch {
        setPrograms([]);
      }
    };

    loadPrograms();
  }, []);

  useEffect(() => {
    if (!filters.programId) {
      setGrades([]);
      setSubjects([]);
      setChapters([]);
      setTopics([]);
      return;
    }

    const loadGrades = async () => {
      try {
        const res = await api.get(`/programs/${filters.programId}/grades`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setGrades(normalizeCurriculum(payload));
      } catch {
        setGrades([]);
      }
    };

    loadGrades();
  }, [filters.programId]);

  useEffect(() => {
    if (!filters.gradeId) {
      setSubjects([]);
      setChapters([]);
      setTopics([]);
      return;
    }

    const loadSubjects = async () => {
      try {
        const res = await api.get(`/grades/${filters.gradeId}/subjects`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setSubjects(normalizeCurriculum(payload));
      } catch {
        setSubjects([]);
      }
    };

    loadSubjects();
  }, [filters.gradeId]);

  useEffect(() => {
    if (!filters.subjectId) {
      setChapters([]);
      setTopics([]);
      return;
    }

    const loadChapters = async () => {
      try {
        const res = await api.get(`/subjects/${filters.subjectId}/chapters`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setChapters(normalizeCurriculum(payload));
      } catch {
        setChapters([]);
      }
    };

    loadChapters();
  }, [filters.subjectId]);

  useEffect(() => {
    if (!filters.chapterId) {
      setTopics([]);
      return;
    }

    const loadTopics = async () => {
      try {
        const res = await api.get(`/chapters/${filters.chapterId}/topics`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setTopics(normalizeCurriculum(payload));
      } catch {
        setTopics([]);
      }
    };

    loadTopics();
  }, [filters.chapterId]);

  useEffect(() => {
    let mounted = true;

    const loadQuestions = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page,
          page_size: pageSize,
        };

        if (filters.search.trim()) params.q = filters.search.trim();
        if (filters.programId) params.program_id = filters.programId;
        if (filters.gradeId) params.grade_id = filters.gradeId;
        if (filters.subjectId) params.subject_id = filters.subjectId;
        if (filters.chapterId) params.chapter_id = filters.chapterId;
        if (filters.topicId) params.topic_id = filters.topicId;
        if (filters.difficulty) params.difficulty_level = filters.difficulty;
        if (filters.type) params.question_type = filters.type;
        if (filters.status) params.status = filters.status;

        const res = await api.get("/questions", { params });
        const payload = Array.isArray(res.data?.data) ? res.data.data : [];
        if (!mounted) return;
        const normalized = normalizeQuestions(payload);
        setQuestions(normalized);
        setTotal(Number(res.data?.total ?? normalized.length));
      } catch {
        if (!mounted) return;
        setQuestions([]);
        setTotal(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadQuestions();

    return () => {
      mounted = false;
    };
  }, [filters, page]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const selectedIds = useMemo(
    () => new Set(selectedQuestions.map((question) => String(question.id))),
    [selectedQuestions]
  );

  const availableChapters = chapters.filter(
    (chapter) => !filters.subjectId || String(chapter.subject_id) === filters.subjectId
  );
  const availableTopics = topics.filter(
    (topic) => !filters.chapterId || String(topic.chapter_id) === filters.chapterId
  );

  const toggleQuestion = (question: Question) => {
    const key = String(question.id);
    setSelectedQuestions((prev) => {
      if (isReplaceMode) {
        if (prev.length === 1 && String(prev[0].id) === key) return [];
        return [question];
      }
      const index = prev.findIndex((item) => String(item.id) === key);
      if (index >= 0) {
        const next = [...prev];
        next.splice(index, 1);
        return next;
      }
      return [...prev, question];
    });
  };

  const handleSave = async () => {
    if (!id || !sectionId) return;
    if (selectedQuestions.length === 0) {
      toast.error(isReplaceMode ? "Select one replacement question" : "Select at least one question");
      return;
    }

    if (isReplaceMode && selectedQuestions.length !== 1) {
      toast.error("Select exactly one replacement question");
      return;
    }

    setSaving(true);

    if (isReplaceMode) {
      try {
        await api.put(`/exams/${id}/sections/${sectionId}/questions/replace`, {
          current_question_id: Number(replaceQuestionId),
          new_question_id: Number(selectedQuestions[0].id),
        });
        toast.success("Question updated");
        navigate(`/exams/${id}/builder`);
      } catch (err: any) {
        const message =
          err?.response?.data?.error ??
          err?.response?.data?.message ??
          "Failed to replace question";
        toast.error(message);
      } finally {
        setSaving(false);
      }
      return;
    }

    let added = 0;
    let duplicates = 0;
    let failed = 0;
    const retryQueue: Question[] = [];

    for (const question of selectedQuestions) {
      const questionId = Number(question.id);
      if (Number.isNaN(questionId)) {
        failed += 1;
        retryQueue.push(question);
        continue;
      }

      try {
        await api.post(`/exams/${id}/sections/${sectionId}/questions`, {
          question_id: questionId,
        });
        added += 1;
      } catch (err: any) {
        if (err?.response?.status === 409) {
          duplicates += 1;
          continue;
        }
        failed += 1;
        retryQueue.push(question);
      }
    }

    if (added > 0) {
      toast.success(`Added ${added} question${added > 1 ? "s" : ""}`);
    }
    if (duplicates > 0) {
      toast(`${duplicates} question${duplicates > 1 ? "s" : ""} already exists in this section`);
    }
    if (failed > 0) {
      toast.error(`Failed to add ${failed} question${failed > 1 ? "s" : ""}`);
      setSelectedQuestions(retryQueue);
    } else {
      navigate(`/exams/${id}/builder`);
    }

    setSaving(false);
  };

  return (
    <ExamShell
      title={isReplaceMode ? "Replace Question" : "Add Questions"}
      description={
        isReplaceMode
          ? "Select one approved question to replace the generated question in this section."
          : "Pick questions and save them into this section."
      }
      backTo={id ? `/exams/${id}/builder` : "/exams"}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {sectionLoading ? "Loading section..." : `Section: ${section?.title ?? "Unknown"}`}
              </h2>
              <p className="text-sm text-slate-500">
                {selectedQuestions.length} selected {isReplaceMode ? "(replacement)" : "(not saved)"}
              </p>
              {isReplaceMode && replaceOrderIndex && (
                <p className="mt-1 text-xs text-slate-400">Replacing generated question Q{replaceOrderIndex}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/exams/${id}/builder`)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back to Builder
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || selectedQuestions.length === 0 || sectionLoading || !section}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : isReplaceMode ? "Save Replacement" : "Save Questions"}
              </button>
            </div>
          </div>
        </div>

        {!sectionLoading && !section && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Section not found. Please return to Exam Builder.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <QuestionFilters
            layout="vertical"
            filters={filters}
            programs={programs}
            grades={grades}
            subjects={subjects}
            chapters={availableChapters}
            topics={availableTopics}
            onChange={setFilters}
          />
        </div>

        <div>
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No questions match the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => {
                const key = String(question.id);
                const isSelected = selectedIds.has(key);
                return (
                  <div key={key} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleQuestion(question)}
                      className="mt-1"
                      disabled={saving}
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                          {question.question_type}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                          {question.difficulty_level}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                          {question.status}
                        </span>
                      </div>
                      <div className="mt-2">
                        <QuestionRenderer
                          question={question}
                          showMeta={false}
                          showOptions={false}
                          showAnswer={false}
                          showSolution={false}
                          showComprehension={true}
                          contentClassName="text-sm font-semibold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </ExamShell>
  );
}

