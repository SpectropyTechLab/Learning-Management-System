import { useEffect, useState } from 'react';
import { ArrowRight, Download, Plus, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getApiErrorDetails } from '@/lib/api';
import type { StudioSelection } from './setup/selectionState';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import type { StudioDocumentRecord } from './api/studioDocumentsApi';
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
  const [selection, setSelection] = useState<StudioSelection | null>(null);
  const [document, setDocument] = useState<StudioDocumentRecord | null>(null);
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
      setChildName(''); setChildCode(''); setPickerKey((key) => key + 1); setSelection(null);
    } catch (error) { const response = setupErrorMessage(error); setMessage(response); toast.error(response); } finally { setBusy(false); }
  };
  const downloadCurriculum = async () => {
    if (!selection?.chapterId) return;
    try { await studioDocumentsApi.downloadCurriculumDocument(selection.chapterId); toast.success('Original Curriculum document downloaded successfully.'); }
    catch (error) { toast.error(getApiErrorDetails(error).message); }
  };
  return <StudioShell title="Curriculum" subtitle="Select the hierarchy and manage the one Curriculum document attached to its Chapter." actions={<button type="button" onClick={() => setShowCreate((open) => !open)} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={17} />{showCreate ? 'Close hierarchy form' : 'Create hierarchy entry'}</button>}>
    {showCreate && <section className="mb-5 rounded-xl border border-blue-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-900"><Plus size={19} /></span><div><h2 className="font-semibold">Create hierarchy entry</h2><p className="text-sm text-slate-600">Select the hierarchy level first, then create its child under the currently selected parent.</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-4"><label className="text-sm font-medium">Parent type<select value={level} onChange={(event) => setLevel(event.target.value as CurriculumLevel)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100"><option value="board">Board</option><option value="program">Program</option><option value="grade">Grade</option><option value="subject">Subject</option><option value="chapter">Chapter</option><option value="topic">Topic</option><option value="subtopic">Subtopic</option></select></label><label className="text-sm font-medium">Child name<input value={childName} onChange={(event) => setChildName(event.target.value)} placeholder={level === 'grade' ? 'e.g. Grade 10' : `New ${level} name`} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100" /></label><label className="text-sm font-medium">Code (where applicable)<input value={childCode} onChange={(event) => setChildCode(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100" /></label><label className="text-sm font-medium">Order / number<input type="number" min="1" value={childOrder} onChange={(event) => setChildOrder(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-100" /></label></div>{level !== 'board' && !parentFor(level, selection) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Select the required parent in the hierarchy below before creating this {level}.</p>}<div className="mt-4 flex justify-end"><button type="button" disabled={busy || !childName.trim() || (level !== 'board' && !parentFor(level, selection))} onClick={createChild} className="rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Creating…' : 'Create child'}</button></div></section>}
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Curriculum hierarchy</h2><p className="mb-4 mt-1 text-sm text-slate-600">The hierarchy behavior follows Question Bank: every child is loaded from its selected parent.</p><StudioContextPicker key={pickerKey} includeSession={false} onChange={setSelection} /></section>
    <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">Chapter Curriculum document</h2><p className="mt-1 text-sm text-slate-600">Topic and Subtopic are not used to locate this document.</p></div>{document && <button type="button" onClick={() => void downloadCurriculum()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"><Download size={16} /> Download original</button>}</div>
      {!selection?.chapterId ? <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Select through Chapter to view or upload its Curriculum document.</p> : <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2"><div className="min-w-0 rounded-lg bg-gray-50 p-4"><p className="text-sm font-semibold">Current document</p>{document ? <><p className="mt-2 break-all text-sm" title={document.original_file_name || undefined}>{document.original_file_name}</p><p className="text-xs text-slate-500">Revision {document.revision_no}</p></> : <p className="mt-2 text-sm text-slate-600">No Curriculum document is stored for this Chapter.</p>}</div><div className="min-w-0 rounded-lg border border-dashed border-gray-300 p-4"><label className="block min-w-0 text-sm font-medium text-slate-700">Choose Curriculum file<input key={`${selection.chapterId}-${document?.revision_no ?? 0}`} type="file" accept=".doc,.docx,.pdf" onChange={(event) => { setFile(event.target.files?.[0] || null); setMessage(''); }} className="mt-2 block w-full min-w-0 max-w-full text-sm" /></label>{file && <p className="mt-2 break-all text-xs text-slate-500">Selected: {file.name}</p>}<button type="button" disabled={!file || busy} onClick={upload} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Upload size={16} />{busy ? 'Uploading…' : document ? 'Replace document' : 'Upload document'}</button></div></div>}
      {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}<div className="mt-5 flex justify-end"><button type="button" onClick={() => navigate('/studio/session-plans')} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700">Next: Session Plan <ArrowRight size={17} /></button></div>
    </section>
  </StudioShell>;
}

