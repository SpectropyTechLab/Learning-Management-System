import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeachingStudioShell from '../components/TeachingStudioShell';
import { setupErrorMessage, studioSetupApi } from '../api/studioSetupApi';
import type { CurriculumOption, StudioScript, StudioSession } from '../api/studioSetupApi';
import { changeSelection, emptyStudioSelection } from './selectionState';
import type { SelectionKey } from './selectionState';

type ListKey = 'boards' | 'programs' | 'grades' | 'subjects' | 'chapters' | 'topics' | 'subtopics' | 'sessions';
type Lists = Record<ListKey, CurriculumOption[] | StudioSession[]>;
const blankLists = (): Lists => ({ boards: [], programs: [], grades: [], subjects: [], chapters: [], topics: [], subtopics: [], sessions: [] });
const listOrder: ListKey[] = ['boards', 'programs', 'grades', 'subjects', 'chapters', 'topics', 'subtopics', 'sessions'];

const optionLabel = (option: CurriculumOption) => option.name ?? option.title ?? (option.grade_number ? `Grade ${option.grade_number}` : `Item ${option.id}`);

interface SelectBoxProps {
  label: string;
  value: number | null;
  options: Array<CurriculumOption | StudioSession>;
  disabled: boolean;
  loading: boolean;
  error?: string;
  onChange: (value: number | null) => void;
  onRetry: () => void;
}

function SelectBox({ label, value, options, disabled, loading, error, onChange, onRetry }: SelectBoxProps) {
  return <div>
    <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
    <select aria-label={label} value={value ?? ''} disabled={disabled || loading} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100">
      <option value="">{loading ? 'Loading…' : `Select ${label}`}</option>
      {options.map((item) => <option key={item.id} value={item.id}>{'session_number' in item ? `Session ${item.session_number}: ${item.title}` : optionLabel(item)}</option>)}
    </select>
    {error && <div className="mt-1 flex items-center gap-2 text-sm text-red-700"><span>{error}</span><button type="button" className="underline" onClick={onRetry}>Retry</button></div>}
    {!loading && !error && !disabled && options.length === 0 && <p className="mt-1 text-sm text-amber-700">No {label.toLowerCase()} are available.</p>}
  </div>;
}

export default function StudioSessionSetupPage() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState(emptyStudioSelection);
  const [lists, setLists] = useState<Lists>(blankLists);
  const [loading, setLoading] = useState<Partial<Record<ListKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<ListKey, string>>>({});
  const [retry, setRetry] = useState<Partial<Record<ListKey, number>>>({});
  const [scripts, setScripts] = useState<StudioScript[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [scriptsError, setScriptsError] = useState('');
  const [scriptsRetry, setScriptsRetry] = useState(0);

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
  useEffect(() => {
    setScripts([]);
    setSelectedScriptId(null);
    setScriptsError('');
    if (!selection.sessionId) return undefined;
    const controller = new AbortController();
    setScriptsLoading(true);
    studioSetupApi.scripts(selection.sessionId, controller.signal)
      .then(setScripts)
      .catch((error) => {
        const message = setupErrorMessage(error);
        if (message) setScriptsError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setScriptsLoading(false);
      });
    return () => controller.abort();
  }, [scriptsRetry, selection.sessionId]);

  const change = (key: SelectionKey, value: number | null) => {
    setSelection((state) => changeSelection(state, key, value));
    const index = listOrder.indexOf(key.replace('Id', 's') as ListKey);
    setLists((state) => listOrder.reduce<Lists>((next, item, itemIndex) => ({ ...next, [item]: itemIndex > index ? [] : state[item] }), blankLists()));
    setScripts([]);
    setSelectedScriptId(null);
    setScriptsError('');
  };

  const fields = useMemo(() => [
    ['Board', 'boardId', 'boards', true], ['Program', 'programId', 'programs', !!selection.boardId],
    ['Grade', 'gradeId', 'grades', !!selection.programId], ['Subject', 'subjectId', 'subjects', !!selection.gradeId],
    ['Chapter', 'chapterId', 'chapters', !!selection.subjectId], ['Topic', 'topicId', 'topics', !!selection.chapterId],
    ['Subtopic', 'subtopicId', 'subtopics', !!selection.topicId], ['Studio Session', 'sessionId', 'sessions', !!selection.subtopicId],
  ] as const, [selection]);

  return <TeachingStudioShell title="Teaching Studio" subtitle="Choose the curriculum, Session and Studio Script to open.">
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Curriculum selection</h2>
        <p className="mb-5 mt-1 text-sm text-slate-600">Changing a parent clears every selection below it.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map(([label, selectionKey, listKey, enabled]) => <SelectBox key={selectionKey} label={label} value={selection[selectionKey]} options={lists[listKey]} disabled={!enabled} loading={!!loading[listKey]} error={errors[listKey]} onChange={(value) => change(selectionKey, value)} onRetry={() => setRetry((state) => ({ ...state, [listKey]: (state[listKey] ?? 0) + 1 }))} />)}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Studio Script</label>
            <select value={selectedScriptId ?? ''} disabled={!selection.sessionId || scriptsLoading} onChange={(event) => setSelectedScriptId(event.target.value ? Number(event.target.value) : null)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100">
              <option value="">{scriptsLoading ? 'Loading...' : 'Select Studio Script'}</option>
              {scripts.map((script) => <option key={script.id} value={script.id}>{script.name} — Revision {script.revision_no}{script.is_current ? ' (Current)' : ''}</option>)}
            </select>
            {scriptsError ? <div className="mt-1 flex gap-2 text-sm text-red-700"><span>{scriptsError}</span><button type="button" className="underline" onClick={() => setScriptsRetry((value) => value + 1)}>Retry</button></div> : null}
            {!scriptsLoading && !scriptsError && selection.sessionId && scripts.length === 0 ? <p className="mt-1 text-sm text-amber-700">No Studio Scripts are available. Add one from Script Plan.</p> : null}
          </div>
        </div>
      </section>
      {selection.sessionId && selectedScriptId ? <div className="flex justify-end"><button type="button" onClick={() => navigate(`/content-authorizer/studio/sessions/${selection.sessionId}?script=${selectedScriptId}`)} className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white">Open Studio</button></div> : null}
    </div>
  </TeachingStudioShell>;
}
