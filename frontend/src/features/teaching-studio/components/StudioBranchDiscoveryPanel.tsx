import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import {
  BookOpen,
  Box,
  Check,
  ChevronDown,
  Filter,
  Loader2,
  MonitorPlay,
  Search,
  X,
} from 'lucide-react';
import { getApiErrorDetails } from '@/lib/api';
import { discoverStudioContent } from '../api/studioDiscoveryApi';
import type {
  StudioDiscoveryFilters,
  StudioDiscoveryItem,
  StudioDiscoveryResponse,
  StudioDiscoveryType,
} from '../api/studioDiscoveryApi';

interface Props {
  open: boolean;
  fullScreen?: boolean;
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

const emptyResult = (): ResultState => ({
  items: [],
  cursor: null,
  loading: false,
  initialized: false,
  error: '',
});
const emptyResults = (): Record<StudioDiscoveryType, ResultState> => ({
  session: emptyResult(),
  screen: emptyResult(),
  resource: emptyResult(),
});
const emptyFacets = (): StudioDiscoveryResponse['facets'] => ({
  topics: [],
  subtopics: [],
  pedagogy: [],
  bloom: [],
  target_exam: [],
  resource_types: [],
});

interface SearchableOption {
  value: string;
  label: string;
}

function SearchableFilter({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: SearchableOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected?.label || '');
  }, [selected?.label]);

  const visibleOptions = options.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const choose = (option: SearchableOption) => {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  };

  return (
    <label className="relative block text-xs font-semibold text-slate-600">
      {label}
      <div
        className={`mt-1 flex items-center rounded-lg border bg-white transition ${open ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-300'}`}
      >
        <Search size={14} className="ml-2.5 shrink-0 text-slate-400" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            const exact = options.find(
              (option) =>
                option.label.toLowerCase() === next.trim().toLowerCase() ||
                option.value.toLowerCase() === next.trim().toLowerCase(),
            );
            onChange(exact?.value || '');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && visibleOptions[0]) {
              event.preventDefault();
              choose(visibleOptions[0]);
            }
            if (event.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm font-normal text-slate-800 outline-none"
          role="combobox"
          aria-expanded={open}
        />
        {query ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery('');
              onChange('');
              setOpen(true);
            }}
            className="mr-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={`Clear ${label}`}
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={14} className="mr-2 text-slate-400" />
        )}
      </div>
      {open && (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('');
              setQuery('');
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm font-normal text-slate-500 hover:bg-slate-50"
          >
            <span>{placeholder}</span>
            {!value && <Check size={14} />}
          </button>
          {visibleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm font-normal text-slate-800 hover:bg-blue-50 hover:text-blue-900"
            >
              <span className="truncate">{option.label}</span>
              {value === option.value && <Check size={14} className="shrink-0 text-blue-700" />}
            </button>
          ))}
          {visibleOptions.length === 0 && (
            <p className="px-2.5 py-3 text-center text-xs font-normal text-slate-500">
              No matching values
            </p>
          )}
        </div>
      )}
    </label>
  );
}

export default function StudioBranchDiscoveryPanel({
  open,
  fullScreen = false,
  releaseId,
  screenId,
  onClose,
  onSelect,
}: Props) {
  const [activeTab, setActiveTab] = useState<StudioDiscoveryType>('session');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<StudioDiscoveryFilters>({});
  const [filters, setFilters] = useState<StudioDiscoveryFilters>({});
  const [results, setResults] = useState<Record<StudioDiscoveryType, ResultState>>(emptyResults);
  const [facets, setFacets] = useState<StudioDiscoveryResponse['facets']>(emptyFacets);
  const requestVersions = useRef<Record<StudioDiscoveryType, number>>({
    session: 0,
    screen: 0,
    resource: 0,
  });
  const inFlightVersions = useRef<Record<StudioDiscoveryType, number | null>>({
    session: null,
    screen: null,
    resource: null,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters(draftFilters), 350);
    return () => window.clearTimeout(timer);
  }, [draftFilters]);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  useEffect(() => {
    setResults(emptyResults());
    requestVersions.current.session += 1;
    requestVersions.current.screen += 1;
    requestVersions.current.resource += 1;
    inFlightVersions.current = { session: null, screen: null, resource: null };
  }, [filterKey, releaseId, screenId]);

  useEffect(() => {
    setFacets(emptyFacets());
  }, [releaseId, screenId]);

  const loadPage = useCallback(
    async (type: StudioDiscoveryType, cursor: string | null, append: boolean) => {
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
        setFacets((current) => ({
          topics: [
            ...new Map(
              [...current.topics, ...response.facets.topics].map((item) => [item.id, item]),
            ).values(),
          ],
          subtopics: [
            ...new Map(
              [...current.subtopics, ...response.facets.subtopics].map((item) => [item.id, item]),
            ).values(),
          ],
          pedagogy: response.facets.pedagogy,
          bloom: response.facets.bloom,
          target_exam: response.facets.target_exam,
          resource_types: response.facets.resource_types,
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
          [type]: {
            ...current[type],
            loading: false,
            initialized: true,
            error: getApiErrorDetails(requestError).message,
          },
        }));
      } finally {
        if (inFlightVersions.current[type] === requestVersion)
          inFlightVersions.current[type] = null;
      }
    },
    [filters, releaseId, screenId],
  );

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

  const visibleSubtopics = facets.subtopics.filter(
    (item) => !draftFilters.topicId || item.topic_id === draftFilters.topicId,
  );
  const activeFilterCount = [
    draftFilters.topicId,
    draftFilters.subtopicId,
    draftFilters.tags,
    draftFilters.pedagogy,
    draftFilters.bloom,
    draftFilters.targetExam,
    activeTab === 'resource' ? draftFilters.resourceType : null,
  ].filter(Boolean).length;

  return (
    <aside
      className={`absolute z-40 flex w-[calc(100%-3rem)] max-w-[20.25rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl transition-transform duration-300 ${fullScreen ? 'bottom-14 left-0 top-0' : 'bottom-11 left-12 top-12'} ${open ? 'translate-x-0' : 'pointer-events-none -translate-x-[calc(100%+3rem)]'}`}
      aria-hidden={!open}
    >
      <header className="flex items-center justify-between gap-1.5 border-b border-slate-200 px-2 py-1">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">Branching</h2>
          <p className="truncate text-[9px] text-slate-500">Find related published teaching content.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 p-0.5 hover:bg-slate-100"
          aria-label="Close Branching panel"
        >
          <X size={14} />
        </button>
      </header>

      <div className="border-b border-slate-200 p-2">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={draftFilters.search || ''}
            onChange={(event) =>
              setDraftFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Search related content"
            className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-2 text-sm outline-none focus:border-blue-700"
          />
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900"
        >
          <Filter size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-900 px-2 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        {filtersOpen && (
          <div className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
            <SearchableFilter
              label="Topic"
              value={String(draftFilters.topicId || '')}
              options={facets.topics.map((item) => ({
                value: String(item.id),
                label: item.name,
              }))}
              placeholder="All topics"
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  topicId: value ? Number(value) : null,
                  subtopicId: null,
                }))
              }
            />
            <SearchableFilter
              label="Subtopic"
              value={String(draftFilters.subtopicId || '')}
              options={visibleSubtopics.map((item) => ({
                value: String(item.id),
                label: item.name,
              }))}
              placeholder="All subtopics"
              onChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  subtopicId: value ? Number(value) : null,
                }))
              }
            />
            <label className="text-xs font-semibold text-slate-600">
              Tags
              <input
                value={draftFilters.tags || ''}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, tags: event.target.value }))
                }
                placeholder="light, reflection"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-normal outline-none focus:border-blue-600"
              />
            </label>
            <SearchableFilter
              label="Pedagogy"
              value={draftFilters.pedagogy || ''}
              options={facets.pedagogy.map((item) => ({ value: item.code, label: item.label }))}
              placeholder="All pedagogies"
              onChange={(value) => setDraftFilters((current) => ({ ...current, pedagogy: value }))}
            />
            <SearchableFilter
              label="Bloom level"
              value={draftFilters.bloom || ''}
              options={facets.bloom.map((item) => ({ value: item.code, label: item.label }))}
              placeholder="All Bloom levels"
              onChange={(value) => setDraftFilters((current) => ({ ...current, bloom: value }))}
            />
            <SearchableFilter
              label="Target exam"
              value={draftFilters.targetExam || ''}
              options={facets.target_exam.map((item) => ({
                value: item.code,
                label: item.label,
              }))}
              placeholder="All target exams"
              onChange={(value) =>
                setDraftFilters((current) => ({ ...current, targetExam: value }))
              }
            />
            {activeTab === 'resource' && (
              <SearchableFilter
                label="Resource type"
                value={draftFilters.resourceType || ''}
                options={facets.resource_types.map((item) => ({
                  value: item,
                  label: item.replace(/_/g, ' '),
                }))}
                placeholder="All resource types"
                onChange={(value) =>
                  setDraftFilters((current) => ({ ...current, resourceType: value }))
                }
              />
            )}
            <button
              type="button"
              onClick={() => setDraftFilters({})}
              className="self-end rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 border-b border-slate-200 px-1.5 pt-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center justify-center gap-1 border-b-2 px-1 py-2 text-[11px] font-bold ${activeTab === id ? 'border-blue-800 text-blue-900' : 'border-transparent text-slate-500'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5" onScroll={handleScroll}>
        {activeResult.items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item)}
            className="mb-2 block w-full rounded-xl border border-slate-200 p-2 text-left transition hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                {item.type}
              </span>
            </div>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
            )}
            <p className="mt-2 text-[11px] text-slate-500">
              {item.curriculum.topic_name} · {item.curriculum.subtopic_name}
            </p>
            {item.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
        {activeResult.loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={17} />
            Loading related {activeTab}s…
          </div>
        )}
        {!activeResult.loading && activeResult.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {activeResult.error}
          </div>
        )}
        {!activeResult.loading &&
          activeResult.initialized &&
          !activeResult.error &&
          activeResult.items.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              No related {activeTab}s match these filters.
            </p>
          )}
        {!activeResult.loading &&
          activeResult.initialized &&
          activeResult.items.length > 0 &&
          !activeResult.cursor && (
            <p className="py-4 text-center text-xs text-slate-400">All related results loaded.</p>
          )}
      </div>
    </aside>
  );
}
