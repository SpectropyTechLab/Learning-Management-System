import type { StudioLayoutSummary } from '../api/studioEditorApi';
import { targetLayouts } from '../targetLayouts';
import type { Layout } from '../layouts';

interface Props {
  layouts: StudioLayoutSummary[];
  selectedLayoutId: number | null;
  applying: boolean;
  onApply: (row: StudioLayoutSummary, layout: Layout) => void;
}

const LayoutThumbnail = ({ layout }: { layout: Layout }) => (
  <div className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-slate-50">
    {layout.slots.map((slot) => (
      <div
        key={slot.id}
        title={slot.label}
        className={slot.region === 'header'
          ? 'absolute rounded-sm border border-blue-300 bg-blue-100'
          : slot.region === 'footer'
            ? 'absolute rounded-sm border border-slate-300 bg-slate-200'
            : 'absolute rounded-sm border border-teal-300 bg-teal-50'}
        style={{
          left: `${slot.bounds.x / 19.2}%`,
          top: `${slot.bounds.y / 10.8}%`,
          width: `${slot.bounds.width / 19.2}%`,
          height: `${slot.bounds.height / 10.8}%`,
        }}
      />
    ))}
  </div>
);

export default function StudioLayoutGallery({ layouts, selectedLayoutId, applying, onApply }: Props) {
  const byKey = new Map(layouts.map((row) => [row.layout_key.toUpperCase(), row]));
  return (
    <>
      <div className="mb-3">
        <h2 className="font-semibold text-slate-900">Default layouts</h2>
        <p className="text-sm text-slate-500">
          LYT-001 through LYT-014 use validated 16:9 slot geometry. Applying a layout saves it to the selected Screen.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {targetLayouts.map((layout) => {
          const row = byKey.get(layout.id);
          const selected = Boolean(row && selectedLayoutId === row.id);
          return (
            <article key={layout.id} className={`rounded-xl border p-3 ${selected ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <LayoutThumbnail layout={layout} />
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-blue-800">{layout.id}</p>
                  <h3 className="truncate text-sm font-semibold text-slate-900">{layout.name}</h3>
                </div>
                {row ? <span className="shrink-0 text-xs text-slate-500">v{row.version_no}</span> : null}
              </div>
              <p className="mt-1 line-clamp-2 min-h-10 text-xs text-slate-600">{layout.purpose}</p>
              <button
                type="button"
                disabled={!row || selected || applying}
                onClick={() => row && onApply(row, layout)}
                className="mt-3 w-full rounded-lg border border-blue-800 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-900 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
              >
                {selected ? 'Applied' : row ? (applying ? 'Applying...' : 'Apply layout') : 'Not provisioned'}
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}
