import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import { BookOpen, Box, Filter, Loader2, MonitorPlay, Search, X } from 'lucide-react';
import { getApiErrorDetails } from '@/lib/api';
import { discoverStudioContent } from '../api/studioDiscoveryApi';
import type { StudioDiscoveryFilters, StudioDiscoveryItem, StudioDiscoveryResponse, StudioDiscoveryType } from '../api/studioDiscoveryApi';

interface Props {
  open: boolean;
  releaseId: number;
  screenId: number;
  onClose: () => void;
  onSelect: (item: StudioDiscoveryItem) => void;
}

interface ResultState {
  items: StudioDiscoveryItem[];
  cursor: string | null;
  loading: boolean;
  initialized: boolean;
  error: string;
}

const tabs: Array<{ id: StudioDiscoveryType; label: string; icon: typeof BookOpen }> = [
  { id: 'session', label: 'Sessions', icon: BookOpen },
  { id: 'screen', label: 'Screens', icon: MonitorPlay },
  { id: 'resource', label: 'Resources', icon: Box },
];

const emptyResult = (): ResultState => ({ items: [], cursor: null, loading: false, initialized: false, error: '' });
const emptyResults = (): Record<StudioDiscoveryType, ResultState> => ({
  session: emptyResult(), screen: emptyResult(), resource: emptyResult(),
});

export default function StudioBranchDiscoveryPanel({ open, releaseId, screenId, onClose, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<StudioDiscoveryType>('session');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<StudioDiscoveryFilters>({});
  const [filters, setFilters] = useState<StudioDiscoveryFilters>({});
  const [results, setResults] = useState<Record<StudioDiscoveryType, ResultState>>(emptyResults);
  const [context, setContext] = useState<StudioDiscoveryResponse['applied_context'] | null>(null);
  const [facets, setFacets] = useState<StudioDiscoveryResponse['facets']>({ topics: [], subtopics: [] });
  const requestVersions = useRef<Record<StudioDiscoveryType, number>>({ session: 0, screen: 0, resource: 0 });
  const inFlightVersions = useRef<Record<StudioDiscoveryType, number | null>>({ session: null, screen: null, resource: null });

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(draftFilters), 350);
    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  useEffect(() => {
    setResults(emptyResults());
    setContext(null);
    setFacets({ topics: [], subtopics: [] });
    requestVersions.current.session += 1;
    requestVersions.current.screen += 1;
    requestVersions.current.resource += 1;
    inFlightVersions.current = { session: null, screen: null, resource: null };
  }, [filterKey, releaseId, screenId]);

  const loadPage = useCallback(async (type: StudioDiscoveryType, cursor: string | null, append: boolean) => {
    if (inFlightVersions.current[type] !== null) return;
    const requestVersion = ++requestVersions.current[type];
    inFlightVersions.current[type] = requestVersion;
    setResults((current) => ({
      ...current,
      [type]: { ...current[type], loading: true, error: '' },
    }));
    try {
      const response = await discoverStudioContent(releaseId, screenId, type, filters, cursor);
      if (requestVersions.current[type] !== requestVersion) return;
      setContext(response.applied_context);
      setFacets((current) => ({
        topics: [...new Map([...current.topics, ...response.facets.topics].map((item) => [item.id, item])).values()],
        subtopics: [...new Map([...current.subtopics, ...response.facets.subtopics].map((item) => [item.id, item])).values()],
      }));
      setResults((current) => {
        const combined = append ? [...current[type].items, ...response.items] : response.items;
        return {
          ...current,
          [type]: {
            items: [...new Map(combined.map((item) => [item.key, item])).values()],
            cursor: response.next_cursor,
            loading: false,
            initialized: true,
            error: '',
          },
        };
      });
    } catch (requestError) {
      if (requestVersions.current[type] !== requestVersion) return;
      setResults((current) => ({
        ...current,
        [type]: { ...current[type], loading: false, initialized: true, error: getApiErrorDetails(requestError).message },
      }));
    } finally {
      if (inFlightVersions.current[type] === requestVersion) inFlightVersions.current[type] = null;
    }
  }, [filters, releaseId, screenId]);

  const activeResult = results[activeTab];
  useEffect(() => {
    if (!open || activeResult.initialized || activeResult.loading) return;
    void loadPage(activeTab, null, false);
  }, [activeResult.initialized, activeResult.loading, activeTab, loadPage, open]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollTop + target.clientHeight < target.scrollHeight * 0.7) return;
    if (activeResult.loading || !activeResult.cursor) return;
    void loadPage(activeTab, activeResult.cursor, true);
  };

  const visibleSubtopics = facets.subtopics.filter((item) => !draftFilters.topicId || item.topic_id === draftFilters.topicId);
  const activeFilterCount = [draftFilters.topicId, draftFilters.subtopicId, draftFilters.tags, draftFilters.pedagogy, draftFilters.bloom]
    .filter(Boolean).length;

  return (
    <aside className={`absolute inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white text-slate-900 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'pointer-events-none translate-x-full'}`} aria-hidden={!open}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
        <div>
          <h2 className="font-bold">Branching</h2>
          <p className="mt-1 text-xs text-slate-500">Find related published teaching content.</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 p-2 hover:bg-slate-100" aria-label="Close Branching panel"><X size={18} /></button>
      </header>

      {context && <div className="border-b border-slate-200 bg-blue-50 px-4 py-3 text-xs text-blue-950"><span className="font-bold">Initial context:</span> Grade {context.grade_number} · {context.subject_name} · Chapter {context.chapter_number}: {context.chapter_name}</div>}

      <div className="border-b border-slate-200 p-4">
        <label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={draftFilters.search || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search related content" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-700" /></label>
        <button type="button" onClick={() => setFiltersOpen((current) => !current)} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-900"><Filter size={15} />Filters{activeFilterCount > 0 && <span className="rounded-full bg-blue-900 px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>}</button>
        {filtersOpen && <div className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Topic<select value={draftFilters.topicId || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, topicId: event.target.value ? Number(event.target.value) : null, subtopicId: null }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-normal"><option value="">All topics</option>{facets.topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Subtopic<select value={draftFilters.subtopicId || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, subtopicId: event.target.value ? Number(event.target.value) : null }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-normal"><option value="">All subtopics</option>{visibleSubtopics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Tags<input value={draftFilters.tags || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, tags: event.target.value }))} placeholder="light, reflection" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-semibold text-slate-600">Pedagogy<input value={draftFilters.pedagogy || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, pedagogy: event.target.value }))} placeholder="demonstration" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
          <label className="text-xs font-semibold text-slate-600">Bloom level<input value={draftFilters.bloom || ''} onChange={(event) => setDraftFilters((current) => ({ ...current, bloom: event.target.value }))} placeholder="apply" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
          <button type="button" onClick={() => setDraftFilters({})} className="self-end rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Clear filters</button>
        </div>}
      </div>

      <div className="grid grid-cols-3 border-b border-slate-200 px-3 pt-2">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`inline-flex items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-bold ${activeTab === id ? 'border-blue-800 text-blue-900' : 'border-transparent text-slate-500'}`}><Icon size={15} />{label}</button>)}</div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3" onScroll={handleScroll}>
        {activeResult.items.map((item) => <button key={item.key} type="button" onClick={() => onSelect(item)} className="mb-3 block w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-400 hover:bg-blue-50">
          <div className="flex items-start justify-between gap-2"><p className="font-semibold text-slate-900">{item.title}</p><span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{item.type}</span></div>
          {item.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>}
          <p className="mt-2 text-[11px] text-slate-500">{item.curriculum.topic_name} · {item.curriculum.subtopic_name}</p>
          {item.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{item.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">{tag}</span>)}</div>}
        </button>)}
        {activeResult.loading && <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="animate-spin" size={17} />Loading related {activeTab}s…</div>}
        {!activeResult.loading && activeResult.error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{activeResult.error}</div>}
        {!activeResult.loading && activeResult.initialized && !activeResult.error && activeResult.items.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No related {activeTab}s match these filters.</p>}
        {!activeResult.loading && activeResult.initialized && activeResult.items.length > 0 && !activeResult.cursor && <p className="py-4 text-center text-xs text-slate-400">All related results loaded.</p>}
      </div>
    </aside>
  );
}
