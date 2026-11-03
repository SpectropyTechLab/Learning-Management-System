import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Download, FileUp, Keyboard, Plus, Save } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import { SCREEN_SCRIPT_FIELDS, studioDocumentsApi } from './api/studioDocumentsApi';
import type { ScreenScriptContent, ScreenScriptPreviewItem, ScreenScriptRow } from './api/studioDocumentsApi';
import { createBlankStudioScreen } from './api/studioScreensApi';
import { selectionFromSearchParams, selectionPath } from './setup/selectionState';
import type { StudioSelection } from './setup/selectionState';
import StudioContextPicker from './components/StudioContextPicker';
import StudioShell from './components/StudioShell';

const blankScript = (): ScreenScriptContent => Object.fromEntries(SCREEN_SCRIPT_FIELDS.map(([key]) => [key, ''])) as ScreenScriptContent;

export default function StudioScreenScriptsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [initialSelection] = useState(() => selectionFromSearchParams(searchParams));
  const [selection, setSelection] = useState<StudioSelection>(initialSelection);
  const [scripts, setScripts] = useState<ScreenScriptRow[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<number | null>(null);
  const [content, setContent] = useState<ScreenScriptContent>(blankScript());
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ScreenScriptPreviewItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [mode, setMode] = useState<'upload' | 'manual' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddScreen, setShowAddScreen] = useState(false);
  const [newScreenTitle, setNewScreenTitle] = useState('');
  const load = async (sessionId: number, preferredId?: number) => {
    const rows = await studioDocumentsApi.screenScripts(sessionId); setScripts(rows);
    if (preferredId) setSelectedScreenId(preferredId);
  };
  useEffect(() => { setScripts([]); setPreview([]); setSelectedScreenId(null); setMode(null); setMessage(''); setShowAddScreen(false); setNewScreenTitle(''); if (selection?.sessionId) load(selection.sessionId).catch((error) => setMessage(getApiErrorDetails(error).message)); }, [selection?.sessionId]);
  const selected = useMemo(() => scripts.find((script) => script.screen_id === selectedScreenId), [scripts, selectedScreenId]);
  useEffect(() => { setContent(selected?.content_json || blankScript()); }, [selected]);

  const chooseManual = async () => {
    if (!selection?.sessionId) return;
    setMode('manual'); setPreview([]); setSourceFile(null); setBusy(true); setMessage('');
    try {
      if (scripts.length === 0) {
        const created = await createBlankStudioScreen(selection.sessionId, 'Screen 1');
        await load(selection.sessionId, created.id);
        toast.success('The first Screen was created successfully.');
      } else setSelectedScreenId(scripts[0].screen_id);
    } catch (error) { const response = getApiErrorDetails(error).message; setMessage(response); toast.error(response); } finally { setBusy(false); }
  };
  const addScreen = async () => {
    if (!selection?.sessionId || !newScreenTitle.trim()) {
      toast.error('Enter a Screen title before adding it.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const title = newScreenTitle.trim();
      const created = await createBlankStudioScreen(selection.sessionId, title);
      await load(selection.sessionId, created.id);
      setNewScreenTitle(''); setShowAddScreen(false);
      const response = `Screen “${title}” added successfully.`;
      setMessage(response); toast.success(response);
    } catch (error) { const response = getApiErrorDetails(error).message; setMessage(response); toast.error(response); } finally { setBusy(false); }
  };
  const parse = async (file: File) => {
    if (!selection?.sessionId) return;
    setBusy(true); setSourceFile(file); setMode('upload'); setMessage('');
    try { const result = await studioDocumentsApi.previewScreenScripts(selection.sessionId, file); setPreview(result.scripts); setWarnings(result.warnings); toast.success(`${result.scripts.length} Screen Script${result.scripts.length === 1 ? '' : 's'} extracted successfully.`); }
    catch (error) { const response = getApiErrorDetails(error).message; setMessage(response); toast.error(response); setSourceFile(null); } finally { setBusy(false); }
  };
  const importAll = async () => {
    if (!selection?.sessionId || !sourceFile || preview.length === 0) return;
    setBusy(true); setMessage('');
    try {
      const mapped = [...preview];
      for (let index = 0; index < mapped.length; index += 1) {
        if (!mapped[index].suggested_screen_id) {
          const created = await createBlankStudioScreen(selection.sessionId, mapped[index].title || `Screen ${mapped[index].screen_number}`);
          mapped[index] = { ...mapped[index], suggested_screen_id: created.id, suggested_screen_title: created.title, mapping_status: 'matched' };
        }
      }
      await studioDocumentsApi.importScreenScripts(selection.sessionId, sourceFile, mapped);
      const response = 'Screen Scripts imported successfully.';
      setPreview([]); setMessage(response); toast.success(response); await load(selection.sessionId);
    } catch (error) { const response = getApiErrorDetails(error).message; setMessage(response); toast.error(response); } finally { setBusy(false); }
  };
  const saveManual = async () => {
    if (!selection?.sessionId || !selectedScreenId) return;
    setBusy(true); setMessage('');
    try { await studioDocumentsApi.saveScreenScript(selection.sessionId, selectedScreenId, content); const response = 'Screen Script saved successfully as a new revision.'; setMessage(response); toast.success(response); await load(selection.sessionId, selectedScreenId); }
    catch (error) { const response = getApiErrorDetails(error).message; setMessage(response); toast.error(response); } finally { setBusy(false); }
  };
  const downloadOriginal = async () => {
    if (!selection?.sessionId) return;
    try { await studioDocumentsApi.downloadScreenScriptSource(selection.sessionId); toast.success('Original Screen Script downloaded successfully.'); }
    catch (error) { toast.error(getApiErrorDetails(error).message); }
  };

  return <StudioShell title="Screen Scripts" subtitle="Upload a complete production script, or create one Screen Script at a time.">
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><StudioContextPicker initialSelection={initialSelection} onChange={setSelection} /></section>
    {!selection?.sessionId && <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Select a Studio Session to choose an upload or manual workflow.</p>}
    {selection?.sessionId && <section className="mt-5 grid gap-4 md:grid-cols-2"><label className={`cursor-pointer rounded-xl border p-5 shadow-sm ${mode === 'upload' ? 'border-blue-900 bg-blue-50' : 'border-gray-200 bg-white'}`}><FileUp className="text-blue-900" /><h3 className="mt-3 font-semibold">Upload complete Screen Script</h3><p className="mt-1 text-sm text-slate-600">Extract every script, review its Screen mapping, then confirm the import.</p><input type="file" accept=".docx" className="mt-4 block w-full text-sm" onChange={(event) => event.target.files?.[0] && parse(event.target.files[0])} /></label><button type="button" onClick={chooseManual} className={`rounded-xl border p-5 text-left shadow-sm ${mode === 'manual' ? 'border-blue-900 bg-blue-50' : 'border-gray-200 bg-white'}`}><Keyboard className="text-blue-900" /><h3 className="mt-3 font-semibold">Create manually per Screen</h3><p className="mt-1 text-sm text-slate-600">Open one Screen only. Add another Screen when it is actually required.</p></button></section>}
    {mode === 'upload' && preview.length > 0 && <section className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Import mapping preview</h2><p className="text-sm text-slate-600">Missing destination Screens will be created when you confirm.</p></div><button type="button" disabled={busy} onClick={importAll} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Importing…' : 'Confirm import'}</button></div>{warnings.map((warning) => <p key={warning} className="mt-3 text-sm text-amber-800">{warning}</p>)}<div className="mt-4 space-y-2">{preview.map((item, index) => <div key={`${item.screen_key}-${index}`} className="grid items-center gap-3 rounded-lg bg-white p-3 md:grid-cols-[1fr_1fr]"><div><strong>{item.screen_key} · {item.title}</strong><p className="text-xs text-slate-500">Detected Screen {item.screen_number}</p></div><select value={item.suggested_screen_id ?? ''} onChange={(event) => setPreview((current) => current.map((script, itemIndex) => itemIndex === index ? { ...script, suggested_screen_id: event.target.value ? Number(event.target.value) : null } : script))} className="rounded-lg border border-gray-300 px-3 py-2"><option value="">Create a new Screen on import</option>{scripts.map((screen) => <option key={screen.screen_id} value={screen.screen_id}>Screen {screen.screen_number}: {screen.title}</option>)}</select></div>)}</div></section>}
    {mode === 'manual' && selected && <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><label className="text-xs font-semibold uppercase text-slate-500">Current Screen<select value={selectedScreenId ?? ''} onChange={(event) => setSelectedScreenId(Number(event.target.value))} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal text-slate-800">{scripts.map((screen) => <option key={screen.screen_id} value={screen.screen_id}>Screen {screen.screen_number}: {screen.title}</option>)}</select></label></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => setShowAddScreen(true)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"><Plus size={15} />Add Screen</button><button type="button" disabled={busy} onClick={saveManual} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"><Save size={15} />Save Screen</button></div></div>{showAddScreen && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4"><label className="block text-sm font-semibold text-slate-700">New Screen title<input autoFocus value={newScreenTitle} onChange={(event) => setNewScreenTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addScreen(); }} placeholder="e.g. Mirror ray introduction" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm" /></label><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setShowAddScreen(false); setNewScreenTitle(''); }} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" disabled={busy || !newScreenTitle.trim()} onClick={addScreen} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Adding…' : 'Add Screen'}</button></div></div>}<h2 className="mt-5 font-semibold">Screen {selected.screen_number}: {selected.title}</h2><div className="mt-4 space-y-4">{SCREEN_SCRIPT_FIELDS.map(([key, label]) => <label key={key} className="block text-sm font-semibold text-slate-700">{label}<textarea rows={key === 'teacher_narration' ? 7 : 4} value={content[key] || ''} onChange={(event) => setContent((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm" /></label>)}</div></section>}
    {message && <p className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-sm">{message}</p>}
    {selection.sessionId && <div className="mt-5 flex items-end justify-between gap-4"><button type="button" onClick={() => void downloadOriginal()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"><Download size={15} />Original source</button><div className="flex flex-col items-end gap-2"><button type="button" disabled={!scripts.some((script) => script.script_revision_id)} onClick={() => navigate(selectionPath(`/studio/editor/${selection.sessionId}`, selection))} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Next: Screen Editor <ArrowRight size={17} /></button>{!scripts.some((script) => script.script_revision_id) && <p className="text-xs text-slate-500">Save or import at least one Screen Script before opening the Editor.</p>}</div></div>}
  </StudioShell>;
}
