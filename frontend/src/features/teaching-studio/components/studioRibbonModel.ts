export type StudioRibbonTabId =
  | 'home'
  | 'insert'
  | 'simulation'
  | 'activity'
  | 'lab'
  | 'equation'
  | 'draw'
  | 'design'
  | 'transitions'
  | 'animations'
  | 'present'
  | 'review'
  | 'view'
  | 'picture-format'
  | 'shape-format'
  | 'table-design'
  | 'table-layout'
  | 'diagram-design'
  | 'diagram-format'
  | 'chart-design'
  | 'chart-format'
  | '3d-model'
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
  { id: 'simulation', label: 'Simulation' },
  { id: 'activity', label: 'Activity' },
  { id: 'lab', label: 'Lab' },
  { id: 'equation', label: 'Equations' },
  { id: 'draw', label: 'Draw' },
  { id: 'design', label: 'Design' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'animations', label: 'Animations' },
  { id: 'present', label: 'Slide Show' },
  { id: 'review', label: 'Review' },
  { id: 'view', label: 'View' },
];

const mediaResourceTypes = new Set(['image', 'animation', 'video']);

export const studioContextualRibbonTabs = (selection: StudioRibbonSelection): StudioRibbonTab[] => {
  const elementType = String(selection.elementType || '');
  const resourceType = String(selection.resourceType || '');
  const visualType = String(selection.visualType || '');
  const tabs: StudioRibbonTab[] = [];

  if ((selection.selectionCount ?? 0) > 1) return tabs;
  if (selection.drawingActive) {
    tabs.push({ id: 'drawing-format', label: 'Drawing', contextual: true, accent: 'amber' });
  }
  if (elementType === 'shape' || elementType === 'text') {
    tabs.push({ id: 'shape-format', label: 'Shape Format', contextual: true, accent: 'violet' });
  }
  if (elementType === 'table' || visualType === 'table') {
    tabs.push({ id: 'table-design', label: 'Table Design', contextual: true, accent: 'amber' });
    tabs.push({ id: 'table-layout', label: 'Layout', contextual: true, accent: 'amber' });
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
  if (visualType === 'chart') {
    tabs.push({ id: 'chart-design', label: 'Chart Design', contextual: true, accent: 'emerald' });
    tabs.push({ id: 'chart-format', label: 'Chart Format', contextual: true, accent: 'emerald' });
  }
  if (resourceType === 'model_3d') {
    tabs.push({ id: '3d-model', label: '3D Model', contextual: true, accent: 'amber' });
  } else if (mediaResourceTypes.has(resourceType) || visualType === 'image') {
    tabs.push({
      id: 'picture-format',
      label: resourceType === 'video' ? 'Media Format' : 'Picture Format',
      contextual: true,
      accent: 'emerald',
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
