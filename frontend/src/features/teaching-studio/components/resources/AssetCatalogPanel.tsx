import { useEffect, useMemo, useState } from 'react';
import { Box, ExternalLink, Image, Loader2, Plus, Search, Shapes, Sparkles, WandSparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import {
  importStudioAssetCatalogItem,
  searchStudioAssetCatalog,
  type StudioAssetCatalogItem,
  type StudioAssetCatalogComposition,
  type StudioAssetCatalogKind,
  type StudioResourceSummary,
} from '../../api/studioResourcesApi';

interface AssetCatalogPanelProps {
  mode: 'manage' | 'picker';
  onImported: (resource: StudioResourceSummary) => void;
}

const KINDS: Array<{ id: StudioAssetCatalogKind; label: string; icon: typeof Sparkles }> = [
  { id: 'all', label: 'All assets', icon: Sparkles },
  { id: 'icon', label: 'Icons & SVG', icon: Shapes },
  { id: 'illustration', label: '2D assets', icon: Image },
  { id: 'animation', label: 'Animations', icon: WandSparkles },
  { id: 'model_3d', label: '3D models', icon: Box },
];

const STARTERS = ['heart', 'neuron', 'DNA', 'plant cell', 'microscope', 'laboratory', 'chemistry', 'virus'];

const kindLabel = (kind: StudioAssetCatalogItem['asset_kind']) => ({
  icon: 'Icon', illustration: '2D asset', animation: 'Animation', model_3d: '3D model',
}[kind]);

function CatalogCard({ asset, importing, onImport, mode }: {
  asset: StudioAssetCatalogItem;
  importing: boolean;
  onImport: () => void;
  mode: 'manage' | 'picker';
}) {
  return (
    <article className="group flex min-h-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg">
      <div className="relative grid h-36 place-items-center overflow-hidden bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-5">
        {asset.preview_url
          ? <img src={asset.preview_url} alt="" loading="lazy" className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-110" />
          : <div className="grid h-20 w-20 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-inner"><Box size={42} strokeWidth={1.5} /></div>}
        <span className="absolute left-2 top-2 rounded-full border border-white/80 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">{kindLabel(asset.asset_kind)}</span>
        <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] font-bold text-white">{asset.format}</span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{asset.title}</h3>
        <p className="mt-1 truncate text-xs text-slate-500">{asset.collection}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold capitalize text-violet-800">{asset.composition}</span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold capitalize text-amber-800">{asset.subject}</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">{asset.provider_label}</span>
          <a href={asset.license.url} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:underline">{asset.license.name}</a>
        </div>
        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">{asset.attribution}</p>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <button type="button" disabled={importing} onClick={onImport} className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-50">
            {importing ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            {mode === 'picker' ? 'Add to screen' : 'Add to library'}
          </button>
          <a href={asset.source_url} target="_blank" rel="noreferrer" title="Open original source" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-900"><ExternalLink size={14} /></a>
        </div>
      </div>
    </article>
  );
}

export default function AssetCatalogPanel({ mode, onImported }: AssetCatalogPanelProps) {
  const [query, setQuery] = useState('heart');
  const [submitted, setSubmitted] = useState('heart');
  const [kind, setKind] = useState<StudioAssetCatalogKind>('all');
  const [composition, setComposition] = useState<StudioAssetCatalogComposition>('component');
  const [provider, setProvider] = useState('all');
  const [assets, setAssets] = useState<StudioAssetCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState<Array<{ id: string; reason: string }>>([]);
  const [importing, setImporting] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void searchStudioAssetCatalog({ search: submitted, kind, composition, provider })
      .then((result) => {
        if (!active) return;
        setAssets(result.results);
        setUnavailable(result.unavailable_providers);
      })
      .catch((failure) => {
        if (!active) return;
        setAssets([]);
        setUnavailable([]);
        setError(getApiErrorDetails(failure, 'Unable to search the Asset Catalog.').message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [composition, kind, provider, submitted]);

  const visibleProviders = useMemo(() => {
    if (kind === 'icon' || kind === 'animation') return [{ id: 'all', label: 'All sources' }, { id: 'iconify', label: 'Iconify' }];
    if (kind === 'illustration') return [{ id: 'all', label: 'All sources' }, { id: 'bioicons', label: 'Bioicons & Servier' }, { id: 'scidraw', label: 'SciDraw' }, { id: 'iconify', label: 'Iconify' }, { id: 'kenney', label: 'Kenney CC0' }];
    if (kind === 'model_3d') return [{ id: 'all', label: 'All sources' }, { id: 'kenney', label: 'Kenney CC0' }, { id: 'smithsonian', label: 'Smithsonian' }];
    return [{ id: 'all', label: 'All sources' }, { id: 'bioicons', label: 'Bioicons & Servier' }, { id: 'scidraw', label: 'SciDraw' }, { id: 'iconify', label: 'Iconify' }, { id: 'kenney', label: 'Kenney CC0' }, { id: 'smithsonian', label: 'Smithsonian' }];
  }, [kind]);

  useEffect(() => {
    if (!visibleProviders.some((item) => item.id === provider)) setProvider('all');
  }, [provider, visibleProviders]);

  const submitSearch = () => {
    const value = query.trim();
    if (value.length < 2) {
      setError('Search for at least two characters.');
      return;
    }
    setSubmitted(value);
  };

  const importAsset = async (asset: StudioAssetCatalogItem) => {
    setImporting(asset.id);
    try {
      const resource = await importStudioAssetCatalogItem(asset);
      onImported(resource);
      toast.success(mode === 'picker' ? `${asset.title} added to the screen.` : `${asset.title} added to My Resources.`);
    } catch (failure) {
      toast.error(getApiErrorDetails(failure, 'Unable to import this asset.').message);
    } finally {
      setImporting('');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_190px_auto]">
          <label className="relative min-w-0">
            <span className="sr-only">Search reusable assets</span>
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }} placeholder="Search heart, neuron, cell, apparatus…" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
            {query ? <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Clear asset search"><X size={16} /></button> : null}
          </label>
          <select value={provider} onChange={(event) => setProvider(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
            {visibleProviders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <button type="button" onClick={submitSearch} className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800">Search</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="text-xs font-semibold text-slate-600">Try:</span>{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => { setQuery(starter); setSubmitted(starter); }} className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-900 transition hover:-translate-y-0.5 hover:bg-blue-100">{starter}</button>)}</div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {KINDS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setKind(item.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${kind === item.id ? 'border-blue-900 bg-blue-900 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50'}`}><Icon size={16} />{item.label}</button>; })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Asset composition">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Use as</span>
        {([
          ['component', 'Individual components'],
          ['block', 'Complete diagrams'],
          ['all', 'Both'],
        ] as Array<[StudioAssetCatalogComposition, string]>).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setComposition(id)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${composition === id ? 'border-violet-700 bg-violet-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50'}`}>{label}</button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">{submitted ? `Assets for “${submitted}”` : 'Reusable assets'}</h2><p className="text-xs text-slate-500">Verified reusable assets retain their creator, source, licence and attribution requirements.</p></div>{!loading ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{assets.length} results</span> : null}</div>
      {unavailable.length ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Some sources are temporarily unavailable: {unavailable.map((item) => item.id).join(', ')}. Available sources are still shown.</p> : null}
      {loading ? <div className="grid min-h-72 place-items-center text-sm text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={20} />Searching approved asset sources…</span></div> : null}
      {!loading && error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800">{error}</div> : null}
      {!loading && !error && assets.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-12 text-center"><Search className="mx-auto text-slate-300" size={36} /><p className="mt-3 font-semibold text-slate-700">No matching reusable assets</p><p className="mt-1 text-sm text-slate-500">Try a shorter object name or select All assets.</p></div> : null}
      {!loading && !error && assets.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{assets.map((asset) => <CatalogCard key={asset.id} asset={asset} importing={importing === asset.id} onImport={() => void importAsset(asset)} mode={mode} />)}</div> : null}
    </div>
  );
}
