import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { StudioLayoutSummary } from '../api/studioEditorApi';
import { targetLayouts } from '../targetLayouts';
import type { Layout } from '../layouts';
import StudioCustomLayoutForm from './StudioCustomLayoutForm';

interface Props {
  layouts: StudioLayoutSummary[];
  selectedLayoutId: number | null;
  applying: boolean;
  onApply: (row: StudioLayoutSummary, layout: Layout) => void;
  onLayoutsChanged: () => Promise<void>;
  editRequest?: { layoutId: number; requestId: number } | null;
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

const customLayout = (row: StudioLayoutSummary): Layout => ({
  id: row.layout_key,
  name: row.name,
  purpose: row.description || 'Custom Studio layout',
  catalog: 'pilot',
  slots: row.layout_data_json?.slots || [],
});

export default function StudioLayoutGallery({ layouts, selectedLayoutId, applying, onApply, onLayoutsChanged, editRequest }: Props) {
  const byKey = new Map(layouts.map((row) => [row.layout_key.toUpperCase(), row]));
  const customRows = layouts.filter((row) => !row.is_default);
  const defaultKeys = layouts.filter((row) => row.is_default).map((row) => row.layout_key.toUpperCase());
  const derivedBaseKey = (row: StudioLayoutSummary) => defaultKeys.find((key) => row.layout_key.toUpperCase().startsWith(`${key}-CUSTOM`)) ?? null;
  const visibleCustomRows = [...customRows.reduce((groups, row) => {
    const groupKey = derivedBaseKey(row) ?? row.layout_key.toUpperCase();
    const current = groups.get(groupKey);
    if (!current || row.version_no > current.version_no || (row.version_no === current.version_no && row.id > current.id)) groups.set(groupKey, row);
    return groups;
  }, new Map<string, StudioLayoutSummary>()).values()];
  const [formLayout, setFormLayout] = useState<StudioLayoutSummary | null | undefined>(undefined);
  const selectedDefaultKey = layouts.find((row) => row.id === selectedLayoutId && row.is_default)?.layout_key.toUpperCase();
  const [defaultLayoutKey, setDefaultLayoutKey] = useState(selectedDefaultKey || targetLayouts[0]?.id || '');
  const selectedCustomRow = visibleCustomRows.find((row) => row.id === selectedLayoutId);
  const [customLayoutId, setCustomLayoutId] = useState<number | null>(selectedCustomRow?.id ?? visibleCustomRows[0]?.id ?? null);
  const activeDefaultLayout = targetLayouts.find((layout) => layout.id === defaultLayoutKey) || targetLayouts[0];
  const activeDefaultRow = activeDefaultLayout ? byKey.get(activeDefaultLayout.id) : undefined;
  const activeCustomRow = visibleCustomRows.find((row) => row.id === customLayoutId) ?? visibleCustomRows[0];
  useEffect(() => {
    if (selectedDefaultKey) setDefaultLayoutKey(selectedDefaultKey);
  }, [selectedDefaultKey]);
  useEffect(() => {
    if (selectedCustomRow) setCustomLayoutId(selectedCustomRow.id);
    else if (!visibleCustomRows.some((row) => row.id === customLayoutId)) setCustomLayoutId(visibleCustomRows[0]?.id ?? null);
  }, [customLayoutId, selectedCustomRow, visibleCustomRows]);
  useEffect(() => {
    if (!editRequest) return;
    const requested = layouts.find((row) => row.id === editRequest.layoutId);
    if (!requested) return;
    if (!requested.is_default) {
      setFormLayout(requested);
      return;
    }
    const prefix = `${requested.layout_key.toUpperCase()}-CUSTOM`;
    const existingCopy = customRows
      .filter((row) => row.layout_key.toUpperCase().startsWith(prefix))
      .sort((left, right) => right.version_no - left.version_no || right.id - left.id)[0];
    setFormLayout(existingCopy ?? requested);
  }, [editRequest, layouts]);
  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-slate-700">Default layout
          <select value={defaultLayoutKey} onChange={(event) => setDefaultLayoutKey(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900">
            {targetLayouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.id} · {layout.name}</option>)}
          </select>
        </label>
        {activeDefaultLayout && (() => {
          const selected = Boolean(activeDefaultRow && selectedLayoutId === activeDefaultRow.id);
          return <article className={`mt-3 rounded-xl border p-3 ${selected ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'}`}>
            <LayoutThumbnail layout={activeDefaultLayout} />
            <div className="mt-3 flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-bold text-blue-800">{activeDefaultLayout.id}</p><h3 className="truncate text-sm font-semibold text-slate-900">{activeDefaultLayout.name}</h3></div>{activeDefaultRow ? <span className="shrink-0 text-xs text-slate-500">v{activeDefaultRow.version_no}</span> : null}</div>
            <p className="mt-1 text-xs text-slate-600">{activeDefaultLayout.purpose}</p>
            <button type="button" disabled={!activeDefaultRow || selected || applying} onClick={() => activeDefaultRow && onApply(activeDefaultRow, activeDefaultLayout)} className="mt-3 w-full rounded-lg border border-blue-800 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-900 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">{selected ? 'Applied' : activeDefaultRow ? (applying ? 'Applying...' : 'Apply layout') : 'Not provisioned'}</button>
          </article>;
        })()}
      </div>
      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-semibold text-slate-900">Custom layouts</h2><p className="text-sm text-slate-500">Create reusable slot geometry or revise an existing custom layout. Default LYT templates are protected.</p></div>
          <button type="button" onClick={() => setFormLayout(null)} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white"><Plus size={16} />Create custom layout</button>
        </div>
        {formLayout !== undefined && <StudioCustomLayoutForm key={formLayout?.id ?? 'new'} layout={formLayout} onCancel={() => setFormLayout(undefined)} onSaved={async () => { await onLayoutsChanged(); setFormLayout(undefined); }} />}
        {formLayout === undefined && (visibleCustomRows.length > 0 && activeCustomRow ? <div>
          <label className="block text-sm font-semibold text-slate-700">Custom layout
            <select value={activeCustomRow.id} onChange={(event) => setCustomLayoutId(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900">
              {visibleCustomRows.map((row) => <option key={row.id} value={row.id}>{row.layout_key} · {row.name} · v{row.version_no}</option>)}
            </select>
          </label>
          {(() => {
            const row = activeCustomRow;
            const layout = customLayout(row);
            const selected = selectedLayoutId === row.id;
            return <article key={row.id} className={`mt-3 rounded-xl border p-3 ${selected ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <LayoutThumbnail layout={layout} />
              <div className="mt-3 flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-bold text-blue-800">{row.layout_key}</p><h3 className="truncate text-sm font-semibold text-slate-900">{row.name}</h3></div><span className="shrink-0 text-xs text-slate-500">v{row.version_no}</span></div>
              <p className="mt-1 line-clamp-2 min-h-10 text-xs text-slate-600">{row.description || 'Custom Studio layout'}</p>
              <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={selected || applying} onClick={() => onApply(row, layout)} className="rounded-lg border border-blue-800 px-2 py-2 text-xs font-semibold text-blue-900 disabled:border-slate-300 disabled:text-slate-400">{selected ? 'Applied' : applying ? 'Applying...' : 'Apply'}</button><button type="button" onClick={() => setFormLayout(row)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700"><Pencil size={14} />Revise</button></div>
            </article>;
          })()}
        </div> : <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No custom layouts yet.</p>)}
      </div>
    </>
  );
}
