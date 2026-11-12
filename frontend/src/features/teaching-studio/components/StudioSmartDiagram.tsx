import { useEffect, useMemo } from 'react';
import {
  SMART_DIAGRAM_THEMES,
  isSmartDiagramContent,
  layoutSmartDiagram,
  type DiagramBox,
  type SmartDiagramContent,
  type SmartDiagramNode,
} from './smartDiagramModel';

const centre = (box: DiagramBox) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const nodePath = (box: DiagramBox, node: SmartDiagramNode) => {
  if (node.shape === 'diamond') {
    const c = centre(box);
    return `M ${c.x} ${box.y} L ${box.x + box.width} ${c.y} L ${c.x} ${box.y + box.height} L ${box.x} ${c.y} Z`;
  }
  return '';
};

const linePath = (from: DiagramBox, to: DiagramBox, style: SmartDiagramContent['connectorStyle']) => {
  const a = centre(from);
  const b = centre(to);
  if (style === 'elbow') return `M ${a.x} ${a.y} H ${(a.x + b.x) / 2} V ${b.y} H ${b.x}`;
  if (style === 'curve') return `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
};

export default function StudioSmartDiagram({
  content: rawContent,
  editable = false,
  selectedNodeId = null,
  visibleNodeIds,
  onSelectNode,
  onChangeNodeText,
  onAspectRatioChange,
}: {
  content: Record<string, unknown>;
  editable?: boolean;
  selectedNodeId?: string | null;
  visibleNodeIds?: ReadonlySet<string>;
  onSelectNode?: (nodeId: string) => void;
  onChangeNodeText?: (nodeId: string, text: string) => void;
  onAspectRatioChange?: (aspectRatio: number) => void;
}) {
  const content = isSmartDiagramContent(rawContent) ? rawContent : null;
  const geometry = useMemo(() => content ? layoutSmartDiagram(content) : { boxes: [], edges: [] }, [content]);
  const boxes = new Map(geometry.boxes.map((box) => [box.id, box]));
  const fittedViewBox = useMemo(() => {
    if (geometry.boxes.length === 0) return { x: 0, y: 0, width: 1000, height: 600 };
    const padding = 42;
    const left = Math.max(0, Math.min(...geometry.boxes.map((box) => box.x)) - padding);
    const top = Math.max(0, Math.min(...geometry.boxes.map((box) => box.y)) - padding);
    const right = Math.min(1000, Math.max(...geometry.boxes.map((box) => box.x + box.width)) + padding);
    const bottom = Math.min(600, Math.max(...geometry.boxes.map((box) => box.y + box.height)) + padding);
    return { x: left, y: top, width: right - left, height: bottom - top };
  }, [geometry.boxes]);
  useEffect(() => {
    if (fittedViewBox.width > 0 && fittedViewBox.height > 0)
      onAspectRatioChange?.(fittedViewBox.width / fittedViewBox.height);
  }, [fittedViewBox.height, fittedViewBox.width, onAspectRatioChange]);
  if (!content) return <div className="grid h-full place-items-center text-sm text-slate-500">Invalid Smart Diagram</div>;
  const theme = SMART_DIAGRAM_THEMES.find((candidate) => candidate.id === content.themeId) ?? SMART_DIAGRAM_THEMES[0];
  const visible = (id: string) => !visibleNodeIds || visibleNodeIds.has(id);
  return (
    <svg viewBox={`${fittedViewBox.x} ${fittedViewBox.y} ${fittedViewBox.width} ${fittedViewBox.height}`} className="h-full w-full overflow-visible" role="img" aria-label={content.altText || 'Smart Diagram'}>
      <defs>
        <filter id="smart-diagram-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.2" /></filter>
        <linearGradient id="smart-diagram-polished" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.42" /><stop offset="0.5" stopColor="#ffffff" stopOpacity="0" /><stop offset="1" stopColor="#020617" stopOpacity="0.18" /></linearGradient>
        <marker id="smart-diagram-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#64748b" /></marker>
      </defs>
      {content.connectorStyle !== 'none' && geometry.edges.map((edge) => {
        const from = boxes.get(edge.from); const to = boxes.get(edge.to);
        if (!from || !to || !visible(edge.from) || !visible(edge.to)) return null;
        return <path key={`${edge.from}-${edge.to}`} d={linePath(from, to, content.connectorStyle)} fill="none" stroke="#64748b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#smart-diagram-arrow)" className="transition-opacity duration-300" />;
      })}
      {content.nodes.map((node, index) => {
        const box = boxes.get(node.id); if (!box) return null;
        const fill = node.fill || theme.colors[index % theme.colors.length];
        const textColor = node.textColor || '#ffffff';
        const selected = selectedNodeId === node.id;
        const shown = visible(node.id);
        const diamond = node.shape === 'diamond';
        const rx = node.shape === 'pill' ? box.height / 2 : node.shape === 'rectangle' ? 2 : node.shape === 'circle' ? Math.min(box.width, box.height) / 2 : 18;
        return (
          <g key={node.id} opacity={shown ? 1 : 0} transform={shown ? undefined : 'translate(0 10)'} className="transition-all duration-300" onClick={(event) => { event.stopPropagation(); onSelectNode?.(node.id); }} role={editable ? 'button' : undefined} tabIndex={editable ? 0 : undefined}>
            {diamond ? <path d={nodePath(box, node)} fill={fill} stroke={selected ? '#f59e0b' : '#ffffff'} strokeWidth={selected ? 8 : 3} filter={content.styleId === 'flat' ? undefined : 'url(#smart-diagram-shadow)'} /> : <rect x={box.x} y={box.y} width={box.width} height={box.height} rx={rx} fill={content.styleId === 'outline' ? '#ffffff' : fill} stroke={selected ? '#f59e0b' : content.styleId === 'outline' ? fill : '#ffffff'} strokeWidth={selected ? 8 : content.styleId === 'outline' ? 6 : 3} filter={content.styleId === 'flat' || content.styleId === 'outline' ? undefined : 'url(#smart-diagram-shadow)'} />}
            {(content.styleId === 'polished' || content.styleId === 'bevel') && !diamond && <rect x={box.x + 3} y={box.y + 3} width={box.width - 6} height={box.height - 6} rx={Math.max(0, rx - 3)} fill="url(#smart-diagram-polished)" pointerEvents="none" />}
            {node.icon && <text x={box.x + box.width / 2} y={box.y + Math.min(42, box.height * 0.34)} textAnchor="middle" fontSize={Math.min(34, box.height * 0.25)}>{node.icon}</text>}
            <foreignObject x={box.x + 10} y={box.y + (node.icon ? Math.min(48, box.height * 0.35) : 8)} width={box.width - 20} height={box.height - (node.icon ? Math.min(54, box.height * 0.38) : 16)}>
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                contentEditable={editable}
                suppressContentEditableWarning
                onPointerDown={(event) => event.stopPropagation()}
                onBlur={(event) => onChangeNodeText?.(node.id, event.currentTarget.textContent?.trim() || 'Untitled')}
                className="flex h-full w-full items-center justify-center overflow-hidden px-1 text-center font-semibold leading-tight outline-none"
                style={{ color: content.styleId === 'outline' ? fill : textColor, fontSize: `${Math.max(13, Math.min(25, box.width / 8, box.height / 3.2))}px` }}
              >
                {node.text}
              </div>
            </foreignObject>
            {node.role === 'assistant' && <text x={box.x + box.width - 8} y={box.y + 15} textAnchor="end" fill={textColor} fontSize="12" fontWeight="700">ASSISTANT</text>}
          </g>
        );
      })}
    </svg>
  );
}
