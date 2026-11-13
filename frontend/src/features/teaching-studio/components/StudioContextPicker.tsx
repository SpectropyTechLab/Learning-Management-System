import { useCallback, useEffect, useMemo, useState } from 'react';
import { setupErrorMessage, studioSetupApi } from '../api/studioSetupApi';
import type { CurriculumOption, StudioSession } from '../api/studioSetupApi';
import { changeSelection, emptyStudioSelection } from '../setup/selectionState';
import type { SelectionKey, StudioSelection } from '../setup/selectionState';

type ListKey = 'boards' | 'programs' | 'grades' | 'subjects' | 'chapters' | 'topics' | 'subtopics' | 'sessions';
type Lists = Record<ListKey, Array<CurriculumOption | StudioSession>>;
const blankLists = (): Lists => ({ boards: [], programs: [], grades: [], subjects: [], chapters: [], topics: [], subtopics: [], sessions: [] });
const listOrder: ListKey[] = ['boards', 'programs', 'grades', 'subjects', 'chapters', 'topics', 'subtopics', 'sessions'];
const optionLabel = (item: CurriculumOption | StudioSession) => 'session_number' in item ? `Session ${item.session_number}: ${item.title}` : item.name ?? item.title ?? (item.grade_number ? `Grade ${item.grade_number}` : `Item ${item.id}`);

export default function StudioContextPicker({ includeSession = true, initialSelection, onChange }: {
  includeSession?: boolean;
  initialSelection?: StudioSelection;
  onChange: (selection: StudioSelection) => void;
}) {
  const [selection, setSelection] = useState(() => initialSelection ?? emptyStudioSelection());
  const [lists, setLists] = useState<Lists>(blankLists);
  const [loading, setLoading] = useState<Partial<Record<ListKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<ListKey, string>>>({});

  useEffect(() => {
    if (!initialSelection) return;
    setSelection(initialSelection);
    onChange(initialSelection);
  }, [initialSelection, onChange]);

  const load = useCallback((key: ListKey, request: (signal: AbortSignal) => Promise<Array<CurriculumOption | StudioSession>>) => {
    const controller = new AbortController();
    setLoading((state) => ({ ...state, [key]: true })); setErrors((state) => ({ ...state, [key]: undefined }));
    request(controller.signal).then((items) => setLists((state) => ({ ...state, [key]: items }))).catch((error) => {
      const message = setupErrorMessage(error); if (message) setErrors((state) => ({ ...state, [key]: message }));
    }).finally(() => { if (!controller.signal.aborted) setLoading((state) => ({ ...state, [key]: false })); });
    return () => controller.abort();
  }, []);

  useEffect(() => load('boards', studioSetupApi.boards), [load]);
  useEffect(() => selection.boardId ? load('programs', (signal) => studioSetupApi.programs(selection.boardId!, signal)) : undefined, [load, selection.boardId]);
  useEffect(() => selection.programId ? load('grades', (signal) => studioSetupApi.grades(selection.programId!, signal)) : undefined, [load, selection.programId]);
  useEffect(() => selection.gradeId ? load('subjects', (signal) => studioSetupApi.subjects(selection.gradeId!, signal)) : undefined, [load, selection.gradeId]);
  useEffect(() => selection.subjectId ? load('chapters', (signal) => studioSetupApi.chapters(selection.subjectId!, signal)) : undefined, [load, selection.subjectId]);
  useEffect(() => selection.chapterId ? load('topics', (signal) => studioSetupApi.topics(selection.chapterId!, signal)) : undefined, [load, selection.chapterId]);
  useEffect(() => selection.topicId ? load('subtopics', (signal) => studioSetupApi.subtopics(selection.topicId!, signal)) : undefined, [load, selection.topicId]);
  useEffect(() => includeSession && selection.subtopicId ? load('sessions', (signal) => studioSetupApi.sessions(selection.subtopicId!, signal)) : undefined, [includeSession, load, selection.subtopicId]);

  const fields = useMemo(() => [
    ['Board', 'boardId', 'boards', true], ['Program', 'programId', 'programs', !!selection.boardId],
    ['Grade', 'gradeId', 'grades', !!selection.programId], ['Subject', 'subjectId', 'subjects', !!selection.gradeId],
    ['Chapter', 'chapterId', 'chapters', !!selection.subjectId], ['Topic', 'topicId', 'topics', !!selection.chapterId],
    ['Subtopic', 'subtopicId', 'subtopics', !!selection.topicId],
    ...(includeSession ? [['Studio Session', 'sessionId', 'sessions', !!selection.subtopicId] as const] : []),
  ] as const, [includeSession, selection]);

  const change = (key: SelectionKey, value: number | null) => {
    const next = changeSelection(selection, key, value); setSelection(next); onChange(next);
    const listKey = key === 'sessionId' ? 'sessions' : `${key.slice(0, -2)}s` as ListKey;
    const index = listOrder.indexOf(listKey);
    setLists((state) => listOrder.reduce<Lists>((result, item, itemIndex) => ({ ...result, [item]: itemIndex > index ? [] : state[item] }), blankLists()));
  };

  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{fields.map(([label, key, listKey, enabled]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<select value={selection[key] ?? ''} disabled={!enabled || loading[listKey]} onChange={(event) => change(key, event.target.value ? Number(event.target.value) : null)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"><option value="">{loading[listKey] ? 'Loading…' : `Select ${label}`}</option>{lists[listKey].map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select>{errors[listKey] && <span className="mt-1 block text-xs text-red-700">{errors[listKey]}</span>}</label>)}</div>;
}
