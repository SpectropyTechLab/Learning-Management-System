export type StudioRibbonTabId =
  | 'home'
  | 'insert'
  | 'draw'
  | 'design'
  | 'transitions'
  | 'animations'
  | 'present'
  | 'review'
  | 'view'
  | 'picture-format'
  | 'shape-format'
  | 'diagram-design'
  | 'diagram-format'
  | '3d-model'
  | 'simulation-format'
  | 'group-format'
  | 'drawing-format';

export type StudioRibbonTab = {
  id: StudioRibbonTabId;
  label: string;
  contextual?: boolean;
  accent?: 'blue' | 'violet' | 'emerald' | 'amber';
};
export type StudioRibbonSelection = {
  elementType?: string | null;
  resourceType?: string | null;
  visualType?: string | null;
  selectionCount?: number;
  drawingActive?: boolean;
};

export const STUDIO_PERMANENT_RIBBON_TABS: readonly StudioRibbonTab[] = [
  { id: 'home', label: 'Home' },
  { id: 'insert', label: 'Insert' },
  { id: 'draw', label: 'Draw' },
  { id: 'design', label: 'Design' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'animations', label: 'Animations' },
  { id: 'present', label: 'Slide Show' },
  { id: 'review', label: 'Review' },
  { id: 'view', label: 'View' },
];

const mediaResourceTypes = new Set(['image', 'animation', 'video']);
const simulationTypes = new Set(['simulation', 'embedded_object']);

export const studioContextualRibbonTabs = (selection: StudioRibbonSelection): StudioRibbonTab[] => {
  const elementType = String(selection.elementType || '');
  const resourceType = String(selection.resourceType || '');
  const visualType = String(selection.visualType || '');
  const tabs: StudioRibbonTab[] = [];

  if ((selection.selectionCount ?? 0) > 1) {
    tabs.push({ id: 'group-format', label: 'Group Format', contextual: true, accent: 'violet' });
    return tabs;
  }
  if (selection.drawingActive) {
    tabs.push({ id: 'drawing-format', label: 'Drawing', contextual: true, accent: 'amber' });
  }
  if (elementType === 'shape') {
    tabs.push({ id: 'shape-format', label: 'Shape Format', contextual: true, accent: 'violet' });
  }
  if (visualType === 'smart_diagram') {
    tabs.push({
      id: 'diagram-design',
      label: 'Diagram Design',
      contextual: true,
      accent: 'emerald',
    });
    tabs.push({ id: 'diagram-format', label: 'Diagram Format', contextual: true, accent: 'emerald' });
  }
  if (resourceType === 'model_3d') {
    tabs.push({ id: '3d-model', label: '3D Model', contextual: true, accent: 'amber' });
  } else if (mediaResourceTypes.has(resourceType)) {
    tabs.push({
      id: 'picture-format',
      label: resourceType === 'video' ? 'Media Format' : 'Picture Format',
      contextual: true,
      accent: 'emerald',
    });
  }
  if (
    simulationTypes.has(elementType) ||
    ['simulation', 'html', 'zip', 'scorm'].includes(resourceType)
  ) {
    tabs.push({
      id: 'simulation-format',
      label: 'Simulation Format',
      contextual: true,
      accent: 'blue',
    });
  }
  return tabs;
};

export const studioRibbonTabs = (selection: StudioRibbonSelection): StudioRibbonTab[] => [
  ...STUDIO_PERMANENT_RIBBON_TABS,
  ...studioContextualRibbonTabs(selection),
];

export const preferredStudioRibbonTab = (
  current: StudioRibbonTabId,
  previousContextualIds: readonly StudioRibbonTabId[],
  tabs: readonly StudioRibbonTab[],
): StudioRibbonTabId => {
  const available = new Set(tabs.map((tab) => tab.id));
  const contextual = tabs.filter((tab) => tab.contextual);
  const newlyAvailable = contextual.find((tab) => !previousContextualIds.includes(tab.id));
  if (newlyAvailable) return newlyAvailable.id;
  if (available.has(current)) return current;
  return 'home';
};
