export type ChemistryLabCatalogEntry = {
  id: string;
  subject: 'chemistry';
  title: string;
  topic: string;
  topicLabel: string;
  topicColour: string;
  classes: number[];
  aim: string;
  theory: string;
  apparatus: string[];
  safety: string;
  procedure: string[];
  result: string;
  mode: string;
  meterCount: number;
  actionCount: number;
  vivaCount: number;
  hasObservations: boolean;
  hasCalculations: boolean;
};

export type ChemistryLabCatalog = {
  schema: 'spectropy.chemistry-lab-catalog.v1';
  topics: Record<string, { label: string; colour: string }>;
  labs: ChemistryLabCatalogEntry[];
};

export type ChemistryLabProject = {
  schema: 'spectropy.lab.v1';
  version: 1;
  subject: 'chemistry';
  labId: string;
  title: string;
  topic: string;
  classes: number[];
  parameters: Record<string, unknown>;
  authoringProject?: ChemistryAuthoringProject;
  metadata?: Record<string, unknown>;
};

export type ChemistryAuthoringProject = {
  title: string;
  scenes: Array<Record<string, unknown>>;
  start?: number;
};

let catalogPromise: Promise<ChemistryLabCatalog> | null = null;

export const loadChemistryLabCatalog = () => {
  catalogPromise ||= fetch('/studio-labs/chemistry/chemistry-lab-catalog.json').then((response) => {
    if (!response.ok) throw new Error('Unable to load the Chemistry Lab catalogue.');
    return response.json() as Promise<ChemistryLabCatalog>;
  });
  return catalogPromise;
};

export const createChemistryLabProject = (entry: ChemistryLabCatalogEntry): ChemistryLabProject => ({
  schema: 'spectropy.lab.v1',
  version: 1,
  subject: 'chemistry',
  labId: entry.id,
  title: entry.title,
  topic: entry.topic,
  classes: entry.classes,
  parameters: {},
});

export const validateChemistryLabProject = (value: unknown): ChemistryLabProject => {
  if (!value || typeof value !== 'object') throw new Error('Invalid Chemistry Lab project.');
  const project = value as Partial<ChemistryLabProject>;
  if (project.schema !== 'spectropy.lab.v1' || project.version !== 1 || project.subject !== 'chemistry') {
    throw new Error('This Chemistry Lab project is not supported by this LMS version.');
  }
  if (!project.labId || !project.title || !project.topic || !Array.isArray(project.classes) || !project.parameters) {
    throw new Error('The Chemistry Lab project is incomplete.');
  }
  if (project.authoringProject && (!Array.isArray(project.authoringProject.scenes) || !project.authoringProject.scenes.length)) {
    throw new Error('The Chemistry authoring project has no simulation scenes.');
  }
  return project as ChemistryLabProject;
};
