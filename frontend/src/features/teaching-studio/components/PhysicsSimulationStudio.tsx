import { useRef, useState } from 'react';
import { ArrowLeft, Download, Pause, Play, RefreshCcw, Upload, WandSparkles } from 'lucide-react';
import SimulationPreviewCanvas from './SimulationPreviewCanvas';
import { buildStandaloneSimulationHtml } from './simulationExport';
import { SIMULATION_TEMPLATES, createSimulationDocument, templateById, validateSimulationDocument, type SimulationDocument, type SimulationSubject } from './simulationStudioModel';

export type PhysicsSimulationProject = SimulationDocument;
export type PhysicsSimulationInsert = { project: SimulationDocument; title: string; html: string };
type Props = { initialProject?: SimulationDocument | null; initialSubject?: SimulationSubject; initialTemplateId?: string; onBack: () => void; onInsert: (simulation: PhysicsSimulationInsert) => void; onImport?: (simulation: SimulationDocument) => Promise<SimulationDocument> };
const firstTemplate = (subject: SimulationSubject) => SIMULATION_TEMPLATES.find((item) => item.subject === subject && !['scene', 'periodic-table'].includes(item.kind)) || SIMULATION_TEMPLATES[1];

export default function PhysicsSimulationStudio({ initialProject, initialSubject = 'physics', initialTemplateId, onBack, onInsert, onImport }: Props) {
  const requestedTemplate = (initialTemplateId && templateById(initialTemplateId)) || firstTemplate(initialSubject);
  const initial = initialProject ? validateSimulationDocument(initialProject) : createSimulationDocument(requestedTemplate);
  const [simulation, setSimulation] = useState(initial);
  const [paused, setPaused] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const definition = templateById(simulation.templateId) || firstTemplate(simulation.subject);
  const controlDefinitions = simulation.kind === 'scene' ? simulation.controls || [] : definition.parameters;
  const applyImport = async (raw: string) => {
    setImporting(true);
    try {
      const parsed = validateSimulationDocument(JSON.parse(raw));
      const registered = onImport ? await onImport(parsed) : parsed;
      setSimulation(registered);
      setImportOpen(false);
      setImportText('');
      setImportError('');
      setResetToken((value) => value + 1);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid Simulation JSON.');
    } finally {
      setImporting(false);
    }
  };
  const exportJson = () => { const blob = new Blob([JSON.stringify(simulation, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${simulation.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'simulation'}.json`; link.click(); URL.revokeObjectURL(url); };

  return <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#07111f] text-slate-100">
    <header className="flex min-h-[68px] shrink-0 items-center gap-3 border-b border-cyan-400/30 bg-[#0b1728] px-4 shadow-xl">
      <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-600 bg-slate-900 hover:border-cyan-300 hover:text-cyan-300" aria-label="Back to Screen Editor"><ArrowLeft size={20} /></button>
      <div className="min-w-52"><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">SPECTROPY</p><h1 className="text-lg font-bold">Simulation Creator</h1></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-300">{simulation.title}</p></div>
      <button type="button" onClick={() => setImportOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-3 text-sm font-semibold hover:border-cyan-300"><Upload size={17} /> Import JSON</button>
      <button type="button" onClick={exportJson} className="flex h-11 items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-3 text-sm font-semibold hover:border-cyan-300"><Download size={17} /> Export JSON</button>
      <button type="button" onClick={() => onInsert({ project: simulation, title: simulation.title, html: buildStandaloneSimulationHtml(simulation) })} className="flex h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300"><WandSparkles size={18} /> Export &amp; Insert</button>
    </header>
    <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-4 p-4">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0a1422] shadow-2xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700 px-4"><div><h2 className="font-bold">{simulation.title}</h2><p className="text-xs text-slate-400">Live 16:9 preview · touch and Smart Board ready</p></div><div className="flex gap-2"><button type="button" onClick={() => setPaused((value) => !value)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-600 bg-slate-900 hover:border-cyan-300" aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play size={18} /> : <Pause size={18} />}</button><button type="button" onClick={() => setResetToken((value) => value + 1)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-600 bg-slate-900 hover:border-cyan-300" aria-label="Reset"><RefreshCcw size={18} /></button></div></div>
        <div className="grid min-h-0 flex-1 place-items-center p-5"><div className="grid aspect-video h-auto max-h-full w-full max-w-full grid-cols-[minmax(0,1fr)_240px] overflow-hidden rounded-xl border border-slate-600 bg-[#09111d]"><div className="min-w-0"><SimulationPreviewCanvas simulation={simulation} paused={paused} resetToken={resetToken} onChange={setSimulation} /></div><section className="flex min-h-0 flex-col border-l border-cyan-400/25 bg-[#0d1929] p-3" aria-label="Live lesson controls"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Live lesson controls</p><p className="mt-1 text-[10px] leading-4 text-slate-400">Teacher-facing controls saved on the Screen.</p></div><div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">{controlDefinitions.map((parameter) => <label key={`lesson-${parameter.key}`} className="block text-[10px] font-semibold text-slate-200"><span className="flex justify-between gap-2"><span>{parameter.label}</span><b className="text-yellow-300">{simulation.parameters[parameter.key]} {parameter.unit}</b></span><input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={simulation.parameters[parameter.key]} onChange={(event) => setSimulation({ ...simulation, parameters: { ...simulation.parameters, [parameter.key]: Number(event.target.value) } })} className="mt-1 w-full accent-cyan-400" /></label>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setPaused((value) => !value)} className="min-h-9 rounded-lg border border-cyan-400/60 bg-cyan-400/10 text-xs font-bold text-cyan-200">{paused ? '▶ Play' : '⏸ Pause'}</button><button type="button" onClick={() => setResetToken((value) => value + 1)} className="min-h-9 rounded-lg border border-cyan-400/60 bg-cyan-400/10 text-xs font-bold text-cyan-200">↺ Reset</button></div></section></div></div>
        <div className="shrink-0 border-t border-slate-700 bg-slate-950/70 px-5 py-3 text-sm text-slate-300">{simulation.caption}</div>
      </div>
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1728] shadow-2xl">
        <div className="border-b border-slate-700 px-4 py-3"><h2 className="font-bold">Simulation Properties</h2><p className="text-xs text-slate-400">Fine-tune the selected ribbon template or imported JSON.</p></div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400">Title<input value={simulation.title} onChange={(event) => setSimulation({ ...simulation, title: event.target.value })} className="mt-2 h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300" /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-400">Caption<textarea value={simulation.caption} onChange={(event) => setSimulation({ ...simulation, caption: event.target.value })} rows={3} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white outline-none focus:border-cyan-300" /></label>
          {controlDefinitions.map((parameter) => <label key={parameter.key} className="block text-xs font-semibold text-slate-300"><span className="flex justify-between"><span>{parameter.label}</span><b className="text-yellow-300">{simulation.parameters[parameter.key]} {parameter.unit}</b></span><input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={simulation.parameters[parameter.key]} onChange={(event) => setSimulation({ ...simulation, parameters: { ...simulation.parameters, [parameter.key]: Number(event.target.value) } })} className="mt-2 w-full accent-cyan-400" /></label>)}
          <label className="block text-xs font-semibold text-slate-300"><span className="flex justify-between"><span>Animation speed</span><b className="text-yellow-300">{simulation.speed.toFixed(2)}×</b></span><input type="range" min="0.25" max="3" step="0.25" value={simulation.speed} onChange={(event) => setSimulation({ ...simulation, speed: Number(event.target.value) })} className="mt-2 w-full accent-cyan-400" /></label>
          <div className="grid grid-cols-2 gap-2">{(['vectors', 'labels', 'trail', 'grid'] as const).map((key) => <label key={key} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm capitalize"><input type="checkbox" checked={simulation.options[key]} onChange={(event) => setSimulation({ ...simulation, options: { ...simulation.options, [key]: event.target.checked } })} className="h-5 w-5 accent-cyan-400" />{key}</label>)}</div>
        </div>
      </aside>
    </section>
    {importOpen ? (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-5 backdrop-blur-sm">
        <section className="w-full max-w-2xl rounded-2xl border border-cyan-400/30 bg-[#0b1728] p-5 shadow-2xl">
          <h2 className="text-xl font-bold">Import Simulation JSON</h2>
          <p className="mt-1 text-sm text-slate-400">Paste a <code className="text-cyan-300">spectropy.simulation.v1</code> document or choose a JSON file. A successful import is saved to its subject's Quick Start collection.</p>
          <textarea value={importText} onChange={(event) => { setImportText(event.target.value); setImportError(''); }} rows={14} className="mt-4 w-full rounded-xl border border-slate-600 bg-slate-950 p-4 font-mono text-xs text-slate-200 outline-none focus:border-cyan-300" placeholder='{ "schema": "spectropy.simulation.v1", ... }' />
          {importError ? <p className="mt-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{importError}</p> : null}
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then((text) => { setImportText(text); setImportError(''); }); }} />
          <div className="mt-4 flex justify-between">
            <button type="button" disabled={importing} onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:border-cyan-300 disabled:opacity-50">Choose JSON file</button>
            <div className="flex gap-2">
              <button type="button" disabled={importing} onClick={() => { setImportOpen(false); setImportError(''); }} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">Cancel</button>
              <button type="button" disabled={importing} onClick={() => void applyImport(importText)} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-wait disabled:opacity-60">{importing ? 'Adding to Quick Start…' : 'Import & Render'}</button>
            </div>
          </div>
        </section>
      </div>
    ) : null}
  </main>;
}
