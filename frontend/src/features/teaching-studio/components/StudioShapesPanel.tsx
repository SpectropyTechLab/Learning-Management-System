import { Copy, Pencil, Redo2, RotateCcw, Shapes, Trash2, Undo2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getStroke } from 'perfect-freehand';
import simplify from 'simplify-js';
import type { StudioElement, StudioScreen } from '../types';
import StudioShapeElement from './StudioShapeElement';
import type { InlineShapeData } from './studioInlineShape';

const shapeGroups = [
  { label: 'Lines', shapes: ['line', 'diagonal-line', 'vertical-line', 'arrow', 'double-arrow', 'elbow-arrow', 'curved-arrow', 'left-arrow', 'up-arrow', 'down-arrow', 'connector', 'curve'] },
  { label: 'Rectangles', shapes: ['rectangle', 'rounded-rectangle', 'round-one-rectangle', 'round-two-rectangle', 'snip-one-rectangle', 'snip-two-rectangle', 'snip-round-rectangle', 'frame'] },
  {
    label: 'Basic',
    shapes: [
      'circle',
      'triangle',
      'inverted-triangle',
      'diamond',
      'pentagon',
      'hexagon',
      'heptagon',
      'octagon',
      'parallelogram',
      'trapezoid',
      'right-triangle',
      'cross',
      'plaque',
      'cube',
      'cylinder',
      'pie',
      'arc',
      'bracket-pair',
      'brace-pair',
      'star',
      'heart',
      'cloud',
    ],
  },
  { label: 'Block arrows', shapes: ['arrow', 'left-arrow', 'up-arrow', 'down-arrow', 'double-arrow', 'up-down-arrow', 'quad-arrow', 'elbow-arrow', 'bent-arrow', 'u-turn-arrow', 'circular-arrow', 'notched-arrow'] },
  {
    label: 'Flowchart',
    shapes: [
      'flow-process',
      'flow-decision',
      'flow-data',
      'flow-document',
      'flow-terminator',
      'flow-delay',
    ],
  },
  { label: 'Callouts', shapes: ['callout', 'speech', 'thought', 'banner', 'ribbon'] },
  { label: 'Equation', shapes: ['plus', 'minus', 'multiply', 'divide', 'equal', 'not-equal'] },
  { label: 'Stars & banners', shapes: ['star-4', 'star', 'star-6', 'star-8', 'burst-1', 'burst-2', 'banner', 'ribbon', 'wave-banner', 'scroll'] },
  { label: 'Action buttons', shapes: ['action-back', 'action-forward', 'action-beginning', 'action-end', 'action-home', 'action-info', 'action-return', 'action-document', 'action-sound', 'action-help'] },
] as const;
type DrawingPoint = { x: number; y: number };

const distance = (a: DrawingPoint, b: DrawingPoint) => Math.hypot(a.x - b.x, a.y - b.y);

function simplifyLine(points: DrawingPoint[], tolerance: number): DrawingPoint[] {
  if (points.length <= 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  const length = distance(first, last);
  let furthestIndex = 0;
  let furthestDistance = 0;
  points.slice(1, -1).forEach((point, index) => {
    const lineDistance = length === 0
      ? distance(point, first)
      : Math.abs((last.y - first.y) * point.x - (last.x - first.x) * point.y + last.x * first.y - last.y * first.x) / length;
    if (lineDistance > furthestDistance) {
      furthestDistance = lineDistance;
      furthestIndex = index + 1;
    }
  });
  if (furthestDistance <= tolerance) return [first, last];
  return [
    ...simplifyLine(points.slice(0, furthestIndex + 1), tolerance).slice(0, -1),
    ...simplifyLine(points.slice(furthestIndex), tolerance),
  ];
}

function recognizeDrawing(lines: DrawingPoint[][]) {
  if (lines.length !== 1 || lines[0].length < 3) return { kind: 'custom-drawing' };
  const points = simplify(lines[0], 2, true);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const diagonal = Math.hypot(width, height);
  if (diagonal < 8) return { kind: 'custom-drawing' };
  const pathLength = points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
  const closingDistance = distance(points[0], points[points.length - 1]);
  const closed = closingDistance < diagonal * 0.4;
  if (!closed && distance(points[0], points[points.length - 1]) / Math.max(pathLength, 1) > 0.82)
    return { kind: 'line' };
  if (!closed) return { kind: 'custom-drawing' };

  const center = {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
  const radii = points.map((point) => distance(point, center));
  const averageRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
  const radialVariation = Math.sqrt(
    radii.reduce((sum, radius) => sum + (radius - averageRadius) ** 2, 0) / radii.length,
  ) / Math.max(averageRadius, 1);
  const area = Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
  const circularity = (4 * Math.PI * area) / Math.max(pathLength ** 2, 1);
  if (radialVariation < 0.2 && circularity > 0.82 && width / Math.max(height, 1) > 0.65 && width / Math.max(height, 1) < 1.55)
    return { kind: 'circle' };

  const closedPoints = [...points];
  if (closingDistance > 0) closedPoints.push(points[0]);
  const vertices = simplifyLine(closedPoints, diagonal * 0.13).slice(0, -1);
  if (vertices.length === 3) return { kind: 'triangle' };
  if (vertices.length >= 4 && vertices.length <= 6) return { kind: 'rectangle' };
  return { kind: 'custom-drawing' };
}
interface Props {
  screen: StudioScreen | null;
  selectedElementId: string | null;
  onAdd: (
    kind: string,
    customPath?: string,
    customStyle?: { fill: string; stroke: string; strokeWidth: number },
  ) => void;
  onInsertInline: (shape: InlineShapeData) => void;
  canInsertInline: boolean;
  inlineEditRequest?: { shape: InlineShapeData; onSave: (shape: InlineShapeData) => void; onCancel: () => void } | null;
  onUpdate: (element: StudioElement) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function StudioShapesPanel({
  screen,
  selectedElementId,
  onAdd,
  onInsertInline,
  canInsertInline,
  inlineEditRequest,
  onUpdate,
  onDuplicate,
  onRemove,
}: Props) {
  const [activeGroup, setActiveGroup] = useState(1);
  const [libraryPreviewKind, setLibraryPreviewKind] = useState<string | null>(null);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [strokes, setStrokes] = useState<DrawingPoint[][]>([]);
  const [redoStrokes, setRedoStrokes] = useState<DrawingPoint[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([]);
  const [drawingColor, setDrawingColor] = useState('#1d4ed8');
  const [drawingWidth, setDrawingWidth] = useState(4);
  const [drawingFill, setDrawingFill] = useState('#dbeafe');
  const [drawingNoFill, setDrawingNoFill] = useState(false);
  const drawingRef = useRef<SVGSVGElement>(null);
  const selected =
    screen?.elements.find(
      (element) => element.id === selectedElementId && element.type === 'shape',
    ) ?? null;
  const inlineEditShape = inlineEditRequest?.shape;
  useEffect(() => {
    if (!inlineEditShape) return;
    const shape = inlineEditShape;
    setLibraryPreviewKind(shape.kind);
    setDrawingFill(shape.fill && shape.fill !== 'transparent' ? shape.fill : '#dbeafe');
    setDrawingNoFill(shape.fill === 'transparent');
    setDrawingColor(shape.stroke || '#1d4ed8');
    setDrawingWidth(shape.strokeWidth || 4);
  }, [inlineEditShape]);
  const update = (changes: Record<string, unknown>) => {
    if (selected) onUpdate({ ...selected, content: { ...selected.content, ...changes } });
  };
  const drawingPoint = (clientX: number, clientY: number) => {
    const bounds = drawingRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(0, Math.min(200, ((clientX - bounds.left) / bounds.width) * 200)),
      y: Math.max(0, Math.min(120, ((clientY - bounds.top) / bounds.height) * 120)),
    };
  };
  const pathFor = (lines: DrawingPoint[][]) =>
    lines
      .filter((line) => line.length > 1)
      .map((line) =>
        simplify(line, 1.5, true).map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '),
      )
      .join(' ');
  const freehandPathFor = (line: DrawingPoint[]) => {
    const outline = getStroke(line.map((point) => [point.x, point.y]), {
      size: drawingWidth,
      thinning: 0,
      smoothing: 0.65,
      streamline: 0.65,
      simulatePressure: false,
      start: { cap: true },
      end: { cap: true },
    });
    if (outline.length < 3) return '';
    const first = outline[0];
    let path = `M${first[0].toFixed(1)} ${first[1].toFixed(1)}Q`;
    for (let index = 1; index < outline.length; index += 1) {
      const point = outline[index];
      const next = outline[(index + 1) % outline.length];
      path += `${point[0].toFixed(1)} ${point[1].toFixed(1)} ${((point[0] + next[0]) / 2).toFixed(1)} ${((point[1] + next[1]) / 2).toFixed(1)} `;
    }
    return `${path}Z`;
  };
  const closeDrawing = () => {
    setDrawingOpen(false);
    setCurrentStroke([]);
  };
  const drawingShape = (): InlineShapeData | null => {
    const customPath = pathFor(strokes);
    if (!customPath) return null;
    const recognized = recognizeDrawing(strokes);
    const kind = recognized.kind;
    return { kind, ...(kind === 'custom-drawing' ? { customPath } : {}), fill: drawingNoFill ? 'transparent' : drawingFill, stroke: drawingColor, strokeWidth: drawingWidth };
  };
  const finishDrawing = (inline: boolean) => {
    const shape = drawingShape();
    if (!shape) return;
    if (inline) onInsertInline(shape);
    else onAdd(shape.kind, shape.customPath, { fill: shape.fill ?? '#dbeafe', stroke: shape.stroke ?? '#1d4ed8', strokeWidth: shape.strokeWidth ?? 4 });
    closeDrawing();
    setStrokes([]);
    setRedoStrokes([]);
  };
  const finishLibraryShape = (inline: boolean) => {
    if (!libraryPreviewKind) return;
    const shape: InlineShapeData = {
      kind: libraryPreviewKind,
      ...(inlineEditRequest?.shape.customPath ? { customPath: inlineEditRequest.shape.customPath } : {}),
      fill: drawingNoFill ? 'transparent' : drawingFill,
      stroke: drawingColor,
      strokeWidth: drawingWidth,
    };
    if (inlineEditRequest) inlineEditRequest.onSave(shape);
    else if (inline) onInsertInline(shape);
    else onAdd(shape.kind, undefined, { fill: shape.fill ?? '#dbeafe', stroke: shape.stroke ?? '#1d4ed8', strokeWidth: shape.strokeWidth ?? 4 });
    setLibraryPreviewKind(null);
    inlineEditRequest?.onCancel();
  };
  const previewShape = drawingShape();
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-900">
          <Shapes size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Shape library</h2>
          <p className="text-xs text-slate-500">Visual symbols, diagrams and teaching callouts.</p>
        </div>
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {shapeGroups.map((group, index) => (
          <button
            key={group.label}
            type="button"
            onClick={() => setActiveGroup(index)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeGroup === index ? 'bg-blue-900 text-white' : 'bg-slate-100 hover:bg-blue-50'}`}
          >
            {group.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setDrawingOpen(true)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-800 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100"
      >
        <Pencil size={16} />
        Draw custom shape
      </button>
      <div className="mt-3 grid max-h-[52dvh] grid-cols-5 gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {shapeGroups[activeGroup].shapes.map((shape) => (
          <button
            key={shape}
            type="button"
            onClick={() => setLibraryPreviewKind(shape)}
            title={shape.replaceAll('-', ' ')}
            aria-label={`Add ${shape.replaceAll('-', ' ')}`}
            className="aspect-square min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-700 hover:bg-blue-50"
          >
            <StudioShapeElement kind={shape} fill="#ffffff" stroke="#1e3a5f" strokeWidth={5} />
          </button>
        ))}
      </div>
      {selected && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold">
              Fill
              <input
                type="color"
                value={
                  String(selected.content.fill || '#dbeafe') === 'transparent'
                    ? '#ffffff'
                    : String(selected.content.fill || '#dbeafe')
                }
                onChange={(event) => update({ fill: event.target.value, lastFill: event.target.value })}
                className="mt-1 h-9 w-full rounded border p-1"
              />
            </label>
            <label className="block text-xs font-semibold">
              Outline
              <input
                type="color"
                value={String(selected.content.stroke || '#1d4ed8')}
                onChange={(event) => update({ stroke: event.target.value })}
                className="mt-1 h-9 w-full rounded border p-1"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={selected.content.fill === 'transparent'} onChange={(event) => update({ fill: event.target.checked ? 'transparent' : String(selected.content.lastFill || '#dbeafe') })} />
            No fill (transparent)
          </label>
          <label className="block text-xs font-semibold">
            Outline width{' '}
            <span className="float-right font-normal">
              {Number(selected.content.strokeWidth) || 4}px
            </span>
            <input
              type="range"
              min="0"
              max="20"
              value={Number(selected.content.strokeWidth) || 4}
              onChange={(event) => update({ strokeWidth: Number(event.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-xs font-semibold">
            Outline style
            <select
              value={String(selected.content.strokeDash || 'solid')}
              onChange={(event) => update({ strokeDash: event.target.value })}
              className="mt-1 h-9 w-full rounded-lg border px-2"
            >
              <option value="solid">Solid</option>
              <option value="dash">Dashed</option>
              <option value="dot">Dotted</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Opacity{' '}
            <span className="float-right font-normal">
              {Math.round((Number(selected.content.opacity) || 1) * 100)}%
            </span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={Number(selected.content.opacity) || 1}
              onChange={(event) => update({ opacity: Number(event.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              title="Duplicate shape"
              onClick={() => onDuplicate(selected.id)}
              className="inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold"
            >
              <Copy size={14} />
              Duplicate
            </button>
            <button
              type="button"
              title="Delete shape"
              onClick={() => onRemove(selected.id)}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-700"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
          <p className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500">
            Group, merge and custom editable points require multi-select and path editing. The
            library data is ready for those future controls without changing existing shapes.
          </p>
        </div>
      )}
      {libraryPreviewKind && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${libraryPreviewKind.replaceAll('-', ' ')}`}>
              <section className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div><h2 className="font-bold capitalize text-slate-900">{libraryPreviewKind.replaceAll('-', ' ')}</h2><p className="text-sm text-slate-500">Review and choose how to insert this shape.</p></div>
                  <button type="button" onClick={() => { setLibraryPreviewKind(null); inlineEditRequest?.onCancel(); }} className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100" aria-label="Close shape preview"><X size={18} /></button>
                </header>
                <div className="grid gap-4 bg-slate-50 p-5 sm:grid-cols-[1fr_12rem]">
                  <div className="grid min-h-64 place-items-center rounded-xl border border-slate-300 bg-white p-8 shadow-inner"><StudioShapeElement kind={libraryPreviewKind} customPath={inlineEditRequest?.shape.customPath} fill={drawingNoFill ? 'transparent' : drawingFill} stroke={drawingColor} strokeWidth={drawingWidth} /></div>
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-slate-700">Outline colour<input type="color" value={drawingColor} onChange={(event) => setDrawingColor(event.target.value)} className="mt-1 block h-10 w-full rounded border border-slate-300 bg-white p-1" /></label>
                    <label className="block text-xs font-semibold text-slate-700">Fill colour<input type="color" value={drawingFill} disabled={drawingNoFill} onChange={(event) => setDrawingFill(event.target.value)} className="mt-1 block h-10 w-full rounded border border-slate-300 bg-white p-1 disabled:opacity-40" /></label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={drawingNoFill} onChange={(event) => setDrawingNoFill(event.target.checked)} />No fill</label>
                    <label className="block text-xs font-semibold text-slate-700">Outline width {drawingWidth}px<input type="range" min="1" max="20" value={drawingWidth} onChange={(event) => setDrawingWidth(Number(event.target.value))} className="mt-2 block w-full" /></label>
                  </div>
                </div>
                <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                  <button type="button" onClick={() => { setLibraryPreviewKind(null); inlineEditRequest?.onCancel(); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
                  {!inlineEditRequest ? <button type="button" disabled={!canInsertInline} title={canInsertInline ? 'Insert at the caret in the selected text element' : 'Select a text element first'} onClick={() => finishLibraryShape(true)} className="rounded-lg border border-blue-900 px-4 py-2 text-sm font-semibold text-blue-900 disabled:cursor-not-allowed disabled:opacity-40">Insert inline</button> : null}
                  <button type="button" onClick={() => finishLibraryShape(false)} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white">{inlineEditRequest ? 'Save shape' : 'Add shape'}</button>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}
      {drawingOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Draw a custom shape">
              <section className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h2 className="font-bold text-slate-900">Draw custom shape</h2>
                    <p className="text-sm text-slate-500">Draw with a mouse, touch screen, or stylus.</p>
                  </div>
                  <button type="button" onClick={closeDrawing} className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100" aria-label="Close custom shape drawing"><X size={18} /></button>
                </header>
                <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <label className="text-xs font-semibold text-slate-700">Stroke colour<input type="color" value={drawingColor} onChange={(event) => setDrawingColor(event.target.value)} className="mt-1 block h-9 w-20 rounded border border-slate-300 bg-white p-1" /></label>
                  <label className="text-xs font-semibold text-slate-700">Fill colour<input type="color" value={drawingFill} disabled={drawingNoFill} onChange={(event) => setDrawingFill(event.target.value)} className="mt-1 block h-9 w-20 rounded border border-slate-300 bg-white p-1 disabled:opacity-40" /></label>
                  <label className="flex h-9 items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={drawingNoFill} onChange={(event) => setDrawingNoFill(event.target.checked)} />No fill</label>
                  <label className="min-w-40 flex-1 text-xs font-semibold text-slate-700">Width {drawingWidth}px<input type="range" min="1" max="20" value={drawingWidth} onChange={(event) => setDrawingWidth(Number(event.target.value))} className="mt-2 block w-full" /></label>
                  <button type="button" disabled={strokes.length === 0} onClick={() => setStrokes((current) => { const removed = current.at(-1); if (removed) setRedoStrokes((redo) => [...redo, removed]); return current.slice(0, -1); })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold disabled:opacity-40"><Undo2 size={15} />Undo</button>
                  <button type="button" disabled={redoStrokes.length === 0} onClick={() => setRedoStrokes((current) => { const restored = current.at(-1); if (restored) setStrokes((lines) => [...lines, restored]); return current.slice(0, -1); })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold disabled:opacity-40"><Redo2 size={15} />Redo</button>
                  <button type="button" disabled={strokes.length === 0} onClick={() => { setStrokes([]); setRedoStrokes([]); }} className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 disabled:opacity-40"><RotateCcw size={15} />Clear</button>
                </div>
                <div className="grid min-h-0 flex-1 gap-4 bg-slate-100 p-5 md:grid-cols-2">
                  <div className="flex min-h-72 flex-col">
                    <p className="mb-2 text-xs font-bold uppercase text-slate-600">Draw shape</p>
                    <svg
                      ref={drawingRef}
                      viewBox="0 0 200 120"
                      className="min-h-0 flex-1 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-inner"
                      onPointerDown={(event) => { const point = drawingPoint(event.clientX, event.clientY); if (!point) return; event.currentTarget.setPointerCapture(event.pointerId); setCurrentStroke([point]); setRedoStrokes([]); }}
                      onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const point = drawingPoint(event.clientX, event.clientY); if (point) setCurrentStroke((line) => [...line, point]); }}
                      onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setCurrentStroke((line) => { if (line.length > 1) setStrokes((lines) => [...lines, line]); return []; }); }}
                      onPointerCancel={() => setCurrentStroke([])}
                    >
                      {[...strokes, ...(currentStroke.length ? [currentStroke] : [])].map((line, index) => <path key={index} d={freehandPathFor(line)} fill={drawingColor} />)}
                    </svg>
                  </div>
                  <div className="flex min-h-72 flex-col">
                    <p className="mb-2 text-xs font-bold uppercase text-slate-600">Exact insertion preview</p>
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border-2 border-slate-300 bg-white p-6 shadow-inner">
                      <div className="h-40 w-full max-w-xs">{previewShape ? <StudioShapeElement kind={previewShape.kind} customPath={previewShape.customPath} fill={previewShape.fill} stroke={previewShape.stroke} strokeWidth={previewShape.strokeWidth} /> : null}</div>
                    </div>
                  </div>
                </div>
                <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                  <button type="button" onClick={closeDrawing} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
                  <button type="button" disabled={!previewShape || !canInsertInline} title={canInsertInline ? 'Insert at the caret in the selected text element' : 'Select a text element first'} onClick={() => finishDrawing(true)} className="rounded-lg border border-blue-900 px-4 py-2 text-sm font-semibold text-blue-900 disabled:cursor-not-allowed disabled:opacity-40">Insert inline</button>
                  <button type="button" disabled={!previewShape} onClick={() => finishDrawing(false)} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Add shape</button>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
