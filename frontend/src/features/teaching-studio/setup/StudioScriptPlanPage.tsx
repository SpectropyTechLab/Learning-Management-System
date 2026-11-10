import { useCallback, useEffect, useMemo, useState } from 'react';
import TeachingStudioShell from '../components/TeachingStudioShell';
import { setupErrorMessage, studioSetupApi } from '../api/studioSetupApi';
import type { CurriculumOption, StudioSession } from '../api/studioSetupApi';
import { blankScriptScreen, listStudioLayouts, saveManualScriptPlan, uploadScriptPlan } from '../api/studioScriptPlanApi';
import type { ScriptPlanScreen, StudioLayoutOption } from '../api/studioScriptPlanApi';
import { changeSelection, emptyStudioSelection } from './selectionState';
import type { SelectionKey } from './selectionState';

type ListKey = 'boards' | 'programs' | 'grades' | 'subjects' | 'chapters' | 'topics' | 'subtopics' | 'sessions';
type Lists = Record<ListKey, CurriculumOption[] | StudioSession[]>;
type Mode = 'upload' | 'manual';
const blankLists = (): Lists => ({ boards: [], programs: [], grades: [], subjects: [], chapters: [], topics: [], subtopics: [], sessions: [] });
const order: ListKey[] = ['boards', 'programs', 'grades', 'subjects', 'chapters', 'topics', 'subtopics', 'sessions'];
const labelFor = (item: CurriculumOption | StudioSession) => 'session_number' in item ? `Session ${item.session_number}: ${item.title}` : item.name ?? item.title ?? (item.grade_number ? `Grade ${item.grade_number}` : `Item ${item.id}`);

const textAreas: Array<{ key: keyof ScriptPlanScreen; label: string; hint: string }> = [
  { key: 'pedagogy', label: 'Pedagogy', hint: 'Teaching strategy, sequence and timing instructions' },
  { key: 'visual_animation_interaction_assets', label: 'Visual, animation and interaction assets', hint: 'Required visuals, models, animations and interactions' },
  { key: 'teacher_narration', label: 'Word-for-word teacher narration', hint: 'Exact narration and dialogue cues' },
  { key: 'adaptive_branch_scripts', label: 'Adaptive branch scripts', hint: 'Branch keys, triggers and teacher scripts' },
  { key: 'student_evidence_return_route', label: 'Student evidence and return route', hint: 'Evidence, success condition, retry and return route' },
  { key: 'pyq_examination_extension', label: 'PYQ / examination extension', hint: 'Source, year, question details and verification status' },
  { key: 'teacher_presenter_notes_production_checks', label: 'Teacher presenter notes / production checks', hint: 'Presenter guidance and production checklist' },
];

export default function StudioScriptPlanPage() {
  const [selection, setSelection] = useState(emptyStudioSelection);
  const [lists, setLists] = useState<Lists>(blankLists);
  const [loading, setLoading] = useState<Partial<Record<ListKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<ListKey, string>>>({});
  const [retry, setRetry] = useState<Partial<Record<ListKey, number>>>({});
  const [layouts, setLayouts] = useState<StudioLayoutOption[]>([]);
  const [layoutsError, setLayoutsError] = useState('');
  const [mode, setMode] = useState<Mode>('upload');
  const [planName, setPlanName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [screens, setScreens] = useState<ScriptPlanScreen[]>([blankScriptScreen(1)]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback((key: ListKey, request: (signal: AbortSignal) => Promise<CurriculumOption[] | StudioSession[]>) => {
    const controller = new AbortController();
    setLoading((state) => ({ ...state, [key]: true })); setErrors((state) => ({ ...state, [key]: undefined }));
    request(controller.signal).then((items) => setLists((state) => ({ ...state, [key]: items }))).catch((error) => {
      const message = setupErrorMessage(error); if (message) setErrors((state) => ({ ...state, [key]: message }));
    }).finally(() => { if (!controller.signal.aborted) setLoading((state) => ({ ...state, [key]: false })); });
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
  useEffect(() => { listStudioLayouts().then(setLayouts).catch((error) => setLayoutsError(setupErrorMessage(error))); }, []);

  const fields = useMemo(() => [
    ['Board', 'boardId', 'boards', true], ['Program', 'programId', 'programs', !!selection.boardId],
    ['Grade', 'gradeId', 'grades', !!selection.programId], ['Subject', 'subjectId', 'subjects', !!selection.gradeId],
    ['Chapter', 'chapterId', 'chapters', !!selection.subjectId], ['Topic', 'topicId', 'topics', !!selection.chapterId],
    ['Subtopic', 'subtopicId', 'subtopics', !!selection.topicId], ['Studio Session', 'sessionId', 'sessions', !!selection.subtopicId],
  ] as const, [selection]);

  const change = (key: SelectionKey, value: number | null) => {
    setSelection((state) => changeSelection(state, key, value));
    const index = order.indexOf(key.replace('Id', 's') as ListKey);
    setLists((state) => order.reduce<Lists>((next, item, itemIndex) => ({ ...next, [item]: itemIndex > index ? [] : state[item] }), blankLists()));
    setFile(null); setSaveError(''); setSuccess('');
  };

  const updateScreen = (id: string, key: keyof ScriptPlanScreen, value: string | number | null) => {
    setScreens((current) => current.map((screen) => screen.id === id ? { ...screen, [key]: value } : screen));
    setSaveError(''); setSuccess('');
  };

  const manualValid = screens.length > 0 && screens.every((screen) => screen.screen_name.trim() && Number(screen.duration_minutes) > 0);
  const screenKeysUnique = new Set(screens.map((screen) => screen.screen_key.trim())).size === screens.length;

  const save = async () => {
    if (!selection.sessionId || !planName.trim() || saving) return;
    setSaving(true); setSaveError(''); setSuccess('');
    try {
      if (mode === 'upload') {
        if (!file) return;
        await uploadScriptPlan(selection.sessionId, planName, file); setFile(null);
        setSuccess('Script Plan uploaded successfully. A new immutable revision was created.');
      } else {
        await saveManualScriptPlan(selection.sessionId, planName, screens, layouts);
        setSuccess('Manual Script Plan saved successfully. A new immutable revision was created.');
      }
    } catch (error) { setSaveError(setupErrorMessage(error)); } finally { setSaving(false); }
  };

  return <TeachingStudioShell title="Script Plan" subtitle="Upload a Script Plan or define its Screens manually.">
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Select Studio Session</h2><p className="mb-5 mt-1 text-sm text-slate-600">Select the existing curriculum path and Session that owns this Script Plan.</p>
        <div className="grid gap-4 md:grid-cols-2">{fields.map(([label, selectionKey, listKey, enabled]) => <label key={selectionKey} className="text-sm font-medium text-slate-700">{label}<select value={selection[selectionKey] ?? ''} disabled={!enabled || loading[listKey]} onChange={(event) => change(selectionKey, event.target.value ? Number(event.target.value) : null)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"><option value="">{loading[listKey] ? 'Loading...' : `Select ${label}`}</option>{lists[listKey].map((item) => <option key={item.id} value={item.id}>{labelFor(item)}</option>)}</select>{errors[listKey] ? <span className="mt-1 flex gap-2 text-xs text-red-700">{errors[listKey]} <button type="button" className="underline" onClick={() => setRetry((state) => ({ ...state, [listKey]: (state[listKey] ?? 0) + 1 }))}>Retry</button></span> : null}{!loading[listKey] && !errors[listKey] && enabled && lists[listKey].length === 0 ? <span className="mt-1 block text-xs text-amber-700">No {label.toLowerCase()} are available.</span> : null}</label>)}</div>
      </section>

      {selection.sessionId ? <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">Script Plan name<input value={planName} onChange={(event) => { setPlanName(event.target.value); setSaveError(''); setSuccess(''); }} placeholder="Example: Mirror Mystery Script Plan" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <div className="my-5 flex gap-2"><button type="button" onClick={() => setMode('upload')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'upload' ? 'bg-blue-700 text-white' : 'border bg-white'}`}>Upload Script Plan</button><button type="button" onClick={() => setMode('manual')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === 'manual' ? 'bg-blue-700 text-white' : 'border bg-white'}`}>Add Manually</button></div>
        {mode === 'upload' ? <div><label className="text-sm font-medium text-slate-700">Script Plan file<input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><p className="mt-2 text-xs text-slate-500">Maximum file size: 25 MB. The Script Plan name is used as the stored filename.</p></div> : <div className="space-y-5">
          {layoutsError ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Layouts could not be loaded: {layoutsError}</p> : null}
          {screens.map((screen, index) => <article key={screen.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Screen {index + 1}</h3><button type="button" disabled={screens.length === 1} onClick={() => setScreens((current) => current.filter((item) => item.id !== screen.id))} className="text-sm font-semibold text-red-600 disabled:opacity-40">Remove</button></div><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Screen key<input value={screen.screen_key} onChange={(event) => updateScreen(screen.id, 'screen_key', event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label><label className="text-sm font-medium">Screen name<input value={screen.screen_name} onChange={(event) => updateScreen(screen.id, 'screen_name', event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label><label className="text-sm font-medium">Screen duration (minutes)<input type="number" min="0.1" step="0.1" value={screen.duration_minutes} onChange={(event) => updateScreen(screen.id, 'duration_minutes', event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label><label className="text-sm font-medium">Layout<select value={screen.layout_id ?? ''} onChange={(event) => updateScreen(screen.id, 'layout_id', event.target.value ? Number(event.target.value) : null)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option value="">Select layout</option>{layouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.layout_key} — {layout.name}</option>)}</select></label>{textAreas.map(({ key, label, hint }) => <label key={key} className="text-sm font-medium md:col-span-2">{label}<textarea value={String(screen[key] ?? '')} onChange={(event) => updateScreen(screen.id, key, event.target.value)} placeholder={hint} rows={3} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal" /></label>)}</div></article>)}
          {!screenKeysUnique ? <p className="text-sm text-red-700">Every Screen key must be unique.</p> : null}<button type="button" onClick={() => setScreens((current) => [...current, blankScriptScreen(current.length + 1)])} className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700">Add Screen</button>
        </div>}
        {saveError ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</p> : null}{success ? <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p> : null}
        <div className="mt-6 flex justify-end"><button type="button" onClick={() => void save()} disabled={saving || !planName.trim() || !screenKeysUnique || (mode === 'upload' ? !file : !manualValid)} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : mode === 'upload' ? 'Upload Script Plan' : 'Save Manual Script Plan'}</button></div>
      </section> : <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Select a Studio Session to upload or manually add its Script Plan.</section>}
    </div>
  </TeachingStudioShell>;
}
