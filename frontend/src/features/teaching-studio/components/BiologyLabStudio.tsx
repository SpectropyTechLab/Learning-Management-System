import { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, WandSparkles } from 'lucide-react';
import { createBiologyLabProject, loadBiologyLabCatalog, validateBiologyLabProject, type BiologyLabCatalog, type BiologyLabProject } from './biologyLabModel';

type Props = { initialProject?: BiologyLabProject | null; editingExisting?: boolean; onBack: () => void; onInsert: (project: BiologyLabProject) => void };
export default function BiologyLabStudio({ initialProject, editingExisting = false, onBack, onInsert }: Props) {
  const [catalog, setCatalog] = useState<BiologyLabCatalog | null>(null);
  const [project, setProject] = useState<BiologyLabProject | null>(initialProject ? validateBiologyLabProject(initialProject) : null);
  const [source] = useState(() => `/studio-labs/biology/biology-lab.html?author=1${initialProject ? `&lab=${encodeURIComponent(initialProject.launchKey)}` : ''}`);
  const [error, setError] = useState('');
  useEffect(() => { void loadBiologyLabCatalog().then(setCatalog).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load Biology Lab.')); }, []);
  useEffect(() => {
    if (!catalog) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'spectropy-biology-lab-selected') return;
      const entry = catalog.labs.find((candidate) => candidate.id === event.data.labId || candidate.launchKey === event.data.launchKey);
      if (entry) setProject((current) => ({ ...createBiologyLabProject(entry), metadata: current?.metadata }));
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [catalog]);
  if (error) return <main className="grid h-dvh place-items-center bg-[#13251d] p-6 text-white"><section className="max-w-xl rounded-2xl border border-red-400/40 bg-red-500/10 p-6"><h1 className="text-xl font-bold">Biology Lab could not open</h1><p className="mt-2 text-red-100">{error}</p><button type="button" onClick={onBack} className="mt-5 rounded-lg border border-white/30 px-4 py-2">Back to Editor</button></section></main>;
  if (!catalog) return <main className="grid h-dvh place-items-center bg-[#13251d] text-emerald-200"><div className="text-center"><LoaderCircle className="mx-auto animate-spin" size={42}/><p className="mt-3 font-semibold">Loading all Biology Lab activities…</p></div></main>;
  return <main className="relative h-dvh min-h-0 overflow-hidden bg-[#f3f0e8] text-white">
    <iframe title="Biology Lab authoring environment" src={source} allow="fullscreen" sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-presentation allow-modals" className="h-full w-full border-0 bg-[#f3f0e8]" />
    <button type="button" onClick={onBack} className="absolute bottom-4 left-4 z-10 grid h-11 w-11 place-items-center rounded-xl border border-emerald-800 bg-[#12241c] shadow-xl transition hover:border-emerald-300" aria-label="Back to Screen Editor"><ArrowLeft size={20} /></button>
    <button type="button" disabled={!project} onClick={() => project && onInsert(project)} className="absolute bottom-4 right-4 z-10 flex min-h-11 items-center gap-2 rounded-xl bg-emerald-300 px-4 font-bold text-slate-950 shadow-xl transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"><WandSparkles size={18} />{editingExisting ? 'Update Lab on Screen' : 'Insert Lab into Screen'}</button>
  </main>;
}
