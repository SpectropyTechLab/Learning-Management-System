import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  Grid2X2,
  Layers3,
  List,
  MoreVertical,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import {
  deleteStudioResource,
  listStudioResources,
  STUDIO_RESOURCE_TYPES,
  studioResourceTypeLabel,
  type StudioResourceSummary,
  type StudioResourceType,
} from '../../api/studioResourcesApi';
import DeleteResourceModal from './DeleteResourceModal';
import { formatResourceDate, RESOURCE_TYPE_STYLES } from './resourcePresentation';

type ResourceView = 'grid' | 'list';
type ResourceSort = 'recently_updated' | 'name_asc' | 'name_desc' | 'newest' | 'type';
interface ResourceLibraryProps {
  mode?: 'manage' | 'picker';
  onPick?: (resource: StudioResourceSummary) => void;
  refreshKey?: number;
  allowedTypes?: readonly StudioResourceType[];
}

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const rounded = Math.round(seconds);
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
};

function ResourcePreview({ resource }: { resource: StudioResourceSummary }) {
  const style = RESOURCE_TYPE_STYLES[resource.resource_type];
  const Icon = style.icon;
  const duration = formatDuration(resource.latest_version?.duration_seconds);
  return (
    <div
      className={`relative flex h-36 items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br ${style.preview}`}
    >
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_35%),radial-gradient(circle_at_80%_70%,white_0,transparent_30%)]" />
      <Icon size={48} strokeWidth={1.7} className="relative" />
      {['video', 'animation', 'simulation'].includes(resource.resource_type) ? (
        <span className="absolute grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-slate-950/55 text-white">
          <Play size={20} fill="currentColor" />
        </span>
      ) : null}
      {duration ? (
        <span className="absolute bottom-2 right-2 rounded-md bg-slate-950/80 px-2 py-1 text-xs font-bold text-white">
          {duration}
        </span>
      ) : null}
    </div>
  );
}

function ResourceActions({
  resource,
  open,
  onToggle,
  onPreview,
  onDelete,
}: {
  resource: StudioResourceSummary;
  open: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative" data-resource-menu>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Actions for ${resource.name}`}
        aria-expanded={open}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <MoreVertical size={19} />
      </button>
      {open ? (
        <div className="absolute bottom-10 right-0 z-30 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-xl">
          <button
            type="button"
            onClick={onPreview}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50"
          >
            <Eye size={16} />
            Preview
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

const LoadingCards = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    {Array.from({ length: 8 }, (_, index) => (
      <div
        key={index}
        className="animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white"
      >
        <div className="h-36 bg-slate-200" />
        <div className="space-y-3 p-4">
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

export default function ResourceLibrary({
  mode = 'manage',
  onPick,
  refreshKey = 0,
  allowedTypes,
}: ResourceLibraryProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = new URLSearchParams(location.search);
  const [searchInput, setSearchInput] = useState(initial.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initial.get('search') || '');
  const initialType = initial.get('type');
  const [resourceType, setResourceType] = useState<StudioResourceType | ''>(
    STUDIO_RESOURCE_TYPES.includes(initialType as StudioResourceType)
      ? (initialType as StudioResourceType)
      : '',
  );
  const [sort, setSort] = useState<ResourceSort>('recently_updated');
  const [view, setView] = useState<ResourceView>('grid');
  const [resources, setResources] = useState<StudioResourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuResourceId, setMenuResourceId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudioResourceSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!menuResourceId) return undefined;
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('[data-resource-menu]')) setMenuResourceId(null);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [menuResourceId]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const rows = await listStudioResources({ search: debouncedSearch, resourceType });
      if (requestId === requestRef.current) setResources(rows);
    } catch (loadError) {
      if (requestId === requestRef.current) {
        setResources([]);
        setError(getApiErrorDetails(loadError, 'Unable to load Studio Resources.').message);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [debouncedSearch, resourceType]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const sorted = useMemo(
    () =>
      resources
        .filter((resource) => !allowedTypes || allowedTypes.includes(resource.resource_type))
        .sort((left, right) => {
          if (sort === 'name_asc') return left.name.localeCompare(right.name);
          if (sort === 'name_desc') return right.name.localeCompare(left.name);
          if (sort === 'newest')
            return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
          if (sort === 'type')
            return (
              left.resource_type.localeCompare(right.resource_type) ||
              left.name.localeCompare(right.name)
            );
          return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
        }),
    [allowedTypes, resources, sort],
  );

  const openResource = (resource: StudioResourceSummary) => {
    setMenuResourceId(null);
    if (mode === 'picker') {
      onPick?.(resource);
      return;
    }
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('search', searchInput.trim());
    if (resourceType) params.set('type', resourceType);
    navigate(`/studio/resources/${resource.id}`, { state: { librarySearch: params.toString() } });
  };

  const requestDelete = (resource: StudioResourceSummary) => {
    setMenuResourceId(null);
    setDeleteError('');
    setDeleteTarget(resource);
  };

  const permanentlyDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteStudioResource(deleteTarget.id);
      setResources((current) => current.filter((resource) => resource.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('Resource permanently deleted.');
    } catch (deleteFailure) {
      const details = getApiErrorDetails(deleteFailure, 'Unable to delete Resource.');
      const blockers = details.details as
        | {
            placement_count?: number;
            scorm_attempt_count?: number;
            published_release_count?: number;
          }
        | undefined;
      const suffix = blockers
        ? ` Placements: ${blockers.placement_count || 0}, SCORM attempts: ${blockers.scorm_attempt_count || 0}, published releases: ${blockers.published_release_count || 0}.`
        : '';
      setDeleteError(`${details.message}${suffix}`);
    } finally {
      setDeleting(false);
    }
  };

  const filtersActive = Boolean(searchInput || resourceType);

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className={`grid gap-3 ${mode === 'manage' ? 'md:grid-cols-[minmax(0,1fr)_240px] md:items-center' : 'grid-cols-1'}`}>
          <label className="relative block min-w-0">
            <span className="sr-only">Search Resources</span>
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search resources (e.g. speed, motion, simulation)"
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </label>
          <label className="min-w-0">
            <span className="sr-only">Resource type</span>
            <select value={resourceType} onChange={(event) => setResourceType(event.target.value as StudioResourceType | '')} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
              <option value="">All</option>
              {STUDIO_RESOURCE_TYPES.filter((type) => !allowedTypes || allowedTypes.includes(type)).map((type) => <option key={type} value={type}>{studioResourceTypeLabel(type)}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-slate-900">
              {sorted.length} {sorted.length === 1 ? 'Resource' : 'Resources'}
            </p>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setResourceType('');
                }}
                className="mt-1 text-xs font-semibold text-blue-800 hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as ResourceSort)}
              aria-label="Sort Resources"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="recently_updated">Recently updated</option>
              <option value="name_asc">Name: A–Z</option>
              <option value="name_desc">Name: Z–A</option>
              <option value="newest">Newest created</option>
              <option value="type">Resource type</option>
            </select>
            <div className="inline-flex rounded-lg border border-gray-200 p-1">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`rounded-md p-2 ${view === 'grid' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                aria-label="Grid view"
              >
                <Grid2X2 size={17} />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`rounded-md p-2 ${view === 'list' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                aria-label="List view"
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingCards />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            <p className="font-semibold">Unable to load Resources</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center">
            <Layers3 className="mx-auto text-slate-400" size={40} />
            <h3 className="mt-3 font-semibold text-slate-800">
              {filtersActive ? 'No Resources match your filters' : 'No Resources available'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {filtersActive
                ? 'Try another search term or clear the Resource type filter.'
                : 'Use Add Resource above to create the first library item.'}
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className={`grid gap-4 ${mode === 'picker' ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}`}>
            {sorted.map((resource) => {
              const style = RESOURCE_TYPE_STYLES[resource.resource_type];
              return (
                <article
                  key={resource.id}
                  className="relative overflow-visible rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => openResource(resource)}
                    className="block w-full overflow-hidden rounded-xl text-left"
                  >
                    <ResourcePreview resource={resource} />
                    <div className="p-3.5 pr-12">
                      <p className="truncate font-bold text-slate-900">{resource.name}</p>
                      <div className="mt-2 flex gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                        >
                          {studioResourceTypeLabel(resource.resource_type)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          v{resource.latest_version?.version_number ?? '—'}
                        </span>
                      </div>
                      {resource.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {resource.description}
                        </p>
                      ) : null}
                    </div>
                  </button>
                  {mode === 'manage' ? (
                    <div className="absolute bottom-2.5 right-2.5">
                      <ResourceActions
                        resource={resource}
                        open={menuResourceId === resource.id}
                        onToggle={() =>
                          setMenuResourceId((current) =>
                            current === resource.id ? null : resource.id,
                          )
                        }
                        onPreview={() => openResource(resource)}
                        onDelete={() => requestDelete(resource)}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200">
            {sorted.map((resource) => {
              const Icon = RESOURCE_TYPE_STYLES[resource.resource_type].icon;
              return (
                <div
                  key={resource.id}
                  className="relative flex border-t border-gray-100 first:border-t-0 hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => openResource(resource)}
                    className="min-w-0 flex-1 px-3 py-3 text-left [&>span.text-sm]:hidden"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${RESOURCE_TYPE_STYLES[resource.resource_type].preview}`}
                      >
                        <Icon size={20} />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="truncate font-semibold text-slate-900">{resource.name}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">v{resource.latest_version?.version_number ?? '—'}</span>
                      </span>
                    </span>
                    <span className="text-sm">
                      v{resource.latest_version?.version_number ?? '—'}
                    </span>
                  </button>
                  {mode === 'manage' ? (
                    <div className="flex items-center pr-3">
                      <ResourceActions
                        resource={resource}
                        open={menuResourceId === resource.id}
                        onToggle={() =>
                          setMenuResourceId((current) =>
                            current === resource.id ? null : resource.id,
                          )
                        }
                        onPreview={() => openResource(resource)}
                        onDelete={() => requestDelete(resource)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeleteResourceModal
        open={Boolean(deleteTarget)}
        resourceName={deleteTarget?.name || ''}
        deleting={deleting}
        error={deleteError}
        onClose={() => setDeleteTarget(null)}
        onConfirm={permanentlyDelete}
      />
    </section>
  );
}
