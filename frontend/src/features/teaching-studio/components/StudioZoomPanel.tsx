import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createStudioScreenSection, deleteStudioScreenSection, listStudioScreenSections } from '../api/studioScreensApi';
import type { StudioScreen, StudioScreenSection } from '../types';

export type ZoomInsert = { kind: 'screen' | 'section'; targetId: number; title: string; summaryGroupId?: string; summaryOrder?: number };
export type StudioZoomMode = 'screen' | 'section' | 'summary';

interface Props { sessionId: number; screens: StudioScreen[]; currentScreenId: number; disabled?: boolean; onInsert: (items: ZoomInsert[]) => void; onCancel?: () => void; mode: StudioZoomMode }

const ScreenPreview = ({ screen, compact = false }: { screen: StudioScreen; compact?: boolean }) => <div className={`${compact ? 'h-24' : 'aspect-[16/9]'} overflow-hidden rounded-md border border-slate-300 bg-white p-2 shadow-sm`}><div className="h-1.5 w-2/3 rounded bg-blue-800"/><div className="mt-2 line-clamp-2 text-[9px] font-semibold leading-3 text-slate-700">{screen.title || `Screen ${screen.screen_number}`}</div><div className="mt-2 grid grid-cols-3 gap-1"><span className={`${compact ? 'h-3' : 'h-5'} rounded bg-blue-50`}/><span className={`${compact ? 'h-3' : 'h-5'} rounded bg-slate-100`}/><span className={`${compact ? 'h-3' : 'h-5'} rounded bg-cyan-50`}/></div><div className="mt-1 text-[8px] text-slate-400">{screen.elements.length} elements</div></div>;

export default function StudioZoomPanel({ sessionId, screens, currentScreenId, disabled, onInsert, onCancel, mode }: Props) {
  const [sections, setSections] = useState<StudioScreenSection[]>([]);
  const [name, setName] = useState('');
  const [sectionScreenIds, setSectionScreenIds] = useState<number[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<number | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const reload = useCallback(() => listStudioScreenSections(sessionId).then(setSections).catch(() => setSections([])), [sessionId]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (mode === 'summary' && sections.length && selectedSectionIds.length === 0) setSelectedSectionIds(sections.map((section) => section.id)); }, [mode, sections, selectedSectionIds.length]);
  const availableScreens = useMemo(() => screens.filter((screen) => screen.id !== currentScreenId), [currentScreenId, screens]);
  const screenById = useMemo(() => new Map(screens.map((screen) => [screen.id, screen])), [screens]);
  const selectedSections = sections.filter((section) => selectedSectionIds.includes(section.id));

  const createSection = async () => {
    if (!name.trim() || sectionScreenIds.length === 0) return toast.error('Enter a Section name and choose at least one Screen.');
    setBusy(true);
    try { await createStudioScreenSection(sessionId, { name: name.trim(), screen_ids: sectionScreenIds, display_order: sections.length }); setName(''); setSectionScreenIds([]); await reload(); toast.success('Section saved.'); }
    catch { toast.error('Unable to save this Section.'); } finally { setBusy(false); }
  };
  const insertSelected = () => {
    if (mode === 'screen') {
      const screen = screens.find((candidate) => candidate.id === selectedScreenId); if (!screen) return;
      onInsert([{ kind: 'screen', targetId: screen.id, title: screen.title || `Screen ${screen.screen_number}` }]);
    } else if (mode === 'section') {
      const section = selectedSections[0]; if (!section) return;
      onInsert([{ kind: 'section', targetId: section.id, title: section.name }]);
    } else {
      if (!selectedSections.length) return;
      const groupId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
      onInsert(selectedSections.map((section, index) => ({ kind: 'section', targetId: section.id, title: section.name, summaryGroupId: groupId, summaryOrder: index })));
    }
    onCancel?.();
  };
  const canInsert = mode === 'screen' ? selectedScreenId !== null : selectedSectionIds.length > 0;
  return <div className="flex h-full min-h-0 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3 pr-2">
      {mode === 'screen' ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{availableScreens.map((screen) => { const selected = selectedScreenId === screen.id; return <button key={screen.id} type="button" disabled={disabled} onClick={() => setSelectedScreenId(screen.id)} className={`relative rounded-lg border p-2 text-left transition ${selected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}><ScreenPreview screen={screen}/><span className="mt-2 block truncate text-xs font-semibold text-slate-800">{screen.screen_number}. {screen.title}</span>{selected ? <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-blue-700 text-white"><Check size={13}/></span> : null}</button>; })}</div> : <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{sections.map((section) => { const selected = selectedSectionIds.includes(section.id); const firstScreen = screenById.get(section.screens[0]?.screen_id); return <div key={section.id} className={`relative rounded-lg border p-2 transition ${selected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}><button type="button" disabled={disabled} onClick={() => setSelectedSectionIds((current) => mode === 'section' ? [section.id] : current.includes(section.id) ? current.filter((id) => id !== section.id) : [...current, section.id])} className="w-full text-left">{firstScreen ? <ScreenPreview screen={firstScreen} compact/> : <div className="h-24 rounded-md border border-dashed bg-slate-50"/>}<span className="mt-1.5 block truncate text-[11px] font-bold text-slate-800">{section.name}</span><span className="text-[9px] text-slate-500">{section.screens.length} Screens</span>{selected ? <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-blue-700 text-white"><Check size={13}/></span> : null}</button><button type="button" title="Delete Section" onClick={() => void deleteStudioScreenSection(section.id).then(reload).catch(() => toast.error('Section is used by a Zoom and cannot be deleted.'))} className="absolute bottom-2 right-2 rounded-md p-1 text-red-600 hover:bg-red-50"><Trash2 size={13}/></button></div>; })}</div>
        {sections.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No Sections yet. Create one from Section Zoom.</p> : null}
        {mode === 'section' ? <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><h3 className="text-xs font-bold text-slate-800">Create Section</h3><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: Reflection activities" className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs"/><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{screens.map((screen) => <label key={screen.id} className={`cursor-pointer rounded-md border p-1.5 ${sectionScreenIds.includes(screen.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}><ScreenPreview screen={screen} compact/><span className="mt-1 flex items-center gap-1 text-[9px] font-semibold"><input type="checkbox" checked={sectionScreenIds.includes(screen.id)} onChange={(event) => setSectionScreenIds((current) => event.target.checked ? [...current, screen.id] : current.filter((id) => id !== screen.id))}/>{screen.screen_number}. {screen.title}</span></label>)}</div><button type="button" disabled={busy || disabled} onClick={() => void createSection()} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-blue-700 bg-white px-3 py-1.5 text-xs font-bold text-blue-800 disabled:opacity-40"><Plus size={13}/>Save Section</button></div> : null}
      </>}
    </div>
    <div className="flex shrink-0 items-center justify-between border-t border-slate-200 pt-2"><span className="text-[10px] text-slate-500">{mode === 'screen' ? (selectedScreenId ? '1 Screen selected' : 'Select one Screen') : `${selectedSectionIds.length} Section${selectedSectionIds.length === 1 ? '' : 's'} selected`}</span><div className="flex gap-1.5"><button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700">Cancel</button><button type="button" disabled={disabled || !canInsert} onClick={insertSelected} className="rounded-md bg-blue-700 px-3.5 py-1 text-[11px] font-semibold text-white disabled:opacity-40">Insert</button></div></div>
  </div>;
}
