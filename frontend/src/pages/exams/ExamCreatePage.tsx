import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import ExamShell from "@/features/exams/components/ExamShell";
import { createExam, fetchBlueprints, fetchPrograms } from "@/features/exams/api";
import type { BlueprintSummary, CurriculumOption, ExamCreateFormState } from "@/features/exams/types";

const initialState: ExamCreateFormState = {
  title: "",
  description: "",
  program_id: "",
  blueprint_id: "",
  total_duration_minutes: "",
  start_datetime: "",
  end_datetime: "",
  instructions: "",
  shuffle_questions: false,
  shuffle_options: false,
  show_result_immediately: true,
  max_attempts: "1",
  show_score: true,
  show_pass_or_fail: true,
  show_percentile: false,
  show_analytics: false,
  show_solutions_to_user: false,
  pass_percentage: "",
  variable_marks: false,
  marks_per_question: "",
  negative_marks: "",
  roundoff_marks: false,
  allow_retaking_exam: false,
  maximum_allowed_retakes: "",
  allow_retaking_only_for_failed_attempt: false,
  interval_between_retakes_minutes: "",
};

const readApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { error?: string; message?: string } | undefined;
  return data?.error || data?.message || fallback;
};

const isValidDateValue = (value: string) => {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

export default function ExamCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ExamCreateFormState>(initialState);
  const [programs, setPrograms] = useState<CurriculumOption[]>([]);
  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const [programData, blueprintData] = await Promise.all([
          fetchPrograms(),
          fetchBlueprints({ status: "active" }),
        ]);
        if (!mounted) return;
        setPrograms(programData);
        setBlueprints(blueprintData);
      } catch (err) {
        if (!mounted) return;
        setError(readApiErrorMessage(err, "Failed to load exam setup options."));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadOptions();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedBlueprint = useMemo(
    () => blueprints.find((item) => String(item.id) === form.blueprint_id) ?? null,
    [blueprints, form.blueprint_id]
  );

  const totalRequiredQuestions = useMemo(
    () =>
      selectedBlueprint?.sections.reduce(
        (sum, section) => sum + Number(section.required_question_count || 0),
        0
      ) ?? 0,
    [selectedBlueprint]
  );

  const handleChange = <K extends keyof ExamCreateFormState>(
    field: K,
    value: ExamCreateFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.title.trim()) {
      toast.error("Exam title is required.");
      return false;
    }
    if (!form.program_id) {
      toast.error("Program is required.");
      return false;
    }
    if (!form.blueprint_id) {
      toast.error("Blueprint is required.");
      return false;
    }
    const duration = Number(form.total_duration_minutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error("Duration must be greater than 0.");
      return false;
    }
    if (!isValidDateValue(form.start_datetime) || !isValidDateValue(form.end_datetime)) {
      toast.error("Valid exam start and end datetime values are required.");
      return false;
    }
    if (new Date(form.end_datetime) <= new Date(form.start_datetime)) {
      toast.error("End datetime must be after start datetime.");
      return false;
    }
    const maxAttempts = Number(form.max_attempts);
    if (!Number.isFinite(maxAttempts) || maxAttempts <= 0) {
      toast.error("Max attempts must be greater than 0.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        total_duration_minutes: Number(form.total_duration_minutes),
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: new Date(form.end_datetime).toISOString(),
        max_attempts: Number(form.max_attempts),
        show_result_immediately: form.show_result_immediately,
        shuffle_questions: form.shuffle_questions,
        shuffle_options: form.shuffle_options,
        status: "draft",
        program_id: Number(form.program_id),
        blueprint_id: Number(form.blueprint_id),
      };

      const createdExam = await createExam(payload);
      const createdExamId = Number(createdExam.id);
      toast.success("Exam draft created. Continue in the builder.");
      navigate(`/exams/${createdExamId}/builder`);
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to create exam."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ExamShell title="Create Exam" description="Start with a program and blueprint, then build section by section.">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Loading exam setup...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Exam Setup</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create the draft exam first. You will choose subjects, chapters, and topics later in the builder.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Exam Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                  placeholder="e.g. NEET Mock Test 03"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Grade</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder="e.g. Grade 10"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Program</label>
                <select
                  value={form.program_id}
                  onChange={(event) => handleChange("program_id", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
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
                <label className="text-xs font-semibold text-slate-500">Blueprint</label>
                <select
                  value={form.blueprint_id}
                  onChange={(event) => handleChange("blueprint_id", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                >
                  <option value="">Select blueprint</option>
                  {blueprints.map((blueprint) => (
                    <option key={blueprint.id} value={String(blueprint.id)}>
                      {blueprint.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Duration (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={form.total_duration_minutes}
                  onChange={(event) => handleChange("total_duration_minutes", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Max Attempts</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_attempts}
                  onChange={(event) => handleChange("max_attempts", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.start_datetime}
                  onChange={(event) => handleChange("start_datetime", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.end_datetime}
                  onChange={(event) => handleChange("end_datetime", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.show_result_immediately}
                  onChange={(event) => handleChange("show_result_immediately", event.target.checked)}
                />
                Show result immediately after submission
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.shuffle_questions}
                  onChange={(event) => handleChange("shuffle_questions", event.target.checked)}
                />
                Shuffle questions in runtime
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.shuffle_options}
                  onChange={(event) => handleChange("shuffle_options", event.target.checked)}
                />
                Shuffle options in runtime
              </label>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Instructions</label>
                <textarea
                  rows={4}
                  value={form.instructions}
                  onChange={(event) => handleChange("instructions", event.target.value)}
                  placeholder="Visible to students before they start the exam"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate("/exams")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Draft & Open Builder"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Selected Blueprint</h2>
              {!selectedBlueprint ? (
                <p className="mt-3 text-sm text-slate-500">Choose a blueprint to preview its sections.</p>
              ) : (
                <>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-800">{selectedBlueprint.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedBlueprint.sections.length} sections . {totalRequiredQuestions} required questions
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedBlueprint.sections
                      .slice()
                      .sort((left, right) => left.display_order - right.display_order)
                      .map((section) => (
                        <div key={section.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-800">{section.section_name}</div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {section.required_question_count} questions
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                              D {section.direction_question_count}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                              S {section.similar_question_count}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                              PY {section.previous_year_question_count}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                              R {section.reference_question_count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">What Happens Next</h2>
              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                <li>1. The draft exam is created with the selected blueprint snapshot.</li>
                <li>2. In the builder, each section will ask for Subject, Chapters, and Topics.</li>
                <li>3. The system will generate Direction, Similar, Previous Year, and Reference question tables.</li>
                <li>4. You can edit a section’s syllabus scope, regenerate it, then preview the full paper.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </ExamShell>
  );
}
