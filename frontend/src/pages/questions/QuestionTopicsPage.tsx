import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const toArray = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.program_id ?? item.grade_id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name:
        item.name ??
        item.title ??
        (item.grade_number !== undefined && item.grade_number !== null
          ? `Grade ${item.grade_number}`
          : "Untitled"),
      program_id: item.program_id ?? null,
      grade_id: item.grade_id ?? null,
      grade_number: item.grade_number ?? null,
      subject_id: item.subject_id ?? null,
      chapter_id: item.chapter_id ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const buildHierarchyQuery = (
  programId: string,
  gradeId: string,
  subjectId: string,
  chapterId: string
) => {
  const params = new URLSearchParams();
  if (programId) params.set("program_id", programId);
  if (gradeId) params.set("grade_id", gradeId);
  if (subjectId) params.set("subject_id", subjectId);
  if (chapterId) params.set("chapter_id", chapterId);
  const query = params.toString();
  return query ? `?${query}` : "";
};

const parseQuery = (params: URLSearchParams) => ({
  programId: params.get("program_id") ?? "",
  gradeId: params.get("grade_id") ?? "",
  subjectId: params.get("subject_id") ?? "",
  chapterId: params.get("chapter_id") ?? "",
});

export default function QuestionTopicsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = parseQuery(searchParams);

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [topics, setTopics] = useState<CurriculumItem[]>([]);

  const [selectedProgramId, setSelectedProgramId] = useState(initialQuery.programId);
  const [selectedGradeId, setSelectedGradeId] = useState(initialQuery.gradeId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialQuery.subjectId);
  const [selectedChapterId, setSelectedChapterId] = useState(initialQuery.chapterId);

  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as
      | { createdTopic?: CurriculumItem; updatedTopic?: CurriculumItem }
      | null;
    if (!state) return;

    if (state.createdTopic && String(state.createdTopic.chapter_id ?? "") === selectedChapterId) {
      setTopics((prev) => [state.createdTopic as CurriculumItem, ...prev]);
    }
    if (state.updatedTopic && String(state.updatedTopic.chapter_id ?? "") === selectedChapterId) {
      setTopics((prev) =>
        prev.map((item) =>
          String(item.id) === String(state.updatedTopic?.id)
            ? (state.updatedTopic as CurriculumItem)
            : item
        )
      );
    }

    navigate(`${location.pathname}${location.search}`, { replace: true });
  }, [location.pathname, location.search, location.state, navigate, selectedChapterId]);

  useEffect(() => {
    const loadPrograms = async () => {
      setLoadingPrograms(true);
      setError(null);
      try {
        const res = await api.get("/programs");
        const normalized = normalizeCurriculum(toArray(res.data));
        setPrograms(normalized);

        if (selectedProgramId && !normalized.some((item) => String(item.id) === selectedProgramId)) {
          setSelectedProgramId("");
          setSelectedGradeId("");
          setSelectedSubjectId("");
          setSelectedChapterId("");
        }
      } catch (err: any) {
        setPrograms([]);
        setError(err?.response?.data?.error || "Failed to load programs");
      } finally {
        setLoadingPrograms(false);
      }
    };
    loadPrograms();
  }, []);

  useEffect(() => {
    if (!selectedProgramId) {
      setGrades([]);
      setSelectedGradeId("");
      setSubjects([]);
      setSelectedSubjectId("");
      setChapters([]);
      setSelectedChapterId("");
      setTopics([]);
      return;
    }

    const loadGrades = async () => {
      setLoadingGrades(true);
      setError(null);
      try {
        const res = await api.get(`/programs/${selectedProgramId}/grades`);
        const normalized = normalizeCurriculum(toArray(res.data));
        setGrades(normalized);

        if (selectedGradeId && !normalized.some((item) => String(item.id) === selectedGradeId)) {
          setSelectedGradeId("");
          setSubjects([]);
          setSelectedSubjectId("");
          setChapters([]);
          setSelectedChapterId("");
          setTopics([]);
        }
      } catch (err: any) {
        setGrades([]);
        setSelectedGradeId("");
        setSubjects([]);
        setSelectedSubjectId("");
        setChapters([]);
        setSelectedChapterId("");
        setTopics([]);
        setError(err?.response?.data?.error || "Failed to load grades");
      } finally {
        setLoadingGrades(false);
      }
    };
    loadGrades();
  }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedGradeId) {
      setSubjects([]);
      setSelectedSubjectId("");
      setChapters([]);
      setSelectedChapterId("");
      setTopics([]);
      return;
    }

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setError(null);
      try {
        const res = await api.get(`/grades/${selectedGradeId}/subjects`);
        const normalized = normalizeCurriculum(toArray(res.data));
        setSubjects(normalized);

        if (selectedSubjectId && !normalized.some((item) => String(item.id) === selectedSubjectId)) {
          setSelectedSubjectId("");
          setChapters([]);
          setSelectedChapterId("");
          setTopics([]);
        }
      } catch (err: any) {
        setSubjects([]);
        setSelectedSubjectId("");
        setChapters([]);
        setSelectedChapterId("");
        setTopics([]);
        setError(err?.response?.data?.error || "Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, [selectedGradeId]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setChapters([]);
      setSelectedChapterId("");
      setTopics([]);
      return;
    }

    const loadChapters = async () => {
      setLoadingChapters(true);
      setError(null);
      try {
        const res = await api.get(`/subjects/${selectedSubjectId}/chapters`);
        const normalized = normalizeCurriculum(toArray(res.data));
        setChapters(normalized);

        if (selectedChapterId && !normalized.some((item) => String(item.id) === selectedChapterId)) {
          setSelectedChapterId("");
          setTopics([]);
        }
      } catch (err: any) {
        setChapters([]);
        setSelectedChapterId("");
        setTopics([]);
        setError(err?.response?.data?.error || "Failed to load chapters");
      } finally {
        setLoadingChapters(false);
      }
    };
    loadChapters();
  }, [selectedSubjectId]);

  useEffect(() => {
    if (!selectedChapterId) {
      setTopics([]);
      return;
    }

    const loadTopics = async () => {
      setLoadingTopics(true);
      setError(null);
      try {
        const res = await api.get(`/chapters/${selectedChapterId}/topics`);
        setTopics(normalizeCurriculum(toArray(res.data)));
      } catch (err: any) {
        setTopics([]);
        setError(err?.response?.data?.error || "Failed to load topics");
      } finally {
        setLoadingTopics(false);
      }
    };
    loadTopics();
  }, [selectedChapterId]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedProgramId) params.program_id = selectedProgramId;
    if (selectedGradeId) params.grade_id = selectedGradeId;
    if (selectedSubjectId) params.subject_id = selectedSubjectId;
    if (selectedChapterId) params.chapter_id = selectedChapterId;
    setSearchParams(params);
  }, [selectedProgramId, selectedGradeId, selectedSubjectId, selectedChapterId, setSearchParams]);

  const selectedProgramName = useMemo(
    () => programs.find((item) => String(item.id) === selectedProgramId)?.name ?? "Selected Program",
    [programs, selectedProgramId]
  );
  const selectedGradeName = useMemo(
    () => grades.find((item) => String(item.id) === selectedGradeId)?.name ?? "Selected Grade",
    [grades, selectedGradeId]
  );
  const selectedSubjectName = useMemo(
    () => subjects.find((item) => String(item.id) === selectedSubjectId)?.name ?? "Selected Subject",
    [subjects, selectedSubjectId]
  );
  const selectedChapterName = useMemo(
    () => chapters.find((item) => String(item.id) === selectedChapterId)?.name ?? "Selected Chapter",
    [chapters, selectedChapterId]
  );

  const handleDeleteTopic = async (topic: CurriculumItem) => {
    if (!window.confirm(`Delete topic "${topic.name}"?`)) return;
    try {
      await api.delete(`/topics/${topic.id}`);
      setTopics((prev) => prev.filter((item) => String(item.id) !== String(topic.id)));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete topic");
    }
  };

  return (
    <QuestionBankLayout
      title="Topics"
      description="Manage topics under each chapter."
      actions={
        <button
          onClick={() =>
            navigate(
              `/question-bank/topics/new${buildHierarchyQuery(
                selectedProgramId,
                selectedGradeId,
                selectedSubjectId,
                selectedChapterId
              )}`
            )
          }
          disabled={!selectedChapterId}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Topic
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Program</label>
            <select
              value={selectedProgramId}
              onChange={(event) => {
                setSelectedProgramId(event.target.value);
                setSelectedGradeId("");
                setSelectedSubjectId("");
                setSelectedChapterId("");
                setTopics([]);
              }}
              disabled={loadingPrograms}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select program</option>
              {programs.map((program) => (
                <option key={program.id} value={String(program.id)}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Grade</label>
            <select
              value={selectedGradeId}
              onChange={(event) => {
                setSelectedGradeId(event.target.value);
                setSelectedSubjectId("");
                setSelectedChapterId("");
                setTopics([]);
              }}
              disabled={!selectedProgramId || loadingGrades}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select grade</option>
              {grades.map((grade) => (
                <option key={grade.id} value={String(grade.id)}>
                  {grade.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(event) => {
                setSelectedSubjectId(event.target.value);
                setSelectedChapterId("");
                setTopics([]);
              }}
              disabled={!selectedGradeId || loadingSubjects}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={String(subject.id)}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Chapter</label>
            <select
              value={selectedChapterId}
              onChange={(event) => {
                setSelectedChapterId(event.target.value);
                setTopics([]);
              }}
              disabled={!selectedSubjectId || loadingChapters}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={String(chapter.id)}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingPrograms || loadingGrades || loadingSubjects || loadingChapters || loadingTopics ? (
          <div className="mt-4 text-sm text-slate-500">Loading topics...</div>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedChapterId ? (
              <>
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{topic.name}</div>
                      <div className="text-xs text-slate-500">
                        ID: {topic.id} | {selectedProgramName} | {selectedGradeName} | {selectedSubjectName} | {selectedChapterName}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/question-bank/topics/${topic.id}/edit${buildHierarchyQuery(
                              selectedProgramId,
                              selectedGradeId,
                              selectedSubjectId,
                              selectedChapterId
                            )}`
                          )
                        }
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(topic)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {topics.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No topics for this chapter yet.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Select program, grade, subject, and chapter to view topics.
              </div>
            )}
          </div>
        )}
      </div>
    </QuestionBankLayout>
  );
}
