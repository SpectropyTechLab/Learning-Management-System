import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import {
  RiArrowLeftLine,
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
import { downloadExamPreviewDocx, fetchExamPreview, finalizeBlueprintExam } from "@/features/exams/api";
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
  const examId = Number(id);

  const [preview, setPreview] = useState<ExamPreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownloadDocx = async () => {
    if (!preview) {
      toast.error("Preview is not ready yet.");
      return;
    }
    setDownloading(true);
    try {
      await downloadExamPreviewDocx(examId);
      toast.success("Question paper downloaded.");
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to download question paper."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ExamShell
      title="Question Paper Preview"
      description="Review the full paper section by section before saving the exam."
      headerAction={
        <>
          <button
            type="button"
            onClick={() => navigate(`/exams/${examId}/builder`)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RiArrowLeftLine className="h-4 w-4" />
            Back to Builder
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadDocx()}
            disabled={downloading || loading || !preview || !preview.validation?.can_finalize}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? <RiLoader4Line className="h-4 w-4 animate-spin" /> : <RiDownloadLine className="h-4 w-4" />}
            {downloading ? "Downloading..." : "Download .docx"}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveExam()}
            disabled={saving || !preview?.validation?.can_finalize}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <RiLoader4Line className="h-4 w-4 animate-spin" /> : <RiArrowRightUpLine className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Exam"}
          </button>
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
          <section className="rounded-4xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                    {preview.exam.title}
                  </h2>
                  <ExamStatusBadge status={normalizeExamStatus(preview.exam.status)} />
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <RiBookMarkedLine className="h-4 w-4 text-slate-400" />
                    Blueprint: {preview.blueprint?.name ?? "--"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <RiFileList3Line className="h-4 w-4 text-slate-400" />
                    Total Sections: {preview.totals.section_count}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <RiCheckLine className="h-4 w-4 text-slate-400" />
                    Total Questions: {preview.totals.question_count}
                  </span>
                  {preview.template_resolution?.template_key ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
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
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Exam Window
                </div>
                <div className="mt-2 font-medium text-slate-800">
                  {formatDateTime(preview.exam.start_datetime)}
                </div>
                <div className="mt-1 font-medium text-slate-800">
                  {formatDateTime(preview.exam.end_datetime)}
                </div>
              </div>
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
              className="rounded-4xl border border-slate-200 bg-white px-6 py-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Section {sectionIndex + 1}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{section.title}</h3>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Questions
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">
                    {section.question_count ?? 0}/{section.required_question_count ?? 0}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                {QUESTION_GROUP_ORDER.map((groupType) => {
                  const questions = (section.question_groups?.[groupType] ?? []) as GeneratedExamQuestion[];
                  if (!questions.length) return null;

                  return (
                    <div
                      key={`${section.id}-${groupType}`}
                      className="rounded-3xl border border-slate-200 bg-slate-50/60 px-4 py-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
                          {QUESTION_GROUP_LABELS[groupType]}
                        </h4>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {questions.length}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {questions.map((question, questionIndex) => (
                          <div
                            key={`${section.id}-${groupType}-${question.question_id}-${questionIndex}`}
                            className="rounded-3xl border border-slate-200 bg-white px-4 py-4"
                          >
                            <div className="mb-3 text-sm font-semibold text-slate-500">
                              Question {questionIndex + 1}
                            </div>
                            <QuestionRenderer
                              question={question}
                              showAnswer
                              showSolution
                              showOptions
                              showMeta={false}
                              className="bg-transparent p-0 shadow-none"
                              contentClassName="px-0"
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
