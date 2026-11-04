import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, Eye, FileText, Filter, MoreHorizontal, MonitorPlay, RotateCcw, Search, ScrollText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import { listStudioLibrarySessions } from './api/studioSessionLibraryApi';
import type { StudioLibrarySession, StudioSessionStatus } from './api/studioSessionLibraryApi';
import { submitStudioSession, workflowError } from './api/studioWorkflowApi';
import StudioShell from './components/StudioShell';
import { selectionPath } from './setup/selectionState';

const statuses: Array<'all' | StudioSessionStatus> = ['all', 'draft', 'submitted', 'approved', 'rejected', 'published'];
const statusStyle: Record<StudioSessionStatus, string> = {
  draft: 'bg-slate-100 text-slate-700', submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800', rejected: 'bg-red-100 text-red-800',
  published: 'bg-emerald-100 text-emerald-800',
};

const selectionFor = (session: StudioLibrarySession) => ({
  boardId: session.board_id, programId: session.program_id, gradeId: session.grade_id,
  subjectId: session.subject_id, chapterId: session.chapter_id, topicId: session.topic_id,
  subtopicId: session.subtopic_id, sessionId: session.id,
});

type CurriculumFilterKey = 'boardId' | 'programId' | 'gradeId' | 'subjectId' | 'chapterId' | 'topicId' | 'subtopicId';
type CurriculumFilters = Record<CurriculumFilterKey, number | null>;
const emptyCurriculumFilters = (): CurriculumFilters => ({
  boardId: null, programId: null, gradeId: null, subjectId: null,
  chapterId: null, topicId: null, subtopicId: null,
});
const curriculumFilterOrder: CurriculumFilterKey[] = ['boardId', 'programId', 'gradeId', 'subjectId', 'chapterId', 'topicId', 'subtopicId'];
const uniqueOptions = (items: StudioLibrarySession[], idOf: (item: StudioLibrarySession) => number, labelOf: (item: StudioLibrarySession) => string) =>
  [...new Map(items.map((item) => [idOf(item), { id: idOf(item), label: labelOf(item) }])).values()]
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }));

export default function StudioSessionLibraryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<StudioLibrarySession[]>([]);
  const [status, setStatus] = useState<'all' | StudioSessionStatus>('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [curriculumFilters, setCurriculumFilters] = useState<CurriculumFilters>(emptyCurriculumFilters);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setSessions(await listStudioLibrarySessions(status === 'all' ? undefined : status)); }
    catch (requestError) { setError(getApiErrorDetails(requestError).message); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  const curriculumOptions = useMemo(() => {
    const boardSessions = curriculumFilters.boardId ? sessions.filter((item) => item.board_id === curriculumFilters.boardId) : sessions;
    const programSessions = curriculumFilters.programId ? boardSessions.filter((item) => item.program_id === curriculumFilters.programId) : boardSessions;
    const gradeSessions = curriculumFilters.gradeId ? programSessions.filter((item) => item.grade_id === curriculumFilters.gradeId) : programSessions;
    const subjectSessions = curriculumFilters.subjectId ? gradeSessions.filter((item) => item.subject_id === curriculumFilters.subjectId) : gradeSessions;
    const chapterSessions = curriculumFilters.chapterId ? subjectSessions.filter((item) => item.chapter_id === curriculumFilters.chapterId) : subjectSessions;
    const topicSessions = curriculumFilters.topicId ? chapterSessions.filter((item) => item.topic_id === curriculumFilters.topicId) : chapterSessions;
    return {
      boards: uniqueOptions(sessions, (item) => item.board_id, (item) => item.board_name),
      programs: uniqueOptions(boardSessions, (item) => item.program_id, (item) => item.program_name),
      grades: uniqueOptions(programSessions, (item) => item.grade_id, (item) => `Grade ${item.grade_number}`),
      subjects: uniqueOptions(gradeSessions, (item) => item.subject_id, (item) => item.subject_name),
      chapters: uniqueOptions(subjectSessions, (item) => item.chapter_id, (item) => `Chapter ${item.chapter_number}: ${item.chapter_name}`),
      topics: uniqueOptions(chapterSessions, (item) => item.topic_id, (item) => item.topic_name),
      subtopics: uniqueOptions(topicSessions, (item) => item.subtopic_id, (item) => item.subtopic_name),
    };
  }, [curriculumFilters, sessions]);

  const activeFilterCount = Object.values(curriculumFilters).filter(Boolean).length;
  const updateCurriculumFilter = (key: CurriculumFilterKey, value: number | null) => {
    const changedIndex = curriculumFilterOrder.indexOf(key);
    setCurriculumFilters((current) => curriculumFilterOrder.reduce<CurriculumFilters>((next, item, index) => {
      next[item] = index < changedIndex ? current[item] : index === changedIndex ? value : null;
      return next;
    }, emptyCurriculumFilters()));
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sessions.filter((session) => {
      if (curriculumFilters.boardId && session.board_id !== curriculumFilters.boardId) return false;
      if (curriculumFilters.programId && session.program_id !== curriculumFilters.programId) return false;
      if (curriculumFilters.gradeId && session.grade_id !== curriculumFilters.gradeId) return false;
      if (curriculumFilters.subjectId && session.subject_id !== curriculumFilters.subjectId) return false;
      if (curriculumFilters.chapterId && session.chapter_id !== curriculumFilters.chapterId) return false;
      if (curriculumFilters.topicId && session.topic_id !== curriculumFilters.topicId) return false;
      if (curriculumFilters.subtopicId && session.subtopic_id !== curriculumFilters.subtopicId) return false;
      return !needle || [session.title, session.subject_name, session.chapter_name, session.topic_name, session.subtopic_name]
        .some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [curriculumFilters, search, sessions]);

  const submit = async (session: StudioLibrarySession) => {
    setSubmittingId(session.id);
    try {
      await submitStudioSession(session.id);
      toast.success('Session submitted for review.');
      await load();
    } catch (requestError) {
      const details = workflowError(requestError);
      toast.error(details.problems[0]?.message || details.message);
    } finally { setSubmittingId(null); }
  };

  return <StudioShell title="Session Library" subtitle="Create, edit and submit Digital Studio Sessions.">
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1 lg:max-w-xl"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Sessions or curriculum" className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100" /></label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className={`inline-flex h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-semibold shadow-sm transition hover:border-blue-300 ${activeFilterCount ? 'border-blue-900 text-blue-900' : 'border-slate-300 text-slate-700'}`}><Filter size={16} />Curriculum filters{activeFilterCount > 0 && <span className="rounded-full bg-blue-900 px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>}{filtersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
          <button type="button" onClick={() => navigate('/studio/session-setup')} className="h-11 rounded-xl bg-blue-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800">Create Session</button>
        </div>
      </div>
      {filtersOpen && <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ['boardId', 'Board', curriculumOptions.boards], ['programId', 'Program', curriculumOptions.programs],
          ['gradeId', 'Grade', curriculumOptions.grades], ['subjectId', 'Subject', curriculumOptions.subjects],
          ['chapterId', 'Chapter', curriculumOptions.chapters], ['topicId', 'Topic', curriculumOptions.topics],
          ['subtopicId', 'Subtopic', curriculumOptions.subtopics],
        ] as const).map(([key, label, options]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}<select value={curriculumFilters[key] || ''} onChange={(event) => updateCurriculumFilter(key, event.target.value ? Number(event.target.value) : null)} disabled={key !== 'boardId' && options.length === 0} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-100"><option value="">All {label}s</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}
      </div><div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Choose any curriculum level to narrow the Session Library.</p><button type="button" disabled={activeFilterCount === 0} onClick={() => setCurriculumFilters(emptyCurriculumFilters())} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 disabled:text-slate-400"><RotateCcw size={15} />Clear filters</button></div></div>}
      <div className="mt-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2">{statuses.map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${status === item ? 'bg-blue-900 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300'}`}>{item}</button>)}</div>{!loading && !error && <p className="text-sm text-slate-500"><strong className="text-slate-800">{filtered.length}</strong> Session{filtered.length === 1 ? '' : 's'} found</p>}</div>
    </div>
    {loading && <div className="mt-5 rounded-xl border bg-white p-10 text-center text-sm text-slate-500">Loading Sessions…</div>}
    {!loading && error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!loading && !error && filtered.length === 0 && <div className="mt-5 rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">No Sessions match this view.</div>}
    {!loading && !error && <div className="mt-5 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((session) => {
      const selection = selectionFor(session);
      const editable = session.status === 'draft' || session.status === 'rejected';
      const hasCoreContent = session.has_session_plan && session.screen_count > 0;
      const curriculumDetails = `${session.board_name} · ${session.program_name} · Grade ${session.grade_number} · ${session.subject_name} · Chapter ${session.chapter_number}: ${session.chapter_name} · ${session.topic_name} · ${session.subtopic_name}`;
      const hoverDetails = `${curriculumDetails}${session.description ? ` · ${session.description}` : ''}`;
      const openSession = () => {
        if (session.status === 'published' && session.latest_release_number) {
          navigate(`/studio/player/${session.id}/releases/${session.latest_release_number}`);
        } else if (session.status === 'submitted' || session.status === 'approved' || session.status === 'published') {
          navigate(`/studio/review/${session.id}`);
        } else {
          navigate(`/studio/editor/${session.id}`);
        }
      };
      return <article key={session.id} role="link" tabIndex={0} onClick={openSession} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openSession(); } }} className="relative flex min-h-[285px] cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300" title={hoverDetails}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-2"><span className="max-w-[160px] truncate rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-800" title={session.subject_name}>{session.subject_name}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">Grade {session.grade_number}</span></div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle[session.status]}`}>{session.status}</span>
            {(session.status === 'draft' || session.status === 'rejected') && <button type="button" disabled={submittingId === session.id} onClick={(event) => { event.stopPropagation(); void submit(session); }} className="rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50">{submittingId === session.id ? 'Sending…' : session.status === 'rejected' ? 'Resubmit' : 'Submit'}</button>}
            {session.status === 'submitted' && <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/studio/review/${session.id}`); }} className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-amber-600">Review</button>}
            {session.status === 'approved' && <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/studio/review/${session.id}`); }} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">Publish</button>}
            {session.status === 'published' && <button type="button" onClick={(event) => { event.stopPropagation(); openSession(); }} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-emerald-700">View</button>}
          </div>
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Session {session.session_number}</p>
        <h2 className="mt-1 truncate text-lg font-bold leading-snug text-slate-900" title={session.title}>{session.title}</h2>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-indigo-50/70 px-3 py-3 text-indigo-950" title={curriculumDetails}><BookOpen className="shrink-0 text-blue-700" size={18} /><div className="min-w-0"><p className="truncate text-sm font-semibold">Chapter {session.chapter_number}: {session.chapter_name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{session.topic_name} / {session.subtopic_name}</p></div></div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-emerald-50/70 py-3 text-center">
          <div><p className="text-sm font-semibold text-slate-700">{session.screen_count} screen{session.screen_count === 1 ? '' : 's'}</p></div>
          <div className="flex items-center justify-center gap-1.5"><CheckCircle2 size={16} className={hasCoreContent ? 'text-emerald-600' : 'text-slate-400'} /><p className={`text-sm font-bold ${hasCoreContent ? 'text-emerald-700' : 'text-slate-500'}`}>{hasCoreContent ? 'Ready' : 'Setup'}</p></div>
          <div><p className="text-sm font-semibold text-slate-700">v{session.revision_no}</p></div>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-5">
          <p className="text-xs font-medium text-slate-400">Click card to open</p>
          <div className="relative">
            <button type="button" onClick={(event) => { event.stopPropagation(); setOpenMenuId((current) => current === session.id ? null : session.id); }} aria-label={`More actions for ${session.title}`} aria-expanded={openMenuId === session.id} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-900"><MoreHorizontal size={20} /></button>
            {openMenuId === session.id && <div onClick={(event) => event.stopPropagation()} className="absolute bottom-11 right-0 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              <button type="button" disabled={!editable} onClick={() => { setOpenMenuId(null); navigate(selectionPath('/studio/session-plans', selection)); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"><FileText size={16} />Session Plan</button>
              <button type="button" disabled={!editable} onClick={() => { setOpenMenuId(null); navigate(selectionPath('/studio/screen-scripts', selection)); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"><ScrollText size={16} />Screen Scripts</button>
              <button type="button" disabled={!editable} onClick={() => { setOpenMenuId(null); navigate(`/studio/editor/${session.id}`); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"><MonitorPlay size={16} />Screen Editor</button>
              {!editable && <button type="button" onClick={() => { setOpenMenuId(null); navigate(`/studio/review/${session.id}`); }} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50"><Eye size={16} />Workflow details</button>}
            </div>}
          </div>
        </div>
      </article>;
    })}</div>}
  </StudioShell>;
}
