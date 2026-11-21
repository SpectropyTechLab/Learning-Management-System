import { useEffect, useState } from 'react';
import { ArrowLeft, FlaskConical, LoaderCircle, WandSparkles } from 'lucide-react';
import { createChemistryLabProject, loadChemistryLabCatalog, validateChemistryLabProject, type ChemistryLabCatalog, type ChemistryLabProject } from './chemistryLabModel';

type Props = {
  initialProject?: ChemistryLabProject | null;
  editingExisting?: boolean;
  onBack: () => void;
  onInsert: (project: ChemistryLabProject) => void;
};

export default function ChemistryLabStudio({ initialProject, editingExisting = false, onBack, onInsert }: Props) {
  const [catalog, setCatalog] = useState<ChemistryLabCatalog | null>(null);
  const [project, setProject] = useState<ChemistryLabProject | null>(initialProject ? validateChemistryLabProject(initialProject) : null);
  const [source] = useState(() => `/studio-labs/chemistry/chemistry-lab.html?embed=1${initialProject ? `&lab=${encodeURIComponent(initialProject.labId)}` : ''}`);
  const [error, setError] = useState('');
  useEffect(() => { void loadChemistryLabCatalog().then(setCatalog).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load Chemistry Lab.')); }, []);
  useEffect(() => {
    if (!catalog) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'spectropy-chemistry-lab-selected') return;
      const entry = catalog.labs.find((candidate) => candidate.id === event.data.labId);
      if (entry) setProject((current) => ({ ...createChemistryLabProject(entry), metadata: current?.metadata }));
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [catalog]);
  if (error) return <main className="grid h-dvh place-items-center bg-slate-950 p-6 text-white"><section className="max-w-xl rounded-2xl border border-red-400/40 bg-red-500/10 p-6"><h1 className="text-xl font-bold">Chemistry Lab could not open</h1><p className="mt-2 text-red-100">{error}</p><button type="button" onClick={onBack} className="mt-5 rounded-lg border border-white/30 px-4 py-2">Back to Editor</button></section></main>;
  if (!catalog) return <main className="grid h-dvh place-items-center bg-[#07111f] text-emerald-200"><div className="text-center"><LoaderCircle className="mx-auto animate-spin" size={42} /><p className="mt-3 font-semibold">Loading all Chemistry Lab activities…</p></div></main>;
  return <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#07111f] text-white">
    <header className="flex min-h-[68px] shrink-0 items-center gap-3 border-b border-emerald-400/25 bg-[#0b1728] px-4 shadow-xl">
      <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-600 bg-slate-900 hover:border-emerald-300" aria-label="Back to Screen Editor"><ArrowLeft size={20} /></button>
      <FlaskConical size={25} className="text-emerald-300" /><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.24em] text-emerald-300">Chemistry Lab · {catalog.labs.length} activities</p><h1 className="truncate text-lg font-bold">{project?.title || 'Choose an experiment'}</h1></div>
      <button type="button" disabled={!project} onClick={() => project && onInsert(project)} className="ml-auto flex min-h-12 items-center gap-2 rounded-xl bg-emerald-300 px-5 font-bold text-slate-950 shadow-lg transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"><WandSparkles size={19} />{editingExisting ? 'Update Lab on Screen' : 'Insert Lab into Screen'}</button>
    </header>
    <iframe title="Chemistry Lab authoring environment" src={source} allow="fullscreen" sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-presentation allow-modals" className="min-h-0 flex-1 border-0 bg-[#07111f]" />
  </main>;
}
