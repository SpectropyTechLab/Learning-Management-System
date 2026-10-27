import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const normalizePrograms = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id,
      name: item.name ?? "Untitled",
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionGradeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [programId, setProgramId] = useState("");
  const [gradeNumber, setGradeNumber] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const programFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("program_id") ?? "";
  }, [location.search]);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setPrograms(normalizePrograms(payload));
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadGrade = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/grades/${id}`);
        const loadedProgramId = String(res.data?.program_id ?? programFromQuery ?? "");
        setProgramId(loadedProgramId);
        setGradeNumber(String(res.data?.grade_number ?? ""));
        setIsActive(Boolean(res.data?.is_active ?? true));
      } catch {
        setProgramId("");
        setGradeNumber("");
      } finally {
        setLoading(false);
      }
    };
    loadGrade();
  }, [id, programFromQuery]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;

    const parsedGrade = Number(gradeNumber);
    if (!Number.isInteger(parsedGrade) || parsedGrade <= 0) return;

    setSaving(true);
    try {
      await api.patch(`/grades/${id}`, {
        grade_number: parsedGrade,
        is_active: isActive,
      });
      navigate(`/question-bank/grades${programId ? `?program_id=${programId}` : ""}`);
      return;
    } catch {
      alert("Failed to update grade.");
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Grade"
      description="Update grade details."
      actions={
        <button
          onClick={() => navigate(`/question-bank/grades${programId ? `?program_id=${programId}` : ""}`)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading grade...
        </div>
      ) : (
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-xs font-semibold text-slate-500">Program</label>
          <select
            value={programId}
            onChange={(event) => setProgramId(event.target.value)}
            disabled
            className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
          >
            <option value="">Select program</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-xs font-semibold text-slate-500">Grade Number</label>
          <input
            type="number"
            value={gradeNumber}
            onChange={(event) => setGradeNumber(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Active
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </QuestionBankLayout>
  );
}

