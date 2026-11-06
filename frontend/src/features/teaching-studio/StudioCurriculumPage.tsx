import { useEffect, useState } from 'react';
import { ArrowRight, Download, Eye, Plus, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiErrorDetails } from '@/lib/api';
import { emptyStudioSelection, hasCompleteHierarchy, selectionFromSearchParams, selectionPath } from './setup/selectionState';
import type { StudioSelection } from './setup/selectionState';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import type { CurriculumDocumentPreview, StudioDocumentRecord } from './api/studioDocumentsApi';
import StudioContextPicker from './components/StudioContextPicker';
import StudioShell from './components/StudioShell';
import { setupErrorMessage, studioSetupApi } from './api/studioSetupApi';
import type { CurriculumLevel } from './api/studioSetupApi';

const parentFor = (level: CurriculumLevel, selection: StudioSelection | null) => ({
  board: 1,
  program: selection?.boardId,
  grade: selection?.programId,
  subject: selection?.gradeId,
  chapter: selection?.subjectId,
  topic: selection?.chapterId,
  subtopic: selection?.topicId,
})[level] ?? null;

export default function StudioCurriculumPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [initialSelection] = useState(() => selectionFromSearchParams(searchParams));
  const [selection, setSelection] = useState<StudioSelection>(initialSelection);
  const [document, setDocument] = useState<StudioDocumentRecord | null>(null);
  const [preview, setPreview] = useState<CurriculumDocumentPreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pickerKey, setPickerKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [level, setLevel] = useState<CurriculumLevel>('board');
  const [childName, setChildName] = useState('');
  const [childCode, setChildCode] = useState('');
  const [childOrder, setChildOrder] = useState('1');
  useEffect(() => {
    setDocument(null); setMessage('');
    if (!selection?.chapterId) return;
    studioDocumentsApi.curriculumDocument(selection.chapterId).then(setDocument).catch((error) => {
      if (getApiErrorDetails(error).status !== 404) setMessage(getApiErrorDetails(error).message);
    });
  }, [selection?.chapterId]);
  const upload = async () => {
    if (!selection?.chapterId || !file) {
      toast.error('Choose a Curriculum document before uploading.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const replacing = Boolean(document);
      setDocument(await studioDocumentsApi.uploadCurriculumDocument(selection.chapterId, file, replacing));
      setFile(null);
      const response = replacing ? 'Curriculum document replaced successfully.' : 'Curriculum document uploaded successfully.';
      setMessage(response); toast.success(response);
    } catch (error) {
      const response = getApiErrorDetails(error).message;
      setMessage(response); toast.error(response);
    } finally { setBusy(false); }
  };
  const createChild = async () => {
    const parentId = parentFor(level, selection);
    if (!childName.trim() || (level !== 'board' && !parentId)) return;
    setBusy(true); setMessage('');
    try {
      await studioSetupApi.createHierarchyChild({ level, parentId, name: childName.trim(), code: childCode.trim(), order: Number(childOrder) || 1 });
      const response = `${level[0].toUpperCase()}${level.slice(1)} created successfully.`;
      setMessage(response); toast.success(response);
      setChildName(''); setChildCode(''); setPickerKey((key) => key + 1); setSelection(emptyStudioSelection());
    } catch (error) { const response = setupErrorMessage(error); setMessage(response); toast.error(response); } finally { setBusy(false); }
  };
  const downloadCurriculum = async () => {
    if (!selection?.chapterId) return;
    try { await studioDocumentsApi.downloadCurriculumDocument(selection.chapterId); toast.success('Original Curriculum document downloaded successfully.'); }
    catch (error) { toast.error(getApiErrorDetails(error).message); }
  };
  const viewCurriculum = async () => {
    if (!selection?.chapterId) return;
    setBusy(true);
    try { setPreview(await studioDocumentsApi.previewCurriculumDocument(selection.chapterId)); }
    catch (error) { toast.error(getApiErrorDetails(error).message); }
    finally { setBusy(false); }
  };
  return <StudioShell title="Curriculum" subtitle="Select the hierarchy and manage the one Curriculum document attached to its Chapter." actions={<button type="button" onClick={() => setShowCreate((open) => !open)} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={17} />{showCreate ? 'Close hierarchy form' : 'Create hierarchy entry'}</button>}>
    {showCreate && <section className="mb-5 rounded-xl border border-blue-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-900"><Plus size={19} /></span><div><h2 className="font-semibold">Create hierarchy entry</h2><p className="text-sm text-slate-600">Select the hierarchy level first, then create its child under the currently selected parent.</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-4"><label className="text-sm font-medium">Parent type<select value={level} onChange={(event) => setLevel(event.target.value as CurriculumLevel)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100"><option value="board">Board</option><option value="program">Program</option><option value="grade">Grade</option><option value="subject">Subject</option><option value="chapter">Chapter</option><option value="topic">Topic</option><option value="subtopic">Subtopic</option></select></label><label className="text-sm font-medium">Child name<input value={childName} onChange={(event) => setChildName(event.target.value)} placeholder={level === 'grade' ? 'e.g. Grade 10' : `New ${level} name`} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100" /></label><label className="text-sm font-medium">Code (where applicable)<input value={childCode} onChange={(event) => setChildCode(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100" /></label><label className="text-sm font-medium">Order / number<input type="number" min="1" value={childOrder} onChange={(event) => setChildOrder(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100" /></label></div>{level !== 'board' && !parentFor(level, selection) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Select the required parent in the hierarchy below before creating this {level}.</p>}<div className="mt-4 flex justify-end"><button type="button" disabled={busy || !childName.trim() || (level !== 'board' && !parentFor(level, selection))} onClick={createChild} className="rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Creating…' : 'Create child'}</button></div></section>}
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Curriculum hierarchy</h2><p className="mb-4 mt-1 text-sm text-slate-600">The hierarchy behavior follows Question Bank: every child is loaded from its selected parent.</p><StudioContextPicker key={pickerKey} includeSession={false} initialSelection={pickerKey === 0 ? initialSelection : undefined} onChange={setSelection} /></section>
    <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">Chapter Curriculum document</h2><p className="mt-1 text-sm text-slate-600">Topic and Subtopic are not used to locate this document.</p></div>{document && <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void viewCurriculum()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"><Eye size={16} />View</button><button type="button" onClick={() => void downloadCurriculum()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"><Download size={16} />Download original</button></div>}</div>
      {!selection?.chapterId ? <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Select through Chapter to view or upload its Curriculum document.</p> : <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2"><div className="min-w-0 rounded-lg bg-gray-50 p-4"><p className="text-sm font-semibold">Current document</p>{document ? <><p className="mt-2 break-all text-sm" title={document.original_file_name || undefined}>{document.original_file_name}</p><p className="text-xs text-slate-500">Revision {document.revision_no}</p></> : <p className="mt-2 text-sm text-slate-600">No Curriculum document is stored for this Chapter.</p>}</div><div className="min-w-0 rounded-lg border border-dashed border-gray-300 p-4"><p className="text-sm font-medium text-slate-700">Curriculum file</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-900 bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-200"><Upload size={17} /><span>{document ? 'Choose replacement file' : 'Choose file to upload'}</span><input key={`${selection.chapterId}-${document?.revision_no ?? 0}`} type="file" accept=".doc,.docx,.pdf" onChange={(event) => { setFile(event.target.files?.[0] || null); setMessage(''); }} className="sr-only" /></label><p className="mt-2 text-xs text-slate-500">Accepted formats: DOC, DOCX and PDF.</p>{file ? <p className="mt-2 break-all rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900">Selected: {file.name}</p> : <p className="mt-2 text-xs text-slate-500">No file selected.</p>}<button type="button" disabled={!file || busy} onClick={upload} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Upload size={16} />{busy ? 'Uploading…' : document ? 'Replace document' : 'Upload document'}</button></div></div>}
      {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}<div className="mt-5 flex flex-col items-end gap-2"><button type="button" disabled={!hasCompleteHierarchy(selection)} onClick={() => navigate(selectionPath('/studio/session-plans', selection, false))} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Next: Session Plan <ArrowRight size={17} /></button>{!hasCompleteHierarchy(selection) && <p className="text-xs text-slate-500">Complete Board through Subtopic to continue with the same Studio context.</p>}</div>
    </section>
    {preview && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Curriculum document preview"><section className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-gray-200 p-5"><div className="min-w-0"><h2 className="font-bold">Curriculum document</h2><p className="truncate text-sm text-slate-600" title={preview.file_name}>{preview.file_name} · Revision {preview.revision_no}</p></div><button type="button" onClick={() => setPreview(null)} className="rounded-lg border border-gray-300 p-2" aria-label="Close Curriculum preview"><X size={19} /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5"><pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-800">{preview.text || 'The document contains no extractable text.'}</pre></div></section></div>}
  </StudioShell>;
}

