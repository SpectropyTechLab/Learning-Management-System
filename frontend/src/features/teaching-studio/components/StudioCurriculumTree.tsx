import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  GraduationCap,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  School,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import type { StudioSelection } from '../setup/selectionState';
import { emptyStudioSelection } from '../setup/selectionState';
import {
  setupErrorMessage,
  studioSetupApi,
  type CurriculumLevel,
  type CurriculumOption,
  type StudioSession,
} from '../api/studioSetupApi';
import { splitTaxonomyValues, studioTaxonomyApi, taxonomyValueCode } from '../api/studioTaxonomyApi';
import type { StudioTaxonomyGroups, StudioTaxonomyTerm, StudioTaxonomyType } from '../api/studioTaxonomyApi';

type TreeLevel = CurriculumLevel | 'session';
type TreeItem = CurriculumOption | StudioSession;

const levels: TreeLevel[] = [
  'board', 'program', 'grade', 'subject', 'chapter', 'topic', 'subtopic', 'session',
];
const selectionKeys: Record<TreeLevel, keyof StudioSelection> = {
  board: 'boardId', program: 'programId', grade: 'gradeId', subject: 'subjectId',
  chapter: 'chapterId', topic: 'topicId', subtopic: 'subtopicId', session: 'sessionId',
};
const labels: Record<TreeLevel, string> = {
  board: 'Board', program: 'Program', grade: 'Grade', subject: 'Subject',
  chapter: 'Chapter', topic: 'Topic', subtopic: 'Subtopic', session: 'Session',
};
const badgeClasses: Record<TreeLevel, string> = {
  board: 'bg-indigo-50 text-indigo-700', program: 'bg-sky-50 text-sky-700',
  grade: 'bg-violet-50 text-violet-700', subject: 'bg-cyan-50 text-cyan-700',
  chapter: 'bg-blue-50 text-blue-700', topic: 'bg-amber-50 text-amber-700',
  subtopic: 'bg-emerald-50 text-emerald-700', session: 'bg-slate-100 text-slate-600',
};

const nextLevel = (level: TreeLevel) => levels[levels.indexOf(level) + 1] ?? null;
const listKey = (level: TreeLevel, parentId: number | null) => `${level}:${parentId ?? 'root'}`;
const nodeKey = (level: TreeLevel, id: number) => `${level}:${id}`;
const itemName = (level: TreeLevel, item: TreeItem) => {
  if (level === 'session') return (item as StudioSession).title;
  if (level === 'grade') return `Grade ${(item as CurriculumOption).grade_number}`;
  return (item as CurriculumOption).name || (item as CurriculumOption).title || `Untitled ${labels[level]}`;
};
const LevelIcon = ({ level }: { level: TreeLevel }) => {
  const Icon = level === 'board' ? School
    : level === 'program' || level === 'grade' ? GraduationCap
      : level === 'chapter' ? BookOpen
        : level === 'session' ? FileText
          : Layers3;
  return <Icon size={16} />;
};

interface AddState {
  level: TreeLevel;
  parentId: number | null;
  parentLevel: TreeLevel | null;
  path: StudioSelection;
}

interface EditState {
  level: TreeLevel;
  item: TreeItem;
  parentId: number | null;
  path: StudioSelection;
  name: string;
  description: string;
}

interface Props {
  initialSelection?: StudioSelection;
  refreshToken?: number;
  selection: StudioSelection;
  onChange: (selection: StudioSelection) => void;
  onManageChapter: (chapterId: number, selection: StudioSelection) => void;
  onOpenSession: (sessionId: number) => void;
}

export default function StudioCurriculumTree({
  initialSelection,
  refreshToken,
  selection,
  onChange,
  onManageChapter,
  onOpenSession,
}: Props) {
  const [lists, setLists] = useState<Record<string, TreeItem[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [addState, setAddState] = useState<AddState | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [topicPedagogy, setTopicPedagogy] = useState('');
  const [topicBloom, setTopicBloom] = useState('');
  const [topicExams, setTopicExams] = useState('');
  const [taxonomyTerms, setTaxonomyTerms] = useState<StudioTaxonomyTerm[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async (level: TreeLevel, parentId: number | null) => {
    if (level === 'board') return studioSetupApi.boards();
    if (!parentId) return [];
    if (level === 'program') return studioSetupApi.programs(parentId);
    if (level === 'grade') return studioSetupApi.grades(parentId);
    if (level === 'subject') return studioSetupApi.subjects(parentId);
    if (level === 'chapter') return studioSetupApi.chapters(parentId);
    if (level === 'topic') return studioSetupApi.topics(parentId);
    if (level === 'subtopic') return studioSetupApi.subtopics(parentId);
    return studioSetupApi.sessions(parentId);
  }, []);

  const load = useCallback(async (level: TreeLevel, parentId: number | null, force = false) => {
    const key = listKey(level, parentId);
    if (!force && lists[key]) return lists[key];
    setLoading((current) => new Set(current).add(key));
    try {
      const items = await fetchList(level, parentId);
      setLists((current) => ({ ...current, [key]: items }));
      return items;
    } catch (error) {
      toast.error(setupErrorMessage(error));
      return [];
    } finally {
      setLoading((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, [fetchList, lists]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      setLists({});
      setExpanded(new Set());
      setAddState(null);
      setEditState(null);
      await load('board', null, true);
      if (!active || !initialSelection?.boardId) return;
      for (let index = 0; index < levels.length - 1; index += 1) {
        const level = levels[index];
        const id = initialSelection[selectionKeys[level]];
        if (!id) break;
        setExpanded((current) => new Set(current).add(nodeKey(level, id)));
        const child = levels[index + 1];
        await load(child, id, true);
      }
    };
    void hydrate();
    return () => { active = false; };
    // refreshToken intentionally reloads the tree after a bulk import.
  }, [refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (level: TreeLevel, id: number) => {
    const key = nodeKey(level, id);
    if (expanded.has(key)) {
      setExpanded((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      return;
    }
    setExpanded((current) => new Set(current).add(key));
    const child = nextLevel(level);
    if (child) await load(child, id);
  };

  const beginAdd = (state: AddState) => {
    setEditState(null);
    setAddState(state);
    setName('');
    setCode('');
    setDescription('');
    setTopicPedagogy('');
    setTopicBloom('');
    setTopicExams('');
    if (state.level === 'topic' && !taxonomyTerms.length) {
      void studioTaxonomyApi.list().then(setTaxonomyTerms).catch(() => setTaxonomyTerms([]));
    }
  };

  const saveTopicTaxonomy = async (topicId: number) => {
    const values: Record<StudioTaxonomyType, string[]> = {
      pedagogy: splitTaxonomyValues(topicPedagogy),
      bloom: splitTaxonomyValues(topicBloom),
      target_exam: splitTaxonomyValues(topicExams),
    };
    const available = [...taxonomyTerms];
    for (const [type, entries] of Object.entries(values) as Array<[StudioTaxonomyType, string[]]>) {
      for (const entry of entries) {
        if (!available.some((term) => term.type === type && term.code === taxonomyValueCode(entry))) {
          available.push(await studioTaxonomyApi.create(type, entry));
        }
      }
    }
    const payload = Object.fromEntries(
      (Object.keys(values) as StudioTaxonomyType[]).map((type) => [
        type,
        available.filter((term) => term.type === type && values[type].some((value) => taxonomyValueCode(value) === term.code)),
      ]),
    ) as StudioTaxonomyGroups;
    await studioTaxonomyApi.saveTopic(topicId, payload);
  };

  const createItem = async () => {
    if (!addState || !name.trim()) return;
    if (addState.level === 'grade' && !Number.isInteger(Number(name.replace(/^Grade\s+/i, '').trim()))) {
      toast.error('Enter a valid Grade number.');
      return;
    }
    setSaving(true);
    try {
      if (addState.level === 'session') {
        await studioSetupApi.createSession(addState.parentId!, {
          title: name.trim(),
          description: description.trim() || undefined,
        });
      } else {
        const siblings = lists[listKey(addState.level, addState.parentId)] ?? [];
        const orderField = addState.level === 'chapter' ? 'chapter_number'
          : addState.level === 'topic' ? 'topic_number'
            : addState.level === 'subtopic' ? 'display_order'
              : null;
        const nextOrder = orderField
          ? Math.max(0, ...siblings.map((item) => Number((item as CurriculumOption)[orderField]) || 0)) + 1
          : 1;
        const created = await studioSetupApi.createHierarchyChild({
          level: addState.level,
          parentId: addState.parentId,
          name: name.trim(),
          code: code.trim(),
          order: addState.level === 'grade'
            ? Number(name.replace(/^Grade\s+/i, '').trim())
            : nextOrder,
        });
        if (addState.level === 'topic' && (topicPedagogy || topicBloom || topicExams)) {
          const payload = created as { data?: { id?: number }; id?: number };
          const topicId = Number(payload.data?.id ?? payload.id);
          if (topicId) await saveTopicTaxonomy(topicId);
        }
      }
      await load(addState.level, addState.parentId, true);
      if (addState.parentLevel && addState.parentId) {
        setExpanded((current) => new Set(current).add(nodeKey(addState.parentLevel!, addState.parentId!)));
      }
      toast.success(`${labels[addState.level]} created successfully.`);
      setAddState(null);
    } catch (error) {
      toast.error(getApiErrorDetails(error).message);
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (level: TreeLevel, item: TreeItem, parentId: number | null, path: StudioSelection) => {
    setAddState(null);
    setEditState({
      level,
      item,
      parentId,
      path,
      name: level === 'grade' ? String((item as CurriculumOption).grade_number ?? '') : itemName(level, item),
      description: String(('description' in item && item.description) || ''),
    });
    setTopicPedagogy('');
    setTopicBloom('');
    setTopicExams('');
    if (level === 'topic') {
      setTaxonomyLoading(true);
      void Promise.all([studioTaxonomyApi.list(), studioTaxonomyApi.topic(item.id)])
        .then(([terms, groups]) => {
          setTaxonomyTerms(terms);
          setTopicPedagogy(groups.pedagogy.map((term) => term.label).join(', '));
          setTopicBloom(groups.bloom.map((term) => term.label).join(', '));
          setTopicExams(groups.target_exam.map((term) => term.label).join(', '));
        })
        .catch((error) => toast.error(getApiErrorDetails(error).message))
        .finally(() => setTaxonomyLoading(false));
    }
  };

  const changeEditAncestor = (ancestorLevel: TreeLevel, rawId: string) => {
    if (!editState) return;
    const ancestorIndex = levels.indexOf(ancestorLevel);
    const itemIndex = levels.indexOf(editState.level);
    const nextPath = { ...editState.path };
    for (let index = ancestorIndex; index < itemIndex; index += 1) {
      nextPath[selectionKeys[levels[index]]] = index === ancestorIndex && rawId ? Number(rawId) : null;
    }
    setEditState({ ...editState, path: nextPath });
    const selectedId = Number(rawId);
    const child = nextLevel(ancestorLevel);
    if (selectedId && child && levels.indexOf(child) < itemIndex) void load(child, selectedId);
  };

  const saveEdit = async () => {
    if (!editState?.name.trim()) return;
    const { level, item, parentId, path } = editState;
    const parentLevel = levels[levels.indexOf(level) - 1];
    const nextParentId = level === 'board' ? null : path[selectionKeys[parentLevel]];
    if (level !== 'board' && !nextParentId) {
      toast.error(`Select a ${labels[parentLevel]}.`);
      return;
    }
    if (level === 'grade' && !Number.isInteger(Number(editState.name))) {
      toast.error('Enter a valid Grade number.');
      return;
    }
    const parentFields: Partial<Record<TreeLevel, string>> = {
      program: 'board_id', grade: 'program_id', subject: 'grade_id', chapter: 'subject_id',
      topic: 'chapter_id', subtopic: 'topic_id', session: 'subtopic_id',
    };
    setSaving(true);
    try {
      if (level === 'session') {
        await studioSetupApi.updateSession(item as StudioSession, {
          title: editState.name.trim(),
          description: editState.description.trim() || null,
          subtopic_id: nextParentId!,
        });
      } else {
        const body: Record<string, unknown> = level === 'grade'
          ? { grade_number: Number(editState.name) }
          : { name: editState.name.trim() };
        if (parentFields[level] && nextParentId) body[parentFields[level]!] = nextParentId;
        if (level === 'subject' || level === 'subtopic') {
          body.description = editState.description.trim() || null;
        }
        await studioSetupApi.updateHierarchyItem(level, item.id, body);
        if (level === 'topic') await saveTopicTaxonomy(item.id);
      }
      await Promise.all([
        load(level, parentId, true),
        parentId !== nextParentId ? load(level, nextParentId, true) : Promise.resolve([]),
      ]);
      onChange(emptyStudioSelection());
      setEditState(null);
      toast.success(`${labels[level]} updated successfully.`);
    } catch (error) {
      toast.error(getApiErrorDetails(error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (level: TreeLevel, item: TreeItem, parentId: number | null) => {
    const child = nextLevel(level);
    if (child) {
      try {
        const children = await fetchList(child, item.id);
        if (level === 'subtopic') {
          const publishedSession = (children as StudioSession[]).some((session) => session.status === 'published');
          if (publishedSession) {
            toast.error('This Subtopic contains a published Session. Unpublish it before deleting the Subtopic.');
            return;
          }
        } else if (children.length) {
          toast.error(`Delete the ${labels[child]} items inside this ${labels[level]} first.`);
          return;
        }
      } catch (error) {
        toast.error(getApiErrorDetails(error).message);
        return;
      }
    }
    const warning = level === 'session'
      ? `Delete “${itemName(level, item)}” and its Session plan, scripts, and screens?`
      : level === 'subtopic'
        ? `Delete the Subtopic “${itemName(level, item)}” and all of its unpublished Sessions, plans, scripts, and screens?`
      : `Delete the empty ${labels[level]} “${itemName(level, item)}”?`;
    if (!window.confirm(warning)) return;
    setSaving(true);
    try {
      if (level === 'session') await studioSetupApi.deleteSession(item.id);
      else await studioSetupApi.deleteHierarchyItem(level, item.id);
      await load(level, parentId, true);
      onChange(emptyStudioSelection());
      toast.success(`${labels[level]} deleted successfully.`);
    } catch (error) {
      toast.error(getApiErrorDetails(error).message);
    } finally {
      setSaving(false);
    }
  };

  const renderEditModal = () => {
    if (!editState) return null;
    const itemIndex = levels.indexOf(editState.level);
    const ancestorLevels = levels.slice(0, itemIndex);
    const supportsDescription = ['subject', 'subtopic', 'session'].includes(editState.level);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={() => { if (!saving) setEditState(null); }}>
        <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="curriculum-edit-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div><h2 id="curriculum-edit-title" className="text-base font-bold text-slate-950">Edit {labels[editState.level]}</h2><p className="mt-0.5 text-xs text-slate-500">Update its details or select a different parent in the curriculum hierarchy.</p></div>
            <button type="button" disabled={saving} onClick={() => setEditState(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40" aria-label="Close edit popup">×</button>
          </header>
          <div className="p-5">
            <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            {editState.level === 'grade' ? 'Grade number' : `${labels[editState.level]} name`}
            <input autoFocus type={editState.level === 'grade' ? 'number' : 'text'} min={editState.level === 'grade' ? 1 : undefined} value={editState.name} onChange={(event) => setEditState({ ...editState, name: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-800" />
          </label>
          {ancestorLevels.map((ancestorLevel, index) => {
            const previousLevel = levels[index - 1];
            const parentOfAncestor = index === 0 ? null : editState.path[selectionKeys[previousLevel]];
            const options = lists[listKey(ancestorLevel, parentOfAncestor)] ?? [];
            const value = editState.path[selectionKeys[ancestorLevel]] ?? '';
            return (
              <label key={ancestorLevel} className="text-xs font-semibold text-slate-700">
                {labels[ancestorLevel]}
                <select value={value} disabled={index > 0 && !parentOfAncestor} onChange={(event) => changeEditAncestor(ancestorLevel, event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-800 disabled:bg-slate-100">
                  <option value="">Select {labels[ancestorLevel]}</option>
                  {options.map((option) => <option key={option.id} value={option.id}>{itemName(ancestorLevel, option)}</option>)}
                </select>
              </label>
            );
          })}
              {supportsDescription && <label className="text-xs font-semibold text-slate-700 md:col-span-2">Description <span className="font-normal text-slate-400">(optional)</span><textarea rows={3} value={editState.description} onChange={(event) => setEditState({ ...editState, description: event.target.value })} className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-800" /></label>}
            </div>
            {editState.level === 'topic' && <div className="mt-3 grid gap-3 md:grid-cols-3"><label className="text-xs font-semibold text-slate-700">Pedagogy<input disabled={taxonomyLoading} value={topicPedagogy} onChange={(event) => setTopicPedagogy(event.target.value)} placeholder="Comma-separated values" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-100" /></label><label className="text-xs font-semibold text-slate-700">Bloom level<input disabled={taxonomyLoading} value={topicBloom} onChange={(event) => setTopicBloom(event.target.value)} placeholder="Comma-separated values" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-100" /></label><label className="text-xs font-semibold text-slate-700">Target exam<input disabled={taxonomyLoading} value={topicExams} onChange={(event) => setTopicExams(event.target.value)} placeholder="Comma-separated values" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-100" /></label></div>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button type="button" disabled={saving} onClick={() => setEditState(null)} className="h-9 rounded-md px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="button" disabled={saving || taxonomyLoading || !editState.name.trim()} onClick={() => void saveEdit()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-900 px-4 text-xs font-semibold text-white disabled:opacity-40"><Check size={14} /> Save changes</button>
          </footer>
        </section>
      </div>
    );
  };

  const renderAddForm = (depth: number) => {
    if (!addState) return null;
    const needsCode = ['board', 'program', 'subject'].includes(addState.level);
    return (
      <div className="border-b border-slate-200 bg-blue-50/50 py-3 pr-3" style={{ paddingLeft: depth * 24 + 36 }}>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-52 flex-1 text-xs font-semibold text-slate-700">
            {addState.level === 'grade' ? 'Grade number' : `${labels[addState.level]} name`}
            <input autoFocus type={addState.level === 'grade' ? 'number' : 'text'} min={addState.level === 'grade' ? 1 : undefined} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createItem(); }} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-800" />
          </label>
          {needsCode && <label className="w-44 text-xs font-semibold text-slate-700">Code<input value={code} onChange={(event) => setCode(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-800" /></label>}
          {addState.level === 'session' && <label className="min-w-56 flex-1 text-xs font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span><input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-800" /></label>}
          <button type="button" disabled={saving || !name.trim()} onClick={() => void createItem()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-900 px-3 text-xs font-semibold text-white disabled:opacity-40"><Check size={14} /> Create</button>
          <button type="button" disabled={saving} onClick={() => setAddState(null)} className="h-9 px-2 text-xs font-semibold text-slate-600">Cancel</button>
        </div>
        {addState.level === 'topic' && <div className="mt-2 grid gap-2 md:grid-cols-3"><input value={topicPedagogy} onChange={(event) => setTopicPedagogy(event.target.value)} placeholder="Pedagogy (optional)" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs" /><input value={topicBloom} onChange={(event) => setTopicBloom(event.target.value)} placeholder="Bloom levels (optional)" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs" /><input value={topicExams} onChange={(event) => setTopicExams(event.target.value)} placeholder="Target exams (optional)" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs" /></div>}
      </div>
    );
  };

  const renderLevel = (
    level: TreeLevel,
    parentId: number | null,
    parentLevel: TreeLevel | null,
    parentPath: StudioSelection,
    depth: number,
  ) => {
    const key = listKey(level, parentId);
    const items = lists[key] ?? [];
    if (loading.has(key) && !items.length) return <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm text-slate-500" style={{ paddingLeft: depth * 24 + 12 }}><Loader2 size={15} className="animate-spin" /> Loading {labels[level].toLowerCase()}s…</div>;
    if (!items.length) return <div className="border-b border-slate-200 py-3 text-xs text-slate-500" style={{ paddingLeft: depth * 24 + 36 }}>No {labels[level].toLowerCase()}s yet.</div>;
    return items.map((item) => {
      const id = Number(item.id);
      const keyName = selectionKeys[level];
      const path = { ...parentPath, [keyName]: id };
      const child = nextLevel(level);
      const isExpanded = expanded.has(nodeKey(level, id));
      const selected = selection[keyName] === id;
      const canEdit = level === 'session' || (item as CurriculumOption).canEdit === true;
      const canDelete = level === 'session' || (item as CurriculumOption).canDelete === true;
      return (
        <div key={nodeKey(level, id)}>
          <div className={`group flex min-h-11 items-center border-b border-slate-200 pr-3 transition ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`} style={{ paddingLeft: depth * 24 + 8 }} onClick={() => onChange(path)}>
            <span className="mr-1 w-[15px]" />
            {child ? <button type="button" onClick={(event) => { event.stopPropagation(); void toggle(level, id); }} className="mr-1 grid h-7 w-7 place-items-center text-slate-500" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${itemName(level, item)}`}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button> : <span className="mr-1 h-7 w-7" />}
            <span className="mr-2 text-slate-500"><LevelIcon level={level} /></span>
            <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{itemName(level, item)}</span>
            <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClasses[level]}`}>{labels[level]}</span>
            <div className="ml-auto flex items-center gap-1 pl-2 opacity-70 group-hover:opacity-100">
              {canEdit && <button type="button" onClick={(event) => { event.stopPropagation(); beginEdit(level, item, parentId, path); }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white hover:text-blue-900"><Pencil size={13} /> Edit</button>}
              {level === 'chapter' && <button type="button" onClick={(event) => { event.stopPropagation(); onManageChapter(id, path); }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-blue-900 hover:bg-white"><FileText size={13} /> Curriculum document</button>}
              {child && canEdit && <button type="button" onClick={(event) => { event.stopPropagation(); setExpanded((current) => new Set(current).add(nodeKey(level, id))); void load(child, id); beginAdd({ level: child, parentId: id, parentLevel: level, path }); }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-blue-900 hover:bg-white"><Plus size={13} /> Add {labels[child]}</button>}
              {level === 'session' && <button type="button" onClick={(event) => { event.stopPropagation(); onOpenSession(id); }} className="rounded px-2 py-1 text-xs font-semibold text-blue-900 hover:bg-white">Open</button>}
              {canDelete && <button type="button" disabled={saving} onClick={(event) => { event.stopPropagation(); void deleteItem(level, item, parentId); }} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 size={13} /> Delete</button>}
            </div>
          </div>
          {addState?.parentLevel === level && addState.parentId === id && renderAddForm(depth + 1)}
          {child && isExpanded && renderLevel(child, id, level, path, depth + 1)}
        </div>
      );
    });
  };

  const rootPath = emptyStudioSelection();
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-3">
        <div><h2 className="text-sm font-bold text-slate-950">Curriculum hierarchy</h2><p className="text-xs text-slate-500">Expand a row to manage its child levels.</p></div>
        <button type="button" onClick={() => beginAdd({ level: 'board', parentId: null, parentLevel: null, path: rootPath })} className="inline-flex items-center gap-1.5 rounded-md bg-blue-900 px-3 py-2 text-xs font-semibold text-white"><Plus size={14} /> Add Board</button>
      </div>
      {addState?.level === 'board' && addState.parentLevel === null && renderAddForm(0)}
      {renderLevel('board', null, null, rootPath, 0)}
      {renderEditModal()}
    </section>
  );
}
