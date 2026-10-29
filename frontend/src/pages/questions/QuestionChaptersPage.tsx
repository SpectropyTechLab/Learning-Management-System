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
      canEdit: item.canEdit ?? item.can_edit,
      canDelete: item.canDelete ?? item.can_delete,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const buildHierarchyQuery = (programId: string, gradeId: string, subjectId: string) => {
  const params = new URLSearchParams();
  if (programId) params.set("program_id", programId);
  if (gradeId) params.set("grade_id", gradeId);
  if (subjectId) params.set("subject_id", subjectId);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export default function QuestionChaptersPage() {
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

  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as
      | { createdChapter?: CurriculumItem; updatedChapter?: CurriculumItem }
      | null;
    if (!state) return;

    if (state.createdChapter && String(state.createdChapter.subject_id ?? "") === selectedSubjectId) {
      setChapters((prev) => [state.createdChapter as CurriculumItem, ...prev]);
    }
    if (state.updatedChapter && String(state.updatedChapter.subject_id ?? "") === selectedSubjectId) {
      setChapters((prev) =>
        prev.map((item) =>
          String(item.id) === String(state.updatedChapter?.id)
            ? (state.updatedChapter as CurriculumItem)
            : item
        )
      );
    }
    navigate(`${location.pathname}${location.search}`, { replace: true });
  }, [location.pathname, location.search, location.state, navigate, selectedSubjectId]);

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
        }
      } catch (err: any) {
        setGrades([]);
        setSelectedGradeId("");
        setSelectedSubjectId("");
        setSubjects([]);
        setChapters([]);
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
        }
      } catch (err: any) {
        setSubjects([]);
        setSelectedSubjectId("");
        setChapters([]);
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
      return;
    }

    const loadChapters = async () => {
      setLoadingChapters(true);
      setError(null);
      try {
        const res = await api.get(`/subjects/${selectedSubjectId}/chapters`);
        setChapters(normalizeCurriculum(toArray(res.data)));
      } catch (err: any) {
        setChapters([]);
        setError(err?.response?.data?.error || "Failed to load chapters");
      } finally {
        setLoadingChapters(false);
      }
    };
    loadChapters();
  }, [selectedSubjectId]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedProgramId) params.program_id = selectedProgramId;
    if (selectedGradeId) params.grade_id = selectedGradeId;
    if (selectedSubjectId) params.subject_id = selectedSubjectId;
    setSearchParams(params);
  }, [selectedProgramId, selectedGradeId, selectedSubjectId, setSearchParams]);

  const selectedProgramName = useMemo(
    () => programs.find((program) => String(program.id) === selectedProgramId)?.name ?? "Selected Program",
    [programs, selectedProgramId]
  );
  const selectedGradeName = useMemo(
    () => grades.find((grade) => String(grade.id) === selectedGradeId)?.name ?? "Selected Grade",
    [grades, selectedGradeId]
  );
  const selectedSubjectName = useMemo(
    () => subjects.find((subject) => String(subject.id) === selectedSubjectId)?.name ?? "Selected Subject",
    [selectedSubjectId, subjects]
  );
  const selectedSubjectCanEdit = useMemo(
    () => subjects.find((subject) => String(subject.id) === selectedSubjectId)?.canEdit !== false,
    [selectedSubjectId, subjects]
  );

  const handleDeleteChapter = async (chapter: CurriculumItem) => {
    if (!window.confirm(`Delete chapter "${chapter.name}"?`)) return;
    try {
      await api.delete(`/chapters/${chapter.id}`);
      setChapters((prev) => prev.filter((item) => String(item.id) !== String(chapter.id)));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete chapter");
    }
  };

  return (
    <QuestionBankLayout
      title="Chapters"
      description="Manage chapters under each subject."
      actions={
        selectedSubjectCanEdit ? (
          <button
            onClick={() =>
              navigate(
                `/question-bank/chapters/new${buildHierarchyQuery(
                  selectedProgramId,
                  selectedGradeId,
                  selectedSubjectId
                )}`
              )
            }
            disabled={!selectedSubjectId}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Chapter
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

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Program</label>
            <select
              value={selectedProgramId}
              onChange={(event) => {
                setSelectedProgramId(event.target.value);
                setSelectedGradeId("");
                setSelectedSubjectId("");
                setChapters([]);
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
                setChapters([]);
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
        </div>

        {loadingPrograms || loadingGrades || loadingSubjects || loadingChapters ? (
          <div className="mt-4 text-sm text-slate-500">Loading chapters...</div>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedSubjectId ? (
              <>
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{chapter.name}</div>
                      <div className="text-xs text-slate-500">
                        ID: {chapter.id} | {selectedProgramName} | {selectedGradeName} | {selectedSubjectName}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {chapter.canEdit !== false ? (
                        <button
                          onClick={() =>
                            navigate(
                              `/question-bank/chapters/${chapter.id}/edit${buildHierarchyQuery(
                                selectedProgramId,
                                selectedGradeId,
                                selectedSubjectId
                              )}`
                            )
                          }
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      ) : null}
                      {chapter.canDelete !== false ? (
                        <button
                          onClick={() => handleDeleteChapter(chapter)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {chapters.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No chapters for this subject yet.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Select program, grade, and subject to view chapters.
              </div>
            )}
          </div>
        )}
      </div>
    </QuestionBankLayout>
  );
}
