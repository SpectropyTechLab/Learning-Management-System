import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import ExamShell from "@/features/exams/components/ExamShell";
import {
  createBlueprint,
  deleteBlueprint,
  fetchBlueprints,
  updateBlueprint,
} from "@/features/exams/api";
import type { BlueprintSummary } from "@/features/exams/types";

type BlueprintSectionDraft = {
  id: string;
  section_name: string;
  required_question_count: string;
  direction_question_count: string;
  similar_question_count: string;
  previous_year_question_count: string;
  reference_question_count: string;
};

type BlueprintFormState = {
  name: string;
  status: string;
  sections: BlueprintSectionDraft[];
};

const createSectionDraft = (index: number): BlueprintSectionDraft => ({
  id: `section-${Date.now()}-${index}`,
  section_name: "",
  required_question_count: "",
  direction_question_count: "",
  similar_question_count: "",
  previous_year_question_count: "",
  reference_question_count: "",
});

const createInitialForm = (): BlueprintFormState => ({
  name: "",
  status: "active",
  sections: [createSectionDraft(0)],
});

const readApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { error?: string; message?: string } | undefined;
  return data?.error || data?.message || fallback;
};

const readDraftCount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BlueprintFormState>(createInitialForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadBlueprints = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBlueprints();
      setBlueprints(data);
    } catch (err) {
      setError(readApiErrorMessage(err, "Failed to load blueprints."));
      setBlueprints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBlueprints();
  }, []);

  const totalQuestions = useMemo(
    () =>
      form.sections.reduce((sum, section) => {
        const count = Number(section.required_question_count);
        return sum + (Number.isFinite(count) ? count : 0);
      }, 0),
    [form.sections]
  );

  const updateSection = (sectionId: string, updater: (section: BlueprintSectionDraft) => BlueprintSectionDraft) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    }));
  };

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId(null);
  };

  const handleAddSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, createSectionDraft(prev.sections.length)],
    }));
  };

  const handleRemoveSection = (sectionId: string) => {
    setForm((prev) => ({
      ...prev,
      sections:
        prev.sections.length === 1
          ? prev.sections
          : prev.sections.filter((section) => section.id !== sectionId),
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Blueprint name is required.");
      return false;
    }
    if (form.sections.length === 0) {
      toast.error("At least one section is required.");
      return false;
    }

    const seenNames = new Set<string>();
    for (const section of form.sections) {
      const sectionName = section.section_name.trim();
      const requiredQuestionCount = Number(section.required_question_count);
      const directionQuestionCount = readDraftCount(section.direction_question_count);
      const similarQuestionCount = readDraftCount(section.similar_question_count);
      const previousYearQuestionCount = readDraftCount(section.previous_year_question_count);
      const referenceQuestionCount = readDraftCount(section.reference_question_count);
      if (!sectionName) {
        toast.error("Each section needs a name.");
        return false;
      }
      if (seenNames.has(sectionName.toLowerCase())) {
        toast.error("Section names must be unique within a blueprint.");
        return false;
      }
      seenNames.add(sectionName.toLowerCase());
      if (!Number.isInteger(requiredQuestionCount) || requiredQuestionCount <= 0) {
        toast.error("Each section needs a valid question count greater than 0.");
        return false;
      }
      const groupValues = [
        directionQuestionCount,
        similarQuestionCount,
        previousYearQuestionCount,
        referenceQuestionCount,
      ];
      if (groupValues.some((value) => !Number.isInteger(value) || value < 0)) {
        toast.error("Section distribution counts must be non-negative integers.");
        return false;
      }
      if (
        directionQuestionCount +
          similarQuestionCount +
          previousYearQuestionCount +
          referenceQuestionCount !==
        requiredQuestionCount
      ) {
        toast.error(`Section "${sectionName}" distribution must exactly match its total question count.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        status: form.status,
        sections: form.sections.map((section, index) => ({
          section_name: section.section_name.trim(),
          required_question_count: Number(section.required_question_count),
          direction_question_count: readDraftCount(section.direction_question_count),
          similar_question_count: readDraftCount(section.similar_question_count),
          previous_year_question_count: readDraftCount(section.previous_year_question_count),
          reference_question_count: readDraftCount(section.reference_question_count),
          display_order: index + 1,
        })),
      };

      const saved = editingId
        ? await updateBlueprint(editingId, payload)
        : await createBlueprint(payload);

      setBlueprints((prev) => {
        if (editingId) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...prev];
      });

      toast.success(editingId ? "Blueprint updated." : "Blueprint created.");
      resetForm();
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to save blueprint."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (blueprint: BlueprintSummary) => {
    setEditingId(blueprint.id);
    setForm({
      name: blueprint.name,
      status: String(blueprint.status || "active"),
      sections:
        blueprint.sections.length > 0
          ? blueprint.sections.map((section, index) => ({
            id: `existing-${section.id}-${index}`,
            section_name: section.section_name,
            required_question_count: String(section.required_question_count),
            direction_question_count: String(section.direction_question_count ?? 0),
            similar_question_count: String(section.similar_question_count ?? 0),
            previous_year_question_count: String(section.previous_year_question_count ?? 0),
            reference_question_count: String(section.reference_question_count ?? 0),
          }))
          : [createSectionDraft(0)],
    });
  };

  const handleDelete = async (blueprint: BlueprintSummary) => {
    const confirmed = window.confirm(`Delete blueprint "${blueprint.name}"?`);
    if (!confirmed) return;

    try {
      await deleteBlueprint(blueprint.id);
      setBlueprints((prev) => prev.filter((item) => item.id !== blueprint.id));
      if (editingId === blueprint.id) {
        resetForm();
      }
      toast.success("Blueprint deleted.");
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to delete blueprint."));
    }
  };

  return (
    <ExamShell title="Blueprints" description="Create reusable paper structures for exam generation.">
      <div className="grid gap-4 xl:gap-6 xl:grid-cols-[1.1fr_1.6fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Blueprint" : "New Blueprint"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Define custom sections and exact question counts.
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500">Blueprint Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. NEET Balanced Mock"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500">Status</label>
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Sections</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Use custom section names and define exactly how many questions should come from each question group.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Add Section
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {form.sections.map((section, index) => (
                  <div key={section.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Section {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(section.id)}
                        disabled={form.sections.length === 1}
                        className="rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1.6fr_0.8fr]">
                      <input
                        type="text"
                        value={section.section_name}
                        onChange={(event) =>
                          updateSection(section.id, (current) => ({
                            ...current,
                            section_name: event.target.value,
                          }))
                        }
                        placeholder="Section name"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={1}
                        value={section.required_question_count}
                        onChange={(event) =>
                          updateSection(section.id, (current) => ({
                            ...current,
                            required_question_count: event.target.value,
                          }))
                        }
                        placeholder="Count"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <input
                        type="number"
                        min={0}
                        value={section.direction_question_count}
                        onChange={(event) =>
                          updateSection(section.id, (current) => ({
                            ...current,
                            direction_question_count: event.target.value,
                          }))
                        }
                        placeholder="Direct"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        value={section.similar_question_count}
                        onChange={(event) =>
                          updateSection(section.id, (current) => ({
                            ...current,
                            similar_question_count: event.target.value,
                          }))
                        }
                        placeholder="Similar"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        value={section.previous_year_question_count}
                        onChange={(event) =>
                          updateSection(section.id, (current) => ({
                            ...current,
                            previous_year_question_count: event.target.value,
                          }))
                        }
                        placeholder="Previous Year"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        value={section.reference_question_count}
                        onChange={(event) =>
                          updateSection(section.id, (current) => ({
                            ...current,
                            reference_question_count: event.target.value,
                          }))
                        }
                        placeholder="Reference"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <span className="font-semibold text-slate-600">
                        Distributed total:{" "}
                        <span className="text-slate-900">
                          {readDraftCount(section.direction_question_count) +
                            readDraftCount(section.similar_question_count) +
                            readDraftCount(section.previous_year_question_count) +
                            readDraftCount(section.reference_question_count)}
                        </span>
                      </span>
                      <span
                        className={`font-semibold ${
                          readDraftCount(section.direction_question_count) +
                            readDraftCount(section.similar_question_count) +
                            readDraftCount(section.previous_year_question_count) +
                            readDraftCount(section.reference_question_count) ===
                          readDraftCount(section.required_question_count)
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        Must match total section questions
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Total required questions: <span className="font-semibold text-slate-900">{totalQuestions}</span>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Blueprint" : "Create Blueprint"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Saved Blueprints</h2>
              <p className="mt-1 text-sm text-slate-500">Reusable section templates for the Exams builder.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {blueprints.length} total
            </span>
          </div>

          {loading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Loading blueprints...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : blueprints.length === 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No blueprints created yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {blueprints.map((blueprint) => (
                <div key={blueprint.id} className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{blueprint.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {blueprint.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {blueprint.section_count ?? blueprint.sections.length} sections .{" "}
                        {blueprint.total_required_questions ??
                          blueprint.sections.reduce((sum, section) => sum + section.required_question_count, 0)}{" "}
                        total questions
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(blueprint)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(blueprint)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {blueprint.sections
                      .slice()
                      .sort((left, right) => left.display_order - right.display_order)
                      .map((section) => (
                        <div
                          key={section.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div className="font-semibold text-slate-800">{section.section_name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Requires exactly {section.required_question_count} question
                            {section.required_question_count === 1 ? "" : "s"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
                              D {section.direction_question_count}
                            </span>
                            <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
                              S {section.similar_question_count}
                            </span>
                            <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
                              PY {section.previous_year_question_count}
                            </span>
                            <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
                              R {section.reference_question_count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ExamShell>
  );
}
