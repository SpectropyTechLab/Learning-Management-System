import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const normalizePrograms = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.program_id,
      name: item.name ?? item.title ?? "Untitled",
      code: item.code ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionProgramsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);

  const handleDeleteProgram = async (program: CurriculumItem) => {
    if (!window.confirm(`Delete program "${program.name}"?`)) return;
    try {
      await api.delete(`/programs/${program.id}`);
      setPrograms((prev) => prev.filter((item) => String(item.id) !== String(program.id)));
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete program.");
    }
  };

  useEffect(() => {
    const state = location.state as
      | { createdProgram?: CurriculumItem; updatedProgram?: CurriculumItem }
      | null;
    if (state?.createdProgram) {
      setPrograms((prev) => [state.createdProgram as CurriculumItem, ...prev]);
    }
    if (state?.updatedProgram) {
      setPrograms((prev) =>
        prev.map((item) =>
          String(item.id) === String(state.updatedProgram?.id)
            ? (state.updatedProgram as CurriculumItem)
            : item
        )
      );
    }
    if (state) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const loadPrograms = async () => {
      setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };
    loadPrograms();
  }, []);

  return (
    <QuestionBankLayout
      title="Programs"
      description="Manage program catalogs used by question hierarchy."
      actions={
        <button
          onClick={() => navigate("/question-bank/programs/new")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add Program
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Loading programs...</div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <div
                key={program.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{program.name}</div>
                  <div className="text-xs text-slate-500">
                    ID: {program.id} {program.code ? `| Code: ${program.code}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/question-bank/programs/${program.id}/edit`)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProgram(program)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {programs.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No programs yet. Add your first program to get started.
              </div>
            )}
          </div>
        )}
      </div>
    </QuestionBankLayout>
  );
}

