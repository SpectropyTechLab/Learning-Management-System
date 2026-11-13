import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import {
  studioCurriculumImportApi,
  type CurriculumImportPreview,
  type CurriculumImportRow,
  type ImportLevel,
} from '../api/studioCurriculumImportApi';

const levels: Array<{ level: ImportLevel; label: string; field: keyof CurriculumImportRow; code?: keyof CurriculumImportRow }> = [
  { level: 'board', label: 'Board Name', field: 'board_name', code: 'board_code' },
  { level: 'program', label: 'Program Name', field: 'program_name', code: 'program_code' },
  { level: 'grade', label: 'Grade Number', field: 'grade_number' },
  { level: 'subject', label: 'Subject Name', field: 'subject_name', code: 'subject_code' },
  { level: 'chapter', label: 'Chapter Name', field: 'chapter_name' },
  { level: 'topic', label: 'Topic Name', field: 'topic_name' },
  { level: 'subtopic', label: 'Subtopic Name', field: 'subtopic_name' },
  { level: 'session', label: 'Session Name', field: 'session_name' },
];

const requiredFields: Array<keyof CurriculumImportRow> = [
  'board_name', 'board_code', 'program_name', 'program_code', 'grade_number', 'subject_name',
  'subject_code', 'chapter_name', 'topic_name', 'subtopic_name', 'session_name',
];

const excelFields = [
  { name: 'Board Name', required: true, details: 'Full board name, for example CBSE.' },
  { name: 'Board Code', required: true, details: 'Short board code, for example CBSE.' },
  { name: 'Program Name', required: true, details: 'Program or curriculum name.' },
  { name: 'Program Code', required: true, details: 'Short program code.' },
  { name: 'Grade Number', required: true, details: 'Numeric grade, for example 8.' },
  { name: 'Subject Name', required: true, details: 'Full subject name.' },
  { name: 'Subject Code', required: true, details: 'Short subject code.' },
  { name: 'Chapter Name', required: true, details: 'Chapter containing the topic.' },
  { name: 'Topic Name', required: true, details: 'Topic containing the subtopic.' },
  { name: 'Topic Pedagogy Names', required: false, details: 'Comma-separated pedagogy names.' },
  { name: 'Topic Bloom Level Names', required: false, details: 'Comma-separated Bloom levels.' },
  { name: 'Topic Target Exam Names', required: false, details: 'Comma-separated examination names.' },
  { name: 'Subtopic Name', required: true, details: 'Subtopic containing the session.' },
  { name: 'Session Name', required: true, details: 'Name of the session to create.' },
  { name: 'Session Description', required: false, details: 'Optional summary of the session.' },
] as const;

const rowHasIssue = (row: CurriculumImportRow) =>
  row.action === 'import' && (
    requiredFields.some((field) => !String(row[field] ?? '').trim()) ||
    levels.some(({ level }) => ['ambiguous', 'missing'].includes(row.fields[level].status))
  );

const statusClasses = (row: CurriculumImportRow) => {
  if (row.action === 'skip') return 'border-slate-200 bg-slate-50';
  if (rowHasIssue(row)) return 'border-amber-300 bg-amber-50/40';
  return 'border-emerald-200 bg-emerald-50/30';
};

const normalized = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();

const candidatesForParent = (
  row: CurriculumImportRow,
  level: ImportLevel,
  parentId: number | null,
) => {
  const levelIndex = levels.findIndex((item) => item.level === level);
  if (levelIndex === 0) return row.fields[level].candidates;
  if (!parentId) return [];
  return row.fields[level].candidates.filter((candidate) => candidate.parent_id === parentId);
};

const reconcileLevel = (row: CurriculumImportRow, changedLevel: ImportLevel) => {
  const changedIndex = levels.findIndex((item) => item.level === changedLevel);
  const definition = levels[changedIndex];
  const parent = changedIndex > 0 ? levels[changedIndex - 1] : null;
  const parentId = parent ? row.fields[parent.level].selected_id : null;
  const value = String(row[definition.field] ?? '').trim();
  const code = definition.code ? String(row[definition.code] ?? '').trim() : '';
  const candidates = candidatesForParent(row, changedLevel, parentId);
  const nameMatches = candidates.filter((candidate) =>
    normalized(changedLevel === 'grade' ? candidate.name.replace(/^Grade\s+/i, '') : candidate.name) === normalized(value),
  );
  const codeMatches = code
    ? candidates.filter((candidate) => Boolean(candidate.code && normalized(candidate.code) === normalized(code)))
    : [];
  const exact = code
    ? nameMatches.filter((candidate) => codeMatches.some((codeCandidate) => codeCandidate.id === candidate.id))
    : nameMatches;
  const conflict = Boolean(code && !exact.length && (nameMatches.length || codeMatches.length));
  const selected = exact.length === 1 && (changedIndex === 0 || Boolean(parentId)) ? exact[0] : null;
  return {
    ...row,
    fields: {
      ...row.fields,
      [changedLevel]: {
        ...row.fields[changedLevel],
        selected_id: selected?.id ?? null,
        status: !value ? 'missing' : selected ? 'matched' : exact.length || conflict ? 'ambiguous' : 'new',
      },
    },
  };
};

const reconcileChildren = (row: CurriculumImportRow, changedLevel: ImportLevel) => {
  const changedIndex = levels.findIndex((item) => item.level === changedLevel);
  const fields = { ...row.fields };
  for (let index = changedIndex + 1; index < levels.length; index += 1) {
    const definition = levels[index];
    const parent = levels[index - 1];
    const parentId = fields[parent.level].selected_id;
    const value = String(row[definition.field] ?? '').trim();
    const code = definition.code ? String(row[definition.code] ?? '').trim() : '';
    const candidates = parentId
      ? fields[definition.level].candidates.filter((candidate) => candidate.parent_id === parentId)
      : [];
    const nameMatches = parentId ? candidates.filter((candidate) =>
      normalized(definition.level === 'grade' ? candidate.name.replace(/^Grade\s+/i, '') : candidate.name) === normalized(value),
    ) : [];
    const codeMatches = code ? candidates.filter((candidate) =>
      Boolean(candidate.code && normalized(candidate.code) === normalized(code)),
    ) : [];
    const exact = code
      ? nameMatches.filter((candidate) => codeMatches.some((codeCandidate) => codeCandidate.id === candidate.id))
      : nameMatches;
    const conflict = Boolean(code && !exact.length && (nameMatches.length || codeMatches.length));
    const selected = exact.length === 1 && Boolean(parentId) ? exact[0] : null;
    fields[definition.level] = {
      ...fields[definition.level],
      selected_id: selected?.id ?? null,
      status: !value ? 'missing' : selected ? 'matched' : exact.length || conflict ? 'ambiguous' : 'new',
    };
  }
  return { ...row, fields };
};

interface Props {
  onImported: () => void;
}

export default function StudioCurriculumBulkImport({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [interfaceOpen, setInterfaceOpen] = useState(false);
  const [preview, setPreview] = useState<CurriculumImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');

  const rows = useMemo(() => preview?.rows ?? [], [preview]);
  const issueCount = useMemo(() => rows.filter(rowHasIssue).length, [rows]);
  const importCount = rows.filter((row) => row.action === 'import').length;

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setFileName(file.name);
    try {
      const result = await studioCurriculumImportApi.preview(file);
      setPreview({
        ...result,
        rows: result.rows.map((row) => reconcileChildren({ ...row, action: 'import' }, 'board')),
      });
    } catch (error) {
      toast.error(getApiErrorDetails(error).message);
      setPreview(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const updateRow = (index: number, updater: (row: CurriculumImportRow) => CurriculumImportRow) => {
    setPreview((current) => current ? { ...current, rows: current.rows.map((row, rowIndex) => rowIndex === index ? updater(row) : row) } : current);
  };

  const updateText = (index: number, field: keyof CurriculumImportRow, value: string, level?: ImportLevel) => {
    updateRow(index, (row) => {
      const updated = {
        ...row,
        [field]: value,
      } as CurriculumImportRow;
      return level ? reconcileChildren(reconcileLevel(updated, level), level) : updated;
    });
  };

  const selectExisting = (index: number, level: ImportLevel, rawId: string) => {
    updateRow(index, (row) => {
      const match = row.fields[level];
      if (rawId === 'create') {
        return reconcileChildren({ ...row, fields: { ...row.fields, [level]: { ...match, selected_id: null, status: 'new' } } }, level);
      }
      const selectedId = Number(rawId);
      const candidate = match.candidates.find((item) => item.id === selectedId);
      const definition = levels.find((item) => item.level === level);
      return reconcileChildren({
        ...row,
        ...(definition && candidate ? { [definition.field]: level === 'grade' ? candidate.name.replace(/^Grade\s+/i, '') : candidate.name } : {}),
        ...(definition?.code && candidate?.code ? { [definition.code]: candidate.code } : {}),
        fields: { ...row.fields, [level]: { ...match, selected_id: selectedId, status: 'matched' } },
      }, level);
    });
  };

  const confirm = async () => {
    if (!preview || issueCount || !importCount) return;
    setBusy(true);
    try {
      const result = await studioCurriculumImportApi.confirm(preview.rows);
      toast.success(`${result.sessions_created} Studio Session${result.sessions_created === 1 ? '' : 's'} created successfully.`);
      setPreview(null);
      setFileName('');
      setInterfaceOpen(false);
      onImported();
    } catch (error) {
      toast.error(getApiErrorDetails(error).message);
    } finally {
      setBusy(false);
    }
  };

  const closeInterface = () => {
    if (busy) return;
    setPreview(null);
    setFileName('');
    setInterfaceOpen(false);
  };

  return (
    <>
      <button type="button" disabled={busy} onClick={() => setInterfaceOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
        <FileSpreadsheet size={17} /> Bulk upload
      </button>
      <input ref={inputRef} type="file" accept=".xlsx" className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} />

      {interfaceOpen && !preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="bulk-upload-title">
          <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
              <div>
                <h2 id="bulk-upload-title" className="text-lg font-bold text-slate-950">Bulk upload</h2>
                <p className="mt-0.5 text-sm text-slate-600">Download the template, add one session per row, then upload it.</p>
              </div>
              <button type="button" disabled={busy} onClick={closeInterface} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" aria-label="Close bulk upload"><X size={19} /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <section className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <h3 className="text-sm font-bold text-blue-950">1. Download template</h3>
                  <p className="mt-0.5 text-xs text-blue-900">Keep all heading names unchanged.</p>
                  <button type="button" disabled={busy} onClick={() => void studioCurriculumImportApi.downloadTemplate().catch((error) => toast.error(getApiErrorDetails(error).message))} className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-blue-900 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-50">
                    <Download size={14} /> Download template
                  </button>
                </section>
                <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <h3 className="text-sm font-bold text-emerald-950">2. Upload Excel</h3>
                  <p className="mt-0.5 text-xs text-emerald-900">.xlsx only, up to 1,000 rows. Fix issues before import.</p>
                  <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                    <Upload size={14} /> {busy ? 'Reading...' : 'Choose file'}
                  </button>
                </section>
              </div>

              <section className="mt-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">Excel field details</h3>
                    <p className="mt-1 text-sm text-slate-600">Required hierarchy values can be left blank on later rows when they are the same as the row above; they will be carried forward automatically.</p>
                  </div>
                  <div className="flex gap-2 text-xs font-semibold"><span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">Required</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Optional</span></div>
                </div>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[minmax(170px,0.8fr)_100px_minmax(220px,1.4fr)] bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                    <span>Excel heading</span><span>Requirement</span><span>What to enter</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {excelFields.map((field) => (
                      <div key={field.name} className="grid grid-cols-[minmax(170px,0.8fr)_100px_minmax(220px,1.4fr)] items-center px-4 py-2.5 text-sm">
                        <span className="font-semibold text-slate-900">{field.name}</span>
                        <span className={field.required ? 'font-semibold text-red-700' : 'text-slate-500'}>{field.required ? 'Required' : 'Optional'}</span>
                        <span className="text-slate-600">{field.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <footer className="flex justify-end border-t border-slate-200 p-4">
              <button type="button" disabled={busy} onClick={closeInterface} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            </footer>
          </section>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Review curriculum import">
          <section className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Review curriculum and Session import</h2>
                <p className="mt-1 text-sm text-slate-600">{fileName} - {rows.length} data rows. Statuses show what will happen; only items marked Needs review require a choice.</p>
              </div>
              <button type="button" disabled={busy} onClick={closeInterface} className="rounded-lg border border-slate-300 p-2" aria-label="Close import review"><X size={19} /></button>
            </header>

            <div className="flex flex-wrap gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm">
              <span className="rounded-full bg-white px-3 py-1 font-semibold">{importCount} to import</span>
              <span className="rounded-full bg-white px-3 py-1">{rows.length - importCount} skipped</span>
              <span className={`rounded-full px-3 py-1 font-semibold ${issueCount ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{issueCount} unresolved issues</span>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              {rows.map((row, rowIndex) => (
                <article key={`${row.row_number}-${rowIndex}`} className={`rounded-xl border p-4 ${statusClasses(row)}`}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {rowHasIssue(row) ? <AlertTriangle size={18} className="text-amber-700" /> : <CheckCircle2 size={18} className="text-emerald-700" />}
                      <h3 className="font-semibold">Excel row {row.row_number}</h3>
                      {row.status === 'duplicate' && <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">Existing Session</span>}
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={row.action === 'import'} onChange={(event) => updateRow(rowIndex, (current) => ({ ...current, action: event.target.checked ? 'import' : 'skip' }))} /> Import this row</label>
                  </div>

                  {row.action === 'import' && (
                    <>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {levels.map(({ level, label, field, code }) => {
                          const match = row.fields[level];
                          const parentIndex = levels.findIndex((item) => item.level === level) - 1;
                          const parentDefinition = parentIndex >= 0 ? levels[parentIndex] : null;
                          const parentMatch = parentDefinition ? row.fields[parentDefinition.level] : null;
                          const parentId = parentMatch?.selected_id ?? null;
                          const unresolvedAncestor = parentIndex >= 0
                            ? levels.slice(0, parentIndex + 1).find((definition) => ['ambiguous', 'missing'].includes(row.fields[definition.level].status))
                            : null;
                          const parentNeedsReview = Boolean(unresolvedAncestor);
                          const candidates = candidatesForParent(row, level, parentId);
                          return (
                            <div key={level} className="rounded-lg border border-slate-200 bg-white p-3">
                              <label className="text-xs font-semibold text-slate-700">{label}<input value={String(row[field] ?? '')} type={level === 'grade' ? 'number' : 'text'} min={level === 'grade' ? 1 : undefined} onChange={(event) => updateText(rowIndex, field, event.target.value, level)} className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm font-normal" /></label>
                              {code && <label className="mt-2 block text-xs font-semibold text-slate-700">{label.replace('Name', 'Code')}<input value={String(row[code] ?? '')} onChange={(event) => updateText(rowIndex, code, event.target.value, level)} className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm font-normal" /></label>}
                              <div className="mt-2">
                                {parentNeedsReview && unresolvedAncestor && (
                                  <div>
                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Waiting for parent</span>
                                    <p className="mt-1 text-xs text-slate-600">Resolve {unresolvedAncestor.label} first.</p>
                                  </div>
                                )}
                                {!parentNeedsReview && match.status === 'matched' && <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Existing</span>}
                                {!parentNeedsReview && match.status === 'new' && <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">New</span>}
                                {!parentNeedsReview && match.status === 'missing' && <div><span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Missing</span><p className="mt-1 text-xs text-red-700">Enter the required value above.</p></div>}
                                {!parentNeedsReview && match.status === 'ambiguous' && (
                                  <label className="block text-xs font-semibold text-amber-800">
                                    Needs review
                                    <select value="" onChange={(event) => selectExisting(rowIndex, level, event.target.value)} className="mt-1 w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-2 text-sm font-normal text-slate-900">
                                      <option value="">Choose what to use</option>
                                      <option value="create">Create as new</option>
                                      {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>Use existing: {candidate.name}{candidate.code ? ` (${candidate.code})` : ''}</option>)}
                                    </select>
                                  </label>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="text-xs font-semibold">Topic Pedagogy Names<input list="bulk-import-pedagogy" value={row.topic_pedagogy_names} onChange={(event) => updateText(rowIndex, 'topic_pedagogy_names', event.target.value)} placeholder="Inquiry, Demonstration" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal" /></label>
                        <label className="text-xs font-semibold">Topic Bloom Level Names<input list="bulk-import-bloom" value={row.topic_bloom_level_names} onChange={(event) => updateText(rowIndex, 'topic_bloom_level_names', event.target.value)} placeholder="Understand, Apply" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal" /></label>
                        <label className="text-xs font-semibold">Topic Target Exam Names<input list="bulk-import-target-exam" value={row.topic_target_exam_names} onChange={(event) => updateText(rowIndex, 'topic_target_exam_names', event.target.value)} placeholder="JEE Main, NEET" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal" /></label>
                        <label className="text-xs font-semibold">Session Description<textarea value={row.session_description} onChange={(event) => updateText(rowIndex, 'session_description', event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal" /></label>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5">
              <p className="text-sm text-slate-600">Chapter, Topic, Subtopic and Session ordering will be assigned automatically.</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={closeInterface} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
                <button type="button" disabled={busy || issueCount > 0 || importCount === 0} onClick={() => void confirm()} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Upload size={16} />{busy ? 'Importing...' : `Import ${importCount} rows`}</button>
              </div>
            </footer>
          </section>
          <datalist id="bulk-import-pedagogy">{preview.taxonomy_terms.filter((term) => term.type === 'pedagogy').map((term) => <option key={term.id} value={term.label} />)}</datalist>
          <datalist id="bulk-import-bloom">{preview.taxonomy_terms.filter((term) => term.type === 'bloom').map((term) => <option key={term.id} value={term.label} />)}</datalist>
          <datalist id="bulk-import-target-exam">{preview.taxonomy_terms.filter((term) => term.type === 'target_exam').map((term) => <option key={term.id} value={term.label} />)}</datalist>
        </div>
      )}
    </>
  );
}
