import { useEffect, useRef, useState } from 'react';
import { ChartLine, Circle, Eraser, Grid3X3, GripHorizontal, Highlighter, Minus, PenLine, Pencil, Plus, Redo2, RotateCcw, Slash, Square, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { createClientUuid } from '@/utils/createClientUuid';

type Point = { x: number; y: number };
type Tool = 'pen' | 'pencil' | 'highlighter' | 'eraser' | 'line' | 'rectangle' | 'ellipse' | 'graph';
type Stroke = { id: string; kind?: Exclude<Tool, 'eraser' | 'graph'>; color: string; width: number; opacity: number; points: Point[] };
type Board = { id: string; title: string; x: number; y: number; width: number; height: number; minimized: boolean; grid?: boolean; graph?: boolean; graphOffsetX?: number; graphOffsetY?: number; graphScale?: number; strokes: Stroke[]; redo?: Stroke[] };

const MIN_GRAPH_SCALE = 0.001;
const MAX_GRAPH_SCALE = 10_000;

const niceGraphStep = (minimumStep: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(minimumStep, Number.EPSILON)));
  const normalized = minimumStep / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
};

const formatGraphValue = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return value.toExponential(1);
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(6)));
};

const distanceToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const position = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + position * dx), point.y - (start.y + position * dy));
};

const segmentsHit = (point: Point, points: Point[], radius: number) => {
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= radius;
  return points.slice(1).some((end, index) => distanceToSegment(point, points[index], end) <= radius);
};

const eraserHitsStroke = (stroke: Stroke, point: Point, eraserWidth: number) => {
  const radius = Math.max(12, eraserWidth * 2, stroke.width / 2 + 6);
  const start = stroke.points[0];
  const end = stroke.points.at(-1) || start;
  if (!start) return false;
  if (stroke.kind === 'rectangle') {
    const corners = [
      start,
      { x: end.x, y: start.y },
      end,
      { x: start.x, y: end.y },
      start,
    ];
    return segmentsHit(point, corners, radius);
  }
  if (stroke.kind === 'ellipse') {
    const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;
    if (radiusX === 0 || radiusY === 0) return distanceToSegment(point, start, end) <= radius;
    const perimeter = Array.from({ length: 49 }, (_, index) => {
      const angle = (index / 48) * Math.PI * 2;
      return { x: center.x + Math.cos(angle) * radiusX, y: center.y + Math.sin(angle) * radiusY };
    });
    return segmentsHit(point, perimeter, radius);
  }
  return segmentsHit(point, stroke.points, radius);
};

const freshBoard = (offset = 0): Board => ({
  id: createClientUuid(), title: 'Teacher whiteboard', x: Math.min(80 + offset, Math.max(8, window.innerWidth - 320)), y: Math.min(90 + offset, Math.max(8, window.innerHeight - 260)),
  width: Math.min(680, Math.max(280, window.innerWidth - 16)), height: Math.min(480, Math.max(260, window.innerHeight - 80)), minimized: false, grid: false, graph: false, strokes: [], redo: [],
});

const fitBoardToViewport = (board: Board): Board => {
  const viewportWidth = Math.max(280, window.innerWidth);
  const viewportHeight = Math.max(320, window.innerHeight);
  const width = Math.min(board.width, viewportWidth - 16);
  const height = Math.min(board.height, viewportHeight - 24);
  return {
    ...board,
    width,
    height,
    x: Math.max(8, Math.min(board.x, viewportWidth - (board.minimized ? Math.min(310, viewportWidth - 16) : width) - 8)),
    y: Math.max(8, Math.min(board.y, viewportHeight - (board.minimized ? 48 : height) - 8)),
  };
};

export default function FloatingWhiteboards({ sessionId, iconOnly = false }: { sessionId: number; iconOnly?: boolean }) {
  const storageKey = `spectropy:teacher-whiteboards:${sessionId}`;
  const [boards, setBoards] = useState<Board[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '[]') as Board[]; } catch { return []; }
  });
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#ef4444');
  const [width, setWidth] = useState(5);
  const drawing = useRef<{ boardId: string; strokeId: string } | null>(null);
  const panningGraph = useRef<{ boardId: string; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const graphTouchPoints = useRef(new Map<number, { boardId: string; point: Point }>());
  const pinchingGraph = useRef<{
    boardId: string;
    pointerIds: [number, number];
    startDistance: number;
    startScale: number;
    coordinateX: number;
    coordinateY: number;
  } | null>(null);
  const dragging = useRef<{ boardId: string; dx: number; dy: number } | null>(null);
  const resizing = useRef<{ boardId: string; startX: number; startY: number; width: number; height: number } | null>(null);

  useEffect(() => { sessionStorage.setItem(storageKey, JSON.stringify(boards)); }, [boards, storageKey]);
  useEffect(() => {
    const keepBoardsVisible = () => setBoards((current) => current.map(fitBoardToViewport));
    keepBoardsVisible();
    window.addEventListener('resize', keepBoardsVisible);
    window.addEventListener('orientationchange', keepBoardsVisible);
    return () => {
      window.removeEventListener('resize', keepBoardsVisible);
      window.removeEventListener('orientationchange', keepBoardsVisible);
    };
  }, []);
  const update = (boardId: string, updater: (board: Board) => Board) =>
    setBoards((current) => current.map((board) => board.id === boardId ? updater(board) : board));
  const pointFrom = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const eraseAt = (boardId: string, point: Point) => {
    update(boardId, (board) => {
      const removed = board.strokes.filter((stroke) =>
        eraserHitsStroke(stroke, point, Math.max(16, width * 1.8)),
      );
      if (removed.length === 0) return board;
      const removedIds = new Set(removed.map((stroke) => stroke.id));
      return {
        ...board,
        strokes: board.strokes.filter((stroke) => !removedIds.has(stroke.id)),
        redo: [...(board.redo || []), ...removed],
      };
    });
  };
  const startInk = (boardId: string, event: React.PointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFrom(event);
    const board = boards.find((item) => item.id === boardId);
    if (tool === 'graph') {
      if (board?.graph) {
        if (event.pointerType === 'touch') {
          graphTouchPoints.current.set(event.pointerId, { boardId, point });
          const touches = [...graphTouchPoints.current.entries()].filter(([, touch]) => touch.boardId === boardId);
          if (touches.length >= 2) {
            const [[firstId, first], [secondId, second]] = touches.slice(-2);
            const startScale = board.graphScale || 54;
            const graphHeight = Math.max(160, board.height - 98);
            const originX = board.width / 2 + (board.graphOffsetX || 0);
            const originY = graphHeight / 2 + (board.graphOffsetY || 0);
            const midpoint = { x: (first.point.x + second.point.x) / 2, y: (first.point.y + second.point.y) / 2 };
            pinchingGraph.current = {
              boardId,
              pointerIds: [firstId, secondId],
              startDistance: Math.max(1, Math.hypot(second.point.x - first.point.x, second.point.y - first.point.y)),
              startScale,
              coordinateX: (midpoint.x - originX) / startScale,
              coordinateY: (originY - midpoint.y) / startScale,
            };
            panningGraph.current = null;
            return;
          }
        }
        panningGraph.current = {
          boardId,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: board.graphOffsetX || 0,
          offsetY: board.graphOffsetY || 0,
        };
      }
      return;
    }
    if (tool === 'eraser') {
      drawing.current = { boardId, strokeId: '__eraser__' };
      eraseAt(boardId, point);
      return;
    }
    const inkTool: Exclude<Tool, 'eraser' | 'graph'> = tool;
    const strokeId = createClientUuid();
    drawing.current = { boardId, strokeId };
    update(boardId, (board) => ({ ...board, redo: [], strokes: [...board.strokes, { id: strokeId, kind: inkTool, color, width: inkTool === 'highlighter' ? width * 3 : inkTool === 'pencil' ? Math.max(2, width - 2) : width, opacity: inkTool === 'highlighter' ? 0.3 : 1, points: [point, point] }] }));
  };
  const moveInk = (boardId: string, event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch' && graphTouchPoints.current.has(event.pointerId)) {
      graphTouchPoints.current.set(event.pointerId, { boardId, point: pointFrom(event) });
    }
    if (pinchingGraph.current?.boardId === boardId) {
      const pinch = pinchingGraph.current;
      const first = graphTouchPoints.current.get(pinch.pointerIds[0]);
      const second = graphTouchPoints.current.get(pinch.pointerIds[1]);
      if (!first || !second) return;
      const distance = Math.max(1, Math.hypot(second.point.x - first.point.x, second.point.y - first.point.y));
      const midpoint = { x: (first.point.x + second.point.x) / 2, y: (first.point.y + second.point.y) / 2 };
      update(boardId, (board) => {
        const graphHeight = Math.max(160, board.height - 98);
        const nextScale = Math.max(MIN_GRAPH_SCALE, Math.min(MAX_GRAPH_SCALE, pinch.startScale * distance / pinch.startDistance));
        const nextOriginX = midpoint.x - pinch.coordinateX * nextScale;
        const nextOriginY = midpoint.y + pinch.coordinateY * nextScale;
        return {
          ...board,
          graphScale: nextScale,
          graphOffsetX: nextOriginX - board.width / 2,
          graphOffsetY: nextOriginY - graphHeight / 2,
        };
      });
      return;
    }
    if (panningGraph.current?.boardId === boardId) {
      const pan = panningGraph.current;
      update(boardId, (board) => ({
        ...board,
        graphOffsetX: pan.offsetX + event.clientX - pan.startX,
        graphOffsetY: pan.offsetY + event.clientY - pan.startY,
      }));
      return;
    }
    if (drawing.current?.boardId !== boardId) return;
    const point = pointFrom(event);
    if (drawing.current.strokeId === '__eraser__') {
      eraseAt(boardId, point);
      return;
    }
    update(boardId, (board) => ({ ...board, strokes: board.strokes.map((stroke) => stroke.id === drawing.current?.strokeId ? { ...stroke, points: ['line', 'rectangle', 'ellipse'].includes(stroke.kind || '') ? [stroke.points[0], point] : [...stroke.points, point] } : stroke) }));
  };
  const finishPointerInteraction = (event: React.PointerEvent<Element>) => {
    graphTouchPoints.current.delete(event.pointerId);
    if (pinchingGraph.current?.pointerIds.includes(event.pointerId)) pinchingGraph.current = null;
    panningGraph.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    drawing.current = null;
  };
  const moveBoard = (event: React.PointerEvent<HTMLDivElement>) => {
    if (resizing.current) {
      const state = resizing.current;
      update(state.boardId, (board) => ({
        ...board,
        width: Math.max(Math.min(420, window.innerWidth - 16), Math.min(window.innerWidth - board.x - 8, state.width + event.clientX - state.startX)),
        height: Math.max(Math.min(300, window.innerHeight - 24), Math.min(window.innerHeight - board.y - 8, state.height + event.clientY - state.startY)),
      }));
      return;
    }
    if (!dragging.current) return;
    const { boardId, dx, dy } = dragging.current;
    update(boardId, (board) => ({
      ...board,
      x: Math.max(8, Math.min(event.clientX - dx, window.innerWidth - (board.minimized ? Math.min(310, window.innerWidth - 16) : board.width) - 8)),
      y: Math.max(8, Math.min(event.clientY - dy, window.innerHeight - (board.minimized ? 48 : board.height) - 8)),
    }));
  };
  const zoomGraph = (boardId: string, factor: number) => {
    update(boardId, (board) => ({ ...board, graphScale: Math.max(MIN_GRAPH_SCALE, Math.min(MAX_GRAPH_SCALE, (board.graphScale || 54) * factor)) }));
  };

  return (
    <>
      <button type="button" onClick={() => setBoards((current) => [...current, freshBoard((current.length % 4) * 28)])} className={iconOnly ? 'fixed bottom-4 right-4 z-[110] grid h-11 w-11 touch-manipulation place-items-center rounded-full bg-white text-blue-950 shadow-xl ring-1 ring-slate-300 hover:bg-slate-100' : 'fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-[70] inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full bg-white px-3 py-3 text-sm font-bold text-blue-950 shadow-xl ring-1 ring-slate-300 sm:px-4'} title="Add floating whiteboard" aria-label="Add floating whiteboard">{iconOnly ? <Plus size={19} /> : <><Plus size={18} /><span className="hidden sm:inline">Whiteboard</span></>}</button>
      {boards.map((board) => {
        const graphUnit = Math.max(MIN_GRAPH_SCALE, Math.min(MAX_GRAPH_SCALE, board.graphScale || 54));
        const graphHeight = Math.max(160, board.height - 98);
        const graphOriginX = board.width / 2 + (board.graphOffsetX || 0);
        const graphOriginY = graphHeight / 2 + (board.graphOffsetY || 0);
        const tickStep = niceGraphStep(42 / graphUnit);
        const xTickStart = Math.ceil((-graphOriginX / graphUnit) / tickStep) * tickStep;
        const xTickEnd = Math.floor(((board.width - graphOriginX) / graphUnit) / tickStep) * tickStep;
        const yTickStart = Math.ceil(((graphOriginY - graphHeight) / graphUnit) / tickStep) * tickStep;
        const yTickEnd = Math.floor((graphOriginY / graphUnit) / tickStep) * tickStep;
        const xTicks = Array.from({ length: Math.max(0, Math.round((xTickEnd - xTickStart) / tickStep) + 1) }, (_, index) => xTickStart + index * tickStep);
        const yTicks = Array.from({ length: Math.max(0, Math.round((yTickEnd - yTickStart) / tickStep) + 1) }, (_, index) => yTickStart + index * tickStep);
        return (
        <div key={board.id} onPointerMove={moveBoard} onPointerUp={(event) => { dragging.current = null; resizing.current = null; finishPointerInteraction(event); }} onPointerCancel={(event) => { dragging.current = null; resizing.current = null; finishPointerInteraction(event); }} className={`fixed max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl ${iconOnly ? 'z-[110]' : 'z-[80]'}`} style={{ left: board.x, top: board.y, width: board.minimized ? Math.min(310, window.innerWidth - 16) : board.width, height: board.minimized ? 48 : board.height }}>
          <div onPointerDown={(event) => { if ((event.target as HTMLElement).closest('button')) return; dragging.current = { boardId: board.id, dx: event.clientX - board.x, dy: event.clientY - board.y }; event.currentTarget.setPointerCapture(event.pointerId); }} className="flex h-12 touch-none select-none cursor-move items-center gap-2 border-b bg-slate-50 px-2 text-slate-800 sm:px-3">
            <GripHorizontal size={17} /><span className="flex-1 text-sm font-bold">{board.title}</span>
            <button type="button" title={board.minimized ? 'Restore whiteboard' : 'Minimize whiteboard'} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); update(board.id, (item) => ({ ...item, minimized: !item.minimized })); }} className="rounded-md p-2 hover:bg-slate-200">{board.minimized ? <Plus size={17} /> : <Minus size={17} />}</button>
            <button type="button" title="Close whiteboard" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setBoards((current) => current.filter((item) => item.id !== board.id)); }} className="rounded-md p-2 hover:bg-red-100 hover:text-red-700"><X size={17} /></button>
          </div>
          {!board.minimized ? <div className="flex h-[calc(100%-3rem)] min-h-0 flex-col">
            <div className="studio-whiteboard-toolbar flex flex-nowrap items-center gap-1 overflow-x-auto overscroll-contain border-b px-2 py-1.5 text-slate-700">
              {([['pen', PenLine], ['pencil', Pencil], ['highlighter', Highlighter], ['line', Slash], ['rectangle', Square], ['ellipse', Circle], ['eraser', Eraser]] as const).map(([name, Icon]) => <button key={name} type="button" title={name} aria-label={name} onClick={() => setTool(name)} className={`grid h-10 w-10 shrink-0 touch-manipulation place-items-center rounded-md ${tool === name ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><Icon size={18} /></button>)}
              <button type="button" title={board.graph ? 'Close coordinate graph' : 'Open coordinate graph'} aria-label={board.graph ? 'Close coordinate graph' : 'Open coordinate graph'} aria-pressed={board.graph === true} onClick={() => {
                if (board.graph) {
                  update(board.id, (item) => ({ ...item, graph: false, grid: false }));
                  if (tool === 'graph') setTool('pen');
                } else {
                  update(board.id, (item) => ({ ...item, graph: true, grid: true }));
                  setTool('graph');
                }
              }} className={`grid h-10 w-10 shrink-0 touch-manipulation place-items-center rounded-md ${board.graph ? 'bg-blue-900 text-white' : 'hover:bg-slate-100'}`}><ChartLine size={18} /></button>
              {board.graph ? <>
                <button type="button" title="Zoom graph out to a larger −n to n range" aria-label="Zoom graph out" onClick={() => zoomGraph(board.id, 1 / 1.5)} disabled={graphUnit <= MIN_GRAPH_SCALE} className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-30"><ZoomOut size={16} /></button>
                <button type="button" title="Zoom graph in to a smaller −n to n range" aria-label="Zoom graph in" onClick={() => zoomGraph(board.id, 1.5)} disabled={graphUnit >= MAX_GRAPH_SCALE} className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-30"><ZoomIn size={16} /></button>
              </> : null}
              <input type="color" title="Ink colour" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-9" />
              <input type="range" title="Ink width" min="2" max="14" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-24" />
              <span className="min-w-2 flex-1" />
              <button type="button" title="Toggle grid" onClick={() => update(board.id, (item) => ({ ...item, grid: item.grid === false }))} className={`rounded-md p-2 ${board.grid === false ? 'hover:bg-slate-100' : 'bg-slate-200'}`}><Grid3X3 size={16} /></button>
              <button type="button" title="Undo" disabled={!board.strokes.length} onClick={() => update(board.id, (item) => ({ ...item, strokes: item.strokes.slice(0, -1), redo: [...(item.redo || []), item.strokes.at(-1)!] }))} className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-30"><RotateCcw size={16} /></button>
              <button type="button" title="Redo" disabled={!board.redo?.length} onClick={() => update(board.id, (item) => ({ ...item, strokes: [...item.strokes, item.redo!.at(-1)!], redo: item.redo!.slice(0, -1) }))} className="rounded-md p-2 hover:bg-slate-100 disabled:opacity-30"><Redo2 size={16} /></button>
              <button type="button" title="Clear whiteboard" onClick={() => update(board.id, (item) => ({ ...item, redo: [...(item.redo || []), ...item.strokes], strokes: [] }))} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
            </div>
            <svg className={`min-h-0 w-full flex-1 touch-none bg-white ${tool === 'graph' && board.graph ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`} viewBox={`0 0 ${board.width} ${graphHeight}`} preserveAspectRatio="none" onPointerDown={(event) => startInk(board.id, event)} onPointerMove={(event) => moveInk(board.id, event)} onPointerUp={finishPointerInteraction} onPointerCancel={finishPointerInteraction} onWheel={(event) => {
              if (!board.graph) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const pointerX = (event.clientX - rect.left) * (board.width / rect.width);
              const pointerY = (event.clientY - rect.top) * (graphHeight / rect.height);
              const nextScale = Math.max(MIN_GRAPH_SCALE, Math.min(MAX_GRAPH_SCALE, graphUnit * (event.deltaY < 0 ? 1.2 : 1 / 1.2)));
              const scaleRatio = nextScale / graphUnit;
              update(board.id, (item) => ({
                ...item,
                graphScale: nextScale,
                graphOffsetX: pointerX - (pointerX - graphOriginX) * scaleRatio - item.width / 2,
                graphOffsetY: pointerY - (pointerY - graphOriginY) * scaleRatio - graphHeight / 2,
              }));
            }}>
              <defs>
                <pattern id={`grid-${board.id}`} width={board.graph ? graphUnit * tickStep : 24} height={board.graph ? graphUnit * tickStep : 24} patternUnits="userSpaceOnUse" x={board.graph ? graphOriginX : 0} y={board.graph ? graphOriginY : 0}><path d={`M ${board.graph ? graphUnit * tickStep : 24} 0 L 0 0 0 ${board.graph ? graphUnit * tickStep : 24}`} fill="none" stroke="#e2e8f0" strokeWidth="1" /></pattern>
                <marker id={`axis-arrow-${board.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L7,3 z" fill="#334155" /></marker>
              </defs>
              <rect width="100%" height="100%" fill={board.grid === false ? '#ffffff' : `url(#grid-${board.id})`} />
              {board.graph ? <g className="pointer-events-none" aria-label="Draggable coordinate graph with x and y axes">
                {graphOriginY >= 0 && graphOriginY <= graphHeight ? <line x1="0" y1={graphOriginY} x2={board.width - 14} y2={graphOriginY} stroke="#334155" strokeWidth="2" markerEnd={`url(#axis-arrow-${board.id})`} /> : null}
                {graphOriginX >= 0 && graphOriginX <= board.width ? <line x1={graphOriginX} y1={graphHeight} x2={graphOriginX} y2="14" stroke="#334155" strokeWidth="2" markerEnd={`url(#axis-arrow-${board.id})`} /> : null}
                {graphOriginY >= 0 && graphOriginY <= graphHeight ? xTicks.filter((value) => Math.abs(value) > Number.EPSILON).map((value) => { const x = graphOriginX + value * graphUnit; return <g key={`x-${value}`}><line x1={x} y1={graphOriginY - 6} x2={x} y2={graphOriginY + 6} stroke="#475569" strokeWidth="1.5" /><text x={x} y={graphOriginY + 19} textAnchor="middle" fill="#475569" fontSize="11">{formatGraphValue(value)}</text></g>; }) : null}
                {graphOriginX >= 0 && graphOriginX <= board.width ? yTicks.filter((value) => Math.abs(value) > Number.EPSILON).map((value) => { const y = graphOriginY - value * graphUnit; return <g key={`y-${value}`}><line x1={graphOriginX - 6} y1={y} x2={graphOriginX + 6} y2={y} stroke="#475569" strokeWidth="1.5" /><text x={graphOriginX - 12} y={y + 4} textAnchor="end" fill="#475569" fontSize="11">{formatGraphValue(value)}</text></g>; }) : null}
                {graphOriginY >= 0 && graphOriginY <= graphHeight ? <text x={board.width - 20} y={graphOriginY - 10} fill="#0f172a" fontSize="16" fontWeight="700">x</text> : null}
                {graphOriginX >= 0 && graphOriginX <= board.width ? <text x={graphOriginX + 12} y="20" fill="#0f172a" fontSize="16" fontWeight="700">y</text> : null}
                {graphOriginX >= 0 && graphOriginX <= board.width && graphOriginY >= 0 && graphOriginY <= graphHeight ? <text x={graphOriginX - 10} y={graphOriginY + 17} textAnchor="end" fill="#475569" fontSize="11">0</text> : null}
              </g> : null}
              {board.strokes.map((stroke) => {
                const start = stroke.points[0]; const end = stroke.points.at(-1) || start;
                if (stroke.kind === 'line') return <line key={stroke.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} strokeLinecap="round" />;
                if (stroke.kind === 'rectangle') return <rect key={stroke.id} x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)} width={Math.abs(end.x - start.x)} height={Math.abs(end.y - start.y)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} />;
                if (stroke.kind === 'ellipse') return <ellipse key={stroke.id} cx={(start.x + end.x) / 2} cy={(start.y + end.y) / 2} rx={Math.abs(end.x - start.x) / 2} ry={Math.abs(end.y - start.y) / 2} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} />;
                return <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} strokeLinecap="round" strokeLinejoin="round" />;
              })}
            </svg>
            <div role="separator" aria-label="Resize whiteboard" title="Drag to resize whiteboard" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); resizing.current = { boardId: board.id, startX: event.clientX, startY: event.clientY, width: board.width, height: board.height }; event.currentTarget.setPointerCapture(event.pointerId); }} className="absolute bottom-0 right-0 z-20 h-11 w-11 touch-none cursor-nwse-resize rounded-tl-xl bg-blue-900/90 after:absolute after:bottom-2 after:right-2 after:h-3 after:w-3 after:border-b-2 after:border-r-2 after:border-white" />
          </div> : null}
        </div>
        );
      })}
    </>
  );
}
