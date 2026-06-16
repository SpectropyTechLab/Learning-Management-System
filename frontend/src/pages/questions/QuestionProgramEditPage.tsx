import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

export default function QuestionProgramEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [program, setProgram] = useState<CurriculumItem | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const loadProgram = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/programs/${id}`);
        const loaded: CurriculumItem = {
          id: res.data?.id ?? id,
          name: res.data?.name ?? "Untitled",
          code: res.data?.code ?? null,
        };
        setProgram(loaded);
        setName(loaded.name);
        setCode(loaded.code ?? "");
        setIsActive(Boolean(res.data?.is_active ?? true));
      } catch {
        setProgram(null);
      } finally {
        setLoading(false);
      }
    };
    loadProgram();
  }, [id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!program) return;

    setSaving(true);
    try {
      const res = await api.patch(`/programs/${program.id}`, {
        name: name.trim(),
        code: code.trim(),
        is_active: isActive,
      });
      const updated: CurriculumItem = {
        id: program.id,
        name: res.data?.name ?? name.trim(),
        code: res.data?.code ?? code.trim(),
      };
      navigate("/question-bank/programs", { state: { updatedProgram: updated } });
      return;
    } catch {
      alert("Failed to update program.");
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Program"
      description="Update the program details."
      actions={
        <button
          onClick={() => navigate("/question-bank/programs")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading program...
        </div>
      ) : program ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-xs font-semibold text-slate-500">Program Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />

          <label className="mt-4 block text-xs font-semibold text-slate-500">Program Code</label>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
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
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Program not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}

