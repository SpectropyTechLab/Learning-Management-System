import { useEffect, useState } from 'react';
import { Download, Eye, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getApiErrorDetails } from '@/lib/api';
import {
  emptyStudioSelection,
  selectionFromSearchParams,
} from './setup/selectionState';
import type { StudioSelection } from './setup/selectionState';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import type { CurriculumDocumentPreview, StudioDocumentRecord } from './api/studioDocumentsApi';
import StudioCurriculumTree from './components/StudioCurriculumTree';
import StudioShell from './components/StudioShell';
import StudioCurriculumBulkImport from './components/StudioCurriculumBulkImport';
import CurriculumDocumentViewer from './components/CurriculumDocumentViewer';

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
  const [treeRefresh, setTreeRefresh] = useState(0);
  const [documentChapterId, setDocumentChapterId] = useState<number | null>(null);
  const [documentOpen, setDocumentOpen] = useState(false);
  useEffect(() => {
    setDocument(null);
    setFile(null);
    setMessage('');
    if (!documentOpen || !documentChapterId) return;
    studioDocumentsApi
      .curriculumDocument(documentChapterId)
      .then(setDocument)
      .catch((error) => {
        if (getApiErrorDetails(error).status !== 404) setMessage(getApiErrorDetails(error).message);
      });
  }, [documentChapterId, documentOpen]);
  const upload = async () => {
    if (!documentChapterId || !file) {
      toast.error('Choose a Curriculum document before uploading.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const replacing = Boolean(document);
      setDocument(
        await studioDocumentsApi.uploadCurriculumDocument(documentChapterId, file, replacing),
      );
      setFile(null);
      const response = replacing
        ? 'Curriculum document replaced successfully.'
        : 'Curriculum document uploaded successfully.';
      setMessage(response);
      toast.success(response);
    } catch (error) {
      const response = getApiErrorDetails(error).message;
      setMessage(response);
      toast.error(response);
    } finally {
      setBusy(false);
    }
  };
  const downloadCurriculum = async () => {
    if (!documentChapterId) return;
    try {
      await studioDocumentsApi.downloadCurriculumDocument(documentChapterId);
      toast.success('Original Curriculum document downloaded successfully.');
    } catch (error) {
      toast.error(getApiErrorDetails(error).message);
    }
  };
  const viewCurriculum = async () => {
    if (!documentChapterId) return;
    setBusy(true);
    try {
      setPreview(await studioDocumentsApi.previewCurriculumDocument(documentChapterId));
    } catch (error) {
      toast.error(getApiErrorDetails(error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <StudioShell
      title="Curriculum"
      subtitle="Expand the hierarchy to manage curriculum, Sessions, and Chapter documents."
      actions={<StudioCurriculumBulkImport onImported={() => { setSelection(emptyStudioSelection()); setTreeRefresh((value) => value + 1); }} />}
    >
      <StudioCurriculumTree
        initialSelection={initialSelection}
        refreshToken={treeRefresh}
        selection={selection}
        onChange={setSelection}
        onManageChapter={(chapterId, chapterSelection) => {
          setSelection(chapterSelection);
          setDocumentChapterId(chapterId);
          setDocumentOpen(true);
        }}
        onOpenSession={(sessionId) => navigate(`/studio/sessions/${sessionId}/plan`)}
      />
      {documentOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Manage Chapter Curriculum document">
          <section className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-5">
          <div>
            <h2 className="font-bold text-slate-900">Chapter Curriculum document</h2>
            <p className="mt-1 text-sm text-slate-600">Upload, replace, view, or download this Chapter's document.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {document && <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void viewCurriculum()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"
              >
                <Eye size={16} />
                View
              </button>
              <button
                type="button"
                onClick={() => void downloadCurriculum()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"
              >
                <Download size={16} />
                Download original
              </button>
            </>}
            <button type="button" onClick={() => setDocumentOpen(false)} className="rounded-lg border border-gray-300 p-2 text-slate-600" aria-label="Close Chapter Curriculum document"><X size={18} /></button>
          </div>
        </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-semibold">Current document</p>
              {document ? (
                <>
                  <p
                    className="mt-2 break-all text-sm"
                    title={document.original_file_name || undefined}
                  >
                    {document.original_file_name}
                  </p>
                  <p className="text-xs text-slate-500">Revision {document.revision_no}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  No Curriculum document is stored for this Chapter.
                </p>
              )}
            </div>
            <div className="min-w-0 rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm font-medium text-slate-700">Curriculum file</p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-900 bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-200">
                <Upload size={17} />
                <span>{document ? 'Choose replacement file' : 'Choose file to upload'}</span>
                <input
                  key={`${documentChapterId}-${document?.revision_no ?? 0}`}
                  type="file"
                  accept=".doc,.docx,.pdf"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    setMessage('');
                  }}
                  className="sr-only"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">Accepted formats: DOC, DOCX and PDF.</p>
              {file ? (
                <p className="mt-2 break-all rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900">
                  Selected: {file.name}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No file selected.</p>
              )}
              <button
                type="button"
                disabled={!file || busy}
                onClick={upload}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Upload size={16} />
                {busy ? 'Uploading…' : document ? 'Replace document' : 'Upload document'}
              </button>
            </div>
          </div>
        {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
          </div>
          </section>
        </div>
      )}
      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-stretch justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Curriculum document preview"
        >
          <section className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 p-4 sm:p-5">
              <div className="min-w-0">
                <h2 className="font-bold">Curriculum document</h2>
                <p className="truncate text-sm text-slate-600" title={preview.file_name}>
                  {preview.file_name} · Revision {preview.revision_no}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg border border-gray-300 p-2"
                aria-label="Close Curriculum preview"
              >
                <X size={19} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
              <CurriculumDocumentViewer preview={preview} />
            </div>
          </section>
        </div>
      )}
    </StudioShell>
  );
}
