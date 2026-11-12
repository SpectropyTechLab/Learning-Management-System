import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  FileUp,
  History,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import { studioDocumentsApi } from './api/studioDocumentsApi';
import type { SessionPlanRow, StudioDocumentRecord } from './api/studioDocumentsApi';
import { studioSetupApi } from './api/studioSetupApi';
import type { StudioSession } from './api/studioSetupApi';
import { splitTaxonomyValues, studioTaxonomyApi, taxonomyValueCode } from './api/studioTaxonomyApi';
import type { StudioTaxonomyTerm } from './api/studioTaxonomyApi';
import StudioShell from './components/StudioShell';

const blankRow = (): SessionPlanRow => ({
  time_duration: '',
  screen_mapped: '',
  learning_objective_evidence: '',
  pedagogy: '',
  resources_assets: '',
  teacher_action_todo: '',
  narration_dialogue_cue: '',
  student_action_reflection: '',
  bloom_skills: '',
  references: '',
  remarks_assessment: '',
});
const REQUIRED_PLAN_KEYS: Array<keyof SessionPlanRow> = [
  'time_duration',
  'screen_mapped',
  'learning_objective_evidence',
  'pedagogy',
  'teacher_action_todo',
  'narration_dialogue_cue',
  'student_action_reflection',
];
const mainFields: Array<keyof SessionPlanRow> = [
  'screen_mapped',
  'time_duration',
  'learning_objective_evidence',
  'pedagogy',
  'bloom_skills',
  'resources_assets',
];
const detailFields: Array<[keyof SessionPlanRow, string]> = [
  ['teacher_action_todo', 'Teacher action / to-do'],
  ['narration_dialogue_cue', 'Narration / dialogue cue'],
  ['student_action_reflection', 'Student action / reflection'],
  ['references', 'References'],
  ['remarks_assessment', 'Remarks / assessment'],
];
const positiveId = (value: string | null | undefined) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export default function StudioSessionPlanPage() {
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = positiveId(routeSessionId) || positiveId(searchParams.get('sessionId'));
  const [session, setSession] = useState<StudioSession | null>(null);
  const [document, setDocument] = useState<StudioDocumentRecord | null>(null);
  const [rows, setRows] = useState<SessionPlanRow[]>([]);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceMode, setSourceMode] = useState<'upload' | 'manual'>('manual');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rowValidation, setRowValidation] = useState<
    Array<{ index: number; errors: string[]; will_create_screen: boolean }>
  >([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [taxonomyTerms, setTaxonomyTerms] = useState<StudioTaxonomyTerm[]>([]);
  const [unknownTerms, setUnknownTerms] = useState<
    Array<{ type: 'pedagogy' | 'bloom'; original: string; value: string }>
  >([]);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestedMode = searchParams.get('mode');
  const isCreatePipeline = searchParams.get('flow') === 'create';
  const returnToLibrary = searchParams.get('returnTo') === 'library';
  const mode: 'view' | 'edit' = requestedMode === 'edit' ? 'edit' : document ? 'view' : 'edit';
  const editable = !session || session.status === 'draft' || session.status === 'rejected';

  const setMode = (next: 'view' | 'edit') => {
    const updated = new URLSearchParams(searchParams);
    updated.set('mode', next);
    setSearchParams(updated, { replace: true });
  };

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      studioSetupApi.session(sessionId),
      studioDocumentsApi.sessionPlan(sessionId).catch((requestError) => {
        if (getApiErrorDetails(requestError).status === 404) return null;
        throw requestError;
      }),
      studioTaxonomyApi.list(),
    ])
      .then(([sessionResult, plan, terms]) => {
        if (!active) return;
        setSession(sessionResult);
        setDocument(plan);
        setTaxonomyTerms(terms);
        setRows(plan?.structured_content?.rows || []);
        setSourceMode(plan?.source_mode || 'manual');
        if (!plan && requestedMode !== 'view') setMode('edit');
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
    // This load is tied to the selected Session; changing view/edit mode must not reload the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const rowErrors = (row: SessionPlanRow) => REQUIRED_PLAN_KEYS.filter((key) => !row[key].trim());
  const invalidCount = useMemo(
    () => rows.filter((row) => rowErrors(row).length > 0).length,
    [rows],
  );
  const newScreenCount = rowValidation.filter((item) => item.will_create_screen).length;
  const update = (index: number, key: keyof SessionPlanRow, value: string) =>
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  const toggleExpanded = (index: number) =>
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  const addRow = () => {
    setRows((current) => [...current, blankRow()]);
    setSourceMode('manual');
    setSourceFile(null);
  };

  const preview = async (file: File) => {
    if (!sessionId) return;
    setBusy(true);
    setError('');
    try {
      const result = await studioDocumentsApi.previewSessionPlan(sessionId, file);
      setSourceFile(file);
      setSourceMode('upload');
      setRows(result.rows);
      setWarnings(result.warnings);
      setRowValidation(result.validation);
      setExpandedRows(new Set());
      toast.success(`${result.rows.length} Plan rows loaded. Review them before saving.`);
    } catch (requestError) {
      const message = getApiErrorDetails(requestError).message;
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const findUnknownTerms = (contentRows: SessionPlanRow[]) => {
    const missing = new Map<
      string,
      { type: 'pedagogy' | 'bloom'; original: string; value: string }
    >();
    for (const row of contentRows) {
      for (const [type, values] of [
        ['pedagogy', splitTaxonomyValues(row.pedagogy)],
        ['bloom', splitTaxonomyValues(row.bloom_skills)],
      ] as const) {
        for (const value of values) {
          const code = taxonomyValueCode(value);
          if (!taxonomyTerms.some((term) => term.type === type && term.code === code))
            missing.set(`${type}:${code}`, { type, original: value, value });
        }
      }
    }
    return [...missing.values()];
  };

  const persist = async (contentRows: SessionPlanRow[], createMissingTaxonomy = false) => {
    if (!sessionId || !contentRows.length) return;
    setBusy(true);
    setError('');
    try {
      const saved =
        sourceMode === 'upload' && sourceFile
          ? await studioDocumentsApi.importSessionPlan(
              sessionId,
              sourceFile,
              contentRows,
              createMissingTaxonomy,
            )
          : await studioDocumentsApi.saveManualSessionPlan(
              sessionId,
              contentRows,
              createMissingTaxonomy,
            );
      setDocument(saved);
      setSourceFile(null);
      setRowValidation([]);
      setMode('view');
      setTaxonomyTerms(await studioTaxonomyApi.list());
      toast.success('Session Plan saved as a new revision.');
    } catch (requestError) {
      const message = getApiErrorDetails(requestError).message;
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!rows.length) {
      toast.error('Add at least one Plan row.');
      return;
    }
    if (invalidCount) {
      toast.error(`Complete the required fields in ${invalidCount} row(s).`);
      return;
    }
    const missing = findUnknownTerms(rows);
    if (missing.length) {
      setUnknownTerms(missing);
      return;
    }
    await persist(rows);
  };
  const confirmUnknownTerms = async () => {
    const replacements = new Map(
      unknownTerms.map((term) => [
        `${term.type}:${taxonomyValueCode(term.original)}`,
        term.value.trim(),
      ]),
    );
    const updated = rows.map((row) => ({
      ...row,
      pedagogy: splitTaxonomyValues(row.pedagogy)
        .map((value) => replacements.get(`pedagogy:${taxonomyValueCode(value)}`) || value)
        .join(', '),
      bloom_skills: splitTaxonomyValues(row.bloom_skills)
        .map((value) => replacements.get(`bloom:${taxonomyValueCode(value)}`) || value)
        .join(', '),
    }));
    setRows(updated);
    setUnknownTerms([]);
    await persist(updated, true);
  };
  const downloadPlan = async () => {
    if (!sessionId) return;
    try {
      await studioDocumentsApi.downloadSessionPlan(sessionId);
    } catch (requestError) {
      toast.error(getApiErrorDetails(requestError).message);
    }
  };

  if (!sessionId)
    return (
      <StudioShell title="Session Plan" subtitle="Open a Plan from its Session.">
        <div className="mx-auto max-w-2xl border-t border-slate-200 py-16 text-center">
          <p className="text-slate-600">No Session was selected.</p>
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
      title="Session Plan"
      subtitle={
        session ? `Session ${session.session_number}: ${session.title}` : 'Loading Session…'
      }
      actions={
        <button
          type="button"
          onClick={() => navigate('/studio/sessions')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-900"
        >
          <ArrowLeft size={16} />
          Session Library
        </button>
      }
    >
      <div className="mx-auto">
        {loading && (
          <p className="border-b border-slate-200 py-12 text-center text-sm text-slate-500">
            Loading Session Plan…
          </p>
        )}
        {!loading && error && (
          <p className="mt-5 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {!loading && session && (
          <>
            <header className=" flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-950">{session.title}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    <History size={13} />
                    Revision {document?.revision_no || 0}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {session.chapter_name} / {session.topic_name} / {session.subtopic_name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {document?.original_file_name && (
                  <button
                    type="button"
                    onClick={() => void downloadPlan()}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 hover:text-blue-900"
                  >
                    <Download size={16} />
                    Original
                  </button>
                )}
                {document && mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => setMode('view')}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    <Eye size={16} />
                    View
                  </button>
                )}
                {document && mode === 'view' && editable && (
                  <button
                    type="button"
                    onClick={() => setMode('edit')}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Pencil size={16} />
                    Edit Plan
                  </button>
                )}
              </div>
            </header>
            {mode === 'edit' && editable && (
              <div className="flex flex-col gap-3 border-b border-slate-200 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-900">
                    <FileUp size={16} />
                    {busy ? 'Loading…' : 'Upload DOCX'}
                    <input
                      type="file"
                      accept=".docx"
                      disabled={busy}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void preview(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <Plus size={16} />
                    Add row
                  </button>
                  <span className="text-xs text-slate-600">
                    <strong className="text-slate-900">{rows.length}</strong> rows
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <strong className="text-slate-900">{rows.length - invalidCount}</strong> valid
                  </span>
                  {(sourceFile?.name || document?.original_file_name) && (
                    <span
                      className="max-w-64 truncate text-xs text-slate-500"
                      title={sourceFile?.name || document?.original_file_name || undefined}
                    >
                      File: {sourceFile?.name || document?.original_file_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || !rows.length}
                    onClick={() => void save()}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    <Save size={16} />
                    {busy ? 'Saving…' : 'Save Plan'}
                  </button>
                  <button
                    type="button"
                    disabled={!document}
                    onClick={() =>
                      navigate(
                        returnToLibrary
                          ? '/studio/sessions'
                          : `/studio/sessions/${sessionId}/scripts${isCreatePipeline ? '?flow=create' : ''}`,
                      )
                    }
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-900 disabled:opacity-40"
                  >
                    {returnToLibrary ? 'Back to Session Library' : 'Continue to Screen Scripts'}{' '}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
            {!editable && (
              <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This Plan is view-only while the Session is {session.status}.
              </p>
            )}
            {rows.length > 0 && (invalidCount > 0 || newScreenCount > 0) && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 py-3 text-xs text-slate-600">
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                    <AlertTriangle size={14} />
                    {invalidCount} need attention
                  </span>
                )}
                {newScreenCount > 0 && (
                  <span className="text-blue-800">
                    {newScreenCount} new Screens will be created
                  </span>
                )}
              </div>
            )}
            {warnings.map((warning) => (
              <p
                key={warning}
                className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
              >
                {warning}
              </p>
            ))}
            {rows.length === 0 ? (
              <div className="border-b border-dashed border-slate-300 py-20 text-center">
                <h2 className="font-semibold text-slate-900">No Session Plan rows yet</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a row manually or upload a DOCX to fill the same table.
                </p>
                {editable && (
                  <div className="mt-5 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={addRow}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Plus size={16} />
                      Add first row
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
                      <FileUp size={16} />
                      Upload DOCX
                      <input
                        type="file"
                        accept=".docx"
                        className="sr-only"
                        onChange={(event) =>
                          event.target.files?.[0] && void preview(event.target.files[0])
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <PlanTable
                rows={rows}
                mode={mode}
                editable={editable}
                expandedRows={expandedRows}
                rowErrors={rowErrors}
                update={update}
                toggleExpanded={toggleExpanded}
                setRows={setRows}
              />
            )}
            {mode === 'view' && document && (
              <div className="flex justify-end py-5">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      returnToLibrary
                        ? '/studio/sessions'
                        : `/studio/sessions/${sessionId}/scripts${isCreatePipeline ? '?flow=create' : ''}`,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  {returnToLibrary ? 'Back to Session Library' : 'Continue to Screen Scripts'}{' '}
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {unknownTerms.length > 0 && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm new taxonomy values"
        >
          <section className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold">Confirm new Pedagogy and Bloom values</h2>
            <p className="mt-1 text-sm text-slate-600">
              Correct these new values, or confirm to create them with this Plan revision.
            </p>
            <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto">
              {unknownTerms.map((term, index) => (
                <label
                  key={`${term.type}-${term.original}`}
                  className="block text-sm font-semibold capitalize"
                >
                  {term.type}
                  <input
                    value={term.value}
                    onChange={(event) =>
                      setUnknownTerms((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnknownTerms([])}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel submission
              </button>
              <button
                type="button"
                disabled={busy || unknownTerms.some((term) => !term.value.trim())}
                onClick={() => void confirmUnknownTerms()}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Confirm and save
              </button>
            </div>
          </section>
        </div>
      )}
    </StudioShell>
  );
}

function PlanTable({
  rows,
  mode,
  editable,
  expandedRows,
  rowErrors,
  update,
  toggleExpanded,
  setRows,
}: {
  rows: SessionPlanRow[];
  mode: 'view' | 'edit';
  editable: boolean;
  expandedRows: Set<number>;
  rowErrors: (row: SessionPlanRow) => Array<keyof SessionPlanRow>;
  update: (index: number, key: keyof SessionPlanRow, value: string) => void;
  toggleExpanded: (index: number) => void;
  setRows: React.Dispatch<React.SetStateAction<SessionPlanRow[]>>;
}) {
  return (
    <div className="overflow-x-auto border-b border-slate-200">
      <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-14 px-3 py-3">#</th>
            <th className="w-40 px-3 py-3">Screen</th>
            <th className="w-28 px-3 py-3">Duration</th>
            <th className="min-w-64 px-3 py-3">Learning objective</th>
            <th className="w-44 px-3 py-3">Pedagogy</th>
            <th className="w-40 px-3 py-3">Bloom</th>
            <th className="min-w-52 px-3 py-3">Resources</th>
            <th className="w-28 px-3 py-3">Status</th>
            <th className="w-28 px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, index) => {
            const missing = rowErrors(row);
            const expanded = expandedRows.has(index);
            const canEdit = mode === 'edit' && editable;
            return [
              <tr
                key={`row-${index}`}
                className={missing.length ? 'bg-red-50/40 align-top' : 'bg-white align-top'}
              >
                <td className="px-3 py-3 font-semibold text-slate-500">{index + 1}</td>
                {mainFields.map((key) => (
                  <td key={key} className="px-2 py-2">
                    {canEdit ? (
                      <textarea
                        rows={
                          key === 'learning_objective_evidence' || key === 'resources_assets'
                            ? 3
                            : 2
                        }
                        value={row[key]}
                        onChange={(event) => update(index, key, event.target.value)}
                        className={`w-full resize-y rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-600 ${REQUIRED_PLAN_KEYS.includes(key) && !row[key].trim() ? 'border-red-400' : 'border-slate-300'}`}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap px-1 py-1 text-slate-800">
                        {row[key] || '—'}
                      </p>
                    )}
                  </td>
                ))}
                <td className="px-3 py-3">
                  {missing.length ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                      <AlertTriangle size={13} />
                      Fix {missing.length}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={13} />
                      Valid
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(index)}
                      className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                      aria-label={expanded ? 'Collapse row details' : 'Expand row details'}
                    >
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setRows((current) => [
                              ...current.slice(0, index + 1),
                              { ...row },
                              ...current.slice(index + 1),
                            ])
                          }
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                          aria-label="Duplicate row"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRows((current) =>
                              current.filter((_, rowIndex) => rowIndex !== index),
                            )
                          }
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                          aria-label="Delete row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>,
              expanded && (
                <tr key={`details-${index}`} className="bg-slate-50">
                  <td colSpan={9} className="border-t border-slate-200 px-5 py-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {detailFields.map(([key, label]) => (
                        <div
                          key={key}
                          className={key === 'narration_dialogue_cue' ? 'xl:col-span-2' : ''}
                        >
                          <p className="text-xs font-semibold text-slate-500">{label}</p>
                          {canEdit ? (
                            <textarea
                              rows={key === 'narration_dialogue_cue' ? 5 : 3}
                              value={row[key]}
                              onChange={(event) => update(index, key, event.target.value)}
                              className={`mt-1 w-full rounded-md border bg-white p-2 text-sm outline-none focus:border-blue-600 ${REQUIRED_PLAN_KEYS.includes(key) && !row[key].trim() ? 'border-red-400' : 'border-slate-300'}`}
                            />
                          ) : (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                              {row[key] || '—'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
