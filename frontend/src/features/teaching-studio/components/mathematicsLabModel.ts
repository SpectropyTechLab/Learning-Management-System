export type MathematicsLabCatalogEntry = {
  id: string;
  subject: 'mathematics';
  title: string;
  topic: string;
  topicLabel: string;
  topicColour: string;
  classes: number[];
  aim: string;
  apparatus: string[];
  procedure: string[];
  conclusion: string;
  tips: string[];
  controlCount: number;
  actionCount: number;
  hasReadings: boolean;
  hasResult: boolean;
  hasDragHandles: boolean;
  hasRotation: boolean;
  hasAnimation: boolean;
};

export type MathematicsLabCatalog = {
  schema: 'spectropy.mathematics-lab-catalog.v1';
  topics: Record<string, { label: string; colour: string }>;
  labs: MathematicsLabCatalogEntry[];
};

export type MathematicsLabProject = {
  schema: 'spectropy.lab.v1';
  version: 1;
  subject: 'mathematics';
  labId: string;
  title: string;
  topic: string;
  classes: number[];
  parameters: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

let catalogPromise: Promise<MathematicsLabCatalog> | null = null;
export const loadMathematicsLabCatalog = () => {
  catalogPromise ||= fetch('/studio-labs/mathematics/mathematics-lab-catalog.json').then((response) => {
    if (!response.ok) throw new Error('Unable to load the Mathematics Lab catalogue.');
    return response.json() as Promise<MathematicsLabCatalog>;
  });
  return catalogPromise;
};

export const createMathematicsLabProject = (entry: MathematicsLabCatalogEntry): MathematicsLabProject => ({
  schema: 'spectropy.lab.v1', version: 1, subject: 'mathematics', labId: entry.id,
  title: entry.title, topic: entry.topic, classes: entry.classes, parameters: {},
});

export const validateMathematicsLabProject = (value: unknown): MathematicsLabProject => {
  if (!value || typeof value !== 'object') throw new Error('Invalid Mathematics Lab project.');
  const project = value as Partial<MathematicsLabProject>;
  if (project.schema !== 'spectropy.lab.v1' || project.version !== 1 || project.subject !== 'mathematics') throw new Error('This Mathematics Lab project is not supported by this LMS version.');
  if (!project.labId || !project.title || !project.topic || !Array.isArray(project.classes) || !project.parameters) throw new Error('The Mathematics Lab project is incomplete.');
  return project as MathematicsLabProject;
};
