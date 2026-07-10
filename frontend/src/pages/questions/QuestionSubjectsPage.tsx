import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import { formatSubjectDisplay, type CurriculumItem } from "@/types/questionBank";

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
      code: item.code ?? null,
      program_id: item.program_id ?? item.programId ?? null,
      grade_id: item.grade_id ?? item.gradeId ?? null,
      grade_number: item.grade_number ?? item.gradeNumber ?? null,
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
      canEdit: item.canEdit ?? item.can_edit,
      canDelete: item.canDelete ?? item.can_delete,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionSubjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialProgramId = searchParams.get("program_id") ?? "";
  const initialGradeId = searchParams.get("grade_id") ?? "";
  const initialSubjectId = searchParams.get("subject_id") ?? "";

  const [selectedProgramId, setSelectedProgramId] = useState(initialProgramId);
  const [selectedGradeId, setSelectedGradeId] = useState(initialGradeId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [topics, setTopics] = useState<CurriculumItem[]>([]);

  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as
      | { createdSubject?: CurriculumItem; updatedSubject?: CurriculumItem }
      | null;
    if (!state) return;

    if (state.createdSubject && String(state.createdSubject.grade_id ?? "") === selectedGradeId) {
      setSubjects((prev) => [state.createdSubject as CurriculumItem, ...prev]);
    }

    if (state.updatedSubject) {
      setSubjects((prev) =>
        prev.map((item) =>
          String(item.id) === String(state.updatedSubject?.id)
            ? (state.updatedSubject as CurriculumItem)
            : item
        )
      );
    }

    navigate(`${location.pathname}${location.search}`, { replace: true });
  }, [location.pathname, location.search, location.state, navigate, selectedGradeId]);

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
          setSelectedSubjectId("");
          setSubjects([]);
          setChapters([]);
          setTopics([]);
        }
      } catch (err: any) {
        setGrades([]);
        setSelectedGradeId("");
        setSelectedSubjectId("");
        setSubjects([]);
        setChapters([]);
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
          setTopics([]);
        }
      } catch (err: any) {
        setSubjects([]);
        setSelectedSubjectId("");
        setChapters([]);
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
      setTopics([]);
      return;
    }

    const loadSubjectDetails = async () => {
      setLoadingDetails(true);
      setError(null);
      try {
        const chapterRes = await api.get(`/subjects/${selectedSubjectId}/chapters`);
        const nextChapters = normalizeCurriculum(toArray(chapterRes.data));
        setChapters(nextChapters);

        if (nextChapters.length === 0) {
          setTopics([]);
          return;
        }

        const topicResponses = await Promise.all(
          nextChapters.map((chapter) => api.get(`/chapters/${chapter.id}/topics`))
        );
        const nextTopics = topicResponses.flatMap((response) => normalizeCurriculum(toArray(response.data)));
        setTopics(nextTopics);
      } catch (err: any) {
        setChapters([]);
        setTopics([]);
        setError(err?.response?.data?.error || "Failed to load subject details");
      } finally {
        setLoadingDetails(false);
      }
    };

    loadSubjectDetails();
  }, [selectedSubjectId]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedProgramId) params.program_id = selectedProgramId;
    if (selectedGradeId) params.grade_id = selectedGradeId;
    if (selectedSubjectId) params.subject_id = selectedSubjectId;
    setSearchParams(params);
  }, [selectedProgramId, selectedGradeId, selectedSubjectId, setSearchParams]);

  const topicsByChapterId = useMemo(() => {
    const map = new Map<string, CurriculumItem[]>();
    topics.forEach((topic) => {
      const key = String(topic.chapter_id ?? "");
      const current = map.get(key) ?? [];
      current.push(topic);
      map.set(key, current);
    });
    return map;
  }, [topics]);

  const isLoading = loadingPrograms || loadingGrades || loadingSubjects || loadingDetails;
  const selectedGradeCanEdit = useMemo(
    () => grades.find((grade) => String(grade.id) === selectedGradeId)?.canEdit !== false,
    [grades, selectedGradeId]
  );

  const handleDeleteSubject = async (subject: CurriculumItem) => {
    if (!window.confirm(`Delete subject "${subject.name}"?`)) return;
    try {
      await api.delete(`/subjects/${subject.id}`);
      setSubjects((prev) => prev.filter((item) => String(item.id) !== String(subject.id)));
      if (String(subject.id) === selectedSubjectId) {
        setSelectedSubjectId("");
        setChapters([]);
        setTopics([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete subject");
    }
  };

  const handleDeleteChapter = async (chapter: CurriculumItem) => {
    if (!window.confirm(`Delete chapter "${chapter.name}"?`)) return;
    try {
      await api.delete(`/chapters/${chapter.id}`);
      setChapters((prev) => prev.filter((item) => String(item.id) !== String(chapter.id)));
      setTopics((prev) => prev.filter((item) => String(item.chapter_id ?? "") !== String(chapter.id)));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete chapter");
    }
  };

  return (
    <QuestionBankLayout
      title="Subjects"
      description="Choose a program and grade to explore subjects, chapters, and topics."
      actions={
        selectedGradeCanEdit ? (
          <button
            onClick={() => navigate("/question-bank/subjects/new")}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add Subject
          </button>
        ) : null
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
                setChapters([]);
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
                setChapters([]);
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
        </div>

        {isLoading ? (
          <div className="mt-6 text-sm text-slate-500">Loading subject explorer...</div>
        ) : !selectedGradeId ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Select program and grade to view subjects.
          </div>
        ) : subjects.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No subjects found for this grade yet.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="space-y-3">
              {subjects.map((subject) => {
                const isSelected = String(subject.id) === selectedSubjectId;
                return (
                  <div
                    key={subject.id}
                    onClick={() => {
                      setSelectedSubjectId(String(subject.id));
                      setChapters([]);
                      setTopics([]);
                    }}
                    className={`cursor-pointer rounded-xl border px-3 py-3 transition ${
                      isSelected
                        ? "border-sky-300 bg-sky-50/70"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-900">{subject.name}</div>
                        <div className="mt-0.5 text-xs text-slate-600">
                          {formatSubjectDisplay(subject, { includeId: true })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {subject.canEdit !== false ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/question-bank/subjects/${subject.id}/edit`);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Edit Subject
                          </button>
                        ) : null}
                        {subject.canDelete !== false ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteSubject(subject);
                            }}
                            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Delete Subject
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3">
                        {chapters.length === 0 ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            No chapters found for this subject yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {chapters.map((chapter) => {
                              const chapterTopics = topicsByChapterId.get(String(chapter.id)) ?? [];
                              return (
                                <div key={chapter.id} className="rounded-xl border border-slate-200 px-4 py-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-semibold text-slate-900">{chapter.name}</div>
                                      <div className="mt-1 text-xs text-slate-500">Chapter ID: {chapter.id}</div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          navigate(
                                            `/question-bank/chapters?program_id=${selectedProgramId}&grade_id=${selectedGradeId}&subject_id=${selectedSubjectId}`
                                          )
                                        }
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                      >
                                        View Chapters
                                      </button>
                                      {chapter.canEdit !== false ? (
                                        <button
                                          onClick={() => navigate(`/question-bank/chapters/${chapter.id}/edit`)}
                                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                          Edit Chapter
                                        </button>
                                      ) : null}
                                      {chapter.canDelete !== false ? (
                                        <button
                                          onClick={() => handleDeleteChapter(chapter)}
                                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                        >
                                          Delete Chapter
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="mt-4">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Topics
                                    </div>
                                    {chapterTopics.length > 0 ? (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {chapterTopics.map((topic) => (
                                          <span
                                            key={topic.id}
                                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                                          >
                                            {topic.name}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="mt-3 text-sm text-slate-500">No topics added for this chapter yet.</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </QuestionBankLayout>
  );
}
