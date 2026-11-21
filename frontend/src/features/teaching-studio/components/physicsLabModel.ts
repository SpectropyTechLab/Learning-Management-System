export type PhysicsLabControl = {
  k: string;
  label: string;
  type: 'range' | 'select' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
  def: unknown;
  unit?: string;
  options?: Array<[unknown, string]>;
};

export type PhysicsLabDefinition = {
  title: string;
  topic: string;
  grades: number[];
  aim: string;
  apparatus: string[];
  formula: string;
  procedure: string[];
  controls: PhysicsLabControl[];
  actions?: Array<{ label: string; run: (state: unknown, params: Record<string, unknown>) => void }>;
  init: (params: Record<string, unknown>) => unknown;
  onChange?: (state: unknown, params: Record<string, unknown>, key: string) => void;
  step?: (state: unknown, params: Record<string, unknown>, deltaSeconds: number, timeSeconds: number) => void;
  pointer?: (state: unknown, params: Record<string, unknown>, x: number, y: number, phase: 'down' | 'move' | 'up') => Record<string, unknown> | void;
  draw: (context: CanvasRenderingContext2D, state: unknown, params: Record<string, unknown>, timeSeconds: number) => void;
  readings: (state: unknown, params: Record<string, unknown>) => Array<[string, string | number, string]>;
  columns?: string[];
  record?: (state: unknown, params: Record<string, unknown>) => unknown[] & { error?: string };
  plot?: { x: number; y: number; fit?: boolean };
  result?: (rows: unknown[][]) => string;
  note?: string;
  dispose?: (state: unknown) => void;
};

export type PhysicsLabCatalogEntry = {
  id: string;
  subject: 'physics';
  title: string;
  topic: string;
  topicLabel: string;
  topicColour: string;
  classes: number[];
  aim: string;
  apparatus: string[];
  formula: string;
  procedure: string[];
  controlCount: number;
  actionCount: number;
  hasReadings: boolean;
  hasObservationTable: boolean;
  hasGraph: boolean;
  icon?: { key?: string; url?: string; alt?: string };
};

export type PhysicsLabCatalog = {
  schema: 'spectropy.physics-lab-catalog.v1';
  topics: Record<string, { label: string; colour: string }>;
  labs: PhysicsLabCatalogEntry[];
};

export type PhysicsLabProject = {
  schema: 'spectropy.lab.v1';
  version: 1;
  subject: 'physics';
  labId: string;
  title: string;
  topic: string;
  classes: number[];
  parameters: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

declare global {
  interface Window {
    LabSims?: Record<string, PhysicsLabDefinition>;
    LabKit?: { W: number; H: number };
  }
}

let catalogPromise: Promise<PhysicsLabCatalog> | null = null;
let runtimePromise: Promise<Record<string, PhysicsLabDefinition>> | null = null;

export const loadPhysicsLabCatalog = () => {
  catalogPromise ||= fetch('/studio-labs/physics/physics-lab-catalog.json')
    .then((response) => {
      if (!response.ok) throw new Error('Unable to load the Physics Lab catalogue.');
      return response.json() as Promise<PhysicsLabCatalog>;
    });
  return catalogPromise;
};

export const loadPhysicsLabRuntime = () => {
  if (window.LabSims && Object.keys(window.LabSims).length >= 129) return Promise.resolve(window.LabSims);
  runtimePromise ||= new Promise<Record<string, PhysicsLabDefinition>>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-spectropy-physics-labs]');
    const finish = () => {
      if (window.LabSims && Object.keys(window.LabSims).length >= 129) resolve(window.LabSims);
      else reject(new Error('The Physics Lab runtime did not expose all 129 activities.'));
    };
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load the Physics Lab runtime.')), { once: true });
      window.setTimeout(finish, 0);
      return;
    }
    const script = document.createElement('script');
    script.src = '/studio-labs/physics/physics-labs-runtime.js';
    script.async = true;
    script.dataset.spectropyPhysicsLabs = 'true';
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load the Physics Lab runtime.')), { once: true });
    document.head.appendChild(script);
  });
  return runtimePromise;
};

export const createPhysicsLabProject = (entry: PhysicsLabCatalogEntry, definition: PhysicsLabDefinition): PhysicsLabProject => ({
  schema: 'spectropy.lab.v1',
  version: 1,
  subject: 'physics',
  labId: entry.id,
  title: entry.title,
  topic: entry.topic,
  classes: entry.classes,
  parameters: Object.fromEntries(definition.controls.map((control) => [control.k, control.def])),
});

export const validatePhysicsLabProject = (value: unknown): PhysicsLabProject => {
  if (!value || typeof value !== 'object') throw new Error('Invalid Physics Lab project.');
  const project = value as Partial<PhysicsLabProject>;
  if (project.schema !== 'spectropy.lab.v1' || project.version !== 1 || project.subject !== 'physics') {
    throw new Error('This Lab project is not supported by this LMS version.');
  }
  if (!project.labId || !project.title || !project.topic || !Array.isArray(project.classes) || !project.parameters) {
    throw new Error('The Physics Lab project is incomplete.');
  }
  return project as PhysicsLabProject;
};
