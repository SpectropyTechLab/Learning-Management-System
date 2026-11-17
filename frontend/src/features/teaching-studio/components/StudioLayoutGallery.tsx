import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { StudioLayoutSummary } from '../api/studioEditorApi';
import type { Layout } from '../layouts';
import { targetLayouts } from '../targetLayouts';
import StudioCustomLayoutForm from './StudioCustomLayoutForm';

interface Props {
  layouts: StudioLayoutSummary[];
  selectedLayoutId: number | null;
  applying: boolean;
  onApply: (row: StudioLayoutSummary, layout: Layout) => void;
  onLayoutsChanged: () => Promise<void>;
  onCancel: () => void;
  editRequest?: { layoutId: number; requestId: number } | null;
}

const LayoutThumbnail = ({ layout }: { layout: Layout }) => (
  <div className="relative aspect-video w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50">
    {layout.slots.map((slot) => (
      <div
        key={slot.id}
        title={slot.label}
        className={slot.region === 'header' ? 'absolute rounded-sm border border-blue-300 bg-blue-100' : slot.region === 'footer' ? 'absolute rounded-sm border border-slate-300 bg-slate-200' : 'absolute rounded-sm border border-teal-300 bg-teal-50'}
        style={{ left: `${slot.bounds.x / 19.2}%`, top: `${slot.bounds.y / 10.8}%`, width: `${slot.bounds.width / 19.2}%`, height: `${slot.bounds.height / 10.8}%` }}
      />
    ))}
  </div>
);

const customLayout = (row: StudioLayoutSummary): Layout => ({
  id: row.layout_key,
  name: row.name,
  purpose: row.description || 'Custom Studio layout',
  catalog: 'pilot',
  slots: row.layout_data_json?.slots || [],
});

export default function StudioLayoutGallery({ layouts, selectedLayoutId, applying, onApply, onLayoutsChanged, onCancel, editRequest }: Props) {
  const defaultRows = useMemo(() => new Map(layouts.filter((row) => row.is_default).map((row) => [row.layout_key.toUpperCase(), row])), [layouts]);
  const visibleCustomRows = useMemo(() => {
    const defaults = [...defaultRows.keys()];
    const groups = new Map<string, StudioLayoutSummary>();
    layouts.filter((row) => !row.is_default).forEach((row) => {
      const key = defaults.find((candidate) => row.layout_key.toUpperCase().startsWith(`${candidate}-CUSTOM`)) ?? row.layout_key.toUpperCase();
      const current = groups.get(key);
      if (!current || row.version_no > current.version_no || (row.version_no === current.version_no && row.id > current.id)) groups.set(key, row);
    });
    return [...groups.values()];
  }, [defaultRows, layouts]);
  const initialValue = (() => {
    const selected = layouts.find((row) => row.id === selectedLayoutId);
    if (selected?.is_default) return `default:${selected.layout_key.toUpperCase()}`;
    if (selected) return `custom:${selected.id}`;
    return `default:${targetLayouts[0]?.id ?? ''}`;
  })();
  const [selection, setSelection] = useState(initialValue);
  const [formLayout, setFormLayout] = useState<StudioLayoutSummary | null | undefined>(undefined);
  const selectedDefaultKey = selection.startsWith('default:') ? selection.slice(8) : null;
  const selectedCustomId = selection.startsWith('custom:') ? Number(selection.slice(7)) : null;
  const activeDefaultLayout = selectedDefaultKey ? targetLayouts.find((layout) => layout.id.toUpperCase() === selectedDefaultKey) : undefined;
  const activeDefaultRow = activeDefaultLayout ? defaultRows.get(activeDefaultLayout.id.toUpperCase()) : undefined;
  const activeCustomRow = selectedCustomId ? visibleCustomRows.find((row) => row.id === selectedCustomId) : undefined;
  const activeRow = activeCustomRow ?? activeDefaultRow;
  const activeLayout = activeCustomRow ? customLayout(activeCustomRow) : activeDefaultLayout;
  const alreadyApplied = Boolean(activeRow && activeRow.id === selectedLayoutId);

  useEffect(() => {
    if (!editRequest) return;
    const requested = layouts.find((row) => row.id === editRequest.layoutId);
    if (!requested) return;
    setSelection(requested.is_default ? `default:${requested.layout_key.toUpperCase()}` : `custom:${requested.id}`);
    if (!requested.is_default) setFormLayout(requested);
  }, [editRequest, layouts]);

  if (formLayout !== undefined) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <StudioCustomLayoutForm
          key={formLayout?.id ?? 'new'}
          layout={formLayout}
          onCancel={() => setFormLayout(undefined)}
          onSaved={async (saved) => {
            await onLayoutsChanged();
            setSelection(`custom:${saved.id}`);
            setFormLayout(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Default layouts ({targetLayouts.length})</h3>
          <span className="text-xs text-slate-500">Select a visual layout, then choose Apply.</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {targetLayouts.map((layout) => {
            const row = defaultRows.get(layout.id.toUpperCase());
            const value = `default:${layout.id}`;
            const selected = selection === value;
            return <button key={layout.id} type="button" onClick={() => setSelection(value)} aria-pressed={selected} className={`min-w-0 rounded-lg border p-2 text-left transition ${selected ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40'}`}><LayoutThumbnail layout={layout} /><div className="mt-2 flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-bold text-blue-800">{layout.id}</p><p className="truncate text-xs font-semibold text-slate-900">{layout.name}</p></div>{row ? <span className="text-[10px] text-slate-500">v{row.version_no}</span> : null}</div></button>;
          })}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-bold text-slate-900">Custom layouts ({visibleCustomRows.length})</h3>
          <button type="button" onClick={() => setFormLayout(null)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:underline"><Plus size={14} />Create custom layout</button>
        </div>
        {visibleCustomRows.length > 0 ? <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visibleCustomRows.map((row) => {
            const layout = customLayout(row);
            const value = `custom:${row.id}`;
            const selected = selection === value;
            return <button key={row.id} type="button" onClick={() => setSelection(value)} aria-pressed={selected} className={`min-w-0 rounded-lg border p-2 text-left transition ${selected ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40'}`}><LayoutThumbnail layout={layout} /><div className="mt-2 flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[10px] font-bold text-blue-800">{row.layout_key}</p><p className="truncate text-xs font-semibold text-slate-900">{row.name}</p></div><span className="text-[10px] text-slate-500">v{row.version_no}</span></div></button>;
          })}
        </div> : <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">No custom layouts yet.</p>}
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-2.5">
        <span className="text-xs text-slate-500">{activeCustomRow ? 'Custom layout selected' : `Choose from all ${targetLayouts.length} default layouts`}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={!activeCustomRow} onClick={() => activeCustomRow && setFormLayout(activeCustomRow)} className="rounded-lg border border-blue-800 px-4 py-2 text-sm font-semibold text-blue-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">Revise</button>
          <button type="button" disabled={!activeRow || !activeLayout || alreadyApplied || applying} onClick={() => activeRow && activeLayout && onApply(activeRow, activeLayout)} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{applying ? 'Applying...' : alreadyApplied ? 'Applied' : 'Apply'}</button>
        </div>
      </footer>
    </div>
  );
}
