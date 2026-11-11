import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Grid2X2, Layers3, List, MoreVertical, Pencil, Play, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import { deleteStudioResource, getStudioResource, getStudioResourcePreview, listStudioResources, renameStudioResource, STUDIO_RESOURCE_TYPES, studioResourceTypeLabel, type StudioResourceSummary, type StudioResourceDetails, type StudioResourceVersion, type StudioResourceType } from '../../api/studioResourcesApi';
import DeleteResourceModal from './DeleteResourceModal';
import StudioResourcePlayer from './StudioResourcePlayer';
import { formatResourceTypeLabel, getResourceTypeStyle } from './resourcePresentation';

type ResourceView = 'grid' | 'list';
type ResourceSort = 'recently_updated' | 'name_asc' | 'name_desc' | 'newest' | 'type';
interface ResourceLibraryProps {
  mode?: 'manage' | 'picker';
  onPick?: (resource: StudioResourceSummary, version: StudioResourceVersion) => void;
  refreshKey?: number;
  allowedTypes?: readonly StudioResourceType[];
}

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const rounded = Math.round(seconds);
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
};

function ResourcePreview({ resource }: { resource: StudioResourceSummary }) {
  const style = getResourceTypeStyle(resource.resource_type);
  const Icon = style.icon;
  const duration = formatDuration(resource.latest_version?.duration_seconds);
  const [source, setSource] = useState(resource.latest_version?.external_url || '');
  const mediaType = resource.latest_version?.mime_type || '';
  const canShowCover = mediaType.startsWith('image/') || mediaType.startsWith('video/');
  const isGif = mediaType.toLowerCase() === 'image/gif';
  const gifCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canShowCover || source || !resource.latest_version?.id) return;
    let active = true;
    void getStudioResourcePreview(resource.latest_version.id)
      .then((preview) => { if (active) setSource(preview.url); })
      .catch(() => { /* Keep the type icon as the fallback cover. */ });
    return () => { active = false; };
  }, [canShowCover, resource.latest_version?.id, source]);
  return (
    <div className={`relative flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-l-xl bg-gradient-to-br ${style.preview}`}>
      {source && canShowCover ? mediaType.startsWith('video/')
        ? <video src={source} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        : isGif
          ? <><canvas ref={gifCanvasRef} className="h-full w-full object-cover" aria-label={`${resource.name} static cover`} /><img src={source} alt="" className="hidden" onLoad={(event) => { const image = event.currentTarget; const canvas = gifCanvasRef.current; if (!canvas) return; canvas.width = image.naturalWidth || 160; canvas.height = image.naturalHeight || 90; canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height); }} /></>
          : <img src={source} alt={`${resource.name} cover`} className="h-full w-full object-cover" />
        : <><div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_35%),radial-gradient(circle_at_80%_70%,white_0,transparent_30%)]" /><Icon size={30} strokeWidth={1.7} className="relative" /></>}
      {!isGif && ['video', 'animation', 'simulation'].includes(resource.resource_type) ? <span className="absolute grid h-7 w-7 place-items-center rounded-full border border-white bg-slate-950/55 text-white"><Play size={13} fill="currentColor" /></span> : null}
      {duration ? <span className="absolute bottom-1 right-1 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white">{duration}</span> : null}
    </div>
  );
}

function ResourceActions({ resource, open, onToggle, onPreview, onRename, onDelete }: { resource: StudioResourceSummary; open: boolean; onToggle: () => void; onPreview: () => void; onRename: () => void; onDelete: () => void }) {
  return (
    <div className="relative" data-resource-menu>
      <button type="button" onClick={onToggle} aria-label={`Actions for ${resource.name}`} aria-expanded={open} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
        <MoreVertical size={19} />
      </button>
      {open ? (
        <div className="absolute bottom-10 right-0 z-30 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-xl">
          <button type="button" onClick={onPreview} className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50">
            <Eye size={16} />
            Preview
          </button>
          <button type="button" onClick={onRename} className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-50">
            <Pencil size={16} />
            Rename
          </button>
          <button type="button" onClick={onDelete} className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-red-700 hover:bg-red-50">
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
      <div key={index} className="animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex h-24">
          <div className="w-28 bg-slate-200" />
          <div className="flex-1 space-y-3 p-3">
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function ResourceLibrary({ mode = 'manage', onPick, refreshKey = 0, allowedTypes }: ResourceLibraryProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = new URLSearchParams(location.search);
  const [searchInput, setSearchInput] = useState(initial.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initial.get('search') || '');
  const initialType = initial.get('type');
  const [resourceType, setResourceType] = useState<StudioResourceType | ''>(
    STUDIO_RESOURCE_TYPES.includes(initialType as StudioResourceType) && !(mode === 'picker' && initialType === 'html')
      ? (initialType as StudioResourceType)
      : '',
  );
  const [sort, setSort] = useState<ResourceSort>('recently_updated');
  const [view, setView] = useState<ResourceView>('grid');
  const [resources, setResources] = useState<StudioResourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuResourceId, setMenuResourceId] = useState<number | null>(null);
  const [renameTarget, setRenameTarget] = useState<StudioResourceSummary | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StudioResourceSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [pickerResource, setPickerResource] = useState<StudioResourceSummary | null>(null);
  const [pickerDetails, setPickerDetails] = useState<StudioResourceDetails | null>(null);
  const [pickerVersionId, setPickerVersionId] = useState<number | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const requestRef = useRef(0);
  const visibleResourceTypes = useMemo(
    () => STUDIO_RESOURCE_TYPES.filter((type) => mode !== 'picker' || type !== 'html'),
    [mode],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!menuResourceId) return undefined;
    const closeMenu = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-resource-menu]')) setMenuResourceId(null);
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
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
      [...resources]
        .filter((resource) => mode !== 'picker' || resource.resource_type !== 'html')
        .filter((resource) => !allowedTypes || allowedTypes.includes(resource.resource_type))
        .sort((left, right) => {
          if (sort === 'name_asc') return left.name.localeCompare(right.name);
          if (sort === 'name_desc') return right.name.localeCompare(left.name);
          if (sort === 'newest') return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
          if (sort === 'type') return left.resource_type.localeCompare(right.resource_type) || left.name.localeCompare(right.name);
          return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
        }),
    [allowedTypes, mode, resources, sort],
  );

  const openResource = (resource: StudioResourceSummary) => {
    setMenuResourceId(null);
    if (mode === 'picker') {
      setPickerResource(resource);
      setPickerDetails(null);
      setPickerVersionId(resource.latest_version?.id ?? null);
      setPickerError('');
      setPickerLoading(true);
      void getStudioResource(resource.id)
        .then((details) => {
          setPickerDetails(details);
          setPickerVersionId(details.versions.find((version) => version.id === resource.latest_version?.id)?.id ?? details.versions[0]?.id ?? null);
        })
        .catch((loadError) => setPickerError(getApiErrorDetails(loadError, 'Unable to load Resource versions.').message))
        .finally(() => setPickerLoading(false));
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

  const requestRename = (resource: StudioResourceSummary) => {
    setMenuResourceId(null);
    setRenameTarget(resource);
    setRenameName(resource.name);
    setRenameError('');
  };

  const renameResource = async () => {
    if (!renameTarget || !renameName.trim()) return;
    setRenaming(true);
    setRenameError('');
    try {
      const renamed = await renameStudioResource(renameTarget.id, renameName);
      setResources((current) => current
        .map((resource) => (
          resource.id === renamed.id
            ? { ...resource, name: renamed.name, updated_at: renamed.updated_at }
            : resource
        ))
        .filter((resource) => !debouncedSearch || resource.name.toLowerCase().includes(debouncedSearch.toLowerCase())));
      setRenameTarget(null);
      toast.success('Resource renamed.');
    } catch (renameFailure) {
      setRenameError(getApiErrorDetails(renameFailure, 'Unable to rename Resource.').message);
    } finally {
      setRenaming(false);
    }
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
      const suffix = blockers ? ` Placements: ${blockers.placement_count || 0}, SCORM attempts: ${blockers.scorm_attempt_count || 0}, published releases: ${blockers.published_release_count || 0}.` : '';
      setDeleteError(`${details.message}${suffix}`);
    } finally {
      setDeleting(false);
    }
  };

  const filtersActive = Boolean(searchInput || resourceType);
  const pickerVersion = pickerDetails?.versions.find((version) => version.id === pickerVersionId) ?? null;
  const renderPlacementCard = (resource: StudioResourceSummary) => pickerResource?.id === resource.id ? (
    <div className="m-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 shadow-sm" role="dialog" aria-label={`Place ${resource.name}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900">Place {resource.name}</h3><p className="mt-0.5 text-xs text-slate-500">Choose the exact immutable version.</p></div>
        <button type="button" onClick={() => setPickerResource(null)} className="shrink-0 rounded-md border border-slate-300 bg-white p-1.5 text-slate-600" aria-label="Close Resource version chooser"><X size={15} /></button>
      </div>
      <div className="mt-3">
        {pickerLoading ? <p className="rounded-lg bg-white p-3 text-center text-xs text-slate-600">Loading versions...</p>
          : pickerError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{pickerError}</p>
            : pickerDetails && pickerVersion ? <><label className="block text-xs font-semibold text-slate-700">Exact version<select value={pickerVersionId ?? ''} onChange={(event) => setPickerVersionId(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">{pickerDetails.versions.map((version) => <option key={version.id} value={version.id}>Version {version.version_number}</option>)}</select></label><div className="mt-2 rounded-lg bg-white p-2 text-xs text-slate-600"><span className="font-semibold">File:</span> <span className="break-words">{pickerVersion.original_file_name || 'External URL'}</span><span className="ml-2 text-slate-400">ID {pickerVersion.id}</span></div></>
              : <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">No version is available for placement.</p>}
      </div>
      <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setPickerResource(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button><button type="button" disabled={!pickerVersion || pickerLoading} onClick={() => { if (!pickerVersion) return; onPick?.(resource, pickerVersion); setPickerResource(null); }} className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Place version {pickerVersion?.version_number ?? ''}</button></div>
    </div>
  ) : null;

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className={`grid gap-3 ${mode === 'manage' ? 'md:grid-cols-[minmax(0,1fr)_240px] md:items-center' : 'grid-cols-1'}`}>
          <label className="relative block min-w-0">
            <span className="sr-only">Search Resources</span>
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search resources (e.g. speed, motion, simulation)" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
            {searchInput ? (
              <button type="button" onClick={() => setSearchInput('')} className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Clear search">
                <X size={16} />
              </button>
            ) : null}
          </label>
          <label className="min-w-0">
            <span className="sr-only">Resource type</span>
            <select value={resourceType} onChange={(event) => setResourceType(event.target.value as StudioResourceType | '')} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
              <option value="">All</option>
              {visibleResourceTypes.filter((type) => !allowedTypes || allowedTypes.includes(type)).map((type) => (
                <option key={type} value={type}>
                  {studioResourceTypeLabel(type)}
                </option>
              ))}
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
            <select value={sort} onChange={(event) => setSort(event.target.value as ResourceSort)} aria-label="Sort Resources" className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <option value="recently_updated">Recently updated</option>
              <option value="name_asc">Name: A–Z</option>
              <option value="name_desc">Name: Z–A</option>
              <option value="newest">Newest created</option>
              <option value="type">Resource type</option>
            </select>
            <div className="inline-flex rounded-lg border border-gray-200 p-1">
              <button type="button" onClick={() => setView('grid')} className={`rounded-md p-2 ${view === 'grid' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} aria-label="Grid view">
                <Grid2X2 size={17} />
              </button>
              <button type="button" onClick={() => setView('list')} className={`rounded-md p-2 ${view === 'list' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`} aria-label="List view">
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
            <button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold">
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center">
            <Layers3 className="mx-auto text-slate-400" size={40} />
            <h3 className="mt-3 font-semibold text-slate-800">{filtersActive ? 'No Resources match your filters' : 'No Resources available'}</h3>
            <p className="mt-1 text-sm text-slate-500">{filtersActive ? 'Try another search term or clear the Resource type filter.' : 'Use Add Resource above to create the first library item.'}</p>
          </div>
        ) : view === 'grid' ? (
          <div className={`grid gap-4 ${mode === 'picker' ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}`}>
            {sorted.map((resource) => {
              const style = getResourceTypeStyle(resource.resource_type);
              return (
                <article key={resource.id} className="relative overflow-visible rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md">
                  <button type="button" onClick={() => openResource(resource)} className="flex min-h-24 w-full overflow-hidden rounded-xl text-left">
                    <ResourcePreview resource={resource} />
                    <div className="min-w-0 flex-1 p-3 pr-10">
                      <p className="truncate font-bold text-slate-900">{resource.name}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}>{studioResourceTypeLabel(resource.resource_type) ?? formatResourceTypeLabel(resource.resource_type)}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">v{resource.latest_version?.version_number ?? '—'}</span>
                      </div>
                      {resource.description ? <p className="mt-1.5 line-clamp-1 text-xs text-slate-500">{resource.description}</p> : null}
                    </div>
                  </button>
                  {mode === 'manage' ? (
                    <div className="absolute bottom-2.5 right-2.5">
                      <ResourceActions resource={resource} open={menuResourceId === resource.id} onToggle={() => setMenuResourceId((current) => (current === resource.id ? null : resource.id))} onPreview={() => openResource(resource)} onRename={() => requestRename(resource)} onDelete={() => requestDelete(resource)} />
                    </div>
                  ) : null}
                  {renderPlacementCard(resource)}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200">
            {sorted.map((resource) => {
              const style = getResourceTypeStyle(resource.resource_type);
              const Icon = style.icon;
              return (
                <div key={resource.id} className="border-t border-gray-100 first:border-t-0">
                  <div className="relative flex hover:bg-slate-50">
                  <button type="button" onClick={() => openResource(resource)} className="min-w-0 flex-1 px-3 py-3 text-left [&>span.text-sm]:hidden">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${style.preview}`}>
                        <Icon size={20} />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="truncate font-semibold text-slate-900">{resource.name}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">v{resource.latest_version?.version_number ?? '—'}</span>
                      </span>
                    </span>
                    <span className="text-sm">v{resource.latest_version?.version_number ?? '—'}</span>
                  </button>
                  {mode === 'manage' ? (
                    <div className="flex items-center pr-3">
                      <ResourceActions resource={resource} open={menuResourceId === resource.id} onToggle={() => setMenuResourceId((current) => (current === resource.id ? null : resource.id))} onPreview={() => openResource(resource)} onRename={() => requestRename(resource)} onDelete={() => requestDelete(resource)} />
                    </div>
                  ) : null}
                  </div>
                  {renderPlacementCard(resource)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {mode === 'manage' && pickerResource ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="Choose Resource version">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Place {pickerResource.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Choose the exact immutable version for this Screen.</p>
              </div>
              <button type="button" onClick={() => setPickerResource(null)} className="rounded-lg border border-slate-300 p-2 text-slate-600" aria-label="Close Resource version chooser">
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {pickerLoading ? (
                <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-600">Loading version history…</p>
              ) : pickerError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{pickerError}</p>
              ) : pickerDetails && pickerVersion ? (
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-h-64 overflow-hidden rounded-xl bg-slate-950">
                    <StudioResourcePlayer resourceType={pickerResource.resource_type} version={pickerVersion} mode="preview" className="h-full min-h-64 w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Exact version
                      <select value={pickerVersionId ?? ''} onChange={(event) => setPickerVersionId(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
                        {pickerDetails.versions.map((version) => (
                          <option key={version.id} value={version.id}>
                            Version {version.version_number}
                          </option>
                        ))}
                      </select>
                    </label>
                    <dl className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold text-slate-500">File</dt>
                        <dd className="mt-1 break-words text-slate-800">{pickerVersion.original_file_name || 'External URL'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-slate-500">Version ID</dt>
                        <dd className="mt-1 text-slate-800">{pickerVersion.id}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">This Resource has no version available for placement.</p>
              )}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button type="button" onClick={() => setPickerResource(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                disabled={!pickerVersion || pickerLoading}
                onClick={() => {
                  if (!pickerVersion) return;
                  onPick?.(pickerResource, pickerVersion);
                  setPickerResource(null);
                }}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Place version {pickerVersion?.version_number ?? ''}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {renameTarget ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Rename Resource">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void renameResource();
            }}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Rename Resource</h2>
                <p className="mt-1 text-sm text-slate-500">This changes the library name only. Existing versions and placements are not changed.</p>
              </div>
              <button type="button" disabled={renaming} onClick={() => setRenameTarget(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40" aria-label="Close rename dialog">
                <X size={18} />
              </button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Resource name
              <input
                autoFocus
                maxLength={250}
                value={renameName}
                onChange={(event) => setRenameName(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            {renameError ? <p className="mt-3 text-sm text-red-700">{renameError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={renaming} onClick={() => setRenameTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40">
                Cancel
              </button>
              <button type="submit" disabled={renaming || !renameName.trim() || renameName.trim() === renameTarget.name} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                {renaming ? 'Renaming…' : 'Save name'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <DeleteResourceModal open={Boolean(deleteTarget)} resourceName={deleteTarget?.name || ''} deleting={deleting} error={deleteError} onClose={() => setDeleteTarget(null)} onConfirm={permanentlyDelete} />
    </section>
  );
}
