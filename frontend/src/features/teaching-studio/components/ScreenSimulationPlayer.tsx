import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { SimulationDocument } from './simulationStudioModel';
import SimulationPreviewCanvas from './SimulationPreviewCanvas';
import PhysicsRuntimePreview, { type PhysicsRuntimeCommand, type PhysicsRuntimeState } from './physics-runtime/PhysicsRuntimePreview';
import { physicsEquationToLatex } from './physics-runtime/physicsExpressionLatex';

type Props = { simulation: SimulationDocument; className?: string; onReady?: () => void };

/** Presentation-only simulation surface used by Screen elements. */
export default function ScreenSimulationPlayer({ simulation, className = '', onReady }: Props) {
  const [paused, setPaused] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [tab, setTab] = useState<'variables' | 'equations' | 'objects' | 'results'>('variables');
  const [runtimeState, setRuntimeState] = useState<PhysicsRuntimeState | null>(null);
  const [runtimeCommand, setRuntimeCommand] = useState<PhysicsRuntimeCommand | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [graphType, setGraphType] = useState('line');
  const [viewMode, setViewMode] = useState('both');
  const readyReportedRef = useRef(false);
  const nativePhysics = simulation.subject === 'physics' && simulation.metadata?.source === 'SPECTROPY Activity Studio HTML';
  const nativeChemistry = simulation.subject === 'chemistry' && simulation.metadata?.source === 'SPECTROPY Activity Studio HTML';
  const nativeBiology = simulation.subject === 'biology' && simulation.metadata?.source === 'SPECTROPY Activity Studio HTML';
  const nativeMathematics = simulation.subject === 'mathematics' && simulation.metadata?.source === 'SPECTROPY Activity Studio HTML';
  const nativeRuntime = nativePhysics || nativeChemistry || nativeBiology || nativeMathematics;
  const markReady = useCallback(() => {
    if (readyReportedRef.current || !onReady) return;
    readyReportedRef.current = true;
    window.requestAnimationFrame(() => window.requestAnimationFrame(onReady));
  }, [onReady]);
  useEffect(() => {
    readyReportedRef.current = false;
  }, [simulation]);
  useEffect(() => {
    if (!nativeRuntime) markReady();
  }, [markReady, nativeRuntime, simulation]);
  const values = runtimeState?.values || {};
  const sendVariable = (key: string, value: number) => setRuntimeCommand((previous) => ({ id: (previous?.id || 0) + 1, action: 'setVariable', key, value }));
  const visibleRows = useMemo(() => tab === 'variables' ? simulation.variables : tab === 'equations' ? simulation.equations : tab === 'objects' ? simulation.objects : simulation.results, [simulation, tab]);
  const toggleFullScreen = async () => {
    const node = document.getElementById(`screen-simulation-player-${simulation.templateId}`);
    if (!node) return;
    if (document.fullscreenElement === node) await document.exitFullscreen();
    else if (node.requestFullscreen) await node.requestFullscreen();
  };
  return (
    <div id={`screen-simulation-player-${simulation.templateId}`} onFullscreenChange={() => setFullScreen(document.fullscreenElement !== null)} className={`group relative h-full w-full overflow-hidden bg-[#09111d] ${className}`}>
      <button type="button" aria-label={fullScreen ? 'Exit full screen' : 'Open full screen'} onClick={() => void toggleFullScreen()} className="absolute right-2 top-2 z-30 grid h-8 w-8 place-items-center rounded bg-slate-950/85 text-white shadow opacity-80 hover:opacity-100">
        {fullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <div className="grid h-full min-h-0 grid-cols-[minmax(190px,22%)_minmax(0,1fr)] gap-1 bg-[#07111f]">
        <aside className="min-h-0 overflow-hidden rounded border border-slate-700 bg-[#0b1728] text-slate-100">
          <nav className="grid grid-cols-4 border-b border-slate-700">{(['variables', 'equations', 'objects', 'results'] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`h-11 border-b-2 px-1 text-sm font-semibold capitalize ${tab === item ? 'border-cyan-300 text-cyan-200' : 'border-transparent text-slate-400'}`}>{item}</button>)}</nav>
          <div className="h-[calc(100%-36px)] overflow-y-auto p-2">
            {tab === 'variables' ? simulation.variables.map((variable) => { const value = Number(values[variable.id] ?? variable.value ?? variable.defaultValue ?? 0); return <div key={variable.id} className="mb-2 rounded border border-slate-600 bg-slate-900/70 p-2"><div className="flex justify-between text-xs font-semibold"><span>{variable.symbol || variable.id}</span><span className="text-cyan-300">{Number.isFinite(value) ? value : '—'} {variable.unit || ''}</span></div><input type="range" min={variable.min} max={variable.max} step={variable.step} value={Number.isFinite(value) ? value : variable.defaultValue} onChange={(event) => sendVariable(variable.id, Number(event.target.value))} className="mt-1 w-full accent-cyan-400" /></div>; }) : null}
            {tab === 'equations' ? simulation.equations.map((equation) => <div key={equation.id} className="mb-2 overflow-x-auto rounded border border-slate-600 bg-slate-900/70 p-2 text-sm text-slate-100" dangerouslySetInnerHTML={{ __html: katex.renderToString(physicsEquationToLatex(equation.output, equation.expression), { throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' }) }} />) : null}
            {tab === 'objects' ? simulation.objects.map((object) => <div key={object.id} className="mb-2 rounded border border-slate-600 bg-slate-900/70 p-2 text-sm">{object.label || object.id}<span className="ml-2 text-[10px] uppercase text-slate-500">{object.type}</span></div>) : null}
            {tab === 'results' ? simulation.results.map((result) => <div key={result.id} className="mb-2 flex justify-between rounded border border-slate-600 bg-slate-900/70 p-2 text-sm"><span>{result.label}</span><span className="text-cyan-300">{Number.isFinite(values[result.label]) ? values[result.label].toFixed(result.precision ?? 2) : '—'}</span></div>) : null}
            {!visibleRows.length ? <p className="p-2 text-[10px] text-slate-500">No {tab} available.</p> : null}
          </div>
        </aside>
        <section className="relative min-h-0 overflow-hidden rounded border border-slate-700 bg-[#09111d]">
          {nativeRuntime ? <div className="absolute right-12 top-2 z-10 flex gap-1 rounded bg-slate-950/90 p-1 text-sm"><select aria-label="Graph type" value={graphType} onChange={(event) => { setGraphType(event.target.value); setRuntimeCommand((p) => ({ id: (p?.id || 0) + 1, action: 'graph', value: event.target.value })); }} className="rounded border border-slate-600 bg-slate-900 px-1 py-1 text-white"><option value="line">Line vs variable</option><option value="xy">X-Y / phase</option><option value="bar">Bar values</option></select><select aria-label="View mode" value={viewMode} onChange={(event) => { setViewMode(event.target.value); setRuntimeCommand((p) => ({ id: (p?.id || 0) + 1, action: 'view', value: event.target.value })); }} className="rounded border border-slate-600 bg-slate-900 px-1 py-1 text-white"><option value="both">Scene + Graph</option><option value="scene">Scene</option><option value="graph">Graph</option><option value="side">Side by side</option></select></div> : null}
          {nativeRuntime ? <PhysicsRuntimePreview simulation={simulation} runtimeUrl={nativeChemistry ? '/studio-labs/chemistry/chemistry-simulation-studio.html?v=chemistry-library-icons-2' : nativeBiology ? '/studio-labs/biology/biology-simulation-studio.html?v=biology-runtime-1' : nativeMathematics ? '/studio-labs/mathematics/mathematics-simulation-studio.html?v=mathematics-runtime-1' : undefined} resetToken={resetToken} command={runtimeCommand} onState={(state) => { setRuntimeState(state); if (state) markReady(); }} presentationScale={1.25} /> : <SimulationPreviewCanvas simulation={simulation} paused={paused} resetToken={resetToken} />}
        </section>
      </div>
      {!nativeRuntime ? (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
          <button type="button" className="pointer-events-auto rounded bg-slate-950/85 px-2 py-1 text-[10px] text-white" onClick={() => setPaused((value) => !value)}>{paused ? 'Play' : 'Pause'}</button>
          <button type="button" className="pointer-events-auto rounded bg-slate-950/85 px-2 py-1 text-[10px] text-white" onClick={() => setResetToken((value) => value + 1)}>Reset</button>
        </div>
      ) : null}
      {nativeRuntime && runtimeState ? (
        <footer className="absolute bottom-0 left-[22%] right-0 flex h-11 items-center gap-1 overflow-x-auto border-t border-slate-600 bg-slate-950/95 px-2 text-sm text-slate-100">
          <button type="button" className="rounded border border-slate-600 px-2 py-1" onClick={() => setRuntimeCommand((p) => ({ id: (p?.id || 0) + 1, action: 'reset' }))}>↻</button>
          <button type="button" className="rounded border border-slate-600 px-2 py-1" onClick={() => setRuntimeCommand((p) => ({ id: (p?.id || 0) + 1, action: 'back' }))}>◀</button>
          <button type="button" className="rounded bg-cyan-400 px-3 py-1 font-bold text-slate-950" onClick={() => setRuntimeCommand((p) => ({ id: (p?.id || 0) + 1, action: 'play', value: !runtimeState.playing }))}>{runtimeState.playing ? '❚❚' : '▶'}</button>
          <button type="button" className="rounded border border-slate-600 px-2 py-1" onClick={() => setRuntimeCommand((p) => ({ id: (p?.id || 0) + 1, action: 'forward' }))}>▶</button>
          <span className="ml-2 font-semibold">Speed</span>
          {[1, 2, 3, 4, 5].map((speed) => <button key={speed} type="button" className={`rounded px-2 py-1 ${runtimeState.speed === speed ? 'bg-cyan-400 text-slate-950' : 'border border-slate-600'}`} onClick={() => setRuntimeCommand((p) => ({ id: (p?.id || 0) + 1, action: 'speed', value: speed }))}>{speed}×</button>)}
          <label className="ml-2 flex min-w-56 flex-1 items-center gap-2 whitespace-nowrap rounded border border-slate-700 bg-slate-900/80 px-2 py-1" aria-label={`${runtimeState.label} value player`}>
            <span className="font-semibold text-cyan-200">{runtimeState.label}</span>
            <input
              type="range"
              min={runtimeState.min}
              max={runtimeState.max}
              step={Math.max((runtimeState.max - runtimeState.min) / 500, Number.EPSILON)}
              value={runtimeState.value}
              onChange={(event) => setRuntimeCommand((p) => ({ id: (p?.id || 0) + 1, action: 'seek', value: Number(event.target.value) }))}
              className="min-w-28 flex-1 accent-cyan-400"
            />
            <span className="font-mono text-cyan-200">{runtimeState.value.toFixed(2)} {runtimeState.unit}</span>
          </label>
          <label className="flex items-center gap-1"><input type="checkbox" defaultChecked />Vectors</label><label className="flex items-center gap-1"><input type="checkbox" defaultChecked />Values</label><label className="flex items-center gap-1"><input type="checkbox" defaultChecked />Trails</label><label className="flex items-center gap-1"><input type="checkbox" defaultChecked />Grid</label>
        </footer>
      ) : null}
    </div>
  );
}
