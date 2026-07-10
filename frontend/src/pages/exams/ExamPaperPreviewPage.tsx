import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import {
  RiArrowLeftLine,
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiBookMarkedLine,
  RiCheckLine,
  RiDownloadLine,
  RiFileList3Line,
  RiLoader4Line,
} from "react-icons/ri";
import ExamShell from "@/features/exams/components/ExamShell";
import ExamStatusBadge from "@/components/ui/ExamStatusBadge";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getExamPermissions } from "@/features/exams/utils/examPermissions";
import {
  downloadExamAnswersDocx,
  downloadExamQuestionsDocx,
  downloadExamSolutionsDocx,
  fetchExamPreview,
  finalizeBlueprintExam,
} from "@/features/exams/api";
import type {
  ExamPreviewPayload,
  ExamStatus,
  GeneratedExamQuestion,
  QuestionGroupType,
} from "@/features/exams/types";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const QUESTION_GROUP_ORDER: QuestionGroupType[] = [
  "direction",
  "similar",
  "previous_year",
  "reference",
];

const QUESTION_GROUP_LABELS: Record<QuestionGroupType, string> = {
  direction: "Direct Questions",
  similar: "Similar Questions",
  previous_year: "Previous Year Questions",
  reference: "Reference Questions",
};

const normalizeExamStatus = (value?: string | null): ExamStatus => {
  if (value === "published") return value;
  if (value === "active" || value === "completed") return value;
  return "draft";
};

const readApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as ApiErrorPayload | undefined;
  return data?.error || data?.message || fallback;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
};

export default function ExamPaperPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const examId = Number(id);

  const [preview, setPreview] = useState<ExamPreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingType, setDownloadingType] = useState<"questions" | "answers" | "solutions" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(true);
  const examPermissions = useMemo(() => getExamPermissions(user), [user]);
  const canManagePreview = Boolean(
    examPermissions.canUpdate &&
    preview?.exam?.status === "draft" &&
    preview.exam.can_build !== false
  );
  const canDownloadPreview = Boolean(examPermissions.canRead && preview?.exam?.can_download !== false);

  const loadPreview = useCallback(async () => {
    if (!Number.isInteger(examId) || examId <= 0) {
      setError("Invalid exam.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = await fetchExamPreview(examId);
      setPreview(payload);
    } catch (err) {
      setError(readApiErrorMessage(err, "Failed to load exam preview."));
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const orderedSections = useMemo(
    () => [...(preview?.sections ?? [])],
    [preview]
  );

  const handleSaveExam = async () => {
    if (!preview?.validation?.can_finalize) {
      toast.error(preview?.validation?.blocking_reasons?.[0] || "Resolve template validation issues before saving.");
      return;
    }
    if (!preview?.all_sections_completed) {
      toast.error("Complete every section before saving the exam.");
      return;
    }

    setSaving(true);
    try {
      await finalizeBlueprintExam(examId, { status: "draft" });
      toast.success("Exam saved successfully.");
      navigate("/exams");
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to save exam."));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocx = async (type: "questions" | "answers" | "solutions") => {
    if (!preview) {
      toast.error("Preview is not ready yet.");
      return;
    }
    if (!canDownloadPreview) {
      toast.error("You don't have permission to download this exam.");
      return;
    }
    setDownloadingType(type);
    try {
      if (type === "questions") {
        await downloadExamQuestionsDocx(examId, preview.exam.title);
        toast.success("Questions document downloaded.");
      } else if (type === "answers") {
        await downloadExamAnswersDocx(examId, preview.exam.title);
        toast.success("Answers document downloaded.");
      } else {
        await downloadExamSolutionsDocx(examId, preview.exam.title);
        toast.success("Solutions document downloaded.");
      }
    } catch (err) {
      toast.error(readApiErrorMessage(err, `Failed to download ${type} document.`));
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <ExamShell
      title="Question Paper Preview"
      description=""
      headerAction={
        <>
          <button
            type="button"
            onClick={() => navigate(canManagePreview ? `/exams/${examId}/builder` : "/exams")}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
          >
            <RiArrowLeftLine className="h-3.5 w-3.5" />
            {canManagePreview ? "Back to Builder" : "Back to Exams"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadDocx("questions")}
            disabled={Boolean(downloadingType) || loading || !preview || !preview.validation?.can_finalize || !canDownloadPreview}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {downloadingType === "questions" ? <RiLoader4Line className="h-3.5 w-3.5 animate-spin" /> : <RiDownloadLine className="h-3.5 w-3.5" />}
            {downloadingType === "questions" ? "Downloading..." : "Download Questions"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadDocx("answers")}
            disabled={Boolean(downloadingType) || loading || !preview || !preview.validation?.can_finalize || !canDownloadPreview}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {downloadingType === "answers" ? <RiLoader4Line className="h-3.5 w-3.5 animate-spin" /> : <RiDownloadLine className="h-3.5 w-3.5" />}
            {downloadingType === "answers" ? "Downloading..." : "Download Answers"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadDocx("solutions")}
            disabled={Boolean(downloadingType) || loading || !preview || !preview.validation?.can_finalize || !canDownloadPreview}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {downloadingType === "solutions" ? <RiLoader4Line className="h-3.5 w-3.5 animate-spin" /> : <RiDownloadLine className="h-3.5 w-3.5" />}
            {downloadingType === "solutions" ? "Downloading..." : "Download Solutions"}
          </button>
          {canManagePreview ? (
            <button
              type="button"
              onClick={() => void handleSaveExam()}
              disabled={saving || !preview?.validation?.can_finalize}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {saving ? <RiLoader4Line className="h-3.5 w-3.5 animate-spin" /> : <RiArrowRightUpLine className="h-3.5 w-3.5" />}
              {saving ? "Saving..." : "Save Exam"}
            </button>
          ) : null}
        </>
      }
    >
      {loading ? (
        <div className="border-y border-slate-200 py-12 text-center text-sm text-slate-500">
          Loading exam preview...
        </div>
      ) : error ? (
        <div className="border-l-2 border-rose-500 bg-rose-50/70 px-4 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : !preview ? (
        <div className="border-y border-slate-200 py-12 text-center text-sm text-slate-500">
          Exam preview not found.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-4xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-[1.75rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
                    {preview.exam.title}
                  </h2>
                  <ExamStatusBadge status={normalizeExamStatus(preview.exam.status)} />
                  <button
                    type="button"
                    onClick={() => setInfoOpen((current) => !current)}
                    aria-expanded={infoOpen}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {infoOpen ? "Hide" : "Show"}
                    <RiArrowDownSLine className={`h-4 w-4 transition ${infoOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {infoOpen ? (
                <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-slate-600 sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    <RiBookMarkedLine className="h-4 w-4 text-slate-400" />
                    Blueprint: {preview.blueprint?.name ?? "--"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    <RiFileList3Line className="h-4 w-4 text-slate-400" />
                    Total Sections: {preview.totals.section_count}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    <RiCheckLine className="h-4 w-4 text-slate-400" />
                    Total Questions: {preview.totals.question_count}
                  </span>
                  {preview.template_resolution?.template_key ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                      <RiFileList3Line className="h-4 w-4 text-slate-400" />
                      Template: {preview.template_resolution.template_key}
                      {preview.template_resolution.template_version
                        ? ` (${preview.template_resolution.template_version})`
                        : ""}
                      {preview.template_resolution.exam_type
                        ? ` · ${preview.template_resolution.exam_type}`
                        : ""}
                    </span>
                  ) : null}
                </div>
                ) : null}
              </div>
              {infoOpen ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 sm:px-4 sm:py-3 sm:text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Exam Window
                </div>
                <div className="mt-1.5 font-medium text-slate-800">
                  {formatDateTime(preview.exam.start_datetime)}
                </div>
                <div className="mt-1 font-medium text-slate-800">
                  {formatDateTime(preview.exam.end_datetime)}
                </div>
              </div>
              ) : null}
            </div>
            {preview.validation?.blocking_reasons?.length ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {preview.validation.blocking_reasons[0]}
              </div>
            ) : null}
          </section>

          {orderedSections.map((section, sectionIndex) => (
            <section
              key={`paper-preview-section-${section.id}`}
              className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:rounded-4xl sm:px-6 sm:py-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Section {sectionIndex + 1}
                  </div>
                  <h3 className="mt-1.5 text-lg font-semibold text-slate-950 sm:mt-2 sm:text-xl">{section.title}</h3>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right sm:rounded-3xl sm:px-4 sm:py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Questions
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {section.question_count ?? 0}/{section.required_question_count ?? 0}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
                {QUESTION_GROUP_ORDER.map((groupType) => {
                  const questions = (section.question_groups?.[groupType] ?? []) as GeneratedExamQuestion[];
                  if (!questions.length) return null;

                  return (
                    <div
                      key={`${section.id}-${groupType}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/40 px-2.5 py-3 sm:rounded-3xl sm:bg-slate-50/60 sm:px-4 sm:py-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {QUESTION_GROUP_LABELS[groupType]}
                        </h4>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {questions.length}
                        </span>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        {questions.map((question, questionIndex) => (
                          <div
                            key={`${section.id}-${groupType}-${question.question_id}-${questionIndex}`}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:rounded-3xl sm:px-4 sm:py-4"
                          >
                            <div className="mb-2 text-sm font-semibold text-slate-500 sm:mb-3">
                              Question {questionIndex + 1}
                            </div>
                            <QuestionRenderer
                              question={question}
                              showAnswer
                              showSolution
                              showOptions
                              showMeta={false}
                              className="bg-transparent p-0 shadow-none"
                              contentClassName="w-full max-w-none px-0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </ExamShell>
  );
}
