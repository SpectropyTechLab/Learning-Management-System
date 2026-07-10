import type { ExamStatus } from "@/features/exams/types";

const statusClassMap: Record<ExamStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  published: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function ExamStatusBadge({
  status,
  className = "",
}: {
  status: ExamStatus | null;
  className?: string;
}) {
  const tone = status ? statusClassMap[status] : "bg-slate-50 text-slate-500 border-slate-200";
  const label = status ?? "unknown";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tone} ${className}`}
    >
      {label}
    </span>
  );
}
