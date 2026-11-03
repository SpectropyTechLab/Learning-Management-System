import { useCallback, useEffect, useMemo, useState } from 'react';
import TeachingStudioShell from '../components/TeachingStudioShell';
import { setupErrorMessage, studioSetupApi } from '../api/studioSetupApi';
import type { CurriculumOption, StudioSession } from '../api/studioSetupApi';
import { blankSessionPlanRow, saveManualSessionPlan, uploadSessionPlan } from '../api/studioSessionPlanApi';
import type { SessionPlanRow } from '../api/studioSessionPlanApi';
import { changeSelection, emptyStudioSelection } from './selectionState';
import type { SelectionKey } from './selectionState';

type ListKey = 'boards' | 'programs' | 'grades' | 'subjects' | 'chapters' | 'topics' | 'subtopics' | 'sessions';
type Lists = Record<ListKey, CurriculumOption[] | StudioSession[]>;
type EntryMode = 'upload' | 'manual';
const blankLists = (): Lists => ({ boards: [], programs: [], grades: [], subjects: [], chapters: [], topics: [], subtopics: [], sessions: [] });
const listOrder: ListKey[] = ['boards', 'programs', 'grades', 'subjects', 'chapters', 'topics', 'subtopics', 'sessions'];

const optionLabel = (item: CurriculumOption | StudioSession) => 'session_number' in item
  ? `Session ${item.session_number}: ${item.title}`
  : item.name ?? item.title ?? (item.grade_number ? `Grade ${item.grade_number}` : `Item ${item.id}`);

const manualFields: Array<{ key: Exclude<keyof SessionPlanRow, 'id'>; label: string }> = [
  { key: 'duration', label: 'Time / duration' },
  { key: 'screen_mapped', label: 'Screen mapped' },
  { key: 'learning_objective_evidence', label: 'Learning objective / evidence' },
  { key: 'pedagogy', label: 'Pedagogy' },
  { key: 'resources_assets', label: 'Resources / assets' },
  { key: 'teacher_action_todo', label: 'Teacher action / to-do' },
  { key: 'narration_dialogue_cue', label: 'Narration / dialogue cue' },
  { key: 'student_action_reflection', label: 'Student action / reflection' },
  { key: 'bloom_skills', label: 'Bloom / skills' },
  { key: 'references', label: 'References' },
  { key: 'remarks_assessment', label: 'Remarks / assessment' },
];

export default function StudioSessionPlanPage() {
  const [selection, setSelection] = useState(emptyStudioSelection);
  const [lists, setLists] = useState<Lists>(blankLists);
  const [loading, setLoading] = useState<Partial<Record<ListKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<ListKey, string>>>({});
  const [retry, setRetry] = useState<Partial<Record<ListKey, number>>>({});
  const [mode, setMode] = useState<EntryMode>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<SessionPlanRow[]>([blankSessionPlanRow()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback((key: ListKey, request: (signal: AbortSignal) => Promise<CurriculumOption[] | StudioSession[]>) => {
    const controller = new AbortController();
    setLoading((state) => ({ ...state, [key]: true }));
    setErrors((state) => ({ ...state, [key]: undefined }));
    request(controller.signal).then((items) => setLists((state) => ({ ...state, [key]: items }))).catch((error) => {
      const message = setupErrorMessage(error);
      if (message) setErrors((state) => ({ ...state, [key]: message }));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading((state) => ({ ...state, [key]: false }));
    });
    return () => controller.abort();
  }, []);

  useEffect(() => load('boards', studioSetupApi.boards), [load, retry.boards]);
  useEffect(() => selection.boardId ? load('programs', (signal) => studioSetupApi.programs(selection.boardId!, signal)) : undefined, [load, retry.programs, selection.boardId]);
  useEffect(() => selection.programId ? load('grades', (signal) => studioSetupApi.grades(selection.programId!, signal)) : undefined, [load, retry.grades, selection.programId]);
  useEffect(() => selection.gradeId ? load('subjects', (signal) => studioSetupApi.subjects(selection.gradeId!, signal)) : undefined, [load, retry.subjects, selection.gradeId]);
  useEffect(() => selection.subjectId ? load('chapters', (signal) => studioSetupApi.chapters(selection.subjectId!, signal)) : undefined, [load, retry.chapters, selection.subjectId]);
  useEffect(() => selection.chapterId ? load('topics', (signal) => studioSetupApi.topics(selection.chapterId!, signal)) : undefined, [load, retry.topics, selection.chapterId]);
  useEffect(() => selection.topicId ? load('subtopics', (signal) => studioSetupApi.subtopics(selection.topicId!, signal)) : undefined, [load, retry.subtopics, selection.topicId]);
  useEffect(() => selection.subtopicId ? load('sessions', (signal) => studioSetupApi.sessions(selection.subtopicId!, signal)) : undefined, [load, retry.sessions, selection.subtopicId]);

  const fields = useMemo(() => [
    ['Board', 'boardId', 'boards', true], ['Program', 'programId', 'programs', !!selection.boardId],
    ['Grade', 'gradeId', 'grades', !!selection.programId], ['Subject', 'subjectId', 'subjects', !!selection.gradeId],
    ['Chapter', 'chapterId', 'chapters', !!selection.subjectId], ['Topic', 'topicId', 'topics', !!selection.chapterId],
    ['Subtopic', 'subtopicId', 'subtopics', !!selection.topicId],
  ] as const, [selection]);

  const change = (key: SelectionKey, value: number | null) => {
    setSelection((state) => changeSelection(state, key, value));
    const index = listOrder.indexOf(key.replace('Id', 's') as ListKey);
    setLists((state) => listOrder.reduce<Lists>((next, item, itemIndex) => ({ ...next, [item]: itemIndex > index ? [] : state[item] }), blankLists()));
    setFile(null); setSaveError(''); setSuccess('');
  };

  const save = async () => {
    if (!selection.subtopicId || saving) return;
    setSaving(true); setSaveError(''); setSuccess('');
    try {
      let sessionId = (lists.sessions as StudioSession[])[0]?.id ?? null;
      if (!sessionId) {
        const subtopic = (lists.subtopics as CurriculumOption[]).find((item) => item.id === selection.subtopicId);
        const created = await studioSetupApi.createSession(selection.subtopicId, {
          session_number: 1,
          title: `${optionLabel(subtopic ?? { id: selection.subtopicId })} Session Plan`,
          description: 'Created automatically from the Session Plan page',
        });
        sessionId = created.id;
        setLists((state) => ({ ...state, sessions: [created] }));
        setSelection((state) => changeSelection(state, 'sessionId', created.id));
      }
      if (mode === 'upload') {
        if (!file) return;
        await uploadSessionPlan(sessionId, file);
        setFile(null);
        setSuccess('Session Plan uploaded successfully. A new immutable revision was created.');
      } else {
        await saveManualSessionPlan(sessionId, rows);
        setSuccess('Manual Session Plan saved successfully. A new immutable revision was created.');
      }
    } catch (error) {
      setSaveError(setupErrorMessage(error));
    } finally { setSaving(false); }
  };

  const updateRow = (id: string, key: Exclude<keyof SessionPlanRow, 'id'>, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
    setSaveError(''); setSuccess('');
  };

  const manualHasContent = rows.some((row) => manualFields.some(({ key }) => row[key].trim()));

  return (
    <TeachingStudioShell title="Session Plan" subtitle="Upload a Session Plan or add its content manually.">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Select curriculum</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">Select the curriculum path that owns this Session Plan.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map(([label, selectionKey, listKey, enabled]) => (
              <label key={selectionKey} className="text-sm font-medium text-slate-700">
                {label}
                <select value={selection[selectionKey] ?? ''} disabled={!enabled || loading[listKey]} onChange={(event) => change(selectionKey, event.target.value ? Number(event.target.value) : null)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100">
                  <option value="">{loading[listKey] ? 'Loading...' : `Select ${label}`}</option>
                  {lists[listKey].map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
                </select>
                {errors[listKey] ? <span className="mt-1 flex gap-2 text-xs text-red-700">{errors[listKey]} <button type="button" className="underline" onClick={() => setRetry((state) => ({ ...state, [listKey]: (state[listKey] ?? 0) + 1 }))}>Retry</button></span> : null}
                {!loading[listKey] && !errors[listKey] && enabled && lists[listKey].length === 0 ? <span className="mt-1 block text-xs text-amber-700">No {label.toLowerCase()} are available.</span> : null}
              </label>
            ))}
          </div>
        </section>

        {selection.subtopicId ? (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {loading.sessions ? <p className="mb-4 text-sm text-slate-500">Preparing Session Plan...</p> : null}
            {errors.sessions ? <p className="mb-4 text-sm text-red-700">{errors.sessions} <button type="button" className="font-semibold underline" onClick={() => setRetry((state) => ({ ...state, sessions: (state.sessions ?? 0) + 1 }))}>Retry</button></p> : null}
            <div className="mb-5 flex flex-wrap gap-2">
              <button type="button" disabled={loading.sessions || !!errors.sessions} onClick={() => { setMode('upload'); setSaveError(''); setSuccess(''); }} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${mode === 'upload' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>Upload Session Plan</button>
              <button type="button" disabled={loading.sessions || !!errors.sessions} onClick={() => { setMode('manual'); setSaveError(''); setSuccess(''); }} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${mode === 'manual' ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>Add Manually</button>
            </div>

            {mode === 'upload' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">Session Plan file<input type="file" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setSaveError(''); setSuccess(''); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
                <p className="mt-2 text-xs text-slate-500">Maximum file size: 25 MB. Uploading again creates a new revision.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {rows.map((row, index) => (
                  <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-slate-900">Plan row {index + 1}</h3><button type="button" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="text-sm font-semibold text-red-600 disabled:opacity-40">Remove</button></div>
                    <div className="grid gap-4 md:grid-cols-2">{manualFields.map(({ key, label }) => <label key={key} className={`text-sm font-medium text-slate-700 ${['learning_objective_evidence', 'teacher_action_todo', 'narration_dialogue_cue', 'student_action_reflection', 'remarks_assessment'].includes(key) ? 'md:col-span-2' : ''}`}>{label}<textarea value={row[key]} onChange={(event) => updateRow(row.id, key, event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" /></label>)}</div>
                  </article>
                ))}
                <button type="button" onClick={() => setRows((current) => [...current, blankSessionPlanRow()])} className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700">Add plan row</button>
              </div>
            )}

            {saveError ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p> : null}
            {success ? <p role="status" className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p> : null}
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => void save()} disabled={saving || loading.sessions || !!errors.sessions || (mode === 'upload' ? !file : !manualHasContent)} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving...' : mode === 'upload' ? 'Upload Session Plan' : 'Save Manual Session Plan'}</button></div>
          </section>
        ) : <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Select a Subtopic to upload or manually add its Session Plan.</section>}
      </div>
    </TeachingStudioShell>
  );
}
