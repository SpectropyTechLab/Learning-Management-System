import { computeExamStatus } from "../utils/computeExamStatus";
import type { ExamStatus, ExamSummary } from "../types";
import ExamStatusBadge from "@/components/ui/ExamStatusBadge";
import type { ExamPermissions } from "@/features/exams/utils/examPermissions";

interface ExamListTableProps {
  exams: ExamSummary[];
  onAction: (action: string, exam: ExamSummary) => void;
  permissions: ExamPermissions;
  onStatusClick?: (exam: ExamSummary) => void;
}

const normalizeStatus = (value?: string | null): ExamStatus | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "draft" || normalized === "active" || normalized === "completed") {
    return normalized;
  }
  return null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
};

const formatWindow = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "--";
  if (start && end) return `${formatDateTime(start)} -> ${formatDateTime(end)}`;
  if (start) return `${formatDateTime(start)} -> --`;
  return `-- -> ${formatDateTime(end)}`;
};

const getActionState = (status: ExamStatus | null, permissions: ExamPermissions) => {
  const isDraft = status === "draft";
  const isCompleted = status === "completed";

  return {
    canEdit: permissions.canUpdate && isDraft,
    canBuilder: permissions.canUpdate && isDraft,
    canPublish: permissions.canPublish && isDraft,
    canResults: isCompleted,
    canDelete: permissions.canDelete,
  };
};

const ActionButton = ({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
      disabled
        ? "border-slate-200 text-slate-400 cursor-not-allowed"
        : "border-slate-200 text-slate-600 hover:bg-slate-50"
    }`}
  >
    {label}
  </button>
);

export default function ExamListTable({
  exams,
  onAction,
  permissions,
  onStatusClick,
}: ExamListTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 p-4 md:hidden">
        {exams.map((exam) => {
          const status =
            normalizeStatus(exam.status) ??
            computeExamStatus(exam);
          const actionState = getActionState(status, permissions);
          const description = exam.description?.trim() || "";
          const snippet =
            description.length > 120 ? `${description.slice(0, 117)}...` : description;
          const tags = Array.isArray(exam.tags) ? exam.tags : [];
          const duration =
            exam.duration_minutes !== null && exam.duration_minutes !== undefined
              ? `${exam.duration_minutes} min`
              : "--";
          const courseNames = Array.isArray(exam.course_names)
            ? exam.course_names.filter((name) => typeof name === "string" && name.trim().length > 0)
            : [];
          const courses =
            courseNames.length > 0
              ? courseNames.join(", ")
              : exam.course_count !== null && exam.course_count !== undefined
                ? `${exam.course_count} course${exam.course_count === 1 ? "" : "s"}`
                : "--";
          const attempts =
            exam.attempts_count !== null && exam.attempts_count !== undefined
              ? exam.attempts_count
              : "--";
          const createdBy = exam.created_by_name || "--";

          return (
            <div
              key={`mobile-${exam.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900 break-words">{exam.title}</div>
                  {snippet && (
                    <div className="mt-1 text-xs text-slate-500">{snippet}</div>
                  )}
                </div>
                <div className="shrink-0">
                  {actionState.canPublish ? (
                    <button
                      type="button"
                      onClick={() => onAction("publish", exam)}
                      title="Click to publish this exam"
                      className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                      <ExamStatusBadge
                        status={status}
                        className="cursor-pointer transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      />
                    </button>
                  ) : (
                    <ExamStatusBadge status={status} />
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div><span className="font-medium text-slate-900">Window:</span> {formatWindow(exam.start_datetime, exam.end_datetime)}</div>
                <div><span className="font-medium text-slate-900">Duration:</span> {duration}</div>
                <div><span className="font-medium text-slate-900">Courses:</span> {courses}</div>
                <div><span className="font-medium text-slate-900">Attempts:</span> {attempts}</div>
                <div><span className="font-medium text-slate-900">Created By:</span> {createdBy}</div>
              </div>

              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={`${exam.id}-${tag}`}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton
                  label="Edit"
                  disabled={!actionState.canEdit}
                  onClick={() => onAction("edit", exam)}
                />
                <ActionButton
                  label="Builder"
                  disabled={!actionState.canBuilder}
                  onClick={() => onAction("builder", exam)}
                />
                <ActionButton
                  label="Results"
                  disabled={!actionState.canResults}
                  onClick={() => onAction("results", exam)}
                />
                <ActionButton
                  label="Delete"
                  disabled={!actionState.canDelete}
                  onClick={() => onAction("delete", exam)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Courses</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {exams.map((exam) => {
              const status =
                normalizeStatus(exam.status) ??
                computeExamStatus(exam);
              const actionState = getActionState(status, permissions);
              const description = exam.description?.trim() || "";
              const snippet =
                description.length > 120 ? `${description.slice(0, 117)}...` : description;
              const tags = Array.isArray(exam.tags) ? exam.tags : [];
              const duration =
                exam.duration_minutes !== null && exam.duration_minutes !== undefined
                  ? `${exam.duration_minutes} min`
                  : "--";
              const courseNames = Array.isArray(exam.course_names)
                ? exam.course_names.filter((name) => typeof name === "string" && name.trim().length > 0)
                : [];
              const courses =
                courseNames.length > 0
                  ? courseNames.join(", ")
                  : exam.course_count !== null && exam.course_count !== undefined
                    ? `${exam.course_count} course${exam.course_count === 1 ? "" : "s"}`
                    : "--";
              const attempts =
                exam.attempts_count !== null && exam.attempts_count !== undefined
                  ? exam.attempts_count
                  : "--";
              const createdBy = exam.created_by_name || "--";
              return (
                <tr key={exam.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{exam.title}</div>
                    {snippet && (
                      <div className="mt-1 text-xs text-slate-500">{snippet}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {actionState.canPublish ? (
                      <button
                        type="button"
                        onClick={() => onAction("publish", exam)}
                        title="Click to publish this exam"
                        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      >
                        <ExamStatusBadge
                          status={status}
                          className="cursor-pointer transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                        />
                      </button>
                    ) : (
                      <ExamStatusBadge status={status} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {formatWindow(exam.start_datetime, exam.end_datetime)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{duration}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <span className="line-clamp-2" title={courses}>
                      {courses}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{attempts}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{createdBy}</td>
                  <td className="px-4 py-3">
                    {tags.length === 0 ? (
                      <span className="text-xs text-slate-400">--</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={`${exam.id}-${tag}`}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        label="Edit"
                        disabled={!actionState.canEdit}
                        onClick={() => onAction("edit", exam)}
                      />
                      <ActionButton
                        label="Builder"
                        disabled={!actionState.canBuilder}
                        onClick={() => onAction("builder", exam)}
                      />
                      <ActionButton
                        label="Results"
                        disabled={!actionState.canResults}
                        onClick={() => onAction("results", exam)}
                      />
                      <ActionButton
                        label="Delete"
                        disabled={!actionState.canDelete}
                        onClick={() => onAction("delete", exam)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


