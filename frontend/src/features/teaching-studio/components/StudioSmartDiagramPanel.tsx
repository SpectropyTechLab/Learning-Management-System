import { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, ListTree, Plus, RotateCcw, Shapes, Trash2 } from 'lucide-react';
import type { StudioElement, StudioScreen } from '../types';
import {
  SMART_DIAGRAM_LAYOUTS,
  SMART_DIAGRAM_THEMES,
  createSmartDiagramNode,
  diagramFromOutline,
  isSmartDiagramContent,
  outlineFromDiagram,
  rebuildDiagramParents,
  type SmartDiagramCategory,
  type SmartDiagramContent,
  type SmartDiagramNode,
  type SmartDiagramRevealMode,
} from './smartDiagramModel';

const categories: Array<{ id: SmartDiagramCategory; label: string }> = [
  ['list', 'List'], ['process', 'Process'], ['cycle', 'Cycle'], ['hierarchy', 'Hierarchy'],
  ['relationship', 'Relationship'], ['matrix', 'Matrix'], ['pyramid', 'Pyramid'], ['picture', 'Picture'],
  ['timeline', 'Timeline'], ['comparison', 'Comparison'], ['cause-effect', 'Cause & effect'], ['funnel', 'Funnel'],
].map(([id, label]) => ({ id: id as SmartDiagramCategory, label }));

const revealModes: Array<{ id: SmartDiagramRevealMode; label: string }> = [
  { id: 'as-one-object', label: 'As one object' }, { id: 'all-at-once', label: 'All at once' },
  { id: 'one-by-one', label: 'One by one' }, { id: 'level-at-once', label: 'Level at once' },
  { id: 'level-one-by-one', label: 'Level one by one' },
];

export default function StudioSmartDiagramPanel({
  screen,
  selectedElementId,
  onSelect,
  onInsert,
  onUpdate,
  onDuplicate,
  onRemove,
  onConvertToShapes,
}: {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onSelect: (elementId: string) => void;
  onInsert: (layoutId: string) => void;
  onUpdate: (element: StudioElement) => void;
  onDuplicate: (elementId: string) => void;
  onRemove: (elementId: string) => void;
  onConvertToShapes: (elementId: string) => void;
}) {
  const diagrams = (screen?.elements ?? []).filter((element) => isSmartDiagramContent(element.content));
  const selected = diagrams.find((element) => element.id === selectedElementId) ?? null;
  const content = selected && isSmartDiagramContent(selected.content) ? selected.content : null;
  const [category, setCategory] = useState<SmartDiagramCategory>('process');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [outlineDraft, setOutlineDraft] = useState('');
  const [outlineDiagramId, setOutlineDiagramId] = useState<string | null>(null);
  const layouts = SMART_DIAGRAM_LAYOUTS.filter((layout) => layout.category === category);
  const selectedNode = content?.nodes.find((node) => node.id === selectedNodeId) ?? content?.nodes[0] ?? null;
  const updateContent = (changes: Partial<SmartDiagramContent>) => selected && content && onUpdate({ ...selected, content: { ...content, ...changes } });
  const replaceNodes = (nodes: SmartDiagramNode[], syncOutline = true) => {
    const normalizedNodes = rebuildDiagramParents(nodes);
    if (syncOutline) setOutlineDraft(outlineFromDiagram(normalizedNodes));
    updateContent({ nodes: normalizedNodes });
  };
  const updateNode = (id: string, changes: Partial<SmartDiagramNode>) => content && replaceNodes(content.nodes.map((node) => node.id === id ? { ...node, ...changes } : node));
  const selectedLayout = useMemo(() => SMART_DIAGRAM_LAYOUTS.find((layout) => layout.id === content?.layout), [content?.layout]);

  if ((selected?.id ?? null) !== outlineDiagramId) {
    setOutlineDiagramId(selected?.id ?? null);
    setOutlineDraft(content ? outlineFromDiagram(content.nodes) : '');
  }

  if (!screen) return <p className="text-sm text-slate-500">Select a Screen before inserting a Smart Diagram.</p>;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><ListTree size={18} className="text-blue-800" />Smart Diagram</h2>
        <p className="mt-1 text-xs text-slate-500">Create structured, automatically arranged teaching visuals. Double-click diagram text on the Screen to edit it directly.</p>
      </div>

      {!content ? (
        <>
          {diagrams.length > 0 && <label className="block text-xs font-semibold text-slate-600">Existing diagrams<select defaultValue="" onChange={(event) => event.target.value && onSelect(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"><option value="">Choose diagram…</option>{diagrams.map((diagram) => <option key={diagram.id} value={diagram.id}>{String(diagram.content.text || 'Smart Diagram')}</option>)}</select></label>}
          <div className="grid grid-cols-2 gap-2">{categories.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${category === item.id ? 'border-blue-800 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{item.label}</button>)}</div>
          <div className="space-y-2">{layouts.map((layout) => <button key={layout.id} type="button" onClick={() => onInsert(layout.id)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-400 hover:bg-blue-50"><span className="block text-sm font-semibold text-slate-900">{layout.name}</span><span className="mt-1 block text-xs text-slate-500">{layout.description}</span></button>)}</div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 p-2"><div className="min-w-0"><p className="truncate text-sm font-semibold text-blue-950">{selectedLayout?.name ?? 'Smart Diagram'}</p><p className="text-[11px] text-blue-700">{content.nodes.length} nodes</p></div><div className="flex gap-1"><button type="button" onClick={() => onDuplicate(selected!.id)} title="Duplicate diagram" className="rounded-md border border-blue-200 bg-white p-1.5 text-blue-800"><Copy size={14} /></button><button type="button" onClick={() => onRemove(selected!.id)} title="Delete diagram" className="rounded-md border border-red-200 bg-white p-1.5 text-red-700"><Trash2 size={14} /></button></div></div>

          <label className="block text-xs font-semibold text-slate-600">Diagram layout<select value={content.layout} onChange={(event) => { const layout = SMART_DIAGRAM_LAYOUTS.find((candidate) => candidate.id === event.target.value); if (layout) updateContent({ layout: layout.id, category: layout.category }); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">{categories.map((group) => <optgroup key={group.id} label={group.label}>{SMART_DIAGRAM_LAYOUTS.filter((layout) => layout.category === group.id).map((layout) => <option key={layout.id} value={layout.id}>{layout.name}</option>)}</optgroup>)}</select></label>

          <label className="block text-xs font-semibold text-slate-600">Text Pane<textarea value={outlineDraft} onChange={(event) => { const nextOutline = event.target.value; setOutlineDraft(nextOutline); const nextNodes = diagramFromOutline(nextOutline, content.nodes); if (nextNodes.length > 0) replaceNodes(nextNodes, false); }} onBlur={() => setOutlineDraft(outlineFromDiagram(content.nodes))} rows={7} className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-normal" /><span className="mt-1 block font-normal text-slate-500">Enter adds a shape. Indent with two spaces to create a lower level.</span></label>

          <div className="space-y-2"><div className="flex items-center justify-between"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Create graphic</h3><button type="button" onClick={() => { const node = createSmartDiagramNode(); replaceNodes([...content.nodes, node]); setSelectedNodeId(node.id); }} className="inline-flex items-center gap-1 rounded-lg bg-blue-800 px-2 py-1.5 text-xs font-semibold text-white"><Plus size={13} />Add shape</button></div>{content.nodes.map((node, index) => <button key={node.id} type="button" onClick={() => setSelectedNodeId(node.id)} className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left ${selectedNode?.id === node.id ? 'border-blue-700 bg-blue-50' : 'border-slate-200'}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold">{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs" style={{ paddingLeft: node.level * 10 }}>{node.text}</span>{node.role === 'assistant' && <span className="text-[9px] font-bold text-purple-700">A</span>}</button>)}</div>

          {selectedNode && <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><h3 className="text-xs font-bold uppercase text-slate-500">Selected shape</h3><input value={selectedNode.text} onChange={(event) => updateNode(selectedNode.id, { text: event.target.value })} maxLength={240} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /><div className="grid grid-cols-4 gap-1"><button type="button" disabled={content.nodes.indexOf(selectedNode) === 0} onClick={() => { const index = content.nodes.indexOf(selectedNode); const nodes = [...content.nodes]; [nodes[index - 1], nodes[index]] = [nodes[index], nodes[index - 1]]; replaceNodes(nodes); }} title="Move up" className="rounded-lg border bg-white p-2 disabled:opacity-30"><ArrowUp size={14} className="mx-auto" /></button><button type="button" disabled={content.nodes.indexOf(selectedNode) === content.nodes.length - 1} onClick={() => { const index = content.nodes.indexOf(selectedNode); const nodes = [...content.nodes]; [nodes[index + 1], nodes[index]] = [nodes[index], nodes[index + 1]]; replaceNodes(nodes); }} title="Move down" className="rounded-lg border bg-white p-2 disabled:opacity-30"><ArrowDown size={14} className="mx-auto" /></button><button type="button" disabled={selectedNode.level === 0} onClick={() => updateNode(selectedNode.id, { level: selectedNode.level - 1 })} title="Promote" className="rounded-lg border bg-white p-2 disabled:opacity-30"><ArrowLeft size={14} className="mx-auto" /></button><button type="button" disabled={content.nodes.indexOf(selectedNode) === 0 || selectedNode.level >= 5} onClick={() => updateNode(selectedNode.id, { level: selectedNode.level + 1 })} title="Demote" className="rounded-lg border bg-white p-2 disabled:opacity-30"><ArrowRight size={14} className="mx-auto" /></button></div><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-slate-600">Shape<select value={selectedNode.shape ?? 'rounded'} onChange={(event) => updateNode(selectedNode.id, { shape: event.target.value as SmartDiagramNode['shape'] })} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 font-normal"><option value="rounded">Rounded</option><option value="rectangle">Rectangle</option><option value="pill">Pill</option><option value="circle">Circle</option><option value="diamond">Diamond</option></select></label><label className="text-[11px] font-semibold text-slate-600">Hierarchy role<select value={selectedNode.role ?? 'normal'} onChange={(event) => updateNode(selectedNode.id, { role: event.target.value as SmartDiagramNode['role'] })} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 font-normal"><option value="normal">Standard shape</option><option value="assistant">Assistant to parent</option></select></label></div><p className="text-[10px] leading-4 text-slate-500"><b>Assistant</b> is for organization charts: it places this shape beside its manager rather than in the normal reporting level. Use Standard shape for ordinary diagrams.</p><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-slate-600">Fill<input type="color" value={selectedNode.fill || '#1d4ed8'} onChange={(event) => updateNode(selectedNode.id, { fill: event.target.value })} className="mt-1 h-9 w-full rounded border bg-white p-1" /></label><label className="text-[11px] font-semibold text-slate-600">Text<input type="color" value={selectedNode.textColor || '#ffffff'} onChange={(event) => updateNode(selectedNode.id, { textColor: event.target.value })} className="mt-1 h-9 w-full rounded border bg-white p-1" /></label></div><label className="block text-[11px] font-semibold text-slate-600">Icon or symbol<input value={selectedNode.icon || ''} onChange={(event) => updateNode(selectedNode.id, { icon: event.target.value.slice(0, 8) })} placeholder="Example: ✓, ⚛, 💡" className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 font-normal" /></label><button type="button" disabled={content.nodes.length <= 1} onClick={() => { replaceNodes(content.nodes.filter((node) => node.id !== selectedNode.id)); setSelectedNodeId(null); }} className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-2 text-xs font-semibold text-red-700 disabled:opacity-30"><Trash2 size={13} />Delete shape</button></div>}

          <div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-600">Direction<select value={content.direction} onChange={(event) => updateContent({ direction: event.target.value as SmartDiagramContent['direction'] })} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 font-normal"><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></label><label className="text-xs font-semibold text-slate-600">Connectors<select value={content.connectorStyle} onChange={(event) => updateContent({ connectorStyle: event.target.value as SmartDiagramContent['connectorStyle'] })} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 font-normal"><option value="straight">Straight</option><option value="elbow">Elbow</option><option value="curve">Curved</option><option value="none">None</option></select></label></div>
          <div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-600">Colour theme<select value={content.themeId} onChange={(event) => updateContent({ themeId: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 font-normal">{SMART_DIAGRAM_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Smart style<select value={content.styleId} onChange={(event) => updateContent({ styleId: event.target.value as SmartDiagramContent['styleId'] })} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 font-normal"><option value="flat">Flat</option><option value="outline">Outline</option><option value="soft">Soft shadow</option><option value="polished">Polished</option><option value="bevel">Bevel</option></select></label></div>
          <label className="block text-xs font-semibold text-slate-600">Smart Diagram animation<select value={content.revealMode} onChange={(event) => updateContent({ revealMode: event.target.value as SmartDiagramRevealMode })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal">{revealModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}</select></label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={content.reverseAnimation} onChange={(event) => updateContent({ reverseAnimation: event.target.checked })} />Reverse animation order</label>
          <label className="block text-xs font-semibold text-slate-600">Accessibility description<textarea value={content.altText} onChange={(event) => updateContent({ altText: event.target.value })} rows={2} className="mt-1 w-full resize-y rounded-lg border bg-white px-3 py-2 font-normal" /></label>
          <div className="grid gap-2"><button type="button" onClick={() => updateContent({ themeId: 'spectropy', styleId: 'soft', connectorStyle: 'straight', direction: 'ltr', nodes: content.nodes.map((node) => ({ id: node.id, text: node.text, level: node.level, parentId: node.parentId, role: node.role, icon: node.icon })) })} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><RotateCcw size={14} />Reset graphic formatting</button><button type="button" onClick={() => onConvertToShapes(selected!.id)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-900"><Shapes size={14} />Convert to individual shapes</button><p className="text-[10px] text-slate-500">Like PowerPoint, conversion is one-way. Use Undo immediately if you need the structured diagram back.</p></div>
        </>
      )}
    </div>
  );
}
