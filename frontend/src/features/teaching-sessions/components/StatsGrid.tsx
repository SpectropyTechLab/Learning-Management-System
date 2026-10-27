import type { TeachingAnalyticsSummary } from '@/features/teaching-sessions/types';

const statItems = (summary: TeachingAnalyticsSummary) => [
  ['Total Sessions', summary.total_sessions],
  ['Completed', summary.completed_sessions],
  ['Partial', summary.partial_sessions],
  ['Not Completed', summary.not_completed_sessions],
  ['Update Pending', summary.update_pending_sessions],
  ['Lagging', summary.lagging_sessions],
];

export default function StatsGrid({ summary }: { summary: TeachingAnalyticsSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {statItems(summary).map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
          <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
        </div>
      ))}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Avg Completion</div>
        <div className="mt-3 text-2xl font-semibold text-slate-900">
          {summary.average_completion_percentage}%
        </div>
      </div>
    </div>
  );
}
