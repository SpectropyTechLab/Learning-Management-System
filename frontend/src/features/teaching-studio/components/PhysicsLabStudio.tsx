import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Beaker, BookOpen, ChevronLeft, ChevronRight, Eraser, Expand, FlaskConical, Gauge, LineChart, ListFilter, Pause, Play, RotateCcw, Save, Search, Undo2, WandSparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createPhysicsLabProject,
  loadPhysicsLabCatalog,
  loadPhysicsLabRuntime,
  validatePhysicsLabProject,
  type PhysicsLabCatalog,
  type PhysicsLabCatalogEntry,
  type PhysicsLabDefinition,
  type PhysicsLabProject,
} from './physicsLabModel';
import PhysicsLabThumbnail from './PhysicsLabThumbnail';

type Props = {
  initialProject?: PhysicsLabProject | null;
  editingExisting?: boolean;
  onBack: () => void;
  onInsert: (project: PhysicsLabProject) => void;
};

const LAB_WIDTH = 1000;
const LAB_HEIGHT = 560;

const LabCanvas = ({ definition, parameters, paused, resetToken, onParameterChange, onTick, runtimeStateRef }: {
  definition: PhysicsLabDefinition;
  parameters: Record<string, unknown>;
  paused: boolean;
  resetToken: number;
  onParameterChange: (patch: Record<string, unknown>) => void;
  onTick: () => void;
  runtimeStateRef: MutableRefObject<unknown>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const parametersRef = useRef(parameters);
  const viewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  parametersRef.current = parameters;

  useEffect(() => {
    definition.dispose?.(runtimeStateRef.current);
    runtimeStateRef.current = definition.init(parametersRef.current);
    return () => definition.dispose?.(runtimeStateRef.current);
  }, [definition, resetToken]);

  useEffect(() => {
    let animationFrame = 0;
    let previous = performance.now();
    let lastReactTick = 0;
    const render = (now: number) => {
      const canvas = canvasRef.current;
      const host = hostRef.current;
      const state = runtimeStateRef.current;
      if (canvas && host && state) {
        const width = host.clientWidth;
        const height = host.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        const pixelWidth = Math.max(1, Math.round(width * dpr));
        const pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        const scale = Math.min(width / LAB_WIDTH, height / LAB_HEIGHT);
        const offsetX = (width - LAB_WIDTH * scale) / 2;
        const offsetY = (height - LAB_HEIGHT * scale) / 2;
        viewRef.current = { scale, offsetX, offsetY };
        const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
        previous = now;
        if (!paused) definition.step?.(state, parametersRef.current, delta, now / 1000);
        const context = canvas.getContext('2d');
        if (context) {
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.fillStyle = '#141518';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
          context.save();
          context.beginPath();
          context.rect(0, 0, LAB_WIDTH, LAB_HEIGHT);
          context.clip();
          definition.draw(context, state, parametersRef.current, now / 1000);
          context.restore();
        }
        if (now - lastReactTick > 150) {
          lastReactTick = now;
          onTick();
        }
      }
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
  }, [definition, paused, onTick]);

  const pointer = (phase: 'down' | 'move' | 'up', event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!definition.pointer || !canvasRef.current || !runtimeStateRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { scale, offsetX, offsetY } = viewRef.current;
    const x = (event.clientX - rect.left - offsetX) / scale;
    const y = (event.clientY - rect.top - offsetY) / scale;
    if (phase === 'down') event.currentTarget.setPointerCapture(event.pointerId);
    const patch = definition.pointer(runtimeStateRef.current, parametersRef.current, x, y, phase);
    if (patch) onParameterChange(patch);
  };

  return <div ref={hostRef} className="relative h-full min-h-[280px] w-full overflow-hidden rounded-xl bg-[#141518] shadow-inner">
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      onPointerDown={(event) => pointer('down', event)}
      onPointerMove={(event) => pointer('move', event)}
      onPointerUp={(event) => pointer('up', event)}
      onPointerCancel={(event) => pointer('up', event)}
    />
  </div>;
};

const LabGraph = ({ definition, rows, colour }: { definition: PhysicsLabDefinition; rows: unknown[][]; colour: string }) => {
  const plot = definition.plot;
  if (!plot) return <div className="grid h-full place-items-center text-sm text-slate-500">This activity does not require a graph.</div>;
  const points = rows.map((row) => [Number(row[plot.x]), Number(row[plot.y])] as const).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!points.length) return <div className="grid h-full place-items-center text-sm text-slate-500">Record readings to plot the graph.</div>;
  const xs = points.map(([x]) => x); const ys = points.map(([, y]) => y);
  let minX = Math.min(0, ...xs); let maxX = Math.max(...xs); let minY = Math.min(0, ...ys); let maxY = Math.max(...ys);
  if (maxX === minX) maxX = minX + 1;
  if (maxY === minY) maxY = minY + 1;
  const px = (x: number) => 58 + ((x - minX) / (maxX - minX)) * 412;
  const py = (y: number) => 210 - ((y - minY) / (maxY - minY)) * 174;
  let trend: [number, number, number, number] | null = null;
  if (plot.fit !== false && points.length >= 2) {
    const n = points.length;
    const sx = points.reduce((sum, point) => sum + point[0], 0);
    const sy = points.reduce((sum, point) => sum + point[1], 0);
    const sxx = points.reduce((sum, point) => sum + point[0] * point[0], 0);
    const sxy = points.reduce((sum, point) => sum + point[0] * point[1], 0);
    const denominator = n * sxx - sx * sx;
    if (Math.abs(denominator) > 1e-12) {
      const slope = (n * sxy - sx * sy) / denominator;
      const intercept = (sy - slope * sx) / n;
      trend = [minX, intercept + slope * minX, maxX, intercept + slope * maxX];
    }
  }
  return <svg viewBox="0 0 500 250" className="h-full w-full" role="img" aria-label="Observation graph">
    <rect width="500" height="250" rx="12" fill="#0b1119" />
    {[0, 1, 2, 3, 4].map((index) => <g key={index} opacity=".16"><line x1={58 + index * 103} y1="24" x2={58 + index * 103} y2="210" stroke="#fff" /><line x1="58" y1={24 + index * 46.5} x2="470" y2={24 + index * 46.5} stroke="#fff" /></g>)}
    <line x1="58" y1="24" x2="58" y2="210" stroke="#94a3b8" /><line x1="58" y1="210" x2="470" y2="210" stroke="#94a3b8" />
    {trend ? <line x1={px(trend[0])} y1={py(trend[1])} x2={px(trend[2])} y2={py(trend[3])} stroke={colour} strokeWidth="2" strokeDasharray="7 5" opacity=".65" /> : null}
    {plot.fit === false && points.length > 1 ? <polyline points={[...points].sort((a, b) => a[0] - b[0]).map(([x, y]) => `${px(x)},${py(y)}`).join(' ')} fill="none" stroke={colour} strokeWidth="2" opacity=".65" /> : null}
    {points.map(([x, y], index) => <circle key={`${x}-${y}-${index}`} cx={px(x)} cy={py(y)} r="5" fill={colour} stroke="#0b1119" strokeWidth="2" />)}
    <text x="264" y="240" fill="#cbd5e1" fontSize="12" textAnchor="middle">{definition.columns?.[plot.x] || 'x'}</text>
    <text x="15" y="118" fill="#cbd5e1" fontSize="12" textAnchor="middle" transform="rotate(-90 15 118)">{definition.columns?.[plot.y] || 'y'}</text>
  </svg>;
};

const topicIcon = (topic: string) => topic === 'elec' ? '⚡' : topic === 'light' ? '🔭' : topic === 'mag' ? '🧲' : topic === 'sound' ? '〰️' : topic === 'heat' ? '🌡️' : topic === 'meas' ? '📏' : topic === 'modern' ? '⚛️' : topic === 'math' ? '∑' : '⚙️';

export default function PhysicsLabStudio({ initialProject, editingExisting = false, onBack, onInsert }: Props) {
  const [catalog, setCatalog] = useState<PhysicsLabCatalog | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, PhysicsLabDefinition>>({});
  const [project, setProject] = useState<PhysicsLabProject | null>(initialProject ? validatePhysicsLabProject(initialProject) : null);
  const [classFilter, setClassFilter] = useState<number | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [paused, setPaused] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [step, setStep] = useState(0);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState<'guide' | 'controls' | 'readings' | 'observations' | 'graph'>('controls');
  const stateRef = useRef<unknown>(null);
  const handleRuntimeTick = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    Promise.all([loadPhysicsLabCatalog(), loadPhysicsLabRuntime()])
      .then(([nextCatalog, nextDefinitions]) => { setCatalog(nextCatalog); setDefinitions(nextDefinitions); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load Physics Lab.'));
  }, []);

  const definition = project ? definitions[project.labId] : null;
  useEffect(() => {
    if (!definition || !project) return;
    setRows([]); setStep(0); setResetToken((value) => value + 1);
  }, [definition, project?.labId]);

  const entries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (catalog?.labs || []).filter((entry) =>
      (classFilter === 'all' || entry.classes.includes(classFilter))
      && (topicFilter === 'all' || entry.topic === topicFilter)
      && (!query || `${entry.title} ${entry.aim} ${entry.topicLabel}`.toLowerCase().includes(query)));
  }, [catalog, classFilter, topicFilter, search]);

  const openLab = (entry: PhysicsLabCatalogEntry) => {
    const nextDefinition = definitions[entry.id];
    if (!nextDefinition) return;
    if (stateRef.current) definition?.dispose?.(stateRef.current);
    stateRef.current = null;
    setProject(createPhysicsLabProject(entry, nextDefinition));
    setPaused(false); setRows([]); setStep(0); setError('');
  };

  const updateParameters = (patch: Record<string, unknown>, key?: string) => {
    if (!project || !definition) return;
    const parameters = { ...project.parameters, ...patch };
    if (stateRef.current) definition.onChange?.(stateRef.current, parameters, key || Object.keys(patch)[0]);
    setProject({ ...project, parameters });
  };

  if (error) return <main className="grid h-dvh place-items-center bg-slate-950 p-6 text-white"><section className="max-w-xl rounded-2xl border border-red-400/40 bg-red-500/10 p-6"><h1 className="text-xl font-bold">Physics Lab could not open</h1><p className="mt-2 text-red-100">{error}</p><button type="button" onClick={onBack} className="mt-5 rounded-lg border border-white/30 px-4 py-2">Back to Editor</button></section></main>;

  if (!catalog || !Object.keys(definitions).length) return <main className="grid h-dvh place-items-center bg-[#07111f] text-cyan-200"><div className="text-center"><FlaskConical className="mx-auto animate-pulse" size={42} /><p className="mt-3 font-semibold">Loading all 129 Physics Lab activities…</p></div></main>;

  if (!project || !definition) return <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#07111f] text-slate-100">
    <header className="flex min-h-[68px] shrink-0 items-center gap-3 border-b border-cyan-400/25 bg-[#0b1728] px-4 shadow-xl">
      <button type="button" onClick={onBack} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-600 bg-slate-900 hover:border-cyan-300" aria-label="Back to Screen Editor"><ArrowLeft size={20} /></button>
      <div><p className="text-[11px] font-bold uppercase tracking-[.24em] text-cyan-300">SPECTROPY</p><h1 className="text-lg font-bold">Physics Lab</h1></div>
      <div className="ml-auto flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-sm"><FlaskConical size={17} className="text-cyan-300" /><b>{entries.length}</b> of 129 activities</div>
    </header>
    <section className="shrink-0 border-b border-slate-700 bg-[#0d1929] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search experiment, concept or apparatus" className="h-11 w-full rounded-xl border border-slate-600 bg-slate-950 pl-10 pr-3 text-sm outline-none focus:border-cyan-300" /></div>
        <ListFilter size={18} className="ml-2 text-slate-400" />
        {(['all', 6, 7, 8, 9, 10, 11, 12] as const).map((grade) => <button type="button" key={grade} onClick={() => setClassFilter(grade)} className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${classFilter === grade ? 'border-white bg-white text-slate-950' : 'border-slate-600 hover:border-slate-400'}`}>{grade === 'all' ? 'All classes' : `Class ${grade}`}</button>)}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setTopicFilter('all')} className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${topicFilter === 'all' ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-slate-600'}`}>All topics</button>
        {Object.entries(catalog.topics).map(([id, topic]) => <button type="button" key={id} onClick={() => setTopicFilter(id)} className="flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold" style={{ borderColor: topicFilter === id ? topic.colour : '#475569', background: topicFilter === id ? topic.colour : 'transparent', color: topicFilter === id ? '#08111f' : '#e2e8f0' }}><span>{topicIcon(id)}</span>{topic.label}</button>)}
      </div>
    </section>
    <section className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{entries.map((entry) => <button type="button" key={entry.id} onClick={() => openLab(entry)} className="group overflow-hidden rounded-2xl border border-slate-700 bg-[#0d1929] text-left shadow-lg transition duration-200 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-cyan-950/50">
        <div className="relative aspect-[16/7] overflow-hidden" style={{ background: `radial-gradient(circle at 50% 45%, ${entry.topicColour}33, #07111f 70%)` }}><PhysicsLabThumbnail labId={entry.id} definition={definitions[entry.id]} title={entry.title} className="h-full w-full transition duration-300 group-hover:scale-[1.035]" /><span className="absolute right-3 top-3 rounded-full border border-white/15 bg-slate-950/80 px-2 py-1 text-[10px] font-bold shadow-lg">Class {entry.classes.join(' · ')}</span></div>
        <div className="p-4"><p className="text-xs font-bold uppercase tracking-wider" style={{ color: entry.topicColour }}>{entry.topicLabel}</p><h2 className="mt-1 line-clamp-2 text-base font-bold text-white">{entry.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{entry.aim}</p><div className="mt-3 flex gap-3 text-[11px] text-slate-400"><span>{entry.controlCount} controls</span>{entry.hasGraph ? <span>Graph</span> : null}{entry.hasObservationTable ? <span>Observations</span> : null}</div></div>
      </button>)}</div>
    </section>
  </main>;

  const entry = catalog.labs.find((candidate) => candidate.id === project.labId)!;
  const colour = entry.topicColour;
  let readings: Array<[string, string | number, string]> = [];
  let readingsError = '';
  if (stateRef.current) {
    try {
      readings = definition.readings?.(stateRef.current, project.parameters) || [];
    } catch (runtimeError) {
      readingsError = runtimeError instanceof Error ? runtimeError.message : 'Live readings are temporarily unavailable.';
    }
  }
  let result = '';
  if (rows.length && definition.result) {
    try { result = definition.result(rows); } catch { result = 'Record another reading to calculate the result.'; }
  }
  const record = () => {
    if (!definition.record || !stateRef.current) return;
    const next = definition.record(stateRef.current, project.parameters) as unknown;
    if (Array.isArray(next)) setRows((current) => [...current, next]);
    else if (next && typeof next === 'object' && 'error' in next) toast.error(String((next as { error: unknown }).error));
  };
  const reset = () => { setRows([]); setStep(0); setResetToken((value) => value + 1); setPaused(false); };

  return <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#07111f] text-slate-100">
    <header className="flex min-h-[68px] shrink-0 items-center gap-3 border-b border-cyan-400/25 bg-[#0b1728] px-4 shadow-xl">
      <button type="button" onClick={() => editingExisting ? onBack() : setProject(null)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-600 bg-slate-900 hover:border-cyan-300" aria-label="Back"><ArrowLeft size={20} /></button>
      <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: colour }}>{entry.topicLabel} · Class {entry.classes.join(' · ')}</p><h1 className="truncate text-lg font-bold">{project.title}</h1></div>
      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={() => setPaused((value) => !value)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-600 bg-slate-900 hover:border-cyan-300" aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play size={19} /> : <Pause size={19} />}</button>
        <button type="button" onClick={reset} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-600 bg-slate-900 hover:border-cyan-300" aria-label="Reset Lab"><RotateCcw size={19} /></button>
        <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-600 bg-slate-900 hover:border-cyan-300" aria-label="Full screen"><Expand size={19} /></button>
        <button type="button" onClick={() => onInsert(project)} className="flex h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-200"><WandSparkles size={18} />{editingExisting ? 'Apply to this Screen' : 'Insert Lab into Screen'}</button>
      </div>
    </header>
    <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_390px] gap-3 p-3">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="min-h-0 flex-1"><LabCanvas definition={definition} parameters={project.parameters} paused={paused} resetToken={resetToken} onParameterChange={updateParameters} onTick={handleRuntimeTick} runtimeStateRef={stateRef} /></div>
        <div className="grid h-[300px] shrink-0 grid-cols-[1fr_1fr] gap-3">
          <section className="min-h-0 overflow-hidden rounded-xl border border-slate-700 bg-[#0d1929]"><div className="flex h-11 items-center justify-between border-b border-slate-700 px-3"><h2 className="flex items-center gap-2 text-sm font-bold"><BookOpen size={16} style={{ color: colour }} />Observation table</h2><div className="flex gap-1"><button type="button" onClick={() => setRows((current) => current.slice(0, -1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Undo reading"><Undo2 size={15} /></button><button type="button" onClick={() => setRows([])} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Clear readings"><Eraser size={15} /></button></div></div><div className="h-[calc(100%-44px)] overflow-auto"><table className="w-full border-collapse text-xs"><thead className="sticky top-0 bg-slate-900"><tr><th className="p-2 text-left">#</th>{(definition.columns || []).map((column) => <th key={column} className="whitespace-nowrap p-2 text-left">{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-white/5"><td className="p-2 text-slate-500">{rowIndex + 1}</td>{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap p-2 font-mono">{String(cell)}</td>)}</tr>)}</tbody></table>{!rows.length ? <p className="p-5 text-center text-sm text-slate-500">No readings recorded yet.</p> : null}</div></section>
          <section className="min-h-0 overflow-hidden rounded-xl border border-slate-700 bg-[#0d1929]"><div className="flex h-11 items-center gap-2 border-b border-slate-700 px-3"><LineChart size={16} style={{ color: colour }} /><h2 className="text-sm font-bold">Graph & result</h2></div><div className="h-[210px]"><LabGraph definition={definition} rows={rows} colour={colour} /></div>{result ? <p className="mx-3 mb-3 rounded-lg p-2 text-xs font-semibold" style={{ background: `${colour}18`, color: colour }}>{result}</p> : null}</section>
        </div>
      </div>
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0d1929]">
        <div className="grid grid-cols-5 border-b border-slate-700 bg-slate-950/40">{([['guide', BookOpen], ['controls', Gauge], ['readings', Beaker], ['observations', Save], ['graph', LineChart]] as const).map(([panel, Icon]) => <button type="button" key={panel} onClick={() => setActivePanel(panel)} className={`grid h-12 place-items-center border-b-2 transition ${activePanel === panel ? 'bg-white/5' : 'border-transparent text-slate-500 hover:text-white'}`} style={activePanel === panel ? { borderColor: colour, color: colour } : undefined} aria-label={panel}><Icon size={18} /></button>)}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {activePanel === 'guide' ? <div><h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: colour }}>Aim</h2><p className="mt-2 text-sm leading-6 text-slate-300">{definition.aim}</p><h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Formula</h3><pre className="mt-2 whitespace-pre-wrap rounded-xl border p-3 font-mono text-sm" style={{ borderColor: `${colour}55`, background: '#0b1119', color: colour }}>{definition.formula}</pre><h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Apparatus</h3><p className="mt-2 text-sm leading-6 text-slate-300">{definition.apparatus.join(' · ')}</p><h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">Procedure</h3><ol className="mt-3 space-y-3">{definition.procedure.map((instruction, index) => <li key={instruction} className={`flex gap-3 rounded-xl border p-3 text-sm leading-5 ${step === index + 1 ? 'bg-white/5' : 'border-slate-700'}`} style={step === index + 1 ? { borderColor: colour } : undefined}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-bold text-slate-950" style={{ background: colour }}>{index + 1}</span>{instruction}</li>)}</ol><div className="mt-4 flex gap-2"><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600"><ChevronLeft size={16} />Previous</button><button type="button" onClick={() => setStep((value) => Math.min(definition.procedure.length, value + 1))} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg font-bold text-slate-950" style={{ background: colour }}>Next<ChevronRight size={16} /></button></div></div> : null}
          {activePanel === 'controls' ? <div><h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: colour }}>Experiment controls</h2><div className="mt-4 space-y-5">{definition.controls.map((control) => {
            const value = project.parameters[control.k];
            if (control.type === 'range') return <label key={control.k} className="block text-xs font-semibold text-slate-300"><span className="flex justify-between gap-3"><span>{control.label}</span><b style={{ color: colour }}>{String(value)} {control.unit}</b></span><input type="range" min={control.min} max={control.max} step={control.step} value={Number(value)} onChange={(event) => updateParameters({ [control.k]: Number(event.target.value) }, control.k)} className="mt-3 w-full" style={{ accentColor: colour }} /></label>;
            if (control.type === 'select') return <div key={control.k}><p className="text-xs font-semibold text-slate-300">{control.label}</p><div className="mt-2 flex flex-wrap gap-2">{control.options?.map(([optionValue, label]) => <button type="button" key={label} onClick={() => updateParameters({ [control.k]: optionValue }, control.k)} className="min-h-10 rounded-lg border px-3 text-xs font-semibold" style={value === optionValue ? { borderColor: colour, background: colour, color: '#07111f' } : { borderColor: '#475569' }}>{label}</button>)}</div></div>;
            return <button type="button" key={control.k} onClick={() => updateParameters({ [control.k]: !value }, control.k)} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-600 px-3 text-sm"><span>{control.label}</span><span className="relative h-7 w-12 rounded-full transition" style={{ background: value ? colour : '#334155' }}><span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all" style={{ left: value ? 24 : 4 }} /></span></button>;
          })}</div>{definition.actions?.length ? <div className="mt-6 grid grid-cols-2 gap-2">{definition.actions.map((action, index) => <button type="button" key={action.label} onClick={() => { if (stateRef.current) action.run(stateRef.current, project.parameters); setTick((value) => value + 1); }} className="min-h-11 rounded-lg border px-3 text-sm font-bold" style={index === 0 ? { background: colour, borderColor: colour, color: '#07111f' } : { borderColor: '#475569' }}>{action.label}</button>)}</div> : null}</div> : null}
          {activePanel === 'readings' ? <div><h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: colour }}>Live readings</h2>{readingsError ? <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">The Lab is initializing its instruments. Live readings will appear automatically.</p> : null}<div className="mt-4 grid grid-cols-2 gap-3">{readings.map(([label, value, unit]) => <div key={label} className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 truncate font-mono text-xl font-bold" style={{ color: colour }}>{value} <span className="text-xs">{unit}</span></p></div>)}</div><button type="button" onClick={record} disabled={!definition.record} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-bold text-slate-950 disabled:opacity-40" style={{ background: colour }}><Save size={18} />Record reading</button></div> : null}
          {activePanel === 'observations' ? <div><h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: colour }}>Observations</h2><p className="mt-2 text-sm text-slate-400">{rows.length} reading{rows.length === 1 ? '' : 's'} recorded.</p><div className="mt-4 space-y-2">{rows.map((row, index) => <div key={index} className="rounded-lg border border-slate-700 p-3 font-mono text-xs"><b className="mr-2" style={{ color: colour }}>#{index + 1}</b>{row.map(String).join(' · ')}</div>)}</div></div> : null}
          {activePanel === 'graph' ? <div><h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: colour }}>Graph analysis</h2><div className="mt-4 aspect-[2/1]"><LabGraph definition={definition} rows={rows} colour={colour} /></div>{result ? <p className="mt-4 rounded-xl p-3 text-sm font-semibold" style={{ background: `${colour}18`, color: colour }}>{result}</p> : null}</div> : null}
        </div>
      </aside>
    </section>
  </main>;
}
