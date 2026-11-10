import { useEffect, useState } from 'react';
import { Focus, Layers3, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createStudioScreenSection, deleteStudioScreenSection, listStudioScreenSections } from '../api/studioScreensApi';
import type { StudioScreen, StudioScreenSection } from '../types';

export type ZoomInsert = {
  kind: 'screen' | 'section';
  targetId: number;
  title: string;
  summaryGroupId?: string;
  summaryOrder?: number;
};

interface Props {
  sessionId: number;
  screens: StudioScreen[];
  currentScreenId: number;
  disabled?: boolean;
  onInsert: (items: ZoomInsert[]) => void;
}

export default function StudioZoomPanel({ sessionId, screens, currentScreenId, disabled, onInsert }: Props) {
  const [sections, setSections] = useState<StudioScreenSection[]>([]);
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const reload = () => listStudioScreenSections(sessionId).then(setSections).catch(() => setSections([]));
  useEffect(() => { void reload(); }, [sessionId]);

  const createSection = async () => {
    if (!name.trim() || selectedIds.length === 0) return toast.error('Enter a Section name and choose at least one Screen.');
    setBusy(true);
    try {
      await createStudioScreenSection(sessionId, { name: name.trim(), screen_ids: selectedIds, display_order: sections.length });
      setName(''); setSelectedIds([]); await reload(); toast.success('Section saved.');
    } catch { toast.error('Unable to save this Section.'); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4">
      <div><h2 className="font-semibold text-slate-900">Zoom navigation</h2><p className="mt-1 text-sm text-slate-500">Create non-linear Screen, Section and Summary Zoom links. Published playback returns to the Zoom origin without replacing branch state.</p></div>
      <div className="rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-bold text-slate-800">Screen (Slide) Zoom</h3>
        <p className="mt-1 text-xs text-slate-500">Open one specific Screen, then return to this Screen.</p>
        <div className="mt-2 grid gap-2">{screens.filter((screen) => screen.id !== currentScreenId).map((screen) => <button key={screen.id} type="button" disabled={disabled} onClick={() => onInsert([{ kind: 'screen', targetId: screen.id, title: screen.title || `Screen ${screen.screen_number}` }])} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-500 disabled:opacity-40"><Focus size={16} className="text-blue-700" />Screen {screen.screen_number}: {screen.title}</button>)}</div>
      </div>
      <div className="rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-bold text-slate-800">Create Section</h3>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: Reflection activities" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="mt-2 max-h-40 space-y-1 overflow-auto">{screens.map((screen) => <label key={screen.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedIds.includes(screen.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, screen.id] : current.filter((id) => id !== screen.id))} />Screen {screen.screen_number}: {screen.title}</label>)}</div>
        <button type="button" disabled={busy || disabled} onClick={() => void createSection()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"><Plus size={15} />Save Section</button>
      </div>
      <div className="rounded-xl border border-slate-200 p-3">
        <h3 className="text-sm font-bold text-slate-800">Section Zoom</h3>
        <p className="mt-1 text-xs text-slate-500">Open all Screens in one Section and return here when that Section finishes.</p>
        <div className="mt-2 grid gap-2">{sections.map((section) => <div key={section.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2"><button type="button" disabled={disabled} onClick={() => onInsert([{ kind: 'section', targetId: section.id, title: section.name }])} className="min-w-0 flex-1 text-left text-sm"><span className="font-semibold">{section.name}</span><span className="block text-xs text-slate-500">{section.screens.length} Screens</span></button><button type="button" title="Delete Section" onClick={() => void deleteStudioScreenSection(section.id).then(reload).catch(() => toast.error('Section is used by a Zoom and cannot be deleted.'))} className="rounded-md p-2 text-red-600"><Trash2 size={15} /></button></div>)}{sections.length === 0 ? <p className="text-sm text-slate-500">No Sections yet.</p> : null}</div>
      </div>
      <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
        <h3 className="text-sm font-bold text-slate-800">Summary Zoom</h3>
        <p className="mt-1 text-xs text-slate-600">Create an ordered menu of all Sections. The clicker enters each Section, returns to the menu and continues with the next Section.</p>
        {sections.length > 0 ? <button type="button" disabled={disabled} onClick={() => {
          const groupId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
          onInsert(sections.map((section, index) => ({ kind: 'section', targetId: section.id, title: section.name, summaryGroupId: groupId, summaryOrder: index })));
        }} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"><Layers3 size={15} />Insert Summary Zoom</button> : <p className="mt-2 text-sm text-slate-500">Create at least one Section first.</p>}
      </div>
    </div>
  );
}
