import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const normalizePrograms = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id,
      name: item.name ?? "Untitled",
      code: item.code ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const normalizeGrades = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id,
      name: item.name ?? `Grade ${item.grade_number}`,
      grade_number: item.grade_number ?? null,
      program_id: item.program_id ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionGradesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [loading, setLoading] = useState(true);

  const handleDeleteGrade = async (grade: CurriculumItem) => {
    if (!window.confirm(`Delete grade "${grade.name ?? `Grade ${grade.grade_number}`}"?`)) return;
    try {
      await api.delete(`/grades/${grade.id}`);
      setGrades((prev) => prev.filter((item) => String(item.id) !== String(grade.id)));
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete grade.");
    }
  };

  const programFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("program_id") ?? "";
  }, [location.search]);

  useEffect(() => {
    if (programFromQuery && !selectedProgramId) {
      setSelectedProgramId(programFromQuery);
    }
  }, [programFromQuery, selectedProgramId]);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        const normalized = normalizePrograms(payload);
        setPrograms(normalized);
        if (!selectedProgramId && normalized.length > 0) {
          setSelectedProgramId(String(normalized[0].id));
        }
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedProgramId) {
      setGrades([]);
      setLoading(false);
      return;
    }
    const loadGrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/programs/${selectedProgramId}/grades`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setGrades(normalizeGrades(payload));
      } catch {
        setGrades([]);
      } finally {
        setLoading(false);
      }
    };
    loadGrades();
  }, [selectedProgramId]);

  return (
    <QuestionBankLayout
      title="Grades"
      description="Manage grade catalogs under programs."
      actions={
        <button
          onClick={() =>
            navigate(`/question-bank/grades/new${selectedProgramId ? `?program_id=${selectedProgramId}` : ""}`)
          }
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add Grade
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-xs font-semibold text-slate-500">Program</label>
        <select
          value={selectedProgramId}
          onChange={(event) => setSelectedProgramId(event.target.value)}
          className="mt-2 w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">Select program</option>
          {programs.map((program) => (
            <option key={program.id} value={String(program.id)}>
              {program.name}
            </option>
          ))}
        </select>

        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-slate-500">Loading grades...</div>
          ) : (
            <div className="space-y-3">
              {grades.map((grade) => (
                <div
                  key={grade.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {grade.name ?? `Grade ${grade.grade_number}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID: {grade.id} {grade.grade_number ? `| Number: ${grade.grade_number}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        navigate(
                          `/question-bank/grades/${grade.id}/edit${selectedProgramId ? `?program_id=${selectedProgramId}` : ""}`
                        )
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGrade(grade)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {grades.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No grades found for this program.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </QuestionBankLayout>
  );
}

