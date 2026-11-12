import { useEffect, useState } from 'react';
import { Atom, Beaker, Box, ExternalLink, FlaskConical, Loader2, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import {
  importStudioTeachingResource,
  searchStudioTeachingResources,
  type StudioResourceSummary,
  type StudioTeachingResource,
} from '../../api/studioResourcesApi';

interface Props {
  search: string;
  onImported: (resource: StudioResourceSummary) => void;
}

const starterConcepts = ['glucose', 'DNA', 'protein', 'stoichiometry', 'acid base', 'enzyme'];

const ResourceIcon = ({ resource }: { resource: StudioTeachingResource }) => {
  if (resource.provider === 'pubchem') return <Atom size={24} />;
  if (resource.provider === 'rcsb') return <Box size={24} />;
  if (resource.subject === 'chemistry') return <FlaskConical size={24} />;
  return <Beaker size={24} />;
};

export default function TeachingResourceHub({ search, onImported }: Props) {
  const [query, setQuery] = useState(search);
  const [submitted, setSubmitted] = useState(search);
  const [subject, setSubject] = useState('');
  const [provider, setProvider] = useState('all');
  const [resources, setResources] = useState<StudioTeachingResource[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState('');

  useEffect(() => {
    if (!search.trim()) return;
    setQuery(search.trim());
    setSubmitted(search.trim());
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void searchStudioTeachingResources({ search: submitted, subject, provider })
      .then((result) => {
        if (!active) return;
        setResources(result.results);
        setUnavailable(result.unavailable_providers);
      })
      .catch((failure) => {
        if (!active) return;
        setResources([]);
        setError(getApiErrorDetails(failure, 'Unable to load teaching resources.').message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provider, subject, submitted]);

  const addToLibrary = async (resource: StudioTeachingResource) => {
    setImporting(resource.id);
    try {
      const imported = await importStudioTeachingResource(resource);
      onImported(imported);
      toast.success('Teaching resource added to My Resources.');
    } catch (failure) {
      toast.error(getApiErrorDetails(failure, 'Unable to add this teaching resource.').message);
    } finally {
      setImporting('');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_170px_210px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setSubmitted(query.trim()); }} placeholder="Search a concept: glucose, DNA, enzyme…" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" />
          </label>
          <select value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"><option value="">All subjects</option><option value="chemistry">Chemistry</option><option value="biology">Biology</option><option value="physics">Physics</option><option value="mathematics">Mathematics</option></select>
          <select value={provider} onChange={(event) => setProvider(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"><option value="all">All approved sources</option><option value="curated">Reviewed teaching collections</option><option value="pubchem">PubChem molecules</option><option value="rcsb">RCSB biomolecules</option></select>
          <button type="button" onClick={() => setSubmitted(query.trim())} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white">Search</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="text-xs font-semibold text-slate-600">Concept examples:</span>{starterConcepts.map((concept) => <button key={concept} type="button" onClick={() => { setQuery(concept); setSubmitted(concept); }} className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-900 hover:bg-blue-100">{concept}</button>)}</div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Licence-controlled providers:</strong> PhET, GeoGebra and OpenStax are intentionally not enabled until Spectropy obtains permission suitable for commercial use.</div>
      {unavailable.length ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">Temporarily unavailable: {unavailable.join(', ')}.</p> : null}
      {loading ? <div className="grid min-h-48 place-items-center text-sm text-slate-600"><span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={18} />Loading approved teaching resources…</span></div> : null}
      {!loading && error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-800">{error}</div> : null}
      {!loading && !error && resources.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No approved resource matches this concept yet. Try Chemistry or Biology examples, or upload a reviewed Spectropy resource.</div> : null}
      {!loading && !error && resources.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{resources.map((resource) => <article key={resource.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md">
        <div className="flex gap-3 p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50 text-blue-900">{resource.thumbnail_url ? <img src={resource.thumbnail_url} alt="" className="h-full w-full object-contain" /> : <ResourceIcon resource={resource} />}</div>
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-blue-800">{resource.subject} · {resource.resource_kind}</p><h3 className="mt-1 line-clamp-2 font-bold text-slate-900">{resource.title}</h3><p className="mt-1 text-xs text-slate-500">{resource.provider_label}</p></div>
        </div>
        <div className="border-t border-slate-100 px-4 py-3 text-sm"><p className="line-clamp-2 text-slate-600">{resource.description}</p><p className="mt-2"><strong className="text-slate-800">Teaching use:</strong> <span className="text-slate-600">{resource.teaching_use}</span></p><div className="mt-2 flex flex-wrap gap-1">{resource.grades.map((grade) => <span key={grade} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">Class {grade}</span>)}{resource.exam_tracks.map((track) => <span key={track} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">{track}</span>)}</div></div>
        <footer className="flex items-center gap-2 border-t border-slate-100 p-3"><button type="button" disabled={Boolean(importing)} onClick={() => void addToLibrary(resource)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{importing === resource.id ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}Add to My Resources</button><a href={resource.source_url} target="_blank" rel="noreferrer" title="Open official source" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600"><ExternalLink size={14} /></a></footer>
      </article>)}</div> : null}
    </div>
  );
}
