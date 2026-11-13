import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp, Save, X } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import { SCREEN_SCRIPT_FIELDS, studioDocumentsApi } from './api/studioDocumentsApi';
import type {
  ScreenScriptContent,
  ScreenScriptPreviewItem,
  ScreenScriptRow,
} from './api/studioDocumentsApi';
import { studioSetupApi } from './api/studioSetupApi';
import type { StudioSession } from './api/studioSetupApi';
import StudioShell from './components/StudioShell';

const blankScript = (): ScreenScriptContent =>
  Object.fromEntries(SCREEN_SCRIPT_FIELDS.map(([key]) => [key, ''])) as ScreenScriptContent;

const positiveId = (value: string | null | undefined) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const hasContent = (content: ScreenScriptContent | null | undefined) =>
  SCREEN_SCRIPT_FIELDS.some(([key]) => Boolean(content?.[key]?.trim()));

export default function StudioSessionScriptsPage() {
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = positiveId(routeSessionId) || positiveId(searchParams.get('sessionId'));
  const requestedScreenId = positiveId(searchParams.get('screen'));
  const returnToLibrary = searchParams.get('returnTo') === 'library';
  const [session, setSession] = useState<StudioSession | null>(null);
  const [scripts, setScripts] = useState<ScreenScriptRow[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<number | null>(requestedScreenId);
  const [content, setContent] = useState<ScreenScriptContent>(blankScript());
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ScreenScriptPreviewItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const editable = !session || session.status === 'draft' || session.status === 'rejected';
  const selected = useMemo(
    () => scripts.find((script) => script.screen_id === selectedScreenId) || null,
    [scripts, selectedScreenId],
  );
  const completedCount = scripts.filter((script) => hasContent(script.content_json)).length;
  const mappedCount = preview.filter((script) => script.suggested_screen_id).length;
  const unmatchedCount = preview.length - mappedCount;
  const excessScriptCount = Math.max(preview.length - scripts.length, 0);
  const uploadedTitleByScreenNumber = useMemo(
    () => new Map(preview.map((script) => [script.screen_number, script.title.trim()])),
    [preview],
  );

  const loadScripts = async (id: number, preferredId?: number | null) => {
    const rows = await studioDocumentsApi.screenScripts(id);
    setScripts(rows);
    setSelectedScreenId((current) => {
      const candidate = preferredId || current;
      return rows.some((row) => row.screen_id === candidate)
        ? candidate
        : rows[0]?.screen_id || null;
    });
  };

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([studioSetupApi.session(sessionId), studioDocumentsApi.screenScripts(sessionId)])
      .then(([sessionResult, rows]) => {
        if (!active) return;
        setSession(sessionResult);
        setScripts(rows);
        const preferred = requestedScreenId;
        setSelectedScreenId(
          rows.some((row) => row.screen_id === preferred) ? preferred : rows[0]?.screen_id || null,
        );
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorDetails(requestError).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestedScreenId, sessionId]);

  useEffect(() => {
    setContent(selected?.content_json || blankScript());
  }, [selected]);

  const previewUpload = async (file: File) => {
    if (!sessionId) return;
    setBusy(true);
    setError('');
    try {
      const result = await studioDocumentsApi.previewScreenScripts(sessionId, file);
      setSourceFile(file);
      setPreview(result.scripts);
      setWarnings(result.warnings);
      toast.success(`${result.scripts.length} optional Screen Script(s) loaded.`);
    } catch (requestError) {
      const message = getApiErrorDetails(requestError).message;
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const importMapped = async () => {
    if (!sessionId || !sourceFile || !mappedCount) return;
    setBusy(true);
    setError('');
    try {
      await studioDocumentsApi.importScreenScripts(sessionId, sourceFile, preview);
      setPreview([]);
      setWarnings([]);
      setSourceFile(null);
      await loadScripts(sessionId, selectedScreenId);
      toast.success('Mapped Screen Scripts imported. Unmapped items were skipped.');
    } catch (requestError) {
      const message = getApiErrorDetails(requestError).message;
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const closeImportPreview = () => {
    if (busy) return;
    setPreview([]);
    setWarnings([]);
    setSourceFile(null);
  };

  const saveScript = async () => {
    if (!sessionId || !selectedScreenId || !hasContent(content)) return;
    setBusy(true);
    setError('');
    try {
      await studioDocumentsApi.saveScreenScript(sessionId, selectedScreenId, content);
      await loadScripts(sessionId, selectedScreenId);
      toast.success('Optional Screen Script saved.');
    } catch (requestError) {
      const message = getApiErrorDetails(requestError).message;
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (!sessionId)
    return (
      <StudioShell
        title="Screen Scripts"
        subtitle="Screen Scripts are optional and belong to a Session."
      >
        <div className="mx-auto max-w-2xl border-t border-slate-200 py-16 text-center">
          <p className="text-slate-600">Open optional Screen Scripts from a Session.</p>
          <button
            type="button"
            onClick={() => navigate('/studio/sessions')}
            className="mt-4 font-semibold text-blue-900"
          >
            Go to Session Library
          </button>
        </div>
      </StudioShell>
    );

  return (
    <StudioShell
      title="Screen Scripts"
      scrollContent={false}
      subtitle={
        session ? `Session ${session.session_number}: ${session.title}` : 'Loading Session…'
      }
      actions={
        <button
          type="button"
          onClick={() =>
            navigate(returnToLibrary ? '/studio/sessions' : `/studio/sessions/${sessionId}/plan`)
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-900"
        >
          <ArrowLeft size={16} /> {returnToLibrary ? 'Session Library' : 'Session Plan'}
        </button>
      }
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        {loading ? (
          <p className="shrink-0 border-b py-12 text-center text-sm text-slate-500">
            Loading Screens…
          </p>
        ) : null}
        {!loading && error ? (
          <p className="shrink-0 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {!loading && session ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex shrink-0 flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-950">{session.title}</h1>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                    Optional
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {session.chapter_name} / {session.topic_name} / {session.subtopic_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    returnToLibrary
                      ? '/studio/sessions'
                      : `/studio/editor/${sessionId}${selectedScreenId ? `?screen=${selectedScreenId}` : ''}`,
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
              >
                {returnToLibrary
                  ? 'Back to Session Library'
                  : 'Continue to Screen Editor'}{' '}
                <ArrowRight size={16} />
              </button>
            </header>

            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 py-4">
              {editable ? (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-900">
                  <FileUp size={16} /> {busy ? 'Loading…' : 'Upload DOCX'}
                  <input
                    type="file"
                    accept=".docx"
                    disabled={busy}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void previewUpload(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              ) : null}
              <span className="text-xs text-slate-600">
                <strong className="text-slate-900">{scripts.length}</strong> Screens
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <strong className="text-slate-900">{completedCount}</strong> with Scripts
              </span>
              <span className="text-xs text-slate-500">Blank Scripts do not block the Editor.</span>
            </div>

            {scripts.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center border-b border-dashed py-16 text-center">
                <h2 className="font-semibold">No Screens available</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create Screens from the Session Plan or Editor. Scripts can remain blank.
                </p>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(150px,35%)_minmax(0,1fr)] overflow-hidden border-b lg:grid-cols-[230px_minmax(0,1fr)] lg:grid-rows-1">
                <aside className="flex min-h-0 flex-col overflow-hidden border-b py-3 lg:border-b-0 lg:border-r">
                  <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Session Screens
                  </p>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {scripts.map((script) => {
                      const active = script.screen_id === selectedScreenId;
                      const complete = hasContent(script.content_json);
                      return (
                        <button
                          key={script.screen_id}
                          type="button"
                          onClick={() => setSelectedScreenId(script.screen_id)}
                          className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left ${active ? 'border-blue-800 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold">
                            {script.screen_number}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {script.title}
                            </span>
                            <span
                              className={`text-xs ${complete ? 'text-emerald-700' : 'text-slate-400'}`}
                            >
                              {complete ? 'Script saved' : 'Blank · optional'}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>
                {selected ? (
                  <section className="flex min-h-0 min-w-0 flex-col overflow-hidden p-4  sm:p-5">
                    <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b pb-4">
                      <div>
                        <h2 className="text-lg font-bold">
                          Screen {selected.screen_number}: {selected.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Add only what you need. Leaving this Screen blank is allowed.
                        </p>
                      </div>
                      {editable ? (
                        <button
                          type="button"
                          disabled={busy || !hasContent(content)}
                          onClick={() => void saveScript()}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          <Save size={15} />
                          {busy ? 'Saving…' : 'Save Script'}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                      <div className="grid gap-5 xl:grid-cols-2">
                        {SCREEN_SCRIPT_FIELDS.map(([key, label]) => (
                          <label
                            key={key}
                            className={`text-sm font-semibold text-slate-700 ${key === 'teacher_narration' || key === 'visual_animation_interaction_assets' ? 'xl:col-span-2' : ''}`}
                          >
                            {label} <span className="font-normal text-slate-400">(optional)</span>
                            <textarea
                              rows={key === 'teacher_narration' ? 4 : 3.5}
                              value={content[key] || ''}
                              readOnly={!editable}
                              onChange={(event) =>
                                setContent((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                              className="mt-1.5 w-full rounded-lg border border-slate-300 p-3 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
      {preview.length ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="screen-script-import-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeImportPreview();
          }}
        >
          <section className="flex max-h-[min(90vh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2 id="screen-script-import-title" className="text-lg font-bold text-slate-950">
                  Select Screen Scripts to import
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Map each uploaded script to an existing Screen, or select Skip this script.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImportPreview}
                disabled={busy}
                aria-label="Close import preview"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                  {preview.length} uploaded
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">
                  {mappedCount} selected
                </span>
                {unmatchedCount > 0 ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">
                    {unmatchedCount} skipped
                  </span>
                ) : null}
              </div>

              {unmatchedCount > 0 ? (
                <div
                  role="alert"
                  className="mb-4 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                >
                  <p className="font-semibold">
                    {excessScriptCount > 0
                      ? `The uploaded file contains ${preview.length} scripts, but this Session has only ${scripts.length} Screens.`
                      : `${unmatchedCount} of ${preview.length} uploaded scripts are not mapped to a Session Screen.`}
                  </p>
                  <p className="mt-1 text-amber-800">
                    {excessScriptCount > 0
                      ? `At least ${excessScriptCount} scripts cannot be imported. Add the missing Screens in the Session Plan or Editor, then upload the file again.`
                      : `${unmatchedCount} scripts will be skipped unless you map them below.`}
                  </p>
                </div>
              ) : null}

              {warnings.map((warning) => (
                <p key={warning} className="mb-2 text-sm text-amber-800">
                  {warning}
                </p>
              ))}

              <div className="overflow-hidden rounded-xl border border-slate-200">
                {preview.map((item, index) => (
                  <div
                    key={`${item.screen_key}-${index}`}
                    className="grid items-center gap-3 border-b border-slate-200 p-4 last:border-b-0 md:grid-cols-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {item.screen_key} · {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Uploaded Screen {item.screen_number}
                      </p>
                    </div>
                    <select
                      aria-label={`Import destination for ${item.title}`}
                      value={item.suggested_screen_id ?? ''}
                      disabled={busy}
                      onChange={(event) =>
                        setPreview((current) =>
                          current.map((script, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...script,
                                  suggested_screen_id: event.target.value
                                    ? Number(event.target.value)
                                    : null,
                                }
                              : script,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                    >
                      <option value="">Skip this script</option>
                      {scripts.map((screen) => (
                        <option key={screen.screen_id} value={screen.screen_id}>
                          Screen {screen.screen_number}: {uploadedTitleByScreenNumber.get(screen.screen_number) || screen.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={closeImportPreview}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !mappedCount}
                onClick={() => void importMapped()}
                className="rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Importing…' : `Import ${mappedCount} selected`}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </StudioShell>
  );
}
