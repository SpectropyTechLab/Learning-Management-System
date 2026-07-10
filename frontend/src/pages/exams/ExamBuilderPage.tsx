import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import {
  RiAddLine,
  RiAlertLine,
  RiArrowLeftLine,
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiBookMarkedLine,
  RiCheckLine,
  RiCloseLine,
  RiDraftLine,
  RiDeleteBinLine,
  RiFolderChartLine,
  RiLoader4Line,
  RiSparklingLine,
} from "react-icons/ri";
import api from "@/lib/api";
import ExamShell from "@/features/exams/components/ExamShell";
import ExamStatusBadge from "@/components/ui/ExamStatusBadge";
import QuestionRenderer, { type RenderableQuestion } from "@/components/questions/QuestionRenderer";
import {
  addQuestionToSection,
  clearExamSectionQuestionGroup,
  configureExamSectionSyllabus,
  fetchExamById,
  fetchExamPreview,
  fetchExamSectionSyllabusOptions,
  generateExamSectionQuestions,
  removeQuestionFromExamSection,
  replaceQuestionInSection,
} from "@/features/exams/api";
import type {
  CurriculumOption,
  ExamBuilderSection,
  ExamStatus,
  ExamPreviewPayload,
  GeneratedExamQuestion,
  QuestionGroupType,
} from "@/features/exams/types";

type TopicAllocationRow = {
  topicId: string;
  topicName: string;
  topicNumber?: number | null;
  direction: number;
  similar: number;
  previous_year: number;
  reference: number;
  total: number;
};

type AllocationTotals = {
  direction: number;
  similar: number;
  previous_year: number;
  reference: number;
  total: number;
};

type AllocationCountValues = Pick<
  TopicAllocationRow,
  "direction" | "similar" | "previous_year" | "reference"
>;

type SectionDistributionTargets = AllocationTotals & {
  isExplicit: boolean;
};

type SectionEditorState = {
  gradeId: string;
  subjectId: string;
  selectedChapterIds: string[];
  selectedTopicIds: string[];
  grades: CurriculumOption[];
  subjects: CurriculumOption[];
  chapters: CurriculumOption[];
  topics: CurriculumOption[];
  loadingOptions: boolean;
  generating: boolean;
  deletingGroup: QuestionGroupType | null;
  deletingQuestionId: number | null;
  allocationRows: TopicAllocationRow[];
};

type PickerQuestion = RenderableQuestion & {
  id: number;
  topic_id?: number | null;
  category?: RenderableQuestion["category"];
  question_group_type?: QuestionGroupType | null;
};

type PickerState = {
  mode: "add" | "replace";
  open: boolean;
  sectionId: number | null;
  groupType: QuestionGroupType | null;
  replaceQuestionId: number | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  search: string;
  selectedTopicId: string;
  selectedQuestionType: string;
  selectedQuestionIds: string[];
  questions: PickerQuestion[];
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

type RenderableQuestionFields = Pick<
  RenderableQuestion,
  | "question_text"
  | "options"
  | "solution"
  | "comprehension"
  | "comprehension_passage"
  | "comprehension_questions"
>;

const QUESTION_GROUP_ORDER: QuestionGroupType[] = [
  "direction",
  "similar",
  "previous_year",
  "reference",
];

const QUESTION_GROUP_LABELS: Record<QuestionGroupType, string> = {
  direction: "Direct Question",
  similar: "Similar Question",
  previous_year: "Previous Year Question",
  reference: "Reference Question",
};

const QUESTION_GROUP_HELP: Record<QuestionGroupType, string> = {
  direction: "Questions picked directly from your configured syllabus.",
  similar: "Related approved questions matched to the same topic mix.",
  previous_year: "Questions tagged as previous year for the selected topic.",
  reference: "Reference questions mapped to the configured topic selection.",
};

const PICKER_QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq_single: "mcq_single",
  assertion_reasoning: "assertion_reasoning",
  mcq_multiple: "mcq_multiple",
  true_false: "true_false",
  numerical: "numerical",
  short_answer: "short_answer",
  match_following: "match_following",
  fill_in_blank: "fill_in_blank",
  comprehensive: "comprehensive",
};

const createDefaultEditorState = (): SectionEditorState => ({
  gradeId: "",
  subjectId: "",
  selectedChapterIds: [],
  selectedTopicIds: [],
  grades: [],
  subjects: [],
  chapters: [],
  topics: [],
  loadingOptions: false,
  generating: false,
  deletingGroup: null,
  deletingQuestionId: null,
  allocationRows: [],
});

const createDefaultPickerState = (): PickerState => ({
  mode: "add",
  open: false,
  sectionId: null,
  groupType: null,
  replaceQuestionId: null,
  loading: false,
  saving: false,
  error: null,
  search: "",
  selectedTopicId: "",
  selectedQuestionType: "",
  selectedQuestionIds: [],
  questions: [],
});

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

const calculateRowTotal = (row: AllocationCountValues) =>
  row.direction + row.similar + row.previous_year + row.reference;

const sanitizeCount = (value: string | number) => Math.max(0, Number(value || 0));

const createEmptyAllocationCounts = (): AllocationCountValues => ({
  direction: 0,
  similar: 0,
  previous_year: 0,
  reference: 0,
});

const getSectionDistributionTargets = (section: ExamBuilderSection): SectionDistributionTargets => {
  const targets = {
    direction: Number(section.direction_question_count ?? 0),
    similar: Number(section.similar_question_count ?? 0),
    previous_year: Number(section.previous_year_question_count ?? 0),
    reference: Number(section.reference_question_count ?? 0),
  };

  const total =
    targets.direction + targets.similar + targets.previous_year + targets.reference;

  return {
    ...targets,
    total,
    isExplicit:
      total > 0 && total === Number(section.required_question_count ?? 0),
  };
};

const getAllocationValidation = (
  rows: TopicAllocationRow[],
  section: ExamBuilderSection
) => {
  const totals = calculateAllocationTotals(rows);
  const targets = getSectionDistributionTargets(section);
  const exceededGroups = QUESTION_GROUP_ORDER.filter(
    (groupType) => targets.isExplicit && totals[groupType] > targets[groupType]
  );
  const mismatchedGroups = QUESTION_GROUP_ORDER.filter(
    (groupType) => targets.isExplicit && totals[groupType] !== targets[groupType]
  );
  const exceedsRequiredTotal = totals.total > Number(section.required_question_count ?? 0);
  const matchesRequiredTotal = totals.total === Number(section.required_question_count ?? 0);
  const hasError = exceedsRequiredTotal || exceededGroups.length > 0;
  const isReady =
    matchesRequiredTotal && (!targets.isExplicit || mismatchedGroups.length === 0);

  return {
    totals,
    targets,
    exceededGroups,
    mismatchedGroups,
    exceedsRequiredTotal,
    matchesRequiredTotal,
    hasError,
    isReady,
  };
};

const buildQuestionGroupSeed = (section: ExamBuilderSection) => {
  const seed = new Map<
    string,
    Pick<TopicAllocationRow, "direction" | "similar" | "previous_year" | "reference">
  >();

  for (const groupType of QUESTION_GROUP_ORDER) {
    for (const question of (section.question_groups?.[groupType] ?? []) as GeneratedExamQuestion[]) {
      const topicId = question.topic_id ? String(question.topic_id) : "";
      if (!topicId) continue;
      const current = seed.get(topicId) ?? {
        direction: 0,
        similar: 0,
        previous_year: 0,
        reference: 0,
      };
      current[groupType] += 1;
      seed.set(topicId, current);
    }
  }

  return seed;
};

const distributeCountsAcrossTopics = (
  topics: CurriculumOption[],
  section: ExamBuilderSection
) => {
  const targets = getSectionDistributionTargets(section);
  if (!targets.isExplicit || topics.length === 0) return new Map<string, ReturnType<typeof createEmptyAllocationCounts>>();

  const distribution = new Map<string, ReturnType<typeof createEmptyAllocationCounts>>();
  for (const topic of topics) {
    distribution.set(String(topic.id), createEmptyAllocationCounts());
  }

  for (const groupType of QUESTION_GROUP_ORDER) {
    const groupCount = Number(targets[groupType] || 0);
    if (groupCount === 0) continue;

    const baseCount = Math.floor(groupCount / topics.length);
    const remainder = groupCount % topics.length;

    topics.forEach((topic, index) => {
      const next = distribution.get(String(topic.id)) ?? createEmptyAllocationCounts();
      next[groupType] = baseCount + (index < remainder ? 1 : 0);
      distribution.set(String(topic.id), next);
    });
  }

  return distribution;
};

const buildAllocationRows = (
  topics: CurriculumOption[],
  section: ExamBuilderSection,
  existingRows: TopicAllocationRow[] = []
) => {
  const sortedTopics = [...topics].sort((left, right) => {
    const leftNumber =
      left.topic_number !== null && left.topic_number !== undefined ? Number(left.topic_number) : Number.MAX_SAFE_INTEGER;
    const rightNumber =
      right.topic_number !== null && right.topic_number !== undefined ? Number(right.topic_number) : Number.MAX_SAFE_INTEGER;

    return leftNumber - rightNumber || left.id - right.id;
  });
  const existingByTopicId = new Map<string, TopicAllocationRow>(
    existingRows.map((row: TopicAllocationRow) => [row.topicId, row])
  );
  const generatedSeed = buildQuestionGroupSeed(section);
  const autoSeed = distributeCountsAcrossTopics(sortedTopics, section);

  return sortedTopics.map((topic: CurriculumOption) => {
    const topicId = String(topic.id);
    const existing = existingByTopicId.get(topicId);
    const seed =
      existing ??
      generatedSeed.get(topicId) ??
      autoSeed.get(topicId) ??
      createEmptyAllocationCounts();

    return {
      topicId,
      topicName: topic.name,
      topicNumber: topic.topic_number ?? null,
      direction: seed.direction,
      similar: seed.similar,
      previous_year: seed.previous_year,
      reference: seed.reference,
      total: calculateRowTotal(seed),
    };
  });
};

const filterTopicsBySelectedIds = (topics: CurriculumOption[], selectedTopicIds: string[]) => {
  if (selectedTopicIds.length === 0) return [];
  const selectedIds = new Set(selectedTopicIds);
  return topics.filter((topic) => selectedIds.has(String(topic.id)));
};

const calculateAllocationTotals = (rows: TopicAllocationRow[]): AllocationTotals =>
  rows.reduce(
    (totals: AllocationTotals, row: TopicAllocationRow) => ({
      direction: totals.direction + row.direction,
      similar: totals.similar + row.similar,
      previous_year: totals.previous_year + row.previous_year,
      reference: totals.reference + row.reference,
      total: totals.total + row.total,
    }),
    { direction: 0, similar: 0, previous_year: 0, reference: 0, total: 0 }
  );

const normalizeQuestionGroupTypeFromCategory = (category: unknown): QuestionGroupType | null => {
  const normalizeToken = (value: unknown) => {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (!normalized) return null;
    if (QUESTION_GROUP_ORDER.includes(normalized as QuestionGroupType)) {
      return normalized as QuestionGroupType;
    }
    if (["direct", "direction_question", "direct_question"].includes(normalized)) return "direction";
    if (["similar_question", "similar_questions"].includes(normalized)) return "similar";
    if (
      ["previous_year_question", "previous_year_questions", "previousyear", "previousyear_question"].includes(
        normalized
      )
    ) {
      return "previous_year";
    }
    if (["reference_question", "reference_questions"].includes(normalized)) return "reference";
    return null;
  };

  if (typeof category === "string") return normalizeToken(category);
  if (Array.isArray(category)) {
    for (const entry of category) {
      const match = normalizeToken(entry);
      if (match) return match;
    }
    return null;
  }

  if (category && typeof category === "object") {
    const candidate = category as {
      label?: unknown;
      name?: unknown;
      value?: unknown;
      type?: unknown;
      tags?: unknown[];
    };

    return (
      normalizeToken(candidate.label) ||
      normalizeToken(candidate.name) ||
      normalizeToken(candidate.value) ||
      normalizeToken(candidate.type) ||
      (Array.isArray(candidate.tags)
        ? candidate.tags.map((entry) => normalizeToken(entry)).find(Boolean) ?? null
        : null)
    );
  }

  return null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toRenderableField = <K extends keyof RenderableQuestionFields>(
  source: Record<string, unknown>,
  key: K,
  fallback: RenderableQuestionFields[K]
): RenderableQuestionFields[K] => {
  const value = source[key];
  return (value ?? fallback) as RenderableQuestionFields[K];
};

const normalizePickerQuestion = (item: unknown): PickerQuestion => {
  const source = asRecord(item);
  const questionGroupType =
    normalizeQuestionGroupTypeFromCategory(source.question_group_type) ??
    normalizeQuestionGroupTypeFromCategory(source.category);
  return {
    id: Number(source.id ?? source.question_id),
    question_type: typeof source.question_type === "string" ? source.question_type : "mcq_single",
    question_text: toRenderableField(source, "question_text", ""),
    options: toRenderableField(source, "options", null),
    correct_answer: source.correct_answer ?? null,
    solution: toRenderableField(source, "solution", null),
    difficulty_level:
      typeof source.difficulty_level === "string" ? source.difficulty_level : undefined,
    topic_id: source.topic_id ? Number(source.topic_id) : null,
    category: source.category as RenderableQuestion["category"],
    question_group_type: questionGroupType,
    comprehension: toRenderableField(source, "comprehension", null),
    comprehension_passage: toRenderableField(source, "comprehension_passage", null),
    comprehension_questions: toRenderableField(source, "comprehension_questions", null),
  };
};

const normalizeGeneratedQuestion = (question: GeneratedExamQuestion): RenderableQuestion => {
  const source = asRecord(question);
  return {
    question_type: typeof question.question_type === "string" ? question.question_type : "mcq_single",
    question_text: toRenderableField(source, "question_text", ""),
    options: toRenderableField(source, "options", null),
    correct_answer: question.correct_answer ?? null,
    solution: toRenderableField(source, "solution", null),
    difficulty_level:
      typeof question.difficulty_level === "string" ? question.difficulty_level : undefined,
    category: question.question_group_type,
    comprehension: toRenderableField(source, "comprehension", null),
    comprehension_passage: toRenderableField(source, "comprehension_passage", null),
    comprehension_questions: toRenderableField(source, "comprehension_questions", null),
  };
};

const normalizeExamStatus = (status: unknown): ExamStatus | null => {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "draft" || normalized === "active" || normalized === "completed") {
    return normalized;
  }
  return null;
};

type SelectionDropdownOption = {
  value: string;
  label: string;
  meta?: string;
};

function SelectionDropdown({
  label,
  placeholder,
  options,
  values,
  multiple,
  disabled,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: SelectionDropdownOption[];
  values: string[];
  multiple: boolean;
  disabled?: boolean;
  onChange: (nextValues: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const selectedOptions = options.filter((option) => values.includes(option.value));

  return (
    <div ref={rootRef} className="relative">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <button
        type="button"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300/80 bg-white px-4 py-3 text-left text-sm text-slate-900 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="min-w-0 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-slate-500">{placeholder}</span>
          ) : multiple ? (
            <span className="text-slate-700">
              {values.length} {label.toLowerCase()}{values.length === 1 ? "" : "s"} selected
            </span>
          ) : (
            <span className="font-medium text-slate-900">{selectedOptions[0]?.label}</span>
          )}
        </div>
        <RiArrowDownSLine className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]">
          <div className="max-h-72 overflow-y-auto p-2">
            {options.length === 0 ? (
              <div className="px-3 py-6 text-sm text-slate-500">No options available.</div>
            ) : (
              options.map((option) => {
                const checked = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (multiple) {
                        onChange(
                          checked
                            ? values.filter((value) => value !== option.value)
                            : [...values, option.value]
                        );
                        return;
                      }

                      onChange(checked ? [] : [option.value]);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${checked ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-white bg-white text-slate-900" : "border-slate-300 bg-white text-transparent"}`}>
                        <RiCheckLine className="h-3 w-3" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium">{option.label}</div>
                        {option.meta ? (
                          <div className={`mt-0.5 text-xs ${checked ? "text-slate-200" : "text-slate-400"}`}>
                            {option.meta}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {multiple ? null : checked ? <RiCheckLine className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>

          {multiple && values.length > 0 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
              <span>{values.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="inline-flex items-center gap-1 font-semibold text-slate-700 transition hover:text-slate-900"
              >
                <RiCloseLine className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const hasSameNumericIds = (left: number[] = [], right: number[] = []) => {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort((a, b) => a - b);
  const rightSorted = [...right].sort((a, b) => a - b);
  return leftSorted.every((value, index) => value === rightSorted[index]);
};

function TopicAllocationTable({
  rows,
  section,
  disabled,
  onChange,
}: {
  rows: TopicAllocationRow[];
  section: ExamBuilderSection;
  disabled: boolean;
  onChange: (topicId: string, groupType: QuestionGroupType, value: number) => void;
}) {
  const validation = getAllocationValidation(rows, section);
  const requiredQuestionCount = Number(section.required_question_count ?? 0);
  const {
    totals,
    targets,
    exceededGroups,
    mismatchedGroups,
    exceedsRequiredTotal,
    matchesRequiredTotal,
    hasError,
    isReady,
  } = validation;

  return (
    <div className="border-y border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-1 py-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-950">Topic Allocation</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Enter how many questions should be picked from each topic and category.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${hasError
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : isReady
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
        >
          <RiSparklingLine className="h-4 w-4" />
          Total {totals.total}/{requiredQuestionCount}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-1 py-10 text-sm text-slate-500">
          Select a subject and one or more chapters to load topics for this section.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-transparent text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Topics</th>
                {QUESTION_GROUP_ORDER.map((groupType) => (
                  <th key={groupType} className="px-4 py-3">
                    <div>{QUESTION_GROUP_LABELS[groupType]}</div>
                    {targets.isExplicit ? (
                      <div className="mt-1 text-[10px] font-medium normal-case tracking-normal text-slate-400">
                        Target {targets[groupType]}
                      </div>
                    ) : null}
                  </th>
                ))}
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.topicId} className="align-top">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">{row.topicName}</div>
                    {row.topicNumber !== null && row.topicNumber !== undefined ? (
                      <div className="mt-1 text-xs text-slate-400">Topic #{row.topicNumber}</div>
                    ) : null}
                  </td>
                  {QUESTION_GROUP_ORDER.map((groupType) => (
                    <td key={groupType} className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        value={row[groupType]}
                        disabled={disabled}
                        onChange={(event) => onChange(row.topicId, groupType, sanitizeCount(event.target.value))}
                        className="w-24 rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {row.total}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50/60 text-sm font-semibold text-slate-900">
              <tr>
                <td className="px-4 py-3">Total</td>
                {QUESTION_GROUP_ORDER.map((groupType) => {
                  const exceedsGroup = exceededGroups.includes(groupType);
                  const mismatchedGroup = mismatchedGroups.includes(groupType);
                  return (
                    <td
                      key={groupType}
                      className={`px-4 py-3 ${exceedsGroup
                          ? "text-rose-700"
                          : mismatchedGroup
                            ? "text-amber-700"
                            : ""
                        }`}
                    >
                      {totals[groupType]}
                      {targets.isExplicit ? (
                        <span className="ml-1 text-xs font-medium text-slate-400">/ {targets[groupType]}</span>
                      ) : null}
                    </td>
                  );
                })}
                <td className="px-4 py-3">{totals.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="border-t border-slate-200 px-5 py-4">
        {hasError ? (
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
            <RiAlertLine className="h-4 w-4" />
            {exceedsRequiredTotal
              ? "Planned total exceeds the required question count for this section."
              : `Blueprint category limit exceeded for ${exceededGroups
                .map((groupType) => QUESTION_GROUP_LABELS[groupType])
                .join(", ")}.`}
          </div>
        ) : isReady ? (
          <div className="text-sm font-medium text-emerald-700">
            {targets.isExplicit
              ? "Topic allocation exactly matches the blueprint category counts."
              : "Planned total exactly matches the section requirement."}
          </div>
        ) : (
          <div className="space-y-1 text-sm font-medium text-amber-700">
            {!matchesRequiredTotal ? (
              <div>
                Add {requiredQuestionCount - totals.total} more question
                {requiredQuestionCount - totals.total === 1 ? "" : "s"} to complete this section.
              </div>
            ) : null}
            {targets.isExplicit && mismatchedGroups.length > 0 ? (
              <div>
                Match the blueprint counts for{" "}
                {mismatchedGroups.map((groupType) => QUESTION_GROUP_LABELS[groupType]).join(", ")}.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionGroupPreview({
  groupType,
  questions,
  topicsById,
  onDeleteAll,
  onDeleteQuestion,
  onReplaceQuestion,
  onOpenPicker,
  deletingGroup,
  deletingQuestionId,
}: {
  groupType: QuestionGroupType;
  questions: GeneratedExamQuestion[];
  topicsById: Map<string, string>;
  onDeleteAll: (groupType: QuestionGroupType) => void;
  onDeleteQuestion: (question: GeneratedExamQuestion) => void;
  onReplaceQuestion: (question: GeneratedExamQuestion, groupType: QuestionGroupType) => void;
  onOpenPicker: (groupType: QuestionGroupType) => void;
  deletingGroup: boolean;
  deletingQuestionId: number | null;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">{QUESTION_GROUP_LABELS[groupType]}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {questions.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{QUESTION_GROUP_HELP[groupType]}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenPicker(groupType)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300/80 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <RiAddLine className="h-4 w-4" />
            Select Question
          </button>
          <button
            type="button"
            onClick={() => onDeleteAll(groupType)}
            disabled={deletingGroup || questions.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingGroup ? <RiLoader4Line className="h-4 w-4 animate-spin" /> : <RiDeleteBinLine className="h-4 w-4" />}
            Delete All
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="py-10 text-sm text-slate-500">
          No questions in this part yet. Use Select Question to add approved questions manually.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {questions.map((question) => (
            <div
              key={`${groupType}-${question.question_id}`}
              className="rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      Q{question.order_index}
                    </span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {question.question_type}
                    </span>
                    {question.difficulty_level ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                        {question.difficulty_level}
                      </span>
                    ) : null}
                    {question.topic_id ? (
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                        {topicsById.get(String(question.topic_id)) ?? `Topic ${question.topic_id}`}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 w-full">
                    <QuestionRenderer
                      question={normalizeGeneratedQuestion(question)}
                      showMeta={false}
                      showOptions
                      showAnswer
                      showSolution
                      showComprehension
                      contentClassName="w-full max-w-none text-sm font-semibold leading-6 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => onReplaceQuestion(question, groupType)}
                    className="rounded-lg border border-slate-300/80 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteQuestion(question)}
                    disabled={deletingQuestionId === question.question_id}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingQuestionId === question.question_id ? (
                      <RiLoader4Line className="h-4 w-4 animate-spin" />
                    ) : (
                      <RiDeleteBinLine className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function QuestionPickerModal({
  mode,
  open,
  groupType,
  sectionTitle,
  topics,
  selectedTopicId,
  selectedQuestionType,
  search,
  selectedQuestionIds,
  questions,
  loading,
  saving,
  error,
  onClose,
  onSearchChange,
  onTopicChange,
  onQuestionTypeChange,
  onToggleQuestion,
  onSave,
}: {
  mode: "add" | "replace";
  open: boolean;
  groupType: QuestionGroupType | null;
  sectionTitle: string;
  topics: TopicAllocationRow[];
  selectedTopicId: string;
  selectedQuestionType: string;
  search: string;
  selectedQuestionIds: string[];
  questions: PickerQuestion[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onTopicChange: (value: string) => void;
  onQuestionTypeChange: (value: string) => void;
  onToggleQuestion: (questionId: string) => void;
  onSave: () => void;
}) {
  if (!open || !groupType) return null;
  const isReplaceMode = mode === "replace";
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-3 sm:px-4 sm:py-8">
      <div className="flex max-h-[96vh] w-full max-w-6xl min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-4xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{sectionTitle}</div>
            <h2 className="mt-1.5 text-lg font-semibold text-slate-900 sm:text-xl">
              {isReplaceMode ? "Replace with" : "Select"} {QUESTION_GROUP_LABELS[groupType]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 sm:px-6 md:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            aria-expanded={filtersOpen}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {filtersOpen ? "Hide Filters" : "Show Filters"}
            <RiArrowDownSLine className={`h-4 w-4 transition ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
          {filtersOpen ? (
            <div className="mt-2 grid gap-2.5">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search approved questions"
                  className="mt-1 w-full rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Topic</span>
                <select
                  value={selectedTopicId}
                  onChange={(event) => onTopicChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
                >
                  <option value="">All topics</option>
                  {topics.map((topic) => (
                    <option key={topic.topicId} value={topic.topicId}>
                      {topic.topicName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Type</span>
                <select
                  value={selectedQuestionType}
                  onChange={(event) => onQuestionTypeChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
                >
                  <option value="">All types</option>
                  <option value="mcq_single">MCQ Single</option>
                  <option value="assertion_reasoning">Assertion Reasoning</option>
                  <option value="mcq_multiple">MCQ Multiple</option>
                  <option value="true_false">True/False</option>
                  <option value="numerical">Numerical</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="match_following">Match the Following</option>
                  <option value="fill_in_blank">Fill in the Blank</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <div className="hidden gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-6 md:grid md:grid-cols-[1.1fr_0.7fr_0.7fr]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Search</span>
            <input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search approved questions"
              className="mt-1.5 w-full rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Topic</span>
            <select
              value={selectedTopicId}
              onChange={(event) => onTopicChange(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic.topicId} value={topic.topicId}>
                  {topic.topicName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Type</span>
            <select
              value={selectedQuestionType}
              onChange={(event) => onQuestionTypeChange(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300/80 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            >
              <option value="">All types</option>
              <option value="mcq_single">MCQ Single</option>
              <option value="assertion_reasoning">Assertion Reasoning</option>
              <option value="mcq_multiple">MCQ Multiple</option>
              <option value="true_false">True/False</option>
              <option value="numerical">Numerical</option>
              <option value="short_answer">Short Answer</option>
              <option value="match_following">Match the Following</option>
              <option value="fill_in_blank">Fill in the Blank</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Loading approved questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No approved questions matched this part.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const checked = selectedQuestionIds.includes(String(question.id));
                const displayQuestionType =
                  selectedQuestionType === "comprehensive" && question.comprehension?.passage_content
                    ? "comprehensive"
                    : question.question_type;
                const displayQuestionTypeKey =
                  displayQuestionType && displayQuestionType in PICKER_QUESTION_TYPE_LABELS
                    ? displayQuestionType
                    : undefined;
                return (
                  <label
                    key={question.id}
                    className={`block rounded-2xl border p-4 transition ${checked
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <input
                        type={isReplaceMode ? "radio" : "checkbox"}
                        checked={checked}
                        onChange={() => onToggleQuestion(String(question.id))}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {index + 1}
                          </span>
                          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {displayQuestionTypeKey
                              ? PICKER_QUESTION_TYPE_LABELS[displayQuestionTypeKey]
                              : displayQuestionType ?? "question"}
                          </span>
                          {question.difficulty_level ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                              {question.difficulty_level}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4">
                          <QuestionRenderer
                            question={question}
                            showMeta={false}
                            showOptions
                            showAnswer
                            showSolution
                            showComprehension
                            contentClassName="text-sm font-semibold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm text-slate-500">
            {selectedQuestionIds.length} question{selectedQuestionIds.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-300/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || selectedQuestionIds.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? <RiLoader4Line className="h-4 w-4 animate-spin" /> : <RiAddLine className="h-4 w-4" />}
              {isReplaceMode ? "Replace Question" : "Add Selected Questions"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExamBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const examId = Number(id);

  const [preview, setPreview] = useState<ExamPreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editors, setEditors] = useState<Record<number, SectionEditorState>>({});
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [picker, setPicker] = useState<PickerState>(createDefaultPickerState);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const deferredPickerSearch = useDeferredValue(picker.search);

  const loadPreview = useCallback(async () => {
    if (!Number.isInteger(examId) || examId <= 0) return;

    setLoading(true);
    setError(null);

    try {
      const [examRecord, previewPayload] = await Promise.all([
        fetchExamById(examId),
        fetchExamPreview(examId),
      ]);

      setPreview({
        ...previewPayload,
        exam: {
          ...previewPayload.exam,
          status: previewPayload.exam.status ?? examRecord.status,
          title: previewPayload.exam.title ?? examRecord.title,
        },
      });
    } catch (err) {
      setError(readApiErrorMessage(err, "Failed to load exam builder."));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const refreshPreview = useCallback(async () => {
    if (!Number.isInteger(examId) || examId <= 0) return;

    const previewPayload = await fetchExamPreview(examId);
    setPreview((current) => ({
      ...previewPayload,
      exam: {
        ...previewPayload.exam,
        status: previewPayload.exam.status ?? current?.exam.status,
        title: previewPayload.exam.title ?? current?.exam.title,
      },
    }));
  }, [examId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (!preview) return;

    setActiveSectionId((current) => current ?? preview.sections[0]?.id ?? null);
    setEditors((previous) => {
      const next: Record<number, SectionEditorState> = {};

      for (const section of preview.sections) {
        const current = previous[section.id] ?? createDefaultEditorState();
        const subjectId = current.subjectId || (section.selected_subject_id ? String(section.selected_subject_id) : "");
        const gradeId =
          current.gradeId ||
          String(current.subjects.find((subject) => String(subject.id) === subjectId)?.grade_id ?? "");
        const selectedChapterIds =
          current.selectedChapterIds.length > 0
            ? current.selectedChapterIds
            : (section.chapter_ids ?? []).map(String);
        const initialTopics = (section.topics ?? []).filter(
          (topic) =>
            selectedChapterIds.length === 0 || selectedChapterIds.includes(String(topic.chapter_id ?? ""))
        );
        const selectedTopicIds =
          current.selectedTopicIds.length > 0
            ? current.selectedTopicIds
            : (section.topic_ids ?? []).map(String);
        const filteredTopics = filterTopicsBySelectedIds(initialTopics, selectedTopicIds);

        next[section.id] = {
          ...current,
          gradeId,
          subjectId,
          selectedChapterIds,
          selectedTopicIds,
          allocationRows:
            current.allocationRows.length > 0
              ? current.allocationRows
              : buildAllocationRows(filteredTopics, section),
        };
      }

      return next;
    });
  }, [preview]);

  const activeSection =
    preview?.sections.find((section) => section.id === activeSectionId) ?? preview?.sections[0] ?? null;

  const activeEditor = activeSection ? editors[activeSection.id] ?? createDefaultEditorState() : null;

  const loadSectionOptions = useCallback(async (
    section: ExamBuilderSection,
    nextSubjectId: string,
    nextChapterIds: string[],
    preserveCounts: boolean
  ) => {
    setEditors((previous) => ({
      ...previous,
      [section.id]: {
        ...(previous[section.id] ?? createDefaultEditorState()),
        loadingOptions: true,
      },
    }));

    try {
      const payload = await fetchExamSectionSyllabusOptions(examId, section.id, {
        subject_id: nextSubjectId ? Number(nextSubjectId) : undefined,
        chapter_ids: nextChapterIds.length > 0 ? nextChapterIds.map(Number) : undefined,
      });

      setEditors((previous) => {
        const current = previous[section.id] ?? createDefaultEditorState();
        const nextTopics = payload.topics ?? [];
        const nextGrades = payload.grades ?? [];
        const resolvedGradeId = nextSubjectId
          ? String(payload.subjects?.find((subject) => String(subject.id) === nextSubjectId)?.grade_id ?? "")
          : current.gradeId && nextGrades.some((grade) => String(grade.id) === current.gradeId)
            ? current.gradeId
            : "";
        const selectedTopicIds =
          nextChapterIds.length === 0
            ? []
            : preserveCounts && current.selectedTopicIds.length > 0
              ? current.selectedTopicIds.filter((topicId) =>
                nextTopics.some((topic) => String(topic.id) === topicId)
              )
              : [];
        const filteredTopics = filterTopicsBySelectedIds(nextTopics, selectedTopicIds);
        return {
          ...previous,
          [section.id]: {
            ...current,
            gradeId: resolvedGradeId,
            subjectId: nextSubjectId,
            selectedChapterIds: nextChapterIds,
            selectedTopicIds,
            grades: nextGrades,
            subjects: payload.subjects ?? [],
            chapters: payload.chapters ?? [],
            topics: nextTopics,
            loadingOptions: false,
            allocationRows: nextChapterIds.length > 0
              ? buildAllocationRows(filteredTopics, section, preserveCounts ? current.allocationRows : [])
              : [],
          },
        };
      });
    } catch (err) {
      setEditors((previous) => ({
        ...previous,
        [section.id]: {
          ...(previous[section.id] ?? createDefaultEditorState()),
          loadingOptions: false,
        },
      }));
      toast.error(readApiErrorMessage(err, "Failed to load syllabus options."));
    }
  }, [examId]);

  useEffect(() => {
    if (!activeSection) return;
    const editor = activeEditor ?? createDefaultEditorState();
    const subjectId = editor.subjectId || (activeSection.selected_subject_id ? String(activeSection.selected_subject_id) : "");
    const chapterIds =
      editor.selectedChapterIds.length > 0
        ? editor.selectedChapterIds
        : (activeSection.chapter_ids ?? []).map(String);

    if (editor.subjects.length === 0 && !editor.loadingOptions) {
      void loadSectionOptions(activeSection, subjectId, chapterIds, true);
    }
  }, [activeEditor, activeSection, loadSectionOptions]);

  const handleGradeChange = (section: ExamBuilderSection, gradeId: string) => {
    setEditors((previous) => ({
      ...previous,
      [section.id]: {
        ...(previous[section.id] ?? createDefaultEditorState()),
        gradeId,
        subjectId: "",
        selectedChapterIds: [],
        selectedTopicIds: [],
        chapters: [],
        topics: [],
        allocationRows: [],
      },
    }));
  };

  const handleReplaceQuestion = (
    section: ExamBuilderSection,
    question: GeneratedExamQuestion,
    groupType: QuestionGroupType
  ) => {
    const resolvedGroupType = question.question_group_type ?? groupType;
    if (!resolvedGroupType) {
      toast.error("This question cannot be replaced because its group type is missing.");
      return;
    }

    setPicker({
      ...createDefaultPickerState(),
      mode: "replace",
      open: true,
      sectionId: section.id,
      groupType: resolvedGroupType,
      replaceQuestionId: question.question_id,
      selectedTopicId: question.topic_id ? String(question.topic_id) : "",
    });
  };

  const handleSubjectChange = async (section: ExamBuilderSection, subjectId: string) => {
    const editor = editors[section.id] ?? createDefaultEditorState();
    setEditors((previous) => ({
      ...previous,
      [section.id]: {
        ...(previous[section.id] ?? createDefaultEditorState()),
        gradeId: subjectId
          ? String(editor.subjects.find((subject) => String(subject.id) === subjectId)?.grade_id ?? "")
          : editor.gradeId,
        subjectId,
        selectedChapterIds: [],
        selectedTopicIds: [],
        chapters: [],
        topics: [],
        allocationRows: [],
      },
    }));

    if (subjectId) {
      await loadSectionOptions(section, subjectId, [], false);
    }
  };

  const handleChapterChange = async (section: ExamBuilderSection, chapterIds: string[]) => {
    const editor = editors[section.id] ?? createDefaultEditorState();
    setEditors((previous) => ({
      ...previous,
      [section.id]: {
        ...(previous[section.id] ?? createDefaultEditorState()),
        selectedChapterIds: chapterIds,
        selectedTopicIds: [],
        topics: [],
        allocationRows: [],
      },
    }));

    if (editor.subjectId && chapterIds.length > 0) {
      await loadSectionOptions(section, editor.subjectId, chapterIds, false);
    }
  };

  const handleTopicChange = (section: ExamBuilderSection, topicIds: string[]) => {
    setEditors((previous) => {
      const current = previous[section.id] ?? createDefaultEditorState();
      const filteredTopics = filterTopicsBySelectedIds(current.topics, topicIds);

      return {
        ...previous,
        [section.id]: {
          ...current,
          selectedTopicIds: topicIds,
          allocationRows: buildAllocationRows(filteredTopics, section, current.allocationRows),
        },
      };
    });
  };

  const handleAllocationChange = (sectionId: number, topicId: string, groupType: QuestionGroupType, value: number) => {
    setEditors((previous) => {
      const current = previous[sectionId] ?? createDefaultEditorState();
      const nextRows = current.allocationRows.map((row) => {
        if (row.topicId !== topicId) return row;
        const nextRow = { ...row, [groupType]: value };
        return {
          ...nextRow,
          total: calculateRowTotal(nextRow),
        };
      });

      return {
        ...previous,
        [sectionId]: {
          ...current,
          allocationRows: nextRows,
        },
      };
    });
  };

  const handleGenerateSection = async (section: ExamBuilderSection) => {
    const editor = editors[section.id] ?? createDefaultEditorState();
    const requiredQuestionCount = Number(section.required_question_count ?? 0);
    const validation = getAllocationValidation(editor.allocationRows, section);
    const { totals, targets, exceedsRequiredTotal, exceededGroups, mismatchedGroups, isReady } = validation;

    if (!editor.subjectId) {
      toast.error("Select a subject for this section.");
      return;
    }
    if (editor.selectedChapterIds.length === 0) {
      toast.error("Select at least one chapter for this section.");
      return;
    }
    if (editor.allocationRows.length === 0) {
      toast.error("No topics are available for the selected chapters.");
      return;
    }
    if (exceedsRequiredTotal) {
      toast.error("Planned total exceeds the blueprint requirement for this section.");
      return;
    }
    if (exceededGroups.length > 0) {
      toast.error(
        `Blueprint category limit exceeded for ${exceededGroups
          .map((groupType) => QUESTION_GROUP_LABELS[groupType])
          .join(", ")}.`
      );
      return;
    }
    if (targets.isExplicit && mismatchedGroups.length > 0) {
      toast.error(
        `Match the blueprint counts for ${mismatchedGroups
          .map((groupType) => QUESTION_GROUP_LABELS[groupType])
          .join(", ")} before generating.`
      );
      return;
    }
    if (!isReady || totals.total !== requiredQuestionCount) {
      toast.error("Planned total must exactly match the section question count.");
      return;
    }

    const topicIds = editor.allocationRows.map((row) => Number(row.topicId));
    const chapterIds = editor.selectedChapterIds.map(Number);
    const shouldReconfigure =
      Number(section.selected_subject_id ?? 0) !== Number(editor.subjectId) ||
      !hasSameNumericIds(section.chapter_ids ?? [], chapterIds) ||
      !hasSameNumericIds(section.topic_ids ?? [], topicIds);

    setEditors((previous) => ({
      ...previous,
      [section.id]: {
        ...(previous[section.id] ?? createDefaultEditorState()),
        generating: true,
      },
    }));

    try {
      if (shouldReconfigure) {
        await configureExamSectionSyllabus(examId, section.id, {
          subject_id: Number(editor.subjectId),
          chapter_ids: chapterIds,
          topic_ids: topicIds,
        });
      }

      await generateExamSectionQuestions(examId, section.id, {
        generation_plan: {
          topics: editor.allocationRows.map((row) => ({
            topic_id: Number(row.topicId),
            direction: row.direction,
            similar: row.similar,
            reference: row.reference,
            previous_year: row.previous_year,
          })),
        },
      });

      await refreshPreview();
      toast.success(`${section.title} generated successfully.`);
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to generate section questions."));
    } finally {
      setEditors((previous) => ({
        ...previous,
        [section.id]: {
          ...(previous[section.id] ?? createDefaultEditorState()),
          generating: false,
        },
      }));
    }
  };

  const handleDeleteQuestion = async (section: ExamBuilderSection, question: GeneratedExamQuestion) => {
    setEditors((previous) => ({
      ...previous,
      [section.id]: {
        ...(previous[section.id] ?? createDefaultEditorState()),
        deletingQuestionId: question.question_id,
      },
    }));

    try {
      await removeQuestionFromExamSection(examId, section.id, question.question_id);
      await refreshPreview();
      toast.success("Question removed from section.");
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to remove question."));
    } finally {
      setEditors((previous) => ({
        ...previous,
        [section.id]: {
          ...(previous[section.id] ?? createDefaultEditorState()),
          deletingQuestionId: null,
        },
      }));
    }
  };

  const handleDeleteGroup = async (section: ExamBuilderSection, groupType: QuestionGroupType) => {
    setEditors((previous) => ({
      ...previous,
      [section.id]: {
        ...(previous[section.id] ?? createDefaultEditorState()),
        deletingGroup: groupType,
      },
    }));

    try {
      await clearExamSectionQuestionGroup(examId, section.id, groupType);
      await refreshPreview();
      toast.success(`${QUESTION_GROUP_LABELS[groupType]}s removed.`);
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to clear question group."));
    } finally {
      setEditors((previous) => ({
        ...previous,
        [section.id]: {
          ...(previous[section.id] ?? createDefaultEditorState()),
          deletingGroup: null,
        },
      }));
    }
  };

  const handleOpenPicker = (section: ExamBuilderSection, groupType: QuestionGroupType) => {
    setPicker({
      ...createDefaultPickerState(),
      mode: "add",
      open: true,
      sectionId: section.id,
      groupType,
    });
  };

  const pickerSection =
    preview?.sections.find((section) => section.id === picker.sectionId) ?? null;
  const pickerEditor = pickerSection ? editors[pickerSection.id] ?? createDefaultEditorState() : null;

  useEffect(() => {
    if (!picker.open || !pickerSection || !pickerEditor || !picker.groupType) return;
    if (!pickerEditor.subjectId || pickerEditor.selectedChapterIds.length === 0) {
      setPicker((current) => ({
        ...current,
        loading: false,
        questions: [],
        error: "Select a subject and at least one chapter before adding questions.",
      }));
      return;
    }

    let cancelled = false;
    const usedQuestionIds = new Set(
      (preview?.sections ?? []).flatMap((section) =>
        QUESTION_GROUP_ORDER.flatMap((groupType) =>
          ((section.question_groups?.[groupType] ?? []) as GeneratedExamQuestion[]).map(
            (question: GeneratedExamQuestion) => question.question_id
          )
        )
      )
    );
    const allowedTopicIds = new Set(pickerEditor.allocationRows.map((row) => Number(row.topicId)));

    const loadQuestions = async () => {
      setPicker((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const params: Record<string, string | number> = {
          page_size: 100,
          status: "approved",
          subject_id: Number(pickerEditor.subjectId),
        };
        if (picker.selectedQuestionType !== "comprehensive") {
          params.exclude_question_type = "comprehensive";
        }
        if (picker.groupType) {
          params.question_group_type = picker.groupType;
        }
        if (picker.selectedQuestionType) {
          if (picker.selectedQuestionType === "comprehensive") {
            params.has_comprehension = "true";
          } else {
            params.question_type = picker.selectedQuestionType;
          }
        }
        if (pickerEditor.selectedChapterIds.length === 1) {
          params.chapter_id = Number(pickerEditor.selectedChapterIds[0]);
        }

        if (deferredPickerSearch.trim()) {
          params.q = deferredPickerSearch.trim();
        }
        if (picker.selectedTopicId) {
          params.topic_id = Number(picker.selectedTopicId);
        }

        const res = await api.get("/questions", { params });
        const payload = Array.isArray(res.data?.data) ? res.data.data : [];
        const nextQuestions: PickerQuestion[] = payload
          .map(normalizePickerQuestion)
          .filter((question: PickerQuestion) =>
            picker.selectedQuestionType === "comprehensive"
              ? Boolean(
                  question.comprehension?.passage_content ||
                  question.comprehension_passage ||
                  question.question_type === "comprehensive"
                )
              : question.question_type !== "comprehensive"
          )
          .filter((question: PickerQuestion) => question.question_group_type === picker.groupType)
          .filter((question: PickerQuestion) => !usedQuestionIds.has(question.id))
          .filter((question: PickerQuestion) =>
            question.topic_id ? allowedTopicIds.has(Number(question.topic_id)) : true
          );

        if (cancelled) return;

        setPicker((current) => ({
          ...current,
          loading: false,
          questions: nextQuestions,
            selectedQuestionIds: current.selectedQuestionIds.filter((selectedId) =>
              nextQuestions.some((question: PickerQuestion) => String(question.id) === selectedId)
            ),
          }));
      } catch (err) {
        if (cancelled) return;
        setPicker((current) => ({
          ...current,
          loading: false,
          questions: [],
          error: readApiErrorMessage(err, "Failed to load approved questions."),
        }));
      }
    };

    void loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [
    deferredPickerSearch,
    picker.open,
    picker.selectedQuestionType,
    picker.selectedTopicId,
    picker.groupType,
    pickerEditor,
    pickerSection,
    preview,
  ]);

  const handleTogglePickerQuestion = (questionId: string) => {
    setPicker((current) => ({
      ...current,
      selectedQuestionIds:
        current.mode === "replace"
          ? current.selectedQuestionIds.includes(questionId)
            ? []
            : [questionId]
          : current.selectedQuestionIds.includes(questionId)
            ? current.selectedQuestionIds.filter((idValue) => idValue !== questionId)
            : [...current.selectedQuestionIds, questionId],
    }));
  };

  const handleSavePickedQuestions = async () => {
    if (!pickerSection) return;
    if (picker.selectedQuestionIds.length === 0) {
      toast.error("Select at least one question.");
      return;
    }

    setPicker((current) => ({
      ...current,
      saving: true,
    }));

    let added = 0;
    let failed = 0;

    try {
      if (picker.mode === "replace") {
        if (!picker.replaceQuestionId) {
          toast.error("The current question for replacement is missing.");
          return;
        }

        const replacementQuestionId = Number(picker.selectedQuestionIds[0]);
        await replaceQuestionInSection(examId, pickerSection.id, {
          current_question_id: picker.replaceQuestionId,
          new_question_id: replacementQuestionId,
        });

        await refreshPreview();
        setPicker(createDefaultPickerState());
        toast.success(`Question replaced in ${pickerSection.title}.`);
        return;
      }

      for (const selectedId of picker.selectedQuestionIds) {
        try {
          await addQuestionToSection(examId, pickerSection.id, {
            question_id: Number(selectedId),
          });
          added += 1;
        } catch (err) {
          failed += 1;
          toast.error(readApiErrorMessage(err, `Failed to add question ${selectedId}.`));
        }
      }

      if (added > 0) {
        toast.success(`Added ${added} question${added === 1 ? "" : "s"} to ${pickerSection.title}.`);
      }
      if (failed === 0) {
        setPicker(createDefaultPickerState());
      }
      await refreshPreview();
    } finally {
      setPicker((current) => ({
        ...current,
        saving: false,
      }));
    }
  };

  const handleOpenSavePreview = () => {
    if (!preview?.validation?.can_finalize) {
      const firstReason = preview?.validation?.blocking_reasons?.[0];
      toast.error(firstReason || "Resolve template validation issues before saving the exam.");
      return;
    }
    if (!preview?.all_sections_completed) {
      toast.error("Complete every blueprint section before saving the exam.");
      return;
    }
    navigate(`/exams/${examId}/paper-preview`);
  };

  const completedSections =
    preview?.sections.filter((section) => section.completion_status === "completed").length ?? 0;

  const activeAllocationValidation =
    activeSection && activeEditor
      ? getAllocationValidation(activeEditor.allocationRows, activeSection)
      : null;
  const activeTopicsById = new Map(
    (activeEditor?.allocationRows ?? []).map((row) => [row.topicId, row.topicName])
  );

  return (
    <>
      <ExamShell
        title="Exam Builder"
        description="Build each section, generate questions, review every part, and save the final exam."
        headerClassName="sticky top-0 z-30 px-6 py-4"
        bodyClassName="px-6 pt-2 pb-6"
        headerAction={
          <>
            <button
              type="button"
              onClick={() => navigate("/exams")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RiArrowLeftLine className="h-4 w-4" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to Exam List</span>
            </button>
            <button
              type="button"
              onClick={handleOpenSavePreview}
              disabled={!preview?.validation?.can_finalize}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RiArrowRightUpLine className="h-4 w-4" />
              <span className="sm:hidden">Save</span>
              <span className="hidden sm:inline">Save and Preview Exam</span>
            </button>
          </>
        }
      >
        {loading ? (
          <div className="border-y border-slate-200 py-12 text-center text-sm text-slate-500">
            Loading exam builder...
          </div>
        ) : error ? (
          <div className="border-l-2 border-rose-500 bg-rose-50/70 px-4 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : !preview ? (
          <div className="border-y border-slate-200 py-12 text-center text-sm text-slate-500">
            Exam not found.
          </div>
        ) : (
          <div className="space-y-5">
            <section className="sticky top-0 z-20 -mt-1 rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.09),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-3 py-2 shadow-sm backdrop-blur sm:px-4">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-950">{preview.exam.title}</h2>
                    <ExamStatusBadge status={normalizeExamStatus(preview.exam.status)} />
                    <button
                      type="button"
                      onClick={() => setSummaryOpen((current) => !current)}
                      aria-expanded={summaryOpen}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:hidden"
                    >
                      {summaryOpen ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {activeSection ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
                        Active: {activeSection.title}
                      </span>
                    ) : null}
                    <div className="text-xs text-slate-500">
                      {completedSections}/{preview.totals.section_count} sections • {preview.totals.question_count}/{preview.totals.required_question_count} ready
                    </div>
                  </div>
                  {summaryOpen ? (
                  <div className="mt-1.5 hidden flex-wrap items-center gap-1 text-xs text-slate-500 md:flex">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5">
                      <RiBookMarkedLine className="h-4 w-4 text-slate-400" />
                      Blueprint: {preview.blueprint?.name ?? "--"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5">
                      <RiDraftLine className="h-4 w-4 text-slate-400" />
                      Sections: {preview.sections.length}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5">
                      <RiFolderChartLine className="h-4 w-4 text-slate-400" />
                      Program: {preview.exam.program_name ?? preview.exam.program_id ?? "--"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5">
                      <RiSparklingLine className="h-4 w-4 text-slate-400" />
                      Window: {formatDateTime(preview.exam.start_datetime)} to {formatDateTime(preview.exam.end_datetime)}
                    </span>
                    {preview.template_resolution?.template_key ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2 py-0.5">
                        <RiDraftLine className="h-4 w-4 text-slate-400" />
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

                <div className="hidden w-full items-center justify-between gap-2 sm:flex sm:w-auto sm:justify-end sm:self-start">
                  <div className="rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 shadow-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Progress
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-base font-semibold tracking-tight text-slate-950">
                        {completedSections}/{preview.totals.section_count}
                      </span>
                      <span className="text-xs text-slate-500">ready</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSummaryOpen((current) => !current)}
                    aria-expanded={summaryOpen}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {summaryOpen ? "Hide" : "Show"}
                    <RiArrowDownSLine className={`h-4 w-4 transition ${summaryOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>

              {summaryOpen ? (
              <div className="mt-2 border-t border-slate-200/80 pt-1.5">
                <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <RiDraftLine className="h-4 w-4" />
                  Sections
                </div>
                <div className="overflow-x-auto">
                  <div className="flex min-w-max gap-1.5">
                    {preview.sections.map((section) => {
                      const isActive = activeSection?.id === section.id;

                      return (
                        <button
                          key={`sticky-section-${section.id}`}
                          type="button"
                          onClick={() => startTransition(() => setActiveSectionId(section.id))}
                          className={`min-w-37.5 rounded-[14px] border px-3 py-1.5 text-left transition ${isActive
                              ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                              : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
                            }`}
                        >
                          <div className="text-sm font-semibold">{section.title}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              ) : null}

              {summaryOpen && preview.validation?.blocking_reasons?.length ? (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
                  {preview.validation.blocking_reasons[0]}
                </div>
              ) : null}
            </section>

            <section className="hidden rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-1.5.5 px-3 py-1">
                  {preview.sections.map((section, index) => {
                    const isActive = activeSection?.id === section.id;
                    const ready = Number(section.question_count ?? 0) === Number(section.required_question_count ?? 0);

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => startTransition(() => setActiveSectionId(section.id))}
                        className={`min-w-52.5 rounded-[18px] border px-3.5 py-3 text-left transition ${isActive
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                            : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
                          }`}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">
                          Section {index + 1}
                        </div>
                        <div className="mt-1.5 text-sm font-semibold">{section.title}</div>
                        <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive
                            ? "bg-white/10 text-white"
                            : ready
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                          {section.question_count ?? 0}/{section.required_question_count ?? 0} ready
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {activeSection && activeEditor ? (
              <div className="space-y-6">
                <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold tracking-tight text-slate-950">{activeSection.title}</h3>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Requires {activeSection.required_question_count ?? 0}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {activeSection.completion_status ?? "pending"}
                        </span>
                      </div>
                      <p className="mt-1 max-w-3xl text-sm text-slate-500">
                        Select the subject and chapters, define the topic-wise question mix, generate the section, then review each part below.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Generated
                      </div>
                      <div className="mt-1 text-base font-semibold text-slate-950">
                        {activeSection.question_count ?? 0}/{activeSection.required_question_count ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SelectionDropdown
                      label="Grade"
                      placeholder="Select grade"
                      multiple={false}
                      values={activeEditor.gradeId ? [activeEditor.gradeId] : []}
                      options={activeEditor.grades.map((grade) => ({
                        value: String(grade.id),
                        label:
                          grade.grade_number !== undefined && grade.grade_number !== null
                            ? `Grade ${grade.grade_number}`
                            : grade.name,
                      }))}
                      onChange={(nextValues) => handleGradeChange(activeSection, nextValues[0] ?? "")}
                    />
                    <SelectionDropdown
                      label="Subject"
                      placeholder="Select subject"
                      multiple={false}
                      values={activeEditor.subjectId ? [activeEditor.subjectId] : []}
                      options={activeEditor.subjects
                        .filter((subject) =>
                          !activeEditor.gradeId || String(subject.grade_id ?? "") === activeEditor.gradeId
                        )
                        .map((subject) => ({
                          value: String(subject.id),
                          label: subject.name,
                          meta:
                            subject.grade_number !== undefined && subject.grade_number !== null
                              ? `Grade ${subject.grade_number}`
                              : undefined,
                        }))}
                      onChange={(nextValues) => void handleSubjectChange(activeSection, nextValues[0] ?? "")}
                    />

                    <SelectionDropdown
                      label="Chapter"
                      placeholder="Select one or more chapters"
                      multiple
                      disabled={!activeEditor.subjectId}
                      values={activeEditor.selectedChapterIds}
                      options={activeEditor.chapters.map((chapter) => ({
                        value: String(chapter.id),
                        label: chapter.name,
                        meta:
                          chapter.chapter_number !== undefined && chapter.chapter_number !== null
                            ? `Chapter-${chapter.chapter_number}`
                            : undefined,
                      }))}
                      onChange={(nextValues) => void handleChapterChange(activeSection, nextValues)}
                    />

                    <SelectionDropdown
                      label="Topic"
                      placeholder="Select one or more topics"
                      multiple
                      disabled={activeEditor.topics.length === 0}
                      values={activeEditor.selectedTopicIds}
                      options={activeEditor.topics.map((topic) => ({
                        value: String(topic.id),
                        label: topic.name,
                        meta:
                          topic.topic_number !== undefined && topic.topic_number !== null
                            ? `Topic-${topic.topic_number}`
                            : undefined,
                      }))}
                      onChange={(nextValues) => handleTopicChange(activeSection, nextValues)}
                    />
                  </div>

                  {activeEditor.loadingOptions ? (
                    <div className="mt-4 border-l-2 border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-500">
                      Loading section syllabus...
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <TopicAllocationTable
                      rows={activeEditor.allocationRows}
                      section={activeSection}
                      disabled={activeEditor.generating}
                      onChange={(topicId, groupType, value) =>
                        handleAllocationChange(activeSection.id, topicId, groupType, value)
                      }
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Generate Section</div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        The generator will use the allocation table above and replace the existing generated questions for this section.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleGenerateSection(activeSection)}
                      disabled={
                        activeEditor.generating ||
                        activeEditor.loadingOptions ||
                        activeEditor.allocationRows.length === 0 ||
                        !activeAllocationValidation?.isReady
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {activeEditor.generating ? (
                        <RiLoader4Line className="h-4 w-4 animate-spin" />
                      ) : (
                        <RiSparklingLine className="h-4 w-4" />
                      )}
                      {activeEditor.generating ? "Generating..." : "Generate Questions"}
                    </button>
                  </div>
                </section>

                <section className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">Question Preview</h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        Review every part, remove questions, clear a full part, or add approved questions manually.
                      </p>
                    </div>
                  </div>

                  {QUESTION_GROUP_ORDER.map((groupType) => (
                    <QuestionGroupPreview
                      key={`${activeSection.id}-${groupType}`}
                      groupType={groupType}
                      questions={
                        (activeSection.question_groups?.[groupType] ?? []) as GeneratedExamQuestion[]
                      }
                      topicsById={activeTopicsById}
                      deletingGroup={activeEditor.deletingGroup === groupType}
                      deletingQuestionId={activeEditor.deletingQuestionId}
                      onDeleteAll={(nextGroupType) => void handleDeleteGroup(activeSection, nextGroupType)}
                      onDeleteQuestion={(question) => void handleDeleteQuestion(activeSection, question)}
                      onReplaceQuestion={(question, nextGroupType) =>
                        handleReplaceQuestion(activeSection, question, nextGroupType)
                      }
                      onOpenPicker={(nextGroupType) => handleOpenPicker(activeSection, nextGroupType)}
                    />
                  ))}
                </section>
              </div>
            ) : null}
          </div>
        )}
      </ExamShell>

      <QuestionPickerModal
        mode={picker.mode}
        open={picker.open}
        groupType={picker.groupType}
        sectionTitle={pickerSection?.title ?? "Section"}
        topics={pickerEditor?.allocationRows ?? []}
        selectedTopicId={picker.selectedTopicId}
        selectedQuestionType={picker.selectedQuestionType}
        search={picker.search}
        selectedQuestionIds={picker.selectedQuestionIds}
        questions={picker.questions}
        loading={picker.loading}
        saving={picker.saving}
        error={picker.error}
        onClose={() => setPicker(createDefaultPickerState())}
        onSearchChange={(value) =>
          setPicker((current) => ({
            ...current,
            search: value,
          }))
        }
        onTopicChange={(value) =>
          setPicker((current) => ({
            ...current,
            selectedTopicId: value,
          }))
        }
        onQuestionTypeChange={(value) =>
          setPicker((current) => ({
            ...current,
            selectedQuestionType: value,
          }))
        }
        onToggleQuestion={handleTogglePickerQuestion}
        onSave={() => void handleSavePickedQuestions()}
      />
      </>
    );
  }
