export type BiologyLabCatalogEntry = {
  id: string;
  subject: 'biology';
  launchKey: string;
  title: string;
  topic: string;
  topicLabel: string;
  topicColour: string;
  classes: number[];
  mode: string;
};

export type BiologyLabCatalog = {
  schema: 'spectropy.biology-lab-catalog.v1';
  topics: Record<string, { label: string; colour: string }>;
  labs: BiologyLabCatalogEntry[];
};

export type BiologyLabProject = {
  schema: 'spectropy.lab.v1';
  version: 1;
  subject: 'biology';
  labId: string;
  launchKey: string;
  title: string;
  topic: string;
  classes: number[];
  parameters: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

let catalogPromise: Promise<BiologyLabCatalog> | null = null;
export const loadBiologyLabCatalog = () => {
  catalogPromise ||= fetch('/studio-labs/biology/biology-lab-catalog.json').then((response) => {
    if (!response.ok) throw new Error('Unable to load the Biology Lab catalogue.');
    return response.json() as Promise<BiologyLabCatalog>;
  });
  return catalogPromise;
};

export const createBiologyLabProject = (entry: BiologyLabCatalogEntry): BiologyLabProject => ({
  schema: 'spectropy.lab.v1', version: 1, subject: 'biology', labId: entry.id,
  launchKey: entry.launchKey, title: entry.title, topic: entry.topic, classes: entry.classes, parameters: {},
});

export const validateBiologyLabProject = (value: unknown): BiologyLabProject => {
  if (!value || typeof value !== 'object') throw new Error('Invalid Biology Lab project.');
  const project = value as Partial<BiologyLabProject>;
  if (project.schema !== 'spectropy.lab.v1' || project.version !== 1 || project.subject !== 'biology') throw new Error('This Biology Lab project is not supported by this LMS version.');
  if (!project.labId || !project.launchKey || !project.title || !project.topic || !Array.isArray(project.classes) || !project.parameters) throw new Error('The Biology Lab project is incomplete.');
  return project as BiologyLabProject;
};
