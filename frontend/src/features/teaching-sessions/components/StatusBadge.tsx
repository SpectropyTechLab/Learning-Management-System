const toneByStatus: Record<string, string> = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partially_completed: 'border-amber-200 bg-amber-50 text-amber-700',
  not_completed: 'border-rose-200 bg-rose-50 text-rose-700',
  update_pending: 'border-sky-200 bg-sky-50 text-sky-700',
  lagging: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  not_started: 'border-slate-200 bg-slate-100 text-slate-700',
  matched: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  unmatched_micro: 'border-amber-200 bg-amber-50 text-amber-700',
  unmatched_planner: 'border-sky-200 bg-sky-50 text-sky-700',
  conflict: 'border-rose-200 bg-rose-50 text-rose-700',
};

const labelize = (value: string) => value.replace(/_/g, ' ');

export default function StatusBadge({ status }: { status: string }) {
  const tone = toneByStatus[status] ?? toneByStatus.not_started;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {labelize(status)}
    </span>
  );
}
