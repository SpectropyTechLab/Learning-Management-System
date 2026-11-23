import type { SimulationDocument } from '../simulationStudioModel';

type NativeVariable = { n: string; min: number; max: number; st: number; val: number; u: string };
type NativeEquation = { n: string; e: string };
type NativeState = { n: string; d: string; i: string };

const sourceName = (simulation: SimulationDocument, id: string, fallback: string) => {
  const result = simulation.results.find((entry) => entry.id === id);
  return result?.label || fallback;
};

export const toPhysicsRuntimeProject = (simulation: SimulationDocument) => {
  const runtime = simulation.metadata?.physicsRuntime && typeof simulation.metadata.physicsRuntime === 'object'
    ? simulation.metadata.physicsRuntime as Record<string, unknown> : {};
  const variables: NativeVariable[] = simulation.variables.map((variable) => ({
    n: variable.symbol || variable.id, min: variable.min, max: variable.max, st: variable.step,
    val: variable.value, u: variable.unit,
  }));
  const derived = simulation.equations.filter((equation) => equation.enabled && equation.role !== 'state');
  const states = simulation.equations.filter((equation) => equation.enabled && equation.role === 'state');
  const equations: NativeEquation[] = derived.map((equation, index) => ({
    n: sourceName(simulation, `equation-result-${index + 1}`, equation.output), e: equation.expression,
  }));
  const ode: NativeState[] = states.map((equation, index) => ({
    n: sourceName(simulation, `state-result-${index + 1}`, equation.output),
    d: equation.expression, i: equation.initialValue || '0',
  }));
  const graphOutputs = Array.isArray(simulation.metadata?.graphOutputs)
    ? simulation.metadata.graphOutputs.filter((value): value is string => typeof value === 'string') : [];
  const objects = simulation.objects.filter((object) => object.visible).map((object) => {
    const properties = { ...(object.properties || {}) };
    const color = typeof properties.color === 'string' ? properties.color : 'Sky';
    const trail = typeof properties.trail === 'string' ? properties.trail : 'none';
    delete properties.color; delete properties.trail;
    return { type: object.type, label: object.name, color, trail, p: properties, open: false };
  });
  const timeVariable = variables.find((variable) => /^(t|time)$/i.test(variable.n) && variable.u === 's')?.n;
  const xVariable = timeVariable || variables[0]?.n || 't';
  const series = Object.fromEntries(graphOutputs.map((output) => [output, true]));
  const runtimeView = runtime.view && typeof runtime.view === 'object' ? runtime.view as Record<string, unknown> : null;
  const runtimeGraph = runtime.graph && typeof runtime.graph === 'object' ? runtime.graph as Record<string, unknown> : {};
  const events = Array.isArray(runtime.events) ? runtime.events.flatMap((entry) => Array.isArray(entry) && entry.length >= 2
    ? [{ c: String(entry[0]), a: String(entry[1]) }] : []) : [];
  const scene = {
    title: simulation.title,
    mod: typeof simulation.metadata?.category === 'string' ? simulation.metadata.category : 'Physics',
    x: typeof runtime.x === 'string' && runtime.x ? runtime.x : xVariable,
    tv: typeof runtime.tv === 'string' && runtime.tv ? runtime.tv : timeVariable || xVariable,
    px: typeof runtime.px === 'string' && runtime.px ? runtime.px : graphOutputs[0] || equations[0]?.n || states[0]?.n || xVariable,
    py: typeof runtime.py === 'string' && runtime.py ? runtime.py : graphOutputs[1] || equations[1]?.n || states[1]?.n || '0',
    bg: typeof runtime.bg === 'string' && runtime.bg ? runtime.bg : 'blueprint',
    zoom: 1, unit: typeof runtime.unit === 'string' ? runtime.unit : '', grid: simulation.options.grid, speed: simulation.speed,
    layout: typeof runtime.layout === 'string' && runtime.layout ? runtime.layout : 'both',
    view: runtimeView ? { on: 1, ...runtimeView } : { on: 0, x0: -10, x1: 10, y0: -6, y1: 6 }, r3d: true,
    show: { vectors: simulation.options.vectors, labels: simulation.options.labels, trails: simulation.options.trail },
    font: {},
    G: { type: 'line', ylog: false, fill: false, markers: true, legend: true, ymin: '', ymax: '', grid: true, ...runtimeGraph, series },
    vars: variables, eqs: equations, ode, events, objs: objects,
  };
  return { title: simulation.title, scenes: [scene], start: 0 };
};

export const injectPhysicsProject = (runtimeHtml: string, simulation: SimulationDocument) => {
  const catalogBootstrap = ['biology', 'mathematics'].includes(simulation.subject)
    && simulation.metadata?.source === 'SPECTROPY Activity Studio HTML'
    && !(simulation.metadata?.physicsNativeProject);
  const project = JSON.stringify(physicsNativeProject(simulation)).replace(/</g, '\\u003c');
  const catalogModelId = catalogBootstrap
    ? JSON.stringify(simulation.kind.replace(/^(biology|mathematics)-/, '')).replace(/</g, '\\u003c')
    : 'null';
  const playerShell = `<style id="spectropy-lms-player-shell">
    body.player #stage {
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      aspect-ratio: auto !important;
    }
    body.player #tbar,
    body.player #side { display: none !important; }
    body.player #main {
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      grid-template-columns: minmax(0, 1fr) !important;
    }
    body.player #work {
      grid-column: 1 !important;
      min-width: 0 !important;
    }
    body.player #pbar { display: none !important; }
    body.player #work { grid-template-rows: minmax(0, 1fr) !important; }
    body.player #pWiz:not(.hid) { display: flex !important; z-index: 20 !important; }
  </style>`;
  const hostBridge = `<script id="spectropy-lms-host-bridge">
    var spectropyNativeWizardOpen = false;
    window.addEventListener('message', function(event) {
      var data = event.data;
      if (!data || data.spx !== 'control') return;
      if (data.action === 'sync' && window.SPX_CATALOG_DEFAULT) return;
      if (data.action === 'sync' && data.project && typeof openScene === 'function') {
        PROJ = data.project;
        openScene(Math.max(0, Math.min(PROJ.scenes.length - 1, Number(PROJ.start) || 0)));
        return;
      }
      if (data.action === 'newSimulation' && typeof openWizard === 'function') { spectropyNativeWizardOpen = true; openWizard('project'); return; }
      if (data.action === 'reset') { var reset = document.getElementById('bReset'); if (reset) reset.click(); return; }
      if (data.action === 'back' && typeof stepBy === 'function') { stepBy(-1); return; }
      if (data.action === 'forward' && typeof stepBy === 'function') { stepBy(1); return; }
      if (data.action === 'play' && typeof setPlay === 'function') { setPlay(!!data.value); return; }
      if (data.action === 'speed') { speedMul = Number(data.value) || 1; return; }
      if (data.action === 'seek' && typeof sv === 'function') {
        var variable = sv();
        if (variable) { setPlay(false); setVal(variable, Number(data.value)); draw(); }
      }
      if (data.action === 'setVariable' && data.key && typeof setVal === 'function') {
        var target = S && S.vars ? S.vars.find(function(v) { return v.n === data.key; }) : null;
        if (target) { setVal(target, Number(data.value)); draw(); }
      }
      if (data.action === 'graph' && S && S.G) { S.G.type = String(data.value || 'line'); draw(); }
      if (data.action === 'view' && S) { S.layout = String(data.value || 'both'); draw(); }
    });
    window.setInterval(function() {
      if (window.parent === window || typeof sv !== 'function') return;
      var wizard = document.getElementById('pWiz');
      if (spectropyNativeWizardOpen && wizard && wizard.classList.contains('hid')) {
        spectropyNativeWizardOpen = false;
        var project = JSON.parse(JSON.stringify(PROJ, function(key, value) { return key === '_thumb' ? undefined : value; }));
        window.parent.postMessage({ spx: 'project', project: project }, '*');
      }
      var variable = sv();
      if (!variable) return;
      var evaluated = typeof evalAt === 'function' ? evalAt({}) : {};
      window.parent.postMessage({
        spx: 'state', value: variable.val, min: variable.min, max: variable.max,
        unit: variable.u || '', label: variable.n || 't', playing: !!playing, speed: speedMul,
        values: evaluated
      }, '*');
    }, 100);
    if (window.SPX_CATALOG_DEFAULT) window.addEventListener('load', function() {
      document.body.classList.add('player');
      window.setTimeout(function() {
        window.SPX_CATALOG_DEFAULT = false;
        var project = JSON.parse(JSON.stringify(PROJ, function(key, value) { return key === '_thumb' ? undefined : value; }));
        parent.postMessage({ spx: 'project', project: project }, '*');
      }, 0);
    });
  <\/script>`;
  const injected = runtimeHtml.replace(
    '</head>',
    `${playerShell}${catalogBootstrap ? `<script>window.SPX_CATALOG_DEFAULT=true;window.SPX_CATALOG_MODEL=${catalogModelId};<\/script>` : `<script>window.EMBED=${project};<\/script>`}${hostBridge}</head>`,
  );
  if (!catalogBootstrap) return injected;
  return insertBeforeLast(injected, '</body>', `<script>
    (function(){
      var id=window.SPX_CATALOG_MODEL;
      if(!id||typeof MODELS==='undefined'||typeof sceneFromModel!=='function'||typeof newProject!=='function')return;
      var model=MODELS.find(function(candidate){return candidate.id===id;});
      if(model)newProject(sceneFromModel(model,model.name),model.name);
    })();
  <\/script>`);
};

export type PhysicsNativeProject = ReturnType<typeof toPhysicsRuntimeProject>;

const serialiseProject = (project: unknown) => JSON.stringify(project).replace(/</g, '\\u003c');
const insertBeforeLast = (source: string, marker: string, content: string) => {
  const index = source.lastIndexOf(marker);
  return index < 0 ? `${source}${content}` : `${source.slice(0, index)}${content}${source.slice(index)}`;
};

export const physicsNativeProject = (simulation: SimulationDocument): PhysicsNativeProject => {
  const stored = simulation.metadata?.physicsNativeProject;
  if (stored && typeof stored === 'object' && Array.isArray((stored as PhysicsNativeProject).scenes)) {
    return stored as PhysicsNativeProject;
  }
  return toPhysicsRuntimeProject(simulation);
};

export const injectPhysicsEditor = (runtimeHtml: string, simulation: SimulationDocument) => runtimeHtml.replace(
  '</head>',
  `<script>window.SPX_EDIT=${serialiseProject(physicsNativeProject(simulation))};<\/script></head>`,
);

export const injectPhysicsWizard = (runtimeHtml: string, simulation: SimulationDocument) => {
  const source = injectPhysicsProject(runtimeHtml, simulation);
  const wizardShell = `<style id="spectropy-lms-wizard-shell">
    :root {
      --bg:#07111f; --s1:#0b1728; --s2:#101d30; --s3:#16253a;
      --ln:#24364d; --ln2:#38516f; --tx:#eaf7ff; --mu:#9ab0c8;
      --ac:#22d3ee; --ac2:#67e8f9; --c3:#fb7185;
    }
    html, body, #stage { background: transparent !important; }
    #stage > *:not(#pWiz) { visibility: hidden !important; }
    body.player #pWiz:not(.hid) {
      visibility: visible !important; display: flex !important;
      left: 12% !important; top: 3% !important; width: 76% !important; height: 90% !important;
    }
  </style>`;
  const withShell = source.replace('</head>', `${wizardShell}</head>`);
  return insertBeforeLast(withShell, '</body>', `<script>
      (function(){
        var opened=false;
        var projectSnapshot='';
        window.setTimeout(function(){ if(typeof openWizard==='function') openWizard('project'); },0);
        window.setInterval(function(){
          var wizard=document.getElementById('pWiz');
          if(typeof PROJ!=='undefined' && PROJ){
            var nextProject=JSON.stringify(PROJ,function(key,value){ return key==='_thumb'?undefined:value; });
            if(!projectSnapshot) projectSnapshot=nextProject;
            else if(nextProject!==projectSnapshot){
              projectSnapshot=nextProject;
              parent.postMessage({spx:'project',project:JSON.parse(nextProject)},'*');
            }
          }
          if(wizard && !wizard.classList.contains('hid')) opened=true;
          else if(opened){ opened=false; parent.postMessage({spx:'wizard-close'},'*'); }
        },100);
      })();
    <\/script>`);
};

export const buildPhysicsStandaloneHtml = (runtimeHtml: string, project: PhysicsNativeProject) => runtimeHtml.replace(
  '</head>',
  `<script>window.EMBED=${serialiseProject(project)};<\/script></head>`,
);

const nativeId = (value: string, fallback: string) => {
  const id = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return id || fallback;
};

export const simulationDocumentFromPhysicsNative = (
  base: SimulationDocument,
  project: PhysicsNativeProject,
): SimulationDocument => {
  const scene = project.scenes[Math.max(0, Math.min(project.scenes.length - 1, Number(project.start) || 0))];
  if (!scene) return base;
  const variables = (scene.vars || []).map((variable, index) => ({
    id: nativeId(variable.n, `variable-${index + 1}`), symbol: variable.n,
    label: variable.n, value: variable.val, min: variable.min, max: variable.max,
    step: variable.st, unit: variable.u || '', learnerEditable: true,
  }));
  const derived = (scene.eqs || []).map((equation, index) => ({
    id: `equation-${index + 1}`, output: equation.n, expression: equation.e,
    enabled: true, role: 'derived' as const,
  }));
  const states = (scene.ode || []).map((equation, index) => ({
    id: `state-${index + 1}`, output: equation.n, expression: equation.d,
    initialValue: equation.i, enabled: true, role: 'state' as const,
  }));
  const equations = [...derived, ...states];
  const objects = (scene.objs || []).map((object, index) => ({
    id: `${nativeId(object.type, 'object')}-${index + 1}`, name: object.label || object.type,
    type: object.type, visible: true,
    properties: { ...(object.p || {}), color: object.color || 'Sky', trail: object.trail || 'none' },
  }));
  const graphSeries = Object.entries(scene.G?.series || {}).filter(([, visible]) => visible !== false).map(([name]) => name);
  const results = equations.map((equation, index) => ({
    id: `equation-result-${index + 1}`, label: equation.output, expression: equation.expression,
    unit: '', precision: 3, display: graphSeries.includes(equation.output) ? 'graph' as const : 'card' as const,
    visible: true,
  }));
  return {
    ...base,
    title: project.title || scene.title || base.title,
    parameters: Object.fromEntries(variables.map((variable) => [variable.id, variable.value])),
    variables, equations, objects, results,
    options: {
      ...base.options,
      vectors: scene.show?.vectors !== false,
      labels: scene.show?.labels !== false,
      trail: scene.show?.trails !== false,
      grid: scene.grid !== false,
    },
    metadata: {
      ...base.metadata,
      physicsNativeProject: project,
      graphOutputs: graphSeries,
      category: scene.mod,
      physicsRuntime: {
        x: scene.x, tv: scene.tv, px: scene.px, py: scene.py, bg: scene.bg,
        unit: scene.unit, layout: scene.layout, view: scene.view, graph: scene.G,
        events: (scene.events || []).map((event) => [event.c, event.a]),
      },
    },
  };
};
