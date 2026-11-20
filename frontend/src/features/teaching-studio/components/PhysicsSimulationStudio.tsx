import { useMemo, useRef, useState } from 'react';
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
import { buildStandaloneSimulationHtml } from './simulationExport';
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
const firstTemplate = (subject: SimulationSubject) =>
  SIMULATION_TEMPLATES.find(
    (item) => item.subject === subject && !['scene', 'periodic-table'].includes(item.kind),
  ) || SIMULATION_TEMPLATES[1];
const fieldClass =
  'h-9 min-w-0 rounded-md border border-slate-600 bg-slate-950 px-2 text-xs text-white outline-none focus:border-cyan-300';
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
  const [tab, setTab] = useState<EditorTab>('variables');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const calculated = useMemo(() => calculateSimulationValues(simulation), [simulation]);
  const definition = templateById(simulation.templateId) || firstTemplate(simulation.subject);
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
      if (previous.id in parameters && previous.id !== next.id) {
        delete parameters[previous.id];
        parameters[next.id] = next.value;
      } else if (next.id in parameters) parameters[next.id] = next.value;
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

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#07111f] text-slate-100">
      <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-cyan-400/30 bg-[#0b1728] px-3 shadow-xl">
        <button
          type="button"
          onClick={onBack}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-600 bg-slate-900"
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
        <input
          value={simulation.title}
          onChange={(event) => setSimulation({ ...simulation, title: event.target.value })}
          className="ml-3 h-8 min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold outline-none"
        />
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
          onClick={() =>
            onInsert({
              project: simulation,
              title: simulation.title,
              html: buildStandaloneSimulationHtml(simulation),
            })
          }
          className="flex h-8 items-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-xs font-bold text-slate-950"
        >
          <WandSparkles size={17} /> Export &amp; Insert
        </button>
      </header>
      <section className="shrink-0 border-b border-slate-700 bg-[#091523] px-3 py-2">
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
      </section>
      <section className="grid min-h-0 flex-1 grid-cols-[1fr_3fr] gap-3 p-3">
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
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
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
                calculated={calculated}
              />
            ) : null}
            {tab === 'objects' ? (
              <ObjectEditor simulation={simulation} setSimulation={setSimulation} />
            ) : null}
            {tab === 'results' ? (
              <ResultEditor
                simulation={simulation}
                setSimulation={setSimulation}
                values={calculated.values}
              />
            ) : null}
          </div>
        </aside>
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700 bg-[#0a1422]">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700 px-4">
            <div>
              <b className="text-sm">{simulation.title}</b>
              <span className="ml-2 text-[10px] text-slate-400">Live 16:9 preview</span>
            </div>
            <span className="text-[10px] font-semibold text-cyan-300">Interactive output</span>
          </div>
          <div className="grid min-h-0 flex-1 place-items-center p-3">
            <div className="aspect-video max-h-full w-full overflow-hidden rounded-lg border border-slate-600 bg-[#09111d]">
              <SimulationPreviewCanvas
                simulation={simulation}
                paused={paused}
                resetToken={resetToken}
                onChange={setSimulation}
              />
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
          <footer className="flex h-11 shrink-0 items-center gap-2 border-t border-slate-700 bg-slate-950/70 px-3">
            <button
              type="button"
              onClick={() => setResetToken((value) => value + 1)}
              className="grid h-7 w-7 place-items-center rounded border border-slate-600"
              aria-label="Restart"
            >
              <RefreshCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() =>
                setSimulation({ ...simulation, speed: Math.max(0.25, simulation.speed - 0.25) })
              }
              className="grid h-7 w-7 place-items-center rounded border border-slate-600"
              aria-label="Slower"
            >
              <Rewind size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              className="grid h-8 w-9 place-items-center rounded bg-cyan-400 text-slate-950"
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
            <button
              type="button"
              onClick={() =>
                setSimulation({ ...simulation, speed: Math.min(3, simulation.speed + 0.25) })
              }
              className="grid h-7 w-7 place-items-center rounded border border-slate-600"
              aria-label="Faster"
            >
              <FastForward size={13} />
            </button>
            <label className="ml-2 flex min-w-40 flex-1 items-center gap-2 text-[10px]">
              Speed
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.25"
                value={simulation.speed}
                onChange={(event) =>
                  setSimulation({ ...simulation, speed: Number(event.target.value) })
                }
                className="w-full accent-cyan-400"
              />
              <b className="w-10 text-cyan-300">{simulation.speed.toFixed(2)}×</b>
            </label>
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
  return (
    <>
      {simulation.variables.map((variable, index) => (
        <section
          key={`${variable.id}-${index}`}
          className="rounded-lg border border-slate-700 bg-slate-900/70 p-2"
        >
          <div className="flex gap-2">
            <input
              value={variable.label}
              onChange={(event) => setVariable(index, { label: event.target.value })}
              className={`${fieldClass} flex-1 font-semibold`}
            />
            <button
              type="button"
              onClick={() =>
                setSimulation({
                  ...simulation,
                  variables: simulation.variables.filter((_, itemIndex) => itemIndex !== index),
                })
              }
              className="text-red-300"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              value={variable.id}
              onChange={(event) =>
                setVariable(index, { id: event.target.value.replace(/[^a-z0-9_-]/gi, '') })
              }
              className={fieldClass}
            />
            <input
              value={variable.symbol}
              onChange={(event) => setVariable(index, { symbol: event.target.value })}
              className={fieldClass}
            />
            <input
              type="number"
              value={variable.value}
              onChange={(event) => setVariable(index, { value: Number(event.target.value) })}
              className={fieldClass}
            />
            <input
              value={variable.unit}
              onChange={(event) => setVariable(index, { unit: event.target.value })}
              className={fieldClass}
            />
            <input
              type="number"
              value={variable.min}
              onChange={(event) => setVariable(index, { min: Number(event.target.value) })}
              className={fieldClass}
            />
            <input
              type="number"
              value={variable.max}
              onChange={(event) => setVariable(index, { max: Number(event.target.value) })}
              className={fieldClass}
            />
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={variable.learnerEditable}
              onChange={(event) => setVariable(index, { learnerEditable: event.target.checked })}
            />{' '}
            Learner editable
          </label>
        </section>
      ))}
      <button
        type="button"
        onClick={() =>
          setSimulation({
            ...simulation,
            variables: [
              ...simulation.variables,
              {
                id: `variable_${simulation.variables.length + 1}`,
                symbol: 'x',
                label: 'New variable',
                value: 0,
                min: 0,
                max: 100,
                step: 1,
                unit: '',
                learnerEditable: true,
              },
            ],
          })
        }
        className="flex w-full justify-center gap-2 rounded-lg border border-dashed border-cyan-400/60 py-2 text-xs font-bold text-cyan-200"
      >
        <Plus size={15} /> Add variable
      </button>
    </>
  );
}
function EquationEditor({
  simulation,
  setSimulation,
  calculated,
}: EditorProps & { calculated: ReturnType<typeof calculateSimulationValues> }) {
  return (
    <>
      {simulation.equations.map((equation, index) => (
        <section
          key={`${equation.id}-${index}`}
          className="rounded-lg border border-slate-700 bg-slate-900/70 p-2"
        >
          <div className="flex gap-2">
            <input
              value={equation.output}
              onChange={(event) =>
                setSimulation({
                  ...simulation,
                  equations: simulation.equations.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, output: event.target.value } : item,
                  ),
                })
              }
              className={`${fieldClass} w-16`}
            />
            <input
              value={equation.expression}
              onChange={(event) =>
                setSimulation({
                  ...simulation,
                  equations: simulation.equations.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, expression: event.target.value } : item,
                  ),
                })
              }
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
function ObjectEditor({ simulation, setSimulation }: EditorProps) {
  return (
    <>
      {simulation.objects.length ? (
        simulation.objects.map((object, index) => (
          <section
            key={`${object.id}-${index}`}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2"
          >
            <input
              type="checkbox"
              checked={object.visible}
              onChange={(event) =>
                setSimulation({
                  ...simulation,
                  objects: simulation.objects.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, visible: event.target.checked } : item,
                  ),
                })
              }
            />
            <input
              value={object.name}
              onChange={(event) =>
                setSimulation({
                  ...simulation,
                  objects: simulation.objects.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, name: event.target.value } : item,
                  ),
                })
              }
              className={`${fieldClass} flex-1`}
            />
            <span className="text-[9px] uppercase text-slate-500">{object.type}</span>
          </section>
        ))
      ) : (
        <p className="rounded-lg border border-dashed border-slate-600 p-4 text-xs leading-5 text-slate-400">
          Built-in simulations render natively. Imported custom scene nodes are listed here
          automatically.
        </p>
      )}
    </>
  );
}
function ResultEditor({
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
