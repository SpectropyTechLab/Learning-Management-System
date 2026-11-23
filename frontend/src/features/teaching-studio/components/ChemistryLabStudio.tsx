import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { validateChemistryLabProject, type ChemistryAuthoringProject, type ChemistryLabProject } from './chemistryLabModel';

type Props = {
  initialProject?: ChemistryLabProject | null;
  editingExisting?: boolean;
  onBack: () => void;
  onInsert: (project: ChemistryLabProject) => void;
};

export default function ChemistryLabStudio({ initialProject, editingExisting = false, onBack, onInsert }: Props) {
  const [project, setProject] = useState<ChemistryLabProject | null>(initialProject ? validateChemistryLabProject(initialProject) : null);
  const [error, setError] = useState('');
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.spx === 'error') {
        setError(String(event.data.message || 'Unable to load Chemistry Simulation Studio.'));
        return;
      }
      if (event.data?.spx !== 'insert' || !event.data.proj) return;
      const authoringProject = event.data.proj as ChemistryAuthoringProject;
      const next: ChemistryLabProject = {
        schema: 'spectropy.lab.v1',
        version: 1,
        subject: 'chemistry',
        labId: project?.labId || 'chemistry-authoring-studio',
        title: String(event.data.title || authoringProject.title || 'Chemistry Simulation'),
        topic: project?.topic || 'simulation-authoring',
        classes: project?.classes || [6, 7, 8, 9, 10, 11, 12],
        parameters: project?.parameters || {},
        authoringProject,
        metadata: project?.metadata,
      };
      setProject(next);
      onInsert(next);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onInsert, project]);

  const loadProject = () => {
    if (!project?.authoringProject) return;
    frameRef.current?.contentWindow?.postMessage({ spx: 'load', proj: project.authoringProject }, window.location.origin);
  };

  if (error) return <main className="grid h-dvh place-items-center bg-slate-950 p-6 text-white"><section className="max-w-xl rounded-2xl border border-red-400/40 bg-red-500/10 p-6"><h1 className="text-xl font-bold">Chemistry Simulation Studio could not open</h1><p className="mt-2 text-red-100">{error}</p><button type="button" onClick={onBack} className="mt-5 rounded-lg border border-white/30 px-4 py-2">Back to Editor</button></section></main>;

  return <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#07111f] text-white">
    <header className="flex min-h-[68px] shrink-0 items-center gap-3 border-b border-emerald-400/25 bg-[#0b1728] px-4 shadow-xl">
      <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-600 bg-slate-900 hover:border-emerald-300" aria-label="Back to Screen Editor"><ArrowLeft size={20} /></button>
      <FlaskConical size={25} className="text-emerald-300" />
      <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.24em] text-emerald-300">SPECTROPY Chemistry Simulation Studio</p><h1 className="truncate text-lg font-bold">{project?.title || 'Create a Chemistry simulation'}</h1></div>
      <span className="ml-auto text-xs text-slate-400">Use Insert into Slide inside the studio to {editingExisting ? 'update' : 'insert'} this Screen</span>
    </header>
    <iframe ref={frameRef} onLoad={loadProject} title="Chemistry Lab authoring environment" src="/studio-labs/chemistry/chemistry-simulation-studio.html?v=chemistry-library-icons-2" allow="fullscreen" sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-presentation allow-modals allow-downloads" className="min-h-0 flex-1 border-0 bg-[#07111f]" />
  </main>;
}
