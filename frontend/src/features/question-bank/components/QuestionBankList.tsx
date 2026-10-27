import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CurriculumItem, Question } from "@/types/questionBank";
import QuestionFilters, { type QuestionFiltersState } from "./QuestionFilters";
import QuestionCard from "./QuestionCard";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";

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
  if (!Array.isArray(options)) {
    if (options && typeof options === "object" && options.left && options.right) {
      const normalizeSide = (side: any[]) =>
        side.map((option, index) => ({
          id: String(option.id ?? index),
          text: typeof option.text === "object" ? option.text : { html: option.text ?? "", json: null },
          is_correct: option.is_correct ?? undefined,
        }));
      return {
        left: normalizeSide(options.left),
        right: normalizeSide(options.right),
      };
    }
    return [];
  }

  const matchLeft = options
    .filter((option) => option && typeof option === "object" && option.side === "left")
    .map((option, index) => ({
      id: String(option.id ?? `left-${index}`),
      text: typeof option.text === "object" ? option.text : { html: option.text ?? option.label ?? option.value ?? "", json: null },
      is_correct: option.is_correct ?? option.isCorrect ?? option.correct ?? undefined,
    }));
  const matchRight = options
    .filter((option) => option && typeof option === "object" && option.side === "right")
    .map((option, index) => ({
      id: String(option.id ?? `right-${index}`),
      text: typeof option.text === "object" ? option.text : { html: option.text ?? option.label ?? option.value ?? "", json: null },
      is_correct: option.is_correct ?? option.isCorrect ?? option.correct ?? undefined,
    }));

  if (matchLeft.length || matchRight.length) {
    return {
      left: matchLeft,
      right: matchRight,
    };
  }

  return options.map((option, index) => {
    if (typeof option === "string") {
      return { id: `${index}`, text: { html: option, json: null } };
    }
    if (option && typeof option === "object") {
      return {
        id: String(option.id ?? index),
        text: typeof option.text === "object" ? option.text : { html: option.text ?? option.label ?? option.value ?? "", json: null },
        is_correct: option.is_correct ?? option.isCorrect ?? option.correct ?? undefined,
      };
    }
    return { id: `${index}`, text: { html: String(option ?? ""), json: null } };
  });
};

const normalizeComprehensionQuestions = (questions: any[] | undefined) =>
  Array.isArray(questions)
    ? questions.map((item, index) => ({
        id: item?.id ?? `sub-${index}`,
        question_type: item?.question_type ?? "mcq_single",
        question_text: resolveQuestionText(item?.question_text),
        options: normalizeOptions(item?.options),
        correct_answer: item?.correct_answer ?? null,
        marks_positive: Number(item?.marks_positive ?? 0),
        marks_negative: Number(item?.marks_negative ?? 0),
      }))
    : [];

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
    comprehension_questions: normalizeComprehensionQuestions(item.comprehension_questions),
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
    created_by:
      item.created_by_name ??
      (item.created_by !== undefined && item.created_by !== null ? String(item.created_by) : "Unknown"),
    created_at: item.created_at ?? null,
    review_note: item.review_note ?? item.rejection_reason ?? null,
    canEdit: item.canEdit ?? item.can_edit,
    canDelete: item.canDelete ?? item.can_delete,
    canApprove: item.canApprove ?? item.can_approve,
    canReject: item.canReject ?? item.can_reject,
    canAddQuestion: item.canAddQuestion ?? item.can_add_question,
  }));

const sortByIdAsc = (items: Question[]) => {
  return [...items].sort((a, b) => {
    const aNum = Number(a.id);
    const bNum = Number(b.id);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum;
    }
    return String(a.id).localeCompare(String(b.id));
  });
};

const DEFAULT_FILTERS: QuestionFiltersState = {
  search: "",
  programId: "",
  gradeId: "",
  subjectId: "",
  chapterId: "",
  topicId: "",
  difficulty: "",
  type: "",
  questionGroupType: "",
  status: "",
};

const FILTER_PARAM_KEYS = {
  search: "q",
  programId: "program_id",
  gradeId: "grade_id",
  subjectId: "subject_id",
  chapterId: "chapter_id",
  topicId: "topic_id",
  difficulty: "difficulty_level",
  type: "question_type",
  questionGroupType: "question_group_type",
  status: "status",
} as const;

const readFiltersFromSearchParams = (searchParams: URLSearchParams): QuestionFiltersState => ({
  search: searchParams.get(FILTER_PARAM_KEYS.search) ?? "",
  programId: searchParams.get(FILTER_PARAM_KEYS.programId) ?? "",
  gradeId: searchParams.get(FILTER_PARAM_KEYS.gradeId) ?? "",
  subjectId: searchParams.get(FILTER_PARAM_KEYS.subjectId) ?? "",
  chapterId: searchParams.get(FILTER_PARAM_KEYS.chapterId) ?? "",
  topicId: searchParams.get(FILTER_PARAM_KEYS.topicId) ?? "",
  difficulty: searchParams.get(FILTER_PARAM_KEYS.difficulty) ?? "",
  type: searchParams.get(FILTER_PARAM_KEYS.type) ?? "",
  questionGroupType: searchParams.get(FILTER_PARAM_KEYS.questionGroupType) ?? "",
  status: searchParams.get(FILTER_PARAM_KEYS.status) ?? "",
});

const readPageFromSearchParams = (searchParams: URLSearchParams) => {
  const parsed = Number(searchParams.get("page") ?? "1");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const areFiltersEqual = (left: QuestionFiltersState, right: QuestionFiltersState) =>
  left.search === right.search &&
  left.programId === right.programId &&
  left.gradeId === right.gradeId &&
  left.subjectId === right.subjectId &&
  left.chapterId === right.chapterId &&
  left.topicId === right.topicId &&
  left.difficulty === right.difficulty &&
  left.type === right.type &&
  left.questionGroupType === right.questionGroupType &&
  left.status === right.status;

const isLegacyComprehensiveParent = (question: Question) =>
  question.question_type === "comprehensive" && !question.comprehension_passage_id;

export default function QuestionBankList({
  filtersPlacement = "sidebar",
  folderId = null,
}: {
  filtersPlacement?: "content" | "sidebar";
  folderId?: string | number | null;
}) {
  const { user, token } = useAuth();
  const permissions = getQuestionPermissions(user);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarHost, setSidebarHost] = useState<Element | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [topics, setTopics] = useState<CurriculumItem[]>([]);

  const [filters, setFilters] = useState<QuestionFiltersState>(() => readFiltersFromSearchParams(searchParams));

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectQuestion, setRejectQuestion] = useState<Question | null>(null);

  const [currentPage, setCurrentPage] = useState(() => readPageFromSearchParams(searchParams));
  const pageSize = 25;
  const [total, setTotal] = useState(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  useEffect(() => {
    if (!authHeaders) {
      setPrograms([]);
      return;
    }

    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs", { headers: authHeaders });
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
  }, [authHeaders]);

  useEffect(() => {
    let isMounted = true;
    const loadQuestions = async () => {
      if (!authHeaders) {
        if (!isMounted) return;
        setQuestions([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page: currentPage,
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
        if (filters.questionGroupType) params.question_group_type = filters.questionGroupType;
        if (filters.status) params.status = filters.status;
        if (folderId !== null && folderId !== undefined && String(folderId).trim() !== "") {
          params.folder_id = String(folderId);
        }

        const res = await api.get("/questions", {
          params,
          headers: authHeaders,
        });
        const payload = Array.isArray(res.data?.data) ? res.data.data : [];
        if (!isMounted) return;
        setQuestions(sortByIdAsc(normalizeQuestions(payload)));
        setTotal(Number(res.data?.total ?? payload.length));
      } catch {
        if (!isMounted) return;
        setQuestions([]);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [filters, currentPage, pageSize, authHeaders, folderId, refreshNonce]);

  useEffect(() => {
    let isMounted = true;
    const loadGrades = async () => {
      if (!authHeaders) {
        if (isMounted) {
          setGrades([]);
          setSubjects([]);
          setChapters([]);
          setTopics([]);
        }
        return;
      }

      if (!filters.programId) {
        if (isMounted) {
          setGrades([]);
          setSubjects([]);
          setChapters([]);
          setTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/programs/${filters.programId}/grades`, {
          headers: authHeaders,
        });
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setGrades(normalizeCurriculum(payload));
      } catch {
        if (!isMounted) return;
        setGrades([]);
      }
    };

    loadGrades();
    return () => {
      isMounted = false;
    };
  }, [filters.programId, authHeaders]);

  useEffect(() => {
    let isMounted = true;
    const loadSubjects = async () => {
      if (!authHeaders) {
        if (isMounted) {
          setSubjects([]);
          setChapters([]);
          setTopics([]);
        }
        return;
      }

      if (!filters.gradeId) {
        if (isMounted) {
          setSubjects([]);
          setChapters([]);
          setTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/grades/${filters.gradeId}/subjects`, {
          headers: authHeaders,
        });
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setSubjects(normalizeCurriculum(payload));
      } catch {
        if (!isMounted) return;
        setSubjects([]);
      }
    };

    loadSubjects();
    return () => {
      isMounted = false;
    };
  }, [filters.gradeId, authHeaders]);

  useEffect(() => {
    let isMounted = true;
    const loadChapters = async () => {
      if (!authHeaders) {
        if (isMounted) {
          setChapters([]);
          setTopics([]);
        }
        return;
      }

      if (!filters.subjectId) {
        if (isMounted) {
          setChapters([]);
          setTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/subjects/${filters.subjectId}/chapters`, {
          headers: authHeaders,
        });
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setChapters(normalizeCurriculum(payload));
      } catch {
        if (!isMounted) return;
        setChapters([]);
      }
    };

    loadChapters();
    return () => {
      isMounted = false;
    };
  }, [filters.subjectId, authHeaders]);

  useEffect(() => {
    let isMounted = true;
    const loadTopics = async () => {
      if (!authHeaders) {
        if (isMounted) setTopics([]);
        return;
      }

      if (!filters.chapterId) {
        if (isMounted) setTopics([]);
        return;
      }
      try {
        const res = await api.get(`/chapters/${filters.chapterId}/topics`, {
          headers: authHeaders,
        });
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setTopics(normalizeCurriculum(payload));
      } catch {
        if (!isMounted) return;
        setTopics([]);
      }
    };

    loadTopics();
    return () => {
      isMounted = false;
    };
  }, [filters.chapterId, authHeaders]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setSidebarHost(document.getElementById("question-bank-sidebar-slot"));
  }, []);

  useEffect(() => {
    const nextFilters = readFiltersFromSearchParams(searchParams);
    const nextPage = readPageFromSearchParams(searchParams);
    setFilters((previous) => (areFiltersEqual(previous, nextFilters) ? previous : nextFilters));
    setCurrentPage((previous) => (previous === nextPage ? previous : nextPage));
  }, [searchParams]);

  useEffect(() => {
    const state = location.state as
      | {
        refreshQuestionList?: boolean;
      }
      | null;
    if (!state?.refreshQuestionList) return;

    setRefreshNonce((previous) => previous + 1);
    navigate(`${location.pathname}${location.search}`, { replace: true });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    Object.values(FILTER_PARAM_KEYS).forEach((key) => nextParams.delete(key));
    nextParams.delete("page");

    if (filters.search.trim()) nextParams.set(FILTER_PARAM_KEYS.search, filters.search.trim());
    if (filters.programId) nextParams.set(FILTER_PARAM_KEYS.programId, filters.programId);
    if (filters.gradeId) nextParams.set(FILTER_PARAM_KEYS.gradeId, filters.gradeId);
    if (filters.subjectId) nextParams.set(FILTER_PARAM_KEYS.subjectId, filters.subjectId);
    if (filters.chapterId) nextParams.set(FILTER_PARAM_KEYS.chapterId, filters.chapterId);
    if (filters.topicId) nextParams.set(FILTER_PARAM_KEYS.topicId, filters.topicId);
    if (filters.difficulty) nextParams.set(FILTER_PARAM_KEYS.difficulty, filters.difficulty);
    if (filters.type) nextParams.set(FILTER_PARAM_KEYS.type, filters.type);
    if (filters.questionGroupType) nextParams.set(FILTER_PARAM_KEYS.questionGroupType, filters.questionGroupType);
    if (filters.status) nextParams.set(FILTER_PARAM_KEYS.status, filters.status);
    if (currentPage > 1) nextParams.set("page", String(currentPage));

    const currentSerialized = searchParams.toString();
    const nextSerialized = nextParams.toString();
    if (currentSerialized !== nextSerialized) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [currentPage, filters, searchParams, setSearchParams]);

  const availableChapters = useMemo(
    () =>
      chapters.filter(
        (chapter) => !filters.subjectId || String(chapter.subject_id) === filters.subjectId
      ),
    [chapters, filters.subjectId]
  );

  const availableTopics = useMemo(
    () =>
      topics.filter(
        (topic) => !filters.chapterId || String(topic.chapter_id) === filters.chapterId
      ),
    [topics, filters.chapterId]
  );

  const filteredQuestions = questions;

  useEffect(() => {
    setCurrentPage(1);
  }, [folderId]);

  const totalCount = total;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedQuestions = filteredQuestions;
  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter(
        (value) => typeof value === "string" && value.trim() !== ""
      ).length,
    [filters]
  );

  const handleApprove = async (question: Question) => {
    try {
      await api.post(`/questions/${question.id}/approve`);
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === question.id ? { ...item, status: "approved", review_note: null } : item
        )
      );
    } catch {
      alert("Failed to approve question.");
    }
  };

  const handleReject = (question: Question) => {
    setRejectQuestion(question);
    setRejectReason(question.review_note ?? "");
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectQuestion) return;
    try {
      const reason = rejectReason.trim() || "Rejected";
      await api.post(`/questions/${rejectQuestion.id}/reject`, { reason });
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === rejectQuestion.id
            ? { ...item, status: "rejected", review_note: rejectReason || "Rejected" }
            : item
        )
      );
    } catch {
      alert("Failed to reject question.");
    }
    setRejectModalOpen(false);
  };

  const filtersPanel = (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Filters
      </h3>

      <QuestionFilters
        layout="vertical"
        filters={filters}
        programs={programs}
        grades={grades}
        subjects={subjects}
        chapters={availableChapters}
        topics={availableTopics}
        onChange={(nextFilters) => {
          setFilters(nextFilters);
          setCurrentPage(1);
        }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Question Library</h2>
          <p className="text-sm text-slate-500">
            {totalCount} questions found
          </p>
        </div>
      </div>

      {!permissions.canCreate && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          You have read-only access to the question bank. Contact an administrator to request edit
          permissions.
        </div>
      )}

      {filtersPlacement !== "sidebar" || !sidebarHost ? (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-800">
            <span>Filters</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {activeFilterCount > 0 ? `${activeFilterCount} active` : "Optional"}
            </span>
          </summary>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <QuestionFilters
              filters={filters}
              programs={programs}
              grades={grades}
              subjects={subjects}
              chapters={availableChapters}
              topics={availableTopics}
              onChange={(nextFilters) => {
                setFilters(nextFilters);
                setCurrentPage(1);
              }}
            />
          </div>
        </details>
      ) : (
        createPortal(filtersPanel, sidebarHost)
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading questions...
        </div>
      ) : paginatedQuestions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No questions match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedQuestions.map((question, index) => (
            <QuestionCard
              key={question.id}
              number={(currentPage - 1) * pageSize + index + 1}
              question={question}
              permissions={permissions}
              onEdit={(item) => {
                if (isLegacyComprehensiveParent(item)) {
                  navigate(
                    `/question-bank/passages?returnTo=${encodeURIComponent(
                      `${location.pathname}${location.search}`
                    )}`
                  );
                  return;
                }

                navigate(
                  folderId
                    ? `/question-bank/${item.id}/edit?folderId=${encodeURIComponent(String(folderId))}`
                    : `/question-bank/${item.id}/edit?returnTo=${encodeURIComponent(
                        `${location.pathname}${location.search}`
                      )}`
                );
              }}
              onDelete={(item) =>
                navigate(
                  folderId
                    ? `/question-bank/${item.id}/delete?folderId=${encodeURIComponent(String(folderId))}`
                    : `/question-bank/${item.id}/delete?returnTo=${encodeURIComponent(
                        `${location.pathname}${location.search}`
                      )}`
                )
              }
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
              {totalCount === 0
                ? 0
                : Math.min(currentPage * pageSize, totalCount)}{" "}
              of {totalCount}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${page === currentPage
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Reject Question</h3>
            <p className="text-xs text-slate-500">
              Add a brief note to help the author improve the question.
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="Reason for rejection"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
