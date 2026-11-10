export type SmartDiagramCategory =
  | 'list'
  | 'process'
  | 'cycle'
  | 'hierarchy'
  | 'relationship'
  | 'matrix'
  | 'pyramid'
  | 'picture'
  | 'timeline'
  | 'comparison'
  | 'cause-effect'
  | 'funnel';

export type SmartDiagramRevealMode =
  | 'as-one-object'
  | 'all-at-once'
  | 'one-by-one'
  | 'level-at-once'
  | 'level-one-by-one';

export type SmartDiagramNode = {
  id: string;
  text: string;
  level: number;
  parentId?: string | null;
  role?: 'normal' | 'assistant';
  icon?: string;
  fill?: string;
  textColor?: string;
  shape?: 'rounded' | 'rectangle' | 'circle' | 'pill' | 'diamond';
};

export type SmartDiagramContent = {
  visualType: 'smart_diagram';
  schemaVersion: 1;
  category: SmartDiagramCategory;
  layout: string;
  nodes: SmartDiagramNode[];
  direction: 'ltr' | 'rtl';
  themeId: string;
  styleId: 'flat' | 'outline' | 'soft' | 'polished' | 'bevel';
  connectorStyle: 'straight' | 'elbow' | 'curve' | 'none';
  revealMode: SmartDiagramRevealMode;
  reverseAnimation: boolean;
  altText: string;
  text?: string;
  animation?: Record<string, unknown>;
};

export type SmartDiagramLayoutDefinition = {
  id: string;
  name: string;
  category: SmartDiagramCategory;
  description: string;
  supportsLevels?: boolean;
  maximumRecommendedNodes?: number;
  variant?: number;
};

const CORE_SMART_DIAGRAM_LAYOUTS: SmartDiagramLayoutDefinition[] = [
  { id: 'basic-list', name: 'Basic List', category: 'list', description: 'Equal ideas without a required order.' },
  { id: 'vertical-box-list', name: 'Vertical Box List', category: 'list', description: 'Stacked ideas with supporting levels.', supportsLevels: true },
  { id: 'horizontal-bullet-list', name: 'Horizontal Bullet List', category: 'list', description: 'Compact left-to-right ideas.' },
  { id: 'basic-process', name: 'Basic Process', category: 'process', description: 'Sequential stages or instructions.' },
  { id: 'chevron-process', name: 'Chevron Process', category: 'process', description: 'Strong forward progression.' },
  { id: 'vertical-process', name: 'Vertical Process', category: 'process', description: 'Top-to-bottom sequence.', supportsLevels: true },
  { id: 'basic-cycle', name: 'Basic Cycle', category: 'cycle', description: 'A repeating circular sequence.' },
  { id: 'continuous-cycle', name: 'Continuous Cycle', category: 'cycle', description: 'Closely connected recurring stages.' },
  { id: 'radial-cycle', name: 'Radial Cycle', category: 'cycle', description: 'Stages revolving around a central idea.' },
  { id: 'organization-chart', name: 'Organization Chart', category: 'hierarchy', description: 'Parent, child and assistant relationships.', supportsLevels: true },
  { id: 'horizontal-hierarchy', name: 'Horizontal Hierarchy', category: 'hierarchy', description: 'Hierarchy flowing across the screen.', supportsLevels: true },
  { id: 'labelled-hierarchy', name: 'Labelled Hierarchy', category: 'hierarchy', description: 'Levels with clear visual grouping.', supportsLevels: true },
  { id: 'radial-relationship', name: 'Radial Relationship', category: 'relationship', description: 'Ideas connected to one central concept.', supportsLevels: true },
  { id: 'opposing-ideas', name: 'Opposing Ideas', category: 'relationship', description: 'Two perspectives around a shared subject.' },
  { id: 'basic-matrix', name: 'Basic Matrix', category: 'matrix', description: 'Four related quadrants.' },
  { id: 'titled-matrix', name: 'Titled Matrix', category: 'matrix', description: 'Quadrants around a central title.' },
  { id: 'basic-pyramid', name: 'Basic Pyramid', category: 'pyramid', description: 'Proportion, foundation or ascending importance.' },
  { id: 'inverted-pyramid', name: 'Inverted Pyramid', category: 'pyramid', description: 'From broad information to a focused result.' },
  { id: 'picture-grid', name: 'Picture Grid', category: 'picture', description: 'Icon or image-led concepts.' },
  { id: 'picture-caption-list', name: 'Picture Caption List', category: 'picture', description: 'Visual items with explanatory captions.' },
  { id: 'basic-timeline', name: 'Basic Timeline', category: 'timeline', description: 'Events, dates or milestones.' },
  { id: 'alternating-timeline', name: 'Alternating Timeline', category: 'timeline', description: 'Milestones alternating above and below.' },
  { id: 'side-by-side-comparison', name: 'Side-by-side Comparison', category: 'comparison', description: 'Compare two or more choices.' },
  { id: 'balance-comparison', name: 'Balance Comparison', category: 'comparison', description: 'Balanced advantages, evidence or viewpoints.' },
  { id: 'fishbone', name: 'Cause and Effect', category: 'cause-effect', description: 'Causes leading to one result.', supportsLevels: true },
  { id: 'basic-funnel', name: 'Basic Funnel', category: 'funnel', description: 'Filtering from broad input to a focused outcome.' },
];

const EXPANDED_LAYOUT_NAMES: Record<SmartDiagramCategory, string[]> = {
  list: ['Alternating Card List', 'Grouped Block List', 'Stacked Accent List', 'Nested List', 'Tabbed List', 'Picture Accent List', 'Segmented List', 'Compact Grid List', 'Diagonal List', 'Radial List'],
  process: ['Step-up Process', 'Step-down Process', 'Alternating Process', 'Staggered Process', 'Converging Process', 'Diverging Process', 'Arrow Ribbon Process', 'Milestone Process', 'Picture Process', 'Continuous Block Process'],
  cycle: ['Segmented Cycle', 'Text Cycle', 'Gear Cycle', 'Multi-direction Cycle', 'Nested Cycle', 'Hexagon Cycle', 'Block Cycle', 'Alternating Cycle', 'Picture Cycle', 'Converging Cycle'],
  hierarchy: ['Name and Title Chart', 'Table Hierarchy', 'L-shaped Hierarchy', 'Horizontal Multi-level Hierarchy', 'Picture Organization Chart', 'Circle Hierarchy', 'Grouped Hierarchy', 'Alternating Hierarchy', 'Pyramid Hierarchy', 'Radial Hierarchy'],
  relationship: ['Converging Radial', 'Diverging Radial', 'Interconnected Rings', 'Venn Relationship', 'Target Relationship', 'Balance Relationship', 'Equation Relationship', 'Hexagon Cluster', 'Opposing Arrows', 'Nested Relationship'],
  matrix: ['Grid Matrix', 'Cycle Matrix', 'Quadrant Matrix', 'Nested Matrix', 'Picture Matrix', 'Accent Matrix', 'Tabbed Matrix', 'Segmented Matrix', 'Radial Matrix', 'Hierarchy Matrix'],
  pyramid: ['Segmented Pyramid', 'Pyramid List', 'Pyramid Process', 'Pyramid Accent', 'Picture Pyramid', 'Layered Pyramid', 'Stepped Pyramid', 'Nested Pyramid', 'Radial Pyramid', 'Balance Pyramid'],
  picture: ['Circular Picture List', 'Alternating Picture Blocks', 'Picture Accent Process', 'Picture Strips', 'Picture Timeline', 'Picture Hierarchy', 'Picture Cluster', 'Picture Grid with Captions', 'Framed Picture List', 'Radial Picture List'],
  timeline: ['Circle Accent Timeline', 'Descending Timeline', 'Ascending Timeline', 'Picture Timeline', 'Milestone Timeline', 'Process Timeline', 'Vertical Timeline', 'Curved Timeline', 'Grouped Timeline', 'Segmented Timeline'],
  comparison: ['Opposing Comparison', 'Stacked Comparison', 'Table Comparison', 'Venn Comparison', 'Balance Comparison with Labels', 'Picture Comparison', 'Matrix Comparison', 'Arrow Comparison', 'Radial Comparison', 'Scorecard Comparison'],
  'cause-effect': ['Classic Fishbone', 'Alternating Fishbone', 'Radial Cause Map', 'Root Cause Tree', 'Cause Chain', 'Multi-effect Diagram', 'Problem Solution Map', 'Converging Causes', 'Evidence Map', 'Impact Path'],
  funnel: ['Segmented Funnel', 'Inverted Funnel', 'Funnel List', 'Picture Funnel', 'Converging Funnel', 'Filtering Process', 'Layered Funnel', 'Alternating Funnel', 'Radial Funnel', 'Outcome Funnel'],
};

export const SMART_DIAGRAM_LAYOUTS: SmartDiagramLayoutDefinition[] = [
  ...CORE_SMART_DIAGRAM_LAYOUTS,
  ...Object.entries(EXPANDED_LAYOUT_NAMES).flatMap(([category, names]) =>
    names.map((name, index) => ({
      id: `${category}-variant-${index + 1}`,
      name,
      category: category as SmartDiagramCategory,
      description: `${name} arrangement for clear classroom explanation.`,
      supportsLevels: category === 'list' || category === 'hierarchy' || category === 'cause-effect',
      variant: index + 1,
    })),
  ),
];

export const SMART_DIAGRAM_THEMES = [
  { id: 'spectropy', name: 'Spectropy', colors: ['#1e3a8a', '#1d4ed8', '#0284c7', '#0891b2', '#0f766e'] },
  { id: 'classroom', name: 'Classroom', colors: ['#166534', '#16a34a', '#65a30d', '#ca8a04', '#ea580c'] },
  { id: 'science', name: 'Science', colors: ['#312e81', '#6d28d9', '#7c3aed', '#db2777', '#e11d48'] },
  { id: 'neutral', name: 'Neutral', colors: ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'] },
  { id: 'warm', name: 'Warm', colors: ['#9a3412', '#c2410c', '#ea580c', '#d97706', '#ca8a04'] },
] as const;

export const createSmartDiagramNode = (text = 'New item', level = 0): SmartDiagramNode => ({
  id: `diagram-node-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
  text,
  level,
  role: 'normal',
});

export const createSmartDiagramContent = (layout = 'basic-process'): SmartDiagramContent => {
  const definition = SMART_DIAGRAM_LAYOUTS.find((candidate) => candidate.id === layout) ?? SMART_DIAGRAM_LAYOUTS[3];
  const nodes = ['Introduce the concept', 'Explain the key idea', 'Check understanding'].map((text) => createSmartDiagramNode(text));
  return {
    visualType: 'smart_diagram', schemaVersion: 1, category: definition.category, layout: definition.id,
    nodes, direction: 'ltr', themeId: 'spectropy', styleId: 'soft', connectorStyle: 'straight',
    revealMode: 'as-one-object', reverseAnimation: false,
    altText: 'A three-step teaching process.', text: 'Smart diagram',
  };
};

export const isSmartDiagramContent = (value: unknown): value is SmartDiagramContent => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (value as Record<string, unknown>).visualType === 'smart_diagram';
};

export const normaliseDiagramLevels = (nodes: SmartDiagramNode[]) => {
  let previous = 0;
  return nodes.map((node, index) => {
    const requested = Number.isInteger(node.level) ? node.level : 0;
    const level = index === 0 ? 0 : Math.max(0, Math.min(requested, previous + 1, 5));
    previous = level;
    return { ...node, level };
  });
};

export const rebuildDiagramParents = (nodes: SmartDiagramNode[]) => {
  const normalised = normaliseDiagramLevels(nodes);
  return normalised.map((node, index) => {
    if (node.level === 0) return { ...node, parentId: null };
    for (let parentIndex = index - 1; parentIndex >= 0; parentIndex -= 1) {
      if (normalised[parentIndex].level === node.level - 1)
        return { ...node, parentId: normalised[parentIndex].id };
    }
    return { ...node, level: 0, parentId: null };
  });
};

export const outlineFromDiagram = (nodes: SmartDiagramNode[]) =>
  nodes.map((node) => `${'  '.repeat(node.level)}${node.text}`).join('\n');

export const diagramFromOutline = (outline: string, existing: SmartDiagramNode[] = []) => {
  const lines = outline.split(/\r?\n/).filter((line) => line.trim());
  const nodes = lines.slice(0, 50).map((line, index) => {
    const whitespace = line.match(/^[\t ]*/)?.[0] ?? '';
    const tabs = (whitespace.match(/\t/g) ?? []).length;
    const spaces = whitespace.replace(/\t/g, '').length;
    const level = Math.min(5, tabs + Math.floor(spaces / 2));
    return { ...(existing[index] ?? createSmartDiagramNode()), text: line.trim().slice(0, 240), level };
  });
  return rebuildDiagramParents(nodes);
};

export type DiagramBox = { id: string; x: number; y: number; width: number; height: number; level: number };
export type DiagramEdge = { from: string; to: string };
export type DiagramGeometry = { boxes: DiagramBox[]; edges: DiagramEdge[] };

const evenlySpaced = (count: number, start: number, end: number) =>
  Array.from({ length: count }, (_, index) => count === 1 ? (start + end) / 2 : start + ((end - start) * index) / (count - 1));

const sequentialEdges = (nodes: SmartDiagramNode[]): DiagramEdge[] =>
  nodes.slice(1).map((node, index) => ({ from: nodes[index].id, to: node.id }));

const hierarchyEdges = (nodes: SmartDiagramNode[]): DiagramEdge[] =>
  nodes.flatMap((node) => node.parentId ? [{ from: node.parentId, to: node.id }] : []);

export const layoutSmartDiagram = (content: SmartDiagramContent): DiagramGeometry => {
  const definition = SMART_DIAGRAM_LAYOUTS.find((candidate) => candidate.id === content.layout);
  const variant = definition?.variant ?? 0;
  const nodes = rebuildDiagramParents(content.nodes);
  const ordered = content.direction === 'rtl' ? [...nodes].reverse() : nodes;
  const count = Math.max(ordered.length, 1);
  const boxes: DiagramBox[] = [];
  let edges: DiagramEdge[] = [];
  if (content.category === 'hierarchy' || content.layout === 'fishbone') {
    const levels = new Map<number, SmartDiagramNode[]>();
    const standardNodes = nodes.filter((node) => node.role !== 'assistant');
    const assistantNodes = nodes.filter((node) => node.role === 'assistant');
    standardNodes.forEach((node) => levels.set(node.level, [...(levels.get(node.level) ?? []), node]));
    const maximumLevel = Math.max(...standardNodes.map((node) => node.level), 0);
    for (const [level, items] of levels) {
      const horizontal = content.layout !== 'horizontal-hierarchy';
      const positions = evenlySpaced(items.length, 120, 880);
      items.forEach((node, index) => boxes.push(horizontal
        ? { id: node.id, x: positions[index] - 90, y: 55 + level * (500 / Math.max(maximumLevel + 1, 2)), width: 180, height: 78, level }
        : { id: node.id, x: 55 + level * (850 / Math.max(maximumLevel + 1, 2)), y: positions[index] * 0.58 - 40, width: 190, height: 78, level }));
    }
    assistantNodes.forEach((node, index) => {
      const parentBox = boxes.find((box) => box.id === node.parentId) ?? boxes[0];
      if (!parentBox) return;
      const horizontal = content.layout !== 'horizontal-hierarchy';
      const width = 150;
      const height = 62;
      const x = horizontal
        ? Math.min(840, parentBox.x + parentBox.width + 30)
        : Math.min(840, parentBox.x + 20);
      const y = horizontal
        ? Math.min(520, parentBox.y + 12 + index * 70)
        : Math.min(520, parentBox.y + parentBox.height + 20 + index * 70);
      boxes.push({ id: node.id, x, y, width, height, level: node.level });
    });
    edges = hierarchyEdges(nodes);
  } else if (['cycle', 'relationship'].includes(content.category)) {
    const radius = count <= 5 ? 205 : 235;
    ordered.forEach((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
      boxes.push({ id: node.id, x: 500 + Math.cos(angle) * radius - 82, y: 300 + Math.sin(angle) * radius - 48, width: 164, height: 96, level: node.level });
    });
    edges = content.category === 'cycle' ? [...sequentialEdges(ordered), ...(ordered.length > 2 ? [{ from: ordered.at(-1)!.id, to: ordered[0].id }] : [])] : ordered.slice(1).map((node) => ({ from: ordered[0].id, to: node.id }));
  } else if (content.category === 'matrix') {
    ordered.forEach((node, index) => boxes.push({ id: node.id, x: 110 + (index % 2) * 405, y: 75 + Math.floor(index / 2) * 235, width: 375, height: 195, level: node.level }));
  } else if (['pyramid', 'funnel'].includes(content.category)) {
    const heights = 480 / count;
    ordered.forEach((node, index) => {
      const pyramid = content.category === 'pyramid';
      const ratio = pyramid ? (index + 1) / count : (count - index) / count;
      const width = 280 + 560 * ratio;
      boxes.push({ id: node.id, x: 500 - width / 2, y: 55 + index * heights, width, height: Math.max(54, heights - 8), level: node.level });
    });
  } else if (content.category === 'timeline') {
    const positions = evenlySpaced(count, 100, 900);
    ordered.forEach((node, index) => boxes.push({ id: node.id, x: positions[index] - 80, y: content.layout === 'alternating-timeline' ? (index % 2 ? 330 : 120) : 220, width: 160, height: 105, level: node.level }));
    edges = sequentialEdges(ordered);
  } else if (content.category === 'comparison') {
    const width = count <= 2 ? 370 : 250;
    const positions = evenlySpaced(count, 190, 810);
    ordered.forEach((node, index) => boxes.push({ id: node.id, x: positions[index] - width / 2, y: 125 + (node.level * 120), width, height: 300 - node.level * 30, level: node.level }));
  } else if (content.category === 'picture') {
    const columns = Math.min(3, count);
    const rows = Math.ceil(count / columns);
    ordered.forEach((node, index) => boxes.push({ id: node.id, x: 75 + (index % columns) * (850 / columns), y: 55 + Math.floor(index / columns) * (500 / rows), width: 240, height: Math.max(120, 440 / rows), level: node.level }));
  } else if (content.layout === 'vertical-process' || content.layout === 'vertical-box-list') {
    const positions = evenlySpaced(count, 75, 525);
    ordered.forEach((node, index) => boxes.push({ id: node.id, x: 190 + node.level * 60, y: positions[index] - 40, width: 620 - node.level * 60, height: 80, level: node.level }));
    edges = content.category === 'process' ? sequentialEdges(ordered) : [];
  } else {
    const width = Math.min(240, Math.max(125, 780 / count));
    const positions = evenlySpaced(count, 90 + width / 2, 910 - width / 2);
    ordered.forEach((node, index) => boxes.push({ id: node.id, x: positions[index] - width / 2, y: 205 + node.level * 105, width, height: 150, level: node.level }));
    edges = content.category === 'process' ? sequentialEdges(ordered) : [];
  }
  if (variant > 0 && boxes.length > 0) {
    const transformed = boxes.map((box, index) => {
      const row = Math.floor(index / 3);
      const column = index % 3;
      if (variant === 1) return { ...box, y: Math.max(35, Math.min(520, box.y + (index % 2 ? 65 : -35))) };
      if (variant === 2) return { ...box, x: 110 + column * 300, y: 70 + row * 170, width: 230, height: 110 };
      if (variant === 3) return { ...box, x: 100 + index * Math.min(135, 760 / Math.max(boxes.length - 1, 1)), y: 70 + index * Math.min(70, 350 / Math.max(boxes.length - 1, 1)), width: 180, height: 90 };
      if (variant === 4) return { ...box, x: index % 2 ? 560 : 170, y: 65 + Math.floor(index / 2) * 150, width: 270, height: 105 };
      if (variant === 5) { const angle = -Math.PI * 0.85 + (Math.PI * 0.7 * index) / Math.max(boxes.length - 1, 1); return { ...box, x: 500 + Math.cos(angle) * 300 - 95, y: 330 + Math.sin(angle) * 230 - 45, width: 190, height: 90 }; }
      if (variant === 6) return index === 0 ? { ...box, x: 375, y: 235, width: 250, height: 130 } : { ...box, x: 90 + ((index - 1) % 3) * 310, y: index % 2 ? 70 : 430, width: 200, height: 90 };
      if (variant === 7) return { ...box, x: 130 + column * 270 + (row % 2 ? 110 : 0), y: 75 + row * 155, width: 220, height: 105 };
      if (variant === 8) return { ...box, x: index % 2 ? 525 : 130, y: 55 + index * Math.min(100, 450 / Math.max(boxes.length - 1, 1)), width: 300, height: 82 };
      if (variant === 9) { const angle = -Math.PI / 2 + (Math.PI * 2 * index) / boxes.length; return { ...box, x: 500 + Math.cos(angle) * 260 - 90, y: 300 + Math.sin(angle) * 210 - 45, width: 180, height: 90 }; }
      return { ...box, x: 75 + index * Math.min(155, 820 / Math.max(boxes.length, 1)), y: index % 2 ? 315 : 155, width: 190, height: 110 };
    });
    return { boxes: transformed, edges };
  }
  return { boxes, edges };
};

export const diagramRevealGroups = (content: SmartDiagramContent): string[][] => {
  const nodes = content.reverseAnimation ? [...content.nodes].reverse() : content.nodes;
  if (content.revealMode === 'as-one-object' || content.revealMode === 'all-at-once') return [nodes.map((node) => node.id)];
  if (content.revealMode === 'one-by-one' || content.revealMode === 'level-one-by-one') return nodes.map((node) => [node.id]);
  const levels = [...new Set(nodes.map((node) => node.level))].sort((a, b) => a - b);
  return levels.map((level) => nodes.filter((node) => node.level === level).map((node) => node.id));
};
