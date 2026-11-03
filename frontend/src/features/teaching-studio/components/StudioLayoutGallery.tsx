import type { StudioLayoutSummary } from '../api/studioEditorApi';

interface Props {
  layouts: StudioLayoutSummary[];
  loading: boolean;
  error: string;
  selectedLayoutId: number | null;
  applying: boolean;
  canApply: boolean;
  onSelect: (layoutId: number) => void;
  onRetry: () => void;
  onApply: () => void;
}

const sortedLayouts = (layouts: StudioLayoutSummary[]) =>
  [...layouts].sort(
    (a, b) =>
      Number(b.is_default) - Number(a.is_default) ||
      a.layout_key.localeCompare(b.layout_key, undefined, { numeric: true }) ||
      a.version_no - b.version_no ||
      a.id - b.id,
  );

export default function StudioLayoutGallery({
  layouts,
  loading,
  error,
  selectedLayoutId,
  applying,
  canApply,
  onSelect,
  onRetry,
  onApply,
}: Props) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Layouts</h2>
          <p className="text-sm text-slate-500">
            Choose a database layout for the selected Screen.
          </p>
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply || applying}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {applying ? 'Applying...' : 'Apply Layout'}
        </button>
      </div>
      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500" role="status">
          Loading layouts...
        </p>
      ) : null}
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedLayouts(layouts).map((layout) => {
            const selected = layout.id === selectedLayoutId;
            const width = Number(layout.canvas_width) || 1920;
            const height = Number(layout.canvas_height) || 1080;
            const slots = layout.layout_data_json?.slots ?? [];
            return (
              <button
                key={layout.id}
                type="button"
                onClick={() => onSelect(layout.id)}
                aria-pressed={selected}
                className={`rounded-xl border p-3 text-left transition ${selected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-300'}`}
              >
                <div className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      title={slot.label}
                      className={`absolute overflow-hidden rounded-[2px] border px-1 text-[7px] leading-tight ${slot.region === 'header' ? 'border-blue-300 bg-blue-100 text-blue-800' : slot.region === 'footer' ? 'border-slate-300 bg-slate-200 text-slate-600' : 'border-indigo-300 bg-indigo-50 text-indigo-700'}`}
                      style={{
                        left: `${(slot.bounds.x / width) * 100}%`,
                        top: `${(slot.bounds.y / height) * 100}%`,
                        width: `${(slot.bounds.width / width) * 100}%`,
                        height: `${(slot.bounds.height / height) * 100}%`,
                      }}
                    >
                      {slot.label}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{layout.name}</p>
                    <p className="text-xs text-slate-500">
                      {layout.layout_key} · v{layout.version_no} · {slots.length} slots
                    </p>
                  </div>
                  {layout.is_default ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      Default
                    </span>
                  ) : null}
                </div>
                {layout.description ? (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">{layout.description}</p>
                ) : null}
              </button>
            );
          })}
          {layouts.length === 0 ? (
            <p className="text-sm text-slate-500">No layouts are available.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
