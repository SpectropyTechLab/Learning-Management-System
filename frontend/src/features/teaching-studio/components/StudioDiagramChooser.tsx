import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import StudioDiagramThumbnail from './StudioDiagramThumbnail';
import { SMART_DIAGRAM_LAYOUTS, type SmartDiagramCategory } from './smartDiagramModel';

const categories: Array<{ id: SmartDiagramCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'list', label: 'List' }, { id: 'process', label: 'Process' },
  { id: 'cycle', label: 'Cycle' }, { id: 'hierarchy', label: 'Hierarchy' },
  { id: 'relationship', label: 'Relationship' }, { id: 'matrix', label: 'Matrix' },
  { id: 'pyramid', label: 'Pyramid' }, { id: 'picture', label: 'Picture' },
  { id: 'timeline', label: 'Timeline' }, { id: 'comparison', label: 'Comparison' },
  { id: 'cause-effect', label: 'Cause & effect' }, { id: 'funnel', label: 'Funnel' },
];

export default function StudioDiagramChooser({ onInsert, onClose }: { onInsert: (layoutId: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState<SmartDiagramCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState('basic-process');
  const layouts = useMemo(() => category === 'all' ? SMART_DIAGRAM_LAYOUTS : SMART_DIAGRAM_LAYOUTS.filter((layout) => layout.category === category), [category]);
  const selected = SMART_DIAGRAM_LAYOUTS.find((layout) => layout.id === selectedId) ?? layouts[0];
  return <div className="fixed inset-0 z-[320] grid place-items-center bg-slate-950/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Choose a Diagram">
    <section className="flex h-[min(780px,90vh)] w-[min(1180px,94vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <aside className="w-48 shrink-0 overflow-y-auto border-r bg-slate-50 p-3"><h2 className="mb-3 px-2 text-sm font-bold text-slate-900">Diagram types</h2>{categories.map((item) => <button key={item.id} type="button" onClick={() => { setCategory(item.id); const first = item.id === 'all' ? SMART_DIAGRAM_LAYOUTS[0] : SMART_DIAGRAM_LAYOUTS.find((layout) => layout.category === item.id); if (first) setSelectedId(first.id); }} className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${category === item.id ? 'bg-blue-900 text-white' : 'text-slate-700 hover:bg-blue-50'}`}>{item.label}</button>)}</aside>
      <main className="min-w-0 flex-1 overflow-y-auto p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold">Choose a Diagram</h2><p className="text-xs text-slate-500">Select a structured layout. You can change it later without losing its text.</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border hover:bg-slate-50" aria-label="Close"><X size={17}/></button></div><div className="grid grid-cols-3 gap-3 xl:grid-cols-4">{layouts.map((layout) => <button key={layout.id} type="button" onClick={() => setSelectedId(layout.id)} onDoubleClick={() => onInsert(layout.id)} className={`overflow-hidden rounded-xl border text-left ${selected?.id === layout.id ? 'border-blue-700 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-400'}`}><span className="block h-28 bg-slate-50 p-1"><StudioDiagramThumbnail layout={layout}/></span><span className="block border-t px-2 py-2 text-xs font-semibold">{layout.name}</span></button>)}</div></main>
      <aside className="w-64 shrink-0 border-l bg-slate-50 p-4"><h3 className="text-sm font-bold">{selected?.name}</h3><div className="mt-3 h-40 rounded-xl border bg-white p-2">{selected ? <StudioDiagramThumbnail layout={selected}/> : null}</div><p className="mt-3 text-xs leading-5 text-slate-600">{selected?.description}</p><button type="button" disabled={!selected} onClick={() => selected && onInsert(selected.id)} className="mt-5 w-full rounded-lg bg-blue-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40">Insert diagram</button><p className="mt-2 text-[10px] text-slate-500">Double-clicking a layout also inserts it.</p></aside>
    </section>
  </div>;
}
