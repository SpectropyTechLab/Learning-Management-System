import { useEffect, useState } from 'react';
import { ArrowRight, Download, Eye, FileUp, Keyboard, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import { SESSION_PLAN_FIELDS, studioDocumentsApi } from './api/studioDocumentsApi';
import type { SessionPlanRow, StudioDocumentRecord } from './api/studioDocumentsApi';
import type { StudioSelection } from './setup/selectionState';
import StudioContextPicker from './components/StudioContextPicker';
import StudioShell from './components/StudioShell';

const blankRow = (): SessionPlanRow => Object.fromEntries(SESSION_PLAN_FIELDS.map(([key]) => [key, ''])) as SessionPlanRow;

export default function StudioSessionPlanPage() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState<StudioSelection | null>(null);
  const [document, setDocument] = useState<StudioDocumentRecord | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [rows, setRows] = useState<SessionPlanRow[]>([]);
  const [sourceMode, setSourceMode] = useState<'upload' | 'manual' | null>(null);
  const [panel, setPanel] = useState<'view' | 'edit' | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDocument(null); setRows([]); setSourceMode(null); setPanel(null); setMessage('');
    if (!selection?.sessionId) return;
    studioDocumentsApi.sessionPlan(selection.sessionId).then((current) => {
      setDocument(current);
      if (current?.structured_content?.rows) { setRows(current.structured_content.rows); setSourceMode(current.source_mode); }
    }).catch((error) => { if (getApiErrorDetails(error).status !== 404) setMessage(getApiErrorDetails(error).message); });
  }, [selection?.sessionId]);

  const preview = async (file: File) => {
    setBusy(true); setMessage(''); setSourceFile(file);
    try { const result = await studioDocumentsApi.previewSessionPlan(file); setRows(result.rows); setWarnings(result.warnings); setSourceMode('upload'); toast.success('Session Plan extracted successfully. Review it before saving.'); }
    catch (error) { const response = getApiErrorDetails(error).message; setMessage(response); toast.error(response); setSourceFile(null); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!selection?.sessionId || rows.length === 0) return;
    setBusy(true); setMessage('');
    try {
      const saved = sourceMode === 'upload' && sourceFile
        ? await studioDocumentsApi.importSessionPlan(selection.sessionId, sourceFile, rows)
        : await studioDocumentsApi.saveManualSessionPlan(selection.sessionId, rows);
      const response = 'Session Plan saved successfully as a new revision.';
      setDocument(saved); setMessage(response); toast.success(response); setPanel('view');
    } catch (error) { const response = getApiErrorDetails(error).message; setMessage(response); toast.error(response); } finally { setBusy(false); }
  };
  const downloadPlan = async () => {
    if (!selection?.sessionId) return;
    try { await studioDocumentsApi.downloadSessionPlan(selection.sessionId); toast.success('Original Session Plan downloaded successfully.'); }
    catch (error) { toast.error(getApiErrorDetails(error).message); }
  };
  const update = (index: number, key: keyof SessionPlanRow, value: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));

  return <StudioShell title="Session Plan" subtitle="View the saved plan, or add and replace it through upload or manual entry.">
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><StudioContextPicker onChange={setSelection} /><div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"><p className="text-sm text-slate-600">Need a new Session under the selected Subtopic?</p><button type="button" onClick={() => navigate('/content-authorizer/studio/session-setup')} className="text-sm font-semibold text-blue-900 hover:text-blue-700">Create Studio Session</button></div></section>
    {selection?.sessionId && <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Session Plan</h2><p className="text-sm text-slate-600">{document ? `${document.original_file_name || 'Manual plan'} · Revision ${document.revision_no}` : 'No Session Plan exists for this Session.'}</p></div><div className="flex gap-2"><button type="button" disabled={!document} onClick={() => setPanel('view')} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 disabled:opacity-40"><Eye size={16} />View Plan</button><button type="button" onClick={() => { setPanel('edit'); if (!document) { setRows([]); setSourceMode(null); } }} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">{document ? 'Add / Replace Plan' : 'Add Session Plan'}</button></div></div></section>}
    {panel === 'view' && document && <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Saved Session Plan</h2><p className="text-sm text-slate-600">Read-only view · Revision {document.revision_no}</p></div>{document.original_file_name && <button type="button" onClick={() => void downloadPlan()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm"><Download size={15} />Original file</button>}</div><div className="mt-4 space-y-4">{rows.map((row, index) => <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4"><p className="mb-3 text-sm font-semibold text-blue-900">Screen row {index + 1}</p><dl className="grid gap-3 md:grid-cols-2">{SESSION_PLAN_FIELDS.map(([key, label]) => <div key={key}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{row[key] || '—'}</dd></div>)}</dl></div>)}</div></section>}
    {panel === 'edit' && <><section className="mt-5 grid gap-4 md:grid-cols-2"><label className={`cursor-pointer rounded-xl border p-5 shadow-sm ${sourceMode === 'upload' ? 'border-blue-900 bg-blue-50' : 'border-gray-200 bg-white'}`}><FileUp className="text-blue-900" /><h3 className="mt-3 font-semibold">Upload Session Plan</h3><p className="mt-1 text-sm text-slate-600">Extract the DOCX, review its rows, then save the original and corrections.</p><input type="file" accept=".docx" className="mt-4 block w-full text-sm" onChange={(event) => event.target.files?.[0] && preview(event.target.files[0])} /></label><button type="button" onClick={() => { setSourceMode('manual'); setSourceFile(null); setWarnings([]); setRows(rows.length ? rows : [blankRow()]); }} className={`rounded-xl border p-5 text-left shadow-sm ${sourceMode === 'manual' ? 'border-blue-900 bg-blue-50' : 'border-gray-200 bg-white'}`}><Keyboard className="text-blue-900" /><h3 className="mt-3 font-semibold">Create Manually</h3><p className="mt-1 text-sm text-slate-600">Enter the structured plan without uploading a document.</p></button></section>{rows.length > 0 && <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">Editable Session Plan</h2><div className="flex gap-2"><button type="button" onClick={() => setRows((current) => [...current, blankRow()])} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Plus size={15} />Row</button><button type="button" disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"><Save size={15} />{busy ? 'Saving…' : 'Save'}</button></div></div>{warnings.map((warning) => <p key={warning} className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">{warning}</p>)}<div className="mt-4 space-y-4">{rows.map((row, index) => <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4"><div className="mb-3 flex justify-between"><strong className="text-sm">Screen row {index + 1}</strong><button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="text-red-600"><Trash2 size={16} /></button></div><div className="grid gap-3 md:grid-cols-2">{SESSION_PLAN_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}<textarea rows={key === 'narration_dialogue_cue' ? 4 : 2} value={row[key]} onChange={(event) => update(index, key, event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm" /></label>)}</div></div>)}</div></section>}</>}
    {!selection?.sessionId && <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Select a Studio Session to view or add its Session Plan.</p>}
    {message && <p className="mt-4 rounded-lg border border-gray-200 bg-white p-3 text-sm">{message}</p>}
    {selection?.sessionId && <div className="mt-5 flex justify-end"><button type="button" onClick={() => navigate('/content-authorizer/studio/screen-scripts')} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 font-semibold text-white">Next: Screen Scripts <ArrowRight size={17} /></button></div>}
  </StudioShell>;
}
