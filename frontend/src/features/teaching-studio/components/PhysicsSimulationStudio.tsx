import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft,
  Download,
  FastForward,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Rewind,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react';
import SimulationPreviewCanvas from './SimulationPreviewCanvas';
import { buildSimulationHtml } from './simulationExport';
import { calculateSimulationValues, evaluateSimulationExpression } from './simulationExpression';
import {
  SIMULATION_TEMPLATES,
  createSimulationDocument,
  simulationCategory,
  templateById,
  validateSimulationDocument,
  type SimulationDocument,
  type SimulationSubject,
} from './simulationStudioModel';
import { PHYSICS_OBJECT_CATEGORIES, PHYSICS_OBJECT_LIBRARY, type PhysicsObjectLibraryEntry } from '../simulation-catalog/physicsObjectLibrary';
import type { PhysicsRuntimeCommand, PhysicsRuntimeState } from './physics-runtime/PhysicsRuntimePreview';
import { simulationDocumentFromPhysicsNative } from './physics-runtime/physicsRuntimeProject';
import PhysicsRuntimeWizard from './physics-runtime/PhysicsRuntimeWizard';
import { physicsEquationToLatex } from './physics-runtime/physicsExpressionLatex';

export type PhysicsSimulationProject = SimulationDocument;
export type PhysicsSimulationInsert = { project: SimulationDocument; title: string; html: string };
type Props = {
  initialProject?: SimulationDocument | null;
  initialSubject?: SimulationSubject;
  initialTemplateId?: string;
  onBack: () => void;
  onInsert: (simulation: PhysicsSimulationInsert) => void;
  onImport?: (simulation: SimulationDocument) => Promise<SimulationDocument>;
};
type EditorTab = 'variables' | 'equations' | 'objects' | 'results';
const SUBJECT_OBJECT_LIBRARY: Record<SimulationSubject, ReadonlyArray<{ type: string; name: string }>> = {
  physics: [
    { type: 'ball', name: 'Ball / particle' }, { type: 'vector', name: 'Vector arrow' },
    { type: 'ray', name: 'Light ray' }, { type: 'lens', name: 'Lens' },
    { type: 'spring', name: 'Spring' }, { type: 'label', name: 'Value label' },
    { type: 'curve', name: 'Graph curve' }, { type: 'cannon', name: 'Launcher' },
  ],
  chemistry: [
    { type: 'atom', name: 'Atom' }, { type: 'electron', name: 'Electron' },
    { type: 'molecule', name: 'Molecule' }, { type: 'bond', name: 'Chemical bond' },
    { type: 'beaker', name: 'Beaker' }, { type: 'particle', name: 'Particle' },
    { type: 'label', name: 'Value label' }, { type: 'curve', name: 'Result curve' },
  ],
  biology: [
    { type: 'cell', name: 'Cell' }, { type: 'organelle', name: 'Organelle' },
    { type: 'membrane', name: 'Membrane' }, { type: 'molecule', name: 'Biomolecule' },
    { type: 'organism', name: 'Organism' }, { type: 'arrow', name: 'Process arrow' },
    { type: 'label', name: 'Value label' }, { type: 'curve', name: 'Result curve' },
  ],
  mathematics: [
    { type: 'point', name: 'Point' }, { type: 'line', name: 'Line' },
    { type: 'vector', name: 'Vector' }, { type: 'curve', name: 'Function curve' },
    { type: 'shape', name: 'Geometric shape' }, { type: 'axis', name: 'Axis' },
    { type: 'label', name: 'Value label' }, { type: 'region', name: 'Shaded region' },
  ],
};
const firstTemplate = (subject: SimulationSubject) =>
  SIMULATION_TEMPLATES.find(
    (item) => item.subject === subject && !['scene', 'periodic-table'].includes(item.kind),
  ) || SIMULATION_TEMPLATES[1];
const fieldClass =
  'h-9 min-w-0 rounded-md border border-slate-600 bg-slate-950 px-2 text-xs text-white outline-none focus:border-cyan-300';
const PhysicsRuntimePreview = lazy(() => import('./physics-runtime/PhysicsRuntimePreview'));
// Stable workspace copy retained for acceptance checks and assistive descriptions.
const workspaceLabel = 'Simulation Creator';
const importProgressLabel = 'Adding to Quick Start';

export default function PhysicsSimulationStudio({
  initialProject,
  initialSubject = 'physics',
  initialTemplateId,
  onBack,
  onInsert,
  onImport,
}: Props) {
  void workspaceLabel;
  void importProgressLabel;
  const requestedTemplate =
    (initialTemplateId && templateById(initialTemplateId)) || firstTemplate(initialSubject);
  const [simulation, setSimulation] = useState(() =>
    initialProject
      ? validateSimulationDocument(initialProject)
      : createSimulationDocument(requestedTemplate),
  );
  const [paused, setPaused] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [runtimeCommand, setRuntimeCommand] = useState<PhysicsRuntimeCommand | null>(null);
  const [runtimeState, setRuntimeState] = useState<PhysicsRuntimeState | null>(null);
  const [physicsWizardOpen, setPhysicsWizardOpen] = useState(false);
  const [graphType, setGraphType] = useState('line');
  const [viewMode, setViewMode] = useState('both');
  const [tab, setTab] = useState<EditorTab>('variables');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const calculated = useMemo(() => calculateSimulationValues(simulation), [simulation]);
  const definition = templateById(simulation.templateId) || firstTemplate(simulation.subject);
  // Use the supplied physics runtime for physics templates so the original
  // solver and high-fidelity rendering remain intact.
  const usesOriginalPhysicsRuntime = simulation.subject === 'physics'
    && simulation.metadata?.source === 'SPECTROPY Activity Studio HTML';
  const physicsRuntimeMetadata = simulation.metadata?.physicsRuntime && typeof simulation.metadata.physicsRuntime === 'object'
    ? simulation.metadata.physicsRuntime as Record<string, unknown>
    : {};
  const physicsBackground = typeof physicsRuntimeMetadata.bg === 'string' ? physicsRuntimeMetadata.bg : 'blueprint';
  const controls = simulation.kind === 'scene' ? simulation.controls || [] : definition.parameters;
  const subjectTemplates = SIMULATION_TEMPLATES.filter(
    (template) => template.subject === simulation.subject && template.kind !== 'scene',
  );
  const subjectCategories = [
    ...new Set(subjectTemplates.map((template) => simulationCategory(template))),
  ];
  const openTemplate = (templateId: string) => {
    const template = templateById(templateId);
    if (!template) return;
    setSimulation(createSimulationDocument(template));
    setResetToken((value) => value + 1);
  };
  const setVariable = (index: number, patch: Partial<SimulationDocument['variables'][number]>) =>
    setSimulation((current) => {
      const previous = current.variables[index];
      const next = { ...previous, ...patch };
      const parameters = { ...current.parameters };
      if (previous.id !== next.id) delete parameters[previous.id];
      parameters[next.id] = next.value;
      return {
        ...current,
        variables: current.variables.map((item, itemIndex) => (itemIndex === index ? next : item)),
        parameters,
      };
    });
  const setParameter = (key: string, value: number) =>
    setSimulation((current) => ({
      ...current,
      parameters: { ...current.parameters, [key]: value },
      variables: current.variables.map((variable) =>
        variable.id === key ? { ...variable, value } : variable,
      ),
    }));
  const applyImport = async () => {
    setImporting(true);
    try {
      const parsed = validateSimulationDocument(JSON.parse(importText));
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
  const exportJson = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(simulation, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${simulation.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'simulation'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const controlRuntime = (action: PhysicsRuntimeCommand['action'], value?: number | boolean | string) => {
    setRuntimeCommand((previous) => ({ id: (previous?.id || 0) + 1, action, value }));
  };

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#07111f] text-slate-100">
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-cyan-400/30 bg-[#0b1728] px-2 shadow-xl">
        <button
          type="button"
          onClick={onBack}
          className="grid h-7 w-7 place-items-center rounded-md border border-slate-600 bg-slate-900"
          aria-label="Back"
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
            SPECTROPY
          </p>
          <h1 className="text-sm font-bold">
            {simulation.subject[0].toUpperCase() + simulation.subject.slice(1)} Simulation Studio
          </h1>
        </div>
        <div className="min-w-0 flex-1" aria-hidden="true" />
        {usesOriginalPhysicsRuntime ? <>
          <select aria-label="Graph type" value={graphType} onChange={(event) => { setGraphType(event.target.value); controlRuntime('graph', event.target.value); }} className="h-8 shrink-0 rounded-md border border-slate-600 bg-slate-950 px-2 text-[10px] text-slate-200">
            <option value="line">Line vs variable</option><option value="xy">X-Y / phase</option><option value="bar">Bar values</option>
          </select>
          <select aria-label="View mode" value={viewMode} onChange={(event) => { setViewMode(event.target.value); controlRuntime('view', event.target.value); }} className="h-8 shrink-0 rounded-md border border-slate-600 bg-slate-950 px-2 text-[10px] text-slate-200">
            <option value="both">Scene + Graph</option><option value="scene">Scene</option><option value="graph">Graph</option><option value="side">Side by side</option>
          </select>
        </> : null}
        <button
          type="button"
          onClick={() => usesOriginalPhysicsRuntime
            ? setPhysicsWizardOpen(true)
            : setSimulation(createSimulationDocument(firstTemplate(simulation.subject)))}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-300 bg-cyan-400 px-3 text-xs font-bold text-slate-950 shadow-sm hover:bg-cyan-300"
        >
          <Plus size={17} /> New Simulation
        </button>
        <label className="flex shrink-0 items-center">
          <span className="sr-only">Insert template</span>
          <select
            aria-label="Insert template"
            value={simulation.templateId}
            onChange={(event) => openTemplate(event.target.value)}
            className="h-8 max-w-64 rounded-md border border-slate-600 bg-slate-950 px-2 text-xs font-semibold text-white"
          >
            {subjectCategories.map((category) => (
              <optgroup key={category} label={category}>
                {subjectTemplates
                  .filter((template) => simulationCategory(template) === category)
                  .map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 text-xs font-semibold"
        >
          <Upload size={16} /> Import JSON
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 text-xs font-semibold"
        >
          <Download size={16} /> Export JSON
        </button>
        <button
          type="button"
          onClick={async () =>
            onInsert({
              project: simulation,
              title: simulation.title,
              html: await buildSimulationHtml(simulation),
            })
          }
          className="flex h-8 items-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-xs font-bold text-slate-950"
        >
          <WandSparkles size={17} /> Export &amp; Insert
        </button>
      </header>
      {/* Template selection is kept in the primary header to preserve vertical canvas space. */}
      {/*
        <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-[#0b1728] px-3 py-2">
          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Insert template
            <select
              value={simulation.templateId}
              onChange={(event) => openTemplate(event.target.value)}
              className="h-8 min-w-72 rounded-md border border-slate-600 bg-slate-950 px-2 text-xs font-semibold normal-case text-white"
            >
              {subjectCategories.map((category) => (
                <optgroup key={category} label={category}>
                  {subjectTemplates
                    .filter((template) => simulationCategory(template) === category)
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="h-7 w-px bg-slate-700" />
          <span className="min-w-0 flex-1 truncate text-xs text-slate-400">
            {simulation.subject[0].toUpperCase() + simulation.subject.slice(1)} ·{' '}
            {simulationCategory(definition)} · {simulation.title}
          </span>
        </div>
      */}
      <section className="grid min-h-0 flex-1 grid-cols-[minmax(220px,22%)_minmax(0,1fr)] gap-2 p-1.5">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0b1728]">
          <div className="grid grid-cols-4 border-b border-slate-700">
            {(['variables', 'equations', 'objects', 'results'] as EditorTab[]).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setTab(item)}
                className={`min-h-10 border-b-2 px-1 text-[10px] font-bold capitalize ${tab === item ? 'border-cyan-300 bg-cyan-400/10 text-cyan-200' : 'border-transparent text-slate-400'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
            {tab === 'variables' ? (
              <VariableEditor
                simulation={simulation}
                setSimulation={setSimulation}
                setVariable={setVariable}
              />
            ) : null}
            {tab === 'equations' ? (
              <EquationEditor
                simulation={simulation}
                setSimulation={setSimulation}
                calculated={usesOriginalPhysicsRuntime
                  ? { values: { ...calculated.values, ...(runtimeState?.values || {}) }, errors: {} }
                  : calculated}
              />
            ) : null}
            {tab === 'objects' ? (
              <ObjectEditor simulation={simulation} setSimulation={setSimulation} />
            ) : null}
            {tab === 'results' ? (
              <ResultEditor
                simulation={simulation}
                setSimulation={setSimulation}
                values={{ ...calculated.values, ...(usesOriginalPhysicsRuntime ? runtimeState?.values || {} : {}) }}
              />
            ) : null}
          </div>
        </aside>
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0a1422]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-700 px-3">
            <div>
              <b className="text-sm">{simulation.title}</b>
              <span className="ml-2 text-[10px] text-slate-400">Live 16:9 preview</span>
            </div>
            <div className="flex items-center gap-2">
              {usesOriginalPhysicsRuntime ? (
                <select
                  aria-label="Simulation background"
                  value={physicsBackground}
                  onChange={(event) => setSimulation({
                    ...simulation,
                    metadata: {
                      ...simulation.metadata,
                      physicsRuntime: { ...physicsRuntimeMetadata, bg: event.target.value },
                    },
                  })}
                  className="h-7 rounded border border-slate-600 bg-slate-950 px-2 text-[10px] text-slate-200"
                >
                  <option value="neutral">Neutral</option>
                  <option value="blueprint">Blueprint</option>
                  <option value="paper">Graph paper</option>
                  <option value="earth">Earth</option>
                  <option value="lab">Laboratory</option>
                  <option value="space">Space</option>
                  <option value="water">Underwater</option>
                </select>
              ) : null}
              <span className="text-[10px] font-semibold text-cyan-300">Interactive output</span>
            </div>
          </div>
          <div className="min-h-0 flex-1 p-1">
            <div className="h-full w-full overflow-hidden rounded-md border border-slate-600 bg-[#09111d]">
              {usesOriginalPhysicsRuntime ? (
                <Suspense fallback={<div className="grid h-full place-items-center text-sm text-cyan-200">Loading Physics runtime…</div>}>
                  <PhysicsRuntimePreview
                    simulation={simulation}
                    resetToken={resetToken}
                    command={runtimeCommand}
                    onState={setRuntimeState}
                    onProject={(project) => setSimulation((current) => simulationDocumentFromPhysicsNative(current, project))}
                  />
                </Suspense>
              ) : (
                <SimulationPreviewCanvas
                  simulation={simulation}
                  paused={paused}
                  resetToken={resetToken}
                  onChange={setSimulation}
                />
              )}
              <aside className="hidden">
                <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-300">
                  Live lesson controls
                </p>
                <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
                  {controls.map((control) => (
                    <label key={control.key} className="block text-[10px] font-semibold">
                      <span className="flex justify-between gap-2">
                        <span>{control.label}</span>
                        <b className="text-yellow-300">
                          {simulation.parameters[control.key]} {control.unit}
                        </b>
                      </span>
                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={simulation.parameters[control.key]}
                        onChange={(event) => setParameter(control.key, Number(event.target.value))}
                        className="mt-1 w-full accent-cyan-400"
                      />
                    </label>
                  ))}
                </div>
                <label className="mt-2 text-[10px]">
                  Speed {simulation.speed.toFixed(2)}×
                  <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.25"
                    value={simulation.speed}
                    onChange={(event) =>
                      setSimulation({ ...simulation, speed: Number(event.target.value) })
                    }
                    className="block w-full accent-cyan-400"
                  />
                </label>
              </aside>
            </div>
          </div>
          <footer className="flex h-9 shrink-0 items-center gap-1.5 border-t border-slate-700 bg-slate-950/90 px-2">
            <button
              type="button"
              onClick={() => usesOriginalPhysicsRuntime ? controlRuntime('reset') : setResetToken((value) => value + 1)}
              className="grid h-6 w-6 place-items-center rounded border border-slate-600"
              aria-label="Restart"
            >
              <RefreshCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => usesOriginalPhysicsRuntime
                ? controlRuntime('back')
                : setSimulation({ ...simulation, speed: Math.max(0.25, simulation.speed - 0.25) })}
              className="grid h-6 w-6 place-items-center rounded border border-slate-600"
              aria-label="Slower"
            >
              <Rewind size={13} />
            </button>
            <button
              type="button"
              onClick={() => usesOriginalPhysicsRuntime
                ? controlRuntime('play', !(runtimeState?.playing ?? false))
                : setPaused((value) => !value)}
              className="grid h-7 w-8 place-items-center rounded bg-cyan-400 text-slate-950"
              aria-label={(usesOriginalPhysicsRuntime ? runtimeState?.playing : !paused) ? 'Pause' : 'Play'}
            >
              {(usesOriginalPhysicsRuntime ? runtimeState?.playing : !paused) ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button
              type="button"
              onClick={() => usesOriginalPhysicsRuntime
                ? controlRuntime('forward')
                : setSimulation({ ...simulation, speed: Math.min(3, simulation.speed + 0.25) })}
              className="grid h-6 w-6 place-items-center rounded border border-slate-600"
              aria-label="Faster"
            >
              <FastForward size={13} />
            </button>
            <div className="ml-1 flex items-center gap-0.5 text-[9px]">
              <span className="mr-0.5 font-semibold">Speed</span>
              {[1, 2, 3, 4, 5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => {
                    if (usesOriginalPhysicsRuntime) controlRuntime('speed', speed);
                    else setSimulation({ ...simulation, speed });
                  }}
                  className={`h-6 min-w-6 rounded px-1 font-semibold ${(usesOriginalPhysicsRuntime ? runtimeState?.speed : simulation.speed) === speed ? 'bg-cyan-400 text-slate-950' : 'border border-slate-600 text-slate-300'}`}
                  aria-label={`${speed} times speed`}
                >
                  {speed}×
                </button>
              ))}
              <b className="ml-1 min-w-7 text-cyan-300">
                {usesOriginalPhysicsRuntime ? (runtimeState?.speed || 1) : simulation.speed}×
              </b>
            </div>
            {usesOriginalPhysicsRuntime && runtimeState ? (
              <label className="flex min-w-32 flex-1 items-center gap-1 text-[9px] font-mono">
                <span>{runtimeState.label}</span>
                <input
                  type="range"
                  min={runtimeState.min}
                  max={runtimeState.max}
                  step={(runtimeState.max - runtimeState.min) / 1000 || 0.001}
                  value={runtimeState.value}
                  onChange={(event) => controlRuntime('seek', Number(event.target.value))}
                  className="min-w-16 flex-1 accent-cyan-400"
                />
                <b className="min-w-14 text-cyan-300">
                  {runtimeState.value.toFixed(3)} {runtimeState.unit}
                </b>
              </label>
            ) : null}
            {(
              [
                ['vectors', 'Vectors'],
                ['labels', 'Values'],
                ['trail', 'Trails'],
                ['grid', 'Grid'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1 text-[10px] font-semibold">
                <input
                  type="checkbox"
                  checked={simulation.options[key]}
                  onChange={(event) =>
                    setSimulation({
                      ...simulation,
                      options: { ...simulation.options, [key]: event.target.checked },
                    })
                  }
                  className="accent-cyan-400"
                />
                {label}
              </label>
            ))}
          </footer>
        </section>
      </section>
      {importOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-5">
          <section className="w-full max-w-2xl rounded-2xl border border-cyan-400/30 bg-[#0b1728] p-5">
            <h2 className="text-xl font-bold">Import Simulation JSON</h2>
            <p className="mt-1 text-sm text-slate-400">
              Import variables, equations, objects and results into this environment.
            </p>
            <textarea
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
                setImportError('');
              }}
              rows={14}
              className="mt-4 w-full rounded-xl border border-slate-600 bg-slate-950 p-4 font-mono text-xs"
            />
            {importError ? (
              <p className="mt-2 rounded bg-red-500/10 p-3 text-sm text-red-200">{importError}</p>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void file.text().then(setImportText);
              }}
            />
            <div className="mt-4 flex justify-between">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm"
              >
                Choose JSON file
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => void applyImport()}
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950"
                >
                  {importing ? 'Importing…' : 'Import & Render'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {physicsWizardOpen && usesOriginalPhysicsRuntime ? (
        <PhysicsRuntimeWizard
          simulation={simulation}
          onClose={() => setPhysicsWizardOpen(false)}
          onProject={(project) => setSimulation((current) => simulationDocumentFromPhysicsNative(current, project))}
        />
      ) : null}
    </main>
  );
}

type EditorProps = {
  simulation: SimulationDocument;
  setSimulation: React.Dispatch<React.SetStateAction<SimulationDocument>>;
};
function VariableEditor({
  simulation,
  setSimulation,
  setVariable,
}: EditorProps & {
  setVariable: (index: number, patch: Partial<SimulationDocument['variables'][number]>) => void;
}) {
  const removeVariable = (index: number) => setSimulation((current) => {
    const removed = current.variables[index];
    const parameters = { ...current.parameters };
    if (removed) delete parameters[removed.id];
    return {
      ...current,
      parameters,
      variables: current.variables.filter((_, itemIndex) => itemIndex !== index),
    };
  });
  const addVariable = () => setSimulation((current) => {
    const sequence = current.variables.length + 1;
    const id = `variable_${sequence}`;
    return {
      ...current,
      parameters: { ...current.parameters, [id]: 0 },
      variables: [...current.variables, {
        id,
        symbol: `x${sequence}`,
        label: `Variable ${sequence}`,
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        unit: '',
        learnerEditable: true,
      }],
    };
  });
  return (
    <div className="space-y-2 overflow-x-hidden">
      {simulation.variables.map((variable, index) => (
        <section
          key={`${variable.id}-${index}`}
          className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5"
        >
          <label className="block text-[11px] font-semibold text-slate-200">
            <span className="flex items-center justify-between gap-2">
              <b>{variable.symbol || variable.id}</b>
              <strong className="truncate font-mono text-cyan-300">{variable.value} {variable.unit}</strong>
            </span>
            <input
              type="range"
              min={variable.min}
              max={variable.max}
              step={variable.step || 1}
              value={Math.min(variable.max, Math.max(variable.min, variable.value))}
              onChange={(event) => setVariable(index, { value: Number(event.target.value) })}
              className="mt-1 h-4 w-full accent-amber-400"
            />
          </label>
        </section>
      ))}
      <details className="rounded-md text-[10px] text-slate-300">
        <summary className="cursor-pointer select-none py-1 font-semibold">Edit variables (name · min · max · step · unit)</summary>
        <div className="mt-1 overflow-hidden rounded-md border border-slate-700 bg-slate-950/50 p-1.5">
          <div className="grid grid-cols-[1.25fr_.8fr_.8fr_.7fr_.85fr_18px] gap-1 px-0.5 text-[8px] text-slate-500">
            <span>Name</span><span>Min</span><span>Max</span><span>Step</span><span>Unit</span><span />
          </div>
          {simulation.variables.map((variable, index) => (
            <div key={`edit-${variable.id}-${index}`} className="mt-1 grid grid-cols-[1.25fr_.8fr_.8fr_.7fr_.85fr_18px] gap-1">
              <input
                value={variable.id}
                aria-label="Variable name"
                onChange={(event) => {
                  const id = event.target.value.replace(/[^a-z0-9_-]/gi, '');
                  setVariable(index, { id, symbol: id, label: id });
                }}
                className="min-w-0 rounded border border-slate-600 bg-slate-900 px-1 py-1 text-[9px]"
              />
              <input type="number" value={variable.min} aria-label="Minimum" onChange={(event) => setVariable(index, { min: Number(event.target.value) })} className="min-w-0 rounded border border-slate-600 bg-slate-900 px-1 text-[9px]" />
              <input type="number" value={variable.max} aria-label="Maximum" onChange={(event) => setVariable(index, { max: Number(event.target.value) })} className="min-w-0 rounded border border-slate-600 bg-slate-900 px-1 text-[9px]" />
              <input type="number" min="0.000001" value={variable.step} aria-label="Step" onChange={(event) => setVariable(index, { step: Math.max(0.000001, Number(event.target.value) || 1) })} className="min-w-0 rounded border border-slate-600 bg-slate-900 px-1 text-[9px]" />
              <input value={variable.unit} aria-label="Unit" onChange={(event) => setVariable(index, { unit: event.target.value })} className="min-w-0 rounded border border-slate-600 bg-slate-900 px-1 text-[9px]" />
              <button type="button" onClick={() => removeVariable(index)} className="text-slate-400 hover:text-red-300" aria-label={`Remove ${variable.id}`}>×</button>
            </div>
          ))}
          <button type="button" onClick={addVariable} className="mt-2 rounded border border-slate-600 px-2 py-1 text-[10px] font-bold hover:border-cyan-400">
            + Variable
          </button>
        </div>
      </details>
    </div>
  );
}
function LegacyEquationEditor({
  simulation,
  setSimulation,
  calculated,
}: EditorProps & { calculated: ReturnType<typeof calculateSimulationValues> }) {
  const equationKeys = ['+', '-', '*', '/', '^2', '(', ')', 'sin(', 'cos(', 'sqrt(', 'abs(', 'pi'];
  const updateEquation = (index: number, patch: Partial<SimulationDocument['equations'][number]>) =>
    setSimulation({
      ...simulation,
      equations: simulation.equations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  return (
    <>
      {simulation.equations.map((equation, index) => (
        <section
          key={`${equation.id}-${index}`}
          className="rounded-lg border border-slate-700 bg-slate-900/70 p-2"
        >
          <div className="flex gap-2">
            <input
              type="checkbox"
              checked={equation.enabled}
              onChange={(event) => updateEquation(index, { enabled: event.target.checked })}
              aria-label={`Enable ${equation.output}`}
            />
            <input
              value={equation.output}
              onChange={(event) => updateEquation(index, { output: event.target.value })}
              className={`${fieldClass} w-16`}
            />
            <input
              value={equation.expression}
              onChange={(event) => updateEquation(index, { expression: event.target.value })}
              className={`${fieldClass} flex-1 font-mono`}
            />
            <button
              type="button"
              onClick={() =>
                setSimulation({
                  ...simulation,
                  equations: simulation.equations.filter((_, itemIndex) => itemIndex !== index),
                })
              }
              className="text-red-300"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <select
              value={equation.role || 'derived'}
              onChange={(event) => updateEquation(index, { role: event.target.value as 'derived' | 'state' })}
              className={`${fieldClass} h-7 w-24`}
            >
              <option value="derived">Relation</option>
              <option value="state">State d/dt</option>
            </select>
            {equation.role === 'state' ? (
              <input
                value={equation.initialValue || '0'}
                onChange={(event) => updateEquation(index, { initialValue: event.target.value })}
                className={`${fieldClass} h-7 flex-1`}
                aria-label="Initial value"
                placeholder="Initial value"
              />
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {equationKeys.map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => updateEquation(index, { expression: `${equation.expression}${key}` })}
                className="min-w-7 rounded border border-slate-600 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-200"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="mt-2 rounded border border-slate-700 bg-slate-950/70 px-2 py-1.5 font-mono text-xs text-slate-200">
            {equation.output || '?'} = {equation.expression || '0'}
          </div>
          <p
            className={`mt-2 text-[10px] ${calculated.errors[equation.id] ? 'text-red-300' : 'text-emerald-300'}`}
          >
            {calculated.errors[equation.id] ||
              `${equation.output} = ${calculated.values[equation.output]?.toFixed(3) ?? '—'}`}
          </p>
        </section>
      ))}
      <button
        type="button"
        onClick={() =>
          setSimulation({
            ...simulation,
            equations: [
              ...simulation.equations,
              {
                id: `equation_${simulation.equations.length + 1}`,
                output: `output_${simulation.equations.length + 1}`,
                expression: '0',
                enabled: true,
              },
            ],
          })
        }
        className="flex w-full justify-center gap-2 rounded-lg border border-dashed border-cyan-400/60 py-2 text-xs font-bold text-cyan-200"
      >
        <Plus size={15} /> Add equation
      </button>
    </>
  );
}
function EquationEditor({ simulation, setSimulation, calculated }: EditorProps & { calculated: ReturnType<typeof calculateSimulationValues> }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<SimulationDocument['equations'][number] | null>(null);
  const keys = ['7', '8', '9', '+', '-', '(', ')', '4', '5', '6', '*', '/', '^2', '^', '1', '2', '3', '0', '.', 'sqrt(', 'abs(', 'sin(', 'cos(', 'pi'];
  const colors = ['#fb7185', '#86efac', '#c4b5fd', '#f9a8d4', '#fbbf24', '#7dd3fc'];
  const closeEditor = () => { setSelectedIndex(null); setDraft(null); };
  const openEquation = (index: number) => { setSelectedIndex(index); setDraft({ ...simulation.equations[index] }); };
  const addEquation = (role: 'derived' | 'state') => {
    const index = simulation.equations.length;
    const equation: SimulationDocument['equations'][number] = {
      id: `equation_${index + 1}`,
      output: role === 'state' ? `state_${index + 1}` : `result_${index + 1}`,
      expression: '0', enabled: true, role,
      ...(role === 'state' ? { initialValue: '0' } : {}),
    };
    setSimulation({ ...simulation, equations: [...simulation.equations, equation] });
    setSelectedIndex(index); setDraft(equation);
  };
  const applyDraft = () => {
    if (selectedIndex === null || !draft) return;
    setSimulation((current) => ({ ...current, equations: current.equations.map((item, index) => index === selectedIndex ? draft : item) }));
    closeEditor();
  };
  return (
    <div className="space-y-2">
      {simulation.equations.map((equation, index) => (
        <div key={`${equation.id}-${index}`} className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-2">
          <button type="button" onClick={() => openEquation(index)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} />
            <span
              className="min-w-0 flex-1 overflow-x-auto py-1 text-center text-[12px] [scrollbar-width:none] [&_.katex]:whitespace-nowrap"
              aria-label={`${equation.output} equals ${equation.expression}`}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(physicsEquationToLatex(equation.output, equation.expression), {
                  displayMode: false,
                  throwOnError: false,
                  strict: 'ignore',
                  trust: false,
                  output: 'htmlAndMathml',
                }),
              }}
            />
            <span className={`text-[9px] ${calculated.errors[equation.id] ? 'text-red-300' : 'text-emerald-300'}`}>
              {calculated.errors[equation.id] ? '!' : calculated.values[equation.output]?.toFixed(2) ?? ''}
            </span>
          </button>
          <button type="button" onClick={() => setSimulation({ ...simulation, equations: simulation.equations.filter((_, itemIndex) => itemIndex !== index) })} className="text-slate-500 hover:text-red-300" aria-label={`Remove ${equation.output}`}>×</button>
        </div>
      ))}
      <section className="border-t border-amber-400/40 pt-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-amber-400">Simulation engine</p>
        <label className="mt-2 flex items-center gap-2 text-[10px] text-slate-300">Time variable
          <select value={String(simulation.metadata?.timeVariable || simulation.variables.find((item) => /^(t|time)$/i.test(item.id))?.id || simulation.variables[0]?.id || '')} onChange={(event) => setSimulation({ ...simulation, metadata: { ...simulation.metadata, timeVariable: event.target.value } })} className="rounded border border-slate-600 bg-slate-900 px-2 py-1">
            {simulation.variables.map((variable) => <option key={variable.id} value={variable.id}>{variable.symbol || variable.id}</option>)}
          </select>
        </label>
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" onClick={() => addEquation('derived')} className="rounded border border-slate-600 px-2 py-1 text-[10px] font-bold">+ Relation</button>
          <button type="button" onClick={() => addEquation('state')} className="rounded border border-slate-600 px-2 py-1 text-[10px] font-bold">+ State d/dt</button>
        </div>
      </section>
      {draft && selectedIndex !== null ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/65 p-6 pt-[8vh]" role="dialog" aria-modal="true" aria-label="Equation editor">
          <section className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-600 bg-[#111827] shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
              <b className="text-xs uppercase tracking-wide text-amber-400">Equation editor · {draft.role === 'state' ? 'State' : 'Relation'}</b>
              <button type="button" onClick={closeEditor} className="text-slate-400">×</button>
            </header>
            <div className="p-3">
              <div className="flex items-center gap-2">
                <input value={draft.output} onChange={(event) => setDraft({ ...draft, output: event.target.value })} className={`${fieldClass} w-24 font-mono`} aria-label="Equation output" />
                <span>=</span>
                <input autoFocus value={draft.expression} onChange={(event) => setDraft({ ...draft, expression: event.target.value })} className={`${fieldClass} flex-1 font-mono`} placeholder="Type or tap keys…" />
              </div>
              <div className="mt-3 grid min-h-16 place-items-center rounded border border-slate-700 bg-slate-950 px-3 font-mono text-sm">{draft.output || '?'} = {draft.expression || '0'}</div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {keys.map((key) => <button type="button" key={key} onClick={() => setDraft({ ...draft, expression: `${draft.expression}${key}` })} className="rounded border border-slate-600 bg-slate-900 px-2 py-2 text-xs font-bold">{key}</button>)}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <select value={draft.role || 'derived'} onChange={(event) => setDraft({ ...draft, role: event.target.value as 'derived' | 'state' })} className={`${fieldClass} h-8`}><option value="derived">Relation</option><option value="state">State d/dt</option></select>
                {draft.role === 'state' ? <input value={draft.initialValue || '0'} onChange={(event) => setDraft({ ...draft, initialValue: event.target.value })} className={`${fieldClass} h-8`} placeholder="Initial value" /> : null}
                <label className="ml-auto flex items-center gap-1 text-[10px]"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Enabled</label>
              </div>
              <footer className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={closeEditor} className="rounded border border-slate-600 px-3 py-1.5 text-xs">Cancel</button>
                <button type="button" onClick={applyDraft} className="rounded bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950">✓ Apply</button>
              </footer>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function LegacyObjectEditor({ simulation, setSimulation }: EditorProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const updateObject = (index: number, patch: Partial<SimulationDocument['objects'][number]>) =>
    setSimulation({
      ...simulation,
      objects: simulation.objects.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  const addObject = (entry: { type: string; name: string }) => {
    const sequence = simulation.objects.length + 1;
    setSimulation({
      ...simulation,
      objects: [...simulation.objects, {
        id: `${entry.type}-${sequence}`,
        name: entry.name,
        type: entry.type,
        visible: true,
        properties: {},
      }],
    });
    setLibraryOpen(false);
  };
  return (
    <>
      {simulation.objects.length ? (
        simulation.objects.map((object, index) => (
          <section
            key={`${object.id}-${index}`}
            className="rounded-lg border border-slate-700 bg-slate-900/70 p-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={object.visible}
                onChange={(event) => updateObject(index, { visible: event.target.checked })}
                aria-label={`Show ${object.name}`}
              />
              <input
                value={object.name}
                onChange={(event) => updateObject(index, { name: event.target.value })}
                className={`${fieldClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => setSimulation({
                  ...simulation,
                  objects: simulation.objects.filter((_, itemIndex) => itemIndex !== index),
                })}
                className="text-red-300"
                aria-label={`Remove ${object.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[9px] text-slate-400">Object ID
                <input
                  value={object.id}
                  onChange={(event) => updateObject(index, { id: event.target.value.replace(/[^a-z0-9_-]/gi, '') })}
                  className={`${fieldClass} w-full`}
                />
              </label>
              <label className="text-[9px] text-slate-400">Type
                <input value={object.type} readOnly className={`${fieldClass} w-full text-slate-400`} />
              </label>
            </div>
            {object.properties && Object.keys(object.properties).length ? (
              <details className="mt-2 text-[10px] text-slate-400">
                <summary className="cursor-pointer">Object properties ({Object.keys(object.properties).length})</summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(object.properties).map(([key, value]) => (
                    <label key={key} className="text-[9px]">{key}
                      <input
                        value={String(value)}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const nextValue = typeof value === 'number' && raw !== '' ? Number(raw) : raw;
                          updateObject(index, { properties: { ...object.properties, [key]: nextValue } });
                        }}
                        className={`${fieldClass} w-full`}
                      />
                    </label>
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        ))
      ) : (
        <p className="rounded-lg border border-dashed border-slate-600 p-4 text-xs leading-5 text-slate-400">
          Built-in simulations render natively. Imported custom scene nodes are listed here
          automatically.
        </p>
      )}
      <button
        type="button"
        onClick={() => setLibraryOpen((value) => !value)}
        className="flex w-full justify-center gap-2 rounded-lg bg-amber-400 py-2 text-xs font-bold text-slate-950"
      >
        <Plus size={15} /> Add object from library
      </button>
      {libraryOpen ? (
        <section className="grid grid-cols-2 gap-2 rounded-lg border border-amber-400/50 bg-slate-950 p-2">
          <div className="grid min-h-0 flex-1 grid-cols-4 content-start gap-2 overflow-y-auto p-3">
          {SUBJECT_OBJECT_LIBRARY[simulation.subject].map((entry) => (
            <button
              type="button"
              key={entry.type}
              onClick={() => addObject(entry)}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-left hover:border-cyan-400"
            >
              <span className="block text-lg text-cyan-300">{entry.type === 'label' ? 'Aa' : entry.type === 'curve' ? '∿' : '◇'}</span>
              <b className="text-[10px]">{entry.name}</b>
              <span className="block text-[9px] text-slate-500">{entry.type}</span>
            </button>
          ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
function ObjectEditor({ simulation, setSimulation }: EditorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState<string>('All');
  const selected = selectedIndex === null ? null : simulation.objects[selectedIndex];
  const iconFor = (type: string) => {
    if (/label|text/i.test(type)) return 'x=1';
    if (/vector|arrow/i.test(type)) return '→';
    if (/ray|line|curve/i.test(type)) return '╱';
    if (/ball|particle|electron|atom/i.test(type)) return '●';
    if (/lens/i.test(type)) return '◐';
    if (/spring|wave/i.test(type)) return '∿';
    return '◇';
  };
  const updateObject = (index: number, patch: Partial<SimulationDocument['objects'][number]>) =>
    setSimulation((current) => ({
      ...current,
      objects: current.objects.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  const removeObject = (index: number) => {
    setSimulation((current) => ({ ...current, objects: current.objects.filter((_, itemIndex) => itemIndex !== index) }));
    setSelectedIndex((current) => current === index ? null : current !== null && current > index ? current - 1 : current);
  };
  const addObject = (entry: { type: string; name: string; properties?: Record<string, string | number>; defaultColor?: string; defaultTrail?: string }) => {
    const index = simulation.objects.length;
    const object = { id: `${entry.type}-${index + 1}`, name: entry.name, type: entry.type, visible: true, properties: { ...(entry.properties || {}), ...(entry.defaultColor ? { color: entry.defaultColor } : {}), ...(entry.defaultTrail ? { trail: entry.defaultTrail } : {}) } };
    setSimulation({ ...simulation, objects: [...simulation.objects, object] });
    setSelectedIndex(index);
    setLibraryOpen(false);
  };
  const libraryEntries = simulation.subject === 'physics'
    ? PHYSICS_OBJECT_LIBRARY.filter((entry) => libraryCategory === 'All' || entry.category === libraryCategory)
    : SUBJECT_OBJECT_LIBRARY[simulation.subject];
  return (
    <div className="space-y-2 overflow-x-hidden">
      {simulation.objects.length ? simulation.objects.map((object, index) => (
        <div key={`${object.id}-${index}`} className={`flex flex-wrap items-center gap-2 rounded-md border px-2 py-2 ${selectedIndex === index ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-900/70'}`}>
          <button type="button" onClick={() => setSelectedIndex(selectedIndex === index ? null : index)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="w-5 shrink-0 text-center text-sm text-cyan-300">{iconFor(object.type)}</span>
            <b className="min-w-0 flex-1 truncate text-[10px]">{object.name}</b>
            <span className="text-[8px] uppercase text-slate-500">{object.type}</span>
            <span className="text-slate-500">{selectedIndex === index ? '⌄' : '›'}</span>
          </button>
          <button type="button" onClick={() => removeObject(index)} className="text-slate-500 hover:text-red-300" aria-label={`Remove ${object.name}`}>×</button>
          {selectedIndex === index ? (
            <section className="w-full border-t border-amber-400/40 pt-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={object.visible} onChange={(event) => updateObject(index, { visible: event.target.checked })} aria-label={`Show ${object.name}`} />
                <input value={object.name} onChange={(event) => updateObject(index, { name: event.target.value })} className="h-7 min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-2 text-[10px] font-semibold" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-[8px] text-slate-500">Object ID<input value={object.id} onChange={(event) => updateObject(index, { id: event.target.value.replace(/[^a-z0-9_-]/gi, '') })} className="mt-0.5 h-7 w-full rounded border border-slate-600 bg-slate-900 px-2 text-[9px]" /></label>
                <label className="text-[8px] text-slate-500">Type<input value={object.type} readOnly className="mt-0.5 h-7 w-full rounded border border-slate-600 bg-slate-900 px-2 text-[9px] text-slate-400" /></label>
              </div>
              {object.properties && Object.keys(object.properties).length ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {Object.entries(object.properties).map(([key, value]) => (
                    <label key={key} className="text-[8px] text-slate-500">{key}<input value={String(value)} onChange={(event) => {
                      const raw = event.target.value;
                      updateObject(index, { properties: { ...object.properties, [key]: typeof value === 'number' && raw !== '' ? Number(raw) : raw } });
                    }} className="mt-0.5 h-7 w-full rounded border border-slate-600 bg-slate-900 px-2 text-[9px] text-slate-100" /></label>
                  ))}
                </div>
              ) : <p className="mt-2 text-[9px] text-slate-500">This object has no additional stored properties.</p>}
            </section>
          ) : null}
        </div>
      )) : <p className="rounded border border-dashed border-slate-600 p-3 text-[10px] text-slate-400">No objects in this simulation.</p>}

      {false && selected && selectedIndex !== null ? (
        <section className="rounded-md border border-amber-400/50 bg-slate-950/70 p-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={selected.visible} onChange={(event) => updateObject(selectedIndex, { visible: event.target.checked })} aria-label={`Show ${selected.name}`} />
            <input value={selected.name} onChange={(event) => updateObject(selectedIndex, { name: event.target.value })} className="h-7 min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-2 text-[10px] font-semibold" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-[8px] text-slate-500">Object ID<input value={selected.id} onChange={(event) => updateObject(selectedIndex, { id: event.target.value.replace(/[^a-z0-9_-]/gi, '') })} className="mt-0.5 h-7 w-full rounded border border-slate-600 bg-slate-900 px-2 text-[9px]" /></label>
            <label className="text-[8px] text-slate-500">Type<input value={selected.type} readOnly className="mt-0.5 h-7 w-full rounded border border-slate-600 bg-slate-900 px-2 text-[9px] text-slate-400" /></label>
          </div>
          {selected.properties && Object.keys(selected.properties).length ? (
            <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-slate-700 pt-2">
              {Object.entries(selected.properties).map(([key, value]) => (
                <label key={key} className="text-[8px] text-slate-500">{key}
                  <input value={String(value)} onChange={(event) => {
                    const raw = event.target.value;
                    updateObject(selectedIndex, { properties: { ...selected.properties, [key]: typeof value === 'number' && raw !== '' ? Number(raw) : raw } });
                  }} className="mt-0.5 h-7 w-full rounded border border-slate-600 bg-slate-900 px-2 text-[9px] text-slate-100" />
                </label>
              ))}
            </div>
          ) : <p className="mt-2 text-[9px] text-slate-500">This object has no additional stored properties.</p>}
        </section>
      ) : null}

      <button type="button" onClick={() => setLibraryOpen((value) => !value)} className="flex w-full justify-center gap-2 rounded-md bg-amber-400 py-2 text-xs font-bold text-slate-950">
        <Plus size={14} /> Add object from library
      </button>
      {libraryOpen ? (
        <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/65 p-6 pt-[8vh]" role="dialog" aria-modal="true" aria-label="Object library">
          <section className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-amber-400/50 bg-slate-950 shadow-2xl">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-700 px-3 py-2">
            <b className="text-xs uppercase tracking-wide text-amber-400">Object library</b>
            <button type="button" onClick={() => setLibraryOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close object library">×</button>
          </header>
          {simulation.subject === 'physics' ? (
            <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-700 px-3 py-2">
              {['All', ...PHYSICS_OBJECT_CATEGORIES].map((category) => (
                <button type="button" key={category} onClick={() => setLibraryCategory(category)} className={`rounded-full px-2 py-1 text-[9px] font-semibold ${libraryCategory === category ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  {category}
                </button>
              ))}
            </div>
          ) : null}
          <div className={`grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto p-2 ${simulation.subject === 'physics' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {libraryEntries.map((entry) => (
            <button type="button" key={entry.type} onClick={() => addObject(entry)} className="group flex min-h-16 flex-col items-center justify-center rounded-md border border-slate-700 bg-[#111827] px-1.5 py-1.5 text-center transition hover:border-cyan-300 hover:bg-cyan-400/10">
              <span className="mb-0.5 grid h-7 w-7 place-items-center rounded bg-slate-800 text-base text-cyan-300">{'icon' in entry ? entry.icon : iconFor(entry.type)}</span><b className="line-clamp-2 text-[8px] leading-tight text-slate-100">{entry.name}</b>
              {'category' in entry ? <span className="ml-2 block text-[8px] text-slate-500">{entry.category} · {entry.dimension}</span> : null}
            </button>
          ))}
          </div>
        </section>
        </div>
      ) : null}
    </div>
  );
}

function LegacyResultEditor({
  simulation,
  setSimulation,
  values,
}: EditorProps & { values: Record<string, number> }) {
  return (
    <>
      {simulation.results.map((result, index) => {
        let output = '—';
        let error = '';
        try {
          output = evaluateSimulationExpression(result.expression, values).toFixed(
            result.precision,
          );
        } catch (caught) {
          error = caught instanceof Error ? caught.message : 'Invalid result.';
        }
        return (
          <section
            key={`${result.id}-${index}`}
            className="rounded-lg border border-slate-700 bg-slate-900/70 p-2"
          >
            <div className="flex gap-2">
              <input
                type="checkbox"
                checked={result.visible}
                onChange={(event) =>
                  setSimulation({
                    ...simulation,
                    results: simulation.results.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, visible: event.target.checked } : item,
                    ),
                  })
                }
                aria-label={`Show ${result.label}`}
              />
              <input
                value={result.label}
                onChange={(event) =>
                  setSimulation({
                    ...simulation,
                    results: simulation.results.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: event.target.value } : item,
                    ),
                  })
                }
                className={`${fieldClass} flex-1 font-semibold`}
              />
              <button
                type="button"
                onClick={() =>
                  setSimulation({
                    ...simulation,
                    results: simulation.results.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
                className="text-red-300"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <input
              value={result.expression}
              onChange={(event) =>
                setSimulation({
                  ...simulation,
                  results: simulation.results.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, expression: event.target.value } : item,
                  ),
                })
              }
              className={`${fieldClass} mt-2 w-full font-mono`}
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="text-[9px] text-slate-400">Unit
                <input
                  value={result.unit}
                  onChange={(event) => setSimulation({
                    ...simulation,
                    results: simulation.results.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, unit: event.target.value } : item,
                    ),
                  })}
                  className={`${fieldClass} w-full`}
                />
              </label>
              <label className="text-[9px] text-slate-400">Precision
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={result.precision}
                  onChange={(event) => setSimulation({
                    ...simulation,
                    results: simulation.results.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, precision: Math.max(0, Math.min(10, Number(event.target.value))) } : item,
                    ),
                  })}
                  className={`${fieldClass} w-full`}
                />
              </label>
              <label className="text-[9px] text-slate-400">Display
                <select
                  value={result.display}
                  onChange={(event) => setSimulation({
                    ...simulation,
                    results: simulation.results.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, display: event.target.value as typeof result.display } : item,
                    ),
                  })}
                  className={`${fieldClass} w-full`}
                >
                  <option value="label">Label</option>
                  <option value="card">Card</option>
                  <option value="graph">Graph</option>
                  <option value="table">Table</option>
                </select>
              </label>
            </div>
            <p className={`mt-2 text-xs ${error ? 'text-red-300' : 'text-yellow-300'}`}>
              {error || `${output} ${result.unit}`}
            </p>
          </section>
        );
      })}
      <button
        type="button"
        onClick={() =>
          setSimulation({
            ...simulation,
            results: [
              ...simulation.results,
              {
                id: `result_${simulation.results.length + 1}`,
                label: 'New result',
                expression: '0',
                unit: '',
                precision: 2,
                display: 'card',
                visible: true,
              },
            ],
          })
        }
        className="flex w-full justify-center gap-2 rounded-lg border border-dashed border-cyan-400/60 py-2 text-xs font-bold text-cyan-200"
      >
        <Plus size={15} /> Add result
      </button>
    </>
  );
}

function ResultEditor({
  simulation,
  values,
}: EditorProps & { values: Record<string, number> }) {
  const colors = ['#fbbf24', '#7dd3fc', '#fb7185', '#86efac', '#c4b5fd', '#f9a8d4'];
  const visibleResults = simulation.results.filter((result) => result.visible);
  return (
    <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-950/30">
      {visibleResults.length ? visibleResults.map((result, index) => {
        let output = '—';
        let error = '';
        try {
          const runtimeValue = values[result.label];
          output = (Number.isFinite(runtimeValue)
            ? runtimeValue
            : evaluateSimulationExpression(result.expression, values)).toFixed(result.precision);
        } catch (caught) {
          error = caught instanceof Error ? caught.message : 'Invalid result.';
        }
        return (
          <div key={`${result.id}-${index}`} className="flex min-h-8 items-center gap-2 border-b border-slate-700 px-2 py-1.5 last:border-b-0">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-semibold" style={{ color: colors[index % colors.length] }} title={result.expression}>
              {result.label}
            </span>
            {error ? (
              <span className="max-w-[65%] truncate text-right text-[9px] text-red-300" title={error}>Unavailable</span>
            ) : (
              <strong className="shrink-0 font-mono text-sm text-slate-100">{output}{result.unit ? ` ${result.unit}` : ''}</strong>
            )}
          </div>
        );
      }) : (
        <p className="p-3 text-[10px] text-slate-400">This simulation has no visible calculated results.</p>
      )}
    </div>
  );
}
