import type { ExamFiltersState } from "../types";

interface ExamFiltersProps {
  filters: ExamFiltersState;
  onChange: (next: ExamFiltersState) => void;
  onClear: () => void;
}

export default function ExamFilters({ filters, onChange, onClear }: ExamFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="md:col-span-2">
        <label className="text-xs font-semibold text-slate-500">Search</label>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search by title or description"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Status</label>
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as ExamFiltersState["status"] })
          }
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Start From</label>
        <input
          type="date"
          value={filters.startFrom}
          onChange={(event) => onChange({ ...filters, startFrom: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500">Start To</label>
        <input
          type="date"
          value={filters.startTo}
          onChange={(event) => onChange({ ...filters, startTo: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>
      <div className="flex items-end">
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
